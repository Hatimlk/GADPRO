# Architecture GADIMAT

Le monorepo contient un frontend React/Vite unique, une API Express et trois connexions PostgreSQL indépendantes. La base centrale ne duplique aucune donnée métier : elle porte les identités UUID, les accès par module, les sessions et les correspondances historiques.

Une requête protégée suit cette chaîne : cookie de session → compte central actif → session non révoquée → accès au module → permission `read`, `write` ou `admin` → traduction vers l’identifiant historique → route métier. Le refus est la valeur par défaut. Les routes Impayés conservent ensuite leurs contrôles commerciaux sur les listes, détails, exports, statistiques, actions et données ERP.

Les domaines sont montés sous `/api/cheques`, `/api/impayes`, `/api/consommations` et `/api/administration`. Consommations appartient à la navigation Gestion des chèques sous `/cheques/consommations`, tout en gardant une permission API indépendante : un accès Chèques seul ne l’autorise pas et un accès Consommations seul n’ouvre pas les autres écrans Chèques. L’administration de plateforme est distincte des rôles administrateurs de modules. `logistique` reste réservé dans le modèle de données, sans processus métier fictif.

Open‑Prod utilise son pool dédié avec `default_transaction_read_only=on`. Les bases Chèques et Impayés restent les sources de vérité métier initiales.
