# Atelier web · Lune de Mielles

Le même projet contient le site vitrine public et l’atelier privé, accessible sur **/atelier**. L’atelier s’utilise directement dans le navigateur. L’application Rust et les exports locaux ne sont plus nécessaires pour créer et suivre les pièces.

## Mise en service sur Vercel

1. Déployer le dépôt avec Vercel (Vite, commande de build : npm run build, sortie : dist).
2. Relier le bon projet Supabase. Variables serveur : SUPABASE_URL et SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY). Variable publique : SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY). L’intégration Vercel fournit ces valeurs ; les alias NEXT_PUBLIC_* et les anciens VITE_* sont pris en charge. La clé privée reste exclusivement dans les fonctions serveur.
3. Exécuter **setup.sql** dans Supabase SQL Editor. Le script complet crée les comptes autorisés, les rôles, le stockage privé et les tables de l’atelier. Il est réexécutable sans supprimer les données. Pour une installation qui possède déjà les comptes et le bucket, **workshop-schema.sql** ajoute uniquement le nouvel atelier.
4. Définir le premier administrateur avec l’instruction commentée dans setup.sql, en remplaçant l’adresse. Cela autorise le compte, mais ne crée pas de mot de passe dans Supabase Auth.
5. Dans Supabase Auth : activer le fournisseur e-mail, désactiver « Allow new users to sign up », configurer le SMTP pour l’équipe. Site URL : https://votre-domaine/atelier. Redirect URLs : https://votre-domaine/atelier/activer et https://votre-domaine/atelier/reinitialiser.
6. Définir PUBLIC_PORTAL_URL sur le domaine canonique. Une invitation permet de choisir le premier mot de passe ; la connexion quotidienne utilise ensuite e-mail et mot de passe. Ne pas réutiliser un ancien lien expiré.
7. Se connecter sur /atelier. Créer une collection, puis une pièce. Les installations neuves démarrent sans exemples ni fichiers fictifs.

Une intégration Supabase–Vercel ne crée pas automatiquement les tables. Après un changement des variables, redéployer Vercel. Le bucket privé par défaut est atelier-private ; SUPABASE_BUCKET doit correspondre au bucket effectivement configuré.

## Travail dans l’application web

- **Collections et pièces** : création, nom, référence, consignes, échéance, notes privées ; modification du nom et de la description d’une collection.
- **Suivi de fabrication** : Kanban à sept étapes, par déplacement de carte ou sélection d’étape.
- **Fiche modèle** : métal/titre/alliage/poids/lot, dimensions, composants/BOM, pierres, finitions et zones, révisions, consignes et validation.
- **Production** : STL et version validés pour la fonte avec arbre intégré, opérations, responsables et opérateurs, dates et poids d’entrée/sortie, contrôles qualité, photos et retours en correction. Impression des fiches avec le navigateur.
- **Fichiers** : dépôt depuis le navigateur, stockage privé, téléchargement, prévisualisation des images et des modèles compatibles. Versions, couverture, visibilité et validation pour fabrication se règlent dans l’onglet Fichiers.
- **Échanges & historique** : messages attribués au compte connecté et traces des modifications enregistrées.
- **Accès & vitrine** : participants affectés à chaque pièce et invités clients explicitement sélectionnés. La vitrine client de l’atelier reste privée ; ce bouton ne publie rien sur le site public.
- **Accès et invitations** : comptes, rôles, invitation initiale et retrait des autorisations.

Les modifications du dossier, du Kanban, du partage et des fiches se valident avec **Enregistrer les modifications**. Les créations, transferts de fichiers et messages sont enregistrés immédiatement après succès serveur. L’état affiché distingue les changements en attente et ceux enregistrés. « Actualiser » récupère la version en ligne ; si un brouillon existe, son abandon doit être confirmé. Un changement de jeton de session conserve le brouillon.

Si deux personnes modifient le même dossier, une révision périmée est refusée : le brouillon reste affiché et la version récente n’est pas écrasée. Exporter le suivi JSON permet de conserver les champs du brouillon avant de recharger et reporter les modifications ; cet export ne contient pas les fichiers binaires. L’actualisation entre postes est manuelle, sans diffusion instantanée des modifications.

## Droits

| Profil | Accès |
| --- | --- |
| Administrateur | Toutes les collections, pièces, fiches, notes et fichiers ; gestion des comptes et partages |
| Participant fabrication | Pièces affectées, fiches et fichiers équipe/client ; modification du suivi de production, messages et ajout de fichiers équipe |
| Invité client | Pièces sélectionnées ET affectées à son compte, texte client et fichiers marqués client ; lecture uniquement |

