-- Student Payment Tracking
-- One record per student per month. Created on-demand when teacher views payments.

create table if not exists public.student_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  month date not null, -- always 1st of month, e.g. '2026-03-01'
  paid boolean not null default false,
  paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(student_id, month)
);

-- Enable RLS
alter table public.student_payments enable row level security;

-- Teachers can see/manage payments for their own students
create policy "Teachers can view their students payments"
  on public.student_payments for select using (
    student_id in (
      select s.id from public.students s
      where s.teacher_id in (select t.id from public.teachers t where t.profile_id = auth.uid())
    )
  );

create policy "Teachers can insert payments for their students"
  on public.student_payments for insert with check (
    student_id in (
      select s.id from public.students s
      where s.teacher_id in (select t.id from public.teachers t where t.profile_id = auth.uid())
    )
  );

create policy "Teachers can update their students payments"
  on public.student_payments for update using (
    student_id in (
      select s.id from public.students s
      where s.teacher_id in (select t.id from public.teachers t where t.profile_id = auth.uid())
    )
  );

-- Students can view their own payments
create policy "Students can view own payments"
  on public.student_payments for select using (
    student_id in (select id from public.students where profile_id = auth.uid())
  );

-- Admins can manage all payments
create policy "Admins can manage all payments"
  on public.student_payments for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Indexes
create index if not exists idx_student_payments_student on public.student_payments(student_id);
create index if not exists idx_student_payments_month on public.student_payments(month);
create index if not exists idx_student_payments_student_month on public.student_payments(student_id, month);
