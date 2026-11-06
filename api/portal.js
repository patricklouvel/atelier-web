import {createClient} from '@supabase/supabase-js';
import {authorize} from '../lib/auth.js';
import {serverSupabaseConfig} from '../lib/supabase-config.js';
import {AUDIENCES,requireRole,canReadProject,visibleProjectFiles} from '../lib/access-policy.js';
import {randomBytes,timingSafeEqual} from 'node:crypto';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const text=(v,n)=>{if(typeof v!=='string'||v.length>n)throw fail('Texte invalide');return v.trim();};
const id=v=>{if(typeof v!=='string'||!/^[a-f0-9]{48}$/.test(v))throw fail('Lien indisponible',404);return v;};
function ownerKey(req,secret){const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+secret);return Boolean(secret&&a.length===b.length&&timingSafeEqual(a,b));}
export function validate(body){
 const files=body.files;if(!Array.isArray(files)||files.length<1||files.length>60)throw fail('Choisir entre 1 et 60 fichiers');
 return {name:text(body.name,200),collection:text(body.collection||'',200),brief:text(body.brief||'',10000),clientBrief:text(body.clientBrief||'',10000),files:files.map((file,index)=>{
  const name=text(file.name,250);if(!/\.(png|jpe?g|webp|fbx|blend|stl|obj|glb|gltf|step|stp|3dm|pdf|zip)$/i.test(name))throw fail('Format non accepté : '+name);
  if(!Number.isSafeInteger(file.size)||file.size<1||file.size>200*1024*1024)throw fail('Taille maximale : 200 Mo par fichier');
  const image=file.image===true;if(image&&!/\.(png|jpe?g|webp)$/i.test(name))throw fail('Image non prise en charge');
  const audience=file.audience||'team';if(!AUDIENCES.includes(audience))throw fail('Visibilité du fichier invalide');
  return {name,size:file.size,image,audience,note:text(file.note||'',5000),path:String(index)+'-'+name.replace(/[^a-zA-Z0-9._-]/g,'_')};
 })};
}
export function createHandler(storage,secret,checkAccess=authorize){return async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(200).json({});
 try{
  const action=req.query.action;
  if(['read','index'].includes(action)&&req.method==='GET'){
   const member=await checkAccess(req);
   requireRole(member,['admin','participant','guest']);
   if(action==='index'){
    const listed=await storage.list('published',{limit:1000});if(listed.error)throw fail('Galerie indisponible',503);
    const entries=await Promise.all(listed.data.filter(file=>/^[a-f0-9]{48}\.json$/.test(file.name)&&canReadProject(member,file.name.slice(0,-5))).map(async file=>{
     const result=await storage.download('published/'+file.name);if(result.error)return null;
     const manifest=JSON.parse(await result.data.text()),files=visibleProjectFiles(manifest,member);
     const image=files.find(item=>item.image),signed=image?await storage.createSignedUrl(image.path,60):null;
     return {token:file.name.slice(0,-5),name:manifest.name,collection:manifest.collection,created:manifest.created,cover:signed?.data?.signedUrl,counts:{images:files.filter(item=>item.image).length,models:files.filter(item=>/\.(fbx|glb|gltf|stl|obj|ply)$/i.test(item.name)).length}};
    }));return res.status(200).json({entries:entries.filter(Boolean)});
   }
   const token=id(req.query.token);
   if(!canReadProject(member,token))throw fail('Ce projet n’est pas partagé avec votre compte.',403);
   const {data,error}=await storage.download('published/'+token+'.json');if(error)throw fail('Lien indisponible ou désactivé',404);
   const manifest=JSON.parse(await data.text());
   const files=await Promise.all(visibleProjectFiles(manifest,member).map(async file=>{
    const signed=await storage.createSignedUrl(file.path,60,{download:file.name});if(signed.error)throw fail('Fichier indisponible',503);
    const preview=file.image?await storage.createSignedUrl(file.path,60):null;
    return {id:file.id,name:file.name,size:file.size,image:file.image,audience:file.audience,note:member.role==='guest'?'':file.note,url:signed.data.signedUrl,preview:preview?.data?.signedUrl};
   }));
   return res.status(200).json({name:manifest.name,collection:manifest.collection,created:manifest.created,brief:member.role==='guest'?manifest.clientBrief||'':manifest.brief,clientBrief:member.role==='admin'?manifest.clientBrief||'':undefined,files});
  }
  if(!ownerKey(req,secret))requireRole(await checkAccess(req),['admin']);
  if(action==='visibility'&&req.method==='PATCH'){
   const token=id(req.body.token),changes=req.body.files;
   if(!Array.isArray(changes)||changes.length>60)throw fail('Liste de fichiers invalide');
   const result=await storage.download('published/'+token+'.json');if(result.error)throw fail('Projet introuvable',404);
   const manifest=JSON.parse(await result.data.text());
   for(const change of changes){const index=Number(change.id);if(!Number.isInteger(index)||String(index)!==String(change.id)||!manifest.files[index]||!AUDIENCES.includes(change.audience))throw fail('Visibilité invalide');manifest.files[index].audience=change.audience;}
   if(req.body.clientBrief!==undefined)manifest.clientBrief=text(req.body.clientBrief,10000);
   const saved=await storage.upload('published/'+token+'.json',JSON.stringify(manifest),{contentType:'application/json',upsert:true});if(saved.error)throw fail('Partage non enregistré',503);
   return res.status(200).json({ok:true});
  }
  if(action==='create'&&req.method==='POST'){
   const manifest=validate(req.body),token=randomBytes(24).toString('hex');manifest.created=new Date().toISOString();manifest.files=manifest.files.map(file=>({...file,path:'files/'+token+'/'+file.path}));
   const uploads=await Promise.all(manifest.files.map(async file=>{const {data,error}=await storage.createSignedUploadUrl(file.path);if(error)throw fail('Préparation du transfert impossible',503);return {path:file.path,url:data.signedUrl};}));
   const {error}=await storage.upload('drafts/'+token+'.json',JSON.stringify(manifest),{contentType:'application/json',upsert:false});if(error)throw fail('Publication non préparée',503);
   return res.status(201).json({token,uploads});
  }
  if(action==='publish'&&req.method==='POST'){
   const token=id(req.body.token),result=await storage.download('drafts/'+token+'.json');if(result.error)throw fail('Préparation introuvable');const manifest=JSON.parse(await result.data.text());
   const listed=await storage.list('files/'+token,{limit:100});if(listed.error)throw fail('Vérification du transfert impossible',503);
   for(const file of manifest.files){const found=listed.data.find(item=>item.name===file.path.split('/').at(-1));if(!found||Number(found.metadata?.size)!==file.size)throw fail('Fichier absent ou incomplet : '+file.name);}
   const saved=await storage.upload('published/'+token+'.json',JSON.stringify(manifest),{contentType:'application/json',upsert:false});if(saved.error)throw fail('Publication déjà effectuée ou indisponible',409);
   await storage.remove(['drafts/'+token+'.json']);return res.status(201).json({token});
  }
  if(action==='revoke'&&req.method==='DELETE'){
   const token=id(req.query.token),result=await storage.remove(['published/'+token+'.json']);if(result.error)throw fail('Désactivation impossible',503);return res.status(200).json({ok:true});
  }
  throw fail('Route inconnue',404);
 }catch(error){return res.status(error.status||503).json({error:error.status?error.message:'Service de stockage indisponible'});}
};}
export default async function handler(req,res){
 const config=serverSupabaseConfig(process.env),key=process.env.ATELIER_PUBLISH_KEY,secret=key?.length>=32?key:undefined;
 if(!config.url||!config.key)return res.status(503).json({error:'Stockage non configuré'});
 const c=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
 const bucket=await c.storage.getBucket(config.bucket);if(bucket.error||bucket.data.public)return res.status(503).json({error:'Le stockage doit être privé.'});
 return createHandler(c.storage.from(config.bucket),secret,req=>authorize(req,c))(req,res);
}
