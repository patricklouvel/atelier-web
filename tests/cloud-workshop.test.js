import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkshopHandler} from '../api/workshop.js';
import {projectView,validateProject,uploadMetadata,safeProduction} from '../lib/workshop-policy.js';
import {presentationUsesFile} from '../src/workshop/file-removal.js';
import {productionDefaults} from '../src/workshop/production-model.js';

const admin={email:'admin@example.fr',role:'admin'},team={email:'atelier@example.fr',role:'participant'},guest={email:'client@example.fr',role:'guest'};
function fixture(){
 const collection=randomUUID(),id=randomUUID();
 const project={id,collection_id:collection,revision:1,assignees:[team.email],client_emails:[guest.email],published:true,payload:{name:'Amarre',code:'AMA-001',brief:'Consigne interne',notes:'Note privée',clientText:'Texte client',status:'Modélisation',production:productionDefaults()}};
 const tables={atelier_collections:[{id:collection,name:'Rivages',description:'',revision:1}],atelier_projects:[project],atelier_members:[admin,team,guest],atelier_files:[],atelier_events:[]},signed=[],blobs=new Map();
 const c={from(table){const filters=[];let op='read',values,single=false;const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},contains(k,v){filters.push(r=>v.every(x=>r[k].includes(x)));return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},insert(v){op='insert';values=v;return q},update(v){op='update';values=v;return q},delete(){op='delete';return q},single(){single=true;return q},maybeSingle(){single=true;return q},then(resolve,reject){try{let rows=tables[table].filter(row=>filters.every(f=>f(row)));if(op==='insert'){rows=[{id:randomUUID(),revision:1,state:'pending',created_at:new Date().toISOString(),...values}];tables[table].push(...rows)}if(op==='update')rows.forEach(row=>Object.assign(row,values));if(op==='delete')tables[table]=tables[table].filter(row=>!rows.includes(row));return Promise.resolve({data:structuredClone(single?rows[0]||null:rows)}).then(resolve,reject);}catch(e){return Promise.reject(e).then(resolve,reject)}}};return q},async rpc(name,args){if(name==='atelier_prepare_file_deletion'){
 const row=tables.atelier_projects.find(r=>r.id===args.p_project_id),file=tables.atelier_files.find(f=>f.id===args.p_file_id);
 if(file.metadata.deleting)return {data:null};
 if(row.revision!==args.p_revision)return {error:{code:'40001'}};
 const presentation=(tables.atelier_presentations||[]).find(p=>p.project_id===row.id);
 if(presentationUsesFile(presentation,file.id))return {error:{code:'23503'}};
 row.payload=args.p_payload;row.revision++;file.state='pending';file.metadata.deleting=true;return {data:null};
}const row=tables.atelier_projects.find(r=>r.id===args.p_id&&r.revision===args.p_revision);if(!row)return {error:{code:'40001'}};Object.assign(row,args.p_data,{revision:row.revision+1});args.p_files.forEach(f=>Object.assign(tables.atelier_files.find(x=>x.id===f.id),{metadata:f.metadata}));tables.atelier_events.push({id:randomUUID(),project_id:row.id,author:args.p_actor,text:args.p_event,created_at:new Date().toISOString()});return {data:structuredClone(row)}}};
 const storage={createSignedUrl:async path=>{signed.push(path);return {data:{signedUrl:'https://storage.example/'+path}}},createSignedUploadUrl:async path=>({data:{signedUrl:'https://storage.example/upload/'+path}}),info:async path=>({data:{size:blobs.get(path)}}),remove:async paths=>{paths.forEach(p=>blobs.delete(p));return {data:[]}}};
 async function call(member,action,method='GET',body={},query={}){let status,result;await createWorkshopHandler(c,storage,async()=>member)({method,headers:{},query:{action,...query},body},{setHeader(){},status(s){status=s;return this},json(v){result=v}});return {status,result};}
 return {tables,project,id,collection,call,blobs,signed,storage};
}
test('online workshop creates collections and projects without any desktop manifest',async()=>{
 const f=fixture(),id=randomUUID();assert.equal((await f.call(admin,'collection','POST',{id,name:'Mielles',description:'Dunes'})).status,201);
 const result=await f.call(admin,'project','POST',{id:randomUUID(),name:'Bague Dune',collection:id,status:'Recherche'});
 assert.equal(result.status,201);assert.equal(result.result.piece.name,'Bague Dune');assert.equal((await f.call(admin,'index')).result.pieces.length,2);
 assert.equal((await f.call(team,'project','POST',{id:randomUUID(),name:'Illegal',collection:id,status:'Recherche'})).status,403);
});
test('online workshop transfers STL, Blender and 3MF attachments and keeps them private',async()=>{
 const f=fixture();
 for(const name of ['piece.stl','source.blend','impression.3mf']){
  const upload=await f.call(admin,'upload','POST',{projectId:f.id,name,size:120});assert.equal(upload.status,201);
  const file=f.tables.atelier_files.find(row=>row.id===upload.result.id);f.blobs.set(file.storage_path,120);
  assert.equal((await f.call(admin,'complete','POST',{id:file.id})).status,200);
  assert.equal(file.metadata.audience,'private');
 }
 const visible=(await f.call(admin,'index')).result.pieces[0].files;
 assert.deepEqual(visible.map(file=>file.name).sort(),['impression.3mf','piece.stl','source.blend']);
 assert.equal((await f.call(guest,'index')).result.pieces[0].files.length,0);
});

