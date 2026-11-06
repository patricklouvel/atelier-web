import {client,authorize} from '../lib/auth.js';
import {ROLES,requireRole} from '../lib/access-policy.js';
import {timingSafeEqual} from 'node:crypto';
const fail=(text,status=400)=>Object.assign(new Error(text),{status});
const validToken=value=>typeof value==='string'&&/^[a-f0-9]{48}$/.test(value);
function ownerKey(req,key){const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+key);return Boolean(key?.length>=32&&a.length===b.length&&timingSafeEqual(a,b));}

export function createAccessHandler(c,{publishKey='',portalUrl=''}={}){return async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,PUT,DELETE,OPTIONS');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(200).json({});
 try{
  const action=req.query?.action;
  if(action==='me'&&req.method==='GET'){
   const member=await authorize(req,c);
   return res.status(200).json({member:{email:member.email,role:member.role}});
  }
  const principal=ownerKey(req,publishKey)?{role:'admin',email:null}:await authorize(req,c);
  requireRole(principal,['admin']);
  if(action==='project'){
   const token=req.query?.token||req.body?.token;
   if(!validToken(token))throw fail('Projet invalide');
   if(req.method==='GET'){
    const result=await c.from('atelier_project_access').select('email').eq('project_token',token);
    if(result.error)throw fail('Lecture des partages indisponible.',503);
    return res.status(200).json({emails:(result.data||[]).map(row=>row.email)});
   }
   if(req.method!=='PUT')throw fail('Méthode non autorisée',405);
   const email=String(req.body?.email||'').trim().toLowerCase();
   if(!email||typeof req.body.granted!=='boolean')throw fail('Partage invalide');
   const result=req.body.granted?await c.from('atelier_project_access').upsert({project_token:token,email},{onConflict:'project_token,email'}):await c.from('atelier_project_access').delete().eq('project_token',token).eq('email',email);
   if(result.error)throw fail('Le partage n’a pas pu être enregistré. Vérifiez que ce compte est autorisé.',503);
   return res.status(200).json({ok:true});
  }
  if(req.method==='GET'){
   const result=await c.from('atelier_members').select('email,role,created_at').order('created_at');
   if(result.error)throw fail('Gestion des comptes indisponible. Vérifiez la migration des rôles.',503);
   return res.status(200).json({members:result.data});
  }
  const email=String(req.body?.email||'').trim().toLowerCase();
  if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw fail('Adresse e-mail invalide');
  const role=req.body?.role;
  if(role!==undefined&&!ROLES.includes(role))throw fail('Rôle invalide');
  if(principal.email===email&&(req.method==='DELETE'||(role&&role!=='admin')))throw fail('Vous ne pouvez pas retirer votre propre accès administrateur.');
  if(req.method==='DELETE'){
   const result=await c.from('atelier_members').delete().eq('email',email);
   if(result.error)throw fail('Accès non retiré. Le dernier administrateur doit être conservé.',409);
   return res.status(200).json({ok:true});
  }
  if(req.method==='PATCH'){
   if(!role)throw fail('Choisissez un rôle');
   const result=await c.from('atelier_members').update({role}).eq('email',email).select('email,role').maybeSingle();
   if(result.error)throw fail('Rôle non modifié. Le dernier administrateur doit être conservé.',409);
   if(!result.data)throw fail('Compte autorisé introuvable.',404);
   return res.status(200).json({member:result.data});
  }
  if(req.method==='POST'){
   const previous=await c.from('atelier_members').select('email,role').eq('email',email).maybeSingle();
   if(previous.error)throw fail('Gestion des comptes indisponible. Vérifiez la migration des rôles.',503);
   const result=await c.from('atelier_members').upsert({email,role:role||previous.data?.role||'guest'},{onConflict:'email'});
   if(result.error)throw fail('Le compte n’a pas pu être autorisé.',503);
   const origin=portalUrl||`https://${req.headers.host||''}`;
   const redirect=new URL('/atelier/activer',origin);
   if(!['https:','http:'].includes(redirect.protocol)||!redirect.hostname)throw fail('Adresse du portail non configurée.',503);
   const invited=await c.auth.admin.inviteUserByEmail(email,{redirectTo:redirect.href});
   return res.status(200).json({ok:true,warning:invited.error?'Accès enregistré. L’e-mail d’invitation n’a pas été envoyé : le compte existe peut-être déjà, ou la messagerie doit être configurée. Un compte déjà activé peut utiliser son mot de passe.':null});
  }
  throw fail('Méthode non autorisée',405);
 }catch(error){return res.status(error.status||503).json({error:error.status?error.message:'Gestion des accès indisponible.'});}
};}
export default async function handler(req,res){
 if(req.method==='OPTIONS')return createAccessHandler(null)(req,res);
 if(!req.headers.authorization)return res.status(401).json({error:'Connexion requise'});
 try{return await createAccessHandler(client(),{publishKey:process.env.ATELIER_PUBLISH_KEY,portalUrl:process.env.PUBLIC_PORTAL_URL})(req,res);}
 catch{return res.status(503).json({error:'Service des accès non configuré.'});}
}
