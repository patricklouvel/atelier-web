import React from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { images, universes, featuredProducts } from './catalog';
import { Link } from './navigation';

export default function HomePage({ go, renderProduct }) {
  return <>
    <section className="sr-hero">
      <div className="sr-hero-copy">
        <h1>Des lignes de côte,<br/>des bijoux de caractère.</h1>
        <p className="sr-hero-description">Vagues entrelacées, galets arrondis, reliefs du sable. Quatre collections dessinent un même lien au Cotentin.</p>
        <Link className="sr-outline" to="/collections" go={go}>Découvrir les collections<ArrowRight size={18}/></Link>
      </div>
      <div className="sr-hero-image"><img src={images.ring} alt="Bague aux rubans d’or entrelacés et aux pierres bleues et incolores" width="1536" height="1024" fetchPriority="high"/></div>
    </section>
    <section className="sr-universes sr-section">
      <div className="sr-section-head"><h2>Les collections</h2><Link to="/collections" go={go} className="sr-text-link">Voir les quatre collections<ArrowRight size={16}/></Link></div>
      <div className="sr-universe-grid">{universes.map(collection => <Link key={collection.id} to={'/collections/' + collection.id} go={go} className={'sr-universe sr-universe-' + collection.id}>
        <div><img src={collection.image} alt={'Collection ' + collection.name} loading="lazy" width="1000" height="1100"/></div>
        <h3>{collection.name}<ArrowUpRight size={19}/></h3><p>{collection.codes}</p>
      </Link>)}</div>
    </section>
    <section className="sr-pieces sr-section">
      <div className="sr-section-head"><div><h2>Les créations</h2><p>Bagues, bracelets, colliers et boucles d’oreilles.</p></div><Link to="/bijoux" go={go} className="sr-text-link">Explorer les bijoux<ArrowRight size={16}/></Link></div>
      <div className="sr-product-grid">{featuredProducts.map(renderProduct)}</div>
    </section>
    <section className="sr-design-intro">
      <h2>Le dessin,<br/>puis le bijou.</h2>
      <div><p>Cœur de Mielles imagine les formes. JINORIA accompagne leur développement joaillier.</p><Link to="/atelier-de-design" go={go} className="sr-text-link">Découvrir l’atelier<ArrowRight size={17}/></Link></div>
    </section>
  </>;
}
