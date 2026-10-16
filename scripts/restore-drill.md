# Restore drill (monthly, ~10 minutes)

Untested backups are decoration. Once a month:

1. `ls backups/` (or File Explorer) — confirm a file newer than 25h exists
   and is non-empty (`alhalaqa-YYYYMMDD-HHmm.json`, a few KB minimum).
2. Spot-check shape: open it, confirm `tables.students` is an array and
   `exported_at` is recent.
3. Every quarter, restore to a SCRATCH Supabase project (free tier is fine):
   `SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/restore-backup.mjs backups/<file>.json`
   then confirm student/payment counts in the scratch dashboard.
4. Never restore to production without a second person reading the command
   back. The script upserts by id — safe to re-run, but it cannot un-delete
   rows removed after the snapshot.

What backups do NOT cover: `auth.users` (re-invite), storage receipt
images (metadata + paths only), anything changed after `exported_at`.
