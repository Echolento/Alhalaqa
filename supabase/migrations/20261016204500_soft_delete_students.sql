-- Soft-delete for students: deletes become reversible; no UI action,
-- dashboard click, or stray script can make a row vanish again.
-- Applied 2026-10-16 via migration soft_delete_students.
alter table public.students
  add column if not exists deleted_at timestamptz null;

create index if not exists idx_students_live_teacher
  on public.students (teacher_id)
  where deleted_at is null;

-- Anon reads never see soft-deleted rows (service-role reads filter in code).
drop policy if exists "Teachers can view their own students" on public.students;
create policy "Teachers can view their own students"
  on public.students for select to public
  using (
    teacher_id in (select teachers.id from teachers where teachers.profile_id = auth.uid())
    and deleted_at is null
  );
