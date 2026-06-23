-- ============================================================
-- LOCK BUSINESS TYPE AFTER COMPANY CREATION
-- ============================================================

BEGIN;

-- Add business_type_locked column to restaurants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'restaurants'
    AND column_name = 'business_type_locked'
  ) THEN
    ALTER TABLE public.restaurants 
    ADD COLUMN business_type_locked BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE '✅ Added business_type_locked column to restaurants table';
  ELSE
    RAISE NOTICE 'ℹ️ business_type_locked column already exists in restaurants table';
  END IF;
END
$$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: business_type_locked column added';
END
$$;
