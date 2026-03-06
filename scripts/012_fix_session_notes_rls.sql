-- scripts/012_fix_session_notes_rls.sql

-- 1. Drop the existing policies that might be causing RLS loops or failing inserts
DROP POLICY IF EXISTS "Session notes viewable by session participants or admin" ON public.session_notes;
DROP POLICY IF EXISTS "Teachers can manage session notes" ON public.session_notes;

-- 2. Create Security Definer function to safely check if the user is the teacher for the session
CREATE OR REPLACE FUNCTION public.check_is_teacher_for_session(target_session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.sessions s
    JOIN public.teachers t ON s.teacher_id = t.id
    WHERE s.id = target_session_id
    AND t.profile_id = auth.uid()
  );
$$;

-- 3. Create Security Definer function to safely check if the user is the student for the session
CREATE OR REPLACE FUNCTION public.check_is_student_for_session(target_session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.sessions s
    JOIN public.students st ON s.student_id = st.id
    WHERE s.id = target_session_id
    AND st.profile_id = auth.uid()
  );
$$;

-- 4. Re-add the policies using the safe functions

-- Allow teachers to manage (CRUD) notes for their own sessions
CREATE POLICY "Teachers can manage own session notes" ON public.session_notes
  FOR ALL USING (
    public.check_is_teacher_for_session(session_id)
  ) WITH CHECK (
    public.check_is_teacher_for_session(session_id)
  );

-- Allow students to read (SELECT) notes for their own sessions
CREATE POLICY "Students can view own session notes" ON public.session_notes
  FOR SELECT USING (
    public.check_is_student_for_session(session_id)
  );
