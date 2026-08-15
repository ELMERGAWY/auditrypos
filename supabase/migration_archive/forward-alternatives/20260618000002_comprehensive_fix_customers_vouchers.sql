-- ============================================================
-- COMPREHENSIVE FIX: Customer Credit Limit, Account Resolution, Journal Entries, Receipt Voucher Logic
-- ============================================================

BEGIN;

-- 1. Ensure customers table has proper defaults and not null constraints for credit_limit
ALTER TABLE public.customers ALTER COLUMN credit_limit SET DEFAULT 0;
ALTER TABLE public.customers ALTER COLUMN credit_limit SET NOT NULL;

-- 2. Fix save_receipt_voucher to use our robust account getters
CREATE OR REPLACE FUNCTION public.save_receipt_voucher(
  p_restaurant_id UUID,
  p_customer_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_voucher_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,       -- "توجيه على حساب" = the credited side (AR or other)
  p_counter_account_id UUID DEFAULT NULL, -- secondary routing (not used in UI but kept for compat)
  p_voucher_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_number TEXT;
  v_customer_name TEXT;
  v_debit_account UUID;   -- always cash/bank
  v_credit_account UUID;  -- always the routed/AR account
  v_journal_id UUID;
  v_old_amount NUMERIC := 0;
  v_old_customer_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر'; END IF;

  -- Ensure COA is set up properly
  PERFORM public.seed_global_coa(p_restaurant_id, 'standard');

  SELECT name INTO v_customer_name FROM public.customers WHERE id = p_customer_id;

  -- DEBIT side: always Cash or Bank (the money comes in here) - use robust get_cash_account
  v_debit_account := public.get_cash_account(p_restaurant_id);

  -- CREDIT side: the routed account (AR 1200 by default, or user-selected)
  v_credit_account := COALESCE(
    p_account_id,
    p_counter_account_id,
    public.get_accounts_receivable(p_restaurant_id)
  );

  IF p_voucher_id IS NOT NULL THEN
    SELECT amount, customer_id INTO v_old_amount, v_old_customer_id
    FROM public.receipt_vouchers WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'سند القبض غير موجود'; END IF;

    UPDATE public.customers SET balance = COALESCE(balance, 0) + v_old_amount WHERE id = v_old_customer_id;

    UPDATE public.receipt_vouchers SET
      customer_id = p_customer_id,
      amount = p_amount,
      payment_method = p_payment_method,
      voucher_date = p_voucher_date,
      notes = p_notes,
      account_id = p_account_id,
      counter_account_id = p_counter_account_id,
      updated_at = NOW()
    WHERE id = p_voucher_id;

    v_id := p_voucher_id;
  ELSE
    v_number := 'RV-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');

    INSERT INTO public.receipt_vouchers (
      restaurant_id, voucher_number, voucher_date, customer_id,
      amount, payment_method, account_id, counter_account_id, notes
    ) VALUES (
      p_restaurant_id, v_number, p_voucher_date, p_customer_id,
      p_amount, p_payment_method, p_account_id, p_counter_account_id, p_notes
    ) RETURNING id INTO v_id;

    INSERT INTO public.customer_transactions (
      restaurant_id, customer_id, type, amount, description, payment_method
    ) VALUES (
      p_restaurant_id, p_customer_id, 'payment', -p_amount,
      COALESCE(p_notes, 'سند قبض'), p_payment_method
    );
  END IF;

  UPDATE public.customers
  SET balance = COALESCE(balance, 0) - p_amount
  WHERE id = p_customer_id;

  -- CORRECT posting: DEBIT cash, CREDIT receivable/routed account
  v_journal_id := public._create_balanced_journal(
    p_restaurant_id, p_voucher_date,
    'سند قبض من العميل: ' || COALESCE(v_customer_name, '') || COALESCE(' - ' || p_notes, ''),
    'receipt_voucher', v_id, 'ar',
    v_debit_account,   -- DR: Cash/Bank
    v_credit_account,  -- CR: AR or routed account
    p_amount
  );

  UPDATE public.receipt_vouchers SET journal_entry_id = v_journal_id WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- 3. Fix save_payment_voucher to use robust account getters too
