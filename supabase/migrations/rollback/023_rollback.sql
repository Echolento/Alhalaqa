-- 023_rollback.sql
-- ============================================================================
-- Rollback for 023_strip_to_payment_tracker.sql
-- Run ONLY after confirming the forward migration must be reverted.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1.  Recreate removed tables
-- --------------------------------------------------------------------------
-- organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations are viewable by organization members" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  scheduled_at    timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 60,
  status          text DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','missed')),
  google_meet_link text,
  created_at      timestamp with time zone DEFAULT now(),
  updated_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions viewable by participants or admin" ON public.sessions
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    OR student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Teachers can manage their sessions" ON public.sessions
  FOR ALL USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );
CREATE POLICY "Admins can manage all sessions" ON public.sessions
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- session_notes
CREATE TABLE IF NOT EXISTS public.session_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  new_content         text,
  far_past_review     text,
  recent_past_review  text,
  general_notes       text,
  rating              integer CHECK (rating >= 1 AND rating <= 5),
  created_at          timestamp with time zone DEFAULT now(),
  updated_at          timestamp with time zone DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session notes viewable by session participants or admin" ON public.session_notes
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
      OR s.student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Teachers can manage session notes" ON public.session_notes
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    )
  );

-- invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_email text,
  student_phone text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  token         uuid DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT NOW(),
  expires_at    timestamptz DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at   timestamptz
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own invitations" ON public.invitations
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );
CREATE POLICY "Teachers can create invitations" ON public.invitations
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  );
CREATE POLICY "Users can view invitations to their phone" ON public.invitations
  FOR SELECT USING (
    student_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "Users can update invitations to their phone" ON public.invitations
  FOR UPDATE USING (
    student_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "Teachers can delete own invitations" ON public.invitations
  FOR DELETE USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    AND status = 'pending'
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_phone_unique
  ON public.invitations(teacher_id, student_phone)
  WHERE status = 'pending';

-- --------------------------------------------------------------------------
-- 2.  Restore handle_new_user() with student creation branch
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student'),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email     = EXCLUDED.email,
    phone     = COALESCE(EXCLUDED.phone, profiles.phone);

  IF COALESCE(NEW.raw_user_meta_data ->> 'role', 'student') = 'teacher' THEN
    INSERT INTO public.teachers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  IF COALESCE(NEW.raw_user_meta_data ->> 'role', 'student') = 'student' THEN
    INSERT INTO public.students (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 3.  Restore students table columns
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS profile_id      uuid,
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS current_surah   text,
  ADD COLUMN IF NOT EXISTS current_ayah    integer,
  ADD COLUMN IF NOT EXISTS enrollment_date date DEFAULT current_date;

-- Migrate data back from name/phone to profile_id where possible
-- (creates profiles for orphan students if needed)
UPDATE public.students s
  SET profile_id = p.id
  FROM public.profiles p
  WHERE p.full_name = s.name;

-- Add FK and unique constraints back on profile_id
ALTER TABLE IF EXISTS public.students
  ADD CONSTRAINT students_profile_id_fkey FOREIGN KEY (profile_id)
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT students_profile_id_key UNIQUE (profile_id);

ALTER TABLE IF EXISTS public.students
  ADD CONSTRAINT students_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Re-add other FK constraints
ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.teachers
  ADD CONSTRAINT teachers_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Drop the new columns that no longer belong
ALTER TABLE IF EXISTS public.students
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS phone;

-- Re-add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_teachers_organization ON public.teachers(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher      ON public.students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_organization ON public.students(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher      ON public.sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student      ON public.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled    ON public.sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_session_notes_session ON public.session_notes(session_id);

-- --------------------------------------------------------------------------
-- 4.  Restore RLS policies on students
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers can view their own students" ON public.students;
DROP POLICY IF EXISTS "Admins can view all students"         ON public.students;
DROP POLICY IF EXISTS "Teachers can insert students"         ON public.students;
DROP POLICY IF EXISTS "Teachers can update their students"   ON public.students;
DROP POLICY IF EXISTS "Teachers can delete their students"   ON public.students;
DROP POLICY IF EXISTS "Admins can manage students"           ON public.students;

CREATE POLICY "Students viewable by their teacher or admin" ON public.students
  FOR SELECT USING (
    profile_id = auth.uid()
    OR teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students can update own record" ON public.students
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

COMMIT;
