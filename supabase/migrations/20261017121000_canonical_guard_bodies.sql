-- Canonical guard bodies (supersedes all prior settle/reject definitions):
-- settle_cycle: FOR UPDATE entry lock, proof scoping + pending-only with
-- FOUND check, numeric-safe non-finite guard via text compare (isnan() takes
-- float8 only, and numeric NaN satisfies NaN=NaN).
-- reject_proof: S-then-P locking (student lock first), pending-only flip
-- with FOUND check, non-empty note.
-- Applied via migration canonical_guard_bodies. Earlier finite-amount work
-- that was edited into already-applied files is superseded by this file —
-- never edit an applied migration; this is the pattern to follow.
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
declare v_dummy int;
begin
  if nullif(btrim(coalesce(p_teacher_note, '')), '') is null then
    raise exception 'bad_note';
  end if;

  select student_id into v_student_id from payment_proofs
    where id = p_proof_id and status = 'pending';
  if not found then
    raise exception 'proof_not_pending';
  end if;

  select 1 into v_dummy from students
    where id = v_student_id and deleted_at is null
    for update;
  if not found then
    raise exception 'student_deleted';
  end if;

  update payment_proofs
    set status = 'rejected', teacher_note = p_teacher_note, updated_at = now()
    where id = p_proof_id and status = 'pending';
  if not found then
    raise exception 'proof_not_pending';
  end if;

  return v_student_id;
end;
$$;

revoke all on function public.settle_cycle(uuid, text, numeric, date, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_proof(uuid, text) from public, anon, authenticated;
grant execute on function public.settle_cycle(uuid, text, numeric, date, uuid, text) to service_role;
grant execute on function public.reject_proof(uuid, text) to service_role;
