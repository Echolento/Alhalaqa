-- Atomic claim consume: token mark + payer link in one transaction against
-- a live student. Replaces the evaluate-then-mark sequence that could burn
-- a token while reporting phantom success on a concurrently deleted row.
-- Applied via migration consume_claim_rpc. Superseded by
-- 20261017120200_consume_claim_hardened.sql (single-statement burn +
-- owner verify). Verified live: bad hash raises claim_invalid.
create or replace function public.consume_claim(
  p_token_hash text,
  p_profile_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_student_id uuid;
declare v_claimed_by uuid;
begin
  select student_id into v_student_id from claim_tokens
    where token_hash = p_token_hash
      and used_at is null and revoked_at is null and expires_at > now();
  if not found then
    raise exception 'claim_invalid';
  end if;

  select claimed_by into v_claimed_by from students
    where id = v_student_id and deleted_at is null;
  if not found then
    raise exception 'claim_invalid';
  end if;
  if v_claimed_by is not null and v_claimed_by <> p_profile_id then
    raise exception 'claim_taken';
  end if;

  update claim_tokens
    set used_at = now(), used_by_profile_id = p_profile_id
    where token_hash = p_token_hash and used_at is null;
  if not found then
    raise exception 'claim_invalid';
  end if;

  update students set claimed_by = p_profile_id
    where id = v_student_id and claimed_by is null and deleted_at is null;
  -- Zero rows here means the caller already owned it (idempotent): keep the
  -- consumed token, report success.

  return v_student_id;
end;
$$;

revoke all on function public.consume_claim(text, uuid) from public, anon, authenticated;
grant execute on function public.consume_claim(text, uuid) to service_role;
