# Logistique & GMAO — Phase 2C

## Résultat du lot

La phase 2C livre le workflow d’achats de maintenance : devis fournisseur, approbations, bons de commande et factures. Toutes les données sont stockées dans la base PostgreSQL dédiée `gadimat_logistique`. Aucun accès à une base SQL ERP ou Open-Prod n’est requis.

## Migration 007

`007_procurement_workflow.sql` crée :

- les devis et leurs lignes détaillées ;
- les règles d’approbation financières configurables ;
- le journal d’approbation append-only ;
- les bons de commande issus d’un devis approuvé ;
- les factures fournisseurs rapprochées d’une commande et d’une intervention ;
- les séquences de références `DEV-AAAA-*` et `BC-AAAA-*`.

Aucun seuil financier propre à GADIMAT n’est codé en dur. Sans règle active, une étape d’approbation standard est créée avec la permission du domaine concerné. Plusieurs règles ordonnées permettent une validation à plusieurs niveaux lorsque les seuils auront été confirmés.

## Règles métier

- les totaux HT, TVA et TTC des devis sont recalculés côté serveur à partir des lignes ;
- un devis doit être rattaché à une intervention et à un prestataire actif ;
- un seul devis peut être retenu par intervention ;
- les devis non retenus en attente sont rejetés automatiquement lors de la sélection ;
- le demandeur ne peut jamais approuver sa propre demande, y compris avec le rôle administrateur Logistique ;
- toutes les décisions sont datées, attribuées et auditées ;
- un bon de commande ne peut être créé qu’à partir d’un devis approuvé ;
- un bon doit être approuvé avant émission ;
- une facture exige une commande approuvée ou émise ;
- le cumul des factures non annulées ne peut pas dépasser le montant du bon ;
- la combinaison prestataire + numéro de facture est unique, sans distinction de casse ;
- la validation d’une facture crée une ligne de coût prestataire et recalcule le coût réel de l’intervention sans recompter cette ligne ;
- les changements automatiques de statut d’intervention sont inscrits dans son historique ;
- toutes les listes et mutations respectent le périmètre site/service du compte connecté.

## Interfaces et API

Les routes `/logistique/devis`, `/logistique/commandes` et `/logistique/factures` remplacent les écrans temporaires. Elles proposent les actions autorisées par les permissions centrales.

API ajoutées :

- `GET/POST /api/logistique/quotations` ;
- `GET /api/logistique/quotations/:id` ;
- `POST /api/logistique/quotations/:id/submit` ;
- `POST /api/logistique/quotations/:id/decision` ;
- `GET/POST /api/logistique/purchase-orders` ;
- `POST /api/logistique/purchase-orders/:id/decision` ;
- `POST /api/logistique/purchase-orders/:id/issue` ;
- `GET/POST /api/logistique/invoices` ;
- `POST /api/logistique/invoices/:id/submit` ;
- `POST /api/logistique/invoices/:id/decision`.

Le tableau de bord expose aussi le nombre d’approbations achats en attente et le montant des factures validées du mois.

## Déploiement

1. Vérifier `LOGISTICS_DATABASE_URL`.
2. Sauvegarder la base Logistique de recette.
3. Exécuter `npm run migrate:logistics`.
4. Tester la séparation demandeur-approbateur avec deux comptes distincts.
5. Configurer les règles de seuil uniquement après validation des montants, rôles et niveaux par GADIMAT.
6. Redémarrer l’API et le frontend.

Pour un volume Docker existant, le montage du fichier SQL ne remplace pas l’exécution du runner de migrations.

## Vérifications

- `npm test` : 81 tests réussis ;
- `npm run typecheck` : réussi ;
- `npm run build` : réussi, 3 616 modules compilés ;
- syntaxe Node et configuration Docker Compose : validées.

Docker Desktop n’était pas disponible pendant cette session. La migration 007 reste donc à exécuter et tester sur une instance PostgreSQL locale ou de recette avant mise en production.

## Suite proposée — phase 2D

- stockage documentaire privé et téléchargement autorisé ;
- métadonnées, empreinte SHA-256 et règles de taille/type ;
- documents des actifs, interventions, devis et factures ;
- notifications applicatives pour approbations, échéances et alertes.
