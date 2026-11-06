# Vitrine Cœur de Mielles

## Identité et contenu

Cœur de Mielles est un atelier de design. Ses recherches donnent naissance aux collections joaillières au sein de JINORIA. La signature publique est « par JINORIA ». Le site JINORIA présente ses propres créations, le sur-mesure et les pierres.

Le classement repose sur les formes : Rivages (vagues et entrelacs), Galets (volumes arrondis), Horizon (structures géométriques), Mielles (reliefs et strates). Le type de bijou constitue un second axe indépendant.

## Parcours et pages

- `/` : dessin des bijoux, quatre collections, créations représentatives, lien vers l’atelier de design.
- `/collections` : présenter les différences entre les collections et accéder à leurs pièces.
- `/collections/:id` : pièces d’une collection, filtrables par type.
- `/bijoux` et `/bijoux/:id` : entrer par type, puis filtrer par collection.
- `/creations/:id` : visuel du bijou, dessin, matières, finitions, inspiration, sélection et demande. Les suggestions appartiennent à la même collection.
- `/atelier-de-design` : origine des recherches et rôle respectif de Cœur de Mielles et JINORIA.
- `/selection` : retrouver les pièces conservées dans ce navigateur pour préparer un échange.
- `/confidentialite` : expliquer concrètement la sélection locale, les messages préparés et les liens externes.
- `/atelier` : portail professionnel distinct de la vitrine.

Les anciennes adresses restent compatibles. Le footer ne duplique pas l’annuaire des collections : il accompagne le projet (contact, sélection), ouvre le site JINORIA et donne accès à la confidentialité et au portail professionnel.

## Système visuel

Ivoire `#f8f6f2`, sable `#e9e3d8`, encre olive `#30342e`. Titres Georgia ; interface DM Sans locale. Liens soulignés et flèches sobres. Images ouvertes, sans cartes arrondies ni filtres de couleur. Corps de texte de 14–15 px ; liens de 12–13 px ; titres adaptés au contexte. Sur mobile : menu déroulant, hero empilé, collections en deux colonnes, footer en trois blocs lisibles.

Deux concepts Image Gen ont servi à fixer le premier écran et le footer. Écarts intentionnels : les photographies du catalogue existant sont conservées pour respecter les recherches de bijoux ; le footer est ramené à une hauteur pratique et son texte à l’échelle du navigateur. Aucun nouveau modèle de bijou n’est ajouté depuis les images de concept.

## Responsabilités frontend

- `SiteChrome.jsx` : navigation et footer communs.
- `HomePage.jsx` : composition de l’accueil.
- `EditorialPages.jsx` : atelier et confidentialité.
- `navigation.jsx` : liens internes et destination JINORIA.
- `catalog.js` / `taxonomy.js` : contenu et classement.
- `Showroom.jsx` : navigation, filtres, sélection, recherche et demandes.
- `showroom.css` : catalogue et contrôles existants ; `editorial.css` : système commun et nouvelles surfaces éditoriales.

## Limites actuelles

Le catalogue public reste une sélection éditoriale statique, distincte des recherches internes et du suivi de fabrication. Le contact prépare un message et n’annonce jamais un envoi fictif. Sans adresse de réception configurée, il propose de copier le texte et de poursuivre sur le site officiel JINORIA.

Les titres d’or, prix, dimensions, certifications, délais, adresse d’atelier et conditions commerciales ne sont pas inventés. Les mentions légales complètes devront utiliser les informations réelles de l’éditeur avant la mise en service commerciale.
