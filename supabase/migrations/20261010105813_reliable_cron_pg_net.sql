-- Reliable hourly trigger for /api/cron, replacing the unreliable GitHub schedule.
-- pg_cron fires the job; pg_net performs the async HTTP call. The endpoint
-- self-gates by Cairo hour, so an hourly tick is all that is required.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.fire_alhalaqa_cron()
returns bigint
language plpgsql
security definer
set search_path = public, vault, extensions, net
as $$
declare
  v_secret text;
  v_url text;
  v_id bigint;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'alhalaqa_cron_secret';

  if v_secret is null or v_secret = '' then
    raise notice 'fire_alhalaqa_cron: alhalaqa_cron_secret not set in Vault; skipping';
    return null;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'alhalaqa_cron_url';

  v_url := coalesce(nullif(v_url, ''), 'https://www.alhalaqa.com/api/cron');

  select net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 15000
  ) into v_id;

  return v_id;
end;
$$;

revoke all on function public.fire_alhalaqa_cron() from public;
revoke all on function public.fire_alhalaqa_cron() from anon, authenticated;

-- (re)schedule: top of every hour, UTC. The endpoint converts to Cairo.
do $$
begin
  perform cron.unschedule('alhalaqa-cron-hourly');
exception when others then null;
end;
$$;

select cron.schedule(
  'alhalaqa-cron-hourly',
  '0 * * * *',
  $job$select public.fire_alhalaqa_cron();$job$
);
