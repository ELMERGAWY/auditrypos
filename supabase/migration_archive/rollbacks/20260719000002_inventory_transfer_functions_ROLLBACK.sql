-- ============================================================
-- ROLLBACK: INVENTORY TRANSFER FUNCTIONS
-- ============================================================
-- This rollback removes inventory transfer functions
-- ============================================================

BEGIN;

-- Drop inventory transfer functions
DROP FUNCTION IF EXISTS public.create_inventory_transfer();
DROP FUNCTION IF EXISTS public.approve_inventory_transfer(p_transfer_id UUID);
DROP FUNCTION IF EXISTS public.complete_inventory_transfer(p_transfer_id UUID);
DROP FUNCTION IF EXISTS public.cancel_inventory_transfer(p_transfer_id UUID);

-- Drop related triggers
DROP TRIGGER IF EXISTS on_inventory_transfer_created ON public.inventory_transfers;
DROP TRIGGER IF EXISTS on_inventory_transfer_approved ON public.inventory_transfers;
DROP TRIGGER IF EXISTS on_inventory_transfer_completed ON public.inventory_transfers;

COMMIT;
