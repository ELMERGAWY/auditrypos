-- Add 'service' as a valid product_type option only when the legacy column exists.
DO $$
BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'menu_items'
        AND column_name = 'product_type'
    ) THEN
        IF EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND constraint_name = 'menu_items_product_type_check'
            AND table_name = 'menu_items'
        ) THEN
            ALTER TABLE public.menu_items DROP CONSTRAINT menu_items_product_type_check;
        END IF;

        ALTER TABLE public.menu_items
          ADD CONSTRAINT menu_items_product_type_check
          CHECK (product_type IN ('inventory', 'manufactured', 'service'));
    ELSE
        RAISE NOTICE 'menu_items.product_type is not installed; skipped service product type constraint';
    END IF;
END $$;
