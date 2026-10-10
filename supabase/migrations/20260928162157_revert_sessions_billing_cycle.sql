alter table public.students drop column if exists sessions_done;
alter table public.students drop column if exists sessions_per_cycle;
alter table public.students drop constraint if exists students_frequency_check;
alter table public.students add constraint students_frequency_check check (frequency = any (array['weekly'::text, 'biweekly'::text, 'monthly'::text]));
