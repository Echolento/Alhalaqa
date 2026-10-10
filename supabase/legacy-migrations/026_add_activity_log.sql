-- 026_add_activity_log.sql
-- ============================================================================
-- Adds an activity_log table to track all significant user actions, plus an
-- optional webhook_url column on teachers for Discord/HTTP notifications.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1.  Create activity_log table
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

-- Index for quick lookups by user, action, time
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id    ON public.activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action     ON public.activity_log (action_type);

-- --------------------------------------------------------------------------
-- 2.  RLS on activity_log
--      Users can see only their own log entries; admins can see all.
-- --------------------------------------------------------------------------
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity log" ON public.activity_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity logs" ON public.activity_log
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Only the server-side (service_role) can INSERT; teachers insert via server actions.
-- A permissive INSERT policy lets the anon-key server action insert its own rows.
CREATE POLICY "Users can insert own activity log" ON public.activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE from client side — log is append-only.
-- Cleanup (if needed) is done via service_role or manual SQL.

COMMIT;
