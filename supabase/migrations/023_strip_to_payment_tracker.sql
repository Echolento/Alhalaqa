-- 023_strip_to_payment_tracker.sql
-- ============================================================================
-- HUMAN-IN-THE-LOOP: This migration MUST be reviewed before running against
-- production. It drops tables (sessions, session_notes, invitations,
-- organizations), alters the students table, and removes the student-creation
-- path from the auth trigger. Review every DROP and ALTER carefully.
-- ============================================================================
--
-- Summary:
--   1.  Drop RLS policies on sessions / session_notes / invitations / orgs
--       so there are no dangling policy objects.
--   2.  Drop dependent objects (FK constraints) that reference removed tables.
--   3.  Drop handle_new_user() and recreate it WITHOUT the student branch.
--   4.  Migrate student name/phone from linked profiles into the students row.
--   5.  Drop FK constraints / unique constraints on students.profile_id.
--   6.  Strip students down to payment-tracker columns only:
--       id, name, phone, teacher_id, monthly_price, payment_day,
--       created_at, updated_at, is_active.
--   7.  Drop the four removed tables with CASCADE.
--   8.  Replace RLS policies on students for the new schema.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1.  Drop RLS policies on tables that will be removed
--     (so pg doesn't leave orphaned policy entries).
-- --------------------------------------------------------------------------
-- sessions
DROP POLICY IF EXISTS "Sessions viewable by participants or admin"      ON public.sessions;
DROP POLICY IF EXISTS "Teachers can manage their sessions"               ON public.sessions;
DROP POLICY IF EXISTS "Admins can manage all sessions"                   ON public.sessions;
-- session_notes
DROP POLICY IF EXISTS "Session notes viewable by session participants or admin" ON public.session_notes;
DROP POLICY IF EXISTS "Teachers can manage session notes"                ON public.session_notes;
-- invitations
DROP POLICY IF EXISTS "Teachers can view own invitations"                ON public.invitations;
DROP POLICY IF EXISTS "Teachers can create invitations"                  ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations to their phone"        ON public.invitations;
DROP POLICY IF EXISTS "Users can update invitations to their phone"      ON public.invitations;
DROP POLICY IF EXISTS "Teachers can delete own invitations"              ON public.invitations;
-- organizations
DROP POLICY IF EXISTS "Organizations are viewable by organization members" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations"                  ON public.organizations;
-- teachers (contains FK to organizations – policy stays but we drop the FK later)
-- student_payments is kept; its policies stay untouched.

-- --------------------------------------------------------------------------
-- 2.  Drop FK constraints that reference removed tables
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.teachers      DROP CONSTRAINT IF EXISTS teachers_organization_id_fkey;
ALTER TABLE IF EXISTS public.profiles      DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;
ALTER TABLE IF EXISTS public.students      DROP CONSTRAINT IF EXISTS students_organization_id_fkey;
ALTER TABLE IF EXISTS public.student_payments DROP CONSTRAINT IF EXISTS student_payments_student_id_fkey;
ALTER TABLE IF EXISTS public.invitations   DROP CONSTRAINT IF EXISTS invitations_teacher_id_fkey;
ALTER TABLE IF EXISTS public.sessions      DROP CONSTRAINT IF EXISTS sessions_teacher_id_fkey;
ALTER TABLE IF EXISTS public.sessions      DROP CONSTRAINT IF EXISTS sessions_student_id_fkey;
ALTER TABLE IF EXISTS public.session_notes DROP CONSTRAINT IF EXISTS session_notes_session_id_fkey;

-- --------------------------------------------------------------------------
-- 3.  Recreate handle_new_user() WITHOUT the student-creation branch
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student'),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email     = EXCLUDED.email,
    phone     = COALESCE(EXCLUDED.phone, profiles.phone);

  -- Teacher record creation is preserved
  IF COALESCE(NEW.raw_user_meta_data ->> 'role', 'student') = 'teacher' THEN
    INSERT INTO public.teachers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- Student record creation is REMOVED – students are now created manually
  -- by teachers with name/phone directly on the students table.

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 4.  Migrate existing student data before dropping profile_id
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS name  TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

UPDATE public.students s
  SET
    name  = p.full_name,
    phone = p.phone
  FROM public.profiles p
  WHERE s.profile_id = p.id;

-- Now enforce NOT NULL on name
ALTER TABLE IF EXISTS public.students
  ALTER COLUMN name SET NOT NULL;

-- --------------------------------------------------------------------------
-- 5.  Drop all policies on students that reference profile_id
--     (these must go BEFORE the column drop)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students viewable by their teacher or admin" ON public.students;
DROP POLICY IF EXISTS "Students can update own record"              ON public.students;
DROP POLICY IF EXISTS "Admins can manage students"                  ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view students"       ON public.students;
DROP POLICY IF EXISTS "Teachers can update their students"          ON public.students;
DROP POLICY IF EXISTS "Teachers can view their own students"        ON public.students;
DROP POLICY IF EXISTS "Students can view own payments"              ON public.student_payments;

-- --------------------------------------------------------------------------
-- 6.  Drop profile_id FK and unique constraint on students
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.students DROP CONSTRAINT IF EXISTS students_profile_id_fkey;
ALTER TABLE IF EXISTS public.students DROP CONSTRAINT IF EXISTS students_profile_id_key;
DROP INDEX IF EXISTS idx_students_profile_id;

-- --------------------------------------------------------------------------
-- 7.  Drop obsolete columns from students (keep only payment-tracker set)
--     Use CASCADE to handle any remaining policy dependencies.
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.students
  DROP COLUMN IF EXISTS profile_id CASCADE,
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS current_surah,
  DROP COLUMN IF EXISTS current_ayah,
  DROP COLUMN IF EXISTS enrollment_date;

-- --------------------------------------------------------------------------
-- 8.  Drop removed tables (CASCADE cleans up any remaining FK/policy refs)
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS public.sessions      CASCADE;
DROP TABLE IF EXISTS public.session_notes CASCADE;
DROP TABLE IF EXISTS public.invitations   CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

DROP POLICY IF EXISTS "Teachers can view their own students" ON public.students;
CREATE POLICY "Teachers can view their own students" ON public.students
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
CREATE POLICY "Admins can view all students" ON public.students
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Teachers can insert students" ON public.students;
CREATE POLICY "Teachers can insert students" ON public.students
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "Teachers can update their students" ON public.students;
CREATE POLICY "Teachers can update their students" ON public.students
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    teacher_id IS NULL
    OR
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "Teachers can delete their students" ON public.students;
CREATE POLICY "Teachers can delete their students" ON public.students
  FOR DELETE USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- --------------------------------------------------------------------------
-- 9.  Allow teachers to create their own teacher record (first-login flow)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers can create own record" ON public.teachers;
CREATE POLICY "Teachers can create own record" ON public.teachers
  FOR INSERT WITH CHECK (
    profile_id = auth.uid()
  );

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- See supabase/migrations/rollback/023_rollback.sql
-- ============================================================================
