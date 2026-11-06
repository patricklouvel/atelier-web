import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {devApiMiddleware} from '../lib/dev-api.js';
import access from '../api/access.js';
test('local API parses requests and keeps authentication required',async t=>{
 const server=createServer(devApiMiddleware({'/api/access':access,'/api/echo':async(req,res)=>res.status(200).json({query:req.query,body:req.body})}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const result=await fetch(base+'/api/echo?action=read',{method:'POST',body:JSON.stringify({name:'Rivages'})});
 assert.deepEqual(await result.json(),{query:{action:'read'},body:{name:'Rivages'}});
 assert.equal((await fetch(base+'/api/echo',{method:'POST',body:'{'})).status,400);
 assert.equal((await fetch(base+'/api/access')).status,401);
 assert.equal((await fetch(base+'/api/unknown')).status,404);
});
