-- ============================================================
-- Fix sales returns error: column "quantity" does not exist
-- ============================================================

BEGIN;

-- The issue is that adjust_product_stock function is trying to access a 'quantity' column
-- but in some contexts it might be referencing the wrong table or alias
-- Let's ensure the function is robust and handles all cases correctly

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  _product_id uuid,
  _restaurant_id uuid,
  _quantity numeric,
  _movement_type text, -- 'in' (restoration) or 'out' (sale)
  _reason text,
  _reference_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _product_id IS NULL OR COALESCE(_quantity, 0) = 0 THEN
    RETURN false;
  END IF;

  -- Update product quantity - explicitly reference the products table
  IF _movement_type = 'out' THEN
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) - _quantity,
        updated_at = now()
    WHERE id = _product_id
      AND restaurant_id = _restaurant_id;
  ELSE
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) + _quantity,
        updated_at = now()
    WHERE id = _product_id
      AND restaurant_id = _restaurant_id;
  END IF;

  -- Log movement
  INSERT INTO public.stock_movements (
    product_id, restaurant_id, quantity, type, reason, reference_id
  )
  VALUES (
    _product_id, _restaurant_id, ABS(_quantity), _movement_type, _reason, _reference_id
  );

  RETURN true;
END;
$$;

-- Also ensure the sales returns trigger uses the correct column names
CREATE OR REPLACE FUNCTION public.create_sales_return_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id uuid;
  v_entry_number text;
  v_sales_returns_account uuid;
  v_receivable_account uuid;
  v_cash_account uuid;
  v_cogs_account uuid;
  v_inventory_account uuid;
  v_credit_account uuid;
  v_credit_desc text;
  v_total_cost numeric := 0;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_item RECORD;
  v_component RECORD;
  v_inventory_mode text;
  v_linked_product_id uuid;
