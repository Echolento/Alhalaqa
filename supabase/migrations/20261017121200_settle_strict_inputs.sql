-- Strict inputs (canonical settle_cycle body — this file supersedes the
-- settle half of 20261017121000_canonical_guard_bodies.sql):
-- calendar-valid cycle keys (regex shape is not enough: 2026-13-99 passes
-- it) and a numeric-domain amount bound (float casts raise 500 on extreme
-- numerics instead of the domain error).
-- Applied via migration settle_strict_inputs. Verified live: 2026-13-99
-- raises bad cycle key, NaN raises bad amount, finite amounts settle.
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

  if p_proof_id is not null then
    update payment_proofs
      set status = 'verified', teacher_note = p_teacher_note, updated_at = now()
      where id = p_proof_id and student_id = p_student_id and status = 'pending';
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

