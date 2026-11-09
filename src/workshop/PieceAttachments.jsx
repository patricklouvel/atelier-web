import React,{useRef,useState} from 'react';
import {Upload,File,Image as ImageIcon,Trash2} from 'lucide-react';
import {FILE_ACCEPT,validateFile} from './file-formats';
import './attachments.css';

export default function PieceAttachments({files,canUpload,isAdmin,coverId,busy,onUpload,onCover,onOpen,onDelete,Picture,FileLink}){
 const input=useRef(),[dragging,setDragging]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function add(list){
  if(!canUpload||busy||!list.length)return;
  setError('');setNotice('');
  try{list.forEach(validateFile);const saved=await onUpload(list);if(saved!==false)setNotice(`${list.length} fichier(s) ajouté(s) à la pièce.`);}catch(e){setError(e.message);}
 }
 return <section className="ws-panel ws-attachments" aria-label="Images et fichiers de la pièce">
  <h2>Images & fichiers</h2>
  {canUpload&&<div className={`ws-dropzone${dragging?' is-dragging':''}`} onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);add([...e.dataTransfer.files]);}}>
   <Upload size={23}/><p>Ajoutez vos photos, rendus et fichiers de travail.</p>
   <button type="button" className="button primary" disabled={busy} onClick={()=>input.current.click()}>{busy?'Import en cours…':'Ajouter des images ou fichiers'}</button>
   <input ref={input} aria-label="Importer les images et fichiers de la pièce" type="file" accept={FILE_ACCEPT} multiple hidden disabled={busy} onChange={e=>{add([...e.target.files]);e.target.value='';}}/>
   <small>Glissez vos fichiers ici, ou choisissez-les sur votre appareil.<br/>JPG, PNG, WebP · STL, BLEND, 3MF, GLB et autres fichiers CAO · 200 Mo par fichier.</small>
  </div>}
  {error&&<p className="notice error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!files.length&&<p className="ws-muted">Aucune image ni fichier ajouté à cette pièce.</p>}
  <div className="ws-attachment-list">{files.map(file=><article key={file.id} className="ws-attachment">
   <button type="button" className="ws-attachment-preview" disabled={!file.image&&!/\.(fbx|glb|gltf|stl|obj|ply)$/i.test(file.name)} aria-label={`Ouvrir ${file.name}`} onClick={()=>onOpen(file)}>{file.image?<Picture file={file} alt={file.name}/>:<File size={25}/>}</button>
   <div><strong>{file.name}</strong><small>{Math.max(1,Math.round(file.size/1024))} Ko · {file.version||'V1'}</small>{isAdmin&&file.image&&<button type="button" className="text-button" onClick={()=>onCover(file.id)}><ImageIcon size={13}/>{coverId===file.id?'Image de couverture':'Choisir en couverture'}</button>}</div><FileLink file={file}/>{isAdmin&&<button type="button" className="icon-button" disabled={busy} aria-label={`Supprimer ${file.name}`} onClick={()=>onDelete(file)}><Trash2 size={17}/></button>}
  </article>)}</div>
  {isAdmin&&files.length>0&&<p className="ws-muted">Le partage et les versions se gèrent dans Fichiers. La publication sur le site client se choisit dans Présentation publique.</p>}
 </section>;
}
