-- AuditryPOS Manager API2 accounting/inventory adapters (phase 3).
-- Additive-only. No triggers, resets, truncation, broad deletes, or network calls.
-- These adapters enqueue verified form payloads and fail closed when a required
-- Manager account/location mapping or local posting prerequisite is missing.

BEGIN;

CREATE TABLE IF NOT EXISTS public.manager_inventory_location_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.manager_integrations(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  manager_key text NOT NULL,
  manager_name text,
  sync_status text NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending','synced','failed','conflict','ignored')),
  source_hash text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, warehouse_id),
  UNIQUE (integration_id, manager_key)
);

ALTER TABLE public.manager_inventory_location_mappings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'manager_inventory_location_mappings'
      AND policyname = 'manager_inventory_location_mappings_read'
  ) THEN
    CREATE POLICY manager_inventory_location_mappings_read
      ON public.manager_inventory_location_mappings
      FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'super_admin'::app_role)
        OR restaurant_id IN (SELECT public.auth_restaurant_ids())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'manager_inventory_location_mappings'
      AND policyname = 'manager_inventory_location_mappings_manage'
  ) THEN
    CREATE POLICY manager_inventory_location_mappings_manage
      ON public.manager_inventory_location_mappings
      FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'super_admin'::app_role)
        OR public.is_restaurant_owner(auth.uid(), restaurant_id)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'super_admin'::app_role)
        OR public.is_restaurant_owner(auth.uid(), restaurant_id)
      );
  END IF;
END;
$$;

REVOKE ALL ON public.manager_inventory_location_mappings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_inventory_location_mappings TO authenticated;
GRANT ALL ON public.manager_inventory_location_mappings TO service_role;

