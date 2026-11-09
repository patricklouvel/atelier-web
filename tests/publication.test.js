import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkshopHandler} from '../api/workshop.js';
import {createCatalogueHandler} from '../api/catalogue.js';
import {emptyPresentation,publicationSnapshot,validatePresentation,mergePublications} from '../src/publication/model.js';

const admin={email:'owner@example.fr',role:'admin'},team={email:'team@example.fr',role:'participant'},guest={email:'guest@example.fr',role:'guest'};
function fixture(){
 const projectId=randomUUID(),photoId=randomUUID(),modelId=randomUUID();
 const tables={atelier_projects:[{id:projectId}],atelier_files:[{id:photoId,project_id:projectId,state:'ready',metadata:{name:'private-name.png',image:true},storage_path:'SECRET/PHOTO'},{id:modelId,project_id:projectId,state:'ready',metadata:{name:'prototype-secret.glb',image:false},storage_path:'SECRET/MODEL'}],atelier_presentations:[]},signed=[],events=[];
 const c={from(table){const filters=[];let single=false;const q={select(){return q},eq(k,v){filters.push(row=>row[k]===v);return q},maybeSingle(){single=true;return q},then(resolve){const rows=tables[table].filter(row=>filters.every(f=>f(row)));return Promise.resolve({data:structuredClone(single?rows[0]||null:rows)}).then(resolve)}};return q},async rpc(name,args){
  assert.equal(name,'atelier_save_presentation');let row=tables.atelier_presentations.find(r=>r.project_id===args.p_project_id);
  if((row?.revision||0)!==args.p_revision)return {error:{code:'40001'}};
  if(tables.atelier_presentations.some(r=>r.project_id!==args.p_project_id&&r.slug===args.p_draft?.slug))return {error:{code:'23505'}};
  if(row?.was_published&&args.p_draft&&row.slug!==args.p_draft.slug)return {error:{code:'22023'}};
  if(!row){row={id:randomUUID(),project_id:projectId,revision:0,live:null,live_version:0,was_published:false};tables.atelier_presentations.push(row);}
  if(args.p_command!=='unpublish'){row.slug=args.p_draft.slug;row.draft=args.p_draft;}
  if(args.p_command==='publish'){row.live=args.p_live;row.was_published=true;row.live_version++;}
  if(args.p_command==='unpublish'){row.live=null;row.live_version++;}
  row.revision++;events.push(args.p_actor);return {data:structuredClone(row)};
 }};
 const storage={createSignedUrl:async(path,ttl)=>{signed.push({path,ttl});return {data:{signedUrl:'https://storage.example/signed'}}}};
 async function invoke(handler,req){let status,result,headers={};await handler(req,{setHeader(k,v){headers[k]=v},status(value){status=value;return this},json(value){result=value},end(){}});return {status,result,headers};}
 const call=(member,method='GET',body={},query={})=>invoke(createWorkshopHandler(c,storage,async()=>member),{method,headers:{},query:{action:'presentation',projectId,...query},body});
 const read=(query={})=>invoke(createCatalogueHandler(c,storage),{method:'GET',query});
 const draft={...emptyPresentation({id:projectId,name:'Bague Test'}),category:'Bagues',description:'Présentation publique',gallery:[{fileId:photoId,editorial:'',alt:'Bague',caption:'De face'}],modelId};
 return {projectId,photoId,modelId,tables,draft,call,read,signed,events};
}

