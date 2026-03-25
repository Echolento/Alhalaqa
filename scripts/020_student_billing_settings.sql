-- Add billing settings to students and teachers
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS payment_day INTEGER DEFAULT 1 CHECK (payment_day >= 1 AND payment_day <= 31);

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS default_monthly_price NUMERIC DEFAULT 0;
