import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../api/portal.js';
import {createAccessHandler} from '../api/access.js';
import {readAuthCallback} from '../lib/auth-callback.js';

const token='a'.repeat(48),other='b'.repeat(48);
function fixture(role,assigned=true){
 const signed=[];
 const manifests={
  [token]:{name:'Rivages',collection:'Rivages',brief:'INTERNAL PRODUCTION NOTES',clientBrief:'Texte client',files:[
   {name:'private.blend',size:1,image:false,audience:'private',path:`files/${token}/0-private.blend`,note:'Private'},
   {name:'production.stl',size:1,image:false,audience:'team',path:`files/${token}/1-production.stl`,note:'Technical note'},
   {name:'render.png',size:1,image:true,audience:'client',path:`files/${token}/2-render.png`,note:'INTERNAL FILE NOTE'},
  ]},
  [other]:{name:'Secret project',files:[{name:'secret.png',image:true,path:`files/${other}/secret.png`}]},
 };
 const storage={
  list:async()=>({data:Object.keys(manifests).map(id=>({name:id+'.json'}))}),
  download:async path=>{const id=path.split('/').at(-1).replace('.json','');return manifests[id]?{data:new Blob([JSON.stringify(manifests[id])])}:{error:true}},
  createSignedUrl:async path=>{signed.push(path);return {data:{signedUrl:'https://storage.example/'+path}}},
  upload:async(path,body)=>{manifests[path.split('/').at(-1).replace('.json','')]=JSON.parse(body);return {}},
 };
 const handler=createHandler(storage,undefined,async()=>({role,email:role+'@example.com',projectTokens:assigned?[token]:[]}));
 async function call(action,method='GET',body={},projectToken=token){let status,result;await handler({method,query:{action,token:projectToken},headers:{authorization:'Bearer real-session'},body},{setHeader(){},status(value){status=value;return this},json(value){result=value}});return {status,result};}
 return {call,signed,manifests};
}

test('admin sees all projects; participants and guests see only assigned projects',async()=>{
 assert.equal((await fixture('admin').call('index')).result.entries.length,2);
 assert.equal((await fixture('participant').call('index')).result.entries.length,1);
 assert.equal((await fixture('guest',false).call('index')).result.entries.length,0);
 assert.equal((await fixture('participant').call('read','GET',{},other)).status,403);
 assert.equal((await fixture('guest',false).call('read')).status,403);
});
test('server signs only files allowed for the role and strips internal client notes',async()=>{
 const admin=fixture('admin'),participant=fixture('participant'),guest=fixture('guest');
 assert.equal((await admin.call('read')).result.files.length,3);
 assert.deepEqual((await participant.call('read')).result.files.map(file=>file.name),['production.stl','render.png']);
 const result=await guest.call('read');
 assert.deepEqual(result.result.files.map(file=>file.name),['render.png']);
 assert.equal(result.result.brief,'Texte client');
 assert(!JSON.stringify(result).includes('INTERNAL'));
 assert(!guest.signed.some(path=>path.endsWith('.stl')||path.endsWith('.blend')));
});
test('participants and guests cannot publish, revoke, or change file visibility',async()=>{
 for(const role of ['participant','guest'])for(const [action,method] of [['create','POST'],['publish','POST'],['revoke','DELETE'],['visibility','PATCH']]){
  assert.equal((await fixture(role).call(action,method,{token,files:[{id:'0',audience:'client'}]})).status,403);
 }
 const f=fixture('admin');assert.equal((await f.call('visibility','PATCH',{token,files:[{id:'1',audience:'client'}]})).status,200);
 assert.equal(f.manifests[token].files[1].audience,'client');
});
test('legacy files without explicit visibility stay hidden from guests',async()=>{
 const f=fixture('guest');delete f.manifests[token].files[1].audience;
 assert.deepEqual((await f.call('read')).result.files.map(file=>file.name),['render.png']);
});
test('a valid session cannot self-promote through the account API',async()=>{
 let writes=0;
 const c={auth:{getUser:async()=>({data:{user:{email:'guest@example.com',email_confirmed_at:'now',user_metadata:{role:'admin'}}}})},from:table=>{
  if(table==='atelier_members')return {select:()=>({eq:()=>({maybeSingle:async()=>({data:{email:'guest@example.com',role:'guest'}})})}),upsert:()=>{writes++;return {}}};
  return {select:()=>({eq:async()=>({data:[]})})};
 }};
 const handler=createAccessHandler(c);let status;
 await handler({method:'PATCH',query:{},headers:{authorization:'Bearer real-session'},body:{email:'guest@example.com',role:'admin'}},{setHeader(){},status(value){status=value;return this},json(){}});
 assert.equal(status,403);assert.equal(writes,0);
});
test('auth callbacks at the public root enter the private flow, including expired invitations',()=>{
 const expired=readAuthCallback({pathname:'/',hash:'#error=access_denied&error_code=otp_expired'});
 assert(expired.privateEntry);assert.match(expired.errorMessage,/expiré/);
 assert(readAuthCallback({pathname:'/',hash:'#access_token=token&refresh_token=refresh&type=invite'}).passwordSetup);
 assert(readAuthCallback({pathname:'/atelier/reinitialiser'}).passwordSetup);
 assert.equal(readAuthCallback({pathname:'/collections'}).privateEntry,false);
});
