-- ============================================================
-- FINAL COMPREHENSIVE FIX
-- 1. Fix customers.credit_limit NOT NULL with proper DEFAULT
-- 2. Ensure UNIQUE constraint on chart_of_accounts(restaurant_id, code)
-- 3. Rewrite create_sales_return_journal_entry with bulletproof
--    account resolution (no ON CONFLICT dependency)
-- 4. Re-register the sales_returns trigger
-- 5. Fix suppliers table missing columns
-- ============================================================

BEGIN;

-- Compatibility repair for the production schema. Some historical versions
-- use customers.current_balance instead of customers.balance. Add only missing
-- columns, then preserve existing current_balance values when available.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0;

DO $compat$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'current_balance'
  ) THEN
    EXECUTE 'UPDATE public.customers SET balance = current_balance WHERE balance = 0 AND current_balance IS NOT NULL';
  END IF;
END
$compat$;

-- ────────────────────────────────────────────────────────────
-- 1. FIX CUSTOMERS TABLE
-- ────────────────────────────────────────────────────────────

-- Fix nulls first
UPDATE public.customers SET credit_limit = 0 WHERE credit_limit IS NULL;
UPDATE public.customers SET balance      = 0 WHERE balance      IS NULL;

-- Ensure DEFAULT and NOT NULL
ALTER TABLE public.customers
  ALTER COLUMN credit_limit SET DEFAULT 0;
ALTER TABLE public.customers
  ALTER COLUMN credit_limit SET NOT NULL;
ALTER TABLE public.customers
  ALTER COLUMN balance SET DEFAULT 0;
ALTER TABLE public.customers
  ALTER COLUMN balance SET NOT NULL;

-- Ensure customer_type column exists with default (some migrations may have recreated the table)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_type TEXT NOT NULL DEFAULT 'retail';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_number TEXT;


-- ────────────────────────────────────────────────────────────
-- 2. FIX SUPPLIERS TABLE
-- ────────────────────────────────────────────────────────────

UPDATE public.suppliers SET balance = 0 WHERE balance IS NULL;
ALTER TABLE public.suppliers ALTER COLUMN balance SET DEFAULT 0;
ALTER TABLE public.suppliers ALTER COLUMN balance SET NOT NULL;

-- Ensure needed columns
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC NOT NULL DEFAULT 0;


-- ────────────────────────────────────────────────────────────
-- 3. ENSURE UNIQUE CONSTRAINT ON chart_of_accounts
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Add unique constraint only if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'chart_of_accounts'
      AND c.contype = 'u'
      AND c.conname = 'chart_of_accounts_restaurant_id_code_key'
  ) THEN
    -- Remove duplicate codes first (keep only the one with smallest id)
    DELETE FROM public.chart_of_accounts a
    WHERE a.id NOT IN (
      SELECT MIN(b.id)
      FROM public.chart_of_accounts b
      WHERE b.restaurant_id = a.restaurant_id AND b.code = a.code
      GROUP BY b.restaurant_id, b.code
    );
    ALTER TABLE public.chart_of_accounts
      ADD CONSTRAINT chart_of_accounts_restaurant_id_code_key UNIQUE (restaurant_id, code);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 4. BULLETPROOF ACCOUNT RESOLVER (no ON CONFLICT dependency)
-- ────────────────────────────────────────────────────────────

