import React from 'react';
import {createRoot} from 'react-dom/client';
import {readAuthCallback} from '../lib/auth-callback.js';
const root=createRoot(document.getElementById('root'));
const privateEntry=readAuthCallback(location).privateEntry||new URLSearchParams(location.search).get('apercu')==='1';
if(privateEntry){
 import('./AtelierEntry.jsx').then(({default:AtelierEntry})=>root.render(<AtelierEntry/>));
}else{
 import('./showroom/Showroom.jsx').then(({default:Showroom})=>root.render(<Showroom/>));
}
