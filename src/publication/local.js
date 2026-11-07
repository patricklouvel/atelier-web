import {getFile} from '../workshop/model';
import {publicationSnapshot,validatePresentation,publicPresentation} from './model';
import ring from '../preview-assets/bague.jpg';
import flat from '../preview-assets/onde.png';
const key='atelier.public-presentations.demo.v1',samples={ring,flat};
export function localPresentations(){
 const entries=JSON.parse(localStorage.getItem(key)||'[]');
 if(!Array.isArray(entries))throw Error('Les présentations locales sont illisibles. Les données ont été conservées.');return entries;
}
export function readLocalPresentation(id){return localPresentations().find(row=>row.project_id===id)||null;}
export function writeLocalPresentation(id,revision,draft,command,files){
 const rows=localPresentations(),old=rows.find(row=>row.project_id===id);
 if((old?.revision||0)!==revision)throw Object.assign(Error('Cette présentation a changé dans un autre onglet. Votre brouillon est conservé. Rechargez la version enregistrée avant de réessayer.'),{status:409});
 const clean=command==='unpublish'?old.draft:validatePresentation(draft);
 if(old?.was_published&&old.slug!==clean.slug)throw Error('L’adresse d’une fiche déjà publiée ne peut plus être modifiée.');
 if(rows.some(row=>row.project_id!==id&&row.slug===clean.slug))throw Object.assign(Error('Cette adresse est déjà utilisée par une autre pièce.'),{status:409});
 const live=command==='publish'?publicationSnapshot(clean,files):command==='unpublish'?null:old?.live||null;
 const row={id,project_id:id,slug:clean.slug,draft:clean,live,revision:revision+1,live_version:(old?.live_version||0)+(command==='save'?0:1),was_published:old?.was_published||command==='publish',published_at:command==='publish'?new Date().toISOString():old?.published_at||null,assets:files.map(({id,name,image,sample})=>({id,name,image,sample}))};
 localStorage.setItem(key,JSON.stringify([...rows.filter(row=>row.project_id!==id),row]));
 window.dispatchEvent(new Event('atelier-publications-updated'));return row;
}
export async function localFileUrl(file){
 if(file.sample&&samples[file.sample])return {url:samples[file.sample],owned:false};
 const blob=await getFile(file.id);if(!blob)throw Error(`Fichier local absent : ${file.name}`);
 return {url:URL.createObjectURL(blob),owned:true};
}
export async function localCatalogue(){
 const owned=[];
 try{
  const rows=localPresentations().filter(row=>row.was_published),products=[];
  for(const row of rows.filter(row=>row.live)){
   const product=publicPresentation(row),ids=[...new Set([...row.live.gallery.map(photo=>photo.fileId),row.live.modelId].filter(Boolean))];
   const urls=new Map(await Promise.all(ids.map(async id=>{const file=row.assets.find(f=>f.id===id);if(!file)throw Error('Un média de démonstration est absent.');const result=await localFileUrl(file);if(result.owned)owned.push(result.url);return [id,result.url];})));
   product.gallery=product.gallery.map((photo,index)=>row.live.gallery[index].fileId?{...photo,src:urls.get(row.live.gallery[index].fileId)}:photo);
   if(product.model)product.model.url=urls.get(row.live.modelId);products.push(product);
  }
  return {products,hiddenSlugs:rows.filter(row=>!row.live).map(row=>row.slug),dispose:()=>owned.forEach(url=>URL.revokeObjectURL(url))};
 }catch(error){owned.forEach(url=>URL.revokeObjectURL(url));throw error;}
}
