-- Fix Student-Teacher Profile Access
-- Problem: Teachers cannot see student profiles because of restrictive RLS on `profiles` table.
-- Solution: Add policies to allow:
-- 1. Teachers to view profiles of students they teach.
-- 2. Students to view profiles of their teachers.

-- Policy: Teachers can view profiles of students linked to them
CREATE POLICY "Teachers can view their students' profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teachers t ON s.teacher_id = t.id
      WHERE s.profile_id = profiles.id -- The profile being accessed is the student's
      AND t.profile_id = auth.uid() -- The user accessing is the teacher
    )
  );

-- Policy: Students can view their teacher's profile
CREATE POLICY "Students can view their teacher's profile" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teachers t ON s.teacher_id = t.id
      WHERE t.profile_id = profiles.id -- The profile being accessed is the teacher's
      AND s.profile_id = auth.uid() -- The user accessing is the student
    )
  );
