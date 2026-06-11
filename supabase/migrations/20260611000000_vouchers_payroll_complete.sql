-- ============================================================
-- VOUCHERS, PAYROLL & ORDER REFERENCE — Complete Migration
-- Run this in Supabase SQL Editor
-- ============================================================

BEGIN;

-- ─── 1. Order customer reference ───
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_ref TEXT;

UPDATE public.orders
SET customer_ref = NULLIF(TRIM(SPLIT_PART(SPLIT_PART(notes, 'المرجع:', 2), '|', 1)), '')
WHERE customer_ref IS NULL AND notes LIKE '%المرجع:%';

CREATE INDEX IF NOT EXISTS idx_orders_customer_ref ON public.orders(restaurant_id, customer_ref);

-- ─── 2. Staff salary columns on restaurant_staff ───
ALTER TABLE public.restaurant_staff ADD COLUMN IF NOT EXISTS base_salary NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.restaurant_staff ADD COLUMN IF NOT EXISTS payment_cycle TEXT DEFAULT 'monthly';

-- ─── 3. Staff departments (قطاعات / إدارات) ───
CREATE TABLE IF NOT EXISTS public.staff_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30),
  expense_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

-- ─── 4. Extend staff_profiles ───
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.staff_departments(id) ON DELETE SET NULL;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS restaurant_staff_id UUID REFERENCES public.restaurant_staff(id) ON DELETE SET NULL;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- ─── 5. Extend payroll_transactions ───
ALTER TABLE public.payroll_transactions ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.payroll_transactions ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.staff_departments(id) ON DELETE SET NULL;
ALTER TABLE public.payroll_transactions ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.payroll_transactions ADD COLUMN IF NOT EXISTS allowances NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.payroll_transactions ADD COLUMN IF NOT EXISTS deductions NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.payroll_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid';
ALTER TABLE public.payroll_transactions ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── 6. Receipt vouchers (سندات القبض) ───
CREATE TABLE IF NOT EXISTS public.receipt_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  voucher_number VARCHAR(50) NOT NULL,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  counter_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_restaurant ON public.receipt_vouchers(restaurant_id, voucher_date DESC);

-- ─── 7. Payment vouchers (أذون الدفع) ───
CREATE TABLE IF NOT EXISTS public.payment_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  voucher_number VARCHAR(50) NOT NULL,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  counter_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  reference_number TEXT,
  notes TEXT,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_vouchers_restaurant ON public.payment_vouchers(restaurant_id, voucher_date DESC);

-- ─── 8. Helper: resolve COA account by code ───
CREATE OR REPLACE FUNCTION public._coa_by_code(p_restaurant_id UUID, p_code TEXT)
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.chart_of_accounts
  WHERE restaurant_id = p_restaurant_id AND code = p_code
  LIMIT 1;
$$;

