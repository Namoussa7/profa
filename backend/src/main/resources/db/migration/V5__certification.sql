-- PROFA V2.4 : parcours de certification des enseignants.

-- Banque de questions (QCM) par matière et niveau.
CREATE TABLE IF NOT EXISTS quiz_questions(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(150) NOT NULL,
  level VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  choices TEXT NOT NULL,          -- réponses séparées par un saut de ligne
  correct_index INTEGER NOT NULL, -- 0 = première réponse
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_bank ON quiz_questions(subject, level, active);

-- Tentatives (questions tirées au hasard, chronométrées).
CREATE TABLE IF NOT EXISTS quiz_attempts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  subject VARCHAR(150) NOT NULL,
  level VARCHAR(100) NOT NULL,
  question_ids TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  passed BOOLEAN
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_teacher ON quiz_attempts(teacher_id, subject, level, started_at DESC);

-- Matières certifiées (test réussi).
CREATE TABLE IF NOT EXISTS teacher_certifications(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  subject VARCHAR(150) NOT NULL,
  level VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  passed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, subject, level)
);

-- Badges et statut de l'enseignant.
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS certified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS certification_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS home_safe BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS video_status VARCHAR(20) NOT NULL DEFAULT 'NONE';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS video_rejection_reason TEXT;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
UPDATE teacher_profiles SET video_status = 'PENDING' WHERE intro_video_url IS NOT NULL AND intro_video_url <> '';
UPDATE teacher_profiles p SET home_safe = TRUE WHERE EXISTS (
  SELECT 1 FROM teacher_documents d WHERE d.teacher_id = p.user_id AND d.type = 'CRIMINAL_RECORD' AND d.status = 'APPROVED' AND d.size_bytes > 0);

-- Signalements des parents / écoles.
CREATE TABLE IF NOT EXISTS teacher_reports(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  reason VARCHAR(60) NOT NULL,
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON teacher_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_teacher ON teacher_reports(teacher_id);

-- Règles de certification (modifiables par l'admin).
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS quiz_question_count INTEGER NOT NULL DEFAULT 20;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS quiz_duration_minutes INTEGER NOT NULL DEFAULT 30;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS quiz_pass_score INTEGER NOT NULL DEFAULT 70;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS quiz_max_attempts INTEGER NOT NULL DEFAULT 2;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS quiz_cooldown_days INTEGER NOT NULL DEFAULT 30;
-- Désactivé tant que la banque de questions n'est pas remplie.
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS require_certification BOOLEAN NOT NULL DEFAULT FALSE;
-- Activé : casier judiciaire approuvé obligatoire pour les cours à domicile.
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS require_record_for_home BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS suspend_threshold DOUBLE PRECISION NOT NULL DEFAULT 3.5;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS suspend_min_reviews INTEGER NOT NULL DEFAULT 5;
