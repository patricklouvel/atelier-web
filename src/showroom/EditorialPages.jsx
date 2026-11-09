import React from 'react';
import { ArrowRight } from 'lucide-react';
import { images } from './catalog';
import { Link } from './navigation';

export function DesignAtelier({ go }) {
  return <>
    <section className="sr-house sr-design-house">
      <div><h1>L’atelier de design</h1><p className="sr-lead">Observer le paysage. Dessiner le bijou.</p>
        <p>Lune de Mielles est un atelier de design inspiré du Cotentin. Le mouvement de l’eau, les contours d’un galet, les sillons du sable : ces observations deviennent des recherches de lignes, de volumes et de matières.</p>
        <p>De ce travail naissent quatre collections joaillières : Rivages, Galets, Horizon et Mielles.</p>
        <p>Lune de Mielles fait partie de l’univers JINORIA.</p>
        <Link to="/collections" go={go} className="sr-text-link">Découvrir les collections<ArrowRight size={16}/></Link>
      </div><img src={images.miellesNecklace} alt="Les reliefs dorés du collier Sillons, collection Mielles" width="1000" height="1300"/>
    </section>
    <section className="sr-design-process">
      <div><h2>Une même sensibilité,<br/>quatre écritures.</h2><p>Rivages fait se croiser les rubans et les vagues. Galets travaille les formes arrondies et leurs assemblages. Horizon construit des lignes plus géométriques. Mielles explore les reliefs et les strates de la matière.</p><p>Les contrastes entre poli et texture, les tons dorés et les nuances marines relient ces collections.</p></div>
    </section>
  </>;
}

export function PrivacyPage() {
  return <article className="sr-information-page">
    <h1>Confidentialité</h1>
    <p className="sr-lead">Ce que ce site conserve lorsque vous le consultez.</p>
    <section><h2>Votre sélection</h2><p>Les bijoux enregistrés avec le cœur sont conservés dans le stockage local de votre navigateur. Cette sélection reste sur cet appareil et ne crée pas de compte. Vous pouvez retirer chaque bijou depuis la sélection, ou effacer les données du site dans les réglages de votre navigateur.</p></section>
    <section><h2>Vos demandes</h2><p>Le formulaire prépare un message dans votre navigateur. Il ne l’envoie pas automatiquement. Copier ce texte ne le transmet pas à Lune de Mielles. Si vous ouvrez votre messagerie ou le site JINORIA, la transmission dépend ensuite de votre action et du service utilisé.</p></section>
    <section><h2>Navigation et services externes</h2><p>La vitrine n’intègre aucun outil de mesure d’audience ni traceur publicitaire. Les liens vers JINORIA ouvrent un site distinct, auquel s’appliquent ses propres informations de confidentialité. L’hébergeur peut traiter les données techniques nécessaires à la distribution et à la sécurité du site.</p></section>
    <section><h2>Espace professionnel</h2><p>L’espace professionnel est distinct de la vitrine. Son accès nécessite une autorisation ; les documents de fabrication ne sont pas accessibles depuis le catalogue public.</p></section>
  </article>;
}
