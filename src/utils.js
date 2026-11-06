export const isImage = file => file.image || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
export const isModel = file => /\.(fbx|glb|gltf|stl|obj|ply)$/i.test(file.name);
export const fileSize = bytes => bytes >= 1048576 ? `${(bytes/1048576).toLocaleString('fr-FR',{maximumFractionDigits:1})} Mo` : `${Math.max(1,Math.round(bytes/1024))} Ko`;
export const dateLabel = value => value ? new Date(value).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) : '';
export const fileName = name => name.replace(/\.[^.]+$/,'').replace(/[_]/g,' ');
export async function localCall(action, body) {
  const response=await fetch(`/api/local/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Opération impossible.');return result;
}
export function publicationState(project) {
  if(project.retiredPublications?.length)return 'Partage à vérifier';
  if(!project.publication)return 'Local uniquement';
  const selected=project.selected||project.publication.selected;
  if(JSON.stringify([...selected].sort())!==JSON.stringify([...project.publication.selected].sort()))return 'À synchroniser';
  if(selected.some(id=>{const f=project.files.find(f=>f.id===id);return !f||project.publication.fingerprints?.[id]!==`${f.size}:${f.modified}`;}))return 'À synchroniser';
  return 'Synchronisé';
}
