# Logistique & GMAO — Phase 3F

## Résultat

La phase 3F complète la détection avancée des anomalies carburant dans la base PostgreSQL dédiée `gadimat_logistique`. Elle compare désormais chaque nouvelle consommation à un échantillon historique propre au véhicule ou à l’équipement, tout en conservant les seuils absolus existants.

Aucune base SQL ERP ou Open-Prod n’est interrogée.

## Règles de détection

Trois signaux indépendants peuvent être créés :

- `high_consumption` : dépassement du seuil absolu en L/100 km ou L/h ;
- `historical_deviation` : dépassement configurable de la moyenne historique de l’actif ;
- `unreasonable_quantity` : quantité supérieure au maximum métier facultatif.

La référence historique utilise uniquement les consommations antérieures avec un taux calculable et un statut `clear` ou `reviewed`. Les transactions déjà signalées ne contaminent donc pas la moyenne. Un minimum de trois relevés est obligatoire avant toute comparaison historique.

Les signaux servent à déclencher une revue humaine et ne constituent jamais une qualification automatique de fraude.

## Configuration

La migration `014_advanced_fuel_anomalies.sql` ajoute, pour chaque type de compteur :

- la taille de l’échantillon historique, entre 3 et 24 ;
- le nombre minimal de relevés requis ;
- les ratios d’alerte et critique par rapport à la moyenne ;
- une quantité maximale facultative en litres.

La quantité maximale est laissée à `NULL` par défaut. Elle doit être définie après validation des capacités de réservoir et des pratiques GADIMAT, afin d’éviter un seuil arbitraire.

L’écran Carburant affiche ces paramètres et permet leur modification aux utilisateurs disposant de `settings.admin`. Toute modification reste auditée.

## Couverture des flux

Les mêmes règles sont exécutées :

- lors d’une saisie carburant manuelle ;
- lors de la confirmation d’un import carburant guidé.

Le journal d’audit conserve le nombre de signaux produits, la configuration utilisée et le nombre de relevés historiques disponibles.

## Déploiement

1. sauvegarder ou créer la base dédiée `gadimat_logistique` ;
2. exécuter `npm run migrate:logistics` ;
3. redémarrer l’API et le frontend ;
4. valider les ratios et éventuelles quantités maximales avec les responsables métier ;
5. tester sur des consommations réelles anonymisées ;
6. examiner les faux positifs avant généralisation.

La migration 014 n’a pas été exécutée dans cet environnement faute d’instance PostgreSQL disponible.

## Validation technique

- 127 tests automatisés réussis dans 16 fichiers ;
- contrôle TypeScript réussi ;
- build de production réussi avec 3 619 modules transformés ;
- syntaxe Node.js validée ;
- aucune connexion, lecture ou écriture vers une base SQL ERP/Open-Prod.
