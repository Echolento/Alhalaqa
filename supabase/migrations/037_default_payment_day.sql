-- 037_default_payment_day.sql
-- ============================================================================
-- Welcome-level default payday: teachers.default_payment_day (1-31, nullable).
-- New students inherit it in addStudent; per-student payment_day edits still
-- win. No RLS changes (server-writes-only posture kept).
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS default_payment_day INTEGER CHECK (default_payment_day >= 1 AND default_payment_day <= 31);

COMMIT;
