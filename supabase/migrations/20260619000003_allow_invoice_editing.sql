-- ============================================================
-- ADD: allow_invoice_editing setting to restaurants
-- Controls whether admins can edit posted invoices' prices
-- ============================================================

BEGIN;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS allow_invoice_editing BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ allow_invoice_editing column added to restaurants table';
END
$$;
