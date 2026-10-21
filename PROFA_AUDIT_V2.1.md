# PROFA V2.1 — Benchmark, audit et corrections

## 1. Plateformes de référence

| Plateforme | Pays / cible | Ce qu'elle fait le mieux | Repris dans Profa |
|---|---|---|---|
| **Preply** | Mondial, cours en ligne | Recherche à filtres riches, profil avec vidéo, 1er cours d'essai, messagerie avant réservation | Filtres, vidéo, « 1er cours offert », messagerie |
| **Superprof** | France, 50+ pays | Barre de recherche « matière + ville », profils à domicile, avis | Recherche hero matière + ville, cours à domicile, avis |
| **Wyzant** | États-Unis | Avis vérifiés liés à un cours réel, tarif horaire, réservation | Avis seulement après cours TERMINÉ, prix calculé par le serveur |
| **italki / Cambly** | Langues | Agenda et créneaux, statut de cours | Créneaux + détection de chevauchement |
| **Acadomia / Kelprof** | France | Accompagnement scolaire par niveau | Niveaux du système malien (Fondamental 1/2, Lycée, Université) |
| **TES / Teachaway / SchoolSpring** | Recrutement enseignants | Offres + ATS (pipeline de candidatures) | Offres filtrables, pipeline NEW → HIRED, notifications |
| **Acteurs locaux (répétiteurs à Dakar, Bamako)** | Afrique de l'Ouest | WhatsApp, espèces, Mobile Money | Téléphone/WhatsApp, Orange Money, Moov, Wave, espèces |

Interface retenue : **un modèle hybride Preply + Superprof** (recherche matière/ville en accueil, cartes avec note et tarif, fiche détaillée avec panneau de réservation collant) et **un ATS de type TES** pour les écoles.

## 2. Lacunes trouvées et corrigées

### Sécurité (critique)
| Lacune | Correction |
|---|---|
| `/admin/users` renvoyait les **hachages de mots de passe** | `@JsonIgnore` sur `passwordHash` |
| N'importe quel utilisateur connecté voyait **toutes** les réservations, demandes, conversations et messages (IDOR) | Chaque liste est filtrée sur l'utilisateur ; contrôle de participation partout |
| N'importe qui pouvait changer le statut d'une réservation, d'une demande, d'une candidature ou d'une notification | Règles par rôle : enseignant / parent / école propriétaire / admin |
| Montant du paiement fourni par le client | Montant calculé côté serveur depuis la réservation et le tarif horaire |
| Webhook paiement sans vérification (et inaccessible) | Public mais protégé par `X-Webhook-Secret` (comparaison à temps constant), met à jour paiement + réservation |
| WebSocket : origines `*`, aucune authentification, expéditeur choisi par le client | JWT exigé au CONNECT STOMP, abonnements limités aux participants, expéditeur = utilisateur authentifié |
| Login d'un e-mail inconnu → erreur 500 ; comptes bloqués pouvaient se connecter | 401 avec message neutre ; 403 pour compte désactivé |
| Avis libres (faux avis possibles, note hors bornes → 500) | Avis uniquement par le parent d'un cours TERMINÉ, une fois par cours |
| Erreurs 500 génériques | `ApiExceptionHandler` : messages JSON 400/404/409 en français |
| 403 au lieu de 401 sur jeton expiré | 401 + redirection automatique vers la connexion côté Angular |

