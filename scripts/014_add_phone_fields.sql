-- Migration: Add phone fields to invitations and profiles logic

-- 1. Add student_phone to invitations table
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS student_phone TEXT;

-- 2. Update handle_new_user() function to capture phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, organization_id, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'role', 'student'),
    (new.raw_user_meta_data ->> 'organization_id')::uuid,
    new.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, profiles.phone);

  -- If user is a teacher, create teacher record
  IF COALESCE(new.raw_user_meta_data ->> 'role', 'student') = 'teacher' THEN
    INSERT INTO public.teachers (profile_id, organization_id)
    VALUES (
      new.id,
      (new.raw_user_meta_data ->> 'organization_id')::uuid
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- If user is a student, create student record
  IF COALESCE(new.raw_user_meta_data ->> 'role', 'student') = 'student' THEN
    INSERT INTO public.students (profile_id, organization_id)
    VALUES (
      new.id,
      (new.raw_user_meta_data ->> 'organization_id')::uuid
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
