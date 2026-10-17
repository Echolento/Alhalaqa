-- Harden reject_proof: lock the student row FIRST (global S-then-P order,
-- same as settle_cycle, so no lock cycle), require a non-empty note.
-- Applied via migration reject_lock_and_guards.
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

  return v_student_id;
end;
$$;

revoke all on function public.reject_proof(uuid, text) from public, anon, authenticated;
grant execute on function public.reject_proof(uuid, text) to service_role;
