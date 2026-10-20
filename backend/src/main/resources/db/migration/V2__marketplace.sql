-- PROFA V2.1 : champs marketplace (matières, niveaux, modes), favoris et index de performance.
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS subjects VARCHAR(500);
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS levels VARCHAR(500);
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS teaching_modes VARCHAR(100);
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS trial_lesson_free BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS favorites(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  teacher_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, teacher_user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_teacher ON reviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_parent ON bookings(parent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_parent ON course_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_teacher ON course_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_apps_teacher ON applications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_jobs_school ON job_offers(school_id);
CREATE INDEX IF NOT EXISTS idx_conversations_a ON conversations(user_a);
CREATE INDEX IF NOT EXISTS idx_conversations_b ON conversations(user_b);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(external_reference);
CREATE INDEX IF NOT EXISTS idx_documents_teacher ON teacher_documents(teacher_id);
