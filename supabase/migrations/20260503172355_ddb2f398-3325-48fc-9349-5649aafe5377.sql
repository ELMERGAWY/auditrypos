
-- ============================================================
-- SECURITY HARDENING: RLS, policies, storage, search_path
-- ============================================================

-- Helper: is platform super admin
-- (uses existing has_role + app_role enum if present)

-- ------------------------------------------------------------
-- 1) ENABLE RLS on tables that have it disabled
-- ------------------------------------------------------------
ALTER TABLE public.batch_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items_costing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_sale_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2) POLICIES — owner-scoped via restaurant_id
-- ------------------------------------------------------------
-- Macro pattern via DO block for tables that have restaurant_id
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'budgets','cost_centers','fixed_assets','inventory_audit_sessions',
    'inventory_consumption','inventory_settings','menu_items_costing',
    'payment_batches','payroll_transactions','staff_profiles','stock_batches',
    'bank_accounts','expense_vouchers','inventory_items','posting_queue',
    'purchase_invoices','restaurant_orders','retail_sales','service_invoices',
    'warehouses'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner_all_%1$s" ON public.%1$I', t);
    EXECUTE format($p$
      CREATE POLICY "owner_all_%1$s" ON public.%1$I
      FOR ALL TO authenticated
      USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    $p$, t);
  END LOOP;
END $$;

