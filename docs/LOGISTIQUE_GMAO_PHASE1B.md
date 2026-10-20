# Logistique & GMAO — Phase 1B

## Résultat du lot

La phase 1B ajoute la maintenance corrective et le référentiel des prestataires au socle livré en phase 1A.

Le domaine reste autonome : aucune table ERP/Open-Prod n'est lue ou modifiée. Les données décrites ci-dessous appartiennent exclusivement à la base PostgreSQL PROGAD définie par `LOGISTICS_DATABASE_URL` (base locale par défaut : `gadimat_logistique`, port `5544`). Seule l'identité centrale PROGAD est référencée logiquement par UUID pour l'auteur et le demandeur.

## Base de données dédiée

La migration `003_providers_and_interventions.sql` crée :

- les spécialités de maintenance ;
- les prestataires et leurs spécialités ;
- les interventions de maintenance ;
- l'historique immuable des changements de statut ;
- les commentaires d'intervention ;
- une séquence de références `INT-AAAA-NNNNNN`.

Les écritures métier utilisent des transactions, un verrou de version optimiste et le journal d'audit du module. Les contraintes SQL protègent les statuts, montants, dates et relations.

## Fonctionnalités livrées

### Prestataires

- liste paginée avec recherche et filtre de statut ;
- création et modification sécurisées ;
- association à une ou plusieurs spécialités ;
- fiche détaillée avec nombre d'interventions, coût réel cumulé, délai moyen et taux de respect du planning ;
- refus d'un prestataire suspendu ou inactif lors de l'affectation à une intervention.

### Interventions

- création d'une demande sur un actif autorisé ;
- liste, recherche et filtres par statut, priorité, actif ou prestataire ;
- fiche détaillée et chronologie des statuts ;
- machine d'état explicite : demande, validation/rejet, planification, exécution, attente, fin technique, facturation et clôture ;
- séparation demandeur/validateur pour empêcher l'auto-validation et l'auto-rejet ;
- motif obligatoire pour rejet et annulation ;
- saisie des coûts, de l'immobilisation et du compte rendu uniquement lors de la fin technique ;
- passage automatique de l'actif en maintenance pendant l'exécution, puis retour à disponible à la fin ou à l'annulation ;
- contrôle systématique du périmètre site/service.

### Tableau de bord

Les indicateurs sont calculés depuis la base dédiée et limités au périmètre de l'utilisateur :

- actifs totaux, disponibles et indisponibles ;
- interventions ouvertes et urgences critiques ;
- coût réel de maintenance du mois.

## Déploiement

1. Renseigner `LOGISTICS_DATABASE_URL` vers une base PostgreSQL vide dédiée à ce module.
2. Exécuter `npm run migrate:logistics`.
3. Démarrer ou redémarrer l'API et le frontend.
4. Attribuer un rôle Logistique aux utilisateurs depuis l'administration PROGAD.

En local, `docker compose -f compose.local.yml up -d` prépare PostgreSQL sur le port `5544`. Pour un volume déjà initialisé, il faut toujours exécuter explicitement `npm run migrate:logistics` afin d'appliquer la migration 003.

## Vérifications réalisées

- `npm test` : 45 tests réussis ;
- `npm run typecheck` : réussi ;
- `npm run build` : réussi, 3 605 modules compilés ;
- validation syntaxique Node des routes et schémas : réussie ;
- `docker compose ... config --quiet` : réussi.

La migration n'a pas été exécutée contre une instance PostgreSQL réelle dans cette session, car Docker Desktop n'était pas disponible. Elle devra donc être appliquée et vérifiée sur l'environnement local ou de recette avant utilisation métier.

## Suite proposée — phase 1C

- plans de maintenance préventive et échéances kilométriques/horaires/calendaires ;
- génération contrôlée des interventions préventives ;
- alertes d'échéance ;
- rapports opérationnels et exports de base.
