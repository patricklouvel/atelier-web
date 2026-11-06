import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAccessHandler} from '../api/access.js';

function fixture(){
 const people=new Map([['admin@example.com',{email:'admin@example.com',role:'admin'}]]),invitations=[],grants=[];
 const c={auth:{
  getUser:async()=>({data:{user:{email:'admin@example.com',email_confirmed_at:'now'}}}),
  admin:{inviteUserByEmail:async(email,options)=>{invitations.push({email,...options});return {data:{user:{email}}}}},
 },from(table){
  const query={conditions:[],mode:'select',value:null,
   select(){return this},eq(key,value){this.conditions.push([key,value]);return this},order(){return this},
   upsert(value){this.mode='upsert';this.value=value;return this},update(value){this.mode='update';this.value=value;return this},delete(){this.mode='delete';return this},
   execute(){
    if(table==='atelier_project_access'){
     if(this.mode==='upsert')grants.push(this.value);
     return {data:grants.filter(row=>this.conditions.every(([key,value])=>row[key]===value))};
    }
    let rows=[...people.values()].filter(row=>this.conditions.every(([key,value])=>row[key]===value));
    if(this.mode==='upsert'){people.set(this.value.email,{...this.value});rows=[this.value]}
    if(this.mode==='update'){rows=rows.map(row=>({...row,...this.value}));rows.forEach(row=>people.set(row.email,row))}
    if(this.mode==='delete')rows.forEach(row=>people.delete(row.email));
    return {data:rows};
   },
   async maybeSingle(){const result=this.execute();return {data:result.data[0]||null}},
   then(resolve,reject){return Promise.resolve(this.execute()).then(resolve,reject)},
  };return query;
 }};
 const handler=createAccessHandler(c,{portalUrl:'https://atelier.example'});
 async function call(method,body={},query={}){let status,result;await handler({method,body,query,headers:{authorization:'Bearer real-session'}},{setHeader(){},status(value){status=value;return this},json(value){result=value}});return {status,result};}
 return {call,people,invitations,grants};
}
test('administrator chooses invitation role and activation redirects to password setup',async()=>{
 const f=fixture(),result=await f.call('POST',{email:' PARTICIPANT@EXAMPLE.COM ',role:'participant'});
 assert.equal(result.status,200);
 assert.equal(f.people.get('participant@example.com').role,'participant');
 assert.deepEqual(f.invitations,[{email:'participant@example.com',redirectTo:'https://atelier.example/atelier/activer'}]);
});
test('administrator can edit other roles but cannot demote or delete their own account',async()=>{
 const f=fixture();await f.call('POST',{email:'client@example.com',role:'guest'});
 assert.equal((await f.call('PATCH',{email:'client@example.com',role:'participant'})).status,200);
 assert.equal(f.people.get('client@example.com').role,'participant');
 assert.equal((await f.call('PATCH',{email:'admin@example.com',role:'guest'})).status,400);
 assert.equal((await f.call('DELETE',{email:'admin@example.com'})).status,400);
 assert.equal(f.people.get('admin@example.com').role,'admin');
 assert.equal((await f.call('POST',{email:'bad@example.com',role:'superadmin'})).status,400);
});
test('legacy invitation calls preserve an existing role and default new accounts to guest',async()=>{
 const f=fixture();await f.call('POST',{email:'participant@example.com',role:'participant'});
 await f.call('POST',{email:'participant@example.com'});
 await f.call('POST',{email:'new@example.com'});
 assert.equal(f.people.get('participant@example.com').role,'participant');
 assert.equal(f.people.get('new@example.com').role,'guest');
});
