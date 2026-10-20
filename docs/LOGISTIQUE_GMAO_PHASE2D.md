# Logistique & GMAO — Phase 2D

## Résultat du lot

La phase 2D livre le stockage documentaire privé et le centre de notifications du module Logistique. Les métadonnées et notifications résident dans `gadimat_logistique`; les fichiers sont conservés hors de la racine web. Aucun accès à une base SQL ERP/Open-Prod n’est utilisé.

## Migration 008

`008_documents_and_notifications.sql` crée :

- `logistics_documents`, catalogue sécurisé des métadonnées, empreintes et expirations ;
- `logistics_notifications`, boîte de réception applicative individuelle et dédupliquée ;
- les index de consultation par entité, expiration, destinataire et statut.

Les documents utilisent une relation polymorphe contrôlée par l’API vers les actifs, interventions, devis, factures, prestataires ou conducteurs. Les identifiants utilisateurs restent des références logiques vers l’identité centrale PROGAD.

## Sécurité documentaire

- stockage privé configurable par `LOGISTICS_STORAGE_PATH` ;
- clé de stockage aléatoire sans nom fourni par l’utilisateur ;
- prévention de traversée de répertoire ;
- limite configurable avec `LOGISTICS_MAX_FILE_BYTES`, 10 Mo par défaut ;
- liste blanche PDF, JPEG, PNG, XLSX et DOCX ;
- contrôle simultané de l’extension, du MIME et de la signature binaire ;
- calcul SHA-256 et déduplication par entité/catégorie ;
- rejet de la signature EICAR de test ;
- téléchargement authentifié après contrôle permission et périmètre ;
- nom de téléchargement nettoyé ;
- suppression logique auditée puis retrait du fichier privé.

En développement, `LOGISTICS_AV_MODE=signature` permet les tests locaux avec `LOGISTICS_ALLOW_SIGNATURE_ONLY=true`. En production, la configuration fournie impose `LOGISTICS_AV_MODE=clamav` et `LOGISTICS_CLAMAV_COMMAND=clamdscan`. Sans antivirus externe opérationnel, l’API refuse la publication du fichier.

## Documents métier

Le composant documentaire est intégré aux fiches actifs et interventions, ainsi qu’aux écrans devis et factures. L’API prend également en charge les prestataires et conducteurs selon leur périmètre d’accès.

Routes :

- `GET /api/logistique/documents?entityType=...&entityId=...` ;
- `POST /api/logistique/documents` en `multipart/form-data` ;
- `GET /api/logistique/documents/:id/download` ;
- `DELETE /api/logistique/documents/:id` avec `documents.delete`.

## Notifications

La cloche de l’en-tête affiche les notifications de l’utilisateur, leur sévérité et le compteur non lu. Une notification peut être ouverte, marquée comme lue, archivée ou traitée en masse.

Les événements couverts sont :

- devis soumis à approbation et décision du devis ;
- bon de commande soumis et décision ;
- facture soumise et décision ;
- alertes de maintenance visibles dans le périmètre ;
- document téléversé avec expiration proche.

Les destinataires d’approbation sont sélectionnés depuis l’administration centrale selon la permission configurée, puis filtrés par site et service. Les clés de déduplication empêchent les doublons lors des rafraîchissements.

Routes :

- `GET /api/logistique/notifications` ;
- `POST /api/logistique/notifications/sync-alerts` ;
- `POST /api/logistique/notifications/sync-approvals` ;
- `PATCH /api/logistique/notifications/:id/read` ;
- `PATCH /api/logistique/notifications/actions/read-all` ;
- `PATCH /api/logistique/notifications/:id/archive`.

## Déploiement

1. Sauvegarder la base Logistique.
2. Configurer un répertoire privé persistant et non servi par le serveur web.
3. Installer et tester ClamAV ou fournir une commande `clamdscan` compatible.
4. Exécuter `npm run migrate:logistics`.
5. Redémarrer l’API et le frontend.
6. Tester upload, rejet antivirus, téléchargement RBAC et restauration conjointe base + fichiers.

Le répertoire documentaire doit être sauvegardé avec la base. Une restauration de l’un sans l’autre produit des métadonnées ou fichiers orphelins.

## Vérifications

- `npm test` : 88 tests réussis ;
- `npm run typecheck` : réussi ;
- `npm run build` : réussi, 3 617 modules compilés ;
- syntaxe Node et configuration Docker Compose : validées.

Docker Desktop n’était pas disponible pendant cette session. La migration 008 et le parcours avec ClamAV doivent encore être exécutés sur une instance PostgreSQL locale ou de recette avant production.

## Suite proposée — phase 3A

- jobs idempotents d’échéances et notifications ;
- indicateurs financiers et disponibilité avancés ;
- comparaison de performance des prestataires ;
- tableaux analytiques et filtres croisés.
