-- 021_master_billing_fix.sql
-- This script ensures all columns for the new payment and billing system are present.
-- Run this in your Supabase SQL Editor.

-- 1. Add monthly_price to students (stores individual student price)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0;

-- 2. Add payment_day to students (stores individual billing day, e.g., the 25th)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS payment_day INTEGER DEFAULT 1 CHECK (payment_day >= 1 AND payment_day <= 31);

-- 3. Add amount_paid to student_payments (stores exactly how much was paid this month)
ALTER TABLE public.student_payments 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- 4. Add default_monthly_price and currency to teachers
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS default_monthly_price NUMERIC DEFAULT 0;

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR' CHECK (currency IN ('SAR', 'EGP'));

-- 5. Add comments for clarity
COMMENT ON COLUMN public.students.monthly_price IS 'The agreed monthly fee for this specific student';
COMMENT ON COLUMN public.students.payment_day IS 'The day of the month when this student is due to pay (1-31)';
COMMENT ON COLUMN public.student_payments.amount_paid IS 'The actual amount paid during this transaction';
COMMENT ON COLUMN public.teachers.default_monthly_price IS 'The base price this teacher charges for new students';

-- 6. Grant permissions (ensure teacher can update these)
-- (Assuming standard RLS or direct access is handled, but let's be sure columns are readable)
GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.student_payments TO authenticated;
GRANT ALL ON TABLE public.teachers TO authenticated;
