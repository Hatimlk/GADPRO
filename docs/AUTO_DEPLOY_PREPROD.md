# Déploiement automatique de préproduction

Le workflow déploie uniquement `main` vers `preprod.gadimat.pro`. Il compile avec Node 24 sur GitHub, conserve l'environnement sur OVH et ne lance aucune migration/seed. Le serveur continue à exécuter l'API avec son Node actuel. Les archives sont envoyées par une commande SSH forcée; les clés d'hôte sont épinglées. Un échec du contrôle API après bascule rétablit le lien et redémarre l'ancienne version.

## Installer une seule fois sur OVH

Depuis `/var/www/gadpro-preprod/app`, vérifier que `git status --short` ne montre aucune modification à préserver. Récupérer la branche contenant ces fichiers (ou `main` après intégration), puis :

```bash
sudo bash deploy/prepare-preprod-releases.sh
curl --fail http://127.0.0.1:4100/api/health
```

Le répertoire `app` devient un lien vers une release initiale. Les chemins Nginx, service API et service de rappels restent identiques. Le `.env` est déplacé vers `shared/.env` avec le mode 600, et chaque release utilise un lien vers ce fichier. `shared` n'est pas servi par Nginx. Le service de sauvegarde ne change pas.

Créer une clé dédiée (ne pas écraser un fichier déjà existant) :

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/gadpro_actions -N '' -C gadpro-preprod-actions
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
printf 'restrict,command="/usr/local/sbin/gadpro-preprod-deploy" %s\n' "$(cat ~/.ssh/gadpro_actions.pub)" >> ~/.ssh/authorized_keys
```

Le script tourne en tant que `ubuntu` et utilise `sudo -n /usr/bin/systemctl restart gadpro-preprod.service`. Vérifier que cette commande exacte est autorisée sans mot de passe avant d'activer le workflow. Ne pas ajouter une règle sudo globale. Pour un compte sans cette permission, un administrateur doit autoriser uniquement la commande exacte avec `visudo`.

## Secrets GitHub

Dans le dépôt, Settings > Secrets and variables > Actions > New repository secret, ajouter :

| Secret | Valeur |
|---|---|
| PREPROD_SSH_HOST | IP publique du VPS (actuellement 192.99.43.204) |
| PREPROD_SSH_USER | ubuntu |
| PREPROD_SSH_KEY | Contenu de la clé privée dédiée |
| PREPROD_SSH_KNOWN_HOSTS | Ligne composée de l'IP, du type et de la clé publique d'hôte SSH |

Pour copier la clé privée vers le champ secret, consulter `~/.ssh/gadpro_actions` uniquement dans son propre terminal. Ne pas la partager dans un chat ou Git. Aucune variable SQL/SMTP/ERP du `.env` ne doit être copiée dans GitHub.

Pour obtenir la clé d'hôte depuis le VPS déjà authentifié :

```bash
sudo awk '{print "192.99.43.204 "$1" "$2}' /etc/ssh/ssh_host_ed25519_key.pub
```

Ne pas remplacer la validation de clé d'hôte par `StrictHostKeyChecking=no` ni par un scan non vérifié pendant le workflow.

## Activer

Après préparation d'OVH et ajout des secrets, intégrer les fichiers dans `main`. GitHub Actions lance les tests et le déploiement. `workflow_dispatch` permet également un lancement manuel depuis l'onglet Actions. Une seule exécution est autorisée à la fois; une exécution déjà commencée n'est pas annulée.

L'entrée SSH force la commande installée; le workflow doit envoyer `deploy <SHA>` et l'archive sur stdin. Ne pas utiliser cette clé avec `scp` ou un shell interactif : ils sont volontairement bloqués.

Vérifier le job, le health check HTTPS et la modification attendue dans l'interface. L'activation et les contrôles doivent être testés sur le VPS : la validation locale des scripts ne constitue pas une validation SSH réelle.

## Retour arrière manuel

Lister les releases sans supprimer les anciennes. Choisir explicitement une release connue et saine, remplacer atomiquement le lien `app`, puis redémarrer le service API. Les données ne sont pas restaurées par ce mécanisme.

Le rollback automatique traite une erreur du redémarrage ou du contrôle de la base centrale. Il ne détecte pas tous les problèmes fonctionnels ni les erreurs des autres bases; faire une recette des modules après un changement métier. Si le contrôle HTTPS final échoue, vérifier également Nginx, DNS et le réseau.

## Entretien

Les releases et sauvegardes ne sont pas supprimées automatiquement. Surveiller l'espace disque et définir ensuite une rétention. Une modification du script de déploiement dans Git ne met pas à jour automatiquement la commande root-owned : un administrateur doit la réinstaller après revue. Après le premier déploiement, la release active n'est plus un checkout Git; les mises à jour doivent passer par Actions.
