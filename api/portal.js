import {createClient} from '@supabase/supabase-js';
import{authorize}from'../lib/auth.js';
import {serverSupabaseConfig} from '../lib/supabase-config.js';
import {randomBytes,timingSafeEqual} from 'node:crypto';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const text=(v,n)=>{if(typeof v!=='string'||v.length>n)throw fail('Texte invalide');return v.trim();};
const id=v=>{if(typeof v!=='string'||!/^[a-f0-9]{48}$/.test(v))throw fail('Lien indisponible',404);return v;};
export function validate(body){
 const files=body.files;if(!Array.isArray(files)||files.length<1||files.length>60)throw fail('Choisir entre 1 et 60 fichiers');
 return {name:text(body.name,200),collection:text(body.collection||'',200),brief:text(body.brief||'',10000),files:files.map((f,i)=>{
 const name=text(f.name,250);if(!/\.(png|jpe?g|webp|fbx|blend|stl|obj|glb|gltf|step|stp|3dm|pdf|zip)$/i.test(name))throw fail('Format non accepté : '+name);
 if(!Number.isSafeInteger(f.size)||f.size<1||f.size>200*1024*1024)throw fail('Taille maximale : 200 Mo par fichier');
 const image=f.image===true;if(image&&!/\.(png|jpe?g|webp)$/i.test(name))throw fail('Image non prise en charge');
 return {name,size:f.size,image,note:text(f.note||'',5000),path:String(i)+'-'+name.replace(/[^a-zA-Z0-9._-]/g,'_')};})};
}
export function createHandler(storage,secret,checkAccess=authorize){return async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(200).json({});
 try{
 const action=req.query.action;
 if((action==='read'||action==='index')&&req.method==='GET'){
  await checkAccess(req);
  if(action==='index'){
   const listed=await storage.list('published',{limit:1000});if(listed.error)throw fail('Galerie indisponible',503);
   const entries=await Promise.all(listed.data.filter(f=>/^[a-f0-9]{48}\.json$/.test(f.name)).map(async f=>{
    const r=await storage.download('published/'+f.name);if(r.error)return null;const m=JSON.parse(await r.data.text());
    const image=m.files.find(file=>file.image);const signed=image?await storage.createSignedUrl(image.path,60):null;
    return {token:f.name.slice(0,-5),name:m.name,collection:m.collection,created:m.created,cover:signed?.data?.signedUrl,counts:{images:m.files.filter(file=>file.image).length,models:m.files.filter(file=>/\.(fbx|glb|gltf|stl|obj|ply)$/i.test(file.name)).length}};
   }));return res.status(200).json({entries:entries.filter(Boolean)});
  }
  const token=id(req.query.token);const {data,error}=await storage.download('published/'+token+'.json');if(error)throw fail('Lien indisponible ou désactivé',404);
  const manifest=JSON.parse(await data.text());const files=await Promise.all(manifest.files.map(async f=>{const {data,error}=await storage.createSignedUrl(f.path,60,{download:f.name});if(error)throw fail('Fichier indisponible',503);const preview=f.image?await storage.createSignedUrl(f.path,60):null;return {...f,path:undefined,url:data.signedUrl,preview:preview?.data?.signedUrl};}));
  return res.status(200).json({...manifest,files});
 }
 const received=Buffer.from(req.headers.authorization||'');const expected=Buffer.from('Bearer '+secret);
 if(!secret||received.length!==expected.length||!timingSafeEqual(received,expected))throw fail('Clé de publication incorrecte',401);
 if(action==='create'&&req.method==='POST'){
  const manifest=validate(req.body);const token=randomBytes(24).toString('hex');manifest.created=new Date().toISOString();manifest.files=manifest.files.map(f=>({...f,path:'files/'+token+'/'+f.path}));
  const uploads=await Promise.all(manifest.files.map(async f=>{const {data,error}=await storage.createSignedUploadUrl(f.path);if(error)throw fail('Préparation du transfert impossible',503);return {path:f.path,url:data.signedUrl};}));
  const {error}=await storage.upload('drafts/'+token+'.json',JSON.stringify(manifest),{contentType:'application/json',upsert:false});if(error)throw fail('Publication non préparée',503);
  return res.status(201).json({token,uploads});
 }
 if(action==='publish'&&req.method==='POST'){
  const token=id(req.body.token);const {data,error}=await storage.download('drafts/'+token+'.json');if(error)throw fail('Préparation introuvable');const manifest=JSON.parse(await data.text());
  const listed=await storage.list('files/'+token,{limit:100});if(listed.error)throw fail('Vérification du transfert impossible',503);
  for(const f of manifest.files){const found=listed.data.find(x=>x.name===f.path.split('/').at(-1));if(!found||Number(found.metadata?.size)!==f.size)throw fail('Fichier absent ou incomplet : '+f.name);}
  const saved=await storage.upload('published/'+token+'.json',JSON.stringify(manifest),{contentType:'application/json',upsert:false});if(saved.error)throw fail('Publication déjà effectuée ou indisponible',409);
  await storage.remove(['drafts/'+token+'.json']);return res.status(201).json({token});
 }
 if(action==='revoke'&&req.method==='DELETE'){
  const token=id(req.query.token);const {error}=await storage.remove(['published/'+token+'.json']);if(error)throw fail('Désactivation impossible',503);return res.status(200).json({ok:true});
 }
 throw fail('Route inconnue',404);
 }catch(e){res.status(e.status||503).json({error:e.status?e.message:'Service de stockage indisponible'});}
};}
export default async function handler(req,res){
 const config=serverSupabaseConfig(process.env),secret=process.env.ATELIER_PUBLISH_KEY;
 if(!config.url||!config.key)return res.status(503).json({error:'Stockage non configuré'});
 const reading=req.method==='GET'&&['read','index'].includes(req.query.action);
 if(!reading&&(!secret||secret.length<32))return res.status(503).json({error:'Publication non configurée'});
 const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
 const bucket=await client.storage.getBucket(config.bucket);if(bucket.error||bucket.data.public)return res.status(503).json({error:'Le stockage doit être privé.'});
 return createHandler(client.storage.from(config.bucket),secret,r=>authorize(r,client))(req,res);
}

