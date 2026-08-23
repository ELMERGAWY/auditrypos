-- AuditryPOS inventory isolation and deterministic cash customer guard.
-- Additive/data-preserving: no reset, truncate, broad delete, or quantity rewrite.

BEGIN;

ALTER TABLE public.sub_warehouses
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.item_warehouse_assignments
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sub_warehouses_workspace_scope
  ON public.sub_warehouses (workspace_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_item_warehouse_assignments_workspace_scope
  ON public.item_warehouse_assignments (workspace_id, item_id, sub_warehouse_id)
  WHERE COALESCE(is_active, true) AND deleted_at IS NULL;

-- Backfill only missing scope metadata from already-linked parent rows.
UPDATE public.sub_warehouses sw
SET workspace_id = w.workspace_id
FROM public.warehouses w
WHERE w.id = sw.warehouse_id
  AND sw.workspace_id IS NULL
  AND w.workspace_id IS NOT NULL;

UPDATE public.item_warehouse_assignments AS iwa
SET workspace_id = COALESCE(
  (SELECT p.workspace_id FROM public.products p WHERE p.id = iwa.item_id),
  (SELECT w.workspace_id
   FROM public.sub_warehouses sw
   JOIN public.warehouses w ON w.id = sw.warehouse_id
   WHERE sw.id = iwa.sub_warehouse_id)
)
WHERE iwa.workspace_id IS NULL
  AND COALESCE(
    (SELECT p.workspace_id FROM public.products p WHERE p.id = iwa.item_id),
    (SELECT w.workspace_id
     FROM public.sub_warehouses sw
     JOIN public.warehouses w ON w.id = sw.warehouse_id
     WHERE sw.id = iwa.sub_warehouse_id)
  ) IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_validate_sub_warehouse_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_restaurant_id uuid;
  v_workspace_id uuid;
BEGIN
  SELECT w.restaurant_id, w.workspace_id
    INTO v_restaurant_id, v_workspace_id
  FROM public.warehouses w
  WHERE w.id = NEW.warehouse_id
    AND w.deleted_at IS NULL;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'المخزن الرئيسي غير موجود أو غير نشط';
  END IF;

  IF NEW.workspace_id IS NOT NULL
     AND v_workspace_id IS NOT NULL
     AND NEW.workspace_id IS DISTINCT FROM v_workspace_id THEN
    RAISE EXCEPTION 'المخزن الفرعي لا يتبع فرع المخزن الرئيسي';
  END IF;

  NEW.workspace_id := COALESCE(v_workspace_id, NEW.workspace_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_sub_warehouse_scope ON public.sub_warehouses;
CREATE TRIGGER trg_validate_sub_warehouse_scope
BEFORE INSERT OR UPDATE OF warehouse_id, workspace_id ON public.sub_warehouses
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_sub_warehouse_scope();

CREATE OR REPLACE FUNCTION public.tg_validate_item_warehouse_assignment_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_restaurant uuid;
  v_product_workspace uuid;
  v_warehouse_restaurant uuid;
  v_warehouse_workspace uuid;
BEGIN
  SELECT p.restaurant_id, p.workspace_id
    INTO v_product_restaurant, v_product_workspace
  FROM public.products p
  WHERE p.id = NEW.item_id;

  SELECT w.restaurant_id, w.workspace_id
    INTO v_warehouse_restaurant, v_warehouse_workspace
  FROM public.sub_warehouses sw
  JOIN public.warehouses w ON w.id = sw.warehouse_id
  WHERE sw.id = NEW.sub_warehouse_id
    AND sw.deleted_at IS NULL
    AND w.deleted_at IS NULL;

  IF v_product_restaurant IS NULL OR v_warehouse_restaurant IS NULL THEN
    RAISE EXCEPTION 'الصنف أو المخزن الفرعي غير موجود أو غير نشط';
  END IF;

  IF v_product_restaurant IS DISTINCT FROM v_warehouse_restaurant
     OR (v_product_workspace IS NOT NULL AND v_warehouse_workspace IS NOT NULL
         AND v_product_workspace IS DISTINCT FROM v_warehouse_workspace) THEN
    RAISE EXCEPTION 'لا يمكن ربط صنف بمخزن من شركة أو فرع مختلف';
  END IF;

  IF NEW.workspace_id IS NOT NULL
     AND v_warehouse_workspace IS NOT NULL
     AND NEW.workspace_id IS DISTINCT FROM v_warehouse_workspace THEN
    RAISE EXCEPTION 'نطاق ارتباط الصنف لا يطابق نطاق المخزن';
  END IF;

  IF NEW.workspace_id IS NOT NULL
     AND v_product_workspace IS NOT NULL
     AND NEW.workspace_id IS DISTINCT FROM v_product_workspace THEN
    RAISE EXCEPTION 'نطاق ارتباط الصنف لا يطابق نطاق الصنف';
  END IF;

  NEW.workspace_id := COALESCE(v_product_workspace, v_warehouse_workspace, NEW.workspace_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_item_warehouse_assignment_scope ON public.item_warehouse_assignments;
CREATE TRIGGER trg_validate_item_warehouse_assignment_scope
BEFORE INSERT OR UPDATE OF item_id, sub_warehouse_id, workspace_id ON public.item_warehouse_assignments
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_item_warehouse_assignment_scope();

-- Keep the legacy RPC signature for existing callers, but make it strict,
-- idempotent, and workspace-aware through the linked product and warehouse.
CREATE OR REPLACE FUNCTION public.insert_item_warehouse_assignment(
  p_item_id uuid,
  p_sub_warehouse_id uuid,
  p_costing_method text,
  p_accounting_standard text,
  p_inventory_valuation_rule text,
  p_is_primary boolean,
  p_min_stock_level numeric,
  p_max_stock_level numeric,
  p_reorder_point numeric,
  p_reorder_quantity numeric,
  p_stock_unit text,
  p_sales_unit text,
  p_purchase_unit text,
  p_lead_time_days integer,
  p_low_stock_alert boolean,
  p_overstock_alert boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product public.products;
  v_sub public.sub_warehouses;
  v_warehouse public.warehouses;
  v_existing_id uuid;
  v_scope uuid;
BEGIN
  SELECT * INTO v_product
  FROM public.products p
  WHERE p.id = p_item_id
  FOR SHARE;

  SELECT * INTO v_sub
  FROM public.sub_warehouses sw
  WHERE sw.id = p_sub_warehouse_id
    AND sw.deleted_at IS NULL
  FOR SHARE;

  SELECT * INTO v_warehouse
  FROM public.warehouses w
  WHERE w.id = v_sub.warehouse_id
    AND w.deleted_at IS NULL
  FOR SHARE;

  IF NOT FOUND OR v_product.id IS NULL OR v_sub.id IS NULL OR v_warehouse.id IS NULL THEN
    RAISE EXCEPTION 'الصنف أو المخزن الفرعي غير موجود';
  END IF;

  IF v_product.restaurant_id IS DISTINCT FROM v_warehouse.restaurant_id
     OR (v_product.workspace_id IS NOT NULL AND v_warehouse.workspace_id IS NOT NULL
         AND v_product.workspace_id IS DISTINCT FROM v_warehouse.workspace_id) THEN
    RAISE EXCEPTION 'لا يمكن ربط صنف بمخزن من شركة أو فرع مختلف';
  END IF;

  v_scope := COALESCE(v_product.workspace_id, v_warehouse.workspace_id, v_sub.workspace_id);

  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
     AND NOT public.is_restaurant_owner(auth.uid(), v_product.restaurant_id)
     AND (v_scope IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.auth_workspace_ids() aw WHERE aw = v_scope
     )) THEN
    RAISE EXCEPTION 'غير مصرح بربط الصنف بهذا المخزن';
  END IF;

  -- Serialize the same item/warehouse pair so repeated clicks cannot create duplicates.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('item-warehouse-assignment:' || p_item_id::text || ':' || p_sub_warehouse_id::text, 0)
  );

  IF p_is_primary THEN
    UPDATE public.item_warehouse_assignments
    SET is_primary = false,
        updated_at = now()
    WHERE item_id = p_item_id
      AND workspace_id IS NOT DISTINCT FROM v_scope
      AND COALESCE(is_active, true)
      AND deleted_at IS NULL;
  END IF;

  SELECT iwa.id INTO v_existing_id
  FROM public.item_warehouse_assignments iwa
  WHERE iwa.item_id = p_item_id
    AND iwa.sub_warehouse_id = p_sub_warehouse_id
    AND COALESCE(iwa.is_active, true)
    AND iwa.deleted_at IS NULL
  ORDER BY iwa.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.item_warehouse_assignments (
      item_id, sub_warehouse_id, workspace_id, is_active, is_primary,
      min_stock_level, max_stock_level, reorder_point, reorder_quantity,
      costing_method, accounting_standard, inventory_valuation_rule,
      stock_unit, sales_unit, purchase_unit, lead_time_days,
      low_stock_alert, overstock_alert, created_by, created_at, updated_at, deleted_at
    ) VALUES (
      p_item_id, p_sub_warehouse_id, v_scope, true, COALESCE(p_is_primary, false),
      GREATEST(COALESCE(p_min_stock_level, 0), 0), p_max_stock_level, p_reorder_point, p_reorder_quantity,
      COALESCE(NULLIF(upper(p_costing_method), ''), 'AVERAGE'),
      COALESCE(NULLIF(upper(replace(p_accounting_standard, '-', '_')), ''), 'IFRS'),
      COALESCE(NULLIF(upper(p_inventory_valuation_rule), ''), 'IAS2_AVERAGE'),
      NULLIF(BTRIM(p_stock_unit), ''), NULLIF(BTRIM(p_sales_unit), ''), NULLIF(BTRIM(p_purchase_unit), ''),
      GREATEST(COALESCE(p_lead_time_days, 0), 0), COALESCE(p_low_stock_alert, true), COALESCE(p_overstock_alert, false),
      auth.uid(), now(), now(), NULL
    );
  ELSE
    UPDATE public.item_warehouse_assignments
    SET workspace_id = v_scope,
        is_active = true,
        is_primary = COALESCE(p_is_primary, false),
        min_stock_level = GREATEST(COALESCE(p_min_stock_level, 0), 0),
        max_stock_level = p_max_stock_level,
        reorder_point = p_reorder_point,
        reorder_quantity = p_reorder_quantity,
        costing_method = COALESCE(NULLIF(upper(p_costing_method), ''), costing_method),
        accounting_standard = COALESCE(NULLIF(upper(replace(p_accounting_standard, '-', '_')), ''), accounting_standard),
        inventory_valuation_rule = COALESCE(NULLIF(upper(p_inventory_valuation_rule), ''), inventory_valuation_rule),
        stock_unit = NULLIF(BTRIM(p_stock_unit), ''),
        sales_unit = NULLIF(BTRIM(p_sales_unit), ''),
        purchase_unit = NULLIF(BTRIM(p_purchase_unit), ''),
        lead_time_days = GREATEST(COALESCE(p_lead_time_days, 0), 0),
        low_stock_alert = COALESCE(p_low_stock_alert, low_stock_alert),
        overstock_alert = COALESCE(p_overstock_alert, overstock_alert),
        updated_at = now(),
        deleted_at = NULL
    WHERE id = v_existing_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_item_warehouse_assignment(uuid, uuid, text, text, text, boolean, numeric, numeric, numeric, numeric, text, text, text, integer, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insert_item_warehouse_assignment(uuid, uuid, text, text, text, boolean, numeric, numeric, numeric, numeric, text, text, text, integer, boolean, boolean) TO authenticated, service_role;

-- One deterministic walk-in customer per restaurant. The stable reference is
-- safe to expose as a business key and is also used by Manager mapping/outbox.
CREATE OR REPLACE FUNCTION public.get_or_create_cash_customer(
  p_restaurant_id uuid,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id uuid;
  v_ref text := 'CASH-' || upper(substr(md5(p_restaurant_id::text), 1, 12));
  v_company_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
     AND NOT public.is_restaurant_owner(auth.uid(), p_restaurant_id)
     AND NOT EXISTS (SELECT 1 FROM public.auth_restaurant_ids() ar WHERE ar = p_restaurant_id) THEN
    RAISE EXCEPTION 'غير مصرح بإنشاء العميل النقدي لهذا النشاط';
  END IF;

  IF p_workspace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND w.restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'workspace لا يتبع النشاط المحدد';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('cash-customer:' || p_restaurant_id::text, 0));

  SELECT r.company_id INTO v_company_id
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id;

  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.restaurant_id = p_restaurant_id
    AND c.customer_ref = v_ref
  ORDER BY c.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_customer_id IS NULL THEN
    SELECT c.id INTO v_customer_id
    FROM public.customers c
    WHERE c.restaurant_id = p_restaurant_id
      AND lower(BTRIM(c.name)) IN ('عميل نقدي', 'cash customer', 'walk-in customer')
    ORDER BY c.created_at
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      restaurant_id, company_id, workspace_id, customer_code, name, phone,
      customer_type, balance, current_balance, credit_limit, is_active, customer_ref, notes
    ) VALUES (
      p_restaurant_id, v_company_id, NULL, v_ref, 'عميل نقدي', '',
      'cash', 0, 0, 0, true, v_ref, 'عميل افتراضي للمبيعات النقدية؛ لا يستخدم للحسابات الآجلة'
    )
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET customer_ref = v_ref,
        customer_code = COALESCE(NULLIF(customer_code, ''), v_ref),
        customer_type = CASE
          WHEN lower(COALESCE(customer_type, '')) IN ('cash', 'walk_in', 'walk-in') THEN customer_type
          ELSE 'cash'
        END,
        is_active = true,
        -- Cash customer is a restaurant-level shared master record; the
        -- workspace argument is authorization context, not row ownership.
        workspace_id = NULL,
        updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  RETURN v_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_cash_customer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_cash_customer(uuid, uuid) TO authenticated, service_role;

-- Replace permissive restaurant-only policies with workspace-aware policies.
DROP POLICY IF EXISTS "Owner manages sub_warehouses" ON public.sub_warehouses;
DROP POLICY IF EXISTS "Owner views sub_warehouses" ON public.sub_warehouses;
DROP POLICY IF EXISTS users_can_manage_sub_warehouses ON public.sub_warehouses;
DROP POLICY IF EXISTS users_can_view_sub_warehouses ON public.sub_warehouses;
DROP POLICY IF EXISTS item_warehouse_assignments_tenant_all ON public.item_warehouse_assignments;
DROP POLICY IF EXISTS users_can_manage_item_warehouse_assignments ON public.item_warehouse_assignments;
DROP POLICY IF EXISTS users_can_view_item_warehouse_assignments ON public.item_warehouse_assignments;

CREATE POLICY sub_warehouses_workspace_all
ON public.sub_warehouses
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = sub_warehouses.warehouse_id
      AND w.deleted_at IS NULL
      AND (
        public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.is_restaurant_owner(auth.uid(), w.restaurant_id)
        OR EXISTS (SELECT 1 FROM public.auth_workspace_ids() aw WHERE aw = w.workspace_id)
      )
      AND sub_warehouses.workspace_id IS NOT DISTINCT FROM w.workspace_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = sub_warehouses.warehouse_id
      AND w.deleted_at IS NULL
      AND (
        public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.is_restaurant_owner(auth.uid(), w.restaurant_id)
        OR EXISTS (SELECT 1 FROM public.auth_workspace_ids() aw WHERE aw = w.workspace_id)
      )
      AND sub_warehouses.workspace_id IS NOT DISTINCT FROM w.workspace_id
  )
);

