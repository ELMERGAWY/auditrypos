-- ============================================================
-- ROLLBACK: EMERGENCY SUPERADMIN FIX
-- ============================================================
-- This rollback removes the emergency superadmin RLS policies
-- ============================================================

BEGIN;

-- Drop emergency superadmin function
DROP FUNCTION IF EXISTS public.emergency_superadmin_check();

-- Drop emergency superadmin policies safely (only if table exists)
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        VALUES ('companies'), ('company_users'), ('restaurants'), ('orders'), 
               ('order_items'), ('customers'), ('suppliers'), ('products'),
               ('warehouses'), ('sub_warehouses'), ('inventory_transfers'),
               ('vouchers'), ('voucher_lines'), ('journal_entries'), 
               ('journal_lines'), ('accounts'), ('staff_access_requests')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS emergency_superadmin_full_access_%s ON public.%I', 
                      table_name, table_name);
    END LOOP;
END $$;

COMMIT;
