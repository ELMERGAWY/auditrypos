-- AuditryPOS full safe repair
-- Date: 2026-08-14
-- Scope: workspace/warehouse isolation, order/invoice reconciliation,
-- atomic POS inventory consumption, transfer idempotency, accounting outbox.
-- This migration is additive and data-preserving. It must be applied only after
-- a production backup and a staging dry-run.

BEGIN;

-- ============================================================
-- 1. Canonical branch membership and scope columns
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','manager','member','cashier','viewer')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.sales_invoices
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.warehouse_stock
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_balances
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_transfers
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_transfers
  ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.inventory_transfers
  ADD COLUMN IF NOT EXISTS accounting_entry_id uuid;
ALTER TABLE public.inventory_transfer_items
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_warehouses_workspace_id ON public.warehouses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_products_workspace_id ON public.products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_workspace_id ON public.menu_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_orders_workspace_created ON public.orders(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_workspace_created ON public.sales_invoices(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_workspace ON public.warehouse_stock(workspace_id, warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_workspace ON public.stock_movements(workspace_id, warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_workspace ON public.inventory_balances(workspace_id, sub_warehouse_id, item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_workspace ON public.inventory_movements(workspace_id, sub_warehouse_id, item_id);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_transfers_idempotency_key_uq
  ON public.inventory_transfers(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Existing restaurants receive a deterministic default workspace if needed.
INSERT INTO public.workspaces (restaurant_id, company_id, name, code, type, is_default, is_active)
SELECT r.id, r.company_id, COALESCE(NULLIF(trim(r.name), ''), 'Main'),
       ('WS-' || substr(replace(r.id::text, '-', ''), 1, 8)),
       'main', true, true
FROM public.restaurants r
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w
  WHERE w.restaurant_id = r.id AND w.is_default = true
);

-- Deterministic backfill only: every row is assigned to a warehouse's workspace,
-- otherwise the restaurant default. No row is moved between existing non-null scopes.
UPDATE public.warehouses w
SET workspace_id = COALESCE(
  w.workspace_id,
  (SELECT ws.id FROM public.workspaces ws WHERE ws.restaurant_id = w.restaurant_id AND ws.is_default = true ORDER BY ws.created_at LIMIT 1)
)
WHERE w.workspace_id IS NULL;

UPDATE public.products p
SET workspace_id = COALESCE(
  p.workspace_id,
  (SELECT w.workspace_id FROM public.warehouses w WHERE w.id = p.warehouse_id),
  (SELECT ws.id FROM public.workspaces ws WHERE ws.restaurant_id = p.restaurant_id AND ws.is_default = true ORDER BY ws.created_at LIMIT 1)
)
WHERE p.workspace_id IS NULL;

UPDATE public.menu_items m
SET workspace_id = (
  SELECT ws.id FROM public.workspaces ws
  WHERE ws.restaurant_id = m.restaurant_id AND ws.is_default = true
  ORDER BY ws.created_at LIMIT 1
)
WHERE m.workspace_id IS NULL;

UPDATE public.orders o
SET workspace_id = (
  SELECT ws.id FROM public.workspaces ws
  WHERE ws.restaurant_id = o.restaurant_id AND ws.is_default = true
  ORDER BY ws.created_at LIMIT 1
)
WHERE o.workspace_id IS NULL;

UPDATE public.sales_invoices si
SET workspace_id = COALESCE(
  (SELECT o.workspace_id FROM public.orders o WHERE o.id = si.order_id),
  (SELECT o.workspace_id FROM public.orders o WHERE o.id = si.source_reference_id),
  (SELECT ws.id FROM public.workspaces ws WHERE ws.restaurant_id = si.restaurant_id AND ws.is_default = true ORDER BY ws.created_at LIMIT 1)
)
WHERE si.workspace_id IS NULL;

UPDATE public.warehouse_stock ws
SET workspace_id = COALESCE(
  (SELECT w.workspace_id FROM public.warehouses w WHERE w.id = ws.warehouse_id),
  (SELECT p.workspace_id FROM public.products p WHERE p.id = ws.product_id)
)
WHERE ws.workspace_id IS NULL;

UPDATE public.stock_movements sm
SET workspace_id = COALESCE(
  (SELECT w.workspace_id FROM public.warehouses w WHERE w.id = sm.warehouse_id),
  (SELECT p.workspace_id FROM public.products p WHERE p.id = sm.product_id)
)
WHERE sm.workspace_id IS NULL;

UPDATE public.inventory_balances ib
SET workspace_id = (
  SELECT w.workspace_id
  FROM public.warehouses w
  WHERE w.id = ib.sub_warehouse_id
)
WHERE ib.workspace_id IS NULL;

UPDATE public.inventory_movements im
SET workspace_id = (
  SELECT w.workspace_id
  FROM public.sub_warehouses sw
  JOIN public.warehouses w ON w.id = sw.warehouse_id
  WHERE sw.id = im.sub_warehouse_id
)
WHERE im.workspace_id IS NULL;

UPDATE public.inventory_transfers it
SET workspace_id = (
  SELECT w.workspace_id
  FROM public.warehouses w
  WHERE w.id = it.from_warehouse_id
)
WHERE it.workspace_id IS NULL;

UPDATE public.inventory_transfer_items iti
SET workspace_id = it.workspace_id
FROM public.inventory_transfers it
WHERE it.id = iti.transfer_id
  AND iti.workspace_id IS NULL;

-- Seed owner/company memberships without overwriting existing roles.
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, r.owner_id, 'owner'
FROM public.workspaces w
JOIN public.restaurants r ON r.id = w.restaurant_id
WHERE r.owner_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT DISTINCT w.id, cu.user_id, 'member'
FROM public.workspaces w
JOIN public.restaurants r ON r.id = w.restaurant_id
JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.is_active = true
WHERE cu.user_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Scope lookup for authenticated users. SECURITY DEFINER avoids RLS recursion.
CREATE OR REPLACE FUNCTION public.auth_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT w.id
  FROM public.workspaces w
  JOIN public.restaurants r ON r.id = w.restaurant_id
  WHERE r.owner_id = auth.uid()
  UNION
  SELECT w.id
  FROM public.workspaces w
  JOIN public.company_users cu ON cu.company_id = w.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
  UNION
  SELECT wm.workspace_id
  FROM public.workspace_members wm
  WHERE wm.user_id = auth.uid() AND wm.is_active = true;
$$;

-- ============================================================
-- 2. Scope triggers: new records cannot silently cross branches
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_scope_warehouse()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_workspace uuid;
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT w.id INTO v_workspace FROM public.workspaces w
    WHERE w.restaurant_id = NEW.restaurant_id AND w.is_default = true
    ORDER BY w.created_at LIMIT 1;
    NEW.workspace_id := v_workspace;
  END IF;
  IF NEW.workspace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = NEW.workspace_id AND w.restaurant_id = NEW.restaurant_id
  ) THEN
    RAISE EXCEPTION 'warehouse workspace does not belong to restaurant';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_scope_warehouse ON public.warehouses;
CREATE TRIGGER trg_scope_warehouse BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id
ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.tg_scope_warehouse();

CREATE OR REPLACE FUNCTION public.tg_scope_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_workspace uuid;
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.warehouse_id IS NOT NULL THEN
    SELECT w.workspace_id INTO v_workspace FROM public.warehouses w WHERE w.id = NEW.warehouse_id;
    NEW.workspace_id := v_workspace;
  END IF;
  IF NEW.workspace_id IS NULL THEN
    SELECT w.id INTO v_workspace FROM public.workspaces w
    WHERE w.restaurant_id = NEW.restaurant_id AND w.is_default = true
    ORDER BY w.created_at LIMIT 1;
    NEW.workspace_id := v_workspace;
  END IF;
  IF NEW.warehouse_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = NEW.warehouse_id
      AND (w.restaurant_id <> NEW.restaurant_id OR (NEW.workspace_id IS NOT NULL AND w.workspace_id <> NEW.workspace_id))
  ) THEN
    RAISE EXCEPTION 'product warehouse is outside product workspace';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_scope_product ON public.products;
CREATE TRIGGER trg_scope_product BEFORE INSERT OR UPDATE OF restaurant_id, warehouse_id, workspace_id
ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_scope_product();

CREATE OR REPLACE FUNCTION public.tg_scope_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_workspace uuid;
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT w.id INTO v_workspace FROM public.workspaces w
    WHERE w.restaurant_id = NEW.restaurant_id AND w.is_default = true
    ORDER BY w.created_at LIMIT 1;
    NEW.workspace_id := v_workspace;
  END IF;
  IF NEW.workspace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = NEW.workspace_id AND w.restaurant_id = NEW.restaurant_id
  ) THEN
    RAISE EXCEPTION 'order workspace does not belong to restaurant';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_scope_order ON public.orders;
CREATE TRIGGER trg_scope_order BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id
ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_scope_order();

CREATE OR REPLACE FUNCTION public.tg_scope_sales_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_workspace uuid;
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.order_id IS NOT NULL THEN
    SELECT o.workspace_id INTO v_workspace FROM public.orders o WHERE o.id = NEW.order_id;
    NEW.workspace_id := v_workspace;
  END IF;
  IF NEW.workspace_id IS NULL AND NEW.restaurant_id IS NOT NULL THEN
    SELECT w.id INTO v_workspace FROM public.workspaces w
    WHERE w.restaurant_id = NEW.restaurant_id AND w.is_default = true
    ORDER BY w.created_at LIMIT 1;
    NEW.workspace_id := v_workspace;
  END IF;
  IF NEW.order_id IS NOT NULL AND NEW.workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = NEW.order_id AND o.workspace_id <> NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'invoice workspace does not match order workspace';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_scope_sales_invoice ON public.sales_invoices;
CREATE TRIGGER trg_scope_sales_invoice BEFORE INSERT OR UPDATE OF restaurant_id, order_id, workspace_id
ON public.sales_invoices FOR EACH ROW EXECUTE FUNCTION public.tg_scope_sales_invoice();

CREATE OR REPLACE FUNCTION public.tg_scope_warehouse_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_workspace uuid; v_restaurant uuid;
BEGIN
  SELECT w.workspace_id, w.restaurant_id INTO v_workspace, v_restaurant
  FROM public.warehouses w WHERE w.id = NEW.warehouse_id;
  IF NEW.workspace_id IS NULL THEN NEW.workspace_id := v_workspace; END IF;
  IF NEW.restaurant_id IS NULL THEN NEW.restaurant_id := v_restaurant; END IF;
  IF NEW.workspace_id IS DISTINCT FROM v_workspace OR NEW.restaurant_id IS DISTINCT FROM v_restaurant THEN
    RAISE EXCEPTION 'warehouse stock scope does not match warehouse';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_scope_warehouse_stock ON public.warehouse_stock;
CREATE TRIGGER trg_scope_warehouse_stock BEFORE INSERT OR UPDATE OF restaurant_id, warehouse_id, workspace_id
ON public.warehouse_stock FOR EACH ROW EXECUTE FUNCTION public.tg_scope_warehouse_stock();

CREATE OR REPLACE FUNCTION public.tg_scope_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_workspace uuid; v_restaurant uuid;
BEGIN
  IF NEW.warehouse_id IS NOT NULL THEN
    SELECT w.workspace_id, w.restaurant_id INTO v_workspace, v_restaurant
    FROM public.warehouses w WHERE w.id = NEW.warehouse_id;
  END IF;
  IF NEW.workspace_id IS NULL THEN NEW.workspace_id := v_workspace; END IF;
  IF NEW.restaurant_id IS NULL THEN NEW.restaurant_id := v_restaurant; END IF;
  IF NEW.warehouse_id IS NOT NULL AND (NEW.workspace_id IS DISTINCT FROM v_workspace OR NEW.restaurant_id IS DISTINCT FROM v_restaurant) THEN
    RAISE EXCEPTION 'stock movement scope does not match warehouse';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_scope_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_scope_stock_movement BEFORE INSERT OR UPDATE OF restaurant_id, warehouse_id, workspace_id
ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.tg_scope_stock_movement();

-- ============================================================
-- 3. POS order upsert with explicit workspace and stable identity
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_pos_order(p_payload jsonb)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_client_id text := NULLIF(TRIM(p_payload->>'client_order_id'), '');
  v_order_number text := NULLIF(TRIM(p_payload->>'order_number'), '');
  v_restaurant_id uuid := (p_payload->>'restaurant_id')::uuid;
  v_workspace_id uuid := NULLIF(p_payload->>'workspace_id', '')::uuid;
  v_paid numeric := COALESCE((p_payload->>'paid_amount')::numeric, 0);
  v_total numeric := COALESCE((p_payload->>'total')::numeric, 0);
BEGIN
  IF v_restaurant_id IS NULL OR v_client_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id and client_order_id are required';
  END IF;
  IF v_workspace_id IS NULL THEN
    SELECT w.id INTO v_workspace_id FROM public.workspaces w
    WHERE w.restaurant_id = v_restaurant_id AND w.is_default = true
    ORDER BY w.created_at LIMIT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = v_workspace_id AND w.restaurant_id = v_restaurant_id) THEN
    RAISE EXCEPTION 'invalid workspace for restaurant';
  END IF;
  IF v_order_number IS NULL THEN
    v_order_number := 'ORD-' || UPPER(RIGHT(REPLACE(v_client_id, '-', ''), 8));
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE client_order_id = v_client_id AND restaurant_id = v_restaurant_id
  LIMIT 1;
  IF FOUND THEN
    UPDATE public.orders SET
      workspace_id = v_workspace_id,
      paid_amount = v_paid,
      direct_paid_amount = v_paid,
      total = CASE WHEN v_total > 0 THEN v_total ELSE total END,
      discount = COALESCE((p_payload->>'discount')::numeric, discount),
      status = COALESCE(NULLIF(p_payload->>'status', ''), status),
      payment_method = COALESCE(NULLIF(p_payload->>'payment_method', ''), payment_method),
      customer_id = COALESCE(NULLIF(p_payload->>'customer_id', '')::uuid, customer_id),
      customer_name = COALESCE(NULLIF(p_payload->>'customer_name', ''), customer_name),
      customer_phone = COALESCE(NULLIF(p_payload->>'customer_phone', ''), customer_phone),
      notes = COALESCE(NULLIF(p_payload->>'notes', ''), notes),
      updated_at = now()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
    RETURN v_order;
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE restaurant_id = v_restaurant_id AND order_number = v_order_number
  LIMIT 1;
  IF FOUND THEN
    UPDATE public.orders SET
      workspace_id = v_workspace_id,
      client_order_id = COALESCE(client_order_id, v_client_id),
      paid_amount = v_paid,
      direct_paid_amount = v_paid,
      total = CASE WHEN v_total > 0 THEN v_total ELSE total END,
      status = COALESCE(NULLIF(p_payload->>'status', ''), status),
      updated_at = now()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
    RETURN v_order;
  END IF;

  INSERT INTO public.orders (
    restaurant_id, workspace_id, order_number, total, discount, status,
    table_number, order_type, customer_name, customer_phone, customer_ref,
    delivery_address, delivery_date, delivery_agent_id, payment_method,
    paid_amount, direct_paid_amount, notes, client_order_id, customer_id,
    created_by_name, updated_by_name, created_by
  ) VALUES (
    v_restaurant_id, v_workspace_id, v_order_number, v_total,
    COALESCE((p_payload->>'discount')::numeric, 0),
    COALESCE(NULLIF(p_payload->>'status', ''), 'completed'),
    NULLIF(p_payload->>'table_number', '')::int,
    COALESCE(NULLIF(p_payload->>'order_type', ''), 'takeaway'),
    COALESCE(NULLIF(p_payload->>'customer_name', ''), 'عميل نقدي'),
    COALESCE(p_payload->>'customer_phone', ''), NULLIF(p_payload->>'customer_ref', ''),
    COALESCE(p_payload->>'delivery_address', ''), NULLIF(p_payload->>'delivery_date', '')::date,
    NULLIF(p_payload->>'delivery_agent_id', '')::uuid,
    COALESCE(NULLIF(p_payload->>'payment_method', ''), 'cash'), v_paid, v_paid,
    COALESCE(p_payload->>'notes', ''), v_client_id, NULLIF(p_payload->>'customer_id', '')::uuid,
    p_payload->>'created_by_name', p_payload->>'updated_by_name', NULLIF(p_payload->>'created_by', '')::uuid
  ) RETURNING * INTO v_order;
  RETURN v_order;
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_order FROM public.orders
  WHERE restaurant_id = v_restaurant_id AND (client_order_id = v_client_id OR order_number = v_order_number)
  ORDER BY CASE WHEN client_order_id = v_client_id THEN 0 ELSE 1 END LIMIT 1;
  IF NOT FOUND THEN RAISE; END IF;
  RETURN v_order;
END;
$$;

-- Outbox must exist before functions that write to it are compiled/executed.
CREATE TABLE IF NOT EXISTS public.accounting_posting_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','posted','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  posted_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_id, event_type)
);

