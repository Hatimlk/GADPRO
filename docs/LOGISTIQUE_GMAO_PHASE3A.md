# Logistique & GMAO — Phase 3A

## Résultat

La phase 3A ajoute l’automatisation quotidienne et l’analytique avancée dans la base PostgreSQL dédiée `gadimat_logistique`. Elle ne lit ni n’écrit aucune base SQL ERP/Open-Prod.

## Migration 009

`009_automation_and_analytics.sql` crée :

- `logistics_job_runs`, journal idempotent des traitements avec statut, résultat et erreur ;
- `logistics_asset_downtime_periods`, périodes techniques issues des interventions ;
- les types d’alertes `delayed_intervention` et `immobilized_asset`.

Une clé unique `(job_name, run_key)` empêche l’exécution en double d’un même traitement.

## Automatisation quotidienne

`POST /api/logistique/automation/daily` est réservé à `settings.admin`. Le corps facultatif accepte `runKey`; sans valeur, la date UTC courante est utilisée.

Le traitement :

1. recalcule les échéances préventives et leurs alertes ;
2. synchronise les périodes d’immobilisation depuis les interventions ;
3. ouvre ou résout les alertes d’intervention en retard ;
4. ouvre ou résout les alertes d’actif immobilisé ;
5. écrit un audit et le résultat d’exécution.

`GET /api/logistique/automation/runs` retourne les 50 dernières exécutions. En production, l’appel quotidien peut être confié à un ordonnanceur authentifié avec un compte technique disposant strictement de `settings.admin`.

## Analytique

`GET /api/logistique/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD` applique systématiquement le périmètre sites/services du compte. La période est inclusive et limitée à trois ans. Les filtres `siteId`, `categoryId` et `assetId` sont disponibles.

L’API expose :

- maintenance, carburant et pneumatiques hors intervention ;
- coût d’exploitation suivi sans double compter les factures déjà intégrées aux interventions ;
- disponibilité calendaire, immobilisation déclarée et répartition préventif/correctif ;
- évolution mensuelle ;
- actifs les plus coûteux en maintenance ;
- dépense, délai moyen et ponctualité par prestataire.

Le libellé **coût d’exploitation suivi** est volontaire. Le système ne présente pas un TCO tant que l’amortissement, l’assurance, les taxes et les autres charges ne sont pas alimentés.

La disponibilité utilise actuellement une base calendaire 24 h/24 :

`(heures calendaires du parc - heures d’immobilisation déclarées) / heures calendaires du parc`

Le taux de réintervention prestataire reste indisponible (`null`) jusqu’à validation d’une fenêtre métier. Aucun seuil arbitraire n’est codé.

## Interface

Le tableau de bord affiche le coût d’exploitation suivi et la disponibilité depuis le début de l’année. La page Rapports permet de choisir une période, comparer les catégories de coûts et les prestataires, consulter les tendances et lancer le traitement quotidien pour un administrateur.

## Déploiement

1. sauvegarder `gadimat_logistique` ;
2. exécuter `npm run migrate:logistics` ;
3. redémarrer API et frontend ;
4. lancer une première fois le traitement quotidien ;
5. vérifier les alertes, le journal des jobs et les indicateurs avec des données de recette connues ;
6. configurer ensuite l’ordonnanceur avec une clé journalière stable.

## Limites assumées

- la base de disponibilité est 24/7, à remplacer par un calendrier de travail si GADIMAT le valide ;
- le coût pneumatique ne compte dans l’indicateur filtré que lorsqu’un mouvement est rattaché à un actif et pas déjà à une intervention ;
- les heures d’immobilisation reposent en priorité sur la valeur explicitement déclarée lors de la clôture technique ;
- le taux de réintervention nécessite une règle métier validée.

## Vérifications

- `npm test` : 96 tests réussis ;
- `npm run typecheck` : réussi ;
- `npm run build` : réussi, 3 617 modules compilés ;
- syntaxe Node, cohérence Git et configuration Docker Compose : validées.

La migration 009 n’a pas été appliquée pendant cette session faute d’instance PostgreSQL/Docker disponible. Elle doit être exécutée avec `npm run migrate:logistics` sur la base dédiée avant d’utiliser les nouvelles routes.
