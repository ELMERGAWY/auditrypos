-- ============================================================
-- FIX: Sequential Journal Entry Lines Trigger Errors
-- Combines multiple INSERT statements into single multi-row
-- INSERT statements to prevent row-level triggers from validating
-- unbalanced states on journal_entries.
-- ============================================================

BEGIN;

-- 1) Fix _create_balanced_journal
CREATE OR REPLACE FUNCTION public._create_balanced_journal(
  p_restaurant_id UUID,
  p_entry_date DATE,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_source TEXT,
  p_debit_account_id UUID,
  p_credit_account_id UUID,
  p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر';
  END IF;
  IF p_debit_account_id IS NULL OR p_credit_account_id IS NULL THEN
    RAISE EXCEPTION 'يجب تحديد حسابات القيد';
  END IF;

  v_entry_number := public._next_journal_number(p_restaurant_id);

  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, description,
    reference_type, reference_id, source, source_id,
    total_debit, total_credit, is_posted, workflow_status, posted_at
  ) VALUES (
    p_restaurant_id, v_entry_number, p_entry_date, p_description,
    p_reference_type, p_reference_id, p_source, p_reference_id,
    p_amount, p_amount, true, 'posted', NOW()
  ) RETURNING id INTO v_entry_id;

  -- Combined into one multi-row insert to avoid trigger errors
  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES 
    (v_entry_id, p_debit_account_id, p_amount, 0, p_description, 1),
    (v_entry_id, p_credit_account_id, 0, p_amount, p_description, 2);

  RETURN v_entry_id;
END;
$$;


-- 2) Fix create_sales_return_journal_entry
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
BEGIN
  -- Only process when status changes to 'approved' or 'completed'
  IF NEW.status NOT IN ('approved', 'completed') OR OLD.status IN ('approved', 'completed') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_sales_returns_account := public.get_sales_returns_account(NEW.restaurant_id);
  v_receivable_account := public.get_accounts_receivable(NEW.restaurant_id);
  v_cash_account := public.get_cash_account(NEW.restaurant_id);
  v_cogs_account := public.get_cogs_account(NEW.restaurant_id);
  v_inventory_account := public.get_inventory_account(NEW.restaurant_id);
  
  -- Calculate total cost from return items
  SELECT COALESCE(SUM(cost_price_at_return * quantity_returned), 0) INTO v_total_cost
  FROM public.sales_return_items 
  WHERE sales_return_id = NEW.id AND return_to_inventory = true;
  
  -- Generate entry number
  v_entry_number := public.generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.return_date, 'sales_return', NEW.id,
    'مردود مبيعات - ' || NEW.return_number || COALESCE(' - ' || NEW.reason, ''), 'auto', 
    NEW.total_amount + v_total_cost, NEW.total_amount + v_total_cost, true
  ) RETURNING id INTO v_entry_id;
  
  -- Combined into one SELECT-based insert to avoid trigger errors
  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  SELECT v_entry_id, account_id, debit, credit, description, line_order
  FROM (
    SELECT v_sales_returns_account AS account_id, NEW.total_amount AS debit, 0::numeric AS credit, 'مردود مبيعات'::text AS description, 1 AS line_order
    UNION ALL
    SELECT CASE WHEN NEW.customer_id IS NOT NULL THEN v_receivable_account ELSE v_cash_account END, 0, NEW.total_amount, CASE WHEN NEW.customer_id IS NOT NULL THEN 'مستحق من العميل' ELSE 'استرداد نقدي' END, 2
    UNION ALL
    SELECT v_inventory_account, v_total_cost, 0, 'إعادة للمخزون', 3 WHERE v_total_cost > 0
    UNION ALL
    SELECT v_cogs_account, 0, v_total_cost, 'عكس تكلفة', 4 WHERE v_total_cost > 0
  ) t;
  
  -- Update journal_entry_id
  NEW.journal_entry_id := v_entry_id;
  NEW.inventory_adjusted := true;
  
  -- Update customer balance (reduce receivable) if customer_id exists
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers SET balance = COALESCE(balance, 0) - NEW.total_amount WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3) Fix create_overhead_journal_entry
CREATE OR REPLACE FUNCTION public.create_overhead_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_cash_account UUID;
  v_rent_account UUID;
  v_electricity_account UUID;
  v_salaries_account UUID;
  v_other_account UUID;
  v_entry_number TEXT;
