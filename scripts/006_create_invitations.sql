-- Migration: Create invitations table for student invitation system
-- Run this in Supabase SQL Editor

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ
);

-- Create unique index on pending invitations per email per teacher
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_unique 
ON invitations(teacher_id, student_email) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Teachers can view and create their own invitations
CREATE POLICY "Teachers can view own invitations"
ON invitations FOR SELECT
TO authenticated
USING (
    teacher_id IN (
        SELECT id FROM teachers WHERE profile_id = auth.uid()
    )
);

CREATE POLICY "Teachers can create invitations"
ON invitations FOR INSERT
TO authenticated
WITH CHECK (
    teacher_id IN (
        SELECT id FROM teachers WHERE profile_id = auth.uid()
    )
);

-- Students can view invitations sent to their email
CREATE POLICY "Users can view invitations to their email"
ON invitations FOR SELECT
TO authenticated
USING (
    student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Students can update (accept/reject) invitations sent to them
CREATE POLICY "Users can update invitations to their email"
ON invitations FOR UPDATE
TO authenticated
USING (
    student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Add comment for documentation
COMMENT ON TABLE invitations IS 'Tracks student invitations from teachers';
