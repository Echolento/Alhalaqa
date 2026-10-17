-- Backfill for revoke-on-delete: rows trashed before that posture shipped
-- may still hold live invitation links. Revoke them so a later restore
-- cannot reactivate a harvested link. Only touches unused, unrevoked
-- tokens of soft-deleted students; everything else is left alone.
-- Applied via migration revoke_tokens_of_deleted.
update public.claim_tokens
  set revoked_at = now()
  where used_at is null
    and revoked_at is null
    and student_id in (select id from public.students where deleted_at is not null);
