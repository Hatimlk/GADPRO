# Logistique & GMAO — Livraison Phase 1A

**Périmètre :** référentiels, parc, compteurs, conducteurs et affectations.  
**Architecture :** base PROGAD autonome `gadimat_logistique`. Aucune lecture, écriture, table ou connexion ERP/Open-Prod.

## Fonctionnalités livrées

- création et consultation séparée des véhicules et des engins/équipements ;
- fiche actif avec identité, site, catégorie, statut, coût d'acquisition et compteurs ;
- unicité des numéros de parc, immatriculations, VIN et numéros de série ;
- relevés kilométriques/horaires transactionnels ;
- refus des baisses de compteur sans permission et justification ;
- création et consultation des conducteurs avec coordonnées professionnelles et expiration du permis ;
- affectations historisées, conducteur principal unique par actif ;
- refus d'une affectation lorsque le permis est expiré à sa date de début ;
- référentiels administrables pour sites, services et catégories d'actifs ;
- verrouillage optimiste des modifications par champ `version` ;
- journal d'audit pour chaque création, modification, relevé et affectation ;
- filtrage backend par sites et services issus de `module_access.data_scope` ;
- validation Zod, requêtes paramétrées et transactions PostgreSQL.

## Migration

`database/migrations/logistique/002_fleet_and_drivers.sql`

Tables ajoutées :

- `logistics_departments` ;
- `logistics_assets` ;
- `logistics_meter_readings` ;
- `logistics_drivers` ;
- `logistics_driver_license_categories` ;
- `logistics_driver_authorizations` ;
- `logistics_driver_assignments`.

## API ajoutée

- `GET|POST /api/logistique/assets` ;
- `GET|PATCH /api/logistique/assets/:id` ;
- `POST /api/logistique/assets/:id/meters` ;
- `GET|POST /api/logistique/drivers` ;
- `GET|PATCH /api/logistique/drivers/:id` ;
- `GET|POST /api/logistique/assignments` ;
- `PATCH /api/logistique/assignments/:id/end` ;
- `GET /api/logistique/reference-data` ;
- `POST /api/logistique/references/{sites|departments|categories}` ;
- `PATCH /api/logistique/references/{type}/:id/status`.

## Écrans ajoutés

- `/logistique/parc` et fiche actif ;
- `/logistique/equipements` et fiche équipement ;
- `/logistique/conducteurs` ;
- `/logistique/affectations` ;
- `/logistique/referentiels`.

## Vérifications

- TypeScript : réussi ;
- 36 tests Vitest : réussis ;
- build Vite production : réussi, 3 602 modules transformés ;
- syntaxe Node des nouvelles routes : réussie ;
- configuration Compose et `git diff --check` : réussis ;
- recherche de dépendances ERP dans le domaine Logistique : aucune connexion ou variable ERP trouvée.

## Déploiement

```powershell
docker compose -f compose.local.yml up -d --wait logistics-db
npm run migrate:logistics
npm run local:seed
```

En préproduction, créer d'abord une base PostgreSQL vide et renseigner uniquement `LOGISTICS_DATABASE_URL`. Ne pas renseigner de connexion ERP pour ce module.

## Limitations connues

- Docker Desktop n'étant pas démarré pendant cette session, les migrations 001/002 n'ont pas été exécutées sur un serveur PostgreSQL réel ;
- l'API de modification des actifs et conducteurs existe, mais l'interface de phase 1A privilégie encore la création et la consultation ;
- catégories de permis et autorisations par catégorie ont leur modèle SQL, mais pas encore leurs formulaires/API ;
- la gestion documentaire sécurisée sera livrée après choix du stockage privé ;
- l'administration visuelle détaillée des périmètres site/service reste à ajouter ; sans périmètre explicite, l'accès couvre tous les sites ;
- la pagination backend est active, mais les contrôles de pagination frontend restent à ajouter.

## Étape suivante

Phase 1B : prestataires, interventions correctives, transitions autorisées et historique complet. Cette étape continuera d'utiliser exclusivement `gadimat_logistique`.

