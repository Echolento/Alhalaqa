-- TRUNCATE skips row triggers: without this, the append-only guarantee
-- on activity_log has a one-statement bypass for every key holder.
-- Applied 2026-10-16 via migration activity_log_no_truncate.
revoke truncate on public.activity_log from anon, authenticated, service_role;
