-- Migration: Fix RLS policies to allow teachers to update students and manage invitations

-- 1. Allow teachers to update students assigned to them
-- This is needed for unlinking students (removing) and updating progress
DROP POLICY IF EXISTS "Teachers can update their students" ON public.students;
CREATE POLICY "Teachers can update their students" ON public.students
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    -- Allow unlinking (teacher_id = NULL) or maintaining the same teacher_id
    teacher_id IS NULL OR teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );

-- 2. Ensure teachers can delete their own pending invitations
-- (In case cancellation was also failing)
DROP POLICY IF EXISTS "Teachers can delete own invitations" ON public.invitations;
CREATE POLICY "Teachers can delete own invitations" ON public.invitations
  FOR DELETE USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    AND status = 'pending'
  );
