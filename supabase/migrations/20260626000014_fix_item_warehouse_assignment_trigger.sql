-- ============================================================
-- FIX ITEM WAREHOUSE ASSIGNMENT TRIGGER
-- ============================================================
-- This migration drops the trigger that references non-existent 'items' table
-- ============================================================

BEGIN;

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS trigger_validate_item_warehouse_assignment ON public.item_warehouse_assignments;
DROP FUNCTION IF EXISTS public.validate_item_warehouse_assignment();

COMMIT;

-- Verify the trigger is dropped
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'item_warehouse_assignments';
