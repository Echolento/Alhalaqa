-- Run this in the Supabase SQL Editor to inspect actual stored rating values
-- This helps debug the "all ratings show as ضعيف" issue

-- Check if any rating values are stored as strings instead of integers
SELECT
  id,
  session_id,
  rating_new,
  rating_far_past,
  rating_recent_past,
  pg_typeof(rating_new) AS rating_new_type,
  pg_typeof(rating_far_past) AS rating_far_past_type,
  pg_typeof(rating_recent_past) AS rating_recent_past_type
FROM session_notes
ORDER BY id;

-- Check distinct rating_new values
SELECT rating_new, COUNT(*) FROM session_notes GROUP BY rating_new ORDER BY rating_new;

-- Check distinct rating_far_past values
SELECT rating_far_past, COUNT(*) FROM session_notes GROUP BY rating_far_past ORDER BY rating_far_past;

-- Check distinct rating_recent_past values
SELECT rating_recent_past, COUNT(*) FROM session_notes GROUP BY rating_recent_past ORDER BY rating_recent_past;

-- Show complete notes for a few recent sessions
SELECT id, session_id, rating_new, rating_far_past, rating_recent_past, created_at
FROM session_notes
ORDER BY created_at DESC
LIMIT 5;
