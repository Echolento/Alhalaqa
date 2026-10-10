-- Cron auth that needs no Vercel-side secret: the bearer token is generated
-- inside the database, stored in Vault (never selected/exposed), and the
-- endpoint verifies incoming tokens against it via this SECURITY DEFINER RPC.

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'alhalaqa_cron_secret',
  'Bearer token for /api/cron (pg_cron)'
);

create or replace function public.verify_cron_secret(provided text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'alhalaqa_cron_secret'
      and provided is not null
      and provided <> ''
      and decrypted_secret = provided
  );
$$;

revoke all on function public.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;
