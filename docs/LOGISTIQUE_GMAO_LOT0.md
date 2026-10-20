# Logistique & GMAO — Livraison du lot 0

**Date :** 20 octobre 2026  
**Statut :** implémenté et validé statiquement ; migration PostgreSQL à exécuter dès que Docker/PostgreSQL est disponible.

## Fonctionnalités livrées

- base PostgreSQL Logistique dédiée et configuration `LOGISTICS_DATABASE_URL` ;
- migration versionnée avec checksum, verrou d'exécution et transaction ;
- référentiels de fondation : sites, catégories d'actifs et audit append-only ;
- ajout de la base locale au Compose et à la sauvegarde ;
- accès Logistique fondé directement sur l'identité centrale PROGAD ;
- six rôles métier et permissions namespacées ;
- contrôle API fin avec refus par défaut et prise en charge du joker administrateur ;
- endpoint protégé `GET /api/logistique/bootstrap` ;
- carte `Logistique & GMAO` dans le cockpit, visible seulement aux utilisateurs autorisés ;
- routes `/logistique`, sidebar responsive groupée, retour cockpit et filtrage des entrées par permission ;
- tableau de bord de fondation alimenté par la base, sans KPI fictif ;
- écrans d'attente explicitement identifiés pour les phases 1 et 2 ;
- seed local des sites G1/G2/G3/G5, catégories d'actifs et accès administrateur Logistique.

## Migration ajoutée

`database/migrations/logistique/001_foundation.sql`

Tables :

- `schema_migrations` ;
- `logistics_sites` ;
- `logistics_asset_categories` ;
- `logistics_audit_logs`.

Les UUID d'utilisateurs sont des références logiques vers l'identité centrale. Aucune table utilisateur Logistique n'est créée.

## Vérifications exécutées

- `npm run typecheck` : réussi ;
- `npm test` : 30 tests réussis, dont les nouveaux cas d'autorisation et de rôles Logistique ;
- `npm run build` : réussi, 3 597 modules transformés ;
- `node --check` sur serveur, administration, runner et route Logistique : réussi ;
- `docker compose -f compose.local.yml config --quiet` : réussi ;
- `git diff --check` : réussi ;
- validation directe de `validateAccess` : rôle `fleet_manager`, aucune identité historique, 40 permissions et périmètre conservé.

## Limitation de validation

La migration n'a pas pu être exécutée dans cette session parce que le moteur Docker Desktop n'est pas démarré (`dockerDesktopLinuxEngine` introuvable). Ce n'est pas une erreur SQL ou Compose détectée. La validation réelle de création des tables reste obligatoire avant déploiement.

## Déploiement local

```powershell
Copy-Item .env.local.example .env
docker compose -f compose.local.yml up -d --wait
npm run migrate:logistics
npm run local:seed
npm run dev
```

Pour un volume Logistique neuf, PostgreSQL applique aussi `001_foundation.sql` au premier démarrage. Le runner doit néanmoins être exécuté pour enregistrer et vérifier le checksum de migration.

## Déploiement préproduction

1. Créer la base `gadimat_logistique` et un compte applicatif au privilège minimal.
2. Ajouter `LOGISTICS_DATABASE_URL` au fichier d'environnement protégé.
3. Sauvegarder les bases existantes.
4. Exécuter `npm run migrate:logistics` depuis la release candidate.
5. Déployer l'API, vérifier `/api/health`, puis déployer le frontend.
6. Attribuer `logistique` à un compte pilote depuis l'administration PROGAD.
7. Vérifier l'accès autorisé, le refus 403 et l'absence de régression sur les trois modules existants.

## Limites fonctionnelles connues

- les écrans métier sont volontairement des placeholders ;
- aucun actif, conducteur, prestataire ou intervention n'est encore créé ;
- les périmètres site/service sont stockés et transmis, mais leur filtrage SQL sera ajouté avec les repositories de phase 1 ;
- notifications, fichiers, imports, carburant, pneus, stock et achats ne font pas partie du lot 0 ;
- la liste des permissions est encore déclarée côté administration et côté navigation ; une source partagée/versionnée est recommandée pendant la phase 1.

## Prochaine étape recommandée

Phase 1A : référentiels administrables, parc véhicules/équipements, relevés de compteurs, documents minimaux, conducteurs et affectations, avec application obligatoire des périmètres `siteIds` et `departmentIds` dans les repositories.
