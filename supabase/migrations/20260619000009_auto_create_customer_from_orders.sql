-- ============================================================
-- AUTO-CREATE CUSTOMER FROM POS ORDERS & LINK EXISTING ORDERS
-- ============================================================

BEGIN;

-- 1. Create function to find or create customer
CREATE OR REPLACE FUNCTION public.find_or_create_customer(
  p_restaurant_id UUID,
  p_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_trimmed_name TEXT;
  v_trimmed_phone TEXT;
BEGIN
  -- Skip if name is empty or "عميل نقدي"
  v_trimmed_name := TRIM(COALESCE(p_name, ''));
  v_trimmed_phone := TRIM(COALESCE(p_phone, ''));

  IF v_trimmed_name = '' OR v_trimmed_name = 'عميل نقدي' THEN
    RETURN NULL;
  END IF;

  -- Try to find existing customer by phone or name
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE restaurant_id = p_restaurant_id
  AND (
    (v_trimmed_phone != '' AND phone = v_trimmed_phone)
    OR
    LOWER(name) = LOWER(v_trimmed_name)
  )
  LIMIT 1;

  -- If found, update phone if missing and return
  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET phone = COALESCE(NULLIF(v_trimmed_phone, ''), phone)
    WHERE id = v_customer_id AND phone IS NULL;
    
    RETURN v_customer_id;
  END IF;

  -- Create new customer
  INSERT INTO public.customers (
    restaurant_id,
    name,
    phone,
    customer_type,
    balance,
    credit_limit
  ) VALUES (
    p_restaurant_id,
    v_trimmed_name,
    NULLIF(v_trimmed_phone, ''),
    'regular',
    0,
    0
  ) RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$;

-- 2. Create trigger to auto-create customer on order insert
CREATE OR REPLACE FUNCTION public.auto_create_customer_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only process if customer_id is null and customer_name is provided
  IF NEW.customer_id IS NULL AND NEW.customer_name IS NOT NULL AND NEW.customer_name != 'عميل نقدي' THEN
    -- Find or create customer
    v_customer_id := public.find_or_create_customer(
      NEW.restaurant_id,
      NEW.customer_name,
      NEW.customer_phone
    );

    -- Update order with customer_id
    IF v_customer_id IS NOT NULL THEN
      NEW.customer_id := v_customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_auto_create_customer_on_order ON public.orders;

-- 4. Create new trigger
CREATE TRIGGER trg_auto_create_customer_on_order
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_customer_on_order();

-- 5. Create function to record customer transaction on order completion
CREATE OR REPLACE FUNCTION public.record_customer_transaction_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_amount NUMERIC;
BEGIN
  -- Only process if customer_id exists and order is completed
  IF NEW.customer_id IS NOT NULL AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate remaining amount (if partial payment)
    v_remaining_amount := COALESCE(NEW.total, 0) - COALESCE(NEW.paid_amount, 0);

    -- Record transaction if there's remaining balance
    IF v_remaining_amount > 0 THEN
      INSERT INTO public.customer_transactions (
        restaurant_id,
        customer_id,
        type,
        amount,
        description,
        order_id,
        payment_method,
        reference_type,
        reference_id
      ) VALUES (
        NEW.restaurant_id,
        NEW.customer_id,
        'sale',
        v_remaining_amount,
        'فاتورة #' || SUBSTRING(NEW.order_number FROM '.{4}$') || ' - متبقي',
        NEW.id,
        'credit',
        'order',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_record_customer_transaction_on_order ON public.orders;

-- 7. Create new trigger
CREATE TRIGGER trg_record_customer_transaction_on_order
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.record_customer_transaction_on_order();

-- 8. Link existing orders without customers to customers
DO $$
DECLARE
  v_order RECORD;
  v_customer_id UUID;
BEGIN
  FOR v_order IN
    SELECT id, restaurant_id, customer_name, customer_phone, total, paid_amount, status
    FROM public.orders
    WHERE customer_id IS NULL
    AND customer_name IS NOT NULL
    AND customer_name != 'عميل نقدي'
    AND status IN ('completed', 'pending')
  LOOP
    -- Find or create customer
    v_customer_id := public.find_or_create_customer(
      v_order.restaurant_id,
      v_order.customer_name,
      v_order.customer_phone
    );

    -- Update order with customer_id
    IF v_customer_id IS NOT NULL THEN
      UPDATE public.orders
      SET customer_id = v_customer_id
      WHERE id = v_order.id;

      -- Record transaction if order is completed and has remaining balance
      IF v_order.status = 'completed' AND (v_order.total - v_order.paid_amount) > 0 THEN
        INSERT INTO public.customer_transactions (
          restaurant_id,
          customer_id,
          type,
          amount,
          description,
          order_id,
          payment_method,
          reference_type,
          reference_id
        ) VALUES (
          v_order.restaurant_id,
          v_customer_id,
          'sale',
          v_order.total - v_order.paid_amount,
          'فاتورة #' || SUBSTRING(v_order.order_number FROM '.{4}$') || ' - متبقي',
          v_order.id,
          'credit',
          'order',
          v_order.id
        );
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Linked % existing orders to customers', (SELECT COUNT(*) FROM public.orders WHERE customer_id IS NOT NULL);
END
$$;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.find_or_create_customer TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_customer_on_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_transaction_on_order TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Auto-create customer from orders feature enabled';
  RAISE NOTICE '✅ - find_or_create_customer function created';
  RAISE NOTICE '✅ - Trigger to auto-create customer on order insert';
  RAISE NOTICE '✅ - Trigger to record customer transaction on order completion';
  RAISE NOTICE '✅ - Existing orders linked to customers';
END
$$;
