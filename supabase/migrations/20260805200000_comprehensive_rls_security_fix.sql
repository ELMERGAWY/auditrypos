-- ============================================================
-- MIGRATION: 20260805200000_comprehensive_rls_security_fix.sql
-- PURPOSE: Fix all Critical & Warning RLS security issues
-- APPROACH: Fully defensive — each section wrapped in DO $$
--   so missing tables/columns are silently skipped.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- HELPER: Drop all existing policies on affected tables safely
-- ══════════════════════════════════════════════════════════════
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
        'warehouse_stock','warehouse_stock_locations','stock_locations',
        'stock_moves','warehouses',
        'exchange_rates',
        'marketing_projects','marketing_campaigns','ad_campaigns',
        'ad_performance_metrics','ad_spend_expenses',
        'marketing_leads','marketing_crm_leads',
        'agency_employees','freelancers',
        'staff_timesheets','retainer_contracts',
        'revenue_recognition','employee_project_access',
        'pipeline_stages','workflow_stages',
        'facebook_oauth_configs','facebook_ad_accounts',
        'social_media_accounts','social_oauth_tokens',
        'social_media_oauth_config'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- ══════════════════════════════════════════════════════════════
-- SHARED HELPER FUNCTION — get restaurant IDs for current user
-- This avoids repeating the subquery everywhere and is faster.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.auth_restaurant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.id
  FROM public.restaurants r
  WHERE r.owner_id = auth.uid()
  UNION
  SELECT r.id
  FROM public.restaurants r
  JOIN public.company_users cu ON cu.company_id = r.company_id
  WHERE cu.user_id = auth.uid()
    AND cu.is_active = true;
$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 1: ACCOUNTING / GENERAL LEDGER TABLES
-- ══════════════════════════════════════════════════════════════

-- 1-A) journal_entries
DO $$ BEGIN
  ALTER TABLE IF EXISTS public.journal_entries ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "je_tenant_access" ON public.journal_entries
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'journal_entries policy skipped: %', SQLERRM;
END$$;

-- 1-B) journal_entry_lines — FK column is "entry_id"
DO $$ BEGIN
  ALTER TABLE IF EXISTS public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "jel_tenant_access" ON public.journal_entry_lines
    FOR ALL TO authenticated
    USING (
      entry_id IN (
        SELECT id FROM public.journal_entries
        WHERE restaurant_id IN (SELECT public.auth_restaurant_ids())
      )
    )
    WITH CHECK (
      entry_id IN (
        SELECT id FROM public.journal_entries
        WHERE restaurant_id IN (SELECT public.auth_restaurant_ids())
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'journal_entry_lines policy skipped: %', SQLERRM;
END$$;

-- 1-C) chart_of_accounts
DO $$ BEGIN
  ALTER TABLE IF EXISTS public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "coa_tenant_access" ON public.chart_of_accounts;
  CREATE POLICY "coa_tenant_access" ON public.chart_of_accounts
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'chart_of_accounts policy skipped: %', SQLERRM;
END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 2: BACKUP / DIAGNOSTIC TABLES — full block
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.journal_entries_backup ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "jeb_deny_all" ON public.journal_entries_backup
    FOR ALL TO anon, authenticated USING (false);
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.account_balances_backup ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "abb_deny_all" ON public.account_balances_backup
    FOR ALL TO anon, authenticated USING (false);
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.customers_backup ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "cb_deny_all" ON public.customers_backup
    FOR ALL TO anon, authenticated USING (false);
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.suppliers_backup ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "sb_deny_all" ON public.suppliers_backup
    FOR ALL TO anon, authenticated USING (false);
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.unbalanced_journal_diagnostics ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ujd_superadmin_only" ON public.unbalanced_journal_diagnostics
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 3: INVENTORY / WAREHOUSE TABLES
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.warehouses ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "wh_tenant_access" ON public.warehouses
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'warehouses policy skipped: %', SQLERRM;
END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.warehouse_stock ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ws_tenant_access" ON public.warehouse_stock
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'warehouse_stock policy skipped: %', SQLERRM;
END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.inventory_transfers ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "it_tenant_access" ON public.inventory_transfers
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'inventory_transfers policy skipped: %', SQLERRM;
END$$;

-- inventory_transfer_items: try restaurant_id first, fall back to transfer_id join
DO $$ BEGIN
  ALTER TABLE IF EXISTS public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_transfer_items' AND column_name='restaurant_id'
  ) THEN
    CREATE POLICY "iti_tenant_access" ON public.inventory_transfer_items
      FOR ALL TO authenticated
      USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
      WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
  ELSE
    CREATE POLICY "iti_tenant_access" ON public.inventory_transfer_items
      FOR ALL TO authenticated
      USING (
        transfer_id IN (
          SELECT id FROM public.inventory_transfers
          WHERE restaurant_id IN (SELECT public.auth_restaurant_ids())
        )
      );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'inventory_transfer_items policy skipped: %', SQLERRM;
