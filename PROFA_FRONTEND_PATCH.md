# PROFA V2 - Frontend production fixes

Ces modifications corrigent :

1. Les appels API Angular vers `https://profa-backend.onrender.com` au lieu de l'URL du site statique.
2. La redirection ADMIN après connexion vers `/admin`.
3. Le tableau de bord ADMIN avec statistiques, enseignants en attente et documents.
4. Le lien Administration depuis le dashboard général.

## Render - règle obligatoire pour le refresh Angular

Dans `profa-frontend-v2` > Redirects/Rewrites, ajouter :

| Source | Destination | Action |
|---|---|---|
| `/*` | `/index.html` | Rewrite |

Cette règle est nécessaire pour les routes Angular comme `/connexion`, `/dashboard` et `/admin`.

## Déploiement

Le ZIP ne contient pas les secrets Render et ne remplace pas le bootstrap ADMIN déjà déployé. Copier le contenu de `frontend/` dans le projet actuel, puis :

```powershell
git add frontend
git commit -m "PROFA V2 - fix frontend API and admin dashboard"
git push origin main
```
