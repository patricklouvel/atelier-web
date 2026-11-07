import React,{useCallback,useEffect,useRef,useState} from 'react';
import Workshop from './Workshop';
import {RemoteFiles} from './file-context';

const strip=piece=>{const {history,...rest}=piece;return rest;};
export async function workshopRequest(session,action,method='GET',body,query=''){
 const response=await fetch('/api/workshop?action='+action+query,{method,cache:'no-store',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let result;try{result=await response.json();}catch{throw Error('Réponse du serveur illisible. Réessayez.');}
 if(!response.ok)throw Object.assign(Error(result.error||'Service indisponible.'),{status:response.status});return result;
}
export default function CloudWorkshop({session,member}){
 const [data,setData]=useState(null),[base,setBase]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[discard,setDiscard]=useState(false);
 const current=useRef(data),baseline=useRef(base);current.current=data;baseline.current=base;
 const credentials=useRef(session);credentials.current=session;
 const request=useCallback((action,method,body,query)=>workshopRequest(credentials.current,action,method,body,query),[]);
 const dirty=!!data&&!!base&&(data.pieces.some(p=>!base.pieces.some(b=>b.id===p.id&&JSON.stringify(strip(b))===JSON.stringify(strip(p))))||JSON.stringify(data.collections)!==JSON.stringify(base.collections));
 async function load(){setBusy(true);setError('');try{const next=await request('index');setData(next);setBase(next);setDiscard(false);setNotice('Atelier actualisé.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{let alive=true;setData(null);setError('');request('index').then(next=>{if(alive){setData(next);setBase(next)}}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false};},[request,member.email,member.role]);
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{if(member.role!=='admin')return;let alive=true;const refresh=()=>request('people').then(({people})=>{if(alive)for(const setter of [setData,setBase])setter(state=>state?{...state,people}:state)}).catch(e=>{if(alive)setError(e.message)});window.addEventListener('atelier-members-updated',refresh);return()=>{alive=false;window.removeEventListener('atelier-members-updated',refresh)};},[request,member.role]);
 function replacePiece(piece){for(const setter of [setData,setBase])setter(state=>({...state,pieces:state.pieces.map(p=>p.id===piece.id?piece:p)}));}
 async function save(){
  setBusy(true);setError('');setNotice('');
  try{
   const snapshot=current.current,original=baseline.current;
   for(const collection of snapshot.collections){const before=original.collections.find(c=>c.id===collection.id);if(before&&JSON.stringify(collection)!==JSON.stringify(before)){const result=await request('collection','PATCH',collection);for(const setter of [setData,setBase])setter(state=>({...state,collections:state.collections.map(c=>c.id===collection.id?result.collection:c)}));}}
   for(const piece of snapshot.pieces){const before=original.pieces.find(p=>p.id===piece.id);if(before&&JSON.stringify(strip(piece))!==JSON.stringify(strip(before))){const event=(piece.history||[]).filter(h=>!before.history.some(b=>b.id===h.id)&&!h.text.startsWith('Étape :')).reverse().map(h=>h.text).join('\n');const result=await request('project','PATCH',{...piece,event});replacePiece(result.piece);}}
   setNotice('Toutes les modifications sont enregistrées en ligne.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function create(kind,input){
  setBusy(true);setError('');try{
   const result=await request(kind==='collection'?'collection':'project','POST',input),key=kind==='collection'?'collections':'pieces',value=result.collection||result.piece;
   for(const setter of [setData,setBase])setter(state=>({...state,[key]:[...state[key],value]}));setNotice(kind==='collection'?'Collection créée.':'Pièce créée.');return value;
  }catch(e){setError(e.message);return null;}finally{setBusy(false);}
 }
 async function upload(files,piece){
  setBusy(true);setError('');let transferred=0;
  try{for(const file of files){let reserved,completed=false;try{
   reserved=await request('upload','POST',{projectId:piece.id,name:file.name,size:file.size});
   const response=await fetch(reserved.url,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});if(!response.ok)throw Error('Transfert impossible : '+file.name);
   const result=await request('complete','POST',{id:reserved.id});completed=true;
   for(const setter of [setData,setBase])setter(state=>({...state,pieces:state.pieces.map(p=>p.id===piece.id?{...p,files:[...p.files.filter(f=>f.id!==result.file.id),result.file]}:p)}));transferred++;
  }catch(e){if(reserved&&!completed)await request('cancel-upload','POST',{id:reserved.id}).catch(()=>{});throw e;}}
  setNotice(`${transferred} fichier(s) enregistré(s) en ligne.`);
  }catch(e){setError(`${e.message}${transferred?` ${transferred} fichier(s) déjà transféré(s) ont été conservés.`:''}`);}finally{setBusy(false);}
 }
 async function comment(piece,text){setBusy(true);setError('');try{const {event}=await request('comment','POST',{projectId:piece.id,text});for(const setter of [setData,setBase])setter(state=>({...state,pieces:state.pieces.map(p=>p.id===piece.id?{...p,history:[event,...p.history]}:p)}));return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}}
 const resolveFile=useCallback(async(id,download=false)=>(await request('file-url','GET',null,'&id='+encodeURIComponent(id)+(download?'&download=1':''))).url,[request]);
 const presentation=useCallback((id,method='GET',body)=>request('presentation',method,body,'&projectId='+encodeURIComponent(id)),[request]);
 if(!data)return <main className="professional-error"><h1>Atelier en ligne</h1>{error?<><p className="notice error" role="alert">{error}</p><button className="button" disabled={busy} onClick={load}>Réessayer</button></>:<p role="status">Chargement de vos collections et projets…</p>}</main>;
 return <RemoteFiles.Provider value={resolveFile}><div className="cloud-toolbar"><span role="status">{busy?'Enregistrement en cours…':dirty?'Modifications à enregistrer':'Enregistré en ligne'}</span><div><button className="button" disabled={busy} onClick={()=>dirty?setDiscard(true):load()}>Actualiser</button>{member.role!=='guest'&&<button className="button primary" disabled={busy||!dirty} onClick={save}>Enregistrer les modifications</button>}</div>{discard&&<p>Des modifications ne sont pas enregistrées. <button className="text-button" onClick={load}>Abandonner et actualiser</button> <button className="text-button" onClick={()=>setDiscard(false)}>Annuler</button></p>}{error&&<p className="notice error" role="alert">{error}</p>}{notice&&!error&&<p className="cloud-notice">{notice}</p>}</div><fieldset className="cloud-content" disabled={busy}><Workshop cloud={{data,member,onChange:setData,create,upload,comment,presentation,busy}}/></fieldset></RemoteFiles.Provider>;
}
