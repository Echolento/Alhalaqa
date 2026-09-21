-- 029_drop_open_teachers_select.sql
--
-- Remove the overly broad teachers SELECT policy that let ANY authenticated
-- user read EVERY teacher row (qual was just auth.role() = 'authenticated').
--
-- Remaining readers (all intended):
--   - "Teacher can read own row"      (profile_id = auth.uid())
--   - "Teachers viewable by organization members" (same organization_id)
--   - "Admins can manage teachers"    (profiles.role = 'admin')
--
-- Verified dependents before dropping:
--   - app/api/cron/route.ts            → service-role client, bypasses RLS
--   - app/auth/callback/route.ts       → own row only
--   - app/dashboard/settings, /welcome → own row only
--   - app/api/teachers/[id]/display    → no in-app callers; after this change
--     it resolves own-row lookups and 404s otherwise (secure default).

BEGIN;

DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;

COMMIT;
