-- Atomic settlement: proof status + payment row + next_due_date in one
-- transaction, so a mid-sequence failure can never leave half-applied state.
-- The ratchet DECISION stays pure in TS (nextDueAfterSettle); the caller passes
-- the computed next_due (null = leave next_due untouched).

-- Drop the earlier 5-arg overload if a prior run created it (adding a param to
-- create-or-replace creates a NEW overload rather than replacing).
drop function if exists public.settle_cycle(uuid, text, numeric, date, uuid);

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
declare v_id uuid;
begin
  if p_proof_id is not null then
    update payment_proofs
      set status = 'verified', teacher_note = p_teacher_note, updated_at = now()
      where id = p_proof_id;
  end if;

  select id into v_id from student_payments
    where student_id = p_student_id and month = p_cycle_key::date;

  if v_id is not null then
    update student_payments
      set paid = true, paid_at = now(), amount_paid = p_amount, updated_at = now()
      where id = v_id;
  else
    insert into student_payments (student_id, month, paid, paid_at, amount_paid)
      values (p_student_id, p_cycle_key::date, true, now(), p_amount);
  end if;

  if p_next_due is not null then
    update students set next_due_date = p_next_due where id = p_student_id;
  end if;
end;
$$;

create or replace function public.reopen_cycle(
  p_student_id uuid,
  p_cycle_key  text,
  p_next_due   date
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update student_payments
    set paid = false, paid_at = null, amount_paid = 0, updated_at = now()
    where student_id = p_student_id and month = p_cycle_key::date;

  update payment_proofs
    set status = 'undone', updated_at = now()
    where student_id = p_student_id and period_key = p_cycle_key and status = 'verified';

  if p_next_due is not null then
    update students set next_due_date = p_next_due where id = p_student_id;
  end if;
end;
$$;

revoke all on function public.settle_cycle(uuid, text, numeric, date, uuid, text) from public, anon, authenticated;
revoke all on function public.reopen_cycle(uuid, text, date) from public, anon, authenticated;
grant execute on function public.settle_cycle(uuid, text, numeric, date, uuid, text) to service_role;
grant execute on function public.reopen_cycle(uuid, text, date) to service_role;
