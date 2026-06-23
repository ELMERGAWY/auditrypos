-- ============================================================
-- CHECK ALL TRIGGERS ON SALES RETURNS - COPY TO SUPABASE SQL EDITOR
-- ============================================================

-- This will show all triggers on sales_returns table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'sales_returns'
  AND trigger_schema = 'public';