-- Resolve a workspace-specific integration first, then fall back to the
-- restaurant-level integration. The fallback is still tenant-safe because the
-- restaurant/workspace relationship is asserted before lookup.
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

  SELECT i.id INTO v_integration_id
  FROM public.manager_integrations i
  WHERE i.restaurant_id = p_restaurant_id
    AND i.workspace_id IS NOT DISTINCT FROM p_workspace_id
    AND i.enabled = true
    AND i.sync_mode IN ('dry_run', 'outbox', 'live')
  ORDER BY i.updated_at DESC
  LIMIT 1;

  IF v_integration_id IS NULL AND p_workspace_id IS NOT NULL THEN
    SELECT i.id INTO v_integration_id
    FROM public.manager_integrations i
    WHERE i.restaurant_id = p_restaurant_id
      AND i.workspace_id IS NULL
      AND i.enabled = true
      AND i.sync_mode IN ('dry_run', 'outbox', 'live')
    ORDER BY i.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_integration_id IS NULL THEN
    RAISE EXCEPTION 'no enabled Manager integration for tenant';
  END IF;
  RETURN v_integration_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._manager_account_mapping_key(
  p_integration_id uuid,
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_account_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'Manager account mapping source is missing';
  END IF;

  SELECT m.manager_key INTO v_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = p_integration_id
    AND m.entity_type = 'account'
    AND m.local_id = p_account_id
    AND m.restaurant_id = p_restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM p_workspace_id
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'chart-of-account is not mapped to Manager';
  END IF;
  IF v_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager account key';
  END IF;
  RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public._manager_inventory_location_mapping_key(
  p_integration_id uuid,
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_warehouse_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF p_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'inventory location source is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.warehouses w
    WHERE w.id = p_warehouse_id
      AND w.restaurant_id = p_restaurant_id
      AND w.workspace_id IS NOT DISTINCT FROM p_workspace_id
      AND w.deleted_at IS NULL
      AND COALESCE(w.is_active, true)
  ) THEN
    RAISE EXCEPTION 'warehouse does not belong to Manager tenant workspace';
  END IF;

  SELECT m.manager_key INTO v_key
  FROM public.manager_inventory_location_mappings m
  WHERE m.integration_id = p_integration_id
    AND m.restaurant_id = p_restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM p_workspace_id
    AND m.warehouse_id = p_warehouse_id
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'warehouse has no Manager inventory-location mapping';
  END IF;
  IF v_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager inventory location key';
  END IF;
  RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_set_inventory_location_mapping(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_warehouse_id uuid,
  p_manager_key text,
  p_manager_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_integration_id uuid;
  v_id uuid;
BEGIN
  PERFORM public._manager_assert_tenant_scope(p_restaurant_id, p_workspace_id);
  IF p_manager_key IS NULL OR p_manager_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager inventory location key';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = p_warehouse_id
      AND w.restaurant_id = p_restaurant_id
      AND w.workspace_id IS NOT DISTINCT FROM p_workspace_id
      AND w.deleted_at IS NULL
      AND COALESCE(w.is_active, true)
  ) THEN
    RAISE EXCEPTION 'warehouse does not belong to tenant workspace';
  END IF;

  v_integration_id := public._manager_integration_for_tenant(p_restaurant_id, p_workspace_id);
  INSERT INTO public.manager_inventory_location_mappings (
    integration_id, restaurant_id, workspace_id, warehouse_id,
    manager_key, manager_name, source_hash, last_synced_at, updated_at
  ) VALUES (
    v_integration_id, p_restaurant_id, p_workspace_id, p_warehouse_id,
    p_manager_key, p_manager_name, md5(p_manager_key || ':' || COALESCE(p_manager_name, '')),
    now(), now()
  )
  ON CONFLICT (integration_id, warehouse_id) DO UPDATE
    SET manager_key = EXCLUDED.manager_key,
        manager_name = EXCLUDED.manager_name,
        source_hash = EXCLUDED.source_hash,
        sync_status = 'synced',
        last_error = NULL,
        last_synced_at = now(),
        updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_enqueue_journal_entry_sync(
  p_entry_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.journal_entries;
  v_integration_id uuid;
  v_manager_key text;
  v_lines jsonb;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_path text;
  v_method text;
BEGIN
  SELECT je.* INTO v_entry
  FROM public.journal_entries je
  WHERE je.id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'journal entry not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported journal entry operation'; END IF;

  v_integration_id := public._manager_integration_for_tenant(v_entry.restaurant_id, v_entry.workspace_id);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'journal_entry'
    AND m.local_id = p_entry_id
    AND m.restaurant_id = v_entry.restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM v_entry.workspace_id
  LIMIT 1;

  IF p_operation = 'delete' THEN
    IF v_manager_key IS NULL THEN RAISE EXCEPTION 'journal entry has no Manager mapping to delete'; END IF;
    v_body := '{}'::jsonb;
  ELSE
    IF NOT COALESCE(v_entry.is_posted, false) OR COALESCE(v_entry.is_deleted, false) OR COALESCE(v_entry.is_reversed, false) THEN
      RAISE EXCEPTION 'only posted, non-deleted, non-reversed journal entries may sync';
    END IF;
    IF abs(COALESCE(v_entry.total_debit, 0) - COALESCE(v_entry.total_credit, 0)) > 0.005 THEN
      RAISE EXCEPTION 'journal entry is not balanced';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.journal_entry_lines jel
      WHERE jel.entry_id = p_entry_id
        AND jel.workspace_id IS DISTINCT FROM v_entry.workspace_id
    ) THEN
      RAISE EXCEPTION 'journal entry line crosses workspace boundary';
    END IF;

    SELECT jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'Account', public._manager_account_mapping_key(v_integration_id, v_entry.restaurant_id, v_entry.workspace_id, jel.account_id),
        'Debit', NULLIF(COALESCE(jel.debit, 0), 0),
        'Credit', NULLIF(COALESCE(jel.credit, 0), 0),
        'Description', NULLIF(BTRIM(COALESCE(jel.description, '')), '')
      )) ORDER BY jel.line_order, jel.id
    ) INTO v_lines
    FROM public.journal_entry_lines jel
    WHERE jel.entry_id = p_entry_id;

    IF v_lines IS NULL OR jsonb_array_length(v_lines) < 2 THEN
      RAISE EXCEPTION 'journal entry has fewer than two Manager-compatible lines';
    END IF;

    v_body := jsonb_strip_nulls(jsonb_build_object(
      'Date', v_entry.entry_date,
      'Reference', NULLIF(BTRIM(COALESCE(v_entry.entry_number, '')), ''),
      'Narration', NULLIF(BTRIM(COALESCE(v_entry.description, '')), ''),
      'Lines', v_lines
    ));
  END IF;

  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_path := CASE WHEN v_manager_key IS NULL THEN '/journal-entry-form' ELSE '/journal-entry-form/' || v_manager_key END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_entry.entry_number,
    'source_hash', v_hash,
    'body', v_body
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_entry.restaurant_id, v_entry.workspace_id, 'journal_entry', p_operation,
    'journal_entries', p_entry_id,
    'journal_entry:' || p_entry_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_enqueue_goods_receipt_sync(
  p_receipt_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt public.inventory_receipts;
  v_integration_id uuid;
  v_manager_key text;
  v_supplier_key text;
  v_location_key text;
  v_warehouse_id uuid;
  v_lines jsonb;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_path text;
  v_method text;
BEGIN
  SELECT ir.* INTO v_receipt
  FROM public.inventory_receipts ir
  WHERE ir.id = p_receipt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'inventory receipt not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported goods receipt operation'; END IF;

  v_integration_id := public._manager_integration_for_tenant(v_receipt.restaurant_id, v_receipt.workspace_id);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'goods_receipt'
    AND m.local_id = p_receipt_id
    AND m.restaurant_id = v_receipt.restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM v_receipt.workspace_id
  LIMIT 1;

  IF p_operation = 'delete' THEN
    IF v_manager_key IS NULL THEN RAISE EXCEPTION 'goods receipt has no Manager mapping to delete'; END IF;
    v_body := '{}'::jsonb;
  ELSE
    IF COALESCE(v_receipt.status, '') IN ('draft', 'cancelled', 'voided') THEN
      RAISE EXCEPTION 'goods receipt is not posted';
    END IF;
    IF v_receipt.supplier_id IS NULL THEN RAISE EXCEPTION 'goods receipt supplier is missing'; END IF;

    SELECT m.manager_key INTO v_supplier_key
    FROM public.manager_entity_mappings m
    WHERE m.integration_id = v_integration_id
      AND m.entity_type = 'supplier'
      AND m.local_id = v_receipt.supplier_id
      AND m.restaurant_id = v_receipt.restaurant_id
      AND m.workspace_id IS NULL
    LIMIT 1;
    IF v_supplier_key IS NULL THEN RAISE EXCEPTION 'goods receipt supplier is not mapped to Manager'; END IF;

    IF EXISTS (
      SELECT 1 FROM public.inventory_receipt_items iri
      WHERE iri.inventory_receipt_id = p_receipt_id
        AND (iri.warehouse_location IS NULL OR iri.warehouse_location !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    ) THEN
      RAISE EXCEPTION 'goods receipt contains a missing or invalid warehouse location';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.inventory_receipt_items iri
      WHERE iri.inventory_receipt_id = p_receipt_id
        AND iri.warehouse_location::uuid IS DISTINCT FROM (
          SELECT iri2.warehouse_location::uuid
          FROM public.inventory_receipt_items iri2
          WHERE iri2.inventory_receipt_id = p_receipt_id
          ORDER BY iri2.id
          LIMIT 1
        )
    ) THEN
      RAISE EXCEPTION 'Manager goods receipt requires one inventory location per document';
    END IF;

    SELECT iri.warehouse_location::uuid INTO v_warehouse_id
    FROM public.inventory_receipt_items iri
    WHERE iri.inventory_receipt_id = p_receipt_id
    ORDER BY iri.id
    LIMIT 1;
    v_location_key := public._manager_inventory_location_mapping_key(v_integration_id, v_receipt.restaurant_id, v_receipt.workspace_id, v_warehouse_id);

    IF NOT EXISTS (SELECT 1 FROM public.inventory_receipt_items iri WHERE iri.inventory_receipt_id = p_receipt_id) THEN
      RAISE EXCEPTION 'goods receipt has no lines';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.inventory_receipt_items iri
      WHERE iri.inventory_receipt_id = p_receipt_id
        AND (iri.product_id IS NULL OR NOT EXISTS (
          SELECT 1
          FROM public.manager_entity_mappings m
          WHERE m.integration_id = v_integration_id
            AND m.entity_type = 'inventory_item'
            AND m.local_id = iri.product_id
            AND m.restaurant_id = v_receipt.restaurant_id
            AND m.workspace_id IS NOT DISTINCT FROM v_receipt.workspace_id
        ))
    ) THEN
      RAISE EXCEPTION 'goods receipt contains an unmapped product';
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
      'Item', public._manager_product_mapping_key(v_integration_id, v_receipt.restaurant_id, v_receipt.workspace_id, iri.product_id),
      'Qty', COALESCE(iri.quantity, 0)
    ) ORDER BY iri.id) INTO v_lines
    FROM public.inventory_receipt_items iri
    WHERE iri.inventory_receipt_id = p_receipt_id;

    v_body := jsonb_strip_nulls(jsonb_build_object(
      'Date', to_char((v_receipt.receipt_date AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD'),
      'Reference', NULLIF(BTRIM(COALESCE(v_receipt.receipt_number, '')), ''),
      'Supplier', v_supplier_key,
      'InventoryLocation', v_location_key,
      'Description', NULLIF(BTRIM(COALESCE(v_receipt.notes, '')), ''),
      'Lines', v_lines
    ));
  END IF;

  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_path := CASE WHEN v_manager_key IS NULL THEN '/goods-receipt-form' ELSE '/goods-receipt-form/' || v_manager_key END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_receipt.receipt_number,
    'source_hash', v_hash,
    'body', v_body
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_receipt.restaurant_id, v_receipt.workspace_id, 'goods_receipt', p_operation,
    'inventory_receipts', p_receipt_id,
    'goods_receipt:' || p_receipt_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_enqueue_inventory_transfer_sync(
  p_transfer_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer public.inventory_transfers;
  v_integration_id uuid;
  v_manager_key text;
  v_from_key text;
  v_to_key text;
  v_lines jsonb;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_path text;
  v_method text;
BEGIN
  SELECT it.* INTO v_transfer
  FROM public.inventory_transfers it
  WHERE it.id = p_transfer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'inventory transfer not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported inventory transfer operation'; END IF;

  v_integration_id := public._manager_integration_for_tenant(v_transfer.restaurant_id, v_transfer.workspace_id);
  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'inventory_transfer'
    AND m.local_id = p_transfer_id
    AND m.restaurant_id = v_transfer.restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM v_transfer.workspace_id
  LIMIT 1;

  IF p_operation = 'delete' THEN
    IF v_manager_key IS NULL THEN RAISE EXCEPTION 'inventory transfer has no Manager mapping to delete'; END IF;
    v_body := '{}'::jsonb;
  ELSE
    IF COALESCE(v_transfer.status, '') IN ('voided', 'cancelled') THEN
      RAISE EXCEPTION 'voided/cancelled inventory transfer requires a reversal adapter';
    END IF;
    IF v_transfer.from_warehouse_id IS NULL OR v_transfer.to_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'inventory transfer requires both source and destination warehouses';
    END IF;
    IF v_transfer.from_warehouse_id = v_transfer.to_warehouse_id THEN
      RAISE EXCEPTION 'inventory transfer source and destination must differ';
    END IF;

    v_from_key := public._manager_inventory_location_mapping_key(v_integration_id, v_transfer.restaurant_id, v_transfer.workspace_id, v_transfer.from_warehouse_id);
    v_to_key := public._manager_inventory_location_mapping_key(v_integration_id, v_transfer.restaurant_id, v_transfer.workspace_id, v_transfer.to_warehouse_id);

    IF EXISTS (
      SELECT 1
      FROM public.inventory_transfer_items iti
      WHERE iti.transfer_id = p_transfer_id
        AND (iti.product_id IS NULL OR COALESCE(iti.quantity, 0) <= 0 OR NOT EXISTS (
          SELECT 1
          FROM public.manager_entity_mappings m
          WHERE m.integration_id = v_integration_id
            AND m.entity_type = 'inventory_item'
            AND m.local_id = iti.product_id
            AND m.restaurant_id = v_transfer.restaurant_id
            AND m.workspace_id IS NOT DISTINCT FROM v_transfer.workspace_id
        ))
    ) THEN
      RAISE EXCEPTION 'inventory transfer contains an invalid or unmapped line';
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
      'Item', public._manager_product_mapping_key(v_integration_id, v_transfer.restaurant_id, v_transfer.workspace_id, iti.product_id),
      'Qty', COALESCE(iti.quantity, 0)
    ) ORDER BY iti.id) INTO v_lines
    FROM public.inventory_transfer_items iti
    WHERE iti.transfer_id = p_transfer_id;
    IF v_lines IS NULL OR jsonb_array_length(v_lines) = 0 THEN
      RAISE EXCEPTION 'inventory transfer has no lines';
    END IF;

    v_body := jsonb_strip_nulls(jsonb_build_object(
      'Date', to_char((v_transfer.transfer_date AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD'),
      'Reference', 'IT-' || upper(right(replace(p_transfer_id::text, '-', ''), 12)),
      'InventoryLocation', v_from_key,
      'ToInventoryLocation', v_to_key,
      'Description', NULLIF(BTRIM(COALESCE(v_transfer.notes, '')), ''),
      'Lines', v_lines
    ));
  END IF;

  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_path := CASE WHEN v_manager_key IS NULL THEN '/inventory-transfer-form' ELSE '/inventory-transfer-form/' || v_manager_key END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', 'IT-' || upper(right(replace(p_transfer_id::text, '-', ''), 12)),
    'source_hash', v_hash,
    'body', v_body
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_transfer.restaurant_id, v_transfer.workspace_id, 'inventory_transfer', p_operation,
    'inventory_transfers', p_transfer_id,
    'inventory_transfer:' || p_transfer_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public._manager_account_mapping_key(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._manager_inventory_location_mapping_key(uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_set_inventory_location_mapping(uuid, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_journal_entry_sync(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_goods_receipt_sync(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_inventory_transfer_sync(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.manager_enqueue_journal_entry_sync(uuid, text) IS 'Queues only posted, balanced, non-deleted, non-reversed journal entries with explicit Manager account mappings.';
COMMENT ON FUNCTION public.manager_enqueue_goods_receipt_sync(uuid, text) IS 'Queues one-location posted goods receipts with explicit supplier, product, and warehouse mappings.';
COMMENT ON FUNCTION public.manager_enqueue_inventory_transfer_sync(uuid, text) IS 'Queues inventory transfers using API2 InventoryLocation/ToInventoryLocation fields and explicit warehouse mappings.';

COMMIT;
