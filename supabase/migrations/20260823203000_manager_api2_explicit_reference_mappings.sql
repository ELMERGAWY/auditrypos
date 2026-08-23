-- Explicit Manager API2 reference mappings for accounts and bank/cash accounts.
-- Additive-only: mapping metadata only; no local or Manager balances are changed.
-- These functions intentionally require an administrator/owner and a verified
-- local account/tenant before accepting a Manager key.

BEGIN;

CREATE OR REPLACE FUNCTION public.manager_set_account_mapping(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_account_id uuid,
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
    RAISE EXCEPTION 'unsafe Manager account key';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.chart_of_accounts coa
    WHERE coa.id = p_account_id
      AND coa.restaurant_id = p_restaurant_id
      AND coa.workspace_id IS NOT DISTINCT FROM p_workspace_id
  ) THEN
    RAISE EXCEPTION 'account does not belong to tenant workspace';
  END IF;

  v_integration_id := public._manager_integration_for_tenant(p_restaurant_id, p_workspace_id);
  INSERT INTO public.manager_entity_mappings (
    integration_id, restaurant_id, workspace_id, entity_type,
    local_table, local_id, manager_key, manager_name,
    sync_status, source_hash, last_synced_at, updated_at
  ) VALUES (
    v_integration_id, p_restaurant_id, p_workspace_id, 'account',
    'chart_of_accounts', p_account_id, p_manager_key, p_manager_name,
    'synced', md5(p_manager_key || ':' || COALESCE(p_manager_name, '')), now(), now()
  )
  ON CONFLICT (integration_id, entity_type, local_id) DO UPDATE
    SET manager_key = EXCLUDED.manager_key,
        manager_name = EXCLUDED.manager_name,
        sync_status = 'synced',
        source_hash = EXCLUDED.source_hash,
        last_synced_at = now(),
        last_error = NULL,
        updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_set_bank_account_mapping(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_account_id uuid,
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
    RAISE EXCEPTION 'unsafe Manager bank/cash account key';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.chart_of_accounts coa
    WHERE coa.id = p_account_id
      AND coa.restaurant_id = p_restaurant_id
      AND coa.workspace_id IS NOT DISTINCT FROM p_workspace_id
  ) THEN
    RAISE EXCEPTION 'bank/cash account does not belong to tenant workspace';
  END IF;

  v_integration_id := public._manager_integration_for_tenant(p_restaurant_id, p_workspace_id);
  INSERT INTO public.manager_entity_mappings (
    integration_id, restaurant_id, workspace_id, entity_type,
    local_table, local_id, manager_key, manager_name,
    sync_status, source_hash, last_synced_at, updated_at
  ) VALUES (
    v_integration_id, p_restaurant_id, p_workspace_id, 'bank_account',
    'chart_of_accounts', p_account_id, p_manager_key, p_manager_name,
    'synced', md5(p_manager_key || ':' || COALESCE(p_manager_name, '')), now(), now()
  )
  ON CONFLICT (integration_id, entity_type, local_id) DO UPDATE
    SET manager_key = EXCLUDED.manager_key,
        manager_name = EXCLUDED.manager_name,
        sync_status = 'synced',
        source_hash = EXCLUDED.source_hash,
        last_synced_at = now(),
        last_error = NULL,
        updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manager_set_account_mapping(uuid, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_set_bank_account_mapping(uuid, uuid, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.manager_set_account_mapping(uuid, uuid, uuid, text, text) IS 'Explicitly maps one tenant-scoped AuditryPOS chart-of-account row to an existing Manager account key.';
COMMENT ON FUNCTION public.manager_set_bank_account_mapping(uuid, uuid, uuid, text, text) IS 'Explicitly maps one tenant-scoped AuditryPOS bank/cash chart-of-account row to an existing Manager bank/cash account key.';

COMMIT;
