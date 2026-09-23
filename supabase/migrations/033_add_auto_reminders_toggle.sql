-- 033_add_auto_reminders_toggle.sql
-- ============================================================================
-- #29 slice 1/8: per-teacher auto-reminder toggle (default on).
-- Cron honours it; manual Remind bypasses it (see lib/push-payloads.ts).
-- Writes flow through service-role server actions with ownership checks
-- (lib/push-actions.ts); no anon-key write policy is added here (#25).
-- Numbered 033 to follow 031 (frequency) + 032 (instapay) from parallel crews.
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS auto_reminders_enabled BOOLEAN NOT NULL DEFAULT true;

COMMIT;
