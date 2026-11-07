import {fail,uuid} from './workshop-policy.js';
import {requireRole} from './access-policy.js';
import {validatePresentation,publicationSnapshot} from '../src/publication/model.js';

export function presentationChecked(result) {
 if(result.error){
  if(result.error.code==='40001')throw fail('Cette présentation a été modifiée ailleurs. Votre brouillon est conservé. Rechargez la version enregistrée avant de réessayer.',409);
  if(result.error.code==='23505')throw fail('Cette adresse est déjà utilisée par une autre pièce.',409);
  if(result.error.code==='22023')throw fail('L’adresse d’une fiche déjà publiée ne peut plus être modifiée.',400);
  throw fail(['42P01','PGRST205','42883','PGRST202'].includes(result.error.code)?'Publication à initialiser : exécutez public-presentation-schema.sql dans Supabase.':'Publication indisponible. Réessayez.',503);
 }
 return result.data;
}
export async function managePresentation(c,member,projectId,method,body={}) {
 requireRole(member,['admin']);const id=uuid(projectId),checked=presentationChecked;
 const project=checked(await c.from('atelier_projects').select('id').eq('id',id).maybeSingle());if(!project)throw fail('Pièce introuvable.',404);
 if(method==='GET')return {presentation:checked(await c.from('atelier_presentations').select('*').eq('project_id',id).maybeSingle())};
 if(method!=='POST')throw fail('Méthode non autorisée.',405);
 const command=body.command;if(!['save','publish','unpublish'].includes(command))throw fail('Action de publication inconnue.');
 if(!Number.isSafeInteger(body.revision)||body.revision<0)throw fail('Révision manquante.');
 const draft=command==='unpublish'?null:validatePresentation(body.draft);
 let live=null;
 if(command==='publish'){
  const rows=checked(await c.from('atelier_files').select('id,metadata').eq('project_id',id).eq('state','ready'))||[];
  live=publicationSnapshot(draft,rows.map(file=>({id:file.id,...file.metadata})));
 }
 const presentation=checked(await c.rpc('atelier_save_presentation',{p_project_id:id,p_revision:body.revision,p_draft:draft,p_live:live,p_command:command,p_actor:member.email}));
 return {presentation};
}