BEGIN
  -- Only process when is_distributed changes from false to true
  IF OLD.is_distributed = TRUE OR NEW.is_distributed = FALSE THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_cash_account := public.get_cash_account(NEW.restaurant_id);
  v_rent_account := public.get_or_create_expense_account(NEW.restaurant_id, 'إيجار', '601');
  v_electricity_account := public.get_or_create_expense_account(NEW.restaurant_id, 'كهرباء', '602');
  v_salaries_account := public.get_or_create_expense_account(NEW.restaurant_id, 'رواتب', '603');
  v_other_account := public.get_or_create_expense_account(NEW.restaurant_id, 'مصاريف أخرى', '609');
  
  -- Generate entry number
  v_entry_number := public.generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.date, 'daily_overheads', NEW.id,
    'تسجيل النفقات اليومية - ' || NEW.date, 'auto', NEW.total_amount, NEW.total_amount, true
  ) RETURNING id INTO v_entry_id;
  
  -- Combined into one SELECT-based insert to avoid trigger errors
  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  SELECT v_entry_id, account_id, debit, credit, description, line_order
  FROM (
    SELECT v_rent_account AS account_id, NEW.rent_amount AS debit, 0::numeric AS credit, 'إيجار'::text AS description, 1 AS line_order WHERE NEW.rent_amount > 0
    UNION ALL
    SELECT v_electricity_account, NEW.electricity_amount, 0, 'كهرباء', 2 WHERE NEW.electricity_amount > 0
    UNION ALL
    SELECT v_salaries_account, NEW.salaries_amount, 0, 'رواتب', 3 WHERE NEW.salaries_amount > 0
    UNION ALL
    SELECT v_other_account, NEW.other_amount, 0, COALESCE(NEW.notes, 'مصاريف أخرى'), 4 WHERE NEW.other_amount > 0
    UNION ALL
    SELECT v_cash_account, 0, NEW.total_amount, 'دفع نقدي', 5
  ) t;
  
  -- Update journal_entry_id
  NEW.journal_entry_id := v_entry_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4) Fix create_receipt_journal_entry
CREATE OR REPLACE FUNCTION public.create_receipt_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_inventory_account UUID;
  v_payable_account UUID;
  v_entry_number TEXT;
BEGIN
  -- Only process when status changes to 'posted'
  IF NEW.status != 'posted' OR (OLD.status = 'posted' AND NEW.status = 'posted') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_inventory_account := public.get_inventory_account(NEW.restaurant_id);
  v_payable_account := public.get_accounts_payable(NEW.restaurant_id);
  
  -- Generate entry number
  v_entry_number := public.generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.receipt_date, 'inventory_receipt', NEW.id,
    'استلام مخزون - فاتورة ' || NEW.receipt_number || COALESCE(' - ' || NEW.notes, ''), 'auto', 
    NEW.net_amount, NEW.net_amount, true
  ) RETURNING id INTO v_entry_id;
  
  -- Combined into one SELECT-based insert to avoid trigger errors
  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  SELECT v_entry_id, account_id, debit, credit, description, line_order
  FROM (
    SELECT v_inventory_account AS account_id, (NEW.total_amount - COALESCE(NEW.discount_amount, 0)) AS debit, 0::numeric AS credit, 'بضاعة مستلمة'::text AS description, 1 AS line_order
    UNION ALL
    SELECT public.get_or_create_expense_account(NEW.restaurant_id, 'ضريبة قيمة مضافة', '604'), NEW.tax_amount, 0, 'ضريبة', 2 WHERE COALESCE(NEW.tax_amount, 0) > 0
    UNION ALL
    SELECT v_payable_account, 0, NEW.net_amount, 'مستحق للمورد', 3
  ) t;
  
  -- Update journal_entry_id
  NEW.journal_entry_id := v_entry_id;
  
  -- Update supplier balance (increase payable)
  IF NEW.supplier_id IS NOT NULL THEN
    UPDATE public.suppliers SET balance = COALESCE(balance, 0) + NEW.net_amount WHERE id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5) Fix create_purchase_return_journal_entry
CREATE OR REPLACE FUNCTION public.create_purchase_return_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_payable_account UUID;
  v_inventory_account UUID;
  v_entry_number TEXT;
BEGIN
  -- Only process when status changes to 'approved' or 'completed'
  IF NEW.status NOT IN ('approved', 'completed') OR OLD.status IN ('approved', 'completed') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_payable_account := public.get_accounts_payable(NEW.restaurant_id);
  v_inventory_account := public.get_inventory_account(NEW.restaurant_id);
  
  -- Generate entry number
  v_entry_number := public.generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.return_date, 'purchase_return', NEW.id,
    'مردود مشتريات - ' || NEW.return_number || COALESCE(' - ' || NEW.reason, ''), 'auto', 
    NEW.total_amount, NEW.total_amount, true
  ) RETURNING id INTO v_entry_id;
  
  -- Combined into one multi-row insert to avoid trigger errors
  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES 
    (v_entry_id, v_payable_account, NEW.total_amount, 0, 'تخفيض ذمم الموردين', 1),
    (v_entry_id, v_inventory_account, 0, NEW.total_amount, 'إخراج من المخزون', 2);
  
  -- Update journal_entry_id
  NEW.journal_entry_id := v_entry_id;
  
  -- Update supplier balance (reduce payable)
  IF NEW.supplier_id IS NOT NULL THEN
    UPDATE public.suppliers SET balance = COALESCE(balance, 0) - NEW.total_amount WHERE id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6) Fix create_order_journal_entry
CREATE OR REPLACE FUNCTION public.create_order_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_cash_account UUID;
  v_receivable_account UUID;
  v_sales_account UUID;
  v_tax_account UUID;
  v_cogs_account UUID;
  v_inventory_account UUID;
  v_entry_number TEXT;
  v_tax_amount DECIMAL(15,2);
  v_total_cost DECIMAL(15,2);
