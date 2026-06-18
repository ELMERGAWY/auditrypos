-- ============================================================
-- FINAL FIX: Sales Return Unbalanced Journal Entry
-- ============================================================

BEGIN;

-- 1) Check if sales_return_items has cost_price_at_return, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'sales_return_items'
    AND column_name = 'cost_price_at_return'
  ) THEN
    ALTER TABLE public.sales_return_items ADD COLUMN cost_price_at_return NUMERIC(15,2) DEFAULT 0;
  END IF;
END
$$;

-- 2) Fix create_sales_return_journal_entry() - insert lines first, then update totals
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
BEGIN
  -- Only process when status changes to 'approved' or 'completed'
  IF NEW.status NOT IN ('approved', 'completed') OR OLD.status IN ('approved', 'completed') THEN
    RETURN NEW;
  END IF;

  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure total_amount is set (just in case)
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
  SELECT COALESCE(SUM(COALESCE(cost_price_at_return, 0) * quantity_returned), 0) INTO v_total_cost
  FROM public.sales_return_items
  WHERE sales_return_id = NEW.id AND return_to_inventory = true;

  -- Generate entry number
  v_entry_number := public.generate_entry_number(NEW.restaurant_id);

  -- Create journal entry header - temporarily set to 0 (we'll update later)
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
    SELECT v_inventory_account, v_total_cost, 0, 'إعادة للمخزون', 3 WHERE v_total_cost > 0
    UNION ALL
    SELECT v_cogs_account, 0, v_total_cost, 'عكس تكلفة', 4 WHERE v_total_cost > 0
  ) t;

  -- Now calculate totals from the actual lines and update journal entry
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

  -- Update customer balance (reduce receivable) if customer_id exists
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET balance = COALESCE(balance, 0) - NEW.total_amount
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Final fix for sales return unbalanced journal entry applied!';
END
$$;
