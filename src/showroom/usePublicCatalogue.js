import {useEffect,useState} from 'react';
import {products as editorial} from './catalog';
import {mergePublications} from '../publication/model';

export default function usePublicCatalogue(){
 const [state,setState]=useState({products:[],loading:true,error:'',demo:false}),[attempt,retry]=useState(0);
 useEffect(()=>{
  let alive=true,disposeLocal=()=>{},sequence=0;const abort=new AbortController();
  async function refresh(){
   const current=++sequence;
   try{
    let data,demo=false;
    if(import.meta.env.DEV&&(!import.meta.env.VITE_SUPABASE_URL||new URLSearchParams(location.search).get('catalogue-demo')==='1')){const {localCatalogue}=await import('../publication/local');data=await localCatalogue();demo=true;}
    else{
     const response=await fetch('/api/catalogue',{cache:'no-store',signal:abort.signal}),result=await response.json();
     if(!response.ok)throw Error('Les créations sont momentanément indisponibles. Réessayez dans un instant.');
     data=result;
    }
    if(!Array.isArray(data.products)||!Array.isArray(data.hiddenSlugs))throw Error('Le catalogue n’a pas pu être chargé.');
    if(!alive||current!==sequence){data.dispose?.();return;}
    disposeLocal();disposeLocal=data.dispose||(()=>{});
    setState({products:mergePublications(editorial,data),loading:false,error:'',demo});
   }catch(error){if(alive&&current===sequence&&error.name!=='AbortError')setState({products:[],loading:false,error:error.message,demo:false});}
  }
  refresh();
  const visible=()=>{if(!document.hidden)refresh();};
  window.addEventListener('focus',visible);window.addEventListener('storage',visible);window.addEventListener('atelier-publications-updated',visible);document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;abort.abort();disposeLocal();window.removeEventListener('focus',visible);window.removeEventListener('storage',visible);window.removeEventListener('atelier-publications-updated',visible);document.removeEventListener('visibilitychange',visible);};
 },[attempt]);
 return {...state,retry:()=>retry(value=>value+1)};
}
