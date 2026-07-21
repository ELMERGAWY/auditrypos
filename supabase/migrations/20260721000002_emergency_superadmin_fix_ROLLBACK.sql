-- ============================================================
-- ROLLBACK: EMERGENCY SUPERADMIN FIX
-- ============================================================
-- This rollback removes the emergency superadmin RLS policies
-- ============================================================

BEGIN;

-- Drop emergency superadmin policies
DROP POLICY IF EXISTS emergency_superadmin_full_access_companies ON public.companies;
DROP POLICY IF EXISTS emergency_superadmin_full_access_company_users ON public.company_users;
DROP POLICY IF EXISTS emergency_superadmin_full_access_restaurants ON public.restaurants;
DROP POLICY IF EXISTS emergency_superadmin_full_access_orders ON public.orders;
DROP POLICY IF EXISTS emergency_superadmin_full_access_order_items ON public.order_items;
DROP POLICY IF EXISTS emergency_superadmin_full_access_sales_orders ON public.sales_orders;
DROP POLICY IF EXISTS emergency_superadmin_full_access_sales_order_items ON public.sales_order_items;
DROP POLICY IF EXISTS emergency_superadmin_full_access_customers ON public.customers;
DROP POLICY IF EXISTS emergency_superadmin_full_access_suppliers ON public.suppliers;
DROP POLICY IF EXISTS emergency_superadmin_full_access_products ON public.products;
DROP POLICY IF EXISTS emergency_superadmin_full_access_warehouses ON public.warehouses;
DROP POLICY IF EXISTS emergency_superadmin_full_access_sub_warehouses ON public.sub_warehouses;
DROP POLICY IF EXISTS emergency_superadmin_full_access_inventory_transfers ON public.inventory_transfers;
DROP POLICY IF EXISTS emergency_superadmin_full_access_vouchers ON public.vouchers;
DROP POLICY IF EXISTS emergency_superadmin_full_access_voucher_lines ON public.voucher_lines;
DROP POLICY IF EXISTS emergency_superadmin_full_access_journal_entries ON public.journal_entries;
DROP POLICY IF EXISTS emergency_superadmin_full_access_journal_lines ON public.journal_lines;
DROP POLICY IF EXISTS emergency_superadmin_full_access_accounts ON public.accounts;
DROP POLICY IF EXISTS emergency_superadmin_full_access_staff_access_requests ON public.staff_access_requests;

-- Drop emergency superadmin function
DROP FUNCTION IF EXISTS public.emergency_superadmin_check();

COMMIT;
