-- ============================================================
-- 010: Fix missing profile rows for invited students
-- ============================================================
-- 
-- Problem: When a teacher invites a student via admin.inviteUserByEmail(),
-- the auth.users row is created and the trigger fires, inserting a profiles row.
-- However, in some cases the profiles row may not exist (e.g. if the trigger
-- was not yet installed or the student was created via a different path).
--
-- This migration backfills any missing profiles rows for students whose
-- students.profile_id has no matching profiles row, using data from auth.users.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

-- 1. Backfill missing profile rows from auth.users metadata
INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'طالب'),
  au.email,
  COALESCE(au.raw_user_meta_data->>'role', 'student')
FROM auth.users au
-- Only where a students row references this auth user but no profiles row exists
WHERE EXISTS (
  SELECT 1 FROM public.students s WHERE s.profile_id = au.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 2. Also backfill missing profile rows for teachers (defensive)
INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'معلم'),
  au.email,
  COALESCE(au.raw_user_meta_data->>'role', 'teacher')
FROM auth.users au
WHERE EXISTS (
  SELECT 1 FROM public.teachers t WHERE t.profile_id = au.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 3. Update any profiles that have full_name = 'مستخدم جديد' or 'طالب جديد'
--    (inserted by the trigger with placeholder) to use the actual name from auth metadata
UPDATE public.profiles p
SET
  full_name = COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    NULLIF(au.raw_user_meta_data->>'full_name', 'طالب جديد'),
    au.email,
    p.full_name
  ),
  email = COALESCE(au.email, p.email)
FROM auth.users au
WHERE p.id = au.id
  AND (p.full_name IN ('مستخدم جديد', 'طالب جديد') OR p.email IS NULL);

-- 4. Verify: show any remaining students without a profiles row
SELECT s.id as student_id, s.profile_id, s.teacher_id
FROM public.students s
LEFT JOIN public.profiles p ON p.id = s.profile_id
WHERE p.id IS NULL;
