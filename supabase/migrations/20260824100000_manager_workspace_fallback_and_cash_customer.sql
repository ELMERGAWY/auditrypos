-- Manager workspace fallback and deterministic cash-customer adapter.
-- Additive-only: no data deletion and no automatic triggers.

BEGIN;

-- A restaurant-level integration is a valid fallback for a child workspace.
-- Keep the outbox row workspace-scoped while allowing the integration record to
-- remain restaurant-scoped, so tenant isolation is preserved.
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
SET search_path = public, pg_temp
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
      AND (
        i.workspace_id IS NOT DISTINCT FROM p_workspace_id
        OR (p_workspace_id IS NOT NULL AND i.workspace_id IS NULL)
      )
      AND i.enabled = true
      AND i.sync_mode IN ('dry_run', 'outbox', 'live')
  ) THEN
    RAISE EXCEPTION 'Manager integration is not enabled for tenant';
  END IF;

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
    integration_id, restaurant_id, workspace_id, entity_type, operation,
    source_table, source_id, idempotency_key, payload
  )
  VALUES (
    p_integration_id, p_restaurant_id, p_workspace_id, p_entity_type, p_operation,
    p_source_table, p_source_id, p_idempotency_key, COALESCE(p_payload, '{}'::jsonb)
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
SET search_path = public, pg_temp
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
  v_manager_name text;
BEGIN
  SELECT c.* INTO v_customer
  FROM public.customers c
  WHERE c.id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer not found';
  END IF;

  v_integration_id := public._manager_integration_for_tenant(
    v_customer.restaurant_id,
    v_customer.workspace_id
  );

  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = 'customer'
    AND m.local_id = p_customer_id
    AND m.restaurant_id = v_customer.restaurant_id
    AND (
      m.workspace_id IS NOT DISTINCT FROM v_customer.workspace_id
      OR (v_customer.workspace_id IS NOT NULL AND m.workspace_id IS NULL)
    )
  ORDER BY CASE WHEN m.workspace_id IS NOT DISTINCT FROM v_customer.workspace_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF p_operation = 'delete' AND v_manager_key IS NULL THEN
    RAISE EXCEPTION 'customer has no Manager mapping to delete';
  END IF;

  IF v_manager_key IS NOT NULL AND v_manager_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager key';
  END IF;

  v_manager_name := CASE
    WHEN lower(COALESCE(v_customer.customer_type, '')) IN ('cash', 'walk_in', 'walk-in')
      THEN COALESCE(NULLIF(BTRIM(v_customer.name), ''), 'Cash Customer')
           || CASE WHEN NULLIF(BTRIM(v_customer.customer_ref), '') IS NULL
                   THEN ''
                   ELSE ' [' || BTRIM(v_customer.customer_ref) || ']'
              END
    ELSE NULLIF(BTRIM(v_customer.name), '')
  END;

  -- Only verified Customer form fields are sent. Manager assigns its own UUID
  -- and generated display fields; the deterministic local ref stays in Name.
  v_body := jsonb_strip_nulls(jsonb_build_object(
    'Name', v_manager_name,
    'Email', NULLIF(BTRIM(COALESCE(v_customer.email, '')), '')
  ));
  v_hash := md5(v_body::text);
  v_method := CASE
    WHEN p_operation = 'delete' THEN 'DELETE'
    WHEN v_manager_key IS NULL THEN 'POST'
    ELSE 'PUT'
  END;
  v_path := CASE
    WHEN v_manager_key IS NULL THEN '/customer-form'
    ELSE '/customer-form/' || v_manager_key
  END;
  v_payload := jsonb_build_object(
    'manager_path', v_path,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_manager_name,
    'source_hash', v_hash,
    'body', CASE WHEN p_operation = 'delete' THEN '{}'::jsonb ELSE v_body END
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id,
    v_customer.restaurant_id,
    v_customer.workspace_id,
    'customer',
    p_operation,
    'customers',
    p_customer_id,
    'customer:' || p_customer_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manager_enqueue_customer_sync(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_customer_sync(uuid, text) TO authenticated, service_role;

-- Manual sync request: only re-queues recoverable events. Network delivery stays
-- in the server-side worker, so POS checkout is never blocked by Manager latency.
CREATE OR REPLACE FUNCTION public.request_manager_sync(
  p_restaurant_id uuid,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_integration_id uuid;
  v_requeued integer := 0;
BEGIN
  PERFORM public._manager_assert_tenant_scope(p_restaurant_id, p_workspace_id);
  v_integration_id := public._manager_integration_for_tenant(p_restaurant_id, p_workspace_id);

  UPDATE public.manager_sync_outbox
     SET status = 'pending',
         available_at = now(),
         locked_at = NULL,
         last_error = NULL,
         updated_at = now()
   WHERE integration_id = v_integration_id
     AND restaurant_id = p_restaurant_id
     AND (p_workspace_id IS NULL OR workspace_id IS NOT DISTINCT FROM p_workspace_id)
     AND status IN ('failed', 'cancelled');

  GET DIAGNOSTICS v_requeued = ROW_COUNT;
  RETURN jsonb_build_object(
    'success', true,
    'integration_id', v_integration_id,
    'requeued', v_requeued,
    'queued', (
      SELECT count(*)
      FROM public.manager_sync_outbox o
      WHERE o.integration_id = v_integration_id
        AND o.restaurant_id = p_restaurant_id
        AND (p_workspace_id IS NULL OR o.workspace_id IS NOT DISTINCT FROM p_workspace_id)
        AND o.status IN ('pending', 'processing')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_manager_sync(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_manager_sync(uuid, uuid) TO authenticated, service_role;

-- Tenant-scoped claim used by the authenticated manual-sync path. The worker
-- remains the only caller; this function never performs network I/O.
CREATE OR REPLACE FUNCTION public.claim_manager_sync_outbox_for_tenant(
  p_restaurant_id uuid,
  p_workspace_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 25
)
RETURNS SETOF public.manager_sync_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.manager_sync_outbox;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required';
  END IF;

  FOR v_row IN
    SELECT *
    FROM public.manager_sync_outbox
    WHERE restaurant_id = p_restaurant_id
      AND (p_workspace_id IS NULL OR workspace_id IS NOT DISTINCT FROM p_workspace_id)
      AND status = 'pending'
      AND available_at <= now()
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
  LOOP
    UPDATE public.manager_sync_outbox
       SET status = 'processing', locked_at = now(), attempts = attempts + 1, updated_at = now()
     WHERE id = v_row.id
     RETURNING * INTO v_row;
    RETURN NEXT v_row;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_manager_sync_outbox_for_tenant(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_manager_sync_outbox_for_tenant(uuid, uuid, integer) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
