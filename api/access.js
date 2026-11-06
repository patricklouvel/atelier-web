import {client} from '../lib/auth.js';import{timingSafeEqual}from'node:crypto';
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');res.setHeader('Cache-Control','no-store');if(req.method==='OPTIONS')return res.status(200).json({});
 const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+(process.env.ATELIER_PUBLISH_KEY||''));if(!process.env.ATELIER_PUBLISH_KEY||a.length!==b.length||!timingSafeEqual(a,b))return res.status(401).json({error:'Accès propriétaire requis'});
 try{const c=client();if(req.method==='GET'){const {data,error}=await c.from('atelier_members').select('email,created_at').order('created_at');if(error)throw error;return res.status(200).json({members:data});}
 const email=String(req.body?.email||'').trim().toLowerCase();if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'Adresse email invalide'});
 if(req.method==='DELETE'){const {error}=await c.from('atelier_members').delete().eq('email',email);if(error)throw error;return res.status(200).json({ok:true});}
 if(req.method==='POST'){
  const {error}=await c.from('atelier_members').upsert({email},{onConflict:'email'});if(error)throw error;
  const invited=await c.auth.admin.inviteUserByEmail(email,{redirectTo:process.env.PUBLIC_PORTAL_URL?new URL('/atelier',process.env.PUBLIC_PORTAL_URL).href:undefined});
  return res.status(200).json({ok:true,warning:invited.error?'Accès autorisé. L’invitation n’a pas été envoyée : vérifier la messagerie ou demander à la personne déjà inscrite de se connecter.':null});
 }
 return res.status(405).json({error:'Méthode non autorisée'});
 }catch{return res.status(503).json({error:'Gestion des accès indisponible : vérifier la configuration du service.'});}
}

