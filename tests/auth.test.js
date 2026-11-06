import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorize} from '../lib/auth.js';
function client(email,allowed,confirmed=true,role='guest',projects=[]){return{
 auth:{getUser:async token=>token==='valid'?{data:{user:{email,email_confirmed_at:confirmed?'now':null,user_metadata:{role:'admin'}}}}:{error:true}},
 from(table){return {select(){return {eq(_key,value){
  if(table==='atelier_members')return {maybeSingle:async()=>({data:allowed&&value===email.toLowerCase()?{email:email.toLowerCase(),role}:null})};
  return Promise.resolve({data:projects.map(project_token=>({project_token}))});
 }}}};}
};}
test('confirmed identity and membership are required',async()=>{
 await assert.rejects(()=>authorize({headers:{}},client('a@b.fr',true)),error=>error.status===401);
 await assert.rejects(()=>authorize({headers:{authorization:'Bearer valid'}},client('a@b.fr',false)),error=>error.status===403);
 await assert.rejects(()=>authorize({headers:{authorization:'Bearer valid'}},client('a@b.fr',true,false)),error=>error.status===401);
 assert.equal((await authorize({headers:{authorization:'Bearer valid'}},client('A@B.FR',true))).email,'a@b.fr');
});
test('forged tokens and missing roles do not grant access',async()=>{
 await assert.rejects(()=>authorize({headers:{authorization:'Bearer invented'}},client('a@b.fr',true)),error=>error.status===401);
 await assert.rejects(()=>authorize({headers:{authorization:'Bearer valid'}},client('a@b.fr',true,true,'unknown')),error=>error.status===503);
});
test('role comes from the protected table, not editable user metadata',async()=>{
 const member=await authorize({headers:{authorization:'Bearer valid'}},client('a@b.fr',true,true,'participant',['a'.repeat(48)]));
 assert.equal(member.role,'participant');assert.deepEqual(member.projectTokens,['a'.repeat(48)]);
});
