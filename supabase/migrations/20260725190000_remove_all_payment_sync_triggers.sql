-- Remove all payment sync triggers and functions to prevent auto-updating paid_amount
-- This ensures paid_amount remains as the direct payment entered by user only

BEGIN;

-- 1. Drop all payment sync triggers on orders table
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_paid_with_allocations ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_to_sales_order ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_sales_order_to_order ON public.sales_orders;

-- 2. Drop all payment sync triggers on sales_invoices table
DROP TRIGGER IF EXISTS trigger_sync_invoice_paid_amount ON public.sales_invoices;

-- 3. Drop protection trigger that may interfere with manual updates
DROP TRIGGER IF EXISTS trg_protect_order_paid_amount ON public.orders;
DROP FUNCTION IF EXISTS public.protect_order_paid_amount() CASCADE;

-- 4. Drop all payment sync functions
DROP FUNCTION IF EXISTS public.sync_order_paid_amount() CASCADE;
DROP FUNCTION IF EXISTS public.sync_invoice_paid_amount() CASCADE;
DROP FUNCTION IF EXISTS public.sync_order_paid_amount_with_allocations() CASCADE;
DROP FUNCTION IF EXISTS public.sync_order_to_sales_order() CASCADE;
DROP FUNCTION IF EXISTS public.sync_sales_order_to_order() CASCADE;
DROP FUNCTION IF EXISTS public.get_order_total_paid() CASCADE;

-- 5. Modify upsert_pos_order to use direct value instead of GREATEST (prevents accumulation)
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

  SELECT * INTO v_order
  FROM public.orders
  WHERE client_order_id = v_client_id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.orders
    SET
      paid_amount = v_paid,  -- Use direct value, not GREATEST
      direct_paid_amount = v_paid,  -- Use direct value, not GREATEST
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
      direct_paid_amount = v_paid,  -- Use direct value, not GREATEST
      total = CASE WHEN v_total > 0 THEN v_total ELSE total END,
      status = COALESCE(NULLIF(p_payload->>'status', ''), status),
      updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
    RETURN v_order;
  END IF;

  BEGIN
    INSERT INTO public.orders (
      restaurant_id, order_number, total, discount, status,
      table_number, order_type, customer_name, customer_phone, customer_ref,
      delivery_address, delivery_date, delivery_agent_id, payment_method,
      paid_amount, direct_paid_amount, notes, client_order_id, customer_id
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
      paid_amount = v_paid,  -- Use direct value, not GREATEST
      direct_paid_amount = v_paid,  -- Use direct value, not GREATEST
      updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
  END;

  RETURN v_order;
END;
$$;

-- 6. Notify Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Removed all payment sync triggers and functions';
  RAISE NOTICE '✅ Removed protection trigger that may interfere';
  RAISE NOTICE '✅ Modified upsert_pos_order to use direct value instead of GREATEST';
  RAISE NOTICE '✅ paid_amount will now remain as direct user input only';
END $$;
