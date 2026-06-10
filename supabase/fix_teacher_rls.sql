-- ============================================================================
-- Fix: Teacher record creation on first login
-- 
-- Problem: When a user signs in, the app tries to create a row in the 
-- `teachers` table (profile_id = auth.uid()). But there's no RLS policy 
-- that allows regular users to INSERT into `teachers` — only the 
-- SECURITY DEFINER trigger `handle_new_user()` can do it, and that only 
-- fires on SIGN UP, not on every login.
--
-- Fix: Add an INSERT policy so users can create their own teacher record,
-- and ensure the user has a teacher record.
-- ============================================================================

-- 1. Allow teachers to create their own teacher record on first login
DROP POLICY IF EXISTS "Teachers can create own record" ON public.teachers;
CREATE POLICY "Teachers can create own record" ON public.teachers
  FOR INSERT WITH CHECK (
    profile_id = auth.uid()
  );

-- 2. If you already logged in but got "Teacher not found" errors,
--    create your teacher record manually (replace the user ID below):
-- INSERT INTO public.teachers (profile_id)
-- VALUES ('REPLACE_WITH_YOUR_USER_ID')
-- ON CONFLICT (profile_id) DO NOTHING;

-- ============================================================================
-- How to find your user ID:
-- Run this in Supabase SQL Editor:
--   SELECT id, email FROM auth.users WHERE email = 'echolento.dev@gmail.com';
-- Then use that ID in the INSERT above, or just:
--   INSERT INTO public.teachers (profile_id)
--   SELECT id FROM auth.users WHERE email = 'echolento.dev@gmail.com'
--   ON CONFLICT (profile_id) DO NOTHING;
-- ============================================================================
