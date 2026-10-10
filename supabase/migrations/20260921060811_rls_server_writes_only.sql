-- 030_rls_server_writes_only.sql
-- ============================================================================
-- #25 RLS redo: server-writes only, read-own policies.
--
-- *** HUMAN GATE: review this diff before applying to prod. NOT applied yet. ***
--
-- What it does:
--   1. Creates activity_log (migration 026 never reached prod) with
--      append-only policies: INSERT own + SELECT own, deliberately NO
--      UPDATE/DELETE policies.
--   2. Drops every anon-key WRITE policy on profiles / teachers / students /
--      student_payments / push_subscriptions. All writes now flow through
--      service-role server actions with explicit owner checks (see
--      lib/ownership.ts + lib/*-actions.ts on branch feat/rls-redo).
--   3. Keeps read-own SELECT policies untouched (client reads unchanged).
--
-- Deliberate judgment calls (flagged for owner review):
--   F1. Admin write policies dropped ("admins_manage_profiles",
--       "Admins can manage students", "Admins can manage all payments",
--       "Admins can manage teachers"). No admin UI exists; any future admin
--       tooling must go through service-role actions like everything else.
--   F2. Admin READ policies dropped ("Admins can view all students").
--       Same reason as F1.
--   F3. Organization-member SELECTs kept ("Teachers viewable by organization
--       members", org clause in profiles_select_policy). Dormant feature,
--       no cross-table function calls, harmless while unused.
--   F4. profiles_select_policy kept as-is (own/org/admin SELECT, no
--       function calls since 024).
--   F5. push_subscriptions reduced to SELECT-own; writes via service.
--       getPushSubscription() is currently dead code; policy kept for safety.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. activity_log (missing in prod) + append-only policies
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id    ON public.activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action     ON public.activity_log (action_type);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity log"   ON public.activity_log;
DROP POLICY IF EXISTS "Users can insert own activity log" ON public.activity_log;

CREATE POLICY "Users can view own activity log" ON public.activity_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity log" ON public.activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Intentionally NO update/delete policies: append-only by construction.
-- Cleanup, if ever needed, via service_role or manual SQL.

-- --------------------------------------------------------------------------
-- 2. profiles: drop anon writes (trigger + service handle creation/updates)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_manage_profiles"       ON public.profiles;
-- KEPT: profiles_select_policy (read-own/org/admin SELECT, no functions).

-- --------------------------------------------------------------------------
-- 3. teachers: drop anon writes
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers can create own record" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update own record" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage teachers"     ON public.teachers;
-- KEPT: "Teacher can read own row", "Teachers viewable by organization
-- members" (see F3).

-- --------------------------------------------------------------------------
-- 4. students: drop anon writes + admin reads (F1/F2)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers can insert students" ON public.students;
DROP POLICY IF EXISTS "Teachers can update their students" ON public.students;
DROP POLICY IF EXISTS "Teachers can delete their students" ON public.students;
DROP POLICY IF EXISTS "Admins can manage students"   ON public.students;
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
-- KEPT: "Teachers can view their own students" (read-own SELECT).

-- --------------------------------------------------------------------------
-- 5. student_payments: drop anon writes + admin (F1/F2)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers can insert payments for their students" ON public.student_payments;
DROP POLICY IF EXISTS "Teachers can update their students payments"     ON public.student_payments;
DROP POLICY IF EXISTS "Teachers can delete student payments"            ON public.student_payments;
DROP POLICY IF EXISTS "Admins can manage all payments"                  ON public.student_payments;
-- KEPT: "Teachers can view their students payments" (read-own SELECT).

-- --------------------------------------------------------------------------
-- 6. push_subscriptions: reduce to read-own
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own push subscription" ON public.push_subscriptions;

CREATE POLICY "Users can view own push subscription" ON public.push_subscriptions
  FOR SELECT USING (profile_id = auth.uid());

COMMIT;
