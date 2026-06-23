-- ============================================================
-- FIX WAREHOUSES TABLE SCHEMA - ADD MISSING COLUMNS
-- ============================================================

BEGIN;

-- 1. Add restaurant_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouses' AND column_name = 'restaurant_id'
    ) THEN
        ALTER TABLE warehouses ADD COLUMN restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
        
        -- Set restaurant_id for existing warehouses if there's only one restaurant
        UPDATE warehouses w
        SET restaurant_id = r.id
        FROM restaurants r
        WHERE w.restaurant_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM warehouses WHERE restaurant_id IS NOT NULL LIMIT 1);
        
        RAISE NOTICE 'Added restaurant_id column to warehouses table';
    ELSE
        RAISE NOTICE 'restaurant_id column already exists in warehouses table';
    END IF;
END $$;

-- 2. Add accounting_account_code column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouses' AND column_name = 'accounting_account_code'
    ) THEN
        ALTER TABLE warehouses ADD COLUMN accounting_account_code VARCHAR(100);
        RAISE NOTICE 'Added accounting_account_code column to warehouses table';
    END IF;
END $$;

-- 3. Add cogs_account_code column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouses' AND column_name = 'cogs_account_code'
    ) THEN
        ALTER TABLE warehouses ADD COLUMN cogs_account_code VARCHAR(100);
        RAISE NOTICE 'Added cogs_account_code column to warehouses table';
    END IF;
END $$;

-- 4. Add inventory_account_code column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouses' AND column_name = 'inventory_account_code'
    ) THEN
        ALTER TABLE warehouses ADD COLUMN inventory_account_code VARCHAR(100);
        RAISE NOTICE 'Added inventory_account_code column to warehouses table';
    END IF;
END $$;

-- 5. Make restaurant_id NOT NULL if it exists and all records have values
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouses' AND column_name = 'restaurant_id'
    ) THEN
        -- Check if any NULL values exist
        IF NOT EXISTS (SELECT 1 FROM warehouses WHERE restaurant_id IS NULL) THEN
            ALTER TABLE warehouses ALTER COLUMN restaurant_id SET NOT NULL;
            RAISE NOTICE 'Made restaurant_id NOT NULL';
        END IF;
    END IF;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Warehouses table schema fixed';
  RAISE NOTICE '✅ Added missing accounting code columns';
END
$$;