CREATE OR REPLACE FUNCTION public.save_payment_voucher(
  p_restaurant_id UUID,
  p_supplier_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_voucher_date DATE DEFAULT CURRENT_DATE,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,       -- "توجيه على حساب" = the debited side (AP or other)
  p_counter_account_id UUID DEFAULT NULL, -- secondary routing (kept for compat)
  p_voucher_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_number TEXT;
  v_supplier_name TEXT;
  v_debit_account UUID;  -- the routed account (AP or expense or other)
  v_credit_account UUID; -- always Cash/Bank
  v_journal_id UUID;
  v_old_amount NUMERIC := 0;
  v_old_supplier_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر'; END IF;

  -- Ensure COA is set up properly
  PERFORM public.seed_global_coa(p_restaurant_id, 'standard');

  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = p_supplier_id;

  -- CREDIT side: always Cash or Bank (the money leaves from here)
  v_credit_account := public.get_cash_account(p_restaurant_id);

  -- DEBIT side: the routed account (AP 2100 by default, or user-selected account like expense)
  v_debit_account := COALESCE(
    p_account_id,
    p_counter_account_id,
    public.get_accounts_payable(p_restaurant_id)
  );

  IF p_voucher_id IS NOT NULL THEN
    SELECT amount, supplier_id INTO v_old_amount, v_old_supplier_id
    FROM public.payment_vouchers WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'إذن الدفع غير موجود'; END IF;

    UPDATE public.suppliers SET balance = COALESCE(balance, 0) + v_old_amount WHERE id = v_old_supplier_id;

    UPDATE public.payment_vouchers SET
      supplier_id = p_supplier_id,
      amount = p_amount,
      payment_method = p_payment_method,
      voucher_date = p_voucher_date,
      reference_number = p_reference_number,
      notes = p_notes,
      account_id = p_account_id,
      counter_account_id = p_counter_account_id,
      updated_at = NOW()
    WHERE id = p_voucher_id;

    v_id := p_voucher_id;
  ELSE
    v_number := 'PV-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');

    INSERT INTO public.payment_vouchers (
      restaurant_id, voucher_number, voucher_date, supplier_id,
      amount, payment_method, account_id, counter_account_id,
      reference_number, notes
    ) VALUES (
      p_restaurant_id, v_number, p_voucher_date, p_supplier_id,
      p_amount, p_payment_method, p_account_id, p_counter_account_id,
      p_reference_number, p_notes
    ) RETURNING id INTO v_id;

    INSERT INTO public.supplier_transactions (
      restaurant_id, supplier_id, type, amount, description, payment_method
    ) VALUES (
      p_restaurant_id, p_supplier_id, 'payment', p_amount,
      COALESCE(p_notes, 'إذن دفع'), p_payment_method
    );
  END IF;

  UPDATE public.suppliers
  SET balance = COALESCE(balance, 0) - p_amount
  WHERE id = p_supplier_id;

  -- CORRECT posting: DEBIT routed/AP account, CREDIT cash/bank
  v_journal_id := public._create_balanced_journal(
    p_restaurant_id, p_voucher_date,
    'إذن دفع للمورد: ' || COALESCE(v_supplier_name, '') || COALESCE(' - ' || p_notes, ''),
    'payment_voucher', v_id, 'ap',
    v_debit_account,  -- DR: AP or routed account (expense, etc.)
    v_credit_account, -- CR: Cash/Bank
    p_amount
  );

  UPDATE public.payment_vouchers SET journal_entry_id = v_journal_id WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- 4. Fix _resolve_payment_account to use our get_cash_account as fallback
CREATE OR REPLACE FUNCTION public._resolve_payment_account(
  p_restaurant_id UUID,
  p_payment_method TEXT,
  p_override_account_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_override_account_id IS NOT NULL THEN
    RETURN p_override_account_id;
  END IF;

  IF p_payment_method = 'bank' THEN
    -- Try bank main standard code (1100 in seeded global COA, 1400, 1110, or is_bank_account)
    v_id := public._coa_by_code(p_restaurant_id, '1100');
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.chart_of_accounts WHERE restaurant_id = p_restaurant_id AND is_bank_account = true LIMIT 1;
    END IF;
    IF v_id IS NULL THEN v_id := public._coa_by_code(p_restaurant_id, '1400'); END IF;
    IF v_id IS NULL THEN v_id := public._coa_by_code(p_restaurant_id, '1110'); END IF;
  ELSE
    -- Cash: try 1000 in seeded global COA, then 101, or is_cash_account
    v_id := public._coa_by_code(p_restaurant_id, '1000');
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.chart_of_accounts WHERE restaurant_id = p_restaurant_id AND is_cash_account = true LIMIT 1;
    END IF;
    IF v_id IS NULL THEN v_id := public._coa_by_code(p_restaurant_id, '101'); END IF;
  END IF;

  -- If all else fails, use our get_cash_account which creates it if missing
  IF v_id IS NULL THEN
    v_id := public.get_cash_account(p_restaurant_id);
  END IF;

  RETURN v_id;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.save_receipt_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_payment_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public._resolve_payment_account TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Comprehensive fix applied: customers credit limit, receipt/payment vouchers, account resolution';
END $$;
