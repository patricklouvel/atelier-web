import React,{useEffect,useState} from 'react';
import CloudWorkshop from './workshop/CloudWorkshop';
import MemberManagement from './MemberManagement';
import {ROLE_LABELS} from '../lib/access-policy.js';

export async function privateRequest(session,url,options={}){
 const response=await fetch(url,{...options,cache:'no-store',headers:{Authorization:`Bearer ${session.access_token}`,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Service indisponible.');return data;
}
export default function ProfessionalArea({session}){
 const [member,setMember]=useState(null),[error,setError]=useState(''),[view,setView]=useState('projects'),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setError('');privateRequest(session,'/api/access?action=me').then(data=>{if(active)setMember(data.member);}).catch(error=>{if(active)setError(error.message);});return()=>{active=false};},[session.access_token,attempt]);
 if(error&&!member)return <main className="professional-error"><h1>Accès à l’atelier</h1><p className="notice error" role="alert">{error}</p><button className="button" onClick={()=>setAttempt(value=>value+1)}>Réessayer</button></main>;
 if(!member)return <div className="boot-screen" role="status">Vérification de vos droits…</div>;
 return <>{error&&<p className="notice error" role="alert">{error} <button onClick={()=>setAttempt(value=>value+1)}>Vérifier de nouveau l’accès</button></p>}<div className="professional-toolbar"><span>{ROLE_LABELS[member.role]}</span>{member.role==='admin'&&<nav aria-label="Administration de l’atelier"><button aria-pressed={view==='projects'} onClick={()=>setView('projects')}>Projets</button><button aria-pressed={view==='members'} onClick={()=>setView('members')}>Accès et invitations</button></nav>}</div><div hidden={view!=='projects'}><CloudWorkshop session={session} member={member}/></div>{view==='members'&&member.role==='admin'&&<MemberManagement session={session} member={member} cloud/>}</>;
}
