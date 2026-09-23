-- 031_add_students_frequency.sql
-- ============================================================================
-- Slice 4/8 (#31): per-student billing frequency.
-- Adds students.frequency with fixed presets weekly/biweekly/monthly,
-- defaults + backfills existing rows to monthly so existing
-- student_payments.month YYYY-MM-01 rows keep working as monthly cycles.
-- Mid-cycle edits take effect next cycle only (no proration): enforced in
-- app logic (updateStudentFrequency touches students row only, never
-- rewrites current-period student_payments rows).
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE IF EXISTS public.students
  DROP CONSTRAINT IF EXISTS students_frequency_check;

ALTER TABLE IF EXISTS public.students
  ADD CONSTRAINT students_frequency_check
  CHECK (frequency IN ('weekly', 'biweekly', 'monthly'));

UPDATE public.students
  SET frequency = 'monthly'
  WHERE frequency IS NULL OR frequency NOT IN ('weekly', 'biweekly', 'monthly');

CREATE INDEX IF NOT EXISTS idx_students_frequency
  ON public.students (frequency);

COMMIT;
