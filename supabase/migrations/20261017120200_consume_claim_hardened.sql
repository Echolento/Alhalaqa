-- Harden consume_claim: the burn itself carries the full predicates (no
-- SELECT/UPDATE gap for revoke/expiry to slip through), the student row is
-- locked and re-verified, and the link result is owner-verified — a race
-- loser gets claim_taken with nothing burned and nothing linked.
-- Applied via migration consume_claim_hardened.
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
  update claim_tokens
    set used_at = now(), used_by_profile_id = p_profile_id
    where token_hash = p_token_hash
      and used_at is null and revoked_at is null and expires_at > now()
    returning student_id into v_student_id;
  if not found then
    raise exception 'claim_invalid';
  end if;

  select claimed_by into v_claimed_by from students
    where id = v_student_id and deleted_at is null
    for update;
  if not found then
    raise exception 'claim_invalid';
  end if;
  if v_claimed_by is not null and v_claimed_by <> p_profile_id then
    raise exception 'claim_taken';
  end if;

  update students set claimed_by = p_profile_id
    where id = v_student_id and claimed_by is null and deleted_at is null;

  -- Owner verify: a concurrent winner means this caller owns nothing —
  -- report taken (whole transaction rolls back, burn included).
  select claimed_by into v_claimed_by from students where id = v_student_id;
  if v_claimed_by is distinct from p_profile_id then
    raise exception 'claim_taken';
  end if;

  return v_student_id;
end;
$$;

revoke all on function public.consume_claim(text, uuid) from public, anon, authenticated;
grant execute on function public.consume_claim(text, uuid) to service_role;
