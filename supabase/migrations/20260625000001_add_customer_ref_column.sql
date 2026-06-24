-- Add customer_ref column to customers table
BEGIN;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_ref ON public.customers(restaurant_id, customer_ref);

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Added customer_ref column to customers table';
END $$;