test('only administrators can read, save, publish or unpublish a public presentation',async()=>{
 const f=fixture();for(const member of [team,guest])for(const command of ['save','publish','unpublish']){
  assert.equal((await f.call(member,'GET')).status,403);
  assert.equal((await f.call(member,'POST',{revision:0,draft:f.draft,command})).status,403);
 }assert.equal(f.events.length,0);
});
test('saving drafts never changes live content and unpublished drafts stay absent from the public catalogue',async()=>{
 const f=fixture();assert.equal((await f.call(admin,'POST',{revision:0,draft:f.draft,command:'save'})).status,200);
 assert.deepEqual((await f.read()).result,{products:[],hiddenSlugs:[]});
 assert.equal((await f.call(admin,'POST',{revision:1,draft:f.draft,command:'publish'})).status,200);
 f.draft.description='UNPUBLISHED DRAFT';f.draft.notes='PRIVATE NOTES';
 await f.call(admin,'POST',{revision:2,draft:f.draft,command:'save'});
 const response=await f.read();assert.equal(response.result.products[0].description,'Présentation publique');
 const json=JSON.stringify(response);for(const secret of ['UNPUBLISHED DRAFT','PRIVATE NOTES','SECRET','prototype-secret','private-name',f.projectId])assert(!json.includes(secret));
 assert.equal(f.tables.atelier_presentations[0].draft.notes,undefined);
});
test('public media signing requires the current published version and exact selected ready file of the same project',async()=>{
 const f=fixture();await f.call(admin,'POST',{revision:0,draft:f.draft,command:'publish'});const row=f.tables.atelier_presentations[0];
 assert.equal((await f.read({action:'media',id:row.id,file:f.modelId,v:'1'})).status,302);assert.deepEqual(f.signed,[{path:'SECRET/MODEL',ttl:60}]);
 assert.equal((await f.read({action:'media',id:row.id,file:randomUUID(),v:'1'})).status,404);
 assert.equal((await f.read({action:'media',id:row.id,file:f.photoId,v:'999'})).status,404);
 f.tables.atelier_files[0].project_id=randomUUID();assert.equal((await f.read({action:'media',id:row.id,file:f.photoId,v:'1'})).status,404);
 f.tables.atelier_files[0].project_id=f.projectId;f.tables.atelier_files[0].state='pending';assert.equal((await f.read({action:'media',id:row.id,file:f.photoId,v:'1'})).status,404);
 assert.equal(f.signed.length,1);
});
test('retiring a publication removes its catalogue entry, blocks media and suppresses any old editorial version',async()=>{
 const f=fixture();f.draft.slug='bague-rivages';await f.call(admin,'POST',{revision:0,draft:f.draft,command:'publish'});const row=f.tables.atelier_presentations[0];
 await f.call(admin,'POST',{revision:1,command:'unpublish'});
 const catalogue=(await f.read()).result;assert.deepEqual(catalogue,{products:[],hiddenSlugs:['bague-rivages']});
 assert.equal((await f.read({action:'media',id:row.id,file:f.photoId,v:'1'})).status,404);
 assert.deepEqual(mergePublications([{id:'bague-rivages'}],catalogue),[]);
 assert.equal(row.draft.description,'Présentation publique');
});
test('publishing rejects missing, pending, foreign or unsupported assets without exposing or modifying a live version',async()=>{
 const f=fixture();for(const invalid of [randomUUID(),f.modelId]){
  const draft={...f.draft,gallery:[{fileId:invalid,editorial:'',alt:'',caption:''}]};assert.equal((await f.call(admin,'POST',{revision:0,draft,command:'publish'})).status,400);
 }
 f.tables.atelier_files[0].state='pending';assert.equal((await f.call(admin,'POST',{revision:0,draft:f.draft,command:'publish'})).status,400);
 f.tables.atelier_files[0].state='ready';f.tables.atelier_files[1].metadata.name='not-public.blend';assert.equal((await f.call(admin,'POST',{revision:0,draft:f.draft,command:'publish'})).status,400);
 assert.equal(f.tables.atelier_presentations.length,0);assert.equal(f.signed.length,0);
});
test('concurrent revisions and changing an established URL are rejected',async()=>{
 const f=fixture();await f.call(admin,'POST',{revision:0,draft:f.draft,command:'publish'});
 assert.equal((await f.call(admin,'POST',{revision:0,draft:{...f.draft,name:'Stale'},command:'publish'})).status,409);
 assert.equal((await f.call(admin,'POST',{revision:1,draft:{...f.draft,slug:'another-address'},command:'publish'})).status,400);
 assert.equal(f.tables.atelier_presentations[0].live.name,'Bague Test');
});
test('existing editorial photos can be retained while text is edited, and new galleries determine the cover',()=>{
 const draft={...emptyPresentation({id:'test',name:'Bague'},{id:'bague-rivages',name:'Bague Rivages',universe:'rivages',category:'Bagues',image:'face.jpg',detail:'detail.jpg',description:'Texte'}),description:'Nouveau texte'};
 assert.equal(publicationSnapshot(draft,[]).gallery.length,2);
 const products=mergePublications([{id:'bague-rivages',image:'face.jpg',detail:'detail.jpg'}],{products:[{id:'bague-rivages',sourceSlug:'bague-rivages',name:'Nouveau titre',gallery:[{editorial:'detail',alt:'Paysage'},{editorial:'image',alt:'Bijou'}]}]});
 assert.equal(products[0].image,'detail.jpg');assert.equal(products[0].gallery[1].src,'face.jpg');
 assert.throws(()=>validatePresentation({...draft,sourceSlug:'../../secret'}));
 assert.throws(()=>validatePresentation({...draft,gallery:[{fileId:'a',editorial:'image'}]}));
});
