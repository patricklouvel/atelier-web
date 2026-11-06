import React from 'react';
import {createRoot} from 'react-dom/client';
const root=createRoot(document.getElementById('root'));
const privateEntry=location.pathname==='/atelier'||location.pathname.startsWith('/atelier/')||new URLSearchParams(location.search).get('apercu')==='1'||/^[a-f0-9]{48}$/.test(location.hash.slice(1));
if(privateEntry){
 import('./AtelierEntry.jsx').then(({default:AtelierEntry})=>root.render(<AtelierEntry/>));
}else{
 import('./showroom/Showroom.jsx').then(({default:Showroom})=>root.render(<Showroom/>));
}
