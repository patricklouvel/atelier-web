import React from 'react';
import { ArrowRight } from 'lucide-react';
import { images, universes } from './catalog';
import { categories } from './taxonomy';
import { Link } from './navigation';
import wornJewellery from './assets/mielles-editorial.webp';
import './home.css';

const collectionNotes = {
  rivages: 'Vagues et entrelacs.',
  galets: 'Volumes doux et formes libres.',
  horizon: 'Lignes nettes et pierres géométriques.',
  mielles: 'Reliefs du sable et sillons d’or.',
};

export default function HomePage({ go }) {
  return <>
    <section className="sr-home-campaign" aria-labelledby="home-campaign-title">
      <div className="sr-home-campaign-photo">
        <img src={images.campaign} alt="Parure Rivages : bracelet, bague et boucles d’oreilles dans le sable et les herbes des dunes" width="1536" height="1024" fetchPriority="high"/>
      </div>
      <div className="sr-home-campaign-caption">
        <h1 id="home-campaign-title">Rivages</h1>
        <p>Vagues d’or et lignes entrelacées.</p>
        <Link to="/collections/rivages" go={go} className="sr-text-link">Découvrir la collection<ArrowRight size={18}/></Link>
      </div>
    </section>
    <section className="sr-home-collections" aria-labelledby="home-collections-title">
      <div className="sr-home-section-heading"><h2 id="home-collections-title">Les collections</h2><p>Quatre écritures du littoral.</p></div>
      <div className="sr-home-collection-grid">
        {universes.map(collection => <Link key={collection.id} to={'/collections/' + collection.id} go={go} className="sr-home-collection">
          <div><img src={collection.image} alt={'Collection ' + collection.name} loading="lazy" width="1000" height="1100"/></div>
          <h3>{collection.name}</h3><p>{collectionNotes[collection.id]}</p>
        </Link>)}
      </div>
    </section>
    <section className="sr-home-types" aria-labelledby="home-types-title">
      <div className="sr-home-types-photo"><img src={wornJewellery} alt="Collier et bracelet de la collection Mielles portés avec une tenue ivoire" loading="lazy" width="1365" height="768"/></div>
      <div className="sr-home-types-content">
        <h2 id="home-types-title">Les bijoux</h2>
        <nav aria-label="Les bijoux par type">{categories.map(category => <Link to={'/bijoux/' + category.id} go={go} key={category.id}>{category.name}<ArrowRight size={22}/></Link>)}</nav>
      </div>
    </section>
  </>;
}
