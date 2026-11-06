import React from 'react';
import {createRoot} from 'react-dom/client';
import Access from './Access';
import App from './App';
import './app.css';
const token=location.hash.slice(1);
if(/^[a-f0-9]{48}$/.test(token))sessionStorage.setItem('atelier.share',token);
const root=createRoot(document.getElementById('root'));
if(import.meta.env.DEV && (!import.meta.env.VITE_SUPABASE_URL || new URLSearchParams(location.search).get('apercu')==='1')){
 import('./workshop/Workshop.jsx').then(({default:Workshop})=>root.render(<Workshop/>));
}else{
 root.render(<Access>{session=><App session={session}/>}</Access>);
}
