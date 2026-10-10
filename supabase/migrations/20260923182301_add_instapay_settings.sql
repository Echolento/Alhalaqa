-- 032_add_instapay_settings.sql
-- ============================================================================
-- Slice 3 (#30): per-teacher InstaPay settings.
-- Adds teachers.instapay_link + teachers.instapay_handle (both nullable TEXT).
-- Validation is application-side in lib/instapay.ts (exact host ipn.eg,
-- /S/... path, name@instapay handle, anti-phishing + injection rejection).
-- RLS UNCHANGED: server-writes-only posture kept (#25 / 030). All writes go
-- through service-role server actions with ownership checks (profile_id);
-- no new policies, no anon writes.
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS instapay_link TEXT,
  ADD COLUMN IF NOT EXISTS instapay_handle TEXT;

COMMIT;