### Fonctionnalités manquantes
- Recherche publique (sans connexion) : matière, niveau, ville/quartier, mode (domicile/en ligne/chez l'enseignant), tarif min/max, vérifiés, 1er cours offert, tri (pertinence, note, prix, expérience). Les filtres sont dans l'URL (partageables).
- Fiche enseignant publique : note moyenne, avis, matières, niveaux, modes, disponibilités, vidéo ; l'adresse exacte et le salaire souhaité ne sont pas exposés.
- Réservation de créneau (prix auto, refus des chevauchements), demande de cours, favoris.
- Paiement : Orange Money, Moov Money, Wave, carte, espèces (référence `PRF-…`).
- Messagerie 1-à-1 complète (liste, non lus, accusé « Lu »), notifications (cloche + page) générées sur chaque événement.
- Espace par rôle : parent (cours, paiement, avis, demandes, favoris), enseignant (demandes, confirmation/fin de cours, documents, candidatures, taux de complétion réel), école (offres, ouverture/fermeture, pipeline candidats, contact).
- Profil enseignant éditable (matières/niveaux/modes en puces, tarif, vidéo, photo…) et fiche école.
- Emplois : filtres, détail, candidature avec lettre, publication d'offre par les écoles.
- Admin : motif de refus des documents, onglet réservations, validation enseignant → notification + badge.

### Interface / technique
- Gardes de routes (connecté, rôle, invité), `<base href="/">` (rafraîchissement sur `/enseignants/:id`), titres de page, meta description, dates en français, accessibilité (lien d'évitement, focus visible, rôles ARIA), squelettes de chargement, états vides.
- URL d'API selon l'environnement (Render, Docker/Nginx, `ng serve`) au lieu d'une URL codée en dur.
- `logout()` ne vide plus tout le `localStorage`, seulement les clés Profa.
- Migration `V2__marketplace.sql` (colonnes `subjects`, `levels`, `teaching_modes`, `trial_lesson_free`, table `favorites`, index).
- Copie du frontend à la racine resynchronisée avec `frontend/` (elles avaient divergé).

## 3. Déploiement
1. Render backend : ajouter `PAYMENT_WEBHOOK_SECRET` (et garder `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`). Flyway applique V2 au démarrage.
2. Render frontend : règle Rewrite `/* → /index.html` (déjà documentée).
3. Recommandé : n'utiliser qu'un seul dossier frontend (`frontend/`, Root Directory = `frontend`) puis supprimer la copie racine.

## 4. Ce qui reste à brancher (hors code)
- API réelle d'un agrégateur de paiement (CinetPay, PayDunya, Orange Money API…) : adapter `PaymentController.webhook` au format exact du fournisseur.
- Stockage de fichiers (S3/Cloudinary) pour l'envoi direct des documents et photos (aujourd'hui : lien URL).
- E-mail / SMS / WhatsApp transactionnels, réinitialisation du mot de passe, vérification de l'e-mail.
- Visioconférence intégrée (aujourd'hui : champ `meetingUrl`).
- Un compte bloqué conserve l'accès jusqu'à l'expiration de son jeton (1 h) : ajouter une vérification en base dans `JwtFilter` si nécessaire.

## 5. Refonte visuelle (v3)
- Palette : bleu royal `#2547e0` (confiance), marine `#0b1638` (sérieux), ambre `#ffa630` (actions principales), états vert/rouge/ambre.
- Typographie unique Plus Jakarta Sans, échelle de titres resserrée, ombres et rayons cohérents (tokens CSS dans `styles.css`).
- Icônes vectorielles (`core/icon.component.ts`) à la place des émojis.
- Accueil : bandeau marine avec recherche, barre d'avantages, tuiles de matières, enseignants à la une.
- Pages, tableau de bord, profil, messagerie, emplois et admin harmonisés ; navigation mobile en bas d'écran.
- Logo Profa (`core/logo.component.ts`, `src/favicon.svg`) : toque de diplômé au-dessus d'un « P » dont la boucle est une bulle de dialogue, pompon ambré. Utilisé dans l'en-tête, le pied de page, la connexion/inscription, l'onglet du navigateur et l'icône de l'application (PWA).
- Profil école : le logo de l'établissement s'affiche dans la carte de profil (aperçu immédiat).

## 6. Version 2.2 — administration, documents obligatoires, montée en charge

### Administration
- Comptes : recherche paginée (nom, e-mail, téléphone), filtres rôle/statut, création de compte (y compris administrateur), modification, changement de rôle, vérification, blocage, **suppression définitive** (avec confirmation « SUPPRIMER »), lien de réinitialisation à transmettre par WhatsApp/SMS.
- Protections : impossible de se bloquer/supprimer soi-même ou de retirer le dernier administrateur.
- Enseignants (filtre « dossier incomplet »), documents (ouverture du PDF, approbation, refus avec motif), offres (fermer/supprimer), réservations, paiements, **modération des avis**, **journal d'audit** de toutes les actions.

### Mot de passe
- « Mot de passe oublié » : lien à usage unique valable 60 min (seule l'empreinte SHA-256 est stockée), réponse identique que l'e-mail existe ou non.
- Changement de mot de passe depuis le profil, suppression de son propre compte.
- Toute modification du mot de passe, blocage, suppression ou changement de rôle **ferme immédiatement les sessions** existantes.
- Mots de passe : 8 caractères minimum, au moins une lettre et un chiffre. Limitation à 10 tentatives/minute/IP sur l'authentification.
- E-mails via SMTP (variables `MAIL_*`, ex. Brevo) ; sans SMTP, l'admin génère le lien.

### Documents obligatoires
- Chaque enseignant doit envoyer son **CV** et son **diplôme** en **PDF** (contrôle du contenu réel, 5 Mo max). Sans eux : profil invisible dans la recherche, impossible d'accepter une demande, d'être réservé ou de postuler.
- Quand les deux sont approuvés, le badge « Vérifié » est attribué automatiquement.
- Les écoles peuvent ouvrir le CV des candidats à leurs offres.
- Les anciens documents « par lien » ne comptent plus : les enseignants existants doivent renvoyer leurs PDF.

### Montée en charge et réactivité
- Recherche enseignants exécutée en SQL avec pagination (12 par page, « Afficher plus »), note dénormalisée, index dédiés (migration V3).
- Statistiques admin par requêtes `COUNT`, listes admin paginées, compression gzip, cache HTTP 30 s sur la recherche publique, pool de connexions configuré, envoi d'e-mails asynchrone.
- Frontend : pages chargées à la demande puis préchargées, build de production avec empreintes de fichiers (cache navigateur), recherche pendant la frappe, polices préchargées, bandeau « démarrage du serveur » pendant le réveil de l'instance gratuite.
- Limite principale restante : l'instance **gratuite** de Render (mise en veille, 512 Mo). Pour un très grand nombre d'utilisateurs : instance payante (≥ Standard) + plusieurs instances, PostgreSQL payant, et déplacement des PDF vers un stockage objet (S3/R2) si le volume devient important.
