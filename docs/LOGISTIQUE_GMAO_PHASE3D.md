# Logistique & GMAO — Phase 3D

## Résultat

La phase 3D remplace les écrans provisoires Paramètres et Historique & audit par des fonctions opérationnelles. Elle étend également le traitement quotidien aux alertes administratives et d’exploitation. Toutes les données restent dans PostgreSQL `gadimat_logistique`; aucune base SQL ERP/Open-Prod n’est utilisée.

## Migration 012

`012_administration_and_extended_alerts.sql` crée `logistics_module_settings`, une table de paramètres typés, versionnés et auditables. Les valeurs initiales sont :

- préavis d’expiration des documents : 30 jours ;
- préavis d’expiration des permis : 30 jours ;
- alertes de stock critique activées ;
- alertes d’anomalie carburant activées ;
- alertes de devis en attente activées.

La migration enrichit aussi `logistics_alerts` avec une entité liée, une échéance et un responsable logique. Les alertes peuvent ainsi concerner un conducteur, un document, une pièce ou un devis sans imposer artificiellement un actif.

## Paramètres

La page Paramètres permet :

- de consulter les réglages avec `settings.read` ;
- de modifier une valeur avec `settings.admin` ;
- de protéger les modifications par numéro de version ;
- de lancer manuellement le traitement quotidien ;
- de consulter les dix dernières exécutions.

Les préavis sont bornés entre 1 et 365 jours. Les autres réglages sont strictement booléens. Chaque modification produit une entrée d’audit.

## Journal d’audit

La page Historique & audit est réservée à `audit.read`. Elle offre :

- pagination serveur ;
- filtres par action, type d’entité et période ;
- identification de l’auteur et de la corrélation ;
- visualisation des états avant/après et des détails techniques.

Le journal est en lecture seule : aucune route de suppression ou de modification n’est exposée.

## Alertes automatiques étendues

Le job quotidien couvre désormais :

- expiration d’assurance ;
- expiration de visite technique ;
- expiration des autres documents ;
- expiration des permis de conduire ;
- stock inférieur ou égal au minimum ;
- anomalies carburant ouvertes ;
- devis en attente d’approbation.

Ces catégories complètent les échéances de maintenance, interventions en retard et actifs immobilisés déjà disponibles. Les clés de déduplication empêchent les doublons. Une alerte prise en compte conserve son état lors des traitements suivants ; une alerte résolue est rouverte uniquement si la condition métier reste vraie.

Les alertes globales respectent aussi les permissions du domaine lié : conducteurs, documents, stock, carburant ou devis. Les alertes rattachées à un actif restent filtrées par site et service côté serveur.

## Routes

- `GET /api/logistique/settings` ;
- `PATCH /api/logistique/settings/:key` ;
- `GET /api/logistique/audit` ;
- `GET /api/logistique/audit/filters` ;
- `POST /api/logistique/automation/daily`.

## Déploiement

1. créer ou sauvegarder la base PostgreSQL dédiée `gadimat_logistique` ;
2. exécuter `npm run migrate:logistics` ;
3. redémarrer l’API et le frontend ;
4. valider les préavis avec les responsables métier ;
5. lancer une première exécution quotidienne ;
6. vérifier les alertes avec un compte global puis avec un compte limité à un site.

La migration 012 n’a pas été exécutée dans cet environnement faute d’instance PostgreSQL disponible. Elle doit être appliquée avant d’ouvrir les nouvelles pages.

## Validation technique

- 120 tests automatisés réussis dans 15 fichiers ;
- contrôle TypeScript réussi ;
- build de production réussi avec 3 619 modules transformés ;
- syntaxe Node.js, Docker Compose et contrôle Git validés ;
- aucune connexion, lecture ou écriture vers une base SQL ERP/Open-Prod.
