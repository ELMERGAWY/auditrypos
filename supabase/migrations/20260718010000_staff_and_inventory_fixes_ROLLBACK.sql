-- ============================================================
-- ROLLBACK: STAFF AND INVENTORY FIXES
-- ============================================================
-- This rollback reverts staff and inventory fixes
-- ============================================================

BEGIN;

-- Drop staff inventory sync function
DROP FUNCTION IF EXISTS public.sync_staff_inventory_access();

-- Restore original staff RLS policies
DROP POLICY IF EXISTS staff_view_own_company ON public.inventory_transfers;

COMMIT;
