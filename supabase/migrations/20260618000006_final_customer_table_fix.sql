-- ============================================================
-- FINAL FIX: CUSTOMERS TABLE CREDIT LIMIT GUARANTEE
-- ============================================================

BEGIN;

-- 1) Ensure credit_limit is not null and defaults to 0 on customers table
ALTER TABLE public.customers ALTER COLUMN credit_limit SET DEFAULT 0;
UPDATE public.customers SET credit_limit = COALESCE(credit_limit, 0) WHERE credit_limit IS NULL;
ALTER TABLE public.customers ALTER COLUMN credit_limit SET NOT NULL;

-- 2) Ensure balance also has default 0 and not null
ALTER TABLE public.customers ALTER COLUMN balance SET DEFAULT 0;
UPDATE public.customers SET balance = COALESCE(balance, 0) WHERE balance IS NULL;
ALTER TABLE public.customers ALTER COLUMN balance SET NOT NULL;

-- 3) Ensure we have trigger to set defaults on insert if needed
CREATE OR REPLACE FUNCTION public.fn_customer_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.credit_limit IS NULL THEN
    NEW.credit_limit := 0;
  END IF;
  IF NEW.balance IS NULL THEN
    NEW.balance := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_defaults ON public.customers;
CREATE TRIGGER trg_customer_defaults
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.fn_customer_defaults();

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅✅ FINAL CUSTOMERS TABLE FIXED! All defaults applied!';
END
$$;
