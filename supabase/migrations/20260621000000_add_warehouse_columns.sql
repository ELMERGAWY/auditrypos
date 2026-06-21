-- Add missing columns to warehouses table to support advanced warehouse management
-- This migration adds: code, name_ar, type, accounting_standard, parent_id

-- Add code column
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS code TEXT;

-- Add name_ar column
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Add type column with enum
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('MAIN', 'SUB', 'RAW_MATERIALS', 'WORK_IN_PROGRESS', 'FINISHED_GOODS', 'SERVICE', 'PROJECT'));

-- Add accounting_standard column with enum
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS accounting_standard TEXT CHECK (accounting_standard IN ('IFRS', 'EAS', 'US_GAAP'));

-- Add parent_id column for hierarchical warehouses
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;

-- Add index on parent_id for performance
CREATE INDEX IF NOT EXISTS idx_warehouses_parent_id ON warehouses(parent_id);

-- Add index on type for filtering
CREATE INDEX IF NOT EXISTS idx_warehouses_type ON warehouses(type);

-- Update existing records with default values
UPDATE warehouses 
SET 
  code = COALESCE(code, 'WH-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')),
  name_ar = COALESCE(name_ar, name),
  type = COALESCE(type, 'MAIN'),
  accounting_standard = COALESCE(accounting_standard, 'IFRS')
WHERE type IS NULL OR code IS NULL;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