-- ============================================================
-- 4. Atomic inventory transfer and POS finalization
-- ============================================================
CREATE OR REPLACE FUNCTION public.execute_inventory_transfer_v2(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id uuid;
  v_src_qty numeric;
  v_dst_product_id uuid := p_product_id;
  v_cost numeric := 0;
  v_source_workspace uuid;
  v_target_workspace uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_from_warehouse_id = p_to_warehouse_id THEN
    RAISE EXCEPTION 'invalid transfer quantity or warehouses';
  END IF;
  SELECT workspace_id INTO v_source_workspace FROM public.warehouses
  WHERE id = p_from_warehouse_id AND restaurant_id = p_restaurant_id;
  SELECT workspace_id INTO v_target_workspace FROM public.warehouses
  WHERE id = p_to_warehouse_id AND restaurant_id = p_restaurant_id;
  IF v_source_workspace IS NULL OR v_target_workspace IS NULL OR v_source_workspace <> p_workspace_id OR v_target_workspace <> p_workspace_id THEN
    RAISE EXCEPTION 'warehouses must belong to the selected workspace';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND restaurant_id = p_restaurant_id AND workspace_id = p_workspace_id) THEN
    RAISE EXCEPTION 'product does not belong to the selected workspace';
  END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_transfer_id FROM public.inventory_transfers WHERE idempotency_key = p_idempotency_key;
    IF v_transfer_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id, 'replayed', true);
    END IF;
  END IF;

  SELECT COALESCE(quantity, 0) INTO v_src_qty
  FROM public.warehouse_stock
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id AND workspace_id = p_workspace_id
  FOR UPDATE;
  IF COALESCE(v_src_qty, 0) < p_quantity THEN
    RAISE EXCEPTION 'insufficient stock: available %, requested %', COALESCE(v_src_qty, 0), p_quantity;
  END IF;
  SELECT COALESCE(cost_price, 0) INTO v_cost FROM public.products WHERE id = p_product_id;

  INSERT INTO public.inventory_transfers (restaurant_id, workspace_id, from_warehouse_id, to_warehouse_id, notes, status, idempotency_key)
  VALUES (p_restaurant_id, p_workspace_id, p_from_warehouse_id, p_to_warehouse_id, p_notes, 'received', p_idempotency_key)
  RETURNING id INTO v_transfer_id;
  INSERT INTO public.inventory_transfer_items (transfer_id, restaurant_id, workspace_id, product_id, quantity, cost_price)
  VALUES (v_transfer_id, p_restaurant_id, p_workspace_id, p_product_id, p_quantity, v_cost);

  UPDATE public.warehouse_stock SET quantity = quantity - p_quantity
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id AND workspace_id = p_workspace_id;
  INSERT INTO public.warehouse_stock (restaurant_id, workspace_id, warehouse_id, product_id, quantity, min_quantity)
  VALUES (p_restaurant_id, p_workspace_id, p_to_warehouse_id, p_product_id, p_quantity, 0)
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
    SET quantity = COALESCE(public.warehouse_stock.quantity, 0) + EXCLUDED.quantity,
        workspace_id = EXCLUDED.workspace_id;

  INSERT INTO public.stock_movements (product_id, restaurant_id, type, quantity, reason, reference_id, warehouse_id, workspace_id)
  VALUES
    (p_product_id, p_restaurant_id, 'transfer_out', p_quantity, COALESCE(p_notes, 'inventory transfer'), v_transfer_id::text, p_from_warehouse_id, p_workspace_id),
    (p_product_id, p_restaurant_id, 'transfer_in', p_quantity, COALESCE(p_notes, 'inventory transfer'), v_transfer_id::text, p_to_warehouse_id, p_workspace_id);

  INSERT INTO public.accounting_posting_outbox (company_id, restaurant_id, workspace_id, source_table, source_id, event_type, payload)
  SELECT r.company_id, p_restaurant_id, p_workspace_id, 'inventory_transfers', v_transfer_id, 'inventory_transfer',
         jsonb_build_object('amount', p_quantity * v_cost, 'from_warehouse_id', p_from_warehouse_id, 'to_warehouse_id', p_to_warehouse_id)
  FROM public.restaurants r WHERE r.id = p_restaurant_id
  ON CONFLICT (source_table, source_id, event_type) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id, 'replayed', false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.execute_inventory_transfer_v2(uuid,uuid,uuid,uuid,uuid,numeric,text,text) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.accounting_posting_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','posted','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  posted_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_id, event_type)
);
CREATE INDEX IF NOT EXISTS idx_accounting_posting_outbox_ready
  ON public.accounting_posting_outbox(status, available_at, created_at);
