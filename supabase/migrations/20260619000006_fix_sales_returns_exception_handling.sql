-- ============================================================
-- FIX SALES RETURNS EXCEPTION HANDLING - REMOVE SILENT FAILURES
-- ============================================================

BEGIN;

-- 1. Fix create_sales_return_journal_entry() - remove silent exception handling
CREATE OR REPLACE FUNCTION public.create_sales_return_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_sales_returns_account UUID;
  v_receivable_account UUID;
  v_cash_account UUID;
  v_cogs_account UUID;
  v_inventory_account UUID;
  v_entry_number TEXT;
  v_total_cost DECIMAL(15,2) := 0;
  v_total_debit NUMERIC(15,2) := 0;
  v_total_credit NUMERIC(15,2) := 0;
  v_item RECORD;
  v_inventory_mode TEXT;
  v_linked_product_id UUID;
  v_component RECORD;
BEGIN
  -- Only process when status changes to 'approved' or 'completed'
  IF NEW.status NOT IN ('approved', 'completed') OR OLD.status IN ('approved', 'completed') THEN
    RETURN NEW;
  END IF;

  -- Skip if already has journal entry (already processed)
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure total_amount is set
  IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
    SELECT COALESCE(SUM(total_price), 0) INTO NEW.total_amount
    FROM public.sales_return_items
    WHERE sales_return_id = NEW.id;
  END IF;

  -- Get accounts using robust functions
  v_sales_returns_account := public.get_sales_returns_account(NEW.restaurant_id);
  v_receivable_account := public.get_accounts_receivable(NEW.restaurant_id);
  v_cash_account := public.get_cash_account(NEW.restaurant_id);
  v_cogs_account := public.get_cogs_account(NEW.restaurant_id);
  v_inventory_account := public.get_inventory_account(NEW.restaurant_id);

  -- Calculate total cost from return items
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
    -- Try to adjust stock
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

  -- Insert all journal lines
  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  SELECT v_entry_id, account_id, debit, credit, description, line_order
  FROM (
    SELECT v_sales_returns_account AS account_id, NEW.total_amount AS debit, 0::numeric AS credit, 'مردود مبيعات'::text AS description, 1 AS line_order
    UNION ALL
    SELECT
      CASE WHEN NEW.customer_id IS NOT NULL THEN v_receivable_account ELSE v_cash_account END,
      0,
      NEW.total_amount,
      CASE WHEN NEW.customer_id IS NOT NULL THEN 'مستحق من العميل' ELSE 'استرداد نقدي' END,
      2
    UNION ALL
    SELECT v_inventory_account, v_total_cost, 0, 'إعادة للمخزن', 3 WHERE v_total_cost > 0
    UNION ALL
    SELECT v_cogs_account, 0, v_total_cost, 'عكس تكلفة', 4 WHERE v_total_cost > 0
  ) t;

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
    INSERT INTO public.customer_transactions (
      restaurant_id, customer_id, type, amount, description,
      reference_type, reference_id
    ) VALUES (
      NEW.restaurant_id,
      NEW.customer_id,
      'sales_return',
      NEW.total_amount,
      'مردود مبيعات ' || NEW.return_number,
      'sales_return',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure trigger exists
DROP TRIGGER IF EXISTS trg_create_sales_return_journal ON public.sales_returns;
CREATE TRIGGER trg_create_sales_return_journal
BEFORE UPDATE OF status ON public.sales_returns
FOR EACH ROW
EXECUTE FUNCTION public.create_sales_return_journal_entry();

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Sales returns exception handling fixed - silent failures removed';
END
$$;
