# Logistique & GMAO — Phase 3C

## Résultat

La phase 3C fournit un catalogue centralisé de rapports Excel/PDF et remplace les seuils carburant codés en dur par des paramètres versionnés dans `gadimat_logistique`. Elle ne dépend d’aucune base SQL ERP/Open-Prod.

## Migration 011

`011_reports_and_fuel_thresholds.sql` crée `logistics_fuel_anomaly_settings` avec une configuration unique par type de compteur :

- seuil d’alerte ;
- seuil critique ;
- progression minimale du compteur avant évaluation ;
- activation/désactivation ;
- version et audit de modification.

Les valeurs initiales conservent le comportement antérieur : 50/75 L/100 km et 20/30 L/h. Elles constituent des valeurs techniques initiales à valider par GADIMAT, pas une norme métier imposée.

Les seuils configurés sont utilisés pour les nouvelles saisies manuelles et les nouveaux imports. Une modification ne requalifie pas silencieusement les anomalies historiques déjà examinées.

## Catalogue de rapports

Neuf rapports partagent la même source de données pour l’aperçu API, Excel et PDF :

1. inventaire complet du parc ;
2. historique des interventions ;
3. consommation carburant ;
4. cycle de vie des pneumatiques ;
5. performance des prestataires ;
6. échéances préventives ;
7. état du stock de pièces ;
8. disponibilité du parc ;
9. coûts suivis par actif, avec coût/km et coût/heure lorsque les compteurs le permettent.

Les filtres disponibles sont la période, le site, la catégorie, l’actif, le prestataire, le conducteur et le statut selon le rapport. Le périmètre d’accès est toujours ajouté côté serveur.

## Exports

### Excel

- colonnes françaises et largeurs adaptées ;
- filtre automatique ;
- protection contre l’injection de formules ;
- feuille `Informations` avec titre, génération, méthodologie et filtres ;
- métadonnées GADIMAT · PROGAD.

### PDF

- document PDF autonome sans service externe ;
- identité GADIMAT · PROGAD ;
- format A4 paysage ;
- pagination et nombre de lignes ;
- titre, période et méthodologie ;
- échappement des caractères PDF.

Une limite de 10 000 lignes oblige à réduire les filtres avant un export trop volumineux.

## Routes

- `GET /api/logistique/reports/catalog` ;
- `GET /api/logistique/reports/:code/data` ;
- `GET /api/logistique/reports/:code.xlsx` ;
- `GET /api/logistique/reports/:code.pdf` ;
- `GET /api/logistique/fuel/anomaly-settings` ;
- `PATCH /api/logistique/fuel/anomaly-settings/:meterType` avec `settings.admin`.

## Règles financières

Le rapport de coûts affiche un **coût d’exploitation suivi** : maintenance, carburant et pneumatiques non déjà inclus dans une intervention. Il ne prétend pas être un TCO complet. Le coût/km ou coût/heure reste vide lorsque la progression du compteur est absente ou nulle.

La disponibilité reste basée sur un calendrier 24/7 et les immobilisations déclarées, conformément à la phase 3A.

## Déploiement

1. sauvegarder `gadimat_logistique` ;
2. exécuter `npm run migrate:logistics` ;
3. redémarrer l’API et le frontend ;
4. faire valider les quatre seuils initiaux par les responsables métier ;
5. contrôler un export Excel et PDF de chaque rapport avec un compte global puis limité à un site ;
6. comparer un échantillon de coûts avec les écritures sources.

La migration 011 doit être appliquée avant toute nouvelle saisie carburant, car l’API lit désormais cette table de configuration.

## Validation technique

- 111 tests automatisés réussis dans 14 fichiers ;
- contrôle TypeScript réussi ;
- construction de production réussie, avec 3 618 modules transformés ;
- syntaxe Node.js, cohérence Docker Compose et contrôle Git validés ;
- aucune lecture ni écriture vers une base SQL ERP/Open-Prod.

La migration 011 a été préparée mais n’a pas été exécutée sur une base PostgreSQL depuis cet environnement. Elle reste à appliquer sur la base dédiée `gadimat_logistique` avec `npm run migrate:logistics`.