ALTER TABLE public.accounting_posting_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accounting_outbox_tenant_read ON public.accounting_posting_outbox;
CREATE POLICY accounting_outbox_tenant_read ON public.accounting_posting_outbox
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR workspace_id IN (SELECT public.auth_workspace_ids())
);

CREATE OR REPLACE FUNCTION public.finalize_pos_order_v2(
  p_payload jsonb,
  p_items jsonb,
  p_workspace_id uuid DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric;
  v_stock numeric;
  v_warehouse uuid := p_warehouse_id;
  v_workspace uuid := p_workspace_id;
  v_restaurant uuid := (p_payload->>'restaurant_id')::uuid;
  v_client_id text := p_payload->>'client_order_id';
  v_event_payload jsonb := jsonb_build_object('items', p_items);
BEGIN
  IF v_restaurant IS NULL OR v_client_id IS NULL THEN RAISE EXCEPTION 'restaurant_id and client_order_id are required'; END IF;
  IF v_workspace IS NULL THEN
    SELECT id INTO v_workspace FROM public.workspaces WHERE restaurant_id = v_restaurant AND is_default = true ORDER BY created_at LIMIT 1;
  END IF;
  IF v_warehouse IS NULL THEN
    SELECT id INTO v_warehouse FROM public.warehouses WHERE restaurant_id = v_restaurant AND workspace_id = v_workspace AND is_active = true ORDER BY is_default DESC, created_at LIMIT 1;
  END IF;
  IF v_workspace IS NULL OR v_warehouse IS NULL THEN RAISE EXCEPTION 'workspace and warehouse are required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE id = v_warehouse AND restaurant_id = v_restaurant AND workspace_id = v_workspace) THEN
    RAISE EXCEPTION 'warehouse does not belong to workspace';
  END IF;

  v_order := public.upsert_pos_order(p_payload || jsonb_build_object('workspace_id', v_workspace));

  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = v_order.id) THEN
    INSERT INTO public.order_items (order_id, menu_item_id, product_id, menu_item_name, menu_item_image, quantity, price, sold_unit, unit_factor, cost_price_snapshot, variables)
    SELECT v_order.id,
      NULLIF(i->>'menu_item_id','')::uuid,
      NULLIF(i->>'product_id','')::uuid,
      COALESCE(i->>'menu_item_name','صنف'), COALESCE(i->>'menu_item_image','📦'),
      COALESCE((i->>'quantity')::numeric, 0), COALESCE((i->>'price')::numeric, 0),
      COALESCE(i->>'sold_unit','قطعة'), COALESCE((i->>'unit_factor')::numeric, 1),
      COALESCE((i->>'cost_price_snapshot')::numeric, 0), COALESCE(i->'variables','[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) i;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'unit_factor')::numeric, 1);
    IF v_product_id IS NULL OR v_qty <= 0 THEN CONTINUE; END IF;
    SELECT quantity INTO v_stock FROM public.warehouse_stock
    WHERE warehouse_id = v_warehouse AND product_id = v_product_id AND workspace_id = v_workspace
    FOR UPDATE;
    IF COALESCE(v_stock, 0) < v_qty THEN
      RAISE EXCEPTION 'insufficient stock for product %: available %, requested %', v_product_id, COALESCE(v_stock, 0), v_qty;
    END IF;
    UPDATE public.warehouse_stock SET quantity = quantity - v_qty
    WHERE warehouse_id = v_warehouse AND product_id = v_product_id AND workspace_id = v_workspace;
    UPDATE public.products SET quantity = GREATEST(0, COALESCE(quantity, 0) - v_qty)
    WHERE id = v_product_id AND workspace_id = v_workspace;
    INSERT INTO public.stock_movements (product_id, restaurant_id, type, quantity, reason, reference_id, warehouse_id, workspace_id)
    VALUES (v_product_id, v_restaurant, 'out', v_qty, 'POS sale', v_order.id::text, v_warehouse, v_workspace);
  END LOOP;

  INSERT INTO public.accounting_posting_outbox (company_id, restaurant_id, workspace_id, source_table, source_id, event_type, payload)
  SELECT r.company_id, v_restaurant, v_workspace, 'orders', v_order.id, 'sale_completed',
         v_event_payload || jsonb_build_object('order_number', v_order.order_number, 'total', v_order.total)
  FROM public.restaurants r WHERE r.id = v_restaurant
  ON CONFLICT (source_table, source_id, event_type) DO UPDATE
    SET payload = EXCLUDED.payload, updated_at = now();

  RETURN v_order;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finalize_pos_order_v2(jsonb,jsonb,uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_pos_inventory_v2(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_warehouse_id uuid,
  p_order_id uuid,
  p_items jsonb
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric;
  v_stock numeric;
  v_cost numeric;
  v_total_cost numeric := 0;
  v_warehouse uuid := p_warehouse_id;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.restaurant_id = p_restaurant_id AND o.workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'order does not belong to restaurant workspace';
  END IF;
  IF v_warehouse IS NULL THEN
    SELECT id INTO v_warehouse FROM public.warehouses
    WHERE restaurant_id = p_restaurant_id AND workspace_id = p_workspace_id AND is_active = true
    ORDER BY is_default DESC, created_at LIMIT 1;
  END IF;
  IF v_warehouse IS NULL THEN RAISE EXCEPTION 'no active warehouse for workspace'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'unit_factor')::numeric, 1);
    IF v_product_id IS NULL OR v_qty <= 0 THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM public.stock_movements sm
      WHERE sm.reference_id = p_order_id::text AND sm.type = 'out'
        AND sm.product_id = v_product_id AND sm.warehouse_id = v_warehouse
    ) THEN
      CONTINUE;
    END IF;

    SELECT quantity INTO v_stock
    FROM public.warehouse_stock
    WHERE warehouse_id = v_warehouse AND product_id = v_product_id AND workspace_id = p_workspace_id
    FOR UPDATE;
    IF COALESCE(v_stock, 0) < v_qty THEN
      RAISE EXCEPTION 'insufficient stock for product %: available %, requested %', v_product_id, COALESCE(v_stock, 0), v_qty;
    END IF;
    SELECT COALESCE(cost_price, 0) INTO v_cost FROM public.products WHERE id = v_product_id AND workspace_id = p_workspace_id;
    UPDATE public.warehouse_stock SET quantity = quantity - v_qty
    WHERE warehouse_id = v_warehouse AND product_id = v_product_id AND workspace_id = p_workspace_id;
    UPDATE public.products SET quantity = GREATEST(0, COALESCE(quantity, 0) - v_qty)
    WHERE id = v_product_id AND workspace_id = p_workspace_id;
    INSERT INTO public.stock_movements (product_id, restaurant_id, type, quantity, reason, reference_id, warehouse_id, workspace_id)
    VALUES (v_product_id, p_restaurant_id, 'out', v_qty, 'POS sale', p_order_id::text, v_warehouse, p_workspace_id);
    v_total_cost := v_total_cost + (v_qty * v_cost);
  END LOOP;

  INSERT INTO public.accounting_posting_outbox (company_id, restaurant_id, workspace_id, source_table, source_id, event_type, payload)
  SELECT r.company_id, p_restaurant_id, p_workspace_id, 'orders', p_order_id, 'sale_completed',
         jsonb_build_object('order_id', p_order_id, 'inventory_cost', v_total_cost)
  FROM public.restaurants r WHERE r.id = p_restaurant_id
  ON CONFLICT (source_table, source_id, event_type) DO UPDATE
    SET payload = public.accounting_posting_outbox.payload || EXCLUDED.payload, updated_at = now();
  RETURN v_total_cost;
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_pos_inventory_v2(uuid,uuid,uuid,uuid,jsonb) TO authenticated, service_role;

