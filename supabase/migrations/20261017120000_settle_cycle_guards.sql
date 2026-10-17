-- Harden the settlement RPCs: no write may touch a soft-deleted student,
-- proofs stay scoped to their student, amounts and cycle keys are validated.
-- Applied via migration settle_cycle_guards. Verified live: deleted student
-- raises student_deleted, mismatched proof stays pending, bad key rejected.
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
begin
  if p_cycle_key !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'settle_cycle: bad cycle key';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'settle_cycle: bad amount';
  end if;
  perform 1 from students where id = p_student_id and deleted_at is null;
  if not found then
    raise exception 'student_deleted';
  end if;

  if p_proof_id is not null then
    update payment_proofs
      set status = 'verified', teacher_note = p_teacher_note, updated_at = now()
      where id = p_proof_id and student_id = p_student_id;
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
  if p_cycle_key !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'reopen_cycle: bad cycle key';
  end if;
  perform 1 from students where id = p_student_id and deleted_at is null;
  if not found then
    raise exception 'student_deleted';
  end if;

  update student_payments
    set paid = false, paid_at = null, amount_paid = 0, updated_at = now()
    where student_id = p_student_id and month = p_cycle_key::date;

  update payment_proofs
    set status = 'undone', updated_at = now()
    where student_id = p_student_id and period_key = p_cycle_key and status = 'verified';

  if p_next_due is not null then
    update students set next_due_date = p_next_due
      where id = p_student_id and deleted_at is null;
  end if;
end;
$$;

revoke all on function public.settle_cycle(uuid, text, numeric, date, uuid, text) from public, anon, authenticated;
revoke all on function public.reopen_cycle(uuid, text, date) from public, anon, authenticated;
grant execute on function public.settle_cycle(uuid, text, numeric, date, uuid, text) to service_role;
grant execute on function public.reopen_cycle(uuid, text, date) to service_role;
