-- Migration: Add 3 separate rating columns to session_notes
-- Run this in Supabase SQL Editor

-- Add the 3 new rating columns
ALTER TABLE session_notes 
ADD COLUMN IF NOT EXISTS rating_new INTEGER CHECK (rating_new >= 1 AND rating_new <= 5),
ADD COLUMN IF NOT EXISTS rating_far_past INTEGER CHECK (rating_far_past >= 1 AND rating_far_past <= 5),
ADD COLUMN IF NOT EXISTS rating_recent_past INTEGER CHECK (rating_recent_past >= 1 AND rating_recent_past <= 5);

-- Optional: Migrate existing rating data to rating_new (if you want to preserve old ratings)
-- UPDATE session_notes SET rating_new = rating WHERE rating IS NOT NULL;

-- Optional: Drop the old rating column after migration
-- ALTER TABLE session_notes DROP COLUMN IF EXISTS rating;

-- Add comment for documentation
COMMENT ON COLUMN session_notes.rating_new IS 'Rating for new memorization (الجديد), 1-5 stars';
COMMENT ON COLUMN session_notes.rating_far_past IS 'Rating for far past review (الماضي البعيد), 1-5 stars';
COMMENT ON COLUMN session_notes.rating_recent_past IS 'Rating for recent past review (الماضي القريب), 1-5 stars';