-- ============================================================
-- 5. Retry/reconciliation fixes for accounting links
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_retry_posting_failure(p_failure_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failure public.gl_posting_failures%ROWTYPE;
  v_entry_id uuid;
BEGIN
  SELECT * INTO v_failure FROM public.gl_posting_failures WHERE id = p_failure_id FOR UPDATE;
  IF v_failure.id IS NULL THEN RAISE EXCEPTION 'Posting failure % not found', p_failure_id; END IF;
  IF v_failure.status IN ('resolved', 'cancelled') THEN RETURN NULL; END IF;
  UPDATE public.gl_posting_failures SET status='retrying', retry_count=retry_count+1, updated_at=now() WHERE id=v_failure.id;
  BEGIN
    v_entry_id := public.fn_autopost_transaction(
      v_failure.company_id, v_failure.workspace_id, v_failure.restaurant_id,
      COALESCE(v_failure.payload->>'profile_code','restaurant'),
      COALESCE(v_failure.movement_type,'expense'), COALESCE(v_failure.movement_subtype,'cash_expense'),
      COALESCE(v_failure.payment_method,'cash'), COALESCE(v_failure.amount,0),
      COALESCE((v_failure.payload->>'entry_date')::date,current_date),
      COALESCE(v_failure.payload->>'description','Retried auto-post transaction'),
      v_failure.source_table, v_failure.source_event, v_failure.source_id, NULL
    );
    IF v_failure.source_table = 'orders' THEN
      UPDATE public.orders SET journal_entry_id=v_entry_id, updated_at=now() WHERE id=v_failure.source_id;
    ELSIF v_failure.source_table = 'sales_invoices' THEN
      UPDATE public.sales_invoices SET journal_entry_id=v_entry_id, updated_at=now() WHERE id=v_failure.source_id;
    ELSIF v_failure.source_table = 'inventory_transfers' THEN
      UPDATE public.inventory_transfers SET accounting_entry_id=v_entry_id WHERE id=v_failure.source_id;
    END IF;
    UPDATE public.gl_posting_failures SET status='resolved', resolved_at=now(), updated_at=now(), error_message='Resolved after retry' WHERE id=v_failure.id;
    RETURN v_entry_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.gl_posting_failures SET status='pending', updated_at=now(), error_message=left(SQLERRM,2000) WHERE id=v_failure.id;
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE VIEW public.v_order_invoice_reconciliation AS
SELECT
  o.id AS order_id,
  o.restaurant_id,
  o.workspace_id,
  o.order_number,
  o.created_at AS order_created_at,
  o.status AS order_status,
  o.total AS order_total,
  o.journal_entry_id AS order_journal_entry_id,
  si.id AS sales_invoice_id,
  si.invoice_number,
  si.order_id AS invoice_order_id,
  si.source_reference_id,
  si.total_amount AS invoice_total,
  si.journal_entry_id AS invoice_journal_entry_id,
  CASE
    WHEN si.id IS NULL THEN 'order_without_invoice'
    WHEN si.order_id IS NULL AND si.source_reference_id IS NULL THEN 'invoice_without_order_link'
    WHEN si.order_id IS NULL AND si.source_reference_id = o.id THEN 'linked_by_source_reference'
    WHEN si.order_id = o.id AND si.total_amount IS DISTINCT FROM o.total THEN 'amount_mismatch'
    ELSE 'linked'
  END AS reconciliation_state
FROM public.orders o
FULL OUTER JOIN public.sales_invoices si
  ON si.order_id = o.id OR si.source_reference_id = o.id;

CREATE OR REPLACE FUNCTION public.process_accounting_posting_outbox(p_batch_size integer DEFAULT 25)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_order public.orders%ROWTYPE;
  v_transfer public.inventory_transfers%ROWTYPE;
  v_lines jsonb;
  v_entry uuid;
  v_tax numeric;
  v_paid numeric;
  v_credit numeric;
  v_cost numeric;
  v_processed integer := 0;
  v_cash uuid;
  v_ar uuid;
  v_sales uuid;
  v_tax_account uuid;
  v_cogs uuid;
  v_inventory uuid;
  v_amount numeric;
BEGIN
  FOR v_row IN
    SELECT * FROM public.accounting_posting_outbox
    WHERE status IN ('pending','failed') AND available_at <= now()
    ORDER BY created_at
    LIMIT GREATEST(1, LEAST(COALESCE(p_batch_size,25), 100))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.accounting_posting_outbox
    SET status='processing', attempts=attempts+1, locked_at=now(), updated_at=now()
    WHERE id=v_row.id;
    BEGIN
      IF v_row.source_table = 'orders' AND v_row.event_type = 'sale_completed' THEN
        SELECT * INTO v_order FROM public.orders WHERE id=v_row.source_id FOR UPDATE;
        IF v_order.id IS NULL THEN RAISE EXCEPTION 'order % not found', v_row.source_id; END IF;
        v_tax := COALESCE((SELECT SUM(tax_amount) FROM public.order_taxes WHERE order_id=v_order.id), 0);
        v_paid := LEAST(COALESCE(v_order.total,0), GREATEST(COALESCE(v_order.paid_amount,0), COALESCE(v_order.direct_paid_amount,0)));
        v_credit := GREATEST(COALESCE(v_order.total,0)-v_paid,0);
        v_cash := public.get_cash_account(v_order.restaurant_id);
        v_ar := public.get_accounts_receivable(v_order.restaurant_id);
        v_sales := public.get_sales_account(v_order.restaurant_id);
        v_lines := '[]'::jsonb;
        IF v_paid > 0 THEN v_lines := v_lines || jsonb_build_object('account_id',v_cash,'debit',v_paid,'credit',0,'description','تحصيل طلب '||v_order.order_number); END IF;
        IF v_credit > 0 THEN v_lines := v_lines || jsonb_build_object('account_id',v_ar,'debit',v_credit,'credit',0,'description','آجل طلب '||v_order.order_number); END IF;
        IF v_tax > 0 THEN
          v_tax_account := public._get_or_create_account(v_order.restaurant_id,'2100','ضريبة القيمة المضافة المستحقة','liability','current_liability','vat_payable','credit',false,false);
          v_lines := v_lines
            || jsonb_build_object('account_id',v_sales,'debit',0,'credit',ROUND(v_order.total-v_tax,2),'description','مبيعات طلب '||v_order.order_number)
            || jsonb_build_object('account_id',v_tax_account,'debit',0,'credit',v_tax,'description','ضريبة طلب '||v_order.order_number);
        ELSE
          v_lines := v_lines || jsonb_build_object('account_id',v_sales,'debit',0,'credit',v_order.total,'description','مبيعات طلب '||v_order.order_number);
        END IF;
        v_cost := COALESCE((v_row.payload->>'inventory_cost')::numeric, v_order.total_cost, 0);
        IF v_cost > 0 THEN
          v_cogs := public.get_cogs_account(v_order.restaurant_id);
          v_inventory := public.get_inventory_account(v_order.restaurant_id);
          v_lines := v_lines
            || jsonb_build_object('account_id',v_cogs,'debit',v_cost,'credit',0,'description','تكلفة مبيعات '||v_order.order_number)
            || jsonb_build_object('account_id',v_inventory,'debit',0,'credit',v_cost,'description','صرف مخزون '||v_order.order_number);
        END IF;
        v_entry := public.fn_upsert_doc_journal(v_order.restaurant_id,'order',v_order.id,COALESCE(v_order.created_at::date,current_date),'قيد مبيعات - طلب رقم '||v_order.order_number,'sales',v_lines);
        UPDATE public.orders SET journal_entry_id=v_entry, updated_at=now() WHERE id=v_order.id;
      ELSIF v_row.source_table = 'inventory_transfers' AND v_row.event_type = 'inventory_transfer' THEN
        SELECT * INTO v_transfer FROM public.inventory_transfers WHERE id=v_row.source_id FOR UPDATE;
        IF v_transfer.id IS NULL THEN RAISE EXCEPTION 'transfer % not found', v_row.source_id; END IF;
        v_amount := COALESCE((v_row.payload->>'amount')::numeric,0);
        v_inventory := public.get_inventory_account(v_transfer.restaurant_id);
        v_lines := jsonb_build_array(
          jsonb_build_object('account_id',v_inventory,'debit',v_amount,'credit',0,'description','استلام تحويل مخزون'),
          jsonb_build_object('account_id',v_inventory,'debit',0,'credit',v_amount,'description','إرسال تحويل مخزون')
        );
        v_entry := public.fn_upsert_doc_journal(v_transfer.restaurant_id,'inventory_transfer',v_transfer.id,current_date,'قيد تحويل مخزون','inventory',v_lines);
        UPDATE public.inventory_transfers SET accounting_entry_id=v_entry WHERE id=v_transfer.id;
      ELSE
        RAISE EXCEPTION 'unsupported outbox event %.%', v_row.source_table, v_row.event_type;
      END IF;
      UPDATE public.accounting_posting_outbox SET status='posted', posted_entry_id=v_entry, last_error=NULL, updated_at=now() WHERE id=v_row.id;
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.accounting_posting_outbox
      SET status='failed', last_error=left(SQLERRM,2000), available_at=now() + make_interval(secs => LEAST(3600, GREATEST(30, attempts*60))), updated_at=now()
      WHERE id=v_row.id;
    END;
  END LOOP;
  RETURN v_processed;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_accounting_posting_outbox(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_process_accounting_posting_outbox()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.process_accounting_posting_outbox(25);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_process_accounting_posting_outbox ON public.accounting_posting_outbox;
CREATE TRIGGER trg_process_accounting_posting_outbox
AFTER INSERT ON public.accounting_posting_outbox
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_process_accounting_posting_outbox();

-- ============================================================
-- 6. Workspace-aware RLS for stock and catalog surfaces
-- ============================================================
DROP POLICY IF EXISTS wh_tenant_access ON public.warehouses;
DROP POLICY IF EXISTS users_can_view_warehouses ON public.warehouses;
DROP POLICY IF EXISTS users_can_manage_warehouses ON public.warehouses;
CREATE POLICY wh_workspace_access ON public.warehouses FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()));

