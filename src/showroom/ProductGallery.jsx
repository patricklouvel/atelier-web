import React,{lazy,Suspense,useEffect,useRef,useState} from 'react';
import {Box,ChevronLeft,ChevronRight,Expand,Image as ImageIcon,X} from 'lucide-react';
import {productImages,productModel} from './product-media';
import './product-gallery.css';

const ModelViewer=lazy(()=>import('../ModelViewer'));
const modelFiles=[];

export default function ProductGallery({product}) {
 const images=productImages(product),model=productModel(product);
 const [index,setIndex]=useState(0),[view,setView]=useState('photos'),[expanded,setExpanded]=useState(false);
 const dialog=useRef(null),opener=useRef(null),touch=useRef(null),swiped=useRef(false),thumbnails=useRef([]);
 const image=images[index],multiple=images.length>1;
 useEffect(()=>{if(index>=images.length)setIndex(0);},[index,images.length]);

 useEffect(()=>{
  if(!expanded)return;
  const modal=dialog.current,overflow=document.body.style.overflow;
  modal.showModal();document.body.style.overflow='hidden';
  return()=>{modal.close();document.body.style.overflow=overflow;opener.current?.focus();};
 },[expanded]);

 function choose(next){setIndex(next);setView('photos');}
 function step(direction){choose((index+direction+images.length)%images.length);}
 function keys(event){
  if(view!=='photos'||!multiple||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   event.preventDefault();step(event.key==='ArrowRight'?1:-1);
   const next=(index+(event.key==='ArrowRight'?1:-1)+images.length)%images.length;
   if(event.target.closest('.sr-gallery-thumbnails'))thumbnails.current[next]?.focus();
  }
 }
 function swipeEnd(event){
  if(!touch.current)return;
  const end=event.changedTouches[0],dx=end.clientX-touch.current.x,dy=end.clientY-touch.current.y;
  touch.current=null;
  if(multiple&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4){swiped.current=true;step(dx<0?1:-1);}
 }
 function arrows(){return multiple&&<>
  <button type="button" className="sr-gallery-arrow sr-gallery-prev" aria-label="Image précédente" onClick={()=>step(-1)}><ChevronLeft size={20}/></button>
  <button type="button" className="sr-gallery-arrow sr-gallery-next" aria-label="Image suivante" onClick={()=>step(1)}><ChevronRight size={20}/></button>
 </>;}
 const touchEvents={onTouchStart:event=>{swiped.current=false;touch.current=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},onTouchEnd:swipeEnd,onTouchCancel:()=>{touch.current=null;}};

 return <section className="sr-gallery" aria-label={`Images et vue 3D de ${product.name}`} aria-roledescription="carrousel" onKeyDown={keys}>
  <div className="sr-gallery-modes" role="group" aria-label="Mode de présentation">
   <button type="button" aria-pressed={view==='photos'} onClick={()=>setView('photos')}><ImageIcon size={15}/>Photos <span>{images.length}</span></button>
   <button type="button" aria-pressed={view==='model'} onClick={()=>setView('model')}><Box size={16}/>Vue 3D{!model&&<span>À venir</span>}</button>
  </div>
  {view==='photos'?<>
   <div className="sr-gallery-stage" {...touchEvents}>
    {image?<button ref={opener} type="button" className="sr-gallery-main" aria-label={`Agrandir ${image.alt}`} onClick={()=>{if(swiped.current){swiped.current=false;return;}setExpanded(true);}}><img src={image.src} alt={image.alt} width="1100" height="1100" draggable="false"/><span><Expand size={15}/>Agrandir</span></button>:<div className="sr-gallery-placeholder"><ImageIcon size={32}/><p>Photos à venir</p></div>}
    {arrows()}
   </div>
   {image&&<div className="sr-gallery-caption" aria-live="polite" aria-atomic="true"><span>{image.caption}</span><span>{index+1} / {images.length}</span></div>}
   {multiple&&<div className="sr-gallery-thumbnails" role="group" aria-label="Choisir une image">{images.map((photo,i)=><button ref={element=>{thumbnails.current[i]=element;}} type="button" key={photo.src} aria-label={`Afficher l’image ${i+1} : ${photo.caption}`} aria-pressed={index===i} onClick={()=>choose(i)}><img src={photo.src} alt="" loading="lazy" width="90" height="90"/></button>)}</div>}
  </>:model?<>
   <Suspense fallback={<div className="sr-gallery-placeholder" role="status"><Box size={32}/><p>Chargement de la vue 3D…</p></div>}><ModelViewer file={model} files={modelFiles} appearance="showroom"/></Suspense>
   <p className="sr-gallery-note">{/\.gl(?:b|tf)$/i.test(model.name)?'La lumière met en valeur les matières du modèle. Le rendu reste indicatif.':'Explorez les volumes du bijou. La finition métallique est indicative.'}</p>
  </>:<div className="sr-gallery-placeholder" role="status"><Box size={36} strokeWidth={1}/><span className="sr-kicker">LE BIJOU SOUS TOUS SES ANGLES</span><h2>La vue 3D arrive bientôt.</h2><p>Vous pourrez faire tourner cette pièce et découvrir ses volumes en détail.</p><button type="button" className="sr-text-link" onClick={()=>setView('photos')}>Revenir aux photos<ChevronRight size={16}/></button></div>}
  <dialog ref={dialog} className="sr-dialog sr-gallery-lightbox" aria-label={`Photos de ${product.name}`} onCancel={()=>setExpanded(false)} onClose={()=>setExpanded(false)}>
   <button type="button" className="sr-close" aria-label="Fermer les photos agrandies" onClick={()=>setExpanded(false)}><X size={23}/></button>
   <div className="sr-gallery-expanded-image" {...touchEvents}>{image&&<img src={image.src} alt={image.alt} draggable="false"/>}{arrows()}</div>
   {image&&<div className="sr-gallery-caption" aria-live="polite" aria-atomic="true"><span>{image.caption}</span><span>{index+1} / {images.length}</span></div>}
  </dialog>
 </section>;
}
