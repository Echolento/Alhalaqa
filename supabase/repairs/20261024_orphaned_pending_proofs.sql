-- ============================================================================
-- ONE-OFF DATA REPAIR — orphaned receipts (manual run, NOT a migration).
--
-- An "orphan" is a receipt row that is still `pending` while the ledger for the
-- SAME student + period is already `paid`. The old dashboard mark-as-paid settled
-- the cycle with p_proof_id = null, so the proof never left the review queue.
-- New orphans are now impossible (UI routes pending rows to the receipt; the
-- settle_cycle guard refuses a blind settle while a pending proof exists).
--
-- This file only repairs rows created BEFORE that fix. Run the COUNT first,
-- read the row list, then run the UPDATE. Idempotent: a second run matches 0.
--
-- Review order: STEP 0 -> STEP 1 -> STEP 2 -> STEP 3.
-- ============================================================================


-- STEP 0 — how many rows would be repaired (read-only) ----------------------
select count(*) as orphans
from public.payment_proofs p
join public.student_payments sp
  on sp.student_id = p.student_id
 and sp.month::text = p.period_key
where p.status = 'pending'
  and sp.paid;


-- STEP 1 — the exact rows (read-only) ---------------------------------------
select p.id,
       s.name            as student_name,
       p.period_key,
       p.created_at,
       p.teacher_id
from public.payment_proofs p
join public.students s        on s.id = p.student_id
join public.student_payments sp
  on sp.student_id = p.student_id
 and sp.month::text = p.period_key
where p.status = 'pending'
  and sp.paid
order by p.created_at;


-- STEP 2 — repair -----------------------------------------------------------
-- pending -> verified: the teacher did assert the payment is real when they
-- tapped mark-as-paid; `rejected` would invent a refusal and `undone` would
-- register a phantom reopen (billing-state treats 'undone' as isReopened).
-- teacher_note records WHY the row moved without a human verdict.
begin;

with matched as (
  select p.id
  from public.payment_proofs p
  join public.student_payments sp
    on sp.student_id = p.student_id
   and sp.month::text = p.period_key
  where p.status = 'pending'
    and sp.paid
)
update public.payment_proofs p
   set status       = 'verified',
       teacher_note = coalesce(p.teacher_note, 'سُوّيت التسوية يدوياً من لوحة التحكم'),
       updated_at   = now()
  from matched m
 where p.id = m.id;

-- Audit trail: one append-only row per repaired receipt, attributed to the
-- owning teacher (activity_log.user_id is the profile, not the teacher row).
insert into public.activity_log (user_id, action_type, entity_type, entity_id, details)
select t.profile_id,
       'proof_verified',
       'payment_proof',
       p.id,
       jsonb_build_object(
         'reason', 'manual_reconcile',
         'student_id', p.student_id,
         'period_key', p.period_key,
         'description', 'تسوية يدوية: إيصال قيد المراجعة على دورة مدفوعة'
       )
from public.payment_proofs p
join public.teachers t on t.id = p.teacher_id
where p.status = 'verified'
  and p.teacher_note = 'سُوّيت التسوية يدوياً من لوحة التحكم'
  and not exists (
    select 1 from public.activity_log a
    where a.entity_id = p.id
      and a.action_type = 'proof_verified'
  );

commit;


-- STEP 3 — verify (expect 0) ------------------------------------------------
select count(*) as orphans_left
from public.payment_proofs p
join public.student_payments sp
  on sp.student_id = p.student_id
 and sp.month::text = p.period_key
where p.status = 'pending'
  and sp.paid;
