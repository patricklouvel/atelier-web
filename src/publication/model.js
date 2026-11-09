import {JEWELRY_TYPES,jewelryTypeOf} from '../workshop/jewelry-types.js';
export const publicCollections=['rivages','galets','horizon','mielles'];
export const publicCategories=['Bagues','Bracelets','Colliers & pendentifs','Boucles d’oreilles'];
// Public reference IDs only; server validation must not import bundled image files.
export const editorialIds=['bague-rivages','bracelet-rivages','bracelet-galets','bracelet-estran','boucles-maree','pendentif-ecume','collier-sillons','bague-horizon','manchette-horizon'];
export const slugify=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
const invalid=message=>{throw Object.assign(Error(message),{status:400});};
const string=(value,max)=>{if(typeof value!=='string'||value.length>max)invalid('Texte invalide ou trop long.');return value.trim();};
export function validatePresentation(input) {
 if(!input||typeof input!=='object'||Array.isArray(input))invalid('Présentation invalide.');
 const output={};
 for(const [key,max] of Object.entries({slug:100,name:200,universe:40,category:60,subtitle:300,description:10000,materials:500,finish:2000,inspiration:2000,sourceSlug:100,modelId:80}))output[key]=string(input[key]??'',max);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(output.slug))invalid('Utilisez une adresse composée de lettres minuscules, chiffres et tirets.');
 if(!publicCollections.includes(output.universe))invalid('Choisissez une collection publique.');
 if(!publicCategories.includes(output.category))invalid('Choisissez un type de bijou.');
 if(output.sourceSlug&&!editorialIds.includes(output.sourceSlug))invalid('Fiche de référence inconnue.');
 if(!Array.isArray(input.gallery)||input.gallery.length>30)invalid('La galerie est limitée à 30 photos.');
 const seen=new Set();output.gallery=input.gallery.map(photo=>{
  if(!photo||typeof photo!=='object')invalid('Photo invalide.');
  const entry={fileId:string(photo.fileId??'',80),editorial:string(photo.editorial??'',10),alt:string(photo.alt??'',300),caption:string(photo.caption??'',300)};
  if(entry.fileId?entry.editorial:!output.sourceSlug||!['image','detail'].includes(entry.editorial))invalid('Choisissez une photo de la pièce ou du catalogue actuel.');
  const key=entry.fileId||entry.editorial;if(seen.has(key))invalid('Une photo est présente plusieurs fois.');seen.add(key);return entry;
 });
 return output;
}
export function publicationSnapshot(draft,files) {
 const clean=validatePresentation(draft);
 if(!clean.name||!clean.description)invalid('Le nom et la description sont requis pour publier.');
 if(!clean.gallery.length)invalid('Ajoutez au moins une photo avant de publier.');
 for(const photo of clean.gallery)if(photo.fileId&&!files.some(file=>file.id===photo.fileId&&file.image))invalid('Une photo sélectionnée est absente ou son transfert est incomplet.');
 const model=clean.modelId?files.find(file=>file.id===clean.modelId&&/\.(glb|stl)$/i.test(file.name)):null;
 if(clean.modelId&&!model)invalid('Choisissez un fichier GLB ou STL de cette pièce, dont le transfert est terminé.');
 return {...clean,modelFormat:model?model.name.split('.').at(-1).toLowerCase():''};
}
export function emptyPresentation(piece,source=null,collection='rivages') {
 const slug=source?.id||slugify(piece.name)||`creation-${piece.id.slice(0,8)}`;
 return {slug,name:source?.name||piece.name,universe:source?.universe||collection,category:source?.category||JEWELRY_TYPES.find(t=>t.id===jewelryTypeOf(piece))?.category||'',subtitle:source?.subtitle||'',description:source?.description||piece.clientText||'',materials:source?.materials||'',finish:source?.finish||'',inspiration:source?.inspiration||'',sourceSlug:source?.id||'',modelId:'',gallery:source?[{fileId:'',editorial:'image',alt:source.name,caption:'Le bijou'},...(source.detail&&source.detail!==source.image?[{fileId:'',editorial:'detail',alt:`Univers de ${source.name}`,caption:'L’univers de la collection'}]:[])]:[]};
}
export function publicPresentation(row) {
 if(!row.live)return null;
 const {name,universe,category,subtitle,description,materials,finish,inspiration,sourceSlug,gallery,modelId,modelFormat}=row.live;
 const media=id=>`/api/catalogue?action=media&id=${encodeURIComponent(row.id)}&file=${encodeURIComponent(id)}&v=${row.live_version}`;
 return {id:row.slug,name,universe,category,subtitle,description,materials,finish,inspiration,sourceSlug,gallery:gallery.map(({fileId,editorial,alt,caption})=>({...(fileId?{src:media(fileId)}:{editorial}),alt,caption})),model:modelId?{url:media(modelId),name:`bijou.${modelFormat}`} :null};
}
export function mergePublications(editorial,{products=[],hiddenSlugs=[]}) {
 const replacements=new Map(products.map(product=>[product.id,product]));
 const blocked=new Set(hiddenSlugs);
 const resolve=product=>{
  const source=editorial.find(p=>p.id===product.sourceSlug);
  const gallery=product.gallery?.map(photo=>({...photo,src:photo.src||source?.[photo.editorial]})).filter(photo=>photo.src)||[];
  return {...product,gallery,image:gallery[0]?.src||source?.image||'',detail:gallery[1]?.src||gallery[0]?.src||source?.detail||''};
 };
 return [...editorial.filter(p=>!blocked.has(p.id)).map(p=>replacements.has(p.id)?resolve(replacements.get(p.id)):p),...products.filter(p=>!editorial.some(e=>e.id===p.id)&&!blocked.has(p.id)).map(resolve)];
}
