# Logistique & GMAO — Phase 3B

## Résultat

La phase 3B remplace les imports Excel directs par un parcours guidé et audit-able : inspection du fichier, association des colonnes, prévisualisation sans écriture métier, décision explicite sur les doublons, puis confirmation.

Toutes les données et tous les journaux d’import résident dans `gadimat_logistique`. Aucune base SQL ERP/Open-Prod n’est requise ou interrogée.

## Jeux de données pris en charge

- parc automobile et équipements ;
- transactions de carburant ;
- pièces de rechange.

Des modèles XLSX sont téléchargeables depuis l’écran d’import.

## Migration 010

`010_guided_imports.sql` crée :

- `logistics_import_jobs` : fichier source, empreintes, mapping, périmètre informatif, compteurs et état ;
- `logistics_import_rows` : ligne source, données normalisées, erreurs, doublon, décision et cible créée.

L’unicité `(utilisateur, type, empreinte fichier, empreinte mapping)` rend la prévisualisation idempotente.

## Sécurité et validation

- CSV et XLSX uniquement ;
- 5 Mo et 1 000 lignes maximum ;
- en-têtes uniques, non vides et limités à 100 colonnes ;
- contrôle de la signature ZIP des XLSX et rejet des CSV binaires ;
- rejet des formules XLSX et de toute cellule texte commençant par `=`, `+`, `-` ou `@` ;
- validation des formats, valeurs, statuts et références ;
- contrôle du périmètre site/service pendant l’aperçu et la confirmation ;
- nouvelle vérification des référentiels actifs au moment de la confirmation ;
- journal d’audit par entité créée ou mise à jour et par job confirmé.

Le fichier n’est pas conservé. Seules son empreinte, ses métadonnées et les données de prévisualisation nécessaires à la confirmation sont enregistrées.

## Doublons et confirmation

La prévisualisation n’écrit jamais dans les tables métier. Chaque doublon exige une décision explicite :

- actifs et pièces : ignorer ou mettre à jour ;
- carburant : ignorer, car les transactions sont immuables.

Les lignes nouvelles sont créées à la confirmation. Les lignes invalides sont ignorées. La confirmation utilise un point de sauvegarde PostgreSQL par ligne : une erreur isolée produit un état `partially_completed` sans annuler les lignes déjà valides. Chaque échec conserve un message contrôlé.

Les compteurs d’actifs ne peuvent pas diminuer lors d’une mise à jour. Les imports carburant historiques n’abaissent jamais le compteur courant ; ils ne le font progresser que si la lecture importée est supérieure.

## Permissions

- `imports.create` : inspecter, prévisualiser, consulter ses imports et télécharger les modèles ;
- `imports.confirm` : confirmer un import ;
- l’administrateur Logistique peut consulter tous les jobs ;
- le gestionnaire de parc possède désormais les deux permissions.

## Routes

- `GET /api/logistique/imports/definitions` ;
- `GET /api/logistique/imports/template/:type` ;
- `POST /api/logistique/imports/inspect` ;
- `POST /api/logistique/imports/preview` ;
- `GET /api/logistique/imports` ;
- `GET /api/logistique/imports/:id` ;
- `POST /api/logistique/imports/:id/confirm`.

## Déploiement

1. sauvegarder la base dédiée ;
2. exécuter `npm run migrate:logistics` ;
3. redémarrer l’API et le frontend ;
4. tester chaque modèle sur des copies anonymisées représentatives ;
5. comparer les compteurs de prévisualisation et le résultat confirmé ;
6. vérifier les accès avec un compte limité à un site.

## Vérifications

- `npm test` : 105 tests réussis, dont mapping, normalisation, empreinte, CSV/XLSX et formules dangereuses ;
- `npm run typecheck` : réussi ;
- syntaxe Node et `git diff --check` : validés ;
- `npm run build` : réussi, 3 618 modules compilés ;
- configuration Docker Compose : valide malgré l’avertissement local d’accès à la configuration Docker utilisateur.

La migration 010 doit être appliquée sur l’instance PostgreSQL dédiée avant d’ouvrir l’écran aux utilisateurs.
