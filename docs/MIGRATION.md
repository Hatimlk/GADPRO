# Migration des utilisateurs

1. Créer une base centrale vide et appliquer `npm run migrate:central -w @gadimat/api`.
2. Utiliser des copies isolées des deux bases historiques.
3. Lancer le dry-run : `npm run migrate:users -w @gadimat/api -- --dry-run > migration-report.json`.
4. Résoudre chaque conflit signalé. Aucun hash, mot de passe ou secret n'est inclus dans le rapport. Une même adresse avec des hashes ou statuts différents est ignorée jusqu'à résolution ou réinitialisation contrôlée.
5. Exécuter sur la base centrale de préproduction : `npm run migrate:users -w @gadimat/api -- --apply --confirm-user-migration`.
6. Comparer les inventaires, correspondances et rôles. Tester les affectations avec des comptes synthétiques.

Le script accepte les variantes bcrypt `$2a$`, `$2b$` et `$2y$`; les deux applications utilisent `bcryptjs 2.4.3`, ce qui permet de vérifier ces empreintes sans connaître les mots de passe. L'empreinte d'inventaire empêche une réexécution identique.

## Retour arrière

Avant toute écriture, sauvegarder les trois bases. Pour annuler un lot avant bascule, démarrer une transaction, relever son `migrationRunId`, supprimer les `module_access` des utilisateurs liés uniquement à ce lot, puis les lignes `legacy_identities` portant ce `migration_run_id`; supprimer enfin les identités centrales sans correspondance ni session. Restaurer le dump central si le lot a déjà été utilisé. Les bases métier ne sont jamais modifiées par le script.
