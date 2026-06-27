-- ============================================================
-- CHECK TRIGGERS ON ORDERS AND ORDER_ITEMS
-- ============================================================
-- This script shows all triggers on orders and order_items tables
-- ============================================================

-- Show triggers on orders table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'orders'
ORDER BY trigger_name;

-- Show triggers on order_items table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'order_items'
ORDER BY trigger_name;
