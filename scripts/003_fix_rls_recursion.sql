-- Fix Infinite Recursion in RLS Policies

-- The issue triggers because "Admins can manage profiles" queries the profiles table, 
-- causing a loop when any operation on profiles is performed.

-- 1. Use Metadata for Admin Check (Breaks recursion by not querying table)
-- We assume 'role' in user_metadata is kept in sync or is the source of truth for RLS checks.
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 2. Allow Users to Insert their own profile (Required for self-healing fix)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- 3. Fix Organization View Recursion
-- We create a function to get the org ID safely without triggering RLS recursively
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER -- Runs with privileges of creator (postgres), bypassing RLS
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Profiles are viewable by same organization members" ON public.profiles;

CREATE POLICY "Profiles are viewable by same organization members" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() 
    OR
    organization_id = get_my_organization_id()
  );

-- 4. Fix other Admin policies to be safe/consistent
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
CREATE POLICY "Admins can manage teachers" ON public.teachers
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.sessions;
CREATE POLICY "Admins can manage all sessions" ON public.sessions
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );
