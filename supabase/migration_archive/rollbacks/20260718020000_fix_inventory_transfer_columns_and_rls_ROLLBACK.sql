-- ============================================================
-- ROLLBACK: FIX INVENTORY TRANSFER COLUMNS AND RLS
-- ============================================================
-- This rollback reverts inventory transfer column and RLS fixes
-- ============================================================

BEGIN;

-- Remove new columns from inventory_transfers
ALTER TABLE public.inventory_transfers DROP COLUMN IF EXISTS approved_by;
ALTER TABLE public.inventory_transfers DROP COLUMN IF EXISTS approved_at;
ALTER TABLE public.inventory_transfers DROP COLUMN IF EXISTS completed_by;
ALTER TABLE public.inventory_transfers DROP COLUMN IF EXISTS completed_at;

-- Restore original RLS policies
DROP POLICY IF EXISTS inventory_transfers_company_members ON public.inventory_transfers;
DROP POLICY IF EXISTS inventory_transfers_superadmin ON public.inventory_transfers;

COMMIT;