-- Tables scoped via company_id
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'business_profiles','account_budget_freezes','budget_variance_approvals',
    'gl_period_control_policies','gl_posting_alert_policies',
    'gl_posting_settings','role_permissions','workspaces'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner_all_%1$s" ON public.%1$I', t);
    EXECUTE format($p$
      CREATE POLICY "owner_all_%1$s" ON public.%1$I
      FOR ALL TO authenticated
      USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (public.user_owns_company(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    $p$, t);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3) Child/line tables — scoped via parent
-- ------------------------------------------------------------

-- batch_consumption (via inventory_batches.item_id -> inventory_items.restaurant_id)
DROP POLICY IF EXISTS "owner_all_batch_consumption" ON public.batch_consumption;
CREATE POLICY "owner_all_batch_consumption" ON public.batch_consumption
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.inventory_batches b
  JOIN public.inventory_items i ON i.id = b.item_id
  WHERE b.id = batch_consumption.batch_id
    AND public.is_restaurant_owner(auth.uid(), i.restaurant_id)
) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.inventory_batches b
  JOIN public.inventory_items i ON i.id = b.item_id
  WHERE b.id = batch_consumption.batch_id
    AND public.is_restaurant_owner(auth.uid(), i.restaurant_id)
) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- inventory_audit_lines (via inventory_audit_sessions.restaurant_id)
DROP POLICY IF EXISTS "owner_all_inventory_audit_lines" ON public.inventory_audit_lines;
CREATE POLICY "owner_all_inventory_audit_lines" ON public.inventory_audit_lines
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.inventory_audit_sessions s WHERE s.id = inventory_audit_lines.session_id AND public.is_restaurant_owner(auth.uid(), s.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.inventory_audit_sessions s WHERE s.id = inventory_audit_lines.session_id AND public.is_restaurant_owner(auth.uid(), s.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- payment_batch_items (via payment_batches.restaurant_id)
DROP POLICY IF EXISTS "owner_all_payment_batch_items" ON public.payment_batch_items;
CREATE POLICY "owner_all_payment_batch_items" ON public.payment_batch_items
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.payment_batches b WHERE b.id = payment_batch_items.batch_id AND public.is_restaurant_owner(auth.uid(), b.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.payment_batches b WHERE b.id = payment_batch_items.batch_id AND public.is_restaurant_owner(auth.uid(), b.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- purchase_lines (via purchase_invoices.restaurant_id)
DROP POLICY IF EXISTS "owner_all_purchase_lines" ON public.purchase_lines;
CREATE POLICY "owner_all_purchase_lines" ON public.purchase_lines
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.purchase_invoices p WHERE p.id = purchase_lines.purchase_id AND public.is_restaurant_owner(auth.uid(), p.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_invoices p WHERE p.id = purchase_lines.purchase_id AND public.is_restaurant_owner(auth.uid(), p.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- restaurant_order_lines (via restaurant_orders.restaurant_id)
DROP POLICY IF EXISTS "owner_all_restaurant_order_lines" ON public.restaurant_order_lines;
CREATE POLICY "owner_all_restaurant_order_lines" ON public.restaurant_order_lines
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurant_orders o WHERE o.id = restaurant_order_lines.order_id AND public.is_restaurant_owner(auth.uid(), o.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurant_orders o WHERE o.id = restaurant_order_lines.order_id AND public.is_restaurant_owner(auth.uid(), o.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- retail_sale_lines (via retail_sales.restaurant_id)
DROP POLICY IF EXISTS "owner_all_retail_sale_lines" ON public.retail_sale_lines;
CREATE POLICY "owner_all_retail_sale_lines" ON public.retail_sale_lines
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.retail_sales s WHERE s.id = retail_sale_lines.sale_id AND public.is_restaurant_owner(auth.uid(), s.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.retail_sales s WHERE s.id = retail_sale_lines.sale_id AND public.is_restaurant_owner(auth.uid(), s.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- order_taxes (via orders.restaurant_id)
DROP POLICY IF EXISTS "owner_all_order_taxes" ON public.order_taxes;
CREATE POLICY "owner_all_order_taxes" ON public.order_taxes
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_taxes.order_id AND public.is_restaurant_owner(auth.uid(), o.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_taxes.order_id AND public.is_restaurant_owner(auth.uid(), o.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- inventory_batches (via inventory_items.restaurant_id)
DROP POLICY IF EXISTS "owner_all_inventory_batches" ON public.inventory_batches;
CREATE POLICY "owner_all_inventory_batches" ON public.inventory_batches
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = inventory_batches.item_id AND public.is_restaurant_owner(auth.uid(), i.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = inventory_batches.item_id AND public.is_restaurant_owner(auth.uid(), i.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- inventory_stock (via inventory_items.restaurant_id)
DROP POLICY IF EXISTS "owner_all_inventory_stock" ON public.inventory_stock;
CREATE POLICY "owner_all_inventory_stock" ON public.inventory_stock
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = inventory_stock.item_id AND public.is_restaurant_owner(auth.uid(), i.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = inventory_stock.item_id AND public.is_restaurant_owner(auth.uid(), i.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- cost_layers (via inventory_items.restaurant_id - join on item_id)
DROP POLICY IF EXISTS "owner_all_cost_layers" ON public.cost_layers;
CREATE POLICY "owner_all_cost_layers" ON public.cost_layers
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = cost_layers.item_id AND public.is_restaurant_owner(auth.uid(), i.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = cost_layers.item_id AND public.is_restaurant_owner(auth.uid(), i.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- recipe_components (via menu_items.restaurant_id)
DROP POLICY IF EXISTS "owner_all_recipe_components" ON public.recipe_components;
CREATE POLICY "owner_all_recipe_components" ON public.recipe_components
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.menu_items m WHERE m.id = recipe_components.menu_item_id AND public.is_restaurant_owner(auth.uid(), m.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.menu_items m WHERE m.id = recipe_components.menu_item_id AND public.is_restaurant_owner(auth.uid(), m.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- bank_reconciliations (via bank_accounts.restaurant_id)
DROP POLICY IF EXISTS "owner_all_bank_reconciliations" ON public.bank_reconciliations;
CREATE POLICY "owner_all_bank_reconciliations" ON public.bank_reconciliations
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.bank_accounts a WHERE a.id = bank_reconciliations.bank_account_id AND public.is_restaurant_owner(auth.uid(), a.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.bank_accounts a WHERE a.id = bank_reconciliations.bank_account_id AND public.is_restaurant_owner(auth.uid(), a.restaurant_id))
       OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- bank_reconciliation_items (via bank_reconciliations -> bank_accounts.restaurant_id)
DROP POLICY IF EXISTS "owner_all_bank_reconciliation_items" ON public.bank_reconciliation_items;
CREATE POLICY "owner_all_bank_reconciliation_items" ON public.bank_reconciliation_items
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bank_reconciliations r
  JOIN public.bank_accounts a ON a.id = r.bank_account_id
  WHERE r.id = bank_reconciliation_items.reconciliation_id
    AND public.is_restaurant_owner(auth.uid(), a.restaurant_id)
) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bank_reconciliations r
  JOIN public.bank_accounts a ON a.id = r.bank_account_id
  WHERE r.id = bank_reconciliation_items.reconciliation_id
    AND public.is_restaurant_owner(auth.uid(), a.restaurant_id)
) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- ------------------------------------------------------------
-- 4) System / platform tables — read for related owners, write only super_admin
-- ------------------------------------------------------------

-- gl_posting_failures (has restaurant_id and company_id)
DROP POLICY IF EXISTS "owner_read_gl_posting_failures" ON public.gl_posting_failures;
DROP POLICY IF EXISTS "super_admin_all_gl_posting_failures" ON public.gl_posting_failures;
CREATE POLICY "owner_read_gl_posting_failures" ON public.gl_posting_failures
FOR SELECT TO authenticated
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.user_owns_company(company_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "super_admin_all_gl_posting_failures" ON public.gl_posting_failures
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

-- gl_posting_alert_events (company_id)
DROP POLICY IF EXISTS "owner_read_gl_posting_alert_events" ON public.gl_posting_alert_events;
DROP POLICY IF EXISTS "super_admin_all_gl_posting_alert_events" ON public.gl_posting_alert_events;
CREATE POLICY "owner_read_gl_posting_alert_events" ON public.gl_posting_alert_events
FOR SELECT TO authenticated
USING (public.user_owns_company(company_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "super_admin_all_gl_posting_alert_events" ON public.gl_posting_alert_events
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

-- gl_posting_retry_runs (no owner col -> super_admin only)
DROP POLICY IF EXISTS "super_admin_all_gl_posting_retry_runs" ON public.gl_posting_retry_runs;
CREATE POLICY "super_admin_all_gl_posting_retry_runs" ON public.gl_posting_retry_runs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

-- ------------------------------------------------------------
-- 5) Fix overly permissive policies (USING true)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own sales orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Users can manage their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can manage crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Users can manage crm_communication_logs" ON public.crm_communication_logs;
DROP POLICY IF EXISTS "Users can manage crm_tasks" ON public.crm_tasks;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sales_orders','purchase_orders','crm_leads','crm_communication_logs','crm_tasks'] LOOP
    EXECUTE format($p$
      CREATE POLICY "owner_all_%1$s" ON public.%1$I
      FOR ALL TO authenticated
      USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
      WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
    $p$, t);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 6) Storage: prevent listing of restaurant-assets bucket
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public reads assets" ON storage.objects;
-- Bucket is public so individual file URLs still work via CDN; we just no
-- longer expose the listing endpoint to the world.

-- ------------------------------------------------------------
-- 7) Pin search_path on every public function
-- ------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proconfig IS NULL OR NOT EXISTS(
            SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;
