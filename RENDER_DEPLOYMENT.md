# PROFA Frontend — Déploiement Render

## Configuration du Static Site Render

Ce frontend est une SPA Angular avec navigation côté client. Pour éviter `Not Found` lors d'un rafraîchissement sur `/connexion`, `/dashboard` ou `/admin`, le Static Site Render doit avoir cette règle de Rewrite :

- Source: `/*`
- Destination: `/index.html`
- Action: `Rewrite`

Render documente cette configuration pour les applications utilisant le routage côté client.

## Configuration recommandée

- Branch: `main`
- Root Directory: `.` (si le dépôt contient directement le frontend)
- Build Command: `npm install && npm run build`
- Publish Directory: `dist/profa/browser`

Si votre dépôt conserve `profa/frontend` à sa racine, adaptez Root Directory et Publish Directory en conséquence.

## Après chaque push

Render peut redéployer automatiquement le Static Site à chaque push sur la branche configurée.

## Vérification

Après le déploiement, tester dans cet ordre :

1. `/`
2. `/connexion`
3. connexion avec un compte existant
4. `/dashboard`
5. actualiser avec F5 sur `/dashboard`
6. `/admin` avec un compte ADMIN
7. actualiser avec F5 sur `/admin`

## Authentification

Le frontend conserve le token dans `localStorage` sous `profa_token` et ajoute automatiquement :

`Authorization: Bearer <token>`

aux appels HTTP.

Le backend doit également autoriser le domaine Render du frontend via CORS.
