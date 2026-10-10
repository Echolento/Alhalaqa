alter table public.students add column if not exists next_due_date date;
alter table public.teachers add column if not exists default_frequency text not null default 'monthly';
