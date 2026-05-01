-- ============================================================
-- FIX: Add missing is_active column to chart_of_accounts
-- Run this directly in SQL Editor if you get "column is_active does not exist" error
-- ============================================================

-- Check if column exists first (safe to run multiple times)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_active 
ON chart_of_accounts(restaurant_id, is_active);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chart_of_accounts' AND column_name = 'is_active';
