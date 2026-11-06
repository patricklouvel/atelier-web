import {createClient} from '@supabase/supabase-js';
import {serverSupabaseConfig} from './supabase-config.js';
import {ROLES} from './access-policy.js';
export function client(){const config=serverSupabaseConfig(process.env);return createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function authorize(req,c=client()){
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!token)throw Object.assign(Error('Connexion requise'),{status:401});
 const {data,error}=await c.auth.getUser(token);const user=data?.user;if(error||!user?.email||!user.email_confirmed_at)throw Object.assign(Error('Connexion requise'),{status:401});
 const member=await c.from('atelier_members').select('email,role').eq('email',user.email.toLowerCase()).maybeSingle();
 if(member.error)throw Object.assign(Error('Vérification des accès indisponible'),{status:503});
 if(!member.data)throw Object.assign(Error('Cette adresse n’est pas autorisée par le propriétaire.'),{status:403});
 if(!ROLES.includes(member.data.role))throw Object.assign(Error('Les rôles de l’espace professionnel doivent être configurés.'),{status:503});
 let projectTokens=[];
 if(member.data.role!=='admin'){
  const grants=await c.from('atelier_project_access').select('project_token').eq('email',member.data.email);
  if(grants.error)throw Object.assign(Error('Vérification des projets autorisés indisponible'),{status:503});
  projectTokens=(grants.data||[]).map(row=>row.project_token);
 }
 return {...user,email:user.email.toLowerCase(),role:member.data.role,projectTokens};
}
