-- 035_claim_tokens.sql
-- ============================================================================
-- #36 slice 8/8: payer invite / claim identity (last slice of PRD #28).
-- Creates public.claim_tokens (bearer invite secrets) + public
-- .claim_redeem_attempts (DB-backed rate-limit counters) and adds
-- public.students.claimed_by (payer profile ref, nullable).
--
-- *** HUMAN GATE: review this diff before applying to prod. NOT applied yet. ***
--
-- SECURITY POSTURE (server-writes-only, mirrors #25 / 030 / 034):
--   H1. token_hash stores sha256(raw) ONLY — the raw 256-bit bearer is never
--       persisted. Lookup is by hash equality; no plaintext anywhere.
--   H2. NO anon-key INSERT/UPDATE/DELETE policies on either new table: every
--       write flows through service-role server actions with explicit
--       ownership checks (lib/claim-actions.ts + lib/ownership.ts).
--   H3. Read-own SELECT for teachers on claim_tokens (own students only).
--       Payers get NO SELECT on claim_tokens: the bearer secret table is
--       invisible to anon/authenticated reads; the claim screen resolves the
--       token -> names preview through a service-role action only.
--   H4. claim_redeem_attempts has NO read/write policies at all: service-role
--       only. Keys are sha256(IP or profile) hashes, never raw IPs.
--   H5. students.claimed_by is a nullable FK to auth.users (SET NULL on user
--       delete). No new RLS policy on students: the existing read-own SELECT
--       ("Teachers can view their own students") keeps covering reads, and
--       writes stay service-role-only per 030. Payers cannot list students.
-- Single-use + expiry are enforced in the redeemer (lib/claim-tokens.ts pure
-- gate + lib/claim-actions.ts service writes: used_at set on redeem,
-- expires_at = created + 7 days, revoked_at set on regenerate).
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. claim_tokens table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_tokens (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id          UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  -- sha256 hex (64 chars) of the raw bearer. UNIQUE so each secret maps to
  -- exactly one row; wrong-row guesses can never collide (H1).
  token_hash          TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  expires_at          TIMESTAMPTZ NOT NULL,
  used_at             TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  used_by_profile_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_tokens_student
  ON public.claim_tokens (student_id);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_teacher
  ON public.claim_tokens (teacher_id);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_expires
  ON public.claim_tokens (expires_at);
-- token_hash UNIQUE already creates a btree index; the explicit name below
-- is intentionally skipped to avoid a duplicate index.

ALTER TABLE public.claim_tokens ENABLE ROW LEVEL SECURITY;

-- Teacher read-own only (H3). No INSERT/UPDATE/DELETE policies (H2).
DROP POLICY IF EXISTS "Teachers can view own students claim tokens"
  ON public.claim_tokens;
CREATE POLICY "Teachers can view own students claim tokens"
  ON public.claim_tokens
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

-- --------------------------------------------------------------------------
-- 2. claim_redeem_attempts table (rate-limit counters, H4)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_redeem_attempts (
  key               TEXT PRIMARY KEY,
  attempts          INTEGER NOT NULL DEFAULT 1 CHECK (attempts >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.claim_redeem_attempts ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: service-role only (H4). Anon/authenticated
-- roles cannot read or write counters.

-- --------------------------------------------------------------------------
-- 3. students.claimed_by (payer identity link, H5)
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_claimed_by
  ON public.students (claimed_by);

COMMIT;
