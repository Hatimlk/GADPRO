# Audit des sources

Sources examinées le 12 octobre 2026 :

- `Gestion-Cheques` au commit `dc32300d2485e3661957d1dde3d61afbfd06d6be` : React 19/Vite 6/Tailwind 4, Express CommonJS, PostgreSQL, JWT simple stocké côté navigateur, identifiants utilisateurs `SERIAL`, rôles `Administrateur`/`Utilisateur`. Routes confirmées pour comptes bancaires, chéquiers, chèques/effets, partenaires, instances, utilisateurs et consommations. Les agences G1/G2/G3/G5 sont créées par l'ancien démarrage serveur.
- `Suivi-Impaye` au commit `976cf905a478ed137cc9c833af014c19c791ff22` : React 18/Vite 5/Tailwind 4, Express ES Modules, PostgreSQL, UUID, access/refresh JWT, rôles `admin`, `responsable_recouvrement`, `commercial`, `lecture_seule`, SMTP, tâches de rappel et connexion Open-Prod dédiée en lecture seule.

Les contrôles Impayés existants filtrent les commerciaux dans les listes, détails, exports, statistiques, alertes et lectures ERP. L'ajout d'action notifie le commercial affecté seulement si son identifiant diffère de celui de l'auteur. Ces routes ont été intégrées sans supprimer ces conditions.

L'harmonisation retient React 19, Vite 6 et Express ES Modules pour le serveur central. Les routes Chèques CommonJS restent isolées derrière une frontière de domaine afin de limiter les changements de logique métier. Les anciens scripts destructifs, fichiers de sauvegarde et classeur métier du dépôt Impayés n'ont pas été copiés ni exécutés.
