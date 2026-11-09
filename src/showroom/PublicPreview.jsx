import React,{useEffect,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import ProductGallery from './ProductGallery';
import {universes} from './catalog';
import './showroom.css';
import './editorial.css';

export default function PublicPreview(){
 const [product,setProduct]=useState(null);
 useEffect(()=>{
  function receive(event){if(window.parent!==window&&event.source===window.parent&&event.origin===location.origin&&event.data?.type==='atelier-public-preview'&&event.data.product?.id)setProduct(event.data.product);}
  window.addEventListener('message',receive);if(window.parent!==window)window.parent.postMessage({type:'atelier-public-preview-ready'},location.origin);return()=>window.removeEventListener('message',receive);
 },[]);
 return <div className="showroom-root"><main>{product?<section className="sr-product-detail" style={{paddingTop:25}}><ProductGallery key={product.id} product={product}/><div className="sr-product-info"><span className="sr-kicker">LUNE DE MIELLES · {universes.find(u=>u.id===product.universe)?.name.toUpperCase()}</span><h1>{product.name||'Nom du bijou'}</h1><p className="sr-product-subtitle">{product.subtitle}</p><p>{product.description}</p><span className="sr-product-material">{product.materials}</span><div className="sr-product-accordions"><details open><summary>Les finitions<ChevronDown size={15}/></summary><p>{product.finish}</p></details><details><summary>L’inspiration<ChevronDown size={15}/></summary><p>{product.inspiration}</p></details></div><span className="sr-product-house">APERÇU · CETTE VERSION N’EST PAS PUBLIÉE</span></div></section>:<p style={{padding:30}} role="status">Préparation de l’aperçu… Ouvrez cet aperçu depuis la présentation publique de la pièce.</p>}</main></div>;
}
