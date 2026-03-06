-- ============================================================
-- 011: Definitive Profiles RLS Fix
-- ============================================================
-- Complete reset of all profiles SELECT policies and replacement
-- with a single, clean consolidated policy.
-- ============================================================

-- Step 1: Drop EVERY existing SELECT policy on profiles to start clean
DROP POLICY IF EXISTS "Users can view own profile"                          ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by same organization members"  ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view their students' profiles"          ON public.profiles;
DROP POLICY IF EXISTS "Students can view their teacher's profile"           ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles"                          ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy"                              ON public.profiles;

-- Step 2: Ensure the security-definer helper functions exist (idempotent)
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

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

-- Step 3: Single consolidated SELECT policy
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    -- 1. Own profile
    auth.uid() = id
    OR
    -- 2. Admins (via JWT metadata, avoids recursion)
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR
    -- 3. Teacher viewing their student's profile
    check_is_teacher_of_student(id)
    OR
    -- 4. Student viewing their teacher's profile
    check_is_student_of_teacher(id)
    OR
    -- 5. Same-org members
    (organization_id IS NOT NULL AND organization_id = get_my_organization_id())
  );

-- Step 4: Restore admin ALL policy (covers INSERT/UPDATE/DELETE for admins)
CREATE POLICY "admins_manage_profiles" ON public.profiles
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Step 5: Ensure users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Step 6: Ensure users can insert their own profile (for self-signup)
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- VERIFICATION: Run these after the migration to confirm
-- ============================================================

-- A) Confirm policies on profiles table
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- B) Confirm check_is_teacher_of_student works
-- (Replace the UUIDs below with the actual teacher profile_id and student profile_id)
-- SELECT public.check_is_teacher_of_student('f2e44de7-5b2c-403c-9436-1c48fc44770e');
