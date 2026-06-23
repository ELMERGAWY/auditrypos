-- ============================================================
-- FIX: Add missing is_active column to chart_of_accounts
-- Run this FIRST before 20250101000000_erp_advanced_system.sql
-- ============================================================

-- Add the column
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_active 
ON chart_of_accounts(restaurant_id, is_active);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chart_of_accounts' AND column_name = 'is_active';
