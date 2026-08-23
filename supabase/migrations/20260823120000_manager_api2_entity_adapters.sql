-- AuditryPOS Manager API2 entity adapters (phase 1).
-- Additive-only. This migration does not create triggers and does not enqueue
-- anything until an owner explicitly enables an integration in dry_run/outbox/live.
-- Manager request fields are intentionally limited to fields verified by the
-- API2 resource names and public examples; document adapters are a later phase.

BEGIN;

CREATE OR REPLACE FUNCTION public._manager_assert_tenant_scope(
  p_restaurant_id uuid,
  p_workspace_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR p_restaurant_id IN (SELECT public.auth_restaurant_ids())
  ) THEN
    RAISE EXCEPTION 'not authorized for Manager tenant';
  END IF;

  IF p_workspace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND w.restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'workspace does not belong to restaurant';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._manager_integration_for_tenant(
  p_restaurant_id uuid,
  p_workspace_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_integration_id uuid;
BEGIN
  PERFORM public._manager_assert_tenant_scope(p_restaurant_id, p_workspace_id);

  SELECT i.id
    INTO v_integration_id
  FROM public.manager_integrations i
  WHERE i.restaurant_id = p_restaurant_id
    AND i.workspace_id IS NOT DISTINCT FROM p_workspace_id
    AND i.enabled = true
    AND i.sync_mode IN ('dry_run', 'outbox', 'live')
  ORDER BY i.updated_at DESC
  LIMIT 1;

  IF v_integration_id IS NULL THEN
    RAISE EXCEPTION 'no enabled Manager integration for tenant';
  END IF;

  RETURN v_integration_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._manager_enqueue_entity(
  p_integration_id uuid,
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_entity_type text,
  p_operation text,
  p_source_table text,
  p_source_id uuid,
  p_idempotency_key text,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public._manager_assert_tenant_scope(p_restaurant_id, p_workspace_id);

  IF p_operation NOT IN ('upsert', 'delete') THEN
    RAISE EXCEPTION 'unsupported Manager adapter operation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.manager_integrations i
    WHERE i.id = p_integration_id
      AND i.restaurant_id = p_restaurant_id
      AND i.workspace_id IS NOT DISTINCT FROM p_workspace_id
      AND i.enabled = true
      AND i.sync_mode IN ('dry_run', 'outbox', 'live')
  ) THEN
    RAISE EXCEPTION 'Manager integration is not enabled for tenant';
  END IF;

  -- Supersede only pending events for the same source row. Processing or posted
  -- events are never rewritten, so an in-flight delivery remains auditable.
  UPDATE public.manager_sync_outbox
     SET status = 'cancelled',
         last_error = 'superseded by a newer source snapshot',
         updated_at = now()
   WHERE integration_id = p_integration_id
     AND restaurant_id = p_restaurant_id
     AND workspace_id IS NOT DISTINCT FROM p_workspace_id
     AND source_table = p_source_table
     AND source_id = p_source_id
     AND status = 'pending';

  INSERT INTO public.manager_sync_outbox (
    integration_id,
    restaurant_id,
    workspace_id,
    entity_type,
    operation,
    source_table,
    source_id,
    idempotency_key,
    payload
  )
  VALUES (
    p_integration_id,
    p_restaurant_id,
    p_workspace_id,
    p_entity_type,
    p_operation,
    p_source_table,
    p_source_id,
    p_idempotency_key,
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (integration_id, idempotency_key) DO UPDATE
    SET payload = EXCLUDED.payload,
        updated_at = now(),
        available_at = CASE
          WHEN public.manager_sync_outbox.status IN ('failed', 'cancelled') THEN now()
          ELSE public.manager_sync_outbox.available_at
        END,
        status = CASE
          WHEN public.manager_sync_outbox.status IN ('failed', 'cancelled') THEN 'pending'
          ELSE public.manager_sync_outbox.status
        END
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer not found';
  END IF;

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
    'name', NULLIF(BTRIM(v_customer.name), ''),
    'email', NULLIF(BTRIM(COALESCE(v_customer.email, '')), ''),
    'phone', NULLIF(BTRIM(COALESCE(v_customer.phone, '')), ''),
    'address', NULLIF(BTRIM(COALESCE(v_customer.address, '')), ''),
    'description', NULLIF(BTRIM(COALESCE(v_customer.notes, '')), '')
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier not found';
  END IF;

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
    'name', NULLIF(BTRIM(v_supplier.name), ''),
    'email', NULLIF(BTRIM(COALESCE(v_supplier.email, '')), ''),
    'phone', NULLIF(BTRIM(COALESCE(v_supplier.phone, '')), ''),
    'address', NULLIF(BTRIM(COALESCE(v_supplier.address, '')), ''),
    'description', NULLIF(BTRIM(COALESCE(v_supplier.notes, '')), '')
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product not found';
  END IF;

  v_integration_id := public._manager_integration_for_tenant(v_product.restaurant_id, NULL);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'inventory_item'
    AND m.local_id = p_product_id
    AND m.restaurant_id = v_product.restaurant_id
    AND m.workspace_id IS NULL
  LIMIT 1;

  IF p_operation = 'delete' AND v_manager_key IS NULL THEN
    RAISE EXCEPTION 'product has no Manager mapping to delete';
  END IF;
  IF v_manager_key IS NOT NULL AND v_manager_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager key';
  END IF;

  v_body := jsonb_strip_nulls(jsonb_build_object(
    'itemName', NULLIF(BTRIM(v_product.name), ''),
    'itemCode', NULLIF(BTRIM(COALESCE(v_product.sku, '')), ''),
    'unitName', NULLIF(BTRIM(COALESCE(v_product.unit, '')), ''),
    'description', NULLIF(BTRIM(COALESCE(v_product.category, '')), '')
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
    v_integration_id, v_product.restaurant_id, NULL, 'inventory_item', p_operation,
    'products', p_product_id,
    'inventory_item:' || p_product_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public._manager_assert_tenant_scope(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._manager_integration_for_tenant(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._manager_enqueue_entity(uuid, uuid, uuid, text, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_customer_sync(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_supplier_sync(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_inventory_item_sync(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.manager_enqueue_customer_sync(uuid, text) IS 'Queues a tenant-scoped Manager customer POST/PUT/DELETE event; no network call occurs in the transaction.';
COMMENT ON FUNCTION public.manager_enqueue_supplier_sync(uuid, text) IS 'Queues a tenant-scoped Manager supplier POST/PUT/DELETE event; no network call occurs in the transaction.';
COMMENT ON FUNCTION public.manager_enqueue_inventory_item_sync(uuid, text) IS 'Queues a tenant-scoped Manager inventory-item POST/PUT/DELETE event; no network call occurs in the transaction.';

COMMIT;
