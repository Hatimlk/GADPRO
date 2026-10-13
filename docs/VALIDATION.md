# Validation fonctionnelle locale

Validation exécutée le 12 octobre 2026 exclusivement sur les trois bases Docker locales (`5541`, `5542`, `5543`). Aucune base de production, migration de production, donnée réelle ou envoi SMTP n’a été utilisé.

## Contrôles automatisés

- `npm test` : 8 tests d’autorisation, session et CSRF réussis.
- `npm run verify:local-rbac` : comptes et dossiers synthétiques créés puis supprimés automatiquement.
- `npm run typecheck` : aucune erreur TypeScript.
- `npm run build` : bundle Vite de production généré.

Le scénario RBAC local vérifie : création et désactivation par l’administration centrale, utilisateur Chèques seul, commercial Impayés limité à ses dossiers, utilisateur des deux modules, permission Consommations indépendante, compte désactivé, lecture seule et appels directs interdits.

## Parcours vérifiés

- Connexion centrale, rotation de session, relecture de `/auth/me`, déconnexion et rejet après déconnexion.
- Rafraîchissement direct des routes SPA : accueil, Chèques, Impayés, Consommations et Administration.
- Rendu mobile automatisé à 390 × 844 px : connexion, accueil, tableau Chèques et tableau Impayés.
- Endpoints de lecture Chèques, Consommations, dossiers Impayés, vues Open‑Prod synchronisées, alertes, notifications, référentiels, journal d’audit et export Excel.
- Export Impayés aligné sur les données Open‑Prod visibles et filtré pour les commerciaux.

## Données simulées

Le runtime ne contient pas de fournisseur de données factices. Les seules données simulées sont le seed local explicite et les fixtures temporaires de `verify:local-rbac`; ce script refuse les hôtes PostgreSQL non locaux et nettoie ses données.

## À valider avant production

- Connexion Open‑Prod réelle en lecture seule, synchronisation et volumétrie.
- SMTP dans une boîte de capture, puis notifications réelles autorisées.
- Calibrage physique de chaque modèle d’impression bancaire.
- Imports Excel sur copies anonymisées représentatives.
- Migration utilisateurs en dry-run puis sur préproduction, sauvegarde/restauration et retour arrière.
- Nginx, TLS, service systemd, cron, observabilité et sauvegardes sur le VPS.