Le serveur vérifie l’identité confirmée, l’existence du membre et son rôle depuis atelier_members à chaque requête. Les métadonnées du compte ne peuvent pas donner des droits. Les participants ne peuvent pas changer le dessin validé, les notes privées, les affectations ou la visibilité des fichiers. Une personne invitée n’a accès à aucune pièce par défaut.

RLS est activée sur les tables. Les rôles anon/authenticated n’ont aucun accès direct aux tables de l’atelier ni au bucket privé ; les API utilisent la clé serveur après contrôle des droits. Les URL de téléchargement expirent après 60 secondes. Les transferts utilisent une autorisation temporaire, puis la taille réellement stockée est vérifiée avant de rendre le fichier accessible. Les noms et chemins fournis par le navigateur ne déterminent jamais l’emplacement de stockage. Le dernier administrateur ne peut pas être retiré.

Tables : atelier_members, atelier_project_access (ancien portail), atelier_collections, atelier_projects, atelier_files, atelier_events. La fonction atelier_save_project enregistre atomiquement le dossier, les métadonnées de ses fichiers et la trace d’audit, avec contrôle de révision. Les affectations et les fichiers possèdent leurs index ; les fichiers incomplets restent en état pending et ne sont pas consultables. Après une interruption brutale du navigateur, des transferts pending peuvent nécessiter un nettoyage administratif du stockage.

## Formats et limites

PNG/JPEG/WebP ; FBX, BLEND, STL, OBJ/MTL, GLB/GLTF, PLY, STEP/STP, 3DM ; PDF et ZIP. Limite applicative : 200 Mo par fichier, sous réserve du plafond réel du projet Supabase. Le fichier va directement au stockage, sans transiter dans une fonction Vercel.

La prévisualisation 3D concerne FBX, GLB/GLTF, STL, OBJ et PLY. BLEND, STEP et 3DM restent téléchargeables. Privilégier GLB autonome ou FBX aux textures incorporées. Les dépendances externes ne sont pas regroupées automatiquement. La vérification de fabricabilité/manifold et les conversions CAO restent dans les outils métier.

## Développement et vérification

npm install
npm run dev
npm test
npm run build

Serveur : http://127.0.0.1:17431. Les API locales utilisent les mêmes variables serveur que Vercel (copier .env.example vers .env.local et renseigner les valeurs). Les fichiers .env locaux sont ignorés par Git.

En développement uniquement, sans Supabase ou avec ?apercu=1, le mode de démonstration local permet d’examiner les écrans. Ses exemples, son sélecteur de rôles, localStorage et IndexedDB ne constituent pas un partage distant. La version hébergée utilise toujours la connexion et l’atelier Supabase. Les données de démonstration ne sont pas importées automatiquement.

Les anciennes API /api/portal et /api/access?action=project sont conservées pour compatibilité avec les exports Rust. Elles ne sont plus l’entrée du nouvel atelier. Les anciennes sélections exportées restent dans leur stockage, sans déplacement ni suppression ; elles ne sont pas converties automatiquement en projets du nouvel atelier. ATELIER_PUBLISH_KEY ne sert qu’à cet ancien circuit.

## Vitrine publique

Lune de Mielles, par JINORIA. Collections : Rivages, Galets, Horizon, Mielles ; types de bijoux indépendants des collections. Les fiches publiques se gèrent depuis l’onglet **Présentation publique** de chaque pièce, réservé aux administrateurs. La création d’une pièce ou l’enregistrement d’un brouillon ne publient rien automatiquement. La sélection client reste locale au visiteur. Le contact prépare un message ; l’envoi par messagerie nécessite VITE_CONTACT_EMAIL. Site JINORIA : https://jinoria.com/ (surcharge VITE_JINORIA_URL). Voir research/showroom-architecture.md.

### Éditer et publier depuis l’atelier

Sur une installation existante, exécuter **public-presentation-schema.sql** dans Supabase SQL Editor, puis déployer cette version du projet. Les nouvelles installations utilisent **setup.sql**, qui inclut cette migration. Les variables serveur Supabase sont les mêmes que pour l’atelier ; aucune nouvelle clé navigateur n’est nécessaire.

