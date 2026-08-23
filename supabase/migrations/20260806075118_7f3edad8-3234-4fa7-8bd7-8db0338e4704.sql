-- 1. Fix mutable search_path on all public functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- 2. Harden storefront order RPC: server-side pricing only
CREATE OR REPLACE FUNCTION public.create_storefront_order(
  p_restaurant_id uuid, p_items jsonb, p_customer_name text, p_customer_phone text,
  p_delivery_address text DEFAULT NULL::text, p_notes text DEFAULT NULL::text,
  p_order_type text DEFAULT 'takeaway'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_total_amount numeric := 0;
  v_item jsonb;
  v_restaurant_name text;
  v_price numeric;
  v_qty numeric;
  v_menu_id uuid;
  v_product_id uuid;
  v_item_id uuid;
  v_name text;
  v_image text;
  v_db_price numeric;
BEGIN
  SELECT name INTO v_restaurant_name FROM public.restaurants
  WHERE id = p_restaurant_id AND status IN ('active', 'trial');
  IF v_restaurant_name IS NULL THEN RAISE EXCEPTION 'المتجر غير متاح حالياً'; END IF;

  -- First pass: total is computed ONLY from stored prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::numeric, 1));
    v_menu_id := NULLIF(v_item->>'menu_item_id', '')::uuid;
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_item_id := COALESCE(v_menu_id, v_product_id);
    v_db_price := NULL;

    IF v_item_id IS NOT NULL THEN
      SELECT price INTO v_db_price FROM public.menu_items
      WHERE id = v_item_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      IF v_db_price IS NULL THEN
        SELECT price INTO v_db_price FROM public.products
        WHERE id = v_item_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      END IF;
    END IF;

    IF v_db_price IS NULL THEN
      RAISE EXCEPTION 'صنف غير صالح أو غير متاح في هذا المتجر';
    END IF;

    v_total_amount := v_total_amount + (v_db_price * v_qty);
  END LOOP;

  IF v_total_amount <= 0 THEN
    RAISE EXCEPTION 'لا توجد أصناف صالحة في الطلب';
  END IF;

  v_order_number := 'SF-' || to_char(now(), 'YYMMDD') || '-' || lpad((extract(epoch from now())::bigint % 100000)::text, 5, '0');

  INSERT INTO public.orders (
    restaurant_id, order_number, order_type, total, status,
    customer_name, customer_phone, delivery_address, notes,
    payment_method, paid_amount, created_at
  ) VALUES (
    p_restaurant_id, v_order_number, COALESCE(p_order_type, 'takeaway'),
    v_total_amount, 'pending', COALESCE(p_customer_name, ''), COALESCE(p_customer_phone, ''),
    p_delivery_address, COALESCE(p_notes, ''), 'cash', 0, now()
  ) RETURNING id INTO v_order_id;

  -- Second pass: line items also priced from the database only
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::numeric, 1));
    v_menu_id := NULLIF(v_item->>'menu_item_id', '')::uuid;
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_item_id := COALESCE(v_menu_id, v_product_id);
    v_db_price := NULL; v_name := NULL; v_image := NULL;

    SELECT name, price, image INTO v_name, v_db_price, v_image FROM public.menu_items
    WHERE id = v_item_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;

    IF v_db_price IS NOT NULL THEN
      v_menu_id := v_item_id; v_product_id := NULL;
    ELSE
      SELECT name, price, image INTO v_name, v_db_price, v_image FROM public.products
      WHERE id = v_item_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      IF v_db_price IS NULL THEN
        RAISE EXCEPTION 'صنف غير صالح أو غير متاح في هذا المتجر';
      END IF;
      v_product_id := v_item_id; v_menu_id := NULL;
    END IF;

    v_price := v_db_price;

    INSERT INTO public.order_items (
      order_id, menu_item_id, product_id, menu_item_name, menu_item_image,
      quantity, price, sold_unit, unit_factor, variables, line_total
    ) VALUES (
      v_order_id, v_menu_id, v_product_id, COALESCE(v_name, 'صنف'), COALESCE(v_image, '📦'),
      v_qty, v_price, COALESCE(v_item->>'sold_unit', 'قطعة'),
      COALESCE((v_item->>'unit_factor')::numeric, 1),
      CASE WHEN v_item ? 'variables' THEN v_item->'variables' ELSE NULL END,
      v_qty * v_price
    );
  END LOOP;

  INSERT INTO public.notifications (restaurant_id, target_type, title, body, type, metadata)
  VALUES (
    p_restaurant_id, 'owner', 'طلب جديد من المتجر الإلكتروني',
    'تم استلام طلب جديد من ' || COALESCE(p_customer_name, 'عميل') || ' - الإجمالي: ' || v_total_amount,
    'order', jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number)
  );

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number, 'total', v_total_amount);
END;
$function$;

