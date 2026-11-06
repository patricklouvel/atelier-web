import React from 'react';
import { ArrowRight, ArrowUpRight, Heart, Menu, Search, X } from 'lucide-react';
import { Link, JinoriaLink } from './navigation';

const navItems = [
  { to: '/collections', label: 'Collections', matches: ['/collections', '/coeur-de-mielles', '/coeur-des-mielles'] },
  { to: '/bijoux', label: 'Bijoux', matches: ['/bijoux', '/creations'] },
  { to: '/atelier-de-design', label: 'L’atelier de design', matches: ['/atelier-de-design', '/la-marque', '/la-maison'] },
];

export function SiteHeader({ path, go, menu, setMenu, openSearch, savedCount, request }) {
  return <header className="sr-header">
    <div className="sr-header-row">
      <button className="sr-mobile-menu sr-icon" aria-label={menu ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menu} aria-controls="site-navigation" onClick={() => setMenu(!menu)}>
        {menu ? <X size={21}/> : <Menu size={21}/>}
      </button>
      <Link to="/" go={go} className="sr-wordmark" aria-label="Cœur de Mielles — Accueil">
        <span className="sr-brand-name">Cœur de Mielles</span>
        <span className="sr-brand-signature"><em>par</em> JINORIA</span>
      </Link>
      <div className="sr-header-tools">
        <button className="sr-icon" aria-label="Rechercher une création" onClick={openSearch}><Search size={20} strokeWidth={1.4}/></button>
        <Link to="/selection" go={go} className="sr-icon" aria-label={`Ma sélection, ${savedCount} création(s)`}>
          <Heart size={20} strokeWidth={1.4}/>{savedCount > 0 && <span className="sr-count">{savedCount}</span>}
        </Link>
      </div>
    </div>
    <nav id="site-navigation" aria-label="Navigation principale" className={menu ? 'sr-nav is-open' : 'sr-nav'} onKeyDown={event => { if (event.key === 'Escape') setMenu(false); }}>
      {navItems.map(item => <Link key={item.to} to={item.to} go={go} aria-current={item.matches.some(route => path === route || path.startsWith(route + '/')) ? 'page' : undefined}>{item.label}</Link>)}
      <button onClick={() => { setMenu(false); request(); }}>Contact</button>
    </nav>
  </header>;
}

export function SiteFooter({ go, request }) {
  return <footer className="sr-footer">
    <div className="sr-footer-main">
      <div className="sr-footer-identity">
        <Link to="/" go={go} className="sr-footer-wordmark">Cœur de Mielles</Link>
        <span className="sr-jinoria-signature"><em>par</em> JINORIA</span>
        <p>Installé sur la côte ouest du Cotentin, l’atelier Cœur de Mielles puise son inspiration dans les paysages du littoral : les courbes des dunes, le mouvement des vagues et la lumière sur la mer.</p>
      </div>
      <div className="sr-footer-project">
        <h2>Votre projet</h2>
        <button className="sr-text-link" onClick={() => request()}>Nous contacter<ArrowUpRight size={16}/></button>
        <Link className="sr-text-link" to="/selection" go={go}>Votre sélection<ArrowRight size={16}/></Link>
      </div>
      <div className="sr-footer-jinoria">
        <h2>JINORIA</h2>
        <p>Créations sur mesure et pierres.</p>
        <JinoriaLink className="sr-text-link">Découvrir JINORIA<ArrowUpRight size={16}/></JinoriaLink>
      </div>
    </div>
    <div className="sr-footer-bottom">
      <span>© {new Date().getFullYear()} Cœur de Mielles</span>
      <div><Link to="/confidentialite" go={go}>Confidentialité</Link><a href="/atelier">Espace professionnel<ArrowUpRight size={13}/></a></div>
    </div>
  </footer>;
}
