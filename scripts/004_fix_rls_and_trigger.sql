-- Comprehensive Fix: RLS Recursion & Profile Trigger

-- -------------------------------------------------------------
-- 1. Fix RLS Infinite Recursion
-- -------------------------------------------------------------

-- Drop recursive policies first
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by same organization members" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.sessions;

-- 1.1 Use Metadata for Admin Check (Breaks recursion)
CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- 1.2 Helper for Org ID (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 1.3 Fix Organization View Recursion
CREATE POLICY "Profiles are viewable by same organization members" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() 
    OR
    organization_id = get_my_organization_id()
  );

-- 1.4 Allow Users to Insert their own profile (Critical for signup flow if not passing through trigger)
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK ( auth.uid() = id );

-- 1.5 Restore other Admin policies safely
CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

CREATE POLICY "Admins can manage teachers" ON public.teachers
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

CREATE POLICY "Admins can manage all sessions" ON public.sessions
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );


-- -------------------------------------------------------------
-- 2. Ensure Profile Trigger Exists and Works
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name, email, role, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student'),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'organization_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'organization_id')::uuid
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

  -- If user is a teacher, create teacher record
  IF COALESCE(NEW.raw_user_meta_data ->> 'role', 'student') = 'teacher' THEN
    INSERT INTO public.teachers (profile_id, organization_id)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'organization_id' IS NOT NULL 
        THEN (NEW.raw_user_meta_data ->> 'organization_id')::uuid
        ELSE NULL
      END
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- If user is a student, create student record
  IF COALESCE(NEW.raw_user_meta_data ->> 'role', 'student') = 'student' THEN
    INSERT INTO public.students (profile_id, organization_id)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'organization_id' IS NOT NULL 
        THEN (NEW.raw_user_meta_data ->> 'organization_id')::uuid
        ELSE NULL
      END
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is bound
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------
-- 3. Cleanup Test Data (Optional - Commented out)
-- -------------------------------------------------------------
-- delete from auth.users where email = 'test@example.com';
