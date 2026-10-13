# Déploiement OVH

Préparer Ubuntu avec Node.js LTS, PostgreSQL client, Nginx et Certbot. Créer l'utilisateur système `gadimat`, `/var/www/gadimat/releases`, `/var/www/gadimat/current`, `/etc/gadimat/gadimat.env` (mode 0600) et `/var/log/gadimat`.

Dans une nouvelle release : `npm ci`, `npm run build`, appliquer explicitement les migrations centrales après sauvegarde, puis basculer le lien symbolique `current`. Installer `deploy/systemd/gadimat-api.service`, lancer `systemctl daemon-reload && systemctl enable --now gadimat-api`, puis installer la configuration Nginx et valider avec `nginx -t`. Obtenir le certificat avec `certbot --nginx -d gadimat.pro -d www.gadimat.pro` seulement après la bascule DNS autorisée.

Vérifier `curl http://127.0.0.1:4000/api/health`, les routes SPA rafraîchies, la connexion, le renouvellement, la déconnexion et les trois modules. Les liens e-mail utilisent `PUBLIC_URL=https://gadimat.pro` et doivent viser `/impayes/dossiers/:id`.

Sauvegarde : charger les trois URL de bases et `BACKUP_DIR`, puis exécuter `deploy/backup.sh`; copier les dumps chiffrés hors du VPS et tester régulièrement `pg_restore --list`. Restauration : arrêter l'API, restaurer chaque dump dans une base vide avec `pg_restore --clean --if-exists`, contrôler les comptes et correspondances, puis redémarrer.

Retour arrière applicatif : repointer `current` vers la release précédente et redémarrer le service. Retour arrière des données : suivre `docs/MIGRATION.md` ou restaurer le dump central. Ne jamais relancer les anciens seeds/nettoyages.
