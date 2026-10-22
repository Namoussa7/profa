-- PROFA V2.3 : rémunération de la plateforme (commission sur les cours, abonnements écoles, versements enseignants).

-- Réglages modifiables par l'administrateur (une seule ligne, id = 1).
-- La monétisation est désactivée par défaut : phase de lancement gratuite.
CREATE TABLE IF NOT EXISTS platform_settings(
  id INTEGER PRIMARY KEY,
  monetization_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  commission_rate INTEGER NOT NULL DEFAULT 15,
  loyalty_rate INTEGER NOT NULL DEFAULT 10,
  loyalty_hours INTEGER NOT NULL DEFAULT 100,
  standard_price INTEGER NOT NULL DEFAULT 25000,
  premium_price INTEGER NOT NULL DEFAULT 50000,
  free_offer_limit INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO platform_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Part de la plateforme et part de l'enseignant sur chaque paiement confirmé.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS teacher_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS commission_rate INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS commission_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS teacher_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payout_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_payments_teacher ON payments(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_payout ON payments(payout_id);

-- Abonnements des écoles (30 jours, activés par l'administrateur à réception du paiement).
CREATE TABLE IF NOT EXISTS school_subscriptions(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  plan VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  amount INTEGER NOT NULL,
  reference VARCHAR(40) NOT NULL UNIQUE,
  method VARCHAR(40),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_school ON school_subscriptions(school_id, status, ends_at);

-- Versements aux enseignants (regroupent des paiements confirmés).
CREATE TABLE IF NOT EXISTS payouts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  method VARCHAR(40),
  reference VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'PAID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payouts_teacher ON payouts(teacher_id, created_at DESC);