test('only admin deletes a ready file, including the stored blob; stale and public references stay protected',async()=>{
 const f=fixture();const start=await f.call(admin,'upload','POST',{projectId:f.id,name:'photo.png',size:120});
 const file=f.tables.atelier_files[0];f.blobs.set(file.storage_path,120);await f.call(admin,'complete','POST',{id:start.result.id});
 f.project.payload.cover=file.id;
 for(const member of [team,guest])assert.equal((await f.call(member,'delete-file','DELETE',{id:file.id,revision:1})).status,403);
 assert.equal((await f.call(admin,'delete-file','DELETE',{id:file.id,revision:0})).status,409);
 f.tables.atelier_presentations=[{project_id:f.id,live:{gallery:[{fileId:file.id}]}}];
 assert.equal((await f.call(admin,'delete-file','DELETE',{id:file.id,revision:1})).status,409);assert(f.blobs.has(file.storage_path));
 f.tables.atelier_presentations=[];
 const deleted=await f.call(admin,'delete-file','DELETE',{id:file.id,revision:1});assert.equal(deleted.status,200);
 assert.equal(deleted.result.piece.cover,'');assert.equal(deleted.result.piece.files.length,0);assert.equal(deleted.result.piece.revision,2);
 assert.equal(f.blobs.has(file.storage_path),false);assert.equal(f.tables.atelier_files.length,0);
 assert.equal((await f.call(admin,'file-url','GET',{}, {id:file.id})).status,404);
});

test('a failed storage deletion can be retried, and cannot resurrect as a completed upload',async()=>{
 const f=fixture();const start=await f.call(admin,'upload','POST',{projectId:f.id,name:'source.blend',size:120});
 const file=f.tables.atelier_files[0];f.blobs.set(file.storage_path,120);await f.call(admin,'complete','POST',{id:start.result.id});
 const originalRemove=f.storage.remove;f.storage.remove=async()=>({error:{code:'storage_unavailable'}});
 assert.equal((await f.call(admin,'delete-file','DELETE',{id:file.id,revision:1})).status,503);
 assert.equal((await f.call(admin,'index')).result.pieces[0].files[0].deleting,true);
 assert.equal((await f.call(team,'index')).result.pieces[0].files.length,0);
 f.storage.remove=originalRemove;
 assert.equal((await f.call(admin,'complete','POST',{id:file.id})).status,409);
 assert.equal((await f.call(admin,'file-url','GET',{}, {id:file.id})).status,409);
 assert.equal((await f.call(admin,'delete-file','DELETE',{id:file.id,revision:1})).status,200);
 assert.equal(f.tables.atelier_files.length,0);assert.equal(f.blobs.has(file.storage_path),false);
});

