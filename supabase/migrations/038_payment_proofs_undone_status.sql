-- Undo of a verified cycle revokes its receipts (audit + image kept) with a
-- distinct status, so the payer's history stops claiming "مقبول" for a period
-- the pay screen now shows as unpaid.
alter table public.payment_proofs drop constraint if exists payment_proofs_status_check;
alter table public.payment_proofs add constraint payment_proofs_status_check
  check (status = any (array['pending'::text, 'verified'::text, 'rejected'::text, 'undone'::text]));
