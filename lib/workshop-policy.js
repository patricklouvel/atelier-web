import {FILE_PATTERN,MAX_FILE_SIZE} from '../src/workshop/file-formats.js';
import {STAGES} from '../src/workshop/model.js';
import {productionOf} from '../src/workshop/production-model.js';
import {JEWELRY_TYPES} from '../src/workshop/jewelry-types.js';

export const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function uuid(value){if(typeof value!=='string'||!/^[-a-f0-9]{36}$/i.test(value)||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value))throw fail('Identifiant invalide.');return value;}
export function text(value,max=10000){if(typeof value!=='string'||value.length>max)throw fail('Texte invalide ou trop long.');return value;}
export function emails(value){if(!Array.isArray(value)||value.length>100)throw fail('Liste de personnes invalide.');return [...new Set(value.map(email=>{email=text(email,254).trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail('Adresse e-mail invalide.');return email;}))];}
export const canRead=(row,member)=>member.role==='admin'||(member.role==='participant'?row.assignees.includes(member.email):row.published&&row.client_emails.includes(member.email));
export function assertRead(row,member){if(!row)throw fail('Pièce introuvable.',404);if(!canRead(row,member))throw fail('Cette pièce n’est pas partagée avec votre compte.',403);}
export const canReadFile=(file,member)=>file.state==='ready'&&(member.role==='admin'||file.metadata.audience==='client'||member.role==='participant'&&file.metadata.audience==='team');
function productionFields(input,defaults){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail('Rubrique de fabrication invalide.');
 return Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>{
  const value=input[key]??fallback;
  if(typeof fallback==='boolean'){if(typeof value!=='boolean')throw fail('Validation de fabrication invalide.');return [key,value];}
  return [key,text(value,10000)];
 }));
}
export function safeProduction(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||JSON.stringify(input).length>100000)throw fail('Fiche de fabrication invalide.');
 const defaults=productionOf({}),output=productionFields(input,{instructions:'',modelApprovedBy:'',modelApprovedAt:''});
 for(const key of ['header','metal','dimensions','casting'])output[key]=productionFields(input[key]??{},defaults[key]);
 if(output.header.jewelryType&&!JEWELRY_TYPES.some(t=>t.id===output.header.jewelryType))throw fail('Type de bijou invalide.');
 const fields={components:'id name reference quantity material dimensions lot',stones:'id type cut dimensions carats quantity quality position setting supplier lot',finishes:'id zone surface texture treatment instructions',operations:'id name owner operator date weightIn weightOut lot notes status rejection validatedBy validatedAt',controls:'id name result operator date notes photoId validatedBy validatedAt'};
 for(const [key,names] of Object.entries(fields)){
  const rows=input[key]??[];if(!Array.isArray(rows)||rows.length>300)throw fail('Lignes de fabrication invalides.');
  const shape=Object.fromEntries(names.split(' ').map(name=>[name,'']));output[key]=rows.map(row=>productionFields(row,shape));
 }
 return output;
}
export function projectView(row,files,events,member){
 const p=row.payload;
 const common={id:row.id,collection:row.collection_id,name:p.name,code:p.code,cover:p.cover||'',published:row.published,clientText:p.clientText||'',files:files.filter(f=>f.project_id===row.id&&(canReadFile(f,member)||member.role==='admin'&&f.metadata.deleting===true)).map(f=>({id:f.id,...f.metadata,remote:true})),revision:row.revision};
 if(member.role==='guest')return {...common,status:'',brief:'',notes:'',due:'',assignees:[],clientEmails:[],history:[]};
 return {...common,status:p.status,brief:p.brief||'',notes:member.role==='admin'?p.notes||'':'',due:p.due||'',assignees:row.assignees,clientEmails:member.role==='admin'?row.client_emails:[],production:p.production,history:events.filter(e=>e.project_id===row.id).map(e=>({id:e.id,at:e.created_at,author:e.author,text:e.text}))};
}
export function validateProject(input,old,member){
 const admin=member.role==='admin';
 if(!admin&&!old)throw fail('Seul un administrateur peut créer une pièce.',403);
 if(member.role==='guest')throw fail('Accès en lecture seule.',403);
 const previous=old?.payload||{};
 if(!STAGES.includes(input.status))throw fail('Étape inconnue.');
 let production=safeProduction(input.production||productionOf({}));
 if(!admin){
  const p=productionOf({production:previous.production});
  // Participants update production, never the approved design or private notes.
  production={...p,metal:{...p.metal,actualWeight:production.metal?.actualWeight||'',lot:production.metal?.lot||''},casting:production.casting,operations:production.operations,controls:production.controls};
 }
 const payload=admin?{name:text(input.name,200).trim(),code:text(input.code||'',120),status:input.status,brief:text(input.brief||''),notes:text(input.notes||''),due:text(input.due||'',10),clientText:text(input.clientText||''),cover:input.cover?uuid(input.cover):'',production}:{...previous,status:input.status,production};
 if(!payload.name)throw fail('Le nom de la pièce est requis.');
 if(payload.due&&!/^\d{4}-\d{2}-\d{2}$/.test(payload.due))throw fail('Échéance invalide.');
 return {payload,collection_id:admin?uuid(input.collection):old.collection_id,assignees:admin?emails(input.assignees||[]):old.assignees,client_emails:admin?emails(input.clientEmails||[]):old.client_emails,published:admin?input.published===true:old.published};
}
export function uploadMetadata(input,role){
 const name=text(input.name,250);
 if(!FILE_PATTERN.test(name))throw fail('Format non accepté : '+name);
 if(!Number.isSafeInteger(input.size)||input.size<1||input.size>MAX_FILE_SIZE)throw fail('Taille maximale : 200 Mo par fichier.');
 return {name,size:input.size,image:/\.(png|jpe?g|webp)$/i.test(name),version:'V1',audience:role==='admin'?'private':'team',approved:false};
}
