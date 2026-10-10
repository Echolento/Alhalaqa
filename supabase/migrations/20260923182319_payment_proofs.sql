-- 034_payment_proofs.sql
-- ============================================================================
-- #33 slice 5/8: payer receipt proofs + private storage.
-- Creates public.payment_proofs (student, period key via getPeriodKey,
-- storage path, status pending/verified/rejected, teacher note, timestamps).
-- Creates private storage bucket `payment-proofs` (image-only, 5MB cap).
-- RLS UNCHANGED posture: server-writes-only (#25 / 030). All writes go
-- through service-role server actions with explicit ownership checks
-- (lib/payment-proofs.ts); read-own SELECT policies only, no anon writes.
-- No OCR in V1. Verdict (verify/reject) actions land in a later slice.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. payment_proofs table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id        UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  payer_profile_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key        TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'verified', 'rejected')),
  teacher_note      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_student_period
  ON public.payment_proofs (student_id, period_key);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_teacher_status
  ON public.payment_proofs (teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_payer
  ON public.payment_proofs (payer_profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_created
  ON public.payment_proofs (created_at DESC);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Read-own only: teacher sees proofs for their own students ...
DROP POLICY IF EXISTS "Teachers can view own students proofs"
  ON public.payment_proofs;
CREATE POLICY "Teachers can view own students proofs"
  ON public.payment_proofs
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

-- ... payer sees only their own uploads. No INSERT/UPDATE/DELETE policies:
-- writes flow through service-role server actions (lib/payment-proofs.ts).
DROP POLICY IF EXISTS "Payers can view own proofs"
  ON public.payment_proofs;
CREATE POLICY "Payers can view own proofs"
  ON public.payment_proofs
  FOR SELECT USING (payer_profile_id = auth.uid());

-- --------------------------------------------------------------------------
-- 2. Private storage bucket `payment-proofs` (image-only, 5MB cap)
-- --------------------------------------------------------------------------
-- Bucket config via SQL. If `file_size_limit` / `allowed_mime_types` columns
-- are missing on the target (older self-hosted), apply the same values as a
-- manual dashboard step: bucket `payment-proofs`, Private, 5MB limit,
-- allowed types image/jpeg image/png image/webp image/heic image/heif.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

-- Intentionally NO storage.objects policies for this bucket: private by
-- default, accessed only via the service-role client. Application-side
-- validation (lib/payment-proofs.ts) mirrors the bucket allowlist so
-- non-images and oversize files are rejected before upload.

COMMIT;
