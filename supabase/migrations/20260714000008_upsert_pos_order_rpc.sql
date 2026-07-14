-- ============================================================
-- ATOMIC POS ORDER UPSERT (server-side idempotency)
-- ============================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_order_id
  ON public.orders (client_order_id)
  WHERE client_order_id IS NOT NULL;

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
  v_paid numeric := COALESCE((p_payload->>'paid_amount')::numeric, 0);
  v_total numeric := COALESCE((p_payload->>'total')::numeric, 0);
BEGIN
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id is required';
  END IF;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'client_order_id is required';
  END IF;

  IF v_order_number IS NULL THEN
    v_order_number := 'ORD-' || UPPER(RIGHT(REPLACE(v_client_id, '-', ''), 8));
  END IF;

  -- 1) Existing by client_order_id
  SELECT * INTO v_order
  FROM public.orders
  WHERE client_order_id = v_client_id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.orders
    SET
      paid_amount = GREATEST(COALESCE(paid_amount, 0), v_paid),
      total = CASE WHEN v_total > 0 THEN v_total ELSE total END,
      discount = COALESCE((p_payload->>'discount')::numeric, discount),
      status = COALESCE(NULLIF(p_payload->>'status', ''), status),
      payment_method = COALESCE(NULLIF(p_payload->>'payment_method', ''), payment_method),
      customer_id = COALESCE(NULLIF(p_payload->>'customer_id', '')::uuid, customer_id),
      customer_name = COALESCE(NULLIF(p_payload->>'customer_name', ''), customer_name),
      customer_phone = COALESCE(NULLIF(p_payload->>'customer_phone', ''), customer_phone),
      notes = COALESCE(NULLIF(p_payload->>'notes', ''), notes),
      updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
    RETURN v_order;
  END IF;

  -- 2) Existing by order_number (same invoice)
  SELECT * INTO v_order
  FROM public.orders
  WHERE restaurant_id = v_restaurant_id
    AND order_number = v_order_number
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.orders
    SET
      client_order_id = COALESCE(client_order_id, v_client_id),
      paid_amount = GREATEST(COALESCE(paid_amount, 0), v_paid),
      total = CASE WHEN v_total > 0 THEN v_total ELSE total END,
      status = COALESCE(NULLIF(p_payload->>'status', ''), status),
      updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
    RETURN v_order;
  END IF;

  -- 3) Insert; on race unique violation, re-select
  BEGIN
    INSERT INTO public.orders (
      restaurant_id, order_number, total, discount, status,
      table_number, order_type, customer_name, customer_phone, customer_ref,
      delivery_address, delivery_date, delivery_agent_id, payment_method,
      paid_amount, notes, client_order_id, customer_id
    ) VALUES (
      v_restaurant_id,
      v_order_number,
      v_total,
      COALESCE((p_payload->>'discount')::numeric, 0),
      COALESCE(NULLIF(p_payload->>'status', ''), 'completed'),
      NULLIF(p_payload->>'table_number', '')::int,
      COALESCE(NULLIF(p_payload->>'order_type', ''), 'takeaway'),
      COALESCE(NULLIF(p_payload->>'customer_name', ''), 'عميل نقدي'),
      COALESCE(p_payload->>'customer_phone', ''),
      NULLIF(p_payload->>'customer_ref', ''),
      COALESCE(p_payload->>'delivery_address', ''),
      NULLIF(p_payload->>'delivery_date', '')::timestamptz,
      NULLIF(p_payload->>'delivery_agent_id', '')::uuid,
      COALESCE(NULLIF(p_payload->>'payment_method', ''), 'cash'),
      v_paid,
      COALESCE(p_payload->>'notes', ''),
      v_client_id,
      NULLIF(p_payload->>'customer_id', '')::uuid
    )
    RETURNING * INTO v_order;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_order
    FROM public.orders
    WHERE client_order_id = v_client_id
       OR (restaurant_id = v_restaurant_id AND order_number = v_order_number)
    ORDER BY CASE WHEN client_order_id = v_client_id THEN 0 ELSE 1 END
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE;
    END IF;

    UPDATE public.orders
    SET
      client_order_id = COALESCE(client_order_id, v_client_id),
      paid_amount = GREATEST(COALESCE(paid_amount, 0), v_paid),
      updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
  END;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_pos_order(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_pos_order(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_pos_order(jsonb) TO service_role;

DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_invoice_paid_amount ON public.sales_invoices;

COMMIT;
