-- Add amount tracking to payments and student pricing
-- This enables revenue dashboards and fancy charts

-- Add monthly_price to students table
alter table public.students 
add column if not exists monthly_price numeric default 0;

-- Add amount_paid to student_payments table
alter table public.student_payments 
add column if not exists amount_paid numeric default 0;

-- Add comment for clarity
comment on column public.students.monthly_price is 'The expected monthly fee for this student';
comment on column public.student_payments.amount_paid is 'The actual amount paid by the student for this month';
