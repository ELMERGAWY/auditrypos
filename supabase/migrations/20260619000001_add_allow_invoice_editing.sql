-- ============================================================
-- ADD allow_invoice_editing COLUMN TO restaurants TABLE
-- ============================================================

BEGIN;

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'restaurants'
    AND column_name = 'allow_invoice_editing'
  ) THEN
    ALTER TABLE public.restaurants 
    ADD COLUMN allow_invoice_editing BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE '✅ Added allow_invoice_editing column to restaurants table';
  ELSE
    RAISE NOTICE 'ℹ️ allow_invoice_editing column already exists in restaurants table';
  END IF;
END
$$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: allow_invoice_editing column added';
END
$$;
