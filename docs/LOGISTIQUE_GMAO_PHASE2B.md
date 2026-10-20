# Logistique & GMAO — Phase 2B

## Résultat du lot

La phase 2B livre le catalogue de pièces et la gestion transactionnelle du stock. Toutes les données appartiennent à `gadimat_logistique`; aucune base ERP/Open-Prod n'est utilisée.

## Migration 006

`006_spare_parts_and_stock.sql` crée :

- le catalogue des pièces de rechange ;
- les compatibilités par catégorie d'actif ou actif précis ;
- le journal immuable des mouvements ;
- les lignes de coût analytique rattachées aux interventions.

## Règles de stock

- une réception augmente le stock et recalcule le coût moyen pondéré mobile ;
- une sortie utilise le coût moyen courant ;
- les sorties exigent une intervention, un actif et un statut d'intervention compatible ;
- une compatibilité configurée est contrôlée avant la sortie ;
- le stock négatif est refusé sous verrou de ligne PostgreSQL ;
- seul `stock.allow_negative` peut déroger à cette règle, avec motif obligatoire ;
- un ajustement exige toujours un motif ;
- un mouvement validé n'est jamais modifié ou supprimé ;
- une annulation produit un mouvement inverse unique ;
- les sorties, retours et annulations génèrent des lignes de coût analytiques positives ou négatives sur l'intervention.

Le verrou `SELECT ... FOR UPDATE` sur la pièce sérialise les mouvements concurrents avant tout calcul du nouveau solde.

## Interfaces

- catalogue avec stock disponible, coût moyen, emplacement et seuil minimum ;
- filtre des articles en stock bas ;
- création de pièces selon la permission `stock.manage` ;
- entrées, sorties, retours et ajustements selon les permissions dédiées ;
- journal des mouvements avec solde après opération ;
- annulation par mouvement inverse ;
- affichage des coûts de pièces dans la fiche intervention ;
- KPI stock bas et valeur totale du stock.

## Déploiement

1. Vérifier `LOGISTICS_DATABASE_URL`.
2. Exécuter `npm run migrate:logistics`.
3. Redémarrer l'API et le frontend.

Pour un volume Docker déjà créé, le runner est obligatoire : le montage du fichier 006 ne rejoue pas automatiquement les scripts d'initialisation.

## Vérifications

- `npm test` : 71 tests réussis ;
- `npm run typecheck` : réussi ;
- `npm run build` : réussi, 3 613 modules compilés ;
- syntaxe Node et Docker Compose : validées.

Docker Desktop n'était pas disponible pendant cette session. La migration 006 doit donc encore être exécutée et testée sur une instance PostgreSQL locale ou de recette avant mise en production.

## Suite proposée — phase 2C

- demandes de devis et consultation de prestataires ;
- saisie et comparaison des devis ;
- règles et étapes d'approbation ;
- bons de commande ;
- factures et rapprochement avec les coûts d'intervention.