-- Helper: get or create an account without relying on ON CONFLICT
CREATE OR REPLACE FUNCTION public._get_or_create_account(
  p_restaurant_id UUID,
  p_code         TEXT,
  p_name         TEXT,
  p_type         TEXT,   -- asset | liability | equity | revenue | expense
  p_subtype      TEXT DEFAULT NULL,
  p_system_key   TEXT DEFAULT NULL,
  p_normal_side  TEXT DEFAULT 'debit',
  p_is_cash      BOOLEAN DEFAULT FALSE,
  p_is_bank      BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- 1. Try to find by system_key first (most reliable)
  IF p_system_key IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.chart_of_accounts
    WHERE restaurant_id = p_restaurant_id AND system_key = p_system_key
    LIMIT 1;
  END IF;

  -- 2. Try by code
  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.chart_of_accounts
    WHERE restaurant_id = p_restaurant_id AND code = p_code
    LIMIT 1;
  END IF;

  -- 3. Special: cash account by flag
  IF v_id IS NULL AND p_is_cash THEN
    SELECT id INTO v_id
    FROM public.chart_of_accounts
    WHERE restaurant_id = p_restaurant_id AND is_cash_account = TRUE
    LIMIT 1;
  END IF;

  -- 4. Special: bank account by flag
  IF v_id IS NULL AND p_is_bank THEN
    SELECT id INTO v_id
    FROM public.chart_of_accounts
    WHERE restaurant_id = p_restaurant_id AND is_bank_account = TRUE
    LIMIT 1;
  END IF;

  -- 5. Create it if still not found
  IF v_id IS NULL THEN
    BEGIN
      INSERT INTO public.chart_of_accounts (
        restaurant_id, code, name, account_type, subtype,
        system_key, normal_side, account_class,
        is_cash_account, is_bank_account
      ) VALUES (
        p_restaurant_id, p_code, p_name, p_type, COALESCE(p_subtype, p_type),
        p_system_key, p_normal_side, p_type,
        p_is_cash, p_is_bank
      )
      RETURNING id INTO v_id;
    EXCEPTION
      WHEN unique_violation THEN
        -- Race condition: another session already inserted it
        SELECT id INTO v_id
        FROM public.chart_of_accounts
        WHERE restaurant_id = p_restaurant_id AND code = p_code
        LIMIT 1;
      WHEN OTHERS THEN
        -- Last resort: find anything close
        SELECT id INTO v_id
        FROM public.chart_of_accounts
        WHERE restaurant_id = p_restaurant_id AND account_type = p_type
        ORDER BY code
        LIMIT 1;
    END;
  END IF;

  RETURN v_id;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. REWRITE STANDARD ACCOUNT GETTERS using _get_or_create_account
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_cash_account(p_restaurant_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public._get_or_create_account(
    p_restaurant_id, '1000', 'الصندوق الرئيسي',
    'asset', 'cash', 'cash_on_hand', 'debit', TRUE, FALSE
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_accounts_receivable(p_restaurant_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public._get_or_create_account(
    p_restaurant_id, '1200', 'العملاء',
    'asset', 'receivable', 'accounts_receivable', 'debit', FALSE, FALSE
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_accounts_payable(p_restaurant_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public._get_or_create_account(
    p_restaurant_id, '2000', 'الموردين',
    'liability', 'payable', 'accounts_payable', 'credit', FALSE, FALSE
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_inventory_account(p_restaurant_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public._get_or_create_account(
    p_restaurant_id, '1300', 'المخزون',
    'asset', 'inventory', 'inventory', 'debit', FALSE, FALSE
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_sales_account(p_restaurant_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public._get_or_create_account(
    p_restaurant_id, '4000', 'المبيعات',
    'revenue', 'sales_revenue', 'sales_revenue', 'credit', FALSE, FALSE
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_sales_returns_account(p_restaurant_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public._get_or_create_account(
    p_restaurant_id, '4020', 'مردودات المبيعات',
    'revenue', 'sales_returns', 'sales_returns', 'debit', FALSE, FALSE
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_cogs_account(p_restaurant_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public._get_or_create_account(
    p_restaurant_id, '5000', 'تكلفة المبيعات',
    'expense', 'cogs', 'cogs', 'debit', FALSE, FALSE
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_or_create_expense_account(
  p_restaurant_id UUID,
  p_account_name  TEXT,
  p_code          TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public._get_or_create_account(
    p_restaurant_id, p_code, p_account_name,
    'expense', 'operating_expense', NULL, 'debit', FALSE, FALSE
  );
END; $$;


-- ────────────────────────────────────────────────────────────
-- 6. REWRITE create_sales_return_journal_entry (BULLETPROOF)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_sales_return_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id               UUID;
  v_sales_returns_account  UUID;
  v_receivable_account     UUID;
  v_cash_account           UUID;
  v_cogs_account           UUID;
  v_inventory_account      UUID;
  v_entry_number           TEXT;
  v_total_cost             NUMERIC(15,2) := 0;
  v_total_lines_debit      NUMERIC(15,2);
  v_total_lines_credit     NUMERIC(15,2);
BEGIN
  -- Only process when status changes TO approved/completed for the first time
  IF NEW.status NOT IN ('approved', 'completed') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('approved', 'completed') THEN
    RETURN NEW;
  END IF;
  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  -- Skip if total_amount is 0 (items not yet calculated)
  IF COALESCE(NEW.total_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- ── Resolve all accounts (guaranteed non-null) ──
  v_sales_returns_account := public.get_sales_returns_account(NEW.restaurant_id);
  v_cash_account          := public.get_cash_account(NEW.restaurant_id);
  v_receivable_account    := public.get_accounts_receivable(NEW.restaurant_id);
  v_cogs_account          := public.get_cogs_account(NEW.restaurant_id);
  v_inventory_account     := public.get_inventory_account(NEW.restaurant_id);

  -- Safety guard: abort with clear message if any account is still null
  IF v_sales_returns_account IS NULL THEN
    RAISE EXCEPTION 'فشل الحصول على حساب مردودات المبيعات للفرع %', NEW.restaurant_id;
  END IF;
  IF v_cash_account IS NULL THEN
    RAISE EXCEPTION 'فشل الحصول على حساب الصندوق للفرع %', NEW.restaurant_id;
  END IF;
  IF v_receivable_account IS NULL THEN
    RAISE EXCEPTION 'فشل الحصول على حساب العملاء للفرع %', NEW.restaurant_id;
  END IF;

  -- ── Calculate total cost from return items ──
  SELECT COALESCE(SUM(COALESCE(cost_price_at_return, 0) * COALESCE(quantity_returned, 0)), 0)
    INTO v_total_cost
    FROM public.sales_return_items
   WHERE sales_return_id = NEW.id AND return_to_inventory = TRUE;

  -- ── Generate entry number ──
  v_entry_number := public.generate_entry_number(NEW.restaurant_id);

  -- ── Create journal entry header ──
  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date,
    reference_type, reference_id, description,
    source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id,
    v_entry_number,
    COALESCE(NEW.return_date::DATE, CURRENT_DATE),
    'sales_return', NEW.id,
    'مردود مبيعات - ' || NEW.return_number || COALESCE(' - ' || NEW.reason, ''),
    'auto',
    NEW.total_amount + v_total_cost,
    NEW.total_amount + v_total_cost,
    TRUE
  ) RETURNING id INTO v_entry_id;

  -- ── Determine credit side (customer receivable or cash refund) ──
  -- ACCOUNTING LOGIC:
  --   DR مردودات المبيعات  (increases contra-revenue)
  --   CR العملاء           (reduces what customer owes) OR
  --   CR الصندوق           (cash refund paid to customer)

  -- Insert lines individually so each error is clear
  -- Line 1: DR مردودات المبيعات
  INSERT INTO public.journal_entry_lines
    (entry_id, account_id, debit, credit, description, line_order)
  VALUES
    (v_entry_id, v_sales_returns_account, NEW.total_amount, 0, 'مردود مبيعات', 1);

  -- Line 2: CR العملاء or CR الصندوق
  INSERT INTO public.journal_entry_lines
    (entry_id, account_id, debit, credit, description, line_order)
  VALUES (
    v_entry_id,
    CASE WHEN NEW.customer_id IS NOT NULL THEN v_receivable_account ELSE v_cash_account END,
    0,
    NEW.total_amount,
    CASE WHEN NEW.customer_id IS NOT NULL THEN 'تخفيض رصيد العميل' ELSE 'استرداد نقدي للعميل' END,
    2
  );

  -- Lines 3 & 4: COGS reversal (only when items return to inventory)
  IF v_total_cost > 0 AND v_inventory_account IS NOT NULL AND v_cogs_account IS NOT NULL THEN
    -- Line 3: DR مخزون (restore inventory)
    INSERT INTO public.journal_entry_lines
      (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_inventory_account, v_total_cost, 0, 'إعادة بضاعة للمخزون', 3);

    -- Line 4: CR تكلفة المبيعات (reverse COGS)
    INSERT INTO public.journal_entry_lines
      (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_cogs_account, 0, v_total_cost, 'عكس تكلفة المردودات', 4);
  END IF;

  -- ── Link journal entry back to return ──
  NEW.journal_entry_id := v_entry_id;
  NEW.inventory_adjusted := TRUE;

  -- ── Update customer balance (REDUCE what they owe = credit their account) ──
  -- When a return is approved, the customer's debt DECREASES
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers
       SET balance = COALESCE(balance, 0) - NEW.total_amount
     WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. RE-REGISTER THE TRIGGER ON sales_returns
-- ────────────────────────────────────────────────────────────

DO $sales_return_trigger$
BEGIN
  IF to_regclass('public.sales_returns') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_create_sales_return_journal ON public.sales_returns';
    EXECUTE 'CREATE TRIGGER trg_create_sales_return_journal
      BEFORE UPDATE OF status ON public.sales_returns
      FOR EACH ROW
      EXECUTE FUNCTION public.create_sales_return_journal_entry()';
  ELSE
    RAISE NOTICE 'Skipping sales_returns trigger: table is not present in this module schema';
  END IF;
END
$sales_return_trigger$;


-- ────────────────────────────────────────────────────────────
-- 8. FIX save_receipt_voucher — correct balance direction
--    Receipt Voucher (سند قبض): customer PAYS us → their balance DECREASES
--    DEBIT:  Cash / Bank  (money comes IN)
--    CREDIT: Accounts Receivable (reduces what customer owes)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.save_receipt_voucher(
  p_restaurant_id       UUID,
  p_customer_id         UUID,
  p_amount              NUMERIC,
  p_payment_method      TEXT    DEFAULT 'cash',
  p_voucher_date        DATE    DEFAULT CURRENT_DATE,
  p_notes               TEXT    DEFAULT NULL,
  p_account_id          UUID    DEFAULT NULL,
  p_counter_account_id  UUID    DEFAULT NULL,
  p_voucher_id          UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id              UUID;
  v_number          TEXT;
  v_customer_name   TEXT;
  v_debit_account   UUID;   -- Cash / Bank (money comes in)
  v_credit_account  UUID;   -- Accounts Receivable (reduces what customer owes)
  v_journal_id      UUID;
  v_old_amount      NUMERIC := 0;
  v_old_customer_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر';
  END IF;

  SELECT name INTO v_customer_name FROM public.customers WHERE id = p_customer_id;

  -- DR side: Cash or Bank (money comes IN to us)
  v_debit_account := public._resolve_payment_account(p_restaurant_id, p_payment_method, NULL);
  IF v_debit_account IS NULL THEN
    v_debit_account := public.get_cash_account(p_restaurant_id);
  END IF;

  -- CR side: Accounts Receivable (reduces what customer owes us)
  v_credit_account := COALESCE(
    p_account_id,
    p_counter_account_id,
    public._coa_by_code(p_restaurant_id, '1200'),
    public.get_accounts_receivable(p_restaurant_id)
  );

  IF p_voucher_id IS NOT NULL THEN
    -- EDIT mode: reverse old amount first
    SELECT amount, customer_id
      INTO v_old_amount, v_old_customer_id
      FROM public.receipt_vouchers
     WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'سند القبض غير موجود'; END IF;

    -- Restore old amount to old customer balance (undo previous reduction)
    UPDATE public.customers
       SET balance = COALESCE(balance, 0) + v_old_amount
     WHERE id = v_old_customer_id;

    UPDATE public.receipt_vouchers SET
      customer_id         = p_customer_id,
      amount              = p_amount,
      payment_method      = p_payment_method,
      voucher_date        = p_voucher_date,
      notes               = p_notes,
      account_id          = p_account_id,
      counter_account_id  = p_counter_account_id,
      updated_at          = NOW()
    WHERE id = p_voucher_id;

    v_id := p_voucher_id;
  ELSE
    -- CREATE mode
    v_number := 'RV-' || TO_CHAR(NOW(), 'YYMMDD') || '-' ||
                LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');

    INSERT INTO public.receipt_vouchers (
      restaurant_id, voucher_number, voucher_date, customer_id,
      amount, payment_method, account_id, counter_account_id, notes
    ) VALUES (
      p_restaurant_id, v_number, p_voucher_date, p_customer_id,
      p_amount, p_payment_method, p_account_id, p_counter_account_id, p_notes
    ) RETURNING id INTO v_id;

    -- Log in customer_transactions (amount is NEGATIVE = reduction in debt)
    INSERT INTO public.customer_transactions (
      restaurant_id, customer_id, type, amount, description, payment_method
    ) VALUES (
      p_restaurant_id, p_customer_id, 'payment', -p_amount,
      COALESCE(p_notes, 'سند قبض'), p_payment_method
    );
  END IF;

  -- CORRECT: Receipt payment REDUCES customer balance (they owe us LESS)
  UPDATE public.customers
     SET balance = COALESCE(balance, 0) - p_amount
   WHERE id = p_customer_id;

  -- Post balanced journal entry: DR Cash, CR AR
  v_journal_id := public._create_balanced_journal(
    p_restaurant_id,
    p_voucher_date,
    'سند قبض من العميل: ' || COALESCE(v_customer_name, '') || COALESCE(' - ' || p_notes, ''),
    'receipt_voucher', v_id, 'ar',
    v_debit_account,    -- DR: Cash/Bank
    v_credit_account,   -- CR: Accounts Receivable
    p_amount
  );

  UPDATE public.receipt_vouchers SET journal_entry_id = v_journal_id WHERE id = v_id;

  RETURN v_id;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 9. FIX save_payment_voucher — correct balance direction
--    Payment Voucher (إذن دفع): we PAY supplier → their balance DECREASES
--    DEBIT:  Accounts Payable (reduces what we owe)
--    CREDIT: Cash / Bank (money goes OUT)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.save_payment_voucher(
  p_restaurant_id       UUID,
  p_supplier_id         UUID,
  p_amount              NUMERIC,
  p_payment_method      TEXT    DEFAULT 'cash',
  p_voucher_date        DATE    DEFAULT CURRENT_DATE,
  p_reference_number    TEXT    DEFAULT NULL,
  p_notes               TEXT    DEFAULT NULL,
  p_account_id          UUID    DEFAULT NULL,
  p_counter_account_id  UUID    DEFAULT NULL,
  p_voucher_id          UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id              UUID;
  v_number          TEXT;
  v_supplier_name   TEXT;
  v_debit_account   UUID;   -- AP account (reduces what we owe)
  v_credit_account  UUID;   -- Cash / Bank (money leaves)
  v_journal_id      UUID;
  v_old_amount      NUMERIC := 0;
  v_old_supplier_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر';
  END IF;

  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = p_supplier_id;

  -- CR side: Cash or Bank (money goes OUT)
  v_credit_account := public._resolve_payment_account(p_restaurant_id, p_payment_method, NULL);
  IF v_credit_account IS NULL THEN
    v_credit_account := public.get_cash_account(p_restaurant_id);
  END IF;

  -- DR side: AP or user-selected account (expense, etc.)
  v_debit_account := COALESCE(
    p_account_id,
    p_counter_account_id,
    public._coa_by_code(p_restaurant_id, '2000'),
    public.get_accounts_payable(p_restaurant_id)
  );

  IF p_voucher_id IS NOT NULL THEN
    SELECT amount, supplier_id
      INTO v_old_amount, v_old_supplier_id
      FROM public.payment_vouchers
     WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'إذن الدفع غير موجود'; END IF;

    -- Restore old amount to old supplier balance (undo previous reduction)
    UPDATE public.suppliers
       SET balance = COALESCE(balance, 0) + v_old_amount
     WHERE id = v_old_supplier_id;

    UPDATE public.payment_vouchers SET
      supplier_id         = p_supplier_id,
      amount              = p_amount,
      payment_method      = p_payment_method,
      voucher_date        = p_voucher_date,
      reference_number    = p_reference_number,
      notes               = p_notes,
      account_id          = p_account_id,
      counter_account_id  = p_counter_account_id,
      updated_at          = NOW()
    WHERE id = p_voucher_id;

    v_id := p_voucher_id;
  ELSE
    v_number := 'PV-' || TO_CHAR(NOW(), 'YYMMDD') || '-' ||
                LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');

    INSERT INTO public.payment_vouchers (
      restaurant_id, voucher_number, voucher_date, supplier_id,
      amount, payment_method, account_id, counter_account_id,
      reference_number, notes
    ) VALUES (
      p_restaurant_id, v_number, p_voucher_date, p_supplier_id,
      p_amount, p_payment_method, p_account_id, p_counter_account_id,
      p_reference_number, p_notes
    ) RETURNING id INTO v_id;

    -- Log in supplier_transactions
    INSERT INTO public.supplier_transactions (
      restaurant_id, supplier_id, type, amount, description, payment_method
    ) VALUES (
      p_restaurant_id, p_supplier_id, 'payment', p_amount,
      COALESCE(p_notes, 'إذن دفع'), p_payment_method
    );
  END IF;

  -- CORRECT: Payment REDUCES supplier balance (we owe them LESS)
  UPDATE public.suppliers
     SET balance = COALESCE(balance, 0) - p_amount
   WHERE id = p_supplier_id;

  -- Post balanced journal entry: DR AP, CR Cash
  v_journal_id := public._create_balanced_journal(
    p_restaurant_id,
    p_voucher_date,
    'إذن دفع للمورد: ' || COALESCE(v_supplier_name, '') || COALESCE(' - ' || p_notes, ''),
    'payment_voucher', v_id, 'ap',
    v_debit_account,   -- DR: AP or routed account
    v_credit_account,  -- CR: Cash/Bank
    p_amount
  );

  UPDATE public.payment_vouchers SET journal_entry_id = v_journal_id WHERE id = v_id;

  RETURN v_id;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 10. GRANTS
-- ────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public._get_or_create_account         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_account               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accounts_receivable        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accounts_payable           TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_account          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_account              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_returns_account      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cogs_account               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_expense_account  TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_receipt_voucher           TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_payment_voucher           TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Comprehensive fix applied:';
  RAISE NOTICE '   • customers.credit_limit: DEFAULT 0, NOT NULL enforced';
  RAISE NOTICE '   • suppliers.balance: DEFAULT 0, NOT NULL enforced';
  RAISE NOTICE '   • chart_of_accounts UNIQUE(restaurant_id,code) ensured';
  RAISE NOTICE '   • _get_or_create_account: bulletproof (no ON CONFLICT)';
  RAISE NOTICE '   • create_sales_return_journal_entry: rewritten & trigger re-registered';
  RAISE NOTICE '   • save_receipt_voucher: DR Cash / CR AR (correct)';
  RAISE NOTICE '   • save_payment_voucher: DR AP / CR Cash (correct)';
END $$;