BEGIN
  -- Only process when status changes to 'completed' and not already processed
  IF NEW.status != 'completed' OR OLD.status = 'completed' OR NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_cash_account := public.get_cash_account(NEW.restaurant_id);
  v_receivable_account := public.get_accounts_receivable(NEW.restaurant_id);
  v_sales_account := public.get_sales_account(NEW.restaurant_id);
  v_tax_account := public.get_or_create_expense_account(NEW.restaurant_id, 'ضريبة مبيعات', '605');
  v_cogs_account := public.get_cogs_account(NEW.restaurant_id);
  v_inventory_account := public.get_inventory_account(NEW.restaurant_id);
  
  -- Calculate tax (14% of total)
  v_tax_amount := ROUND(NEW.total * 0.14 / 1.14, 2);
  
  -- Calculate COGS from order items
  SELECT COALESCE(SUM(COALESCE(cost_price_snapshot, 0) * quantity), 0) INTO v_total_cost
  FROM public.order_items WHERE order_id = NEW.id;
  
  -- Generate entry number
  v_entry_number := public.generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, COALESCE(NEW.created_at::DATE, CURRENT_DATE), 'order', NEW.id,
    'بيع - طلب #' || COALESCE(NEW.order_number, NEW.id::TEXT), 'auto', 
    NEW.total + v_total_cost, NEW.total + v_total_cost, true
  ) RETURNING id INTO v_entry_id;
  
  -- Combined into one SELECT-based insert to avoid trigger errors
  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  SELECT v_entry_id, account_id, debit, credit, description, line_order
  FROM (
    SELECT 
      CASE WHEN COALESCE(NEW.paid_amount, 0) >= NEW.total THEN v_cash_account ELSE v_receivable_account END AS account_id,
      NEW.total AS debit,
      0::numeric AS credit,
      CASE WHEN COALESCE(NEW.paid_amount, 0) >= NEW.total THEN 'نقدي'::text ELSE 'آجل'::text END AS description,
      1 AS line_order
    UNION ALL
    SELECT v_sales_account, 0, NEW.total - v_tax_amount, 'مبيعات', 2
    UNION ALL
    SELECT v_tax_account, 0, v_tax_amount, 'ضريبة مبيعات', 3 WHERE v_tax_amount > 0
    UNION ALL
    SELECT v_cogs_account, v_total_cost, 0, 'تكلفة البضاعة المباعة', 4 WHERE v_total_cost > 0
    UNION ALL
    SELECT v_inventory_account, 0, v_total_cost, 'إنقاص مخزون', 5 WHERE v_total_cost > 0
  ) t;
  
  -- Update order with journal entry reference
  NEW.journal_entry_id := v_entry_id;
  
  -- Update customer balance if customer_id exists and not cash sale
  IF NEW.customer_id IS NOT NULL AND COALESCE(NEW.paid_amount, 0) < NEW.total THEN
    UPDATE public.customers SET balance = COALESCE(balance, 0) + NEW.total WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7) Fix create_expense_journal_entry
CREATE OR REPLACE FUNCTION public.create_expense_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_cash_account UUID;
  v_expense_account UUID;
  v_entry_number TEXT;
  v_account_code TEXT;
  v_account_name TEXT;
BEGIN
  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Map expense category to account code
  CASE NEW.category
    WHEN 'إيجار' THEN 
      v_account_code := '601';
      v_account_name := 'إيجار';
    WHEN 'كهرباء ومياه' THEN 
      v_account_code := '602';
      v_account_name := 'كهرباء ومياه';
    WHEN 'رواتب' THEN 
      v_account_code := '603';
      v_account_name := 'رواتب';
    WHEN 'مشتريات' THEN 
      v_account_code := '501';
      v_account_name := 'مشتريات';
    WHEN 'صيانة' THEN 
      v_account_code := '606';
      v_account_name := 'صيانة';
    WHEN 'نقل' THEN 
      v_account_code := '607';
      v_account_name := 'نقل ومواصلات';
    WHEN 'إعلانات' THEN 
      v_account_code := '608';
      v_account_name := 'إعلانات ودعاية';
    ELSE 
      v_account_code := '609';
      v_account_name := 'مصاريف أخرى';
  END CASE;
  
  -- Get accounts
  v_cash_account := public.get_cash_account(NEW.restaurant_id);
  v_expense_account := public.get_or_create_expense_account(NEW.restaurant_id, v_account_name, v_account_code);
  
  -- Generate entry number
  v_entry_number := public.generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.date, 'expense', NEW.id,
    'مصروف: ' || NEW.category || COALESCE(' - ' || NEW.description, ''), 'auto', 
    NEW.amount, NEW.amount, true
  ) RETURNING id INTO v_entry_id;
  
  -- Combined into one multi-row insert to avoid trigger errors
  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES 
    (v_entry_id, v_expense_account, NEW.amount, 0, NEW.description || ' (' || NEW.category || ')', 1),
    (v_entry_id, v_cash_account, 0, NEW.amount, 'دفع نقدي', 2);
  
  -- Update journal_entry_id
  NEW.journal_entry_id := v_entry_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
