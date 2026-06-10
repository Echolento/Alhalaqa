-- 024_fix_profiles_rls_after_column_drop.sql
-- Migration 023 dropped students.profile_id but left dangling:
--   1. Functions check_is_teacher_of_student / check_is_student_of_teacher
--      (created by 011_fix_profiles_rls.sql) query s.profile_id → runtime error
--   2. Policy profiles_select_policy calls both functions → any SELECT on
--      profiles fails with "column s.profile_id does not exist"
--
-- Fix: Drop broken functions (students are standalone now, no profile link),
-- drop & recreate student RLS policies with clean versions (no profile_id refs),
-- drop & recreate profiles_select_policy without the broken function calls.

BEGIN;

-- 1. Drop profiles_select_policy FIRST (it depends on the broken functions)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- 2. Now drop broken functions. Students are standalone (no profile_id link),
--    so teacher-of-student / student-of-teacher profile checks are obsolete.
DROP FUNCTION IF EXISTS public.check_is_teacher_of_student(uuid);
DROP FUNCTION IF EXISTS public.check_is_student_of_teacher(uuid);

-- 2. Drop any orphaned RLS policies on students
DROP POLICY IF EXISTS "Students viewable by their teacher or admin" ON public.students;
DROP POLICY IF EXISTS "Students can update own record"              ON public.students;
DROP POLICY IF EXISTS "Teachers can view their own students"        ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view students"       ON public.students;
DROP POLICY IF EXISTS "Teachers can update their students"          ON public.students;
DROP POLICY IF EXISTS "Teachers can insert students"                ON public.students;
DROP POLICY IF EXISTS "Teachers can delete their students"          ON public.students;
DROP POLICY IF EXISTS "Admins can manage students"                  ON public.students;
DROP POLICY IF EXISTS "Admins can view all students"                ON public.students;

-- Recreate clean student policies (from 023, no profile_id refs)
CREATE POLICY "Teachers can view their own students" ON public.students
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Admins can view all students" ON public.students
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Teachers can insert students" ON public.students
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Teachers can update their students" ON public.students
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    teacher_id IS NULL
    OR
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Teachers can delete their students" ON public.students
  FOR DELETE USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 3. Recreate profiles_select_policy WITHOUT the broken function calls.
--    Students are standalone (no profile_id), so teacher-student profile
--    cross-visibility is no longer supported. Policy already dropped above.
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR
    (organization_id IS NOT NULL AND organization_id = get_my_organization_id())
  );

COMMIT;
