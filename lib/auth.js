import {createClient} from '@supabase/supabase-js';
export function client(){return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function authorize(req,c=client()){
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!token)throw Object.assign(Error('Connexion requise'),{status:401});
 const {data,error}=await c.auth.getUser(token);const user=data?.user;if(error||!user?.email||!user.email_confirmed_at)throw Object.assign(Error('Connexion requise'),{status:401});
 const member=await c.from('atelier_members').select('email').eq('email',user.email.toLowerCase()).maybeSingle();
 if(member.error)throw Object.assign(Error('Vérification des accès indisponible'),{status:503});
 if(!member.data)throw Object.assign(Error('Cette adresse n’est pas autorisée par le propriétaire.'),{status:403});
 return user;
}
