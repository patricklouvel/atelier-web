import {uid} from './model.js';
export const OPERATION_NAMES=['CAO','Impression résine / cire','Arbre de fonte','Fonte','Ébarbage','Soudure','Mise en taille','Sertissage','Polissage','Rhodiage / traitement','Contrôle final'];
export const CONTROL_NAMES=['Dimensions et taille','Épaisseurs et cotes critiques','Solidité des griffes / sertissage','État de surface et finitions','Poids final','Poinçonnage'];
export function productionDefaults(){return {
 header:{client:'',date:'',revision:'A',quantity:'1'},
 metal:{type:'',fineness:'',alloy:'',color:'',theoreticalWeight:'',actualWeight:'',supplier:'',lot:''},
 dimensions:{ringSize:'',innerDiameter:'',length:'',width:'',thickness:'',tolerance:'',critical:''},
 components:[],stones:[],finishes:[],
 instructions:'',modelApprovedBy:'',modelApprovedAt:'',
 casting:{fileId:'',fileVersion:'',treeIntegrated:false,approvedBy:'',approvedAt:''},
 operations:[],controls:[],
 };}
export function productionOf(piece){const defaults=productionDefaults(),raw=piece.production||{};return {...defaults,...raw,header:{...defaults.header,...raw.header},metal:{...defaults.metal,...raw.metal},dimensions:{...defaults.dimensions,...raw.dimensions},casting:{...defaults.casting,...raw.casting},components:raw.components||[],stones:raw.stones||[],finishes:raw.finishes||[],operations:raw.operations||[],controls:raw.controls||[]};}
export function newOperation(name=''){return {id:uid(),name,owner:'',operator:'',date:'',weightIn:'',weightOut:'',lot:'',notes:'',status:'À faire',rejection:'',validatedBy:'',validatedAt:''};}
export function newControl(name=''){return {id:uid(),name,result:'À contrôler',operator:'',date:'',notes:'',photoId:'',validatedBy:'',validatedAt:''};}
export function castingReady(production,files){const c=production.casting,file=files.find(f=>f.id===c.fileId);return !!(file&&/\.stl$/i.test(file.name)&&c.treeIntegrated&&c.fileVersion&&c.fileVersion===file.version&&c.approvedBy.trim()&&c.approvedAt);}
export function validateOperation(row,author){if(!row.operator.trim()||!row.date)throw Error('Renseignez l’opérateur et la date avant de valider cette opération.');return {...row,status:'Validée',validatedBy:author,validatedAt:new Date().toISOString()};}
export function validateControl(row,author){if(!row.operator.trim()||!row.date)throw Error('Renseignez le contrôleur et la date avant de valider ce contrôle.');return {...row,result:'Conforme',validatedBy:author,validatedAt:new Date().toISOString()};}
