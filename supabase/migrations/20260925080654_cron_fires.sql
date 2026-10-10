-- 036_cron_fires.sql
-- ============================================================================
-- Timing engine idempotency: one row per (trigger, Cairo date, teacher).
-- Hourly CI ticks claim their fire with INSERT ... ON CONFLICT DO NOTHING;
-- a retry in the same day sees the row and skips (no double nags).
-- Service-role only: RLS enabled, intentionally NO policies (mirrors
-- claim_redeem_attempts H4). All access via createServiceClient in
-- app/api/cron/route.ts.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.cron_fires (
  trigger         TEXT NOT NULL,
  fire_date       DATE NOT NULL,
  teacher_id      UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trigger, fire_date, teacher_id)
);

ALTER TABLE public.cron_fires ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: service-role only.

COMMIT;
