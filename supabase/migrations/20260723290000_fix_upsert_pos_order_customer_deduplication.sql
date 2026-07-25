-- Fix upsert_pos_order to properly handle customer deduplication
-- The function was not calling find_or_create_customer, causing duplicate customers

BEGIN;

-- Update the upsert_pos_order function to use find_or_create_customer for deduplication
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
  v_customer_name text := NULLIF(TRIM(p_payload->>'customer_name'), '');
  v_customer_phone text := NULLIF(TRIM(p_payload->>'customer_phone'), '');
  v_customer_id uuid := NULLIF(p_payload->>'customer_id', '')::uuid;
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

  -- Find or create customer if customer_id is not provided but customer_name is
  IF v_customer_id IS NULL AND v_customer_name IS NOT NULL AND v_customer_name != 'عميل نقدي' THEN
    v_customer_id := public.find_or_create_customer(
      v_restaurant_id,
      v_customer_name,
      v_customer_phone
    );
  END IF;

  -- 1) Existing by client_order_id
  SELECT * INTO v_order
  FROM public.orders
  WHERE client_order_id = v_client_id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.orders
    SET
      paid_amount = v_paid,  -- Use direct value, not GREATEST
      total = CASE WHEN v_total > 0 THEN v_total ELSE total END,
      discount = COALESCE((p_payload->>'discount')::numeric, discount),
      status = COALESCE(NULLIF(p_payload->>'status', ''), status),
      payment_method = COALESCE(NULLIF(p_payload->>'payment_method', ''), payment_method),
      customer_id = COALESCE(v_customer_id, customer_id),
      customer_name = COALESCE(v_customer_name, customer_name),
      customer_phone = COALESCE(v_customer_phone, customer_phone),
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
      paid_amount = v_paid,  -- Use direct value, not GREATEST
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
      COALESCE(v_customer_name, 'عميل نقدي'),
      COALESCE(v_customer_phone, ''),
      NULLIF(p_payload->>'customer_ref', ''),
      COALESCE(p_payload->>'delivery_address', ''),
      NULLIF(p_payload->>'delivery_date', '')::timestamptz,
      NULLIF(p_payload->>'delivery_agent_id', '')::uuid,
      COALESCE(NULLIF(p_payload->>'payment_method', ''), 'cash'),
      v_paid,
      COALESCE(p_payload->>'notes', ''),
      v_client_id,
      v_customer_id
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
      paid_amount = v_paid,  -- Use direct value, not GREATEST
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

COMMIT;
