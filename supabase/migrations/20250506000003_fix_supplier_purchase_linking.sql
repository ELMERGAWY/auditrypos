-- ============================================================
-- FIX: Link Purchase Invoices with Suppliers
-- Issues:
-- 1. Supplier statement reads from inventory_receipts instead of purchase_invoices
-- 2. Missing supplier_id reference in purchase_invoices
-- 3. Missing payment functionality for suppliers
-- 4. Missing proper balance updates
-- ============================================================

-- 1. Ensure purchase_invoices has supplier_id column
ALTER TABLE public.purchase_invoices 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON public.purchase_invoices(supplier_id);

-- 3. Create function to update supplier balance when purchase invoice is created
CREATE OR REPLACE FUNCTION public.update_supplier_balance_on_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_net_amount NUMERIC;
  v_is_credit BOOLEAN;
BEGIN
  -- Only process if supplier_id is set
  IF NEW.supplier_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate net amount
  v_net_amount := COALESCE(NEW.total_amount, 0) + COALESCE(NEW.tax_amount, 0);
  
  -- Check if it's a credit purchase (not fully paid)
  v_is_credit := COALESCE(NEW.paid_amount, 0) < v_net_amount;

  IF TG_OP = 'INSERT' THEN
    -- For new invoices: increase supplier balance (we owe them more)
    UPDATE public.suppliers
    SET balance = COALESCE(balance, 0) + v_net_amount,
        total_purchases = COALESCE(total_purchases, 0) + v_net_amount,
        updated_at = now()
    WHERE id = NEW.supplier_id;

    -- Create supplier transaction record
    INSERT INTO public.supplier_transactions (
      restaurant_id,
      supplier_id,
      type,
      amount,
      description,
      reference_type,
      reference_id
    ) VALUES (
      NEW.restaurant_id,
      NEW.supplier_id,
      'purchase',
      v_net_amount,
      'فاتورة مشتريات: ' || COALESCE(NEW.invoice_number, 'غير محدد'),
      'purchase_invoice',
      NEW.id
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- For updates: adjust the difference
    IF OLD.supplier_id = NEW.supplier_id THEN
      -- Same supplier: adjust difference
      UPDATE public.suppliers
      SET balance = COALESCE(balance, 0) - (COALESCE(OLD.total_amount, 0) + COALESCE(OLD.tax_amount, 0)) 
                   + v_net_amount,
          total_purchases = COALESCE(total_purchases, 0) - (COALESCE(OLD.total_amount, 0) + COALESCE(OLD.tax_amount, 0))
                           + v_net_amount,
          updated_at = now()
      WHERE id = NEW.supplier_id;
    ELSE
      -- Supplier changed: remove from old, add to new
      UPDATE public.suppliers
      SET balance = COALESCE(balance, 0) - (COALESCE(OLD.total_amount, 0) + COALESCE(OLD.tax_amount, 0)),
          total_purchases = COALESCE(total_purchases, 0) - (COALESCE(OLD.total_amount, 0) + COALESCE(OLD.tax_amount, 0)),
          updated_at = now()
      WHERE id = OLD.supplier_id;

      UPDATE public.suppliers
      SET balance = COALESCE(balance, 0) + v_net_amount,
          total_purchases = COALESCE(total_purchases, 0) + v_net_amount,
          updated_at = now()
      WHERE id = NEW.supplier_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trg_update_supplier_balance ON public.purchase_invoices;
CREATE TRIGGER trg_update_supplier_balance
  AFTER INSERT OR UPDATE ON public.purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_supplier_balance_on_invoice();

-- 5. Function to handle invoice deletion (reverse the balance)
CREATE OR REPLACE FUNCTION public.reverse_supplier_balance_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_net_amount NUMERIC;
BEGIN
  IF OLD.supplier_id IS NULL THEN
    RETURN OLD;
  END IF;

  v_net_amount := COALESCE(OLD.total_amount, 0) + COALESCE(OLD.tax_amount, 0);

  -- Reverse the supplier balance
  UPDATE public.suppliers
  SET balance = COALESCE(balance, 0) - v_net_amount,
      total_purchases = COALESCE(total_purchases, 0) - v_net_amount,
      updated_at = now()
  WHERE id = OLD.supplier_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_supplier_balance ON public.purchase_invoices;
CREATE TRIGGER trg_reverse_supplier_balance
  BEFORE DELETE ON public.purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_supplier_balance_on_delete();

-- 6. Function to record supplier payment
CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_restaurant_id UUID,
  p_supplier_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ الدفع يجب أن يكون أكبر من صفر';
  END IF;

  -- Insert payment record
  INSERT INTO public.supplier_transactions (
    restaurant_id,
    supplier_id,
    type,
    amount,
    description,
    reference_type,
    created_at
  ) VALUES (
    p_restaurant_id,
    p_supplier_id,
    'payment',
    p_amount,
    COALESCE(p_notes, 'دفع للمورد'),
    'payment',
    COALESCE(p_payment_date, CURRENT_DATE)
  )
  RETURNING id INTO v_payment_id;

  -- Decrease supplier balance (we paid them)
  UPDATE public.suppliers
  SET balance = GREATEST(0, COALESCE(balance, 0) - p_amount),
      updated_at = now()
  WHERE id = p_supplier_id;

  -- Create journal entry for the payment
  PERFORM public.create_supplier_payment_journal_entry(
    p_restaurant_id,
    p_supplier_id,
    p_amount,
    p_payment_method,
    p_reference_number,
    p_notes,
    p_payment_date
  );

  RETURN v_payment_id;
END;
$$;

-- 7. Helper function to create journal entry for supplier payment
CREATE OR REPLACE FUNCTION public.create_supplier_payment_journal_entry(
  p_restaurant_id UUID,
  p_supplier_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_reference_number TEXT,
  p_notes TEXT,
  p_payment_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_name TEXT;
  v_entry_id UUID;
  v_ap_account_id UUID;
  v_cash_account_id UUID;
  v_bank_account_id UUID;
BEGIN
  -- Get supplier name
  SELECT name INTO v_supplier_name
  FROM public.suppliers
  WHERE id = p_supplier_id;

  -- Get accounts payable account
  SELECT id INTO v_ap_account_id
  FROM public.accounts
  WHERE restaurant_id = p_restaurant_id
    AND account_code = '2100'  -- Accounts Payable
  LIMIT 1;

  -- Get payment account based on method
  IF p_payment_method = 'bank' THEN
    SELECT id INTO v_bank_account_id
    FROM public.accounts
    WHERE restaurant_id = p_restaurant_id
      AND account_code = '1110'  -- Bank
    LIMIT 1;
  ELSE
    SELECT id INTO v_cash_account_id
    FROM public.accounts
    WHERE restaurant_id = p_restaurant_id
      AND account_code = '1100'  -- Cash
    LIMIT 1;
  END IF;

  -- Create journal entry
  IF v_ap_account_id IS NOT NULL THEN
    INSERT INTO public.journal_entries (
      restaurant_id,
      entry_date,
      reference_type,
      reference_id,
      description,
      source,
      is_posted,
      total_debit,
      total_credit
    ) VALUES (
      p_restaurant_id,
      p_payment_date,
      'supplier_payment',
      p_supplier_id,
      'دفع للمورد: ' || v_supplier_name || COALESCE(' - ' || p_notes, ''),
      'manual',
      true,
      p_amount,
      p_amount
    )
    RETURNING id INTO v_entry_id;

    -- Debit: Accounts Payable (decrease liability)
    INSERT INTO public.journal_entry_lines (
      journal_entry_id,
      account_id,
      debit,
      credit,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      v_ap_account_id,
      p_amount,
      0,
      'تخفيض ذمم دائنة',
      1
    );

    -- Credit: Cash/Bank (decrease asset)
    INSERT INTO public.journal_entry_lines (
      journal_entry_id,
      account_id,
      debit,
      credit,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      COALESCE(v_bank_account_id, v_cash_account_id),
      0,
      p_amount,
      'دفع نقدي/بنكي',
      2
    );
  END IF;

  RETURN v_entry_id;
END;
$$;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.record_supplier_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier_payment_journal_entry TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Supplier-Purchase Invoice Linking Fixed!';
  RAISE NOTICE '✅ Triggers: trg_update_supplier_balance, trg_reverse_supplier_balance';
  RAISE NOTICE '✅ Functions: record_supplier_payment, create_supplier_payment_journal_entry';
  RAISE NOTICE '✅ purchase_invoices.supplier_id column linked';
END $$;
