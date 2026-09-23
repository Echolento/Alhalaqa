-- 031_add_auto_reminders_toggle.sql — SUPERSEDED, DO NOT APPLY.
-- ============================================================================
-- This number collides with 031_add_students_frequency.sql (parallel crew,
-- slice 4/8). The canonical auto-reminder toggle migration is
-- 033_add_auto_reminders_toggle.sql. This file is intentionally a no-op so
-- migration runners that order by filename never apply the toggle twice.
-- ============================================================================

BEGIN;
SELECT 1;
COMMIT;
