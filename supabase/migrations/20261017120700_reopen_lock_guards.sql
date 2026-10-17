-- Same entry lock as settle_cycle: serialize the undo against delete stamp.
-- Applied via migration reopen_lock_guards.
create or replace function public.reopen_cycle(
  p_student_id uuid,
  p_cycle_key  text,
  p_next_due   date
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_dummy int;
begin
  if p_cycle_key !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'reopen_cycle: bad cycle key';
  end if;
  select 1 into v_dummy from students
    where id = p_student_id and deleted_at is null
    for update;
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

revoke all on function public.reopen_cycle(uuid, text, date) from public, anon, authenticated;
grant execute on function public.reopen_cycle(uuid, text, date) to service_role;
