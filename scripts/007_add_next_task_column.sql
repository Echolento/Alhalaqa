-- Add next_task column to session_notes table
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS next_task TEXT;
