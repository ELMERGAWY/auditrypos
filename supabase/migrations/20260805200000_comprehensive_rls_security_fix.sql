-- ============================================================
-- MIGRATION: 20260805200000_comprehensive_rls_security_fix.sql
-- PURPOSE: Fix all Critical & Warning RLS security issues:
--   - Enable RLS on all tables that had it disabled
--   - Add restaurant_id-scoped policies for inventory/warehouse tables
--   - Add tenant-scoped policies for marketing agency tables
--   - Restrict journal/accounting tables to owner tenant
--   - Secure Facebook OAuth tokens/credentials
--   - Fix SECURITY DEFINER function search_path
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- HELPER: Safe policy drop helper
-- ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'journal_entries','journal_entry_lines','chart_of_accounts',
        'journal_entries_backup','account_balances_backup',
        'customers_backup','suppliers_backup',
        'unbalanced_journal_diagnostics',
        'inventory_transfers','inventory_transfer_items',
        'warehouse_stock','warehouse_stock_locations','stock_moves',
        'warehouses',
        'exchange_rates',
        'marketing_projects','marketing_campaigns','ad_campaigns',
        'ad_performance_metrics','ad_spend_expenses',
        'marketing_leads','marketing_crm_leads',
        'agency_employees','freelancers',
        'staff_timesheets','retainer_contracts',
        'revenue_recognition','employee_project_access',
        'pipeline_stages','workflow_stages',
        'facebook_oauth_configs','facebook_ad_accounts',
        'social_oauth_tokens'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 1: ACCOUNTING / GENERAL LEDGER TABLES
-- ══════════════════════════════════════════════════════════════

-- 1-A) journal_entries — scoped to restaurant_id
ALTER TABLE IF EXISTS public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "je_tenant_access" ON public.journal_entries
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 1-B) journal_entry_lines — scoped via journal_entries.restaurant_id
ALTER TABLE IF EXISTS public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jel_tenant_access" ON public.journal_entry_lines
  FOR ALL TO authenticated
  USING (
    journal_entry_id IN (
      SELECT id FROM public.journal_entries
      WHERE restaurant_id IN (
        SELECT id FROM public.restaurants
        WHERE user_id = auth.uid()
           OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    journal_entry_id IN (
      SELECT id FROM public.journal_entries
      WHERE restaurant_id IN (
        SELECT id FROM public.restaurants
        WHERE user_id = auth.uid()
           OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
      )
    )
  );

-- 1-C) chart_of_accounts — already has restaurant_id
ALTER TABLE IF EXISTS public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coa_tenant_access" ON public.chart_of_accounts;
CREATE POLICY "coa_tenant_access" ON public.chart_of_accounts
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
      )
  );

-- ──────────────────────────────────────────────────────────────
-- SECTION 2: BACKUP / DIAGNOSTIC TABLES — block all public access
-- ──────────────────────────────────────────────────────────────

-- journal_entries_backup
ALTER TABLE IF EXISTS public.journal_entries_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jeb_deny_all" ON public.journal_entries_backup
  FOR ALL TO anon, authenticated USING (false);

-- account_balances_backup
ALTER TABLE IF EXISTS public.account_balances_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "abb_deny_all" ON public.account_balances_backup
  FOR ALL TO anon, authenticated USING (false);

-- customers_backup
ALTER TABLE IF EXISTS public.customers_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cb_deny_all" ON public.customers_backup
  FOR ALL TO anon, authenticated USING (false);

-- suppliers_backup
ALTER TABLE IF EXISTS public.suppliers_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sb_deny_all" ON public.suppliers_backup
  FOR ALL TO anon, authenticated USING (false);

-- unbalanced_journal_diagnostics — restrict to superadmin only
ALTER TABLE IF EXISTS public.unbalanced_journal_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ujd_superadmin_only" ON public.unbalanced_journal_diagnostics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════
-- SECTION 3: INVENTORY / WAREHOUSE TABLES
-- ══════════════════════════════════════════════════════════════

-- 3-A) warehouses
ALTER TABLE IF EXISTS public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_tenant_access" ON public.warehouses
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 3-B) warehouse_stock
ALTER TABLE IF EXISTS public.warehouse_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_tenant_access" ON public.warehouse_stock
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 3-C) inventory_transfers
ALTER TABLE IF EXISTS public.inventory_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it_tenant_access" ON public.inventory_transfers
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 3-D) inventory_transfer_items — join via transfer
ALTER TABLE IF EXISTS public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iti_tenant_access" ON public.inventory_transfer_items
  FOR ALL TO authenticated
  USING (
    transfer_id IN (
      SELECT id FROM public.inventory_transfers
      WHERE restaurant_id IN (
        SELECT id FROM public.restaurants
        WHERE user_id = auth.uid()
           OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
      )
    )
  );

-- 3-E) warehouse_stock_locations / stock_locations
ALTER TABLE IF EXISTS public.warehouse_stock_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wsl_tenant_access" ON public.warehouse_stock_locations
  FOR ALL TO authenticated
  USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses
      WHERE restaurant_id IN (
        SELECT id FROM public.restaurants
        WHERE user_id = auth.uid()
           OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
      )
    )
  );

ALTER TABLE IF EXISTS public.stock_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_tenant_access" ON public.stock_locations
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 3-F) stock_moves
ALTER TABLE IF EXISTS public.stock_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm_tenant_access" ON public.stock_moves
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- ══════════════════════════════════════════════════════════════
-- SECTION 4: MARKETING AGENCY TABLES
-- ══════════════════════════════════════════════════════════════

