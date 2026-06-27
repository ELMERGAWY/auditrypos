-- ============================================================
-- DISABLE TRIGGERS ON ORDER_ITEMS
-- ============================================================
-- This disables all triggers on order_items that might be
-- reverting item updates to old values
-- ============================================================

BEGIN;

-- Get all triggers on order_items
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'order_items'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.order_items', trigger_record.trigger_name);
    RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
  END LOOP;
END $$;

COMMIT;

-- Verify no triggers remain
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'order_items';
