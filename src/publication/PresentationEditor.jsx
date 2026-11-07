import React,{useContext,useEffect,useRef,useState} from 'react';
import {ArrowUp,ArrowDown,Trash2,Eye,Upload,Globe,Save,X,ExternalLink} from 'lucide-react';
import {products as editorial,universes} from '../showroom/catalog';
import {emptyPresentation,slugify,validatePresentation,publicPresentation,mergePublications,publicCategories} from './model';
import {RemoteFiles} from '../workshop/file-context';
import './presentation.css';

function Preview({draft,files,resolve,onClose}){
 const modal=useRef(),frame=useRef(),[product,setProduct]=useState(null),[error,setError]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{modal.current.showModal();},[]);
 useEffect(()=>{const receive=event=>{if(event.origin===location.origin&&event.source===frame.current?.contentWindow&&event.data?.type==='atelier-public-preview-ready')setReady(true);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 useEffect(()=>{
  let alive=true,timer,owned=[];
  async function load(){
   const nextOwned=[];
   try{
    const ids=[...new Set([...draft.gallery.map(photo=>photo.fileId),draft.modelId].filter(Boolean))];
    const urls=new Map(await Promise.all(ids.map(async id=>{
     const file=files.find(file=>file.id===id);if(!file)throw Error('Un fichier sélectionné est absent de cette pièce.');
     if(resolve)return [id,await resolve(id)];
     const {localFileUrl}=await import('./local');const result=await localFileUrl(file);if(result.owned)nextOwned.push(result.url);return [id,result.url];
    })));
    const model=files.find(file=>file.id===draft.modelId),snapshot={...draft,modelFormat:model?.name.split('.').at(-1).toLowerCase()||''};
    const value=publicPresentation({id:'preview',slug:draft.slug||'apercu',live:snapshot,live_version:0});
    value.gallery=value.gallery.map((photo,i)=>draft.gallery[i].fileId?{...photo,src:urls.get(draft.gallery[i].fileId)}:photo);
    if(value.model)value.model.url=urls.get(draft.modelId);
    if(!alive){nextOwned.forEach(url=>URL.revokeObjectURL(url));return;}
    owned.forEach(url=>URL.revokeObjectURL(url));owned=nextOwned;
    setProduct(mergePublications(editorial,{products:[value]}).find(product=>product.id===value.id));setError('');
    if(resolve)timer=setTimeout(load,45000);
   }catch(e){nextOwned.forEach(url=>URL.revokeObjectURL(url));if(alive)setError(e.message);}
  }
  load();return()=>{alive=false;clearTimeout(timer);owned.forEach(url=>URL.revokeObjectURL(url));};
 },[draft,files,resolve]);
 useEffect(()=>{if(ready&&product)frame.current.contentWindow.postMessage({type:'atelier-public-preview',product},location.origin);},[ready,product]);
 return <dialog className="pub-preview-dialog" ref={modal} aria-labelledby="pub-preview-title" onCancel={onClose}><header><div><h2 id="pub-preview-title">Aperçu de la fiche publique</h2><p>Votre brouillon, sans publication.</p></div><button className="icon-button" aria-label="Fermer l’aperçu public" onClick={onClose}><X size={22}/></button></header>{error?<p className="notice error" role="alert">{error}</p>:<iframe ref={frame} title="Aperçu de la fiche publique" src="/?presentation-preview=1"/>}</dialog>;
}

export default function PresentationEditor({piece,collectionName,cloud,Picture,onUpload,onDirtyChange}){
 const request=cloud?.presentation,resolve=useContext(RemoteFiles);
 const [record,setRecord]=useState(null),[draft,setDraft]=useState(null),[baseline,setBaseline]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(false),[conflict,setConflict]=useState(false);
 const dirty=!!draft&&JSON.stringify(draft)!==JSON.stringify(baseline),locked=record?.was_published===true;
 const images=piece.files.filter(file=>file.image),models=piece.files.filter(file=>/\.(glb|stl)$/i.test(file.name));
 async function load(){
  setBusy(true);setError('');setNotice('');
  try{
   const row=request?(await request(piece.id)).presentation:(await import('./local')).readLocalPresentation(piece.id);
   const initial=row?.draft||emptyPresentation(piece,editorial.find(product=>product.id===slugify(piece.name)),universes.find(u=>u.name.toLocaleLowerCase('fr')===collectionName?.toLocaleLowerCase('fr'))?.id||'rivages');
   setRecord(row);setDraft(initial);setBaseline(initial);setConflict(false);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 useEffect(()=>{load();},[piece.id,request]);
 useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
 useEffect(()=>{if(!dirty)return;const warn=event=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const change=values=>{setDraft(current=>({...current,...values}));setNotice('');};
 async function commit(command){
  setBusy(true);setError('');setNotice('');
  try{
   const clean=command==='unpublish'?null:validatePresentation(draft);
   const result=request?(await request(piece.id,'POST',{projectId:piece.id,revision:record?.revision||0,draft:clean,command})).presentation:(await import('./local')).writeLocalPresentation(piece.id,record?.revision||0,clean,command,piece.files);
   setRecord(result);setBaseline(result.draft);if(command!=='unpublish')setDraft(result.draft);
   setConflict(false);setNotice(command==='publish'?(request?'Cette version est publiée sur le site.':'Version publiée dans l’aperçu local uniquement.'):command==='unpublish'?(request?'La fiche a été retirée du site public.':'Fiche retirée de l’aperçu local.'):'Brouillon enregistré. Le site public n’a pas été modifié.');
  }catch(e){setError(e.message);setConflict(e.status===409);}finally{setBusy(false);}
 }
 function move(index,direction){const gallery=[...draft.gallery],target=index+direction;[gallery[index],gallery[target]]=[gallery[target],gallery[index]];change({gallery});}
 const photoChange=(index,values)=>change({gallery:draft.gallery.map((photo,i)=>i===index?{...photo,...values}:photo)});
 const reload=()=>{if(!dirty||window.confirm('Abandonner le brouillon affiché et recharger la version enregistrée ?'))load();};
 if(!draft)return <section className="ws-panel pub-loading">{error?<><p className="notice error" role="alert">{error}</p><button className="button" onClick={load} disabled={busy}>Réessayer</button></>:<p role="status">Chargement de la présentation publique…</p>}</section>;
 const source=editorial.find(product=>product.id===draft.sourceSlug);
 const liveChanged=record?.live&&JSON.stringify(validatePresentation(record.live))!==JSON.stringify(draft);
 return <section className="pub-editor" aria-label="Présentation publique">
  <div className="pub-heading"><div><span className="ws-eyebrow">SITE CLIENT · PRÉSENTATION PUBLIQUE</span><h2>Présenter ce bijou</h2><p>Préparez les textes et les médias, vérifiez l’aperçu, puis publiez la version de votre choix.</p></div><span className={`pub-badge ${record?.live?'is-live':''}`}>{record?.live?(liveChanged?'En ligne · nouvelle version en préparation':'En ligne'):'Brouillon · hors ligne'}</span></div>
  {!request&&<p className="notice">Mode de démonstration : ces contenus restent dans ce navigateur. Ils ne sont pas publiés sur Internet.</p>}
  {error&&<div className="notice error" role="alert">{error}{conflict&&<button className="button" onClick={reload}>Recharger la présentation enregistrée</button>}</div>}
  {notice&&<p className="pub-notice" role="status">{notice}</p>}
  <fieldset disabled={busy} className="pub-fields"><div className="pub-layout">
   <section className="ws-panel"><h3>Le contenu de la fiche</h3>
    <label>Reprendre une fiche du catalogue actuel<select aria-label="Reprendre une fiche du catalogue actuel" value={draft.sourceSlug} onChange={event=>{const source=editorial.find(p=>p.id===event.target.value),next=emptyPresentation(piece,source,draft.universe);change({...next,slug:locked?draft.slug:next.slug,modelId:draft.modelId});}}><option value="">Créer une nouvelle présentation</option>{editorial.map(product=><option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
    <label>Nom public du bijou<input value={draft.name} maxLength={200} onChange={event=>change({name:event.target.value})}/></label>
    <label>Adresse de la fiche<input aria-label="Adresse de la fiche publique" value={draft.slug} maxLength={100} disabled={locked} onChange={event=>change({slug:event.target.value})}/><small>/creations/{draft.slug}{locked?' · Adresse conservée après publication.':''}</small></label>
    <div className="pub-form-row"><label>Collection publique<select value={draft.universe} onChange={event=>change({universe:event.target.value})}>{universes.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label><label>Type de bijou<select value={draft.category} onChange={event=>change({category:event.target.value})}>{publicCategories.map(category=><option key={category}>{category}</option>)}</select></label></div>
    <label>Phrase de présentation<input value={draft.subtitle} maxLength={300} onChange={event=>change({subtitle:event.target.value})}/></label>
    <label>Description publique<textarea rows={5} value={draft.description} maxLength={10000} onChange={event=>change({description:event.target.value})}/></label>
    <label>Matières et pierres<input value={draft.materials} maxLength={500} onChange={event=>change({materials:event.target.value})}/></label>
    <label>Les finitions<textarea rows={3} value={draft.finish} maxLength={2000} onChange={event=>change({finish:event.target.value})}/></label>
    <label>L’inspiration<textarea rows={3} value={draft.inspiration} maxLength={2000} onChange={event=>change({inspiration:event.target.value})}/></label>
   </section>
   <div className="pub-media-column"><section className="ws-panel"><div className="pub-section-heading"><h3>Le carrousel photo</h3><span>{draft.gallery.length} / 30</span></div><p className="ws-muted">La première photo devient la couverture de la fiche et des listes de bijoux.</p>
    <div className="pub-photo-list">{draft.gallery.map((photo,index)=>{const file=images.find(file=>file.id===photo.fileId);return <article className="pub-photo" key={photo.fileId||photo.editorial}><div className="pub-photo-image">{file?<Picture file={file} alt=""/>:photo.editorial&&source?<img src={source[photo.editorial]} alt=""/>:<span>Photo absente</span>}<span>{index===0?'Couverture':index+1}</span></div><div className="pub-photo-fields"><label>Légende<input value={photo.caption} maxLength={300} onChange={event=>photoChange(index,{caption:event.target.value})}/></label><label>Description de l’image<input value={photo.alt} maxLength={300} onChange={event=>photoChange(index,{alt:event.target.value})}/></label></div><div className="pub-photo-tools"><button className="icon-button" aria-label={`Monter la photo ${index+1}`} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={16}/></button><button className="icon-button" aria-label={`Descendre la photo ${index+1}`} disabled={index===draft.gallery.length-1} onClick={()=>move(index,1)}><ArrowDown size={16}/></button><button className="icon-button" aria-label={`Retirer la photo ${index+1}`} onClick={()=>change({gallery:draft.gallery.filter((_,i)=>i!==index)})}><Trash2 size={16}/></button></div></article>;})}</div>
    <label>Ajouter une photo de la pièce<select aria-label="Ajouter une photo au carrousel" value="" disabled={draft.gallery.length>=30} onChange={event=>{const file=images.find(file=>file.id===event.target.value);if(file)change({gallery:[...draft.gallery,{fileId:file.id,editorial:'',alt:`${draft.name} — vue ${draft.gallery.length+1}`,caption:`Vue ${draft.gallery.length+1}`}]});}}><option value="">Choisir parmi les fichiers de la pièce…</option>{images.filter(file=>!draft.gallery.some(photo=>photo.fileId===file.id)).map(file=><option key={file.id} value={file.id}>{file.name}</option>)}</select></label>
   </section><section className="ws-panel"><h3>La vue 3D</h3><label>Modèle présenté au public<select aria-label="Modèle 3D public" value={draft.modelId} onChange={event=>change({modelId:event.target.value})}><option value="">Aucun modèle · Vue 3D à venir</option>{models.map(file=><option key={file.id} value={file.id}>{file.name} · {file.version||'V1'}</option>)}</select></label><p className="ws-muted">Le GLB conserve les matières exportées. Le STL présente les volumes avec une finition métallique indicative.</p></section>
   <section className="ws-panel"><h3>Ajouter des médias</h3><p className="ws-muted">Importez vos photos et votre GLB ou STL, puis sélectionnez-les dans cette présentation.</p><label className="button pub-upload"><Upload size={16}/>Importer des médias<input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.glb,.stl" aria-label="Importer des médias pour la présentation publique" onChange={event=>{const files=[...event.target.files];event.target.value='';onUpload(files,piece);}}/></label></section></div>
  </div>
  <div className="pub-publish-panel"><div><h3>{record?.live?'Mettre à jour la fiche publique':'Publier cette présentation'}</h3><p>Seuls les textes, photos et modèle 3D sélectionnés ici seront accessibles à tous. Les données de fabrication restent privées.</p>{record?.published_at&&<small>Dernière publication : {new Date(record.published_at).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})}.</small>}<p className="pub-dirty" role="status">{dirty?'Brouillon modifié · à enregistrer':record?'Brouillon enregistré':'Présentation à enregistrer'}</p></div><div className="pub-actions"><button className="button" onClick={()=>setPreview(true)}><Eye size={16}/>Aperçu</button><button className="button" onClick={()=>commit('save')} disabled={!dirty&&!!record}><Save size={16}/>Enregistrer le brouillon</button><button className="button primary" onClick={()=>commit('publish')}><Globe size={16}/>{request?'Publier sur le site':'Publier dans l’aperçu local'}</button>{record?.live&&<><a className="button" href={'/creations/'+record.slug+(request?'':'?catalogue-demo=1')} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Voir la fiche</a><button className="text-button pub-unpublish" onClick={()=>commit('unpublish')}>Retirer du site public</button></>}</div></div>
  </fieldset>
  {preview&&<Preview draft={draft} files={piece.files} resolve={resolve} onClose={()=>setPreview(false)}/>}
 </section>;
}
