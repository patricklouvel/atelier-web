import React from 'react';
import App from './App';
import bague from './preview-assets/bague.jpg';
import onde from './preview-assets/onde.png';
const file=(id,name,url)=>({id,name,url,preview:url,image:true,size:180000});
const projects=[
 {id:'exemple-rivages',name:'Bague Rivages',collection:'Rivages',brief:'Courbes entrelacées, or poli et satin. Exemple de présentation à partager avec l’atelier.',modified:'2026-11-06',files:[file('rendu','Bague-Rivages.jpg',bague),file('reference','Reference-a-plat.png',onde)]},
 {id:'exemple-onde',name:'Bague Onde',collection:'Recherches de formes',brief:'Une ligne de pierres entre deux vagues. Référence de recherche pour les volumes et les finitions.',modified:'2026-11-05',files:[file('onde','Recherche-Onde.png',onde)]},
];
export default function Preview(){return <><div className="preview-notice" role="status">Aperçu local · Projets d’exemple · Aucun compte nécessaire</div><App previewProjects={projects}/></>;}
