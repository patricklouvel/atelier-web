import {randomUUID} from 'node:crypto';
import {client,authorize} from '../lib/auth.js';
import {serverSupabaseConfig} from '../lib/supabase-config.js';
import {requireRole,AUDIENCES} from '../lib/access-policy.js';
import {fail,uuid,text,assertRead,canReadFile,projectView,validateProject,uploadMetadata} from '../lib/workshop-policy.js';
import {managePresentation} from '../lib/presentation-service.js';

function checked(result){if(result.error)throw fail(result.error.code==='42P01'||result.error.code==='PGRST205'?'Atelier web à initialiser : exécutez setup.sql dans Supabase.':'Enregistrement indisponible. Réessayez.',503);return result.data;}
export function createWorkshopHandler(c,storage,checkAccess=req=>authorize(req,c)){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(200).json({});
 try{
  const member=await checkAccess(req);requireRole(member,['admin','participant','guest']);
  const action=req.query?.action||'index',body=req.body||{};
  if(action==='presentation')return res.status(200).json(await managePresentation(c,member,req.query.projectId||body.projectId,req.method,body));
  async function getProject(id){const row=checked(await c.from('atelier_projects').select('*').eq('id',uuid(id)).maybeSingle());assertRead(row,member);return row;}
  async function one(row){
   const [files,events]=await Promise.all([c.from('atelier_files').select('*').eq('project_id',row.id).eq('state','ready'),member.role==='guest'?{data:[]}:c.from('atelier_events').select('*').eq('project_id',row.id).order('created_at',{ascending:false})]);
   return projectView(row,checked(files)||[],checked(events)||[],member);
  }
  if(action==='people'&&req.method==='GET'){
   requireRole(member,['admin']);const members=checked(await c.from('atelier_members').select('email,role'))||[];
   return res.status(200).json({people:members.map(p=>({id:p.email,email:p.email,name:p.email,role:p.role}))});
  }
  if(action==='index'&&req.method==='GET'){
   let query=c.from('atelier_projects').select('*').order('created_at',{ascending:false});
   if(member.role==='participant')query=query.contains('assignees',[member.email]);
   if(member.role==='guest')query=query.contains('client_emails',[member.email]).eq('published',true);
   const rows=checked(await query)||[],ids=rows.map(row=>row.id),collectionIds=[...new Set(rows.map(row=>row.collection_id))];
   const [collections,files,events,members]=await Promise.all([
    member.role==='admin'?c.from('atelier_collections').select('*').order('name'):collectionIds.length?c.from('atelier_collections').select('*').in('id',collectionIds):{data:[]},
    ids.length?c.from('atelier_files').select('*').in('project_id',ids).eq('state','ready'):{data:[]},
    ids.length&&member.role!=='guest'?c.from('atelier_events').select('*').in('project_id',ids).order('created_at',{ascending:false}):{data:[]},
    member.role==='admin'?c.from('atelier_members').select('email,role'):{data:[]},
   ]);
   const fs=checked(files)||[],es=checked(events)||[];
   return res.status(200).json({version:1,collections:checked(collections)||[],people:(checked(members)||[]).map(p=>({id:p.email,email:p.email,name:p.email,role:p.role})),pieces:rows.map(row=>projectView(row,fs,es,member))});
  }
  if(action==='collection'&&['POST','PATCH'].includes(req.method)){
   requireRole(member,['admin']);const name=text(body.name,200).trim(),description=text(body.description||'');if(!name)throw fail('Le nom de la collection est requis.');
   let row;
   if(req.method==='POST')row=checked(await c.from('atelier_collections').insert({id:uuid(body.id),name,description}).select().single());
   else{if(!Number.isSafeInteger(body.revision))throw fail('Révision manquante.');row=checked(await c.from('atelier_collections').update({name,description,revision:body.revision+1}).eq('id',uuid(body.id)).eq('revision',body.revision).select().maybeSingle());if(!row)throw fail('La collection a été modifiée ailleurs. Actualisez avant de réessayer.',409);}
   return res.status(req.method==='POST'?201:200).json({collection:row});
  }
  if(action==='project'&&['POST','PATCH'].includes(req.method)){
   const old=req.method==='PATCH'?await getProject(body.id):null;
   const row=validateProject(body,old,member);
   if(member.role==='admin'){
    const assigned=[...new Set([...row.assignees,...row.client_emails])];
    if(assigned.length){
     const members=checked(await c.from('atelier_members').select('email,role').in('email',assigned));
     for(const [field,excluded] of [['assignees','guest'],['client_emails','participant']]){
      const valid=email=>{const m=members.find(m=>m.email===email);return m&&m.role!==excluded;};
      if(row[field].some(email=>!valid(email)&&!old?.[field]?.includes(email)))throw fail('Invitez la personne avec un rôle adapté avant de lui donner accès.');
      // Removed members and changed roles must not make old projects impossible to edit.
      row[field]=row[field].filter(valid);
     }
    }
   }
   if(req.method==='POST'){
    const saved=checked(await c.from('atelier_projects').insert({id:uuid(body.id),...row}).select().single());
    return res.status(201).json({piece:await one(saved)});
   }
   if(!Number.isSafeInteger(body.revision)||body.revision<1)throw fail('Révision manquante.');
   const currentFiles=checked(await c.from('atelier_files').select('*').eq('project_id',old.id).eq('state','ready'))||[];
   const updates=[];
   if(member.role==='admin'){
    if(!Array.isArray(body.files)||body.files.length>1000)throw fail('Liste de fichiers invalide.');
    for(const f of body.files){const original=currentFiles.find(x=>x.id===f.id);if(!original)throw fail('Un fichier a changé. Actualisez la pièce.',409);if(!AUDIENCES.includes(f.audience))throw fail('Visibilité invalide.');updates.push({id:f.id,metadata:{...original.metadata,version:text(f.version||'',40),audience:f.audience,approved:f.approved===true}});}
    if(row.payload.cover&&!currentFiles.some(f=>f.id===row.payload.cover&&f.metadata.image))throw fail('La couverture doit être une image de cette pièce.');
   }
   const event=[old.payload.status!==row.payload.status?`Étape : ${old.payload.status} → ${row.payload.status}`:'',body.event?text(body.event,10000):''].filter(Boolean).join('\n')||(member.role==='admin'?'Dossier de la pièce mis à jour.':'Suivi de production mis à jour.');
   const result=await c.rpc('atelier_save_project',{p_id:old.id,p_revision:body.revision,p_data:row,p_files:updates,p_event:event,p_actor:member.email});
   if(result.error?.code==='40001')throw fail('Cette pièce a été modifiée par une autre personne. Vos changements sont conservés à l’écran. Actualisez puis reportez-les.',409);
   const saved=checked(result);return res.status(200).json({piece:await one(saved)});
  }
  if(action==='comment'&&req.method==='POST'){
   requireRole(member,['admin','participant']);const row=await getProject(body.projectId),message=text(body.text,10000).trim();if(!message)throw fail('Le message est vide.');
   const event=checked(await c.from('atelier_events').insert({project_id:row.id,author:member.email,text:message}).select().single());
   return res.status(201).json({event:{id:event.id,at:event.created_at,author:event.author,text:event.text}});
  }
  if(action==='upload'&&req.method==='POST'){
   requireRole(member,['admin','participant']);const row=await getProject(body.projectId),metadata=uploadMetadata(body,member.role),id=randomUUID(),path=`workshop/${row.id}/${id}/${metadata.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
   checked(await c.from('atelier_files').insert({id,project_id:row.id,metadata,storage_path:path,uploader:member.email}));
   const signed=checked(await storage.createSignedUploadUrl(path));return res.status(201).json({id,url:signed.signedUrl});
  }
  if(['complete','file-url','cancel-upload'].includes(action)){
   const file=checked(await c.from('atelier_files').select('*').eq('id',uuid(body.id||req.query.id)).maybeSingle());if(!file)throw fail('Fichier introuvable.',404);
   await getProject(file.project_id);
   if(action==='file-url'&&req.method==='GET'){
    if(!canReadFile(file,member))throw fail('Fichier non partagé.',403);
    const signed=checked(await storage.createSignedUrl(file.storage_path,60,req.query.download==='1'?{download:file.metadata.name}:{}));return res.status(200).json({url:signed.signedUrl});
   }
   requireRole(member,['admin','participant']);if(file.uploader!==member.email&&member.role!=='admin')throw fail('Transfert réservé à son auteur.',403);
   if(action==='cancel-upload'&&req.method==='POST'){
    if(file.state!=='pending')throw fail('Ce transfert est déjà terminé.',409);
    checked(await storage.remove([file.storage_path]));checked(await c.from('atelier_files').delete().eq('id',file.id).eq('state','pending'));return res.status(200).json({ok:true});
   }
   if(action==='complete'&&req.method==='POST'){
    if(file.state==='ready')return res.status(200).json({file:{id:file.id,...file.metadata,remote:true}});
    const info=checked(await storage.info(file.storage_path));
    if(Number(info?.size??info?.metadata?.size)!==file.metadata.size)throw fail('Le transfert est incomplet. Réessayez.');
    checked(await c.from('atelier_files').update({state:'ready'}).eq('id',file.id));
    return res.status(200).json({file:{id:file.id,...file.metadata,remote:true}});
   }
  }
  throw fail('Action inconnue.',400);
 }catch(error){return res.status(error.status||500).json({error:error.status?error.message:'Service Atelier indisponible. Vérifiez la configuration Supabase.',...(error.status===409?{conflict:true}:{})});}
};}
export default async function handler(req,res){
 if(!req.headers.authorization){res.setHeader('Cache-Control','no-store');return res.status(401).json({error:'Connexion requise.'});}
 try{const c=client(),config=serverSupabaseConfig(process.env);return await createWorkshopHandler(c,c.storage.from(config.bucket))(req,res);}catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'Configuration Supabase manquante sur l’hébergement.'});}
}