test('server scopes projects, collections, notes, production and history by authenticated role',async()=>{
 const f=fixture();f.tables.atelier_events.push({id:randomUUID(),project_id:f.id,author:admin.email,text:'Internal'});
 const v=(await f.call(guest,'index')).result;assert.equal(v.pieces.length,1);assert.equal(v.pieces[0].clientText,'Texte client');assert(!JSON.stringify(v).includes('Note privée'));assert(!JSON.stringify(v).includes('Consigne interne'));assert(!JSON.stringify(v).includes('Internal'));assert(!('production' in v.pieces[0]));assert.equal(v.people.length,0);
 assert.equal((await f.call(team,'index')).result.pieces[0].notes,'');
 f.project.published=false;assert.equal((await f.call(guest,'index')).result.pieces.length,0);
 f.project.assignees=[];assert.equal((await f.call(team,'index')).result.pieces.length,0);
});
test('participants update production while design, assignments, private notes and files stay protected',async()=>{
 const f=fixture(),input=structuredClone(projectView(f.project,[],[],admin));input.name='Hacked';input.notes='Hacked';input.clientEmails=['stranger@example.fr'];input.assignees=[];input.published=false;input.status='Prototype';input.production.header.client='Hacked';input.production.metal.actualWeight='3.8';input.production.operations=[{id:randomUUID(),name:'Fonte',status:'En cours'}];
 const r=await f.call(team,'project','PATCH',input);assert.equal(r.status,200);assert.equal(f.project.payload.name,'Amarre');assert.equal(f.project.payload.notes,'Note privée');assert.equal(f.project.payload.production.header.client,'');assert.equal(f.project.payload.production.metal.actualWeight,'3.8');assert.equal(f.project.payload.status,'Prototype');assert.deepEqual(f.project.assignees,[team.email]);assert.equal(f.project.published,true);assert.equal(f.tables.atelier_events[0].author,team.email);
 assert.equal((await f.call(guest,'project','PATCH',input)).status,403);
});
test('concurrent edits return a conflict instead of overwriting the newer revision',async()=>{
 const f=fixture(),draft=projectView(f.project,[],[],admin);draft.name='Version A';assert.equal((await f.call(admin,'project','PATCH',draft)).status,200);draft.name='Version B';const second=await f.call(admin,'project','PATCH',draft);assert.equal(second.status,409);assert.equal(second.result.conflict,true);assert.equal(f.project.payload.name,'Version A');
});
test('file transfers verify ownership, actual byte size and role before issuing download links',async()=>{
 const f=fixture();const start=await f.call(admin,'upload','POST',{projectId:f.id,name:'prototype.stl',size:123});assert.equal(start.status,201);const file=f.tables.atelier_files[0];assert.equal(file.metadata.audience,'private');assert.equal((await f.call(admin,'complete','POST',{id:file.id})).status,400);assert.equal(file.state,'pending');f.blobs.set(file.storage_path,123);assert.equal((await f.call(admin,'complete','POST',{id:file.id})).status,200);
 assert.equal((await f.call(team,'file-url','GET',{}, {id:file.id})).status,403);assert.equal((await f.call(guest,'file-url','GET',{}, {id:file.id})).status,403);assert.equal(f.signed.length,0);
 file.metadata.audience='team';assert.equal((await f.call(team,'file-url','GET',{}, {id:file.id})).status,200);assert.equal((await f.call(guest,'file-url','GET',{}, {id:file.id})).status,403);file.metadata.audience='client';assert.equal((await f.call(guest,'file-url','GET',{}, {id:file.id})).status,200);
 f.project.client_emails=[];assert.equal((await f.call(guest,'file-url','GET',{}, {id:file.id})).status,403);
});
test('assigned participants can upload production files but cannot complete another user transfer',async()=>{
 const f=fixture();assert.equal((await f.call(team,'upload','POST',{projectId:f.id,name:'controle.png',size:100})).status,201);const file=f.tables.atelier_files[0];assert.equal(file.metadata.audience,'team');assert.equal((await f.call({...team,email:'other@example.fr'},'complete','POST',{id:file.id})).status,403);assert.equal((await f.call(guest,'upload','POST',{projectId:f.id,name:'no.png',size:1})).status,403);
});
test('comments use verified identity and cannot be submitted by guests or unassigned participants',async()=>{
 const f=fixture();const r=await f.call(team,'comment','POST',{projectId:f.id,text:'Assise à vérifier',author:'Admin'});assert.equal(r.status,201);assert.equal(r.result.event.author,team.email);assert.equal((await f.call(guest,'comment','POST',{projectId:f.id,text:'no'})).status,403);f.project.assignees=[];assert.equal((await f.call(team,'comment','POST',{projectId:f.id,text:'no'})).status,403);
});
test('invalid assignments, file visibility, formats, and oversize uploads fail closed',async()=>{
 const f=fixture(),draft=projectView(f.project,[],[],admin);draft.clientEmails=['unknown@example.fr'];assert.equal((await f.call(admin,'project','PATCH',draft)).status,400);draft.clientEmails=[team.email];assert.equal((await f.call(admin,'project','PATCH',draft)).status,400);
 assert.throws(()=>uploadMetadata({name:'bad.html',size:100},'admin'));assert.throws(()=>uploadMetadata({name:'big.blend',size:201*1024*1024},'admin'));assert.throws(()=>validateProject({...draft,status:'Anything'},f.project,admin));
});
test('malformed production fields cannot break shared screens and unknown fields are discarded',()=>{
 const production=productionDefaults();production.operations=[{id:randomUUID(),name:{invalid:true}}];assert.throws(()=>safeProduction(production));production.operations=[];production.header.client=['invalid'];assert.throws(()=>safeProduction(production));production.header.client='Client';production.secret='ignored';assert.equal(safeProduction(production).secret,undefined);
});
