-- Least privilege for the audit trail: no role besides the table owner may
-- update, delete, or truncate — including future roles inheriting via PUBLIC.
-- Also pins search_path on the immutability function per repo convention.
-- Applied via migration activity_log_least_privilege.
revoke update, delete, truncate on public.activity_log
  from public, anon, authenticated, service_role;

create or replace function public.prevent_activity_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'activity_log is append-only (op=%)', TG_OP;
  return null;
end;
$$;
