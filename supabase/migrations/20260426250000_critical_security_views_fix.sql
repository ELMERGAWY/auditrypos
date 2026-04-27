-- ============================================================
-- SECURITY PATCH: ENFORCE RLS ON FINANCIAL VIEWS
-- Resolves: Cross-tenant data leakage in 14 financial views
-- ============================================================

BEGIN;

-- We need to recreate views with security_invoker = on 
-- Note: PostgreSQL 15+ supports security_invoker for views.
-- For older versions, we must ensure the view itself has RLS filters.

DO $$ 
DECLARE 
    view_name TEXT;
    views_to_fix TEXT[] := ARRAY[
        'v_trial_balance', 'v_profit_loss', 'v_ar_aging_detail', 
        'v_balance_sheet', 'v_cash_flow', 'v_general_ledger',
        'v_inventory_valuation', 'v_sales_analytics', 'v_expense_analysis',
        'v_tax_report', 'v_customer_statement', 'v_supplier_statement',
        'v_audit_log_financial', 'v_cost_of_goods_sold'
    ];
BEGIN
    FOREACH view_name IN ARRAY views_to_fix LOOP
        -- Attempt to set security_invoker to true
        -- This ensures the view respects the RLS of the underlying tables
        EXECUTE format('ALTER VIEW IF EXISTS public.%I SET (security_invoker = on)', view_name);
    END LOOP;
END $$;

-- If ALTER VIEW fails due to DB version, we must manually add WHERE restaurant_id filters to the views.
-- Given the current context, the ALTER VIEW SET security_invoker is the standard Supabase/Postgres 15 fix.

COMMIT;
