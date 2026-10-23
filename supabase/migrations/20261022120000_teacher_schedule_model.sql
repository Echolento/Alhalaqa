-- One class schedule + four billing states.
--
-- teachers.default_frequency already exists. This adds the weekday the class
-- meets (weekly / every-2-weeks), a per-student start date so new students can
-- be "awaiting start", an explicit custom-schedule flag, and the deferred
-- schedule columns used when a class changes rhythm while a student still owes
-- the old cycle.
--
-- Applied as a NEW migration: never edit an already-applied file.

alter table public.teachers
  add column if not exists default_weekday smallint;

alter table public.teachers drop constraint if exists teachers_default_weekday_check;
alter table public.teachers
  add constraint teachers_default_weekday_check
  check (default_weekday is null or (default_weekday >= 0 and default_weekday <= 6));

alter table public.students
  add column if not exists starts_on date,
  add column if not exists schedule_overridden boolean not null default false,
  add column if not exists pending_frequency text,
  add column if not exists pending_next_due date;

alter table public.students drop constraint if exists students_pending_frequency_check;
alter table public.students
  add constraint students_pending_frequency_check
  check (pending_frequency is null or pending_frequency in ('weekly', 'biweekly', 'monthly'));

create index if not exists idx_students_awaiting_start
  on public.students (teacher_id, starts_on)
  where deleted_at is null and starts_on is not null;

-- Never-paid students start on their stored first boundary. Paid students keep
-- starts_on null: Paid is owned by their payment history, not by the start date.
update public.students s
   set starts_on = s.next_due_date
 where s.starts_on is null
   and s.next_due_date is not null
   and not exists (
     select 1 from public.student_payments p
      where p.student_id = s.id and p.paid
   );

-- settle_cycle now also promotes a deferred class schedule once the last
-- outstanding old-rhythm cycle is settled. The app only passes p_next_due when
-- the settled cycle is the outstanding one, so this can never skip a debt.
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

    -- A class schedule change that was waiting for this debt to clear.
    update students
       set frequency = pending_frequency,
           next_due_date = coalesce(pending_next_due, p_next_due),
           pending_frequency = null,
           pending_next_due = null
     where id = p_student_id
       and deleted_at is null
       and pending_frequency is not null;
  end if;
end;
$$;

revoke all on function public.settle_cycle(uuid, text, numeric, date, uuid, text) from public, anon, authenticated;
grant execute on function public.settle_cycle(uuid, text, numeric, date, uuid, text) to service_role;
