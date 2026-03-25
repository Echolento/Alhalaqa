-- Add currency column to teachers table
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EGP'
CHECK (currency IN ('SAR', 'EGP'));

-- Update existing records to default to 'EGP' (though they already will due to DEFAULT)
UPDATE public.teachers SET currency = 'EGP' WHERE currency IS NULL;
