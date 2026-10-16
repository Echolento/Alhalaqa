-- The audit trail cannot be wiped separately from the data again.
-- Writes are insert-only (logActivity); nothing in the app updates or
-- deletes log rows. Belt (grants) + suspenders (trigger, which also stops
-- the table owner in the SQL editor).
-- Applied 2026-10-16 via migration activity_log_immutable.
revoke update, delete on public.activity_log from anon, authenticated, service_role;

create or replace function public.prevent_activity_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'activity_log is append-only (op=%)', TG_OP;
  return null;
end;
$$;

drop trigger if exists trg_activity_log_immutable on public.activity_log;
create trigger trg_activity_log_immutable
  before update or delete on public.activity_log
  for each row execute function public.prevent_activity_log_mutation();
