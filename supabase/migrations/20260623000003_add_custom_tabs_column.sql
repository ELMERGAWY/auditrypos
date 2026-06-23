-- ============================================================
-- ADD custom_tabs COLUMN TO restaurants TABLE
-- ============================================================

BEGIN;

-- Add custom_tabs column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurants' AND column_name = 'custom_tabs'
    ) THEN
        ALTER TABLE restaurants ADD COLUMN custom_tabs TEXT[];
        RAISE NOTICE 'Added custom_tabs column to restaurants table';
    ELSE
        RAISE NOTICE 'custom_tabs column already exists in restaurants table';
    END IF;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ custom_tabs column added to restaurants table';
END
$$;
