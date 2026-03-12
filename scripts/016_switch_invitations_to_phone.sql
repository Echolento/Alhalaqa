-- Migration: Switch invitations to phone-based identification

-- 1. Make student_email optional in invitations table
ALTER TABLE public.invitations 
ALTER COLUMN student_email DROP NOT NULL;

-- 2. Drop the old unique index for pending invitations by email
DROP INDEX IF EXISTS idx_invitations_pending_unique;

-- 3. Create a new unique index for pending invitations by phone per teacher
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_phone_unique 
ON public.invitations(teacher_id, student_phone) 
WHERE status = 'pending';

-- 4. Update RLS Policies for invitations to use phone number
-- Students can view invitations sent to their phone number
DROP POLICY IF EXISTS "Users can view invitations to their email" ON public.invitations;
CREATE POLICY "Users can view invitations to their phone"
ON public.invitations FOR SELECT
TO authenticated
USING (
    student_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
);

-- Students can update (accept/reject) invitations sent to them
DROP POLICY IF EXISTS "Users can update invitations to their email" ON public.invitations;
CREATE POLICY "Users can update invitations to their phone"
ON public.invitations FOR UPDATE
TO authenticated
USING (
    student_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
);
