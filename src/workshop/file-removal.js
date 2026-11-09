import {productionOf} from './production-model.js';
export function presentationUsesFile(record,id){return [record?.draft,record?.live].some(view=>view&&(view.modelId===id||view.gallery?.some(photo=>photo.fileId===id)));}
export function withoutFile(piece,id){
 const files=piece.files.filter(file=>file.id!==id),production=productionOf(piece);
 if(production.casting.fileId===id)production.casting=productionOf({}).casting;
 production.controls=production.controls.map(control=>control.photoId===id?{...control,photoId:'',validatedBy:'',validatedAt:'',result:control.result==='Conforme'?'À contrôler':control.result}:control);
 if(piece.files.some(file=>file.id===id&&file.approved)){production.modelApprovedBy='';production.modelApprovedAt='';}
 return {...piece,files,production,cover:piece.cover===id?(files.find(file=>file.image)?.id||''):piece.cover};
}
