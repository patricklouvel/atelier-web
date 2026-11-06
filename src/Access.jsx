import React,{useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {LockKeyhole,ArrowRight} from 'lucide-react';
import {readAuthCallback} from '../lib/auth-callback.js';

const callback=readAuthCallback(location);
const publicKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configured=Boolean(import.meta.env.VITE_SUPABASE_URL&&publicKey);
export const auth=configured?createClient(import.meta.env.VITE_SUPABASE_URL,publicKey,{auth:{storage:window.sessionStorage,storageKey:'atelier.auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;

export default function Access({children}){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
 const [mode,setMode]=useState(callback.passwordSetup&&!callback.errorMessage?'setup':'login');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [message,setMessage]=useState(callback.errorMessage),[busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!auth){setLoading(false);return;}
  let active=true;
  auth.auth.getSession().then(({data,error})=>{if(active){setSession(data?.session||null);if(error)setMessage('La session n’a pas pu être ouverte. Réessayez de vous connecter.');setLoading(false);}}).catch(()=>{if(active){setLoading(false);setMessage('Service de connexion indisponible.');}});
  const {data}=auth.auth.onAuthStateChange((event,next)=>{if(active){setSession(next);setLoading(false);if(event==='PASSWORD_RECOVERY')setMode('setup');}});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 async function login(event){
  event.preventDefault();setBusy(true);setMessage('');
  try{const {error}=await auth.auth.signInWithPassword({email:email.trim().toLowerCase(),password});if(error)setMessage('Adresse e-mail ou mot de passe incorrect, ou compte non activé.');else{setPassword('');history.replaceState(null,'','/atelier');}}
  catch{setMessage('Service de connexion indisponible.');}finally{setBusy(false);}
 }
 async function reset(event){
  event.preventDefault();setBusy(true);setMessage('');
  try{const {error}=await auth.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:location.origin+'/atelier/reinitialiser'});setMessage(error?'La demande n’a pas pu être traitée. Réessayez plus tard.':'Si un compte correspond à cette adresse, vous recevrez un e-mail pour réinitialiser votre mot de passe.');}
  catch{setMessage('Service de connexion indisponible.');}finally{setBusy(false);}
 }
 async function savePassword(event){
  event.preventDefault();setMessage('');
  if(password!==confirm){setMessage('Les deux mots de passe ne correspondent pas.');return;}
  setBusy(true);
  try{const {error}=await auth.auth.updateUser({password});if(error){setMessage('Le mot de passe n’a pas pu être enregistré. Vérifiez les exigences de sécurité ou demandez une nouvelle invitation.');}else{setPassword('');setConfirm('');setMode('login');history.replaceState(null,'','/atelier');}}
  catch{setMessage('Service de connexion indisponible.');}finally{setBusy(false);}
 }
 function changeMode(next){setMode(next);setMessage('');setPassword('');setConfirm('');}
 if(loading)return <div className="boot-screen" role="status"><span className="spinner"/>Vérification de la connexion…</div>;
 if(session&&mode!=='setup')return <><div className="session-bar"><span>{session.user.email}</span><button onClick={()=>auth.auth.signOut()}>Se déconnecter</button></div>{children(session)}</>;
 const activation=mode==='setup'&&session;
 return <div className="auth-page"><aside className="auth-art"><div className="auth-copy"><span className="brand">ATELIER</span><div className="auth-line"/><h2>Votre espace<br/>professionnel.</h2><p>Collections, projets et fichiers partagés.<br/>Un accès réservé aux personnes autorisées.</p></div></aside><main className="login"><LockKeyhole size={28}/><h1>{!configured?'Connexion indisponible':activation?'Définir votre mot de passe':mode==='reset'?'Mot de passe oublié ?':'Connexion à l’atelier'}</h1>
 {!configured?<p>La connexion de cet espace n’est pas encore configurée.</p>:activation?<><p>Choisissez votre mot de passe. Vous utiliserez ensuite votre adresse e-mail et ce mot de passe pour vous connecter.</p><form onSubmit={savePassword}><label>Nouveau mot de passe<input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><small>Au moins 12 caractères.</small><label>Confirmer le mot de passe<input type="password" required minLength={12} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="button primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer mon mot de passe'}<ArrowRight size={16}/></button></form></>:<><p>{mode==='reset'?'Saisissez l’adresse de votre compte pour recevoir un lien de réinitialisation.':'Connectez-vous avec les identifiants de votre compte invité.'}</p>{mode==='setup'&&<p className="notice error" role="alert">Le lien d’activation n’est plus valide. Demandez une nouvelle invitation à l’administrateur.</p>}<form onSubmit={mode==='reset'?reset:login}><label>Adresse e-mail<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>{mode!=='reset'&&<label>Mot de passe<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>}<button className="button primary" disabled={busy}>{busy?'Veuillez patienter…':mode==='reset'?'Réinitialiser mon mot de passe':'Se connecter'}<ArrowRight size={16}/></button></form><button className="text-button" onClick={()=>changeMode(mode==='reset'?'login':'reset')}>{mode==='reset'?'Revenir à la connexion':'Mot de passe oublié ?'}</button><p className="login-local-hint">Les comptes sont créés uniquement sur invitation de l’administrateur.</p></>}
 {message&&<p className="notice" role="status">{message}</p>}</main></div>;
}
