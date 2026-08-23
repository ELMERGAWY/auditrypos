-- AuditryPOS Manager API2 document adapters (phase 2).
-- Additive-only: no drops, truncation, destructive updates, or automatic triggers.
-- Network calls are never made from PostgreSQL. These functions only enqueue
-- tenant-scoped, idempotent outbox events for the server-side worker.
--
-- Manager API2 form payloads use PascalCase for main fields. The verified
-- minimal document shapes are:
--   sales invoice: IssueDate, Customer?, Reference?, Description?, Lines[{Item,Qty,SalesUnitPrice}]
--   purchase invoice: IssueDate, Supplier, Lines[{Item,Qty,PurchaseUnitPrice}]
--   receipt: Date, ReceivedIn, Reference?, Description?, Amount, Lines[{Account,Description,Amount}]

BEGIN;

-- Existing phase-1 entity adapters used list-style camelCase keys. Replace them
-- with the verified form casing while preserving the public function contracts.
CREATE OR REPLACE FUNCTION public.manager_enqueue_customer_sync(
  p_customer_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer public.customers;
  v_integration_id uuid;
  v_manager_key text;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_path text;
  v_method text;
BEGIN
  SELECT c.* INTO v_customer
  FROM public.customers c
  WHERE c.id = p_customer_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'customer not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported customer operation'; END IF;

  v_integration_id := public._manager_integration_for_tenant(v_customer.restaurant_id, NULL);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'customer'
    AND m.local_id = p_customer_id
    AND m.restaurant_id = v_customer.restaurant_id
    AND m.workspace_id IS NULL
  LIMIT 1;

  IF p_operation = 'delete' AND v_manager_key IS NULL THEN
    RAISE EXCEPTION 'customer has no Manager mapping to delete';
  END IF;
  IF v_manager_key IS NOT NULL AND v_manager_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager key';
  END IF;

  v_body := jsonb_strip_nulls(jsonb_build_object(
    'Name', NULLIF(BTRIM(v_customer.name), ''),
    'Email', NULLIF(BTRIM(COALESCE(v_customer.email, '')), ''),
    'Phone', NULLIF(BTRIM(COALESCE(v_customer.phone, '')), ''),
    'Address', NULLIF(BTRIM(COALESCE(v_customer.address, '')), ''),
    'Description', NULLIF(BTRIM(COALESCE(v_customer.notes, '')), '')
  ));
  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_path := CASE WHEN v_manager_key IS NULL THEN '/customer-form' ELSE '/customer-form/' || v_manager_key END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_customer.name,
    'source_hash', v_hash,
    'body', CASE WHEN p_operation = 'delete' THEN '{}'::jsonb ELSE v_body END
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_customer.restaurant_id, NULL, 'customer', p_operation,
    'customers', p_customer_id,
    'customer:' || p_customer_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_enqueue_supplier_sync(
  p_supplier_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier public.suppliers;
  v_integration_id uuid;
  v_manager_key text;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_path text;
  v_method text;
BEGIN
  SELECT s.* INTO v_supplier
  FROM public.suppliers s
  WHERE s.id = p_supplier_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'supplier not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported supplier operation'; END IF;

  v_integration_id := public._manager_integration_for_tenant(v_supplier.restaurant_id, NULL);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'supplier'
    AND m.local_id = p_supplier_id
    AND m.restaurant_id = v_supplier.restaurant_id
    AND m.workspace_id IS NULL
  LIMIT 1;

  IF p_operation = 'delete' AND v_manager_key IS NULL THEN
    RAISE EXCEPTION 'supplier has no Manager mapping to delete';
  END IF;
  IF v_manager_key IS NOT NULL AND v_manager_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager key';
  END IF;

  v_body := jsonb_strip_nulls(jsonb_build_object(
    'Name', NULLIF(BTRIM(v_supplier.name), ''),
    'Email', NULLIF(BTRIM(COALESCE(v_supplier.email, '')), ''),
    'Phone', NULLIF(BTRIM(COALESCE(v_supplier.phone, '')), ''),
    'Address', NULLIF(BTRIM(COALESCE(v_supplier.address, '')), ''),
    'Description', NULLIF(BTRIM(COALESCE(v_supplier.notes, '')), '')
  ));
  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_path := CASE WHEN v_manager_key IS NULL THEN '/supplier-form' ELSE '/supplier-form/' || v_manager_key END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_supplier.name,
    'source_hash', v_hash,
    'body', CASE WHEN p_operation = 'delete' THEN '{}'::jsonb ELSE v_body END
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_supplier.restaurant_id, NULL, 'supplier', p_operation,
    'suppliers', p_supplier_id,
    'supplier:' || p_supplier_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_enqueue_inventory_item_sync(
  p_product_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products;
  v_integration_id uuid;
  v_manager_key text;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_path text;
  v_method text;
BEGIN
  SELECT p.* INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported inventory item operation'; END IF;

  v_integration_id := public._manager_integration_for_tenant(v_product.restaurant_id, v_product.workspace_id);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'inventory_item'
    AND m.local_id = p_product_id
    AND m.restaurant_id = v_product.restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM v_product.workspace_id
  LIMIT 1;

  IF p_operation = 'delete' AND v_manager_key IS NULL THEN
    RAISE EXCEPTION 'product has no Manager mapping to delete';
  END IF;
  IF v_manager_key IS NOT NULL AND v_manager_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager key';
  END IF;

  -- Account mappings are intentionally deferred until the local chart-of-accounts
  -- contract is mapped explicitly; Manager defaults are not guessed here.

  v_body := jsonb_strip_nulls(jsonb_build_object(
    'ItemName', NULLIF(BTRIM(v_product.name), ''),
    'ItemCode', NULLIF(BTRIM(COALESCE(v_product.sku, '')), ''),
    'UnitName', NULLIF(BTRIM(COALESCE(v_product.unit, '')), ''),
    'Description', NULLIF(BTRIM(COALESCE(v_product.category, '')), '')
  ));
  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_path := CASE WHEN v_manager_key IS NULL THEN '/inventory-item-form' ELSE '/inventory-item-form/' || v_manager_key END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_product.name,
    'source_hash', v_hash,
    'body', CASE WHEN p_operation = 'delete' THEN '{}'::jsonb ELSE v_body END
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_product.restaurant_id, v_product.workspace_id, 'inventory_item', p_operation,
    'products', p_product_id,
    'inventory_item:' || p_product_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._manager_product_mapping_key(
  p_integration_id uuid,
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_product_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'Manager document line has no local product';
  END IF;

  SELECT m.manager_key INTO v_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = p_integration_id
    AND m.entity_type = 'inventory_item'
    AND m.local_id = p_product_id
    AND m.restaurant_id = p_restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM p_workspace_id
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'product is not mapped to Manager; sync inventory item first';
  END IF;
  IF v_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager product key';
  END IF;
  RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_enqueue_order_sync(
  p_order_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_integration_id uuid;
  v_manager_key text;
  v_customer_key text;
  v_lines jsonb;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_path text;
  v_method text;
BEGIN
  SELECT o.* INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported order operation'; END IF;

  v_integration_id := public._manager_integration_for_tenant(v_order.restaurant_id, v_order.workspace_id);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'sales_invoice'
    AND m.local_id = p_order_id
    AND m.restaurant_id = v_order.restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM v_order.workspace_id
  LIMIT 1;

  IF p_operation = 'delete' THEN
    IF v_manager_key IS NULL THEN RAISE EXCEPTION 'order has no Manager sales invoice mapping to delete'; END IF;
  ELSE
    IF COALESCE(v_order.is_voided, false) OR COALESCE(v_order.is_refunded, false) THEN
      RAISE EXCEPTION 'voided/refunded order requires a credit-note adapter';
    END IF;
    IF COALESCE(v_order.discount, 0) <> 0 OR COALESCE(v_order.tax_amount, 0) <> 0
       OR COALESCE(v_order.service_charge, 0) <> 0 OR COALESCE(v_order.round_amount, 0) <> 0 THEN
      RAISE EXCEPTION 'order has unsupported header adjustments for current Manager adapter';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.order_items oi
      WHERE oi.order_id = p_order_id
        AND (oi.product_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM public.manager_entity_mappings m
          WHERE m.integration_id = v_integration_id
            AND m.entity_type = 'inventory_item'
            AND m.local_id = oi.product_id
            AND m.restaurant_id = v_order.restaurant_id
            AND m.workspace_id IS NOT DISTINCT FROM v_order.workspace_id
        ))
    ) THEN
      RAISE EXCEPTION 'order contains an unmapped product; sync inventory items first';
    END IF;

    SELECT jsonb_agg(
      jsonb_build_object(
        'Item', public._manager_product_mapping_key(v_integration_id, v_order.restaurant_id, v_order.workspace_id, oi.product_id),
        'Qty', COALESCE(oi.quantity, 0),
        'SalesUnitPrice', COALESCE(oi.unit_price_snapshot, oi.price, 0)
      ) ORDER BY oi.id
    ) INTO v_lines
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id;

    IF v_lines IS NULL OR jsonb_array_length(v_lines) = 0 THEN
      RAISE EXCEPTION 'order has no Manager-compatible lines';
    END IF;

    IF v_order.customer_id IS NOT NULL THEN
      SELECT m.manager_key INTO v_customer_key
      FROM public.manager_entity_mappings m
      WHERE m.integration_id = v_integration_id
        AND m.entity_type = 'customer'
        AND m.local_id = v_order.customer_id
        AND m.restaurant_id = v_order.restaurant_id
        AND m.workspace_id IS NULL
      LIMIT 1;
      IF v_customer_key IS NULL THEN RAISE EXCEPTION 'order customer is not mapped to Manager'; END IF;
    END IF;

    v_body := jsonb_strip_nulls(jsonb_build_object(
      'IssueDate', to_char((v_order.created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD'),
      'Customer', v_customer_key,
      'Reference', NULLIF(BTRIM(COALESCE(v_order.order_number, '')), ''),
      'Description', NULLIF(BTRIM(COALESCE(v_order.notes, '')), ''),
      'Lines', v_lines
    ));
  END IF;

  IF p_operation = 'delete' THEN
    v_body := '{}'::jsonb;
  END IF;

  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_path := CASE WHEN v_manager_key IS NULL THEN '/sales-invoice-form' ELSE '/sales-invoice-form/' || v_manager_key END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_order.order_number,
    'source_hash', v_hash,
    'body', v_body
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_order.restaurant_id, v_order.workspace_id, 'sales_invoice', p_operation,
    'orders', p_order_id,
    'sales_invoice:order:' || p_order_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_enqueue_sales_invoice_sync(
  p_invoice_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.sales_invoices;
  v_integration_id uuid;
  v_manager_key text;
  v_customer_key text;
  v_lines jsonb;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_path text;
  v_method text;
BEGIN
  SELECT si.* INTO v_invoice
  FROM public.sales_invoices si
  WHERE si.id = p_invoice_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'sales invoice not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported sales invoice operation'; END IF;

  v_integration_id := public._manager_integration_for_tenant(v_invoice.restaurant_id, v_invoice.workspace_id);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'sales_invoice'
    AND m.local_id = p_invoice_id
    AND m.restaurant_id = v_invoice.restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM v_invoice.workspace_id
  LIMIT 1;

  IF p_operation = 'delete' THEN
    IF v_manager_key IS NULL THEN RAISE EXCEPTION 'sales invoice has no Manager mapping to delete'; END IF;
    v_body := '{}'::jsonb;
  ELSE
    IF COALESCE(v_invoice.status, '') IN ('cancelled', 'voided') THEN
      RAISE EXCEPTION 'cancelled sales invoice requires a credit-note adapter';
    END IF;
    IF COALESCE(v_invoice.discount_amount, 0) <> 0 OR COALESCE(v_invoice.tax_amount, 0) <> 0
       OR COALESCE(v_invoice.shipping_amount, 0) <> 0 THEN
      RAISE EXCEPTION 'sales invoice has unsupported header adjustments for current Manager adapter';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.sales_invoice_lines sil
      WHERE sil.invoice_id = p_invoice_id
        AND (COALESCE(sil.discount_amount, 0) <> 0 OR COALESCE(sil.tax_amount, 0) <> 0)
    ) THEN
      RAISE EXCEPTION 'sales invoice has unsupported line adjustments for current Manager adapter';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.sales_invoice_lines sil
      WHERE sil.invoice_id = p_invoice_id
        AND (sil.product_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM public.manager_entity_mappings m
          WHERE m.integration_id = v_integration_id
            AND m.entity_type = 'inventory_item'
            AND m.local_id = sil.product_id
            AND m.restaurant_id = v_invoice.restaurant_id
            AND m.workspace_id IS NOT DISTINCT FROM v_invoice.workspace_id
        ))
    ) THEN
      RAISE EXCEPTION 'sales invoice contains an unmapped product; sync inventory items first';
    END IF;

    SELECT jsonb_agg(
      jsonb_build_object(
        'Item', public._manager_product_mapping_key(v_integration_id, v_invoice.restaurant_id, v_invoice.workspace_id, sil.product_id),
        'Qty', COALESCE(sil.quantity, 0),
        'SalesUnitPrice', COALESCE(sil.unit_price, 0)
      ) ORDER BY sil.line_order, sil.id
    ) INTO v_lines
    FROM public.sales_invoice_lines sil
    WHERE sil.invoice_id = p_invoice_id;

    IF v_lines IS NULL OR jsonb_array_length(v_lines) = 0 THEN
      RAISE EXCEPTION 'sales invoice has no Manager-compatible lines';
    END IF;

    IF v_invoice.customer_id IS NOT NULL THEN
      SELECT m.manager_key INTO v_customer_key
      FROM public.manager_entity_mappings m
      WHERE m.integration_id = v_integration_id
        AND m.entity_type = 'customer'
        AND m.local_id = v_invoice.customer_id
        AND m.restaurant_id = v_invoice.restaurant_id
        AND m.workspace_id IS NULL
      LIMIT 1;
      IF v_customer_key IS NULL THEN RAISE EXCEPTION 'sales invoice customer is not mapped to Manager'; END IF;
    END IF;

    v_body := jsonb_strip_nulls(jsonb_build_object(
      'IssueDate', v_invoice.invoice_date,
      'Customer', v_customer_key,
      'Reference', NULLIF(BTRIM(COALESCE(v_invoice.invoice_number, '')), ''),
      'Lines', v_lines
    ));
  END IF;

  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_path := CASE WHEN v_manager_key IS NULL THEN '/sales-invoice-form' ELSE '/sales-invoice-form/' || v_manager_key END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_invoice.invoice_number,
    'source_hash', v_hash,
    'body', v_body
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_invoice.restaurant_id, v_invoice.workspace_id, 'sales_invoice', p_operation,
    'sales_invoices', p_invoice_id,
    'sales_invoice:' || p_invoice_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_enqueue_purchase_invoice_sync(
  p_invoice_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.purchase_invoices;
  v_integration_id uuid;
  v_manager_key text;
  v_supplier_key text;
  v_lines jsonb;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_path text;
  v_method text;
BEGIN
  SELECT pi.* INTO v_invoice
  FROM public.purchase_invoices pi
  WHERE pi.id = p_invoice_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'purchase invoice not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported purchase invoice operation'; END IF;

  v_integration_id := public._manager_integration_for_tenant(v_invoice.restaurant_id, v_invoice.workspace_id);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'purchase_invoice'
    AND m.local_id = p_invoice_id
    AND m.restaurant_id = v_invoice.restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM v_invoice.workspace_id
  LIMIT 1;

  IF p_operation = 'delete' THEN
    IF v_manager_key IS NULL THEN RAISE EXCEPTION 'purchase invoice has no Manager mapping to delete'; END IF;
    v_body := '{}'::jsonb;
  ELSE
    IF COALESCE(v_invoice.status, '') IN ('cancelled', 'voided') THEN
      RAISE EXCEPTION 'cancelled purchase invoice requires a debit-note adapter';
    END IF;
    IF COALESCE(v_invoice.tax_amount, 0) <> 0 THEN
      RAISE EXCEPTION 'purchase invoice has unsupported tax adjustment for current Manager adapter';
    END IF;
    IF v_invoice.supplier_id IS NULL THEN
      RAISE EXCEPTION 'purchase invoice has no supplier mapping source';
    END IF;

    SELECT m.manager_key INTO v_supplier_key
    FROM public.manager_entity_mappings m
    WHERE m.integration_id = v_integration_id
      AND m.entity_type = 'supplier'
      AND m.local_id = v_invoice.supplier_id
      AND m.restaurant_id = v_invoice.restaurant_id
      AND m.workspace_id IS NULL
    LIMIT 1;
    IF v_supplier_key IS NULL THEN RAISE EXCEPTION 'purchase invoice supplier is not mapped to Manager'; END IF;

    IF EXISTS (
      SELECT 1
      FROM public.purchase_invoice_lines pil
      WHERE pil.invoice_id = p_invoice_id
        AND (COALESCE(pil.discount_amount, 0) <> 0 OR COALESCE(pil.tax_amount, 0) <> 0
             OR pil.product_id IS NULL OR NOT EXISTS (
               SELECT 1
               FROM public.manager_entity_mappings m
               WHERE m.integration_id = v_integration_id
                 AND m.entity_type = 'inventory_item'
                 AND m.local_id = pil.product_id
                 AND m.restaurant_id = v_invoice.restaurant_id
                 AND m.workspace_id IS NOT DISTINCT FROM v_invoice.workspace_id
             ))
    ) THEN
      RAISE EXCEPTION 'purchase invoice contains unsupported adjustments or an unmapped product';
    END IF;

    SELECT jsonb_agg(
      jsonb_build_object(
        'Item', public._manager_product_mapping_key(v_integration_id, v_invoice.restaurant_id, v_invoice.workspace_id, pil.product_id),
        'Qty', COALESCE(pil.quantity, 0),
        'PurchaseUnitPrice', COALESCE(pil.unit_price, 0)
      ) ORDER BY pil.line_order, pil.id
    ) INTO v_lines
    FROM public.purchase_invoice_lines pil
    WHERE pil.invoice_id = p_invoice_id;

    IF v_lines IS NULL OR jsonb_array_length(v_lines) = 0 THEN
      RAISE EXCEPTION 'purchase invoice has no Manager-compatible lines';
    END IF;

    v_body := jsonb_build_object(
      'IssueDate', v_invoice.invoice_date,
      'Supplier', v_supplier_key,
      'Lines', v_lines
    );
  END IF;

  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_path := CASE WHEN v_manager_key IS NULL THEN '/purchase-invoice-form' ELSE '/purchase-invoice-form/' || v_manager_key END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_invoice.invoice_number,
    'source_hash', v_hash,
    'body', v_body
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_invoice.restaurant_id, v_invoice.workspace_id, 'purchase_invoice', p_operation,
    'purchase_invoices', p_invoice_id,
    'purchase_invoice:' || p_invoice_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public._manager_product_mapping_key(uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_order_sync(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_sales_invoice_sync(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_purchase_invoice_sync(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.manager_enqueue_order_sync(uuid, text) IS 'Queues a verified Manager sales-invoice form payload from a POS order; refuses unsupported adjustments and unmapped products.';
COMMENT ON FUNCTION public.manager_enqueue_sales_invoice_sync(uuid, text) IS 'Queues a verified Manager sales-invoice form payload from a local sales invoice; refuses unsupported tax/discount/shipping.';
COMMENT ON FUNCTION public.manager_enqueue_purchase_invoice_sync(uuid, text) IS 'Queues a verified Manager purchase-invoice form payload from a local purchase invoice; refuses unsupported tax/discount lines.';

COMMIT;
