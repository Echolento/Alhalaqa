-- 028_add_push_subscriptions.sql
-- ============================================================================
-- Adds a push_subscriptions table for browser push notification storage.
-- Single-device: teacher can only have one active subscription at a time.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_profile
  ON public.push_subscriptions (profile_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscription" ON public.push_subscriptions
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

COMMIT;
