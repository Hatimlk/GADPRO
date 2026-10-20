# Logistique & GMAO — Phase 1C

## Résultat du lot

La phase 1C complète le MVP avec la maintenance préventive, les échéances, les alertes, les indicateurs de pilotage et un export Excel.

Toutes les données sont stockées dans la base PostgreSQL dédiée `gadimat_logistique`, configurée par `LOGISTICS_DATABASE_URL`. Le lot ne lit et ne modifie aucune base ERP/Open-Prod.

## Migration 004

`004_preventive_maintenance.sql` ajoute :

- les plans de maintenance ;
- leurs déclencheurs kilométriques, horaires et calendaires ;
- les actifs rattachés aux plans et leurs derniers compteurs de cycle ;
- les événements d'échéance dédupliqués ;
- les alertes, leur prise en compte et leur résolution ;
- la relation idempotente entre une échéance et son intervention préventive.

## Fonctionnalités

### Plans préventifs

- création d'un plan sur un ou plusieurs actifs autorisés ;
- déclencheur par kilomètres, heures ou jours/mois/années ;
- seuil d'alerte configurable ;
- combinaison de plusieurs déclencheurs selon la règle du premier seuil atteint ;
- verrou de version et journal d'audit ;
- premier cycle initialisé depuis les compteurs actuels de l'actif.

### Échéances et interventions

- recalcul manuel transactionnel pour le périmètre site/service de l'utilisateur ;
- états `upcoming`, `due`, `overdue`, `created`, `completed` et `dismissed` ;
- génération idempotente d'une intervention préventive ;
- clôture technique de l'intervention : échéance terminée, alerte résolue et nouveau point de départ enregistré ;
- protection contre l'accès direct à un actif, un plan ou une alerte hors périmètre.

### Alertes et pilotage

- alertes dédupliquées par échéance ;
- sévérité avertissement ou critique ;
- prise en compte et résolution avec auteur, date et version ;
- nouveaux KPI : préventifs en retard et alertes ouvertes ;
- rapport maintenance par mois et catégorie ;
- export Excel protégé contre l'injection de formules.

## Déploiement

1. Configurer `LOGISTICS_DATABASE_URL` vers la base dédiée.
2. Exécuter `npm run migrate:logistics`.
3. Redémarrer l'API et le frontend.
4. Ouvrir **Plans de maintenance**, créer les plans, puis utiliser **Maintenance préventive > Recalculer**.

Pour un volume Docker existant, le montage du fichier SQL ne suffit pas : le runner de migrations doit être exécuté explicitement.

## Vérifications

- `npm test` : 53 tests réussis ;
- `npm run typecheck` : réussi ;
- `npm run build` : réussi, 3 609 modules compilés ;
- validation syntaxique Node des nouvelles routes : réussie ;
- validation de la configuration Docker Compose : réussie.

La migration n'a pas été appliquée à une instance PostgreSQL réelle pendant cette session, Docker Desktop n'étant pas disponible. L'application de la migration 004 et un test fonctionnel sur une base locale ou de recette restent nécessaires avant la mise en production.

## Limites assumées du MVP

- le recalcul est déclenché manuellement ; sa planification automatique par worker/cron appartient à l'étape suivante ;
- l'écran de création simplifié expose un déclencheur par plan, tandis que l'API et le modèle acceptent jusqu'à trois déclencheurs distincts ;
- les notifications externes par e-mail ne sont pas encore activées.
