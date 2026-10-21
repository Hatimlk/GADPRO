# Logistique & GMAO — Phase 3E

## Résultat

La phase 3E complète le parcours d’import guidé avec les conducteurs, les prestataires et l’historique de maintenance. Le même écran fournit désormais six modèles CSV/XLSX : parc, carburant, pièces, conducteurs, prestataires et interventions historiques.

Toutes les prévisualisations, décisions et écritures utilisent exclusivement PostgreSQL `gadimat_logistique`. Aucune base SQL ERP/Open-Prod n’est requise ou interrogée.

## Migration 013

`013_extended_guided_imports.sql` étend la contrainte des types autorisés de `logistics_import_jobs` avec :

- `drivers` ;
- `providers` ;
- `maintenance_history`.

Aucune donnée métier fictive n’est insérée.

## Conducteurs

L’import accepte notamment le matricule, le nom, le statut, les coordonnées professionnelles, l’expiration du permis et une liste de catégories de permis séparées par virgule, point-virgule ou barre verticale.

- clé de doublon : matricule conducteur ;
- création ou mise à jour explicite ;
- contrôle de l’unicité de l’e-mail ;
- remplacement transactionnel des catégories de permis lors d’une mise à jour ;
- statut `active` synchronisé avec le statut métier.

## Prestataires

L’import couvre l’identité fournisseur, les contacts, le contrat, les conditions de paiement, le statut et les codes spécialités.

- clé de doublon : code fournisseur ;
- création ou mise à jour explicite ;
- détection d’une raison sociale déjà utilisée ;
- résolution des spécialités actives par code ;
- remplacement transactionnel des spécialités lors d’une mise à jour.

## Historique de maintenance

L’import couvre les références historiques, l’actif, la nature et catégorie de maintenance, le prestataire, les dates, compteurs, coûts, immobilisation, statut final et notes.

- clé de doublon : référence d’intervention ;
- actif résolu par numéro de parc ;
- prestataire facultatif résolu par code fournisseur ;
- contrôle du périmètre site/service à l’aperçu et à la confirmation ;
- origine enregistrée comme `import` ;
- historique de statut créé automatiquement ;
- correction auditée d’une intervention existante ;
- aucune modification automatique de l’état courant de l’actif.

## Sécurité et cohérence

- mêmes limites de 5 Mo et 1 000 lignes ;
- rejet des formules et préfixes Excel dangereux ;
- validation des dates, statuts, montants, longueurs et cardinalités ;
- empreinte du fichier et du mapping pour l’idempotence ;
- décision obligatoire pour chaque doublon ;
- permission `imports.confirm` vérifiée côté API ;
- transaction globale et point de sauvegarde par ligne ;
- journal d’audit pour chaque création, mise à jour et confirmation.

## Déploiement

1. sauvegarder ou créer la base dédiée `gadimat_logistique` ;
2. exécuter `npm run migrate:logistics` ;
3. redémarrer l’API et le frontend ;
4. télécharger les trois nouveaux modèles depuis Imports guidés ;
5. tester avec des copies anonymisées des fichiers réels ;
6. comparer chaque aperçu avec le résultat confirmé ;
7. contrôler les accès avec un compte limité à un site.

La migration 013 n’a pas été appliquée dans cet environnement faute d’instance PostgreSQL disponible.

## Validation technique

- 125 tests automatisés réussis dans 16 fichiers ;
- contrôle TypeScript réussi ;
- build de production réussi avec 3 619 modules transformés ;
- syntaxe Node.js, Docker Compose et contrôle Git validés ;
- aucune connexion, lecture ou écriture vers une base SQL ERP/Open-Prod.
