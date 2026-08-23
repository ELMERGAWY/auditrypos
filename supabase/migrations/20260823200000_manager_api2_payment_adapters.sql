-- AuditryPOS Manager API2 payment/receipt adapters.
-- Additive-only: no triggers, destructive DDL, or direct network calls.
-- Customer payments use receipt-form; supplier payments use payment-form.
-- Expense/other payments remain blocked until their accounting allocation
-- contract is mapped explicitly rather than guessed.

BEGIN;

CREATE OR REPLACE FUNCTION public._manager_bank_account_mapping_key(
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
    RAISE EXCEPTION 'bank/cash account is required';
  END IF;

  SELECT m.manager_key INTO v_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = p_integration_id
    AND m.entity_type = 'bank_account'
    AND m.local_id = p_account_id
    AND m.restaurant_id = p_restaurant_id
    AND m.workspace_id IS NOT DISTINCT FROM p_workspace_id
  LIMIT 1;

  IF v_key IS NULL THEN
    SELECT m.manager_key INTO v_key
    FROM public.manager_entity_mappings m
    WHERE m.integration_id = p_integration_id
      AND m.entity_type = 'account'
      AND m.local_id = p_account_id
      AND m.restaurant_id = p_restaurant_id
      AND m.workspace_id IS NOT DISTINCT FROM p_workspace_id
    LIMIT 1;
  END IF;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'bank/cash account is not mapped to Manager';
  END IF;
  IF v_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'unsafe Manager bank/cash account key';
  END IF;
  RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_enqueue_payment_sync(
  p_payment_id uuid,
  p_counter_account_id uuid,
  p_operation text DEFAULT 'upsert'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments;
  v_integration_id uuid;
  v_manager_key text;
  v_party_key text;
  v_bank_key text;
  v_counter_key text;
  v_entity_type text;
  v_manager_entity_type text;
  v_manager_path text;
  v_body jsonb;
  v_payload jsonb;
  v_hash text;
  v_method text;
BEGIN
  SELECT p.* INTO v_payment
  FROM public.payments p
  WHERE p.id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF p_operation NOT IN ('upsert', 'delete') THEN RAISE EXCEPTION 'unsupported payment operation'; END IF;
  IF v_payment.payment_type NOT IN ('customer', 'supplier') THEN
    RAISE EXCEPTION 'expense/other payments require an explicit allocation adapter';
  END IF;

  v_entity_type := lower(COALESCE(v_payment.payment_type, ''));
  v_manager_entity_type := CASE WHEN v_entity_type = 'customer' THEN 'receipt' ELSE 'payment' END;
  v_manager_path := CASE WHEN v_entity_type = 'customer' THEN '/receipt-form' ELSE '/payment-form' END;
  v_integration_id := public._manager_integration_for_tenant(v_payment.restaurant_id, NULL);

  SELECT m.manager_key INTO v_manager_key
  FROM public.manager_entity_mappings m
  WHERE m.integration_id = v_integration_id
    AND m.entity_type = v_manager_entity_type
    AND m.local_id = p_payment_id
    AND m.restaurant_id = v_payment.restaurant_id
    AND m.workspace_id IS NULL
  LIMIT 1;

  IF p_operation = 'delete' THEN
    IF v_manager_key IS NULL THEN RAISE EXCEPTION 'payment has no Manager mapping to delete'; END IF;
    v_body := '{}'::jsonb;
  ELSE
    IF COALESCE(v_payment.status, '') <> 'posted' THEN
      RAISE EXCEPTION 'only posted payments may sync to Manager';
    END IF;
    IF COALESCE(v_payment.amount, 0) <= 0 THEN
      RAISE EXCEPTION 'payment amount must be positive';
    END IF;
    IF v_payment.entity_id IS NULL THEN RAISE EXCEPTION 'payment party is missing'; END IF;
    IF p_counter_account_id IS NULL THEN RAISE EXCEPTION 'counter account is required'; END IF;

    IF v_entity_type = 'customer' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.manager_entity_mappings m
        WHERE m.integration_id = v_integration_id
          AND m.entity_type = 'customer'
          AND m.local_id = v_payment.entity_id
          AND m.restaurant_id = v_payment.restaurant_id
          AND m.workspace_id IS NULL
      ) THEN
        RAISE EXCEPTION 'customer is not mapped to Manager';
      END IF;
      SELECT m.manager_key INTO v_party_key
      FROM public.manager_entity_mappings m
      WHERE m.integration_id = v_integration_id
        AND m.entity_type = 'customer'
        AND m.local_id = v_payment.entity_id
        AND m.restaurant_id = v_payment.restaurant_id
        AND m.workspace_id IS NULL
      LIMIT 1;
      v_bank_key := public._manager_bank_account_mapping_key(v_integration_id, v_payment.restaurant_id, NULL, v_payment.bank_account_id);
      v_counter_key := public._manager_account_mapping_key(v_integration_id, v_payment.restaurant_id, NULL, p_counter_account_id);
      v_body := jsonb_strip_nulls(jsonb_build_object(
        'Date', v_payment.payment_date,
        'Reference', NULLIF(BTRIM(COALESCE(v_payment.payment_number, '')), ''),
        'Description', NULLIF(BTRIM(COALESCE(v_payment.description, '')), ''),
        'ReceivedIn', v_bank_key,
        'Amount', v_payment.amount,
        'Lines', jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'Account', v_counter_key,
          'AccountsReceivableCustomer', v_party_key,
          'Amount', v_payment.amount
        )))
      ));
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM public.manager_entity_mappings m
        WHERE m.integration_id = v_integration_id
          AND m.entity_type = 'supplier'
          AND m.local_id = v_payment.entity_id
          AND m.restaurant_id = v_payment.restaurant_id
          AND m.workspace_id IS NULL
      ) THEN
        RAISE EXCEPTION 'supplier is not mapped to Manager';
      END IF;
      SELECT m.manager_key INTO v_party_key
      FROM public.manager_entity_mappings m
      WHERE m.integration_id = v_integration_id
        AND m.entity_type = 'supplier'
        AND m.local_id = v_payment.entity_id
        AND m.restaurant_id = v_payment.restaurant_id
        AND m.workspace_id IS NULL
      LIMIT 1;
      v_bank_key := public._manager_bank_account_mapping_key(v_integration_id, v_payment.restaurant_id, NULL, v_payment.bank_account_id);
      v_counter_key := public._manager_account_mapping_key(v_integration_id, v_payment.restaurant_id, NULL, p_counter_account_id);
      v_body := jsonb_strip_nulls(jsonb_build_object(
        'Date', v_payment.payment_date,
        'Reference', NULLIF(BTRIM(COALESCE(v_payment.payment_number, '')), ''),
        'Description', NULLIF(BTRIM(COALESCE(v_payment.description, '')), ''),
        'PaidFrom', v_bank_key,
        'Payee', 2,
        'Supplier', v_party_key,
        'Lines', jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'Account', v_counter_key,
          'AccountsPayableSupplier', v_party_key,
          'Amount', v_payment.amount
        )))
      ));
    END IF;
  END IF;

  v_hash := md5(v_body::text);
  v_method := CASE WHEN p_operation = 'delete' THEN 'DELETE' WHEN v_manager_key IS NULL THEN 'POST' ELSE 'PUT' END;
  v_payload := jsonb_build_object(
    'manager_path', CASE WHEN v_manager_key IS NULL THEN v_manager_path ELSE v_manager_path || '/' || v_manager_key END,
    'method', v_method,
    'manager_key', v_manager_key,
    'manager_name', v_payment.payment_number,
    'source_hash', v_hash,
    'body', v_body
  );

  RETURN public._manager_enqueue_entity(
    v_integration_id, v_payment.restaurant_id, NULL, v_manager_entity_type, p_operation,
    'payments', p_payment_id,
    v_manager_entity_type || ':' || p_payment_id::text || ':' || p_operation || ':' || v_hash,
    v_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public._manager_bank_account_mapping_key(uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_enqueue_payment_sync(uuid, uuid, text) TO authenticated;
COMMENT ON FUNCTION public.manager_enqueue_payment_sync(uuid, uuid, text) IS 'Queues posted customer receipts or supplier payments with explicit party, bank/cash, and counter-account mappings; blocks expense/other types.';

COMMIT;
