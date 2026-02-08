-- EMERGENCY FIX: Drop recursive policies and implement safe access

-- 1. Drop the problematic policies causing recursion/errors
DROP POLICY IF EXISTS "Teachers can view their students' profiles" ON public.profiles;
DROP POLICY IF EXISTS "Students can view their teacher's profile" ON public.profiles;

-- 2. Create Security Definer functions to safely check relationships without triggering RLS loops
CREATE OR REPLACE FUNCTION public.check_is_teacher_of_student(student_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.students s
    JOIN public.teachers t ON s.teacher_id = t.id
    WHERE s.profile_id = student_profile_id
    AND t.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_student_of_teacher(teacher_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.students s
    JOIN public.teachers t ON s.teacher_id = t.id
    WHERE t.profile_id = teacher_profile_id
    AND s.profile_id = auth.uid()
  );
$$;

-- 3. Re-add policies using the safe functions
CREATE POLICY "Teachers can view their students' profiles" ON public.profiles
  FOR SELECT USING (
    check_is_teacher_of_student(id)
  );

CREATE POLICY "Students can view their teacher's profile" ON public.profiles
  FOR SELECT USING (
    check_is_student_of_teacher(id)
  );

-- 4. Ensure basic "View Own Profile" exists (safeguard)
-- This ensures that even if other policies fail, you can always see your own data.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
  );
