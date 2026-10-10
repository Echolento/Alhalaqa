-- 027_fix_currency_check.sql
-- ============================================================================
-- Drops the old teachers_currency_check constraint that only allowed
-- EGP and SAR, and replaces it with one allowing all Arab country
-- currencies + TRY, EUR, USD.
-- ============================================================================

ALTER TABLE IF EXISTS public.teachers
  DROP CONSTRAINT IF EXISTS teachers_currency_check;

ALTER TABLE IF EXISTS public.teachers
  ADD CONSTRAINT teachers_currency_check
  CHECK (currency = ANY (ARRAY[
    'AED', 'BHD', 'DJF', 'DZD', 'EGP', 'IQD', 'JOD', 'KMF',
    'KWD', 'LBP', 'LYD', 'MAD', 'MRU', 'OMR', 'QAR', 'SAR',
    'SDG', 'SOS', 'SYP', 'TND', 'YER', 'TRY', 'EUR', 'USD'
  ]));
