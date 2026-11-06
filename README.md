# Atelier ? collections et suivi de fabrication

## Version locale actuelle ? 6 novembre 2026

Ouvrir `http://127.0.0.1:17431/?apercu=1` apr?s `npm run dev`. Sans configuration Supabase, cet espace est aussi la page d?accueil du serveur de d?veloppement.

- Collections et fiches pi?ces : consignes, r?f?rence, ?ch?ance, notes personnelles.
- Kanban reprenant les sept ?tapes de l?application Rust, par glisser-d?poser ou s?lection d??tape.
- Fichiers import?s dans IndexedDB : t?l?chargements, visualisation des images et lecteur 3D existant. Les versions et la validation pour fabrication se r?glent par fichier.
- Affectation d?intervenants aux pi?ces ; s?lection des fichiers admin, fabrication, ou fabrication et client.
- ?changes et historique des ?tapes sur la m?me fiche pi?ce.
- Vitrine s?lectionn?e explicitement avec un texte client distinct des consignes internes.

Le s?lecteur ? Aper?u des acc?s ? sert ? v?rifier les vues admin, fabrication et client. **Il ne constitue pas une authentification ni une protection des donn?es locales.** Les donn?es et fichiers restent dans ce navigateur, sous cette origine. Aucun envoi, invitation ou synchronisation distante n?a lieu. Les exemples sont s?par?s de la biblioth?que Rust existante, qui n?est pas modifi?e ni automatiquement import?e.

Les m?tadonn?es sont enregistr?es sous `atelier.workshop.v1` dans localStorage et les fichiers dans la base IndexedDB `atelier-workshop-files`. ? Exporter le suivi JSON ? sauvegarde les m?tadonn?es seulement ; il ne contient pas les fichiers binaires. Le partage distant et les autorisations c?t? serveur devront ?tre impl?ment?s avant tout usage multiutilisateur. La version de production conserve pour l?instant le portail authentifi? d?crit ci-dessous ; le nouvel espace local n?y est pas encore branch?.

---

# Atelier · galerie web des sélections exportées

L’application personnelle est **Atelier d’origine**, dans le dossier voisin `Atelier-Windows`, avec sa bibliothèque, ses collections, ses moodboards, son Kanban et sa liaison Blender. Le bouton **Exporter vers le web** a été ajouté à cette application. Ce dossier contient uniquement le frontend de consultation et les API de publication privée.

## Export depuis Atelier

1. Ouvrir `../Atelier-Windows/Atelier.exe`, puis **Exporter vers le web** dans la barre latérale.
2. Choisir une collection ou toutes les collections ; cocher les rendus et fichiers des pièces à publier. Rien n’est choisi par défaut.
3. Saisir une présentation publique si nécessaire. Les notes personnelles, les états du Kanban, les moodboards et les chemins locaux ne sont pas envoyés.
4. Renseigner l’adresse HTTPS de cette galerie déployée et la clé privée du propriétaire, puis **Exporter la sélection**.
5. Une publication est créée par pièce sélectionnée, après validation des transferts. Les liens sont enregistrés dans la bibliothèque d’Atelier. L’option de remplacement retire les anciens partages de ces pièces sur la même galerie après réussite du nouvel envoi. Les erreurs de révocation sont signalées et peuvent être réessayées.

La synchronisation est manuelle : les changements locaux suivants ne partent pas automatiquement. **Retirer du web** révoque le partage, sans supprimer les originaux. Les URL déjà signées peuvent rester valables 60 secondes ; les fichiers déjà téléchargés ne peuvent pas être rappelés. Maximum : 60 fichiers et 200 Mo par fichier.

## Consultation web

Galerie de projets avec couvertures, rendus agrandissables, liste des fichiers et lecteur 3D FBX, GLB/GLTF, STL, OBJ et PLY. Rotation, zoom, déplacement, grille, filaire, plein écran et première animation si présente. Les BLEND, STEP et 3DM restent téléchargeables, sans conversion automatique.

Les dépendances ne sont pas collectées automatiquement : privilégier un GLB autonome ou un FBX aux textures incorporées. Les formats non acceptés par le portail peuvent être placés dans un ZIP téléchargeable, sans prévisualisation de ce ZIP.

## Configurer Vercel et Supabase

Aucun compte cloud ou hébergement n’a été créé automatiquement. Aucun fichier utilisateur n’a été envoyé dans le cloud pendant le développement. Pour de vrais transferts :