CREATE POLICY item_warehouse_assignments_workspace_all
ON public.item_warehouse_assignments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.sub_warehouses sw ON sw.id = item_warehouse_assignments.sub_warehouse_id
    JOIN public.warehouses w ON w.id = sw.warehouse_id
    WHERE p.id = item_warehouse_assignments.item_id
      AND p.restaurant_id = w.restaurant_id
      AND p.workspace_id IS NOT DISTINCT FROM w.workspace_id
      AND item_warehouse_assignments.workspace_id IS NOT DISTINCT FROM w.workspace_id
      AND (
        public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.is_restaurant_owner(auth.uid(), p.restaurant_id)
        OR EXISTS (SELECT 1 FROM public.auth_workspace_ids() aw WHERE aw = COALESCE(item_warehouse_assignments.workspace_id, w.workspace_id))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.sub_warehouses sw ON sw.id = item_warehouse_assignments.sub_warehouse_id
    JOIN public.warehouses w ON w.id = sw.warehouse_id
    WHERE p.id = item_warehouse_assignments.item_id
      AND p.restaurant_id = w.restaurant_id
      AND p.workspace_id IS NOT DISTINCT FROM w.workspace_id
      AND item_warehouse_assignments.workspace_id IS NOT DISTINCT FROM w.workspace_id
      AND (
        public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.is_restaurant_owner(auth.uid(), p.restaurant_id)
        OR EXISTS (SELECT 1 FROM public.auth_workspace_ids() aw WHERE aw = COALESCE(item_warehouse_assignments.workspace_id, w.workspace_id))
      )
  )
);

COMMIT;

NOTIFY pgrst, 'reload schema';
