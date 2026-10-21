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

Pour le domaine Logistique & GMAO, voir l’[architecture cible](docs/LOGISTIQUE_GMAO_ARCHITECTURE.md), la [phase 1A — parc](docs/LOGISTIQUE_GMAO_PHASE1A.md), la [phase 1B — maintenance et prestataires](docs/LOGISTIQUE_GMAO_PHASE1B.md), la [phase 1C — préventif et pilotage](docs/LOGISTIQUE_GMAO_PHASE1C.md), la [phase 2A — carburant et pneumatiques](docs/LOGISTIQUE_GMAO_PHASE2A.md) et la [phase 2B — pièces et stock](docs/LOGISTIQUE_GMAO_PHASE2B.md).
Documentation complémentaire : [phase 2C — achats et facturation](docs/LOGISTIQUE_GMAO_PHASE2C.md).
Voir également la [phase 2D — documents et notifications](docs/LOGISTIQUE_GMAO_PHASE2D.md).
La [phase 3A — automatisation et analytique](docs/LOGISTIQUE_GMAO_PHASE3A.md) documente les jobs idempotents, les coûts suivis, la disponibilité et la performance prestataire.
La [phase 3B — imports guidés](docs/LOGISTIQUE_GMAO_PHASE3B.md) couvre les aperçus CSV/XLSX, le mapping, les doublons et la confirmation auditée.
La [phase 3C — rapports et seuils carburant](docs/LOGISTIQUE_GMAO_PHASE3C.md) décrit les exports Excel/PDF et la configuration des anomalies.
La [phase 3D — paramètres, audit et alertes étendues](docs/LOGISTIQUE_GMAO_PHASE3D.md) remplace les écrans provisoires d’administration et complète le traitement quotidien.
La [phase 3E — imports complémentaires](docs/LOGISTIQUE_GMAO_PHASE3E.md) ajoute les conducteurs, prestataires et historiques de maintenance au parcours CSV/XLSX guidé.
La [phase 3F — anomalies carburant avancées](docs/LOGISTIQUE_GMAO_PHASE3F.md) ajoute la référence historique et les quantités maximales configurables.
