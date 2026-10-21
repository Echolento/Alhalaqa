-- 20261020120000_teacher_join_codes.sql
-- ============================================================================
-- Teacher join codes: replaces the phone-only payer claim (self-asserted
-- phone could be used to take over a family).
--
-- FLOW: parent enters phone → email magic-link (session) → teacher code →
-- server links every UNCLAIMED student under THAT teacher whose phone matches.
-- The code is the teacher's vouch; the phone scopes it to one roster.
--
-- SECURITY POSTURE:
--   C1. teacher_join_codes is service-role only: RLS enabled with NO policies.
--       The code must NOT be a column on teachers (that table is readable by
--       other organization members).
--   C2. claim_by_join_code is SECURITY DEFINER with a pinned search_path and
--       is revoked from public/anon/authenticated; only service_role executes.
--   C3. The code lookup + UPDATE happen in ONE statement, so a rotation cannot
--       interleave between "code valid?" and "link", and concurrent claims for
--       the same phone cannot both win (the UPDATE is row-locked and filters
--       claimed_by IS NULL).
--   C4. Idempotent retry: rows already owned by the caller are matched again
--       (`claimed_by = p_profile_id`), so a flaky response never strands a
--       parent who actually linked.
--   C5. No expiry. The teacher rotates on demand; rotation touches only this
--       table, so existing claims and invite links keep working.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_join_codes (
  teacher_id  UUID PRIMARY KEY REFERENCES public.teachers(id) ON DELETE CASCADE,
  -- Stored raw (service-only table). 8 unambiguous chars, no I/O/0/1.
  code        TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at  TIMESTAMPTZ
);

ALTER TABLE public.teacher_join_codes ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: service-role only (C1).

CREATE OR REPLACE FUNCTION public.claim_by_join_code(
  p_code       TEXT,
  p_phone      TEXT,
  p_profile_id UUID
)
RETURNS TABLE (id UUID, name TEXT, teacher_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'join_code_invalid' USING ERRCODE = 'P0001';
  END IF;

  SELECT tjc.teacher_id INTO v_teacher_id
    FROM public.teacher_join_codes tjc
   WHERE tjc.code = p_code;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'join_code_invalid' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
    UPDATE public.students s
       SET claimed_by = p_profile_id
     WHERE s.teacher_id = v_teacher_id
       AND s.phone = p_phone
       AND (s.claimed_by IS NULL OR s.claimed_by = p_profile_id)
       AND s.deleted_at IS NULL
    RETURNING s.id, s.name, s.teacher_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_by_join_code(TEXT, TEXT, UUID)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_by_join_code(TEXT, TEXT, UUID)
  TO service_role;