-- 4-A) marketing_projects
ALTER TABLE IF EXISTS public.marketing_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp_tenant_access" ON public.marketing_projects
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 4-B) ad_campaigns
ALTER TABLE IF EXISTS public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ac_tenant_access" ON public.ad_campaigns
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 4-C) ad_performance_metrics
ALTER TABLE IF EXISTS public.ad_performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apm_tenant_access" ON public.ad_performance_metrics
  FOR ALL TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.ad_campaigns
      WHERE restaurant_id IN (
        SELECT id FROM public.restaurants
        WHERE user_id = auth.uid()
           OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
      )
    )
  );

-- 4-D) ad_spend_expenses
ALTER TABLE IF EXISTS public.ad_spend_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ase_tenant_access" ON public.ad_spend_expenses
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 4-E) agency_employees
ALTER TABLE IF EXISTS public.agency_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ae_tenant_access" ON public.agency_employees
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 4-F) marketing_leads / marketing_crm_leads
ALTER TABLE IF EXISTS public.marketing_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_tenant_access" ON public.marketing_leads
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

ALTER TABLE IF EXISTS public.marketing_crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mcl_tenant_access" ON public.marketing_crm_leads
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 4-G) freelancers
ALTER TABLE IF EXISTS public.freelancers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fl_tenant_access" ON public.freelancers
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 4-H) staff_timesheets
ALTER TABLE IF EXISTS public.staff_timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_tenant_access" ON public.staff_timesheets
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 4-I) retainer_contracts
ALTER TABLE IF EXISTS public.retainer_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc_tenant_access" ON public.retainer_contracts
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 4-J) revenue_recognition
ALTER TABLE IF EXISTS public.revenue_recognition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_tenant_access" ON public.revenue_recognition
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- 4-K) employee_project_access
ALTER TABLE IF EXISTS public.employee_project_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epa_tenant_access" ON public.employee_project_access
  FOR ALL TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.marketing_projects
      WHERE restaurant_id IN (
        SELECT id FROM public.restaurants
        WHERE user_id = auth.uid()
           OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
      )
    )
  );

-- ══════════════════════════════════════════════════════════════
-- SECTION 5: PIPELINE / WORKFLOW STAGES (cross-tenant writable)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_tenant_access" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

ALTER TABLE IF EXISTS public.workflow_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wfs_tenant_access" ON public.workflow_stages
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- ══════════════════════════════════════════════════════════════
-- SECTION 6: EXCHANGE RATES (cross-tenant writable)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.exchange_rates ENABLE ROW LEVEL SECURITY;
-- Allow all authenticated to READ (rates are non-sensitive)
CREATE POLICY "er_read_all" ON public.exchange_rates
  FOR SELECT TO authenticated USING (true);
-- Only owner restaurant can write
CREATE POLICY "er_write_tenant" ON public.exchange_rates
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IS NULL OR restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "er_update_tenant" ON public.exchange_rates
  FOR UPDATE TO authenticated
  USING (
    restaurant_id IS NULL OR restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- ══════════════════════════════════════════════════════════════
-- SECTION 7: FACEBOOK / SOCIAL OAUTH CREDENTIALS (CRITICAL)
-- ══════════════════════════════════════════════════════════════

-- facebook_oauth_configs — restrict to owner restaurant only
ALTER TABLE IF EXISTS public.facebook_oauth_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foc_tenant_access" ON public.facebook_oauth_configs
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- facebook_ad_accounts
ALTER TABLE IF EXISTS public.facebook_ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faa_tenant_access" ON public.facebook_ad_accounts
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants
      WHERE user_id = auth.uid()
         OR id IN (SELECT restaurant_id FROM public.company_users WHERE user_id = auth.uid())
    )
  );

-- social_oauth_tokens — restrict to owner only
ALTER TABLE IF EXISTS public.social_oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sot_owner_only" ON public.social_oauth_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- SECTION 8: FIX SECURITY DEFINER FUNCTIONS — SET search_path
-- ══════════════════════════════════════════════════════════════

-- Patch known SECURITY DEFINER functions to pin search_path
DO $$
DECLARE
  func_name TEXT;
  funcs TEXT[] := ARRAY[
    'seed_global_coa',
    'execute_inventory_transfer',
    'upsert_pos_order',
    'save_receipt_voucher',
    'post_journal_entry',
    'create_journal_entry_transaction',
    'get_account_balance',
    'merge_duplicate_customers'
  ];
BEGIN
  FOREACH func_name IN ARRAY funcs
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION public.%I SET search_path = public, pg_temp',
        func_name
      );
    EXCEPTION WHEN OTHERS THEN
      -- Function may not exist, skip silently
      NULL;
    END;
  END LOOP;
END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 9: ANON ACCESS — Revoke public execute on sensitive RPCs
-- ══════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION IF EXISTS public.seed_global_coa(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION IF EXISTS public.execute_inventory_transfer(uuid, uuid, uuid, uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION IF EXISTS public.upsert_pos_order FROM anon;
REVOKE EXECUTE ON FUNCTION IF EXISTS public.save_receipt_voucher FROM anon;
REVOKE EXECUTE ON FUNCTION IF EXISTS public.post_journal_entry FROM anon;

-- Ensure only authenticated can call SECURITY DEFINER functions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname AS fname, p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM anon', r.fname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END$$;
