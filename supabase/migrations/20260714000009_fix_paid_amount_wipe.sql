-- ============================================================
-- FIX: paid_amount being wiped after checkout
-- ============================================================
-- Symptom: UI shows paid correctly right after sale (optimistic),
-- then after refresh / a few seconds paid_amount becomes 0.
-- Cause: sync triggers (orders <-> sales_invoices / sales_orders)
-- overwrite orders.paid_amount with 0 from linked invoices.
-- ============================================================

BEGIN;

-- Legacy orders tables may not contain the separate direct-payment field.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS direct_paid_amount NUMERIC(15,4) NOT NULL DEFAULT 0;

-- 1) Drop ALL bidirectional paid/payment sync triggers
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_invoice_paid_amount ON public.sales_invoices;
DROP TRIGGER IF EXISTS trigger_sync_order_to_sales_order ON public.orders;
DO $sales_orders_paid_trigger_guard$
BEGIN
  IF to_regclass('public.sales_orders') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_sync_sales_order_to_order ON public.sales_orders';
  ELSE
    RAISE NOTICE 'sales_orders is not installed; skipped optional paid sync trigger removal';
  END IF;
END;
$sales_orders_paid_trigger_guard$;

DROP FUNCTION IF EXISTS public.sync_order_paid_amount() CASCADE;
DROP FUNCTION IF EXISTS public.sync_invoice_paid_amount() CASCADE;
DROP FUNCTION IF EXISTS public.sync_order_to_sales_order() CASCADE;
DROP FUNCTION IF EXISTS public.sync_sales_order_to_order() CASCADE;

-- 2) Protect paid_amount from being zeroed by side-effect triggers
CREATE OR REPLACE FUNCTION public.protect_order_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Prevent accidental wipe of payment while order is active
    IF COALESCE(OLD.paid_amount, 0) > 0
       AND COALESCE(NEW.paid_amount, 0) < COALESCE(OLD.paid_amount, 0)
       AND COALESCE(NEW.status, '') NOT IN ('cancelled', 'refunded') THEN
      NEW.paid_amount := OLD.paid_amount;
    END IF;

    IF COALESCE(OLD.direct_paid_amount, 0) > 0
       AND COALESCE(NEW.direct_paid_amount, 0) < COALESCE(OLD.direct_paid_amount, 0)
       AND COALESCE(NEW.status, '') NOT IN ('cancelled', 'refunded') THEN
      NEW.direct_paid_amount := OLD.direct_paid_amount;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_paid_amount ON public.orders;
CREATE TRIGGER trg_protect_order_paid_amount
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.protect_order_paid_amount();

-- 3) One-time repair: restore wiped payments from direct_paid_amount when available
UPDATE public.orders
SET paid_amount = direct_paid_amount
WHERE COALESCE(paid_amount, 0) = 0
  AND COALESCE(direct_paid_amount, 0) > 0
  AND COALESCE(status, '') NOT IN ('cancelled', 'refunded');

-- 4) Ensure upsert_pos_order also writes direct_paid_amount
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

GRANT EXECUTE ON FUNCTION public.upsert_pos_order(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_pos_order(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_pos_order(jsonb) TO service_role;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'PAID AMOUNT WIPE FIX APPLIED';
  RAISE NOTICE '1. Removed order/invoice/sales_order paid sync triggers';
  RAISE NOTICE '2. Added BEFORE UPDATE protection against paid wipe';
  RAISE NOTICE '3. Restored paid_amount from direct_paid_amount where possible';
  RAISE NOTICE '4. upsert_pos_order now persists direct_paid_amount';
  RAISE NOTICE '============================================================';
END $$;
