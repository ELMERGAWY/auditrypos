
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_warehouse_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS item_types_auth_read ON public.item_types;
CREATE POLICY item_types_auth_read ON public.item_types FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.item_types FROM anon;

DROP POLICY IF EXISTS project_sites_owner_all ON public.project_sites;
CREATE POLICY project_sites_owner_all ON public.project_sites FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS users_can_view_inventory_balances ON public.inventory_balances;
DROP POLICY IF EXISTS inventory_balances_tenant_all ON public.inventory_balances;
CREATE POLICY inventory_balances_tenant_all ON public.inventory_balances FOR ALL TO authenticated
  USING (sub_warehouse_id IN (SELECT sw.id FROM public.sub_warehouses sw JOIN public.warehouses w ON w.id = sw.warehouse_id WHERE w.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())))
  WITH CHECK (sub_warehouse_id IN (SELECT sw.id FROM public.sub_warehouses sw JOIN public.warehouses w ON w.id = sw.warehouse_id WHERE w.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS users_can_view_cost_layers ON public.inventory_cost_layers;
DROP POLICY IF EXISTS inventory_cost_layers_tenant_all ON public.inventory_cost_layers;
CREATE POLICY inventory_cost_layers_tenant_all ON public.inventory_cost_layers FOR ALL TO authenticated
  USING (sub_warehouse_id IN (SELECT sw.id FROM public.sub_warehouses sw JOIN public.warehouses w ON w.id = sw.warehouse_id WHERE w.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())))
  WITH CHECK (sub_warehouse_id IN (SELECT sw.id FROM public.sub_warehouses sw JOIN public.warehouses w ON w.id = sw.warehouse_id WHERE w.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS users_can_view_inventory_movements ON public.inventory_movements;
DROP POLICY IF EXISTS users_can_create_inventory_movements ON public.inventory_movements;
DROP POLICY IF EXISTS inventory_movements_tenant_all ON public.inventory_movements;
CREATE POLICY inventory_movements_tenant_all ON public.inventory_movements FOR ALL TO authenticated
  USING (sub_warehouse_id IN (SELECT sw.id FROM public.sub_warehouses sw JOIN public.warehouses w ON w.id = sw.warehouse_id WHERE w.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())))
  WITH CHECK (sub_warehouse_id IN (SELECT sw.id FROM public.sub_warehouses sw JOIN public.warehouses w ON w.id = sw.warehouse_id WHERE w.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS users_can_manage_item_warehouse_assignments ON public.item_warehouse_assignments;
DROP POLICY IF EXISTS users_can_view_item_warehouse_assignments ON public.item_warehouse_assignments;
DROP POLICY IF EXISTS item_warehouse_assignments_tenant_all ON public.item_warehouse_assignments;
CREATE POLICY item_warehouse_assignments_tenant_all ON public.item_warehouse_assignments FOR ALL TO authenticated
  USING (sub_warehouse_id IN (SELECT sw.id FROM public.sub_warehouses sw JOIN public.warehouses w ON w.id = sw.warehouse_id WHERE w.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())))
  WITH CHECK (sub_warehouse_id IN (SELECT sw.id FROM public.sub_warehouses sw JOIN public.warehouses w ON w.id = sw.warehouse_id WHERE w.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS "Enable all for authenticated" ON public.marketing_contracts;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.marketing_contract_services;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.marketing_quotes;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.marketing_quote_items;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.marketing_services;

DROP POLICY IF EXISTS marketing_services_tenant_all ON public.marketing_services;
CREATE POLICY marketing_services_tenant_all ON public.marketing_services FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS marketing_quotes_tenant_all ON public.marketing_quotes;
CREATE POLICY marketing_quotes_tenant_all ON public.marketing_quotes FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS marketing_quote_items_tenant_all ON public.marketing_quote_items;
CREATE POLICY marketing_quote_items_tenant_all ON public.marketing_quote_items FOR ALL TO authenticated
  USING (quote_id IN (SELECT id FROM public.marketing_quotes WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())))
  WITH CHECK (quote_id IN (SELECT id FROM public.marketing_quotes WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS marketing_contract_services_tenant_all ON public.marketing_contract_services;
CREATE POLICY marketing_contract_services_tenant_all ON public.marketing_contract_services FOR ALL TO authenticated
  USING (contract_id IN (SELECT id FROM public.marketing_contracts WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())))
  WITH CHECK (contract_id IN (SELECT id FROM public.marketing_contracts WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())));

DO $$
DECLARE t text; p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY['marketing_hourly_rates','marketing_project_costs','marketing_billing_schedule','marketing_project_revenue','marketing_profitability'])
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname LIKE 'Super admin%'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('DROP POLICY IF EXISTS super_admin_all_%s ON public.%I', t, t);
    EXECUTE format('CREATE POLICY super_admin_all_%s ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''super_admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''super_admin''::app_role))', t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Super admin can view all deliverables" ON public.marketing_service_deliverables;
DROP POLICY IF EXISTS "Super admin can insert deliverables" ON public.marketing_service_deliverables;
DROP POLICY IF EXISTS "Super admin can update deliverables" ON public.marketing_service_deliverables;
DROP POLICY IF EXISTS "Super admin can delete deliverables" ON public.marketing_service_deliverables;
DROP POLICY IF EXISTS "Users can view deliverables for their restaurant" ON public.marketing_service_deliverables;
DROP POLICY IF EXISTS "Users can insert deliverables for their restaurant" ON public.marketing_service_deliverables;
DROP POLICY IF EXISTS "Users can update deliverables for their restaurant" ON public.marketing_service_deliverables;
DROP POLICY IF EXISTS "Users can delete deliverables for their restaurant" ON public.marketing_service_deliverables;
DROP POLICY IF EXISTS deliverables_tenant_all ON public.marketing_service_deliverables;
CREATE POLICY deliverables_tenant_all ON public.marketing_service_deliverables FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS owner_all_payroll_transactions ON public.payroll_transactions;
CREATE POLICY owner_all_payroll_transactions ON public.payroll_transactions FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
      AND (p.proconfig IS NULL OR NOT (array_to_string(p.proconfig,',') ILIKE '%search_path%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

DO $$
DECLARE r record; keep text[] := ARRAY['create_storefront_order','check_for_update'];
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND NOT (p.proname = ANY(keep))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public', r.nspname, r.proname, r.args);
  END LOOP;
END $$;