-- ─── 9. Helper: next journal entry number ───
CREATE OR REPLACE FUNCTION public._next_journal_number(p_restaurant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_last TEXT;
  v_num INTEGER;
BEGIN
  SELECT entry_number INTO v_last
  FROM public.journal_entries
  WHERE restaurant_id = p_restaurant_id
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF v_last IS NULL THEN
    RETURN 'JE-000001';
  END IF;

  v_num := COALESCE(NULLIF(REGEXP_REPLACE(v_last, '\D', '', 'g'), '')::INTEGER, 0) + 1;
  RETURN 'JE-' || LPAD(v_num::TEXT, 6, '0');
END;
$$;

-- ─── 10. Helper: create balanced journal entry ───
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

  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES (v_entry_id, p_debit_account_id, p_amount, 0, p_description, 1);

  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES (v_entry_id, p_credit_account_id, 0, p_amount, p_description, 2);

  RETURN v_entry_id;
END;
$$;

-- ─── 11. Resolve cash/bank account from payment method ───
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
    v_id := public._coa_by_code(p_restaurant_id, '1400');
    IF v_id IS NULL THEN v_id := public._coa_by_code(p_restaurant_id, '1110'); END IF;
  ELSE
    v_id := public._coa_by_code(p_restaurant_id, '1100');
  END IF;

  RETURN v_id;
END;
$$;

-- ─── 12. Save receipt voucher (سند قبض) ───
CREATE OR REPLACE FUNCTION public.save_receipt_voucher(
  p_restaurant_id UUID,
  p_customer_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_voucher_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_counter_account_id UUID DEFAULT NULL,
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
  v_ar_account UUID;
  v_cash_account UUID;
  v_journal_id UUID;
  v_old_amount NUMERIC := 0;
  v_old_customer_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر'; END IF;

  SELECT name INTO v_customer_name FROM public.customers WHERE id = p_customer_id;

  v_ar_account := COALESCE(
    p_counter_account_id,
    p_account_id,
    public._coa_by_code(p_restaurant_id, '1200')
  );

  -- If selected account is AR (12xx), use cash as the other side
  IF EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE id = v_ar_account AND code LIKE '12%') THEN
    v_cash_account := public._resolve_payment_account(p_restaurant_id, p_payment_method, NULL);
  ELSE
    v_cash_account := COALESCE(p_account_id, public._resolve_payment_account(p_restaurant_id, p_payment_method, NULL));
    v_ar_account := COALESCE(p_counter_account_id, public._coa_by_code(p_restaurant_id, '1200'));
  END IF;

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

  v_journal_id := public._create_balanced_journal(
    p_restaurant_id, p_voucher_date,
    'سند قبض من العميل: ' || COALESCE(v_customer_name, '') || COALESCE(' - ' || p_notes, ''),
    'receipt_voucher', v_id, 'ar',
    v_cash_account, v_ar_account, p_amount
  );

  UPDATE public.receipt_vouchers SET journal_entry_id = v_journal_id WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- ─── 13. Delete receipt voucher ───
CREATE OR REPLACE FUNCTION public.delete_receipt_voucher(p_voucher_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT * INTO v FROM public.receipt_vouchers WHERE id = p_voucher_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'سند القبض غير موجود'; END IF;

  UPDATE public.customers SET balance = COALESCE(balance, 0) + v.amount WHERE id = v.customer_id;

  IF v.journal_entry_id IS NOT NULL THEN
    DELETE FROM public.journal_entry_lines WHERE entry_id = v.journal_entry_id;
    DELETE FROM public.journal_entries WHERE id = v.journal_entry_id;
  END IF;

  DELETE FROM public.receipt_vouchers WHERE id = p_voucher_id;
END;
$$;

-- ─── 14. Save payment voucher (إذن دفع) ───
CREATE OR REPLACE FUNCTION public.save_payment_voucher(
  p_restaurant_id UUID,
  p_supplier_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_voucher_date DATE DEFAULT CURRENT_DATE,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_counter_account_id UUID DEFAULT NULL,
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
  v_ap_account UUID;
  v_cash_account UUID;
  v_journal_id UUID;
  v_old_amount NUMERIC := 0;
  v_old_supplier_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر'; END IF;

  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = p_supplier_id;

  v_ap_account := COALESCE(
    p_counter_account_id,
    public._coa_by_code(p_restaurant_id, '2100')
  );

  IF p_account_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.chart_of_accounts WHERE id = p_account_id AND code LIKE '21%'
  ) THEN
    v_ap_account := p_account_id;
    v_cash_account := public._resolve_payment_account(p_restaurant_id, p_payment_method, NULL);
  ELSE
    v_cash_account := COALESCE(p_account_id, public._resolve_payment_account(p_restaurant_id, p_payment_method, NULL));
  END IF;

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

  v_journal_id := public._create_balanced_journal(
    p_restaurant_id, p_voucher_date,
    'إذن دفع للمورد: ' || COALESCE(v_supplier_name, '') || COALESCE(' - ' || p_notes, ''),
    'payment_voucher', v_id, 'ap',
    v_ap_account, v_cash_account, p_amount
  );

  UPDATE public.payment_vouchers SET journal_entry_id = v_journal_id WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- ─── 15. Delete payment voucher ───
CREATE OR REPLACE FUNCTION public.delete_payment_voucher(p_voucher_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT * INTO v FROM public.payment_vouchers WHERE id = p_voucher_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'إذن الدفع غير موجود'; END IF;

  UPDATE public.suppliers SET balance = COALESCE(balance, 0) + v.amount WHERE id = v.supplier_id;

  IF v.journal_entry_id IS NOT NULL THEN
    DELETE FROM public.journal_entry_lines WHERE entry_id = v.journal_entry_id;
    DELETE FROM public.journal_entries WHERE id = v.journal_entry_id;
  END IF;

  DELETE FROM public.payment_vouchers WHERE id = p_voucher_id;
END;
$$;

-- ─── 16. Record monthly payroll with COA routing ───
CREATE OR REPLACE FUNCTION public.record_payroll_payment(
  p_restaurant_id UUID,
  p_staff_id UUID,
  p_net_salary NUMERIC,
  p_month INTEGER,
  p_year INTEGER,
  p_expense_account_id UUID DEFAULT NULL,
  p_payment_account_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_allowances NUMERIC DEFAULT 0,
  p_deductions NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payroll_id UUID;
  v_staff_name TEXT;
  v_expense_acct UUID;
  v_payment_acct UUID;
  v_journal_id UUID;
BEGIN
  IF p_net_salary <= 0 THEN RAISE EXCEPTION 'صافي الراتب يجب أن يكون أكبر من صفر'; END IF;

  SELECT full_name INTO v_staff_name FROM public.staff_profiles WHERE id = p_staff_id;

  v_expense_acct := COALESCE(
    p_expense_account_id,
    (SELECT expense_account_id FROM public.staff_profiles WHERE id = p_staff_id),
    (SELECT expense_account_id FROM public.staff_departments WHERE id = p_department_id),
    public._coa_by_code(p_restaurant_id, '6100')
  );

  v_payment_acct := COALESCE(
    p_payment_account_id,
    public._coa_by_code(p_restaurant_id, '1100')
  );

  INSERT INTO public.payroll_transactions (
    restaurant_id, staff_id, month, year, net_salary,
    payment_date, expense_account_id, payment_account_id,
    department_id, allowances, deductions, status, notes
  ) VALUES (
    p_restaurant_id, p_staff_id, p_month, p_year, p_net_salary,
    p_payment_date, v_expense_acct, v_payment_acct,
    p_department_id, p_allowances, p_deductions, 'paid', p_notes
  ) RETURNING id INTO v_payroll_id;

  v_journal_id := public._create_balanced_journal(
    p_restaurant_id, p_payment_date,
    'صرف راتب: ' || COALESCE(v_staff_name, '') || ' (' || p_month || '/' || p_year || ')',
    'payroll', v_payroll_id, 'payroll',
    v_expense_acct, v_payment_acct, p_net_salary
  );

  UPDATE public.payroll_transactions SET journal_entry_id = v_journal_id WHERE id = v_payroll_id;

  RETURN v_payroll_id;
END;
$$;

-- ─── 17. RLS Policies ───
ALTER TABLE public.receipt_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS receipt_vouchers_owner ON public.receipt_vouchers;
CREATE POLICY receipt_vouchers_owner ON public.receipt_vouchers
  FOR ALL TO authenticated
  USING (public.is_restaurant_owner(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS payment_vouchers_owner ON public.payment_vouchers;
CREATE POLICY payment_vouchers_owner ON public.payment_vouchers
  FOR ALL TO authenticated
  USING (public.is_restaurant_owner(auth.uid(), restaurant_id));

DROP POLICY IF EXISTS staff_departments_owner ON public.staff_departments;
CREATE POLICY staff_departments_owner ON public.staff_departments
  FOR ALL TO authenticated
  USING (public.is_restaurant_owner(auth.uid(), restaurant_id));

-- ─── 18. Grants ───
GRANT EXECUTE ON FUNCTION public.save_receipt_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_receipt_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_payment_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_payment_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payroll_payment TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: vouchers, payroll, customer_ref, departments';
END $$;