BEGIN
  -- Only process when status changes to completed or approved
  IF NEW.status NOT IN ('completed', 'approved') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Prevent duplicate journal entries
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure total_amount is set
  IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
    SELECT COALESCE(SUM(total_price), 0) INTO NEW.total_amount
    FROM public.sales_return_items
    WHERE sales_return_id = NEW.id;
  END IF;

  -- Get accounts using robust functions with fallback creation
  v_sales_returns_account := public.get_sales_returns_account(NEW.restaurant_id);
  v_receivable_account := public.get_accounts_receivable(NEW.restaurant_id);
  v_cash_account := public.get_cash_account(NEW.restaurant_id);
  v_cogs_account := public.get_cogs_account(NEW.restaurant_id);
  v_inventory_account := public.get_inventory_account(NEW.restaurant_id);

  -- Final validation
  IF v_sales_returns_account IS NULL THEN
    RAISE EXCEPTION 'حساب مردودات المبيعات غير موجود ولم يمكن إنشاؤه';
  END IF;

  -- Calculate total cost from return items using quantity_returned explicitly
  SELECT COALESCE(SUM(COALESCE(sri.cost_price_at_return, 0) * sri.quantity_returned), 0)
  INTO v_total_cost
  FROM public.sales_return_items sri
  WHERE sri.sales_return_id = NEW.id AND sri.return_to_inventory = true;

  -- ==========================================
  -- STEP 1: UPDATE INVENTORY FIRST!
  -- ==========================================
  FOR v_item IN (
    SELECT
      sri.*,
      oi.product_id,
      oi.menu_item_id
    FROM public.sales_return_items sri
    LEFT JOIN public.order_items oi ON sri.original_order_item_id = oi.id
    WHERE sri.sales_return_id = NEW.id AND sri.return_to_inventory = true
  ) LOOP
    -- Try to adjust stock using quantity_returned explicitly
    IF v_item.product_id IS NOT NULL THEN
      PERFORM public.adjust_product_stock(
        v_item.product_id,
        NEW.restaurant_id,
        v_item.quantity_returned,
        'in',
        'sales_return',
        NEW.id::text || '_' || v_item.id::text
      );
    ELSIF v_item.menu_item_id IS NOT NULL THEN
      SELECT inventory_mode, product_id INTO v_inventory_mode, v_linked_product_id
      FROM public.menu_items WHERE id = v_item.menu_item_id;

      IF v_inventory_mode = 'direct' AND v_linked_product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(
          v_linked_product_id,
          NEW.restaurant_id,
          v_item.quantity_returned,
          'in',
          'sales_return_direct',
          NEW.id::text || '_' || v_item.id::text
        );
      ELSIF v_inventory_mode = 'recipe' THEN
        FOR v_component IN (
          SELECT product_id, quantity_required
          FROM public.menu_item_components
          WHERE menu_item_id = v_item.menu_item_id
        ) LOOP
          PERFORM public.adjust_product_stock(
            v_component.product_id,
            NEW.restaurant_id,
            v_component.quantity_required * v_item.quantity_returned,
            'in',
            'sales_return_recipe',
            NEW.id::text || '_' || v_item.id::text || '_' || v_component.product_id::text
          );
        END LOOP;
      ELSIF v_inventory_mode = 'none' OR v_inventory_mode IS NULL THEN
        -- Try menu_item_id as product ID
        PERFORM public.adjust_product_stock(
          v_item.menu_item_id,
          NEW.restaurant_id,
          v_item.quantity_returned,
          'in',
          'sales_return_retail',
          NEW.id::text || '_' || v_item.id::text
        );
      END IF;
    END IF;
  END LOOP;

  -- Generate entry number
  v_entry_number := public.generate_entry_number(NEW.restaurant_id);

  -- Create journal entry header
  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.return_date, 'sales_return', NEW.id,
    'مردود مبيعات - ' || NEW.return_number || COALESCE(' - ' || NEW.reason, ''), 'auto',
    0, 0, true
  ) RETURNING id INTO v_entry_id;

  -- Insert journal lines
  IF v_sales_returns_account IS NOT NULL THEN
    -- Determine the credit account
    IF NEW.customer_id IS NOT NULL AND v_receivable_account IS NOT NULL THEN
      v_credit_account := v_receivable_account;
      v_credit_desc := 'مستحق من العميل';
    ELSIF v_cash_account IS NOT NULL THEN
      v_credit_account := v_cash_account;
      v_credit_desc := 'استرداد نقدي';
    ELSE
      -- Try to use whichever account is available
      IF v_receivable_account IS NOT NULL THEN
        v_credit_account := v_receivable_account;
        v_credit_desc := 'مستحق من العميل (افتراضي)';
      ELSIF v_cash_account IS NOT NULL THEN
        v_credit_account := v_cash_account;
        v_credit_desc := 'استرداد نقدي (افتراضي)';
      ELSE
        RAISE EXCEPTION 'لا يمكن إنشاء قيد مردود المبيعات: لا يوجد حساب عميل أو صندوق';
      END IF;
    END IF;

    -- Insert both debit and credit lines together
    INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES
      (v_entry_id, v_sales_returns_account, NEW.total_amount, 0, 'مردود مبيعات', 1),
      (v_entry_id, v_credit_account, 0, NEW.total_amount, v_credit_desc, 2);
  END IF;

  -- Insert inventory and COGS lines together to maintain balance
  IF v_total_cost > 0 AND v_inventory_account IS NOT NULL AND v_cogs_account IS NOT NULL THEN
    INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES
      (v_entry_id, v_inventory_account, v_total_cost, 0, 'إعادة للمخزن', 3),
      (v_entry_id, v_cogs_account, 0, v_total_cost, 'عكس تكلفة', 4);
  END IF;

  -- Calculate totals from the actual lines and update journal entry
  SELECT
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM public.journal_entry_lines
  WHERE entry_id = v_entry_id;

  UPDATE public.journal_entries
  SET total_debit = v_total_debit, total_credit = v_total_credit
  WHERE id = v_entry_id;

  -- Update sales return record
  NEW.journal_entry_id := v_entry_id;
  NEW.inventory_adjusted := true;

  -- ==========================================
  -- STEP 2: UPDATE CUSTOMER BALANCE!
  -- ==========================================
  IF NEW.customer_id IS NOT NULL THEN
    -- Create customer transaction record
    INSERT INTO public.customer_transactions (
      restaurant_id, customer_id, type, amount, description,
      reference_type, reference_id, created_at
    ) VALUES (
      NEW.restaurant_id,
      NEW.customer_id,
      'sales_return',
      NEW.total_amount,
      'مردود مبيعات - ' || NEW.return_number,
      'sales_return',
      NEW.id,
      NOW()
    );

    -- Update customer balance (add the return amount to reduce debt)
    UPDATE public.customers
    SET balance = balance + NEW.total_amount
    WHERE id = NEW.customer_id;
    
    RAISE NOTICE 'Updated customer % balance by %', NEW.customer_id, NEW.total_amount;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في إنشاء قيد مردود المبيعات: %', SQLERRM;
END;
$$;

-- Recreate trigger only when the optional sales_returns table exists.
DO $sales_return_quantity_trigger_guard$
BEGIN
  IF to_regclass('public.sales_returns') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_create_sales_return_journal ON public.sales_returns';
    EXECUTE 'CREATE TRIGGER trg_create_sales_return_journal
      BEFORE UPDATE OF status ON public.sales_returns
      FOR EACH ROW
      EXECUTE FUNCTION public.create_sales_return_journal_entry()';
  ELSE
    RAISE NOTICE 'sales_returns is not installed; skipped optional quantity-error trigger';
  END IF;
END;
$sales_return_quantity_trigger_guard$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed sales returns quantity error and updated customer balance logic';
END;
$$;