-- 3. Revoke anon EXECUTE on SECURITY DEFINER functions (except public storefront ones)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname NOT IN ('create_storefront_order','upsert_abandoned_cart','mark_cart_converted','get_tracking_pixels')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- 4. RLS on unprotected tables
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS abandoned_carts_owner_only ON public.abandoned_carts;
CREATE POLICY abandoned_carts_owner_only ON public.abandoned_carts
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT public.auth_restaurant_ids()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()) OR public.has_role(auth.uid(), 'super_admin'::app_role));
REVOKE ALL ON public.abandoned_carts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.abandoned_carts TO authenticated;
GRANT ALL ON public.abandoned_carts TO service_role;

DO $backup_balance_rls$
BEGIN
  IF to_regclass('public.customer_balances_backup') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.customer_balances_backup ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS customer_balances_backup_owner_only ON public.customer_balances_backup';
    EXECUTE $stmt$
      CREATE POLICY customer_balances_backup_owner_only ON public.customer_balances_backup
      FOR ALL TO authenticated
      USING (restaurant_id IN (SELECT public.auth_restaurant_ids()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    $stmt$;
    EXECUTE 'REVOKE ALL ON public.customer_balances_backup FROM anon';
    EXECUTE 'GRANT SELECT ON public.customer_balances_backup TO authenticated';
    EXECUTE 'GRANT ALL ON public.customer_balances_backup TO service_role';
  ELSE
    RAISE NOTICE 'customer_balances_backup is not installed; skipped optional RLS';
  END IF;

  IF to_regclass('public.supplier_balances_backup') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.supplier_balances_backup ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS supplier_balances_backup_owner_only ON public.supplier_balances_backup';
    EXECUTE $stmt$
      CREATE POLICY supplier_balances_backup_owner_only ON public.supplier_balances_backup
      FOR ALL TO authenticated
      USING (restaurant_id IN (SELECT public.auth_restaurant_ids()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    $stmt$;
    EXECUTE 'REVOKE ALL ON public.supplier_balances_backup FROM anon';
    EXECUTE 'GRANT SELECT ON public.supplier_balances_backup TO authenticated';
    EXECUTE 'GRANT ALL ON public.supplier_balances_backup TO service_role';
  ELSE
    RAISE NOTICE 'supplier_balances_backup is not installed; skipped optional RLS';
  END IF;
END;
$backup_balance_rls$;

DO $unbalanced_journal_rls$
BEGIN
  IF to_regclass('public.unbalanced_journal_entries') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.unbalanced_journal_entries ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS unbalanced_journal_entries_admin_only ON public.unbalanced_journal_entries';
    EXECUTE $stmt$
      CREATE POLICY unbalanced_journal_entries_admin_only ON public.unbalanced_journal_entries
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role))
    $stmt$;
    EXECUTE 'REVOKE ALL ON public.unbalanced_journal_entries FROM anon';
    EXECUTE 'GRANT SELECT ON public.unbalanced_journal_entries TO authenticated';
    EXECUTE 'GRANT ALL ON public.unbalanced_journal_entries TO service_role';
  ELSE
    RAISE NOTICE 'unbalanced_journal_entries is not installed; skipped optional RLS';
  END IF;
END;
$unbalanced_journal_rls$;

-- 5. Tenant-scope all open marketing policies
DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY[
    'marketing_ad_campaigns','marketing_ad_performance','marketing_ad_spend_expenses',
    'marketing_agency_employees','marketing_employee_project_access','marketing_exchange_rates',
    'marketing_facebook_accounts','marketing_facebook_pages','marketing_freelancer_payments',
    'marketing_freelancers','marketing_pipeline_stages','marketing_project_tasks',
    'marketing_retainer_contracts','marketing_retainer_invoices','marketing_revenue_recognition',
    'marketing_revenue_recognition_entries','marketing_timesheet_entries'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      FOR ALL TO authenticated
      USING (restaurant_id IN (SELECT public.auth_restaurant_ids()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (restaurant_id IN (SELECT public.auth_restaurant_ids()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    $f$, t || '_tenant_scope', t);

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- 6. Consolidate menu_items read policy
DROP POLICY IF EXISTS "Owner or Staff reads menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owner staff or admin reads menu items" ON public.menu_items;
CREATE POLICY "Owner staff or admin reads menu items" ON public.menu_items
  FOR SELECT TO authenticated
  USING (
    restaurant_id IN (SELECT public.auth_restaurant_ids())
    OR public.is_restaurant_owner(auth.uid(), restaurant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 7. Restrict restaurant_staff policy to authenticated role
DROP POLICY IF EXISTS restaurant_staff_owner_only ON public.restaurant_staff;
CREATE POLICY restaurant_staff_owner_only ON public.restaurant_staff
  FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid()));
REVOKE ALL ON public.restaurant_staff FROM anon;