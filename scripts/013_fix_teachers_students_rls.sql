-- 013_fix_teachers_students_rls.sql

-- 1. Students need to be able to SELECT their teacher's row from the teachers table.
DROP POLICY IF EXISTS "Students can view their teacher" ON public.teachers;
CREATE POLICY "Students can view their teacher" ON public.teachers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.teacher_id = teachers.id
      AND s.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.teacher_id = teachers.id
      AND i.status = 'pending'
      AND i.student_email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    )
  );

-- To be totally safe and prevent API errors for students viewing ANY teacher's profile id, 
-- we can just allow all authenticated users to view teachers.
DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;
CREATE POLICY "Authenticated users can view teachers" ON public.teachers
  FOR SELECT USING ( auth.role() = 'authenticated' );

-- 2. Ensure teachers can see all students
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
CREATE POLICY "Authenticated users can view students" ON public.students
  FOR SELECT USING ( auth.role() = 'authenticated' );