1. Créer le projet Supabase ; exécuter `setup.sql`. Garder le bucket `atelier-private` **privé**.
2. Désactiver les inscriptions publiques dans Supabase Auth, configurer SMTP et les invitations.
3. Déployer ce dossier sur Vercel (Vite, sortie `dist`). Renseigner les variables de `.env.example` : backend `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `ATELIER_PUBLISH_KEY` (32 caractères minimum), `PUBLIC_PORTAL_URL` ; frontend `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Configurer Site URL et redirections Auth sur l’adresse HTTPS exacte, puis reconstruire le frontend.
5. Autoriser et inviter les destinataires avec le panneau propriétaire existant dans Atelier > Pistes créatives > Publier sur la galerie de l’équipe > Personnes autorisées, ou via `/api/access`. Une session confirmée et l’inscription dans `atelier_members` sont requises.
6. Utiliser cette adresse et la même `ATELIER_PUBLISH_KEY` dans le panneau d’export d’Atelier.

La galerie contient uniquement les publications explicites. Tous les membres autorisés voient toutes les publications du portail ; il n’y a pas de droits par projet. Un lien seul ne donne aucun accès. Les sessions utilisent `sessionStorage`. La clé service_role reste exclusivement backend, jamais préfixée VITE. Le bucket peut conserver des brouillons après interruption et des fichiers après révocation : prévoir leur nettoyage administratif.

## Développement et contrôles

`npm ci`, `npm run dev`, `npm run build`, `npm test`.

Les sources de l’application personnelle sont dans `../atelier`. Ses contrôles sont `npm run build`, `npm run test:web-export` et `npm run test:rust`. Le parcours réel dans Atelier a été vérifié sur une bibliothèque de test séparée : import local, déplacement Kanban et sauvegarde, sélection d’un rendu et d’un FBX en excluant le BLEND et l’autre pièce, liens persistés, remplacement du partage et échec d’envoi. Les API cloud et le transfert du modèle ont été simulés ; une recette sur l’hébergement réel reste nécessaire après configuration.

Références du lecteur : [FBXLoader](https://threejs.org/docs/pages/FBXLoader.html), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

### Connexion réelle en développement local

Le serveur lancé par `npm run dev` exécute aussi les API privées `/api/portal` et `/api/access`.

1. Copier `.env.example` vers `.env.local` et renseigner les valeurs du projet Supabase (frontend **et** backend). Ne jamais préfixer la clé `service_role` par `VITE_`.
2. Mettre `PUBLIC_PORTAL_URL=http://127.0.0.1:17431` dans `.env.local`.
3. Dans Supabase Auth, ajouter `http://127.0.0.1:17431` aux URL de redirection autorisées, sans remplacer l’adresse de production.
4. Le compte doit être invité et présent dans `atelier_members`, comme en production.
5. Redémarrer `npm run dev`, ouvrir `http://127.0.0.1:17431`, puis demander le lien de connexion avec cette adresse invitée.

Sans cette configuration, l’écran « Galerie à connecter » est normal : aucun compte local ni mot de passe par défaut n’existe. Le fichier `.env.local` reste sur votre ordinateur et ne doit pas être partagé.

### Aperçu sans Supabase

En développement, si Supabase n’est pas renseigné, la page d’accueil ouvre automatiquement une galerie de démonstration. On peut aussi l’ouvrir explicitement sur `http://127.0.0.1:17431/?apercu=1`. Les projets d’exemple permettent de tester la navigation et les rendus, sans connexion ni appel aux API privées. Cet aperçu est réservé à `npm run dev` et n’est pas inclus dans la version de production.

### Fiches modèle et production

Chaque fiche pièce locale possède désormais deux onglets supplémentaires :

- **Fiche modèle** : client/commande, date, révision, quantité, visuel, métal/titre/alliage/couleur, poids métal théorique et réel, fournisseur et lot, cotes et tolérances, nomenclature de composants, lots de pierres et sertissage, finitions par zone, traitements, fichiers et versions, consignes et validation du modèle.
- **Production** : sélection d’un STL avec arbre de coulée intégré et validation du fondeur liée à sa version, bilan matière, opérations ordonnées avec responsable/opérateur/date/poids entrée-sortie/lot/remarques, contrôles qualité avec photo associée et validation, motifs de refus et retour au Kanban.

Les propositions d’opérations et de contrôles sont facultatives et modifiables. Elles ne sont pas automatiquement marquées comme réalisées ou conformes. Les validations demandent un opérateur et une date. Toute modification d’une opération ou d’un contrôle validé retire sa signature ; toute modification de la définition technique retire la validation du modèle. Une version de STL différente rend la validation de fonte périmée. Les actions de validation et de retour en correction sont consignées dans l’historique de la pièce.

L’administrateur édite la définition technique ; les intervenants affectés la consultent et remplissent la production. Les clients n’accèdent à aucun de ces deux onglets. Ces comportements restent des aperçus locaux, sans authentification distante. Les données techniques sont conservées avec la pièce et incluses dans l’export JSON du suivi.

Le bouton **Imprimer / PDF** ouvre l’impression navigateur de la fiche active au format A4, sans navigation. Selon le nombre de composants/opérations, la fiche peut occuper plusieurs pages. Les champs laissés vides ne sont pas des valeurs de production validées.
