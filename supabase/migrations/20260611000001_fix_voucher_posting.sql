-- ============================================================
-- FIX: Voucher Posting Logic (Receipt & Payment)
-- Run this in Supabase SQL Editor after the base migration
-- ============================================================
BEGIN;

-- ─── FIX save_receipt_voucher ───
-- Correct journal entry:
--   DEBIT:  Cash/Bank (the account that receives the money)
--   CREDIT: Routed account (AR by default, or any other account selected)
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

  SELECT name INTO v_customer_name FROM public.customers WHERE id = p_customer_id;

  -- DEBIT side: always Cash or Bank (the money comes in here)
  v_debit_account := public._resolve_payment_account(p_restaurant_id, p_payment_method, NULL);

  -- CREDIT side: the routed account (AR 1200 by default, or user-selected)
  v_credit_account := COALESCE(
    p_account_id,
    p_counter_account_id,
    public._coa_by_code(p_restaurant_id, '1200')
  );

  IF p_voucher_id IS NOT NULL THEN
    SELECT amount, customer_id INTO v_old_amount, v_old_customer_id
    FROM public.receipt_vouchers WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'سند القبض غير موجود'; END IF;

    UPDATE public.customers SET balance = balance + v_old_amount WHERE id = v_old_customer_id;

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
  SET balance = GREATEST(0, COALESCE(balance, 0) - p_amount)
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

-- ─── FIX save_payment_voucher ───
-- Correct journal entry:
--   DEBIT:  Routed account (AP by default, or any other account selected - e.g. expense)
--   CREDIT: Cash/Bank (the money goes out from here)
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

  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = p_supplier_id;

  -- CREDIT side: always Cash or Bank (the money leaves from here)
  v_credit_account := public._resolve_payment_account(p_restaurant_id, p_payment_method, NULL);

  -- DEBIT side: the routed account (AP 2100 by default, or user-selected account like expense)
  v_debit_account := COALESCE(
    p_account_id,
    p_counter_account_id,
    public._coa_by_code(p_restaurant_id, '2100')
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
  SET balance = GREATEST(0, COALESCE(balance, 0) - p_amount)
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

GRANT EXECUTE ON FUNCTION public.save_receipt_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_payment_voucher TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Voucher posting logic corrected: DR Cash/CR AR for receipts, DR AP/CR Cash for payments';
END $$;
