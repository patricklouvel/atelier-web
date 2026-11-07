import {client} from '../lib/auth.js';
import {serverSupabaseConfig} from '../lib/supabase-config.js';
import {fail,uuid} from '../lib/workshop-policy.js';
import {presentationChecked as checked} from '../lib/presentation-service.js';
import {publicPresentation} from '../src/publication/model.js';

export function createCatalogueHandler(c,storage){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method!=='GET')throw fail('Méthode non autorisée.',405);
  if(req.query?.action==='media'){
   const id=uuid(req.query.id),fileId=uuid(req.query.file),version=Number(req.query.v);
   const row=checked(await c.from('atelier_presentations').select('id,project_id,live,live_version').eq('id',id).maybeSingle());
   if(!row?.live||row.live_version!==version||!(row.live.modelId===fileId||row.live.gallery.some(photo=>photo.fileId===fileId)))throw fail('Média non publié.',404);
   const file=checked(await c.from('atelier_files').select('id,metadata,storage_path').eq('id',fileId).eq('project_id',row.project_id).eq('state','ready').maybeSingle());
   if(!file||!(/\.(glb|stl|png|jpe?g|webp)$/i.test(file.metadata.name)))throw fail('Média indisponible.',404);
   const signed=checked(await storage.createSignedUrl(file.storage_path,60));
   res.setHeader('Location',signed.signedUrl);return res.status(302).end();
  }
  if(req.query?.action&&req.query.action!=='index')throw fail('Action inconnue.');
  const rows=checked(await c.from('atelier_presentations').select('id,slug,live,live_version').eq('was_published',true))||[];
  return res.status(200).json({products:rows.filter(row=>row.live).map(publicPresentation),hiddenSlugs:rows.filter(row=>!row.live).map(row=>row.slug)});
 }catch(error){return res.status(error.status||503).json({error:error.status?error.message:'Catalogue momentanément indisponible.'});}
};}
export default async function handler(req,res){
 try{const c=client(),config=serverSupabaseConfig(process.env);return createCatalogueHandler(c,c.storage.from(config.bucket))(req,res);}
 catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'Catalogue non configuré.',code:'not_configured'});}
}
