# GADIMAT

Plateforme interne réunissant Chèques, Impayés et Consommations avec une identité et des autorisations centrales.

## Développement local

```powershell
Copy-Item .env.local.example .env
npm install
npm run local:db
npm run local:seed
npm run dev
```

Frontend : `http://127.0.0.1:3000`. API : `http://127.0.0.1:4000/api/health`.

Le lancement local démarre aussi la base dédiée Logistique sur le port `5544`. Après création ou mise à niveau d'un volume existant, appliquer ses migrations avec `npm run migrate:logistics`.
Cette base est créée et administrée par PROGAD : le module Logistique ne suppose aucune base existante dans Open-Prod ou un autre ERP.

Connexion synthétique locale : `admin.local@gadimat.test` / `GadimatLocal!2026`. Le seed refuse de s’exécuter avec `NODE_ENV=production`.

## Vérifications

```powershell
npm run typecheck
npm run build
npm test
npm run verify:local-rbac
```

`verify:local-rbac` refuse toute URL de base non locale, crée temporairement des comptes et dossiers synthétiques, vérifie l’isolation des modules et nettoie ses données.

Arrêt de l’application : `npm run local:stop`. Arrêt des bases Docker : `npm run local:down`.

Voir [l’architecture](docs/ARCHITECTURE.md), la [migration](docs/MIGRATION.md), la [validation](docs/VALIDATION.md) et le [déploiement](docs/DEPLOYMENT.md). La migration des utilisateurs reste en dry-run sauf si les options explicites `--apply --confirm-user-migration` sont fournies.

Pour le domaine Logistique & GMAO, voir l’[architecture cible](docs/LOGISTIQUE_GMAO_ARCHITECTURE.md), la [phase 1A — parc](docs/LOGISTIQUE_GMAO_PHASE1A.md), la [phase 1B — maintenance et prestataires](docs/LOGISTIQUE_GMAO_PHASE1B.md) et la [phase 1C — préventif et pilotage](docs/LOGISTIQUE_GMAO_PHASE1C.md).
