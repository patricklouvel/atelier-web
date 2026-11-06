import React from 'react';
import Access from './Access';
import ProfessionalArea from './ProfessionalArea';
import './app.css';
import './professional.css';
const token=location.hash.slice(1);
if(/^[a-f0-9]{48}$/.test(token))sessionStorage.setItem('atelier.share',token);
export default function AtelierEntry(){
 if(import.meta.env.DEV&&(!import.meta.env.VITE_SUPABASE_URL||new URLSearchParams(location.search).get('apercu')==='1')){
  const Workshop=React.lazy(()=>import('./workshop/Workshop'));
  return <React.Suspense fallback={<p>Ouverture de l’atelier…</p>}><Workshop/></React.Suspense>;
 }
 return <Access>{session=><ProfessionalArea session={session}/>}</Access>;
}
