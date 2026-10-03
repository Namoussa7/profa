# PROFA V2 — plateforme éducative B2C + B2B

Projet Angular 20 + Spring Boot 3.5 + Java 21 + PostgreSQL 17.

## Modules inclus
- Comptes Parent/Étudiant, Enseignant, École, Admin
- JWT + rôles + BCrypt
- Profils enseignants et écoles
- Recherche enseignants
- Demandes de cours et réservations
- Avis 1–5
- Offres d'emploi + candidatures ATS
- Messagerie REST + WebSocket/STOMP
- Notifications
- Documents et workflow de vérification
- Abstraction paiements + webhook
- Administration et validation
- PWA-ready / mobile-first
- Docker Compose PostgreSQL + backend + frontend + Nginx

## Lancement
1. Copier `.env.example` vers `.env`.
2. Définir un `JWT_SECRET` long et aléatoire ainsi qu'un mot de passe PostgreSQL fort.
3. `docker compose up -d --build`
4. Ouvrir `http://localhost`.

## Important
Le socle applicatif est déployable, mais les connecteurs de paiement réels, stockage S3, SMS/WhatsApp/email transactionnel et certificats HTTPS doivent être branchés avec les identifiants du client et les contrats/API des fournisseurs choisis.