DROP POLICY IF EXISTS ws_tenant_access ON public.warehouse_stock;
DROP POLICY IF EXISTS warehouse_stock_select ON public.warehouse_stock;
DROP POLICY IF EXISTS warehouse_stock_insert ON public.warehouse_stock;
DROP POLICY IF EXISTS warehouse_stock_update ON public.warehouse_stock;
CREATE POLICY ws_workspace_access ON public.warehouse_stock FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()));

DROP POLICY IF EXISTS inventory_balances_tenant_all ON public.inventory_balances;
DROP POLICY IF EXISTS users_can_view_inventory_balances ON public.inventory_balances;
CREATE POLICY inventory_balances_workspace_access ON public.inventory_balances FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()));

DROP POLICY IF EXISTS inventory_movements_tenant_all ON public.inventory_movements;
DROP POLICY IF EXISTS users_can_view_inventory_movements ON public.inventory_movements;
DROP POLICY IF EXISTS users_can_create_inventory_movements ON public.inventory_movements;
CREATE POLICY inventory_movements_workspace_access ON public.inventory_movements FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()));

DROP POLICY IF EXISTS "Owner manages stock_movements" ON public.stock_movements;
CREATE POLICY stock_movements_workspace_access ON public.stock_movements FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()));

DROP POLICY IF EXISTS "Authenticated users read products by restaurant" ON public.products;
DROP POLICY IF EXISTS "Owners and super admins manage products" ON public.products;
CREATE POLICY products_workspace_read ON public.products FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()));
CREATE POLICY products_workspace_manage ON public.products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()));

DROP POLICY IF EXISTS "users access their sales_invoices" ON public.sales_invoices;
DROP POLICY IF EXISTS restaurant_isolation ON public.sales_invoices;
CREATE POLICY sales_invoices_workspace_access ON public.sales_invoices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR workspace_id IN (SELECT public.auth_workspace_ids()));

COMMIT;

-- Verification queries are intentionally not executed here:
-- SELECT workspace_id, count(*) FROM products GROUP BY workspace_id;
-- SELECT workspace_id, count(*) FROM warehouse_stock GROUP BY workspace_id;
-- SELECT reconciliation_state, count(*) FROM v_order_invoice_reconciliation GROUP BY reconciliation_state;
