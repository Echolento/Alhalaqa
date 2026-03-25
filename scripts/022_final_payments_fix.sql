-- 022_final_payments_fix.sql
-- Run this in your Supabase SQL Editor.

-- 1. Ensure columns exist with correct types and defaults
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_day INTEGER DEFAULT 1;

-- Ensure payment_day constraint is applied if not already
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_payment_day_check') THEN
        ALTER TABLE public.students ADD CONSTRAINT students_payment_day_check CHECK (payment_day >= 1 AND payment_day <= 31);
    END IF;
END $$;

ALTER TABLE public.student_payments 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS default_monthly_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';

-- 2. Explicitly Fix RLS for Students table to allow teachers to update billing info
-- If this was missing or broken, the updates would fail silently or be blocked.
DROP POLICY IF EXISTS "Teachers can update their students" ON public.students;
CREATE POLICY "Teachers can update their students" ON public.students
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    OR teacher_id IS NULL -- allow unlinking
  );

-- 3. Ensure SELECT access is also clear
DROP POLICY IF EXISTS "Teachers can view their own students" ON public.students;
CREATE POLICY "Teachers can view their own students" ON public.students
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    OR profile_id = auth.uid()
  );

-- 4. Grant full permissions to authenticated users for these tables
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.student_payments TO authenticated;
GRANT ALL ON public.teachers TO authenticated;

-- 5. Add helpful comments
COMMENT ON COLUMN public.students.monthly_price IS 'The agreed monthly fee for this specific student';
COMMENT ON COLUMN public.students.payment_day IS 'The day of the month when this student is due to pay (1-31)';
COMMENT ON COLUMN public.student_payments.amount_paid IS 'The actual amount paid during this transaction';
