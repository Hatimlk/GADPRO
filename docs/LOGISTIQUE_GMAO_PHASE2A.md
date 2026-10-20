# Logistique & GMAO — Phase 2A

## Résultat du lot

La phase 2A ajoute le suivi du carburant et le cycle de vie des pneumatiques. Ces données restent exclusivement dans PostgreSQL `gadimat_logistique`, via `LOGISTICS_DATABASE_URL`. Aucune base ERP/Open-Prod n'est requise ou interrogée.

## Migration 005

`005_fuel_and_tires.sql` crée :

- les stations et transactions de carburant ;
- les signaux de consommation à examiner ;
- l'inventaire des pneumatiques ;
- les positions d'installation ;
- l'historique immuable des mouvements.

## Carburant

- saisie par actif avec date, énergie, quantité, prix et compteur ;
- calcul serveur du montant, sans accepter un total fourni par le navigateur ;
- empreinte métier unique contre les doubles saisies ;
- synchronisation transactionnelle du compteur de l'actif ;
- calcul L/100 km ou L/h uniquement entre deux relevés croissants ;
- signal de consommation élevée présenté comme anomalie à examiner, jamais comme preuve de fraude ;
- résolution ou classement en faux positif avec commentaire, auteur, date et verrou de version ;
- filtrage de toutes les données et actions par site/service.

Les seuils indicatifs du MVP sont de 50 L/100 km et 20 L/h. Ils devront être rendus configurables par catégorie d'actif avec un historique métier suffisant.

## Pneumatiques

- création et inventaire avec identifiant interne, dimension, DOT/série et coût ;
- statuts stock, installé, réparation, retiré et réformé ;
- installation, retrait, transfert, départ/retour de réparation ;
- une seule installation active par pneu et une seule occupation par position ;
- vérification de l'actif et de la position cibles ;
- mouvement et mise à jour de l'état courant dans la même transaction ;
- historique immuable, filtré selon le périmètre autorisé.

## Pilotage

Le tableau de bord ajoute :

- coût carburant du mois ;
- nombre de signaux carburant ouverts ;
- nombre de pneumatiques installés.

## Déploiement

1. Vérifier `LOGISTICS_DATABASE_URL`.
2. Exécuter `npm run migrate:logistics`.
3. Redémarrer l'API et le frontend.

Le montage Docker de la migration 005 initialise uniquement les nouveaux volumes. Un volume existant nécessite impérativement le runner de migrations.

## Vérifications

- `npm test` : 63 tests réussis ;
- `npm run typecheck` : réussi ;
- `npm run build` : réussi, 3 611 modules compilés ;
- syntaxe Node des routes et services : validée ;
- Docker Compose : configuration valide.

Docker Desktop n'étant pas disponible pendant cette session, la migration 005 reste à appliquer et à tester sur une instance PostgreSQL locale ou de recette avant mise en production.

## Suite proposée — phase 2B

- catalogue de pièces ;
- entrées, sorties, retours et ajustements de stock ;
- coût moyen pondéré ;
- protection contre le stock négatif ;
- rattachement des consommations de pièces aux interventions.
