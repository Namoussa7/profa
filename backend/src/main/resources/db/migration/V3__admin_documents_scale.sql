-- PROFA V2.2 : mot de passe oublié, documents PDF obligatoires, journal d'administration, montée en charge.

-- Sessions : un changement de mot de passe révoque les jetons émis avant.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS password_reset_tokens(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);

-- Documents : fichiers PDF stockés en base (table séparée pour ne pas charger les octets dans les listes).
ALTER TABLE teacher_documents ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE teacher_documents ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);
ALTER TABLE teacher_documents ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE teacher_documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS document_files(
  document_id UUID PRIMARY KEY,
  data BYTEA NOT NULL
);

-- Profil enseignant : complétude des pièces obligatoires et note dénormalisée (tri/recherche sans agrégation).
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS documents_complete BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS rating_avg DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

UPDATE teacher_profiles p SET
  rating_avg = COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.teacher_id = p.user_id), 0),
  review_count = (SELECT COUNT(*) FROM reviews r WHERE r.teacher_id = p.user_id);

-- Seuls les PDF téléversés comptent : les anciens documents par lien doivent être renvoyés en PDF.
UPDATE teacher_profiles SET documents_complete = FALSE;

-- Journal des actions d'administration.
CREATE TABLE IF NOT EXISTS admin_audit_logs(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40),
  target_id UUID,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at DESC);

-- Index de montée en charge.
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_teachers_public ON teacher_profiles(documents_complete, verified, rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_teachers_rate ON teacher_profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_start ON bookings(teacher_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON job_offers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status ON teacher_documents(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
