-- Add account_mappings column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS account_mappings JSONB DEFAULT '{}'::jsonb;

-- Update comments for clarity
COMMENT ON COLUMN restaurants.account_mappings IS 'Stores the mapping between business operations and chart of accounts codes';
