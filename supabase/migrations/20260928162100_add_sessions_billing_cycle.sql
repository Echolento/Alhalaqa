alter table public.students drop constraint if exists students_frequency_check;
alter table public.students add constraint students_frequency_check check (frequency = any (array['weekly'::text, 'biweekly'::text, 'monthly'::text, 'sessions'::text]));
alter table public.students add column if not exists sessions_per_cycle integer not null default 8 check (sessions_per_cycle >= 1 and sessions_per_cycle <= 64);
alter table public.students add column if not exists sessions_done integer not null default 0 check (sessions_done >= 0);
