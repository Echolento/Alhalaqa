-- settle_cycle: a blind settle must never orphan a receipt.
--
-- Bug: the dashboard's mark-as-paid called settle_cycle with p_proof_id = null.
-- If a receipt was waiting for review for that same cycle, the ledger flipped to
-- paid while the proof stayed 'pending' — it sat in الإيصالات forever, and the
-- payer never got a verdict.
--
-- Rule now enforced in the transaction: settling a cycle WITHOUT naming a proof
-- is refused while a pending receipt exists for that cycle. The receipts flow
-- (verifyProof) always passes p_proof_id and is unaffected.
--
-- Applied as a NEW migration: never edit an already-applied file.
-- Deploy the code that maps 'proof_pending' to Arabic BEFORE running this.

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
  if p_amount is null or p_amount::text = 'NaN' or p_amount < 0
     or p_amount::float8 <= '-Infinity'::float8
     or p_amount::float8 >= 'Infinity'::float8 then
    raise exception 'settle_cycle: bad amount';
  end if;
  select 1 into v_dummy from students
    where id = p_student_id and deleted_at is null
    for update;
  if not found then
    raise exception 'student_deleted';
  end if;

  -- Guard: no proof named, but one is waiting for review on this exact cycle.
  -- Review it (verify_proof passes p_proof_id) instead of settling blind.
  if p_proof_id is null then
    perform 1 from payment_proofs
      where student_id = p_student_id
        and period_key = p_cycle_key
        and status = 'pending'
      limit 1;
    if found then
      raise exception 'proof_pending';
    end if;
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

revoke all on function public.settle_cycle(uuid, text, numeric, date, uuid, text) from public, anon, authenticated;
grant execute on function public.settle_cycle(uuid, text, numeric, date, uuid, text) to service_role;