1. Se connecter comme administrateur sur `/atelier`, ouvrir une pièce, puis **Présentation publique**.
2. Pour modifier une fiche déjà présente sur le site, choisir **Reprendre une fiche du catalogue actuel**. Ses textes et ses photos restent disponibles sans devoir les réimporter. L’adresse publique détermine la fiche remplacée ; elle est conservée après la première publication.
3. Renseigner le nom, la collection publique, le type de bijou, les textes, les matières et les finitions. Les consignes et notes de fabrication ne sont jamais reprises automatiquement.
4. Importer les photos et le GLB ou STL depuis ce panneau, ou utiliser les fichiers déjà dans la pièce. Sélectionner explicitement les photos du carrousel et le modèle 3D. Les flèches réordonnent les photos ; la première devient la couverture. Une photo retirée du carrousel reste dans les fichiers de la pièce.
5. **Enregistrer le brouillon** conserve le travail sans changer la fiche en ligne. **Aperçu** ouvre le véritable carrousel et le lecteur 3D dans une fenêtre isolée des styles de l’atelier.
6. **Publier sur le site** enregistre et publie cette version en une opération. Le site charge les nouvelles données via `/api/catalogue`, sans redéploiement pour les publications suivantes. Le catalogue se recharge aussi au retour sur l’onglet du site.
7. **Retirer du site public** masque la fiche et ses médias, tout en conservant le brouillon pour une nouvelle publication. Une ancienne version éditoriale de la même fiche ne réapparaît pas après ce retrait.

Le panneau possède son propre enregistrement, distinct d’**Enregistrer les modifications** de la fabrication. Les éditions concurrentes sont refusées sans écraser le travail affiché. Les invités clients et les participants fabrication ne peuvent ni lire les brouillons publics, ni publier. La vitrine privée des invités, dans **Accès & vitrine**, continue à fonctionner indépendamment.

La table `atelier_presentations` conserve un brouillon et un instantané publié distincts, avec révision et journal d’audit. Les tables restent inaccessibles directement aux rôles navigateur. L’API publique ne retourne que les champs publics et ne signe que les médias explicitement choisis dans la version publiée, avec contrôle de leur pièce et de leur transfert complet. Les liens déjà signés peuvent rester accessibles pendant leur durée résiduelle de 60 secondes après un retrait. Les illustrations du catalogue initial restent des ressources publiques du site ; le retrait d’une fiche ne supprime pas ces fichiers. Les noms internes des fichiers, chemins de stockage, affectations et données de fabrication ne figurent pas dans le catalogue public.

Sans configuration Supabase, le mode de développement permet de tester l’éditeur, l’aperçu et la publication dans ce navigateur uniquement, avec un bandeau explicite. Cette démonstration utilise localStorage et IndexedDB et ne constitue pas une mise en ligne. Sur l’hébergement, une erreur de catalogue est signalée et ne réactive pas silencieusement les anciennes fiches.

### Photos et vue 3D des fiches publiques

Chaque fiche `/creations/:id` propose un carrousel avec miniatures, flèches, navigation au clavier, balayage sur mobile et agrandissement. Le catalogue éditorial initial est défini dans `src/showroom/catalog.js`, puis complété ou remplacé par les présentations publiées depuis l’atelier. Pour les fiches éditoriales, les champs `image` et `detail` restent utilisés par défaut ; les images identiques sont regroupées.

Pour ajouter plusieurs vues d’un produit, renseigner `gallery` sur son entrée du catalogue. Pour activer sa vue 3D, ajouter `model` avec l’URL publique du GLB ou du STL et son nom. Exemple :

```js
gallery: [
 {src: '/images/bague-face.webp', alt: 'Bague de face', caption: 'De face'},
 {src: '/images/bague-profil.webp', alt: 'Bague de profil', caption: 'De profil'},
],
model: {url: '/models/bague.stl', name: 'bague.stl'},
```

Les fichiers de cet exemple seraient placés dans `public/images/` et `public/models/`. Aucun modèle de démonstration n’est publié. En l’absence de `model`, l’onglet « Vue 3D » affiche « À venir ». Le lecteur ne se charge qu’à son ouverture ; il permet de tourner, zoomer, recentrer, contrôler la rotation automatique et passer en plein écran.

La présentation client utilise un éclairage de studio généré localement, un fond ivoire dégradé, une ombre de contact, des reflets doux et un cadrage calculé pour la pièce, y compris en plein écran vertical. Une rotation lente démarre à l’ouverture, sauf si le navigateur demande une réduction des animations, et s’arrête dès que le visiteur manipule la pièce. Les boutons de zoom complètent la molette et le geste de pincement. Les matières exportées dans le GLB sont conservées ; les STL sont présentés avec une finition dorée indicative et des normales lissées sans déplacer les sommets ni arrondir les arêtes vives. L’atelier conserve son affichage technique.

Ces médias sont publics et récupérables par le navigateur. La sélection explicite dans **Présentation publique**, suivie de **Publier sur le site**, rend les médias choisis publics même si leur visibilité dans la vitrine privée reste différente. Les autres fichiers de la pièce restent privés.

Références techniques : [transferts signés Supabase](https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl) et [filtres de mise à jour](https://supabase.com/docs/reference/javascript/update).
