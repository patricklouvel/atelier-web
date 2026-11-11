import React,{lazy,Suspense,useContext,useEffect,useState} from 'react';
import {Box,ArrowRight} from 'lucide-react';
import {RemoteFiles} from './file-context';
import {getFile} from './model';
import './workshop-viewer.css';

const ModelViewer=lazy(()=>import('../ModelViewer'));
const canPreview=file=>!file.deleting&&/\.(glb|gltf|stl|obj|ply|fbx)$/i.test(file.name);

function ResolvedModel({file,files,appearance}){
 const resolve=useContext(RemoteFiles),[media,setMedia]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 // Refresh signed URLs when changing the model or rendering mode, without a timer
 // that would reset the camera while someone is inspecting the piece.
 const signature=JSON.stringify(files.map(f=>[f.id,f.name,f.remote,f.deleting]));
 useEffect(()=>{
  let alive=true;const owned=[];setMedia(null);setError('');
  async function load(){
   try{
    const companions=/\.(gltf|fbx)$/i.test(file.name)?files.filter(f=>!f.deleting&&f.id!==file.id&&/\.(png|jpe?g|webp|tga|bin)$/i.test(f.name)):[];
    const resources=await Promise.all([file,...companions].map(async f=>{
     if(f.remote){if(!resolve)throw Error('Connexion aux fichiers indisponible.');return {...f,url:await resolve(f.id)};}
     const blob=await getFile(f.id);if(!blob)throw Error(`Fichier absent : ${f.name}. Ajoutez-le à nouveau dans Fichiers.`);
     const url=URL.createObjectURL(blob);if(!alive){URL.revokeObjectURL(url);return null;}owned.push(url);return {...f,url};
    }));
    if(alive)setMedia({file:resources[0],files:resources});
   }catch(e){if(alive)setError(e.message||'Le modèle ne peut pas être chargé.');}
  }
  load();return()=>{alive=false;owned.forEach(url=>URL.revokeObjectURL(url));};
 },[file.id,signature,appearance,resolve,retry]);
 if(error)return <div className="ws-viewer-empty" role="alert"><p>{error}</p><button className="button" onClick={()=>setRetry(value=>value+1)}>Réessayer</button></div>;
 if(!media)return <p className="ws-viewer-loading" role="status">Chargement du modèle 3D…</p>;
 return <Suspense fallback={<p className="ws-viewer-loading" role="status">Ouverture du lecteur 3D…</p>}><ModelViewer key={appearance} file={media.file} files={media.files} appearance={appearance}/></Suspense>;
}

export default function WorkshopViewer({files,onFiles}){
 const models=files.filter(canPreview),[chosen,setChosen]=useState(''),[appearance,setAppearance]=useState('showroom');
 const file=models.find(f=>f.id===chosen)||models.find(f=>f.approved)||models.find(f=>/\.glb$/i.test(f.name))||models[0];
 return <section className="ws-piece-viewer" aria-label="Vue 3D de la pièce">
  <div className="ws-viewer-heading"><div><h2>Le bijou sous tous ses angles</h2><p>Explorez les volumes et les matières directement dans l’atelier.</p></div><button className="button" onClick={onFiles}>Gérer les fichiers<ArrowRight size={15}/></button></div>
  {file?<>
   <div className="ws-viewer-toolbar"><label>Modèle à afficher<select aria-label="Modèle à afficher en 3D" value={file.id} onChange={event=>setChosen(event.target.value)}>{models.map(model=><option key={model.id} value={model.id}>{model.name} · {model.version||'Sans version'}{model.approved?' · Validé pour fabrication':''}</option>)}</select></label>
    <div className="ws-viewer-modes" role="group" aria-label="Affichage 3D"><button className="button" aria-pressed={appearance==='showroom'} onClick={()=>setAppearance('showroom')}>Rendu studio</button><button className="button" aria-pressed={appearance==='workshop'} onClick={()=>setAppearance('workshop')}>Vue technique</button></div>
   </div>
   <ResolvedModel file={file} files={files} appearance={appearance}/>
   <p className="ws-viewer-note">{appearance==='showroom'?'Rendu studio comme sur le site client. Les matières du GLB sont conservées ; la finition du STL est indicative.':'Vue technique : grille, mode filaire et nombre de triangles. Les dimensions de référence restent celles de la fiche modèle.'} Le modèle affiché ici n’est pas publié automatiquement.</p>
  </>:<div className="ws-viewer-empty"><Box size={36}/><h3>Ajoutez un modèle pour explorer la pièce</h3><p>Importez un STL ou un GLB dans Fichiers. Le lecteur accepte aussi OBJ, PLY, FBX et glTF. Pour un fichier Blender ou 3MF, ajoutez un export STL ou GLB.</p><button className="button primary" onClick={onFiles}>Ajouter un modèle 3D<ArrowRight size={15}/></button></div>}
 </section>;
}
