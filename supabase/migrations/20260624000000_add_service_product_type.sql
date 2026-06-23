-- Add 'service' as a valid product_type option for menu_items
-- First, check if the constraint exists and drop it if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'menu_items_product_type_check' 
               AND table_name = 'menu_items') THEN
        ALTER TABLE menu_items DROP CONSTRAINT menu_items_product_type_check;
    END IF;
END $$;

-- Add the new check constraint that includes 'service'
ALTER TABLE menu_items
ADD CONSTRAINT menu_items_product_type_check 
CHECK (product_type IN ('inventory', 'manufactured', 'service'));

-- Update existing items if needed (optional)
-- ALTER TABLE menu_items ALTER COLUMN product_type SET DEFAULT 'inventory';
