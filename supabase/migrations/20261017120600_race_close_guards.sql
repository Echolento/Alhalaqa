-- Race-close guards, all behavior-preserving on sequential paths:
-- 1. settle_cycle locks the student row at entry (serializes vs delete stamp).
-- 2. New reject_proof RPC: atomic pending-only reject with liveness check.
-- 3. One live invitation per student (partial unique index kills double-mint).
-- Applied via migration race_close_guards. Verified live: reject flips
-- pending to rejected, second call raises proof_not_pending.
create or replace function public.settle_cycle(
  p_student_id uuid,
  p_cycle_key  text,
  p_amount     numeric,
  p_next_due   date,
  p_proof_id   uuid default null,
  p_teacher_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_dummy int;
begin
  if p_cycle_key !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'settle_cycle: bad cycle key';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'settle_cycle: bad amount';
  end if;
  select 1 into v_dummy from students
    where id = p_student_id and deleted_at is null
    for update;
  if not found then
    raise exception 'student_deleted';
  end if;

  if p_proof_id is not null then
    update payment_proofs
      set status = 'verified', teacher_note = p_teacher_note, updated_at = now()
      where id = p_proof_id and student_id = p_student_id and status = 'pending';
    if not found then
      raise exception 'proof_not_pending';
    end if;
  end if;

  perform 1 from student_payments
    where student_id = p_student_id and month = p_cycle_key::date;
  if found then
    update student_payments
      set paid = true, paid_at = now(), amount_paid = p_amount, updated_at = now()
      where student_id = p_student_id and month = p_cycle_key::date;
  else
    insert into student_payments (student_id, month, paid, paid_at, amount_paid)
      values (p_student_id, p_cycle_key::date, true, now(), p_amount);
  end if;

  if p_next_due is not null then
    update students set next_due_date = p_next_due
      where id = p_student_id and deleted_at is null;
  end if;
end;
$$;

create or replace function public.reject_proof(
  p_proof_id uuid,
  p_teacher_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_student_id uuid;
begin
  select student_id into v_student_id from payment_proofs
    where id = p_proof_id and status = 'pending'
    for update;
  if not found then
    raise exception 'proof_not_pending';
  end if;

  perform 1 from students where id = v_student_id and deleted_at is null;
  if not found then
    raise exception 'student_deleted';
  end if;

  update payment_proofs
    set status = 'rejected', teacher_note = p_teacher_note, updated_at = now()
    where id = p_proof_id and status = 'pending';

  return v_student_id;
end;
$$;

create unique index if not exists idx_claim_tokens_one_live_per_student
  on public.claim_tokens (student_id)
  where used_at is null and revoked_at is null;

revoke all on function public.settle_cycle(uuid, text, numeric, date, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_proof(uuid, text) from public, anon, authenticated;
grant execute on function public.settle_cycle(uuid, text, numeric, date, uuid, text) to service_role;
grant execute on function public.reject_proof(uuid, text) to service_role;