END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.stock_locations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "sl_tenant_access" ON public.stock_locations
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.warehouse_stock_locations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "wsl_tenant_access" ON public.warehouse_stock_locations
    FOR ALL TO authenticated
    USING (
      warehouse_id IN (
        SELECT id FROM public.warehouses
        WHERE restaurant_id IN (SELECT public.auth_restaurant_ids())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.stock_moves ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "sm_tenant_access" ON public.stock_moves
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 4: MARKETING / AGENCY TABLES
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.marketing_projects ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "mp_tenant_access" ON public.marketing_projects
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.ad_campaigns ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ac_tenant_access" ON public.ad_campaigns
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.ad_performance_metrics ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "apm_tenant_access" ON public.ad_performance_metrics
    FOR ALL TO authenticated
    USING (
      campaign_id IN (
        SELECT id FROM public.ad_campaigns
        WHERE restaurant_id IN (SELECT public.auth_restaurant_ids())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.ad_spend_expenses ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ase_tenant_access" ON public.ad_spend_expenses
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.agency_employees ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ae_tenant_access" ON public.agency_employees
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.marketing_leads ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ml_tenant_access" ON public.marketing_leads
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.marketing_crm_leads ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "mcl_tenant_access" ON public.marketing_crm_leads
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.freelancers ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "fl_tenant_access" ON public.freelancers
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.staff_timesheets ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "st_tenant_access" ON public.staff_timesheets
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.retainer_contracts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "rc_tenant_access" ON public.retainer_contracts
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.revenue_recognition ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "rr_tenant_access" ON public.revenue_recognition
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.employee_project_access ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "epa_tenant_access" ON public.employee_project_access
    FOR ALL TO authenticated
    USING (
      project_id IN (
        SELECT id FROM public.marketing_projects
        WHERE restaurant_id IN (SELECT public.auth_restaurant_ids())
      )
    );
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 5: PIPELINE / WORKFLOW STAGES
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.pipeline_stages ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ps_tenant_access" ON public.pipeline_stages
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.workflow_stages ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "wfs_tenant_access" ON public.workflow_stages
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 6: EXCHANGE RATES
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.exchange_rates ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "er_read_all" ON public.exchange_rates
    FOR SELECT TO authenticated USING (true);
  CREATE POLICY "er_write_tenant" ON public.exchange_rates
    FOR INSERT TO authenticated
    WITH CHECK (
      restaurant_id IS NULL
      OR restaurant_id IN (SELECT public.auth_restaurant_ids())
    );
  CREATE POLICY "er_update_tenant" ON public.exchange_rates
    FOR UPDATE TO authenticated
    USING (
      restaurant_id IS NULL
      OR restaurant_id IN (SELECT public.auth_restaurant_ids())
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'exchange_rates policy skipped: %', SQLERRM;
END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 7: OAUTH / SOCIAL CREDENTIALS (CRITICAL)
-- ══════════════════════════════════════════════════════════════

-- facebook_oauth_configs (if exists)
DO $$ BEGIN
  ALTER TABLE IF EXISTS public.facebook_oauth_configs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "foc_tenant_access" ON public.facebook_oauth_configs
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- facebook_ad_accounts (if exists)
DO $$ BEGIN
  ALTER TABLE IF EXISTS public.facebook_ad_accounts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "faa_tenant_access" ON public.facebook_ad_accounts
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- social_media_accounts (actual table from migration 20260726)
DO $$ BEGIN
  ALTER TABLE IF EXISTS public.social_media_accounts ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Users can view own restaurant social accounts" ON public.social_media_accounts;
  DROP POLICY IF EXISTS "Users can insert own restaurant social accounts" ON public.social_media_accounts;
  DROP POLICY IF EXISTS "Users can update own restaurant social accounts" ON public.social_media_accounts;
  DROP POLICY IF EXISTS "Users can delete own restaurant social accounts" ON public.social_media_accounts;
  CREATE POLICY "sma_tenant_access" ON public.social_media_accounts
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- social_media_oauth_config (actual table from migration 20260726)
DO $$ BEGIN
  ALTER TABLE IF EXISTS public.social_media_oauth_config ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "smoc_tenant_access" ON public.social_media_oauth_config
    FOR ALL TO authenticated
    USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
    WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- social_oauth_tokens (if exists — user_id based)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_oauth_tokens') THEN
    ALTER TABLE IF EXISTS public.social_oauth_tokens ENABLE ROW LEVEL SECURITY;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='social_oauth_tokens' AND column_name='user_id'
    ) THEN
      CREATE POLICY "sot_owner_only" ON public.social_oauth_tokens
        FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    ELSE
      CREATE POLICY "sot_tenant_access" ON public.social_oauth_tokens
        FOR ALL TO authenticated
        USING  (restaurant_id IN (SELECT public.auth_restaurant_ids()))
        WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()));
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 8: PIN search_path ON ALL SECURITY DEFINER FUNCTIONS
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname AS fname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp',
        r.fname, r.args
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 9: REVOKE anon EXECUTE FROM ALL SECURITY DEFINER FUNCTIONS
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname AS fname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
        r.fname, r.args
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END$$;
