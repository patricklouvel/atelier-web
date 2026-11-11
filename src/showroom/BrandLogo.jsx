import React from 'react';

export default function BrandLogo({priority=false}){
 return <span className="sr-brand-logo"><img src="/LogoLdM.png" alt="Lune de Mielles" width="986" height="774" loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async"/></span>;
}
