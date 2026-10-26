-- settle_cycle: bind the receipt to the cycle it settles + restore strict inputs.
--
-- Two independent holes in the previous body (20261024120000):
--   1. The proof UPDATE matched (id, student_id, status='pending') only, so a
--      pending receipt for ANOTHER cycle was verified while the named cycle was
--      marked paid — leaving that cycle's own receipt stranded.
--   2. The strict-input block from 20261017121200 was lost (regex-only key,
--      missing null check, no amount upper bound), so NULL/calendar-invalid
--      keys and extreme numerics reached ::date / the ledger.
--
-- Rule: a receipt may only verify the cycle it was uploaded for.
-- Deploy the code that maps 'proof_pending' to Arabic before running this.
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
declare v_cycle date;
begin
  -- Calendar-valid key (regex shape alone accepts 2026-13-99). NULL must fail
  -- here: `NULL !~ '...'` is NULL, which skips a bare regex guard.
  if p_cycle_key is null or p_cycle_key = '' then
    raise exception 'settle_cycle: bad cycle key';
  end if;
  begin
    v_cycle := to_date(p_cycle_key, 'YYYY-MM-DD');
    if to_char(v_cycle, 'YYYY-MM-DD') != p_cycle_key then
      raise exception 'settle_cycle: bad cycle key';
    end if;
  exception when others then
    raise exception 'settle_cycle: bad cycle key';
  end;
  if p_amount is null or p_amount::text = 'NaN' or p_amount < 0
     or p_amount > 1000000000
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
  -- Review it (verifyProof passes p_proof_id) instead of settling blind.
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

  -- The receipt must belong to the cycle being settled, or verifying March's
  -- upload would mark April paid and strand March's own pending row.
  if p_proof_id is not null then
    update payment_proofs
      set status = 'verified', teacher_note = p_teacher_note, updated_at = now()
      where id = p_proof_id
        and student_id = p_student_id
        and period_key = p_cycle_key
        and status = 'pending';
    if not found then
      raise exception 'proof_not_pending';
    end if;
  end if;

  perform 1 from student_payments
    where student_id = p_student_id and month = v_cycle;
  if found then
    update student_payments
      set paid = true, paid_at = now(), amount_paid = p_amount, updated_at = now()
      where student_id = p_student_id and month = v_cycle;
  else
    insert into student_payments (student_id, month, paid, paid_at, amount_paid)
      values (p_student_id, v_cycle, true, now(), p_amount);
  end if;

  if p_next_due is not null then
    update students set next_due_date = p_next_due
      where id = p_student_id and deleted_at is null;
  end if;
end;
$$;

revoke all on function public.settle_cycle(uuid, text, numeric, date, uuid, text) from public, anon, authenticated;
grant execute on function public.settle_cycle(uuid, text, numeric, date, uuid, text) to service_role;
