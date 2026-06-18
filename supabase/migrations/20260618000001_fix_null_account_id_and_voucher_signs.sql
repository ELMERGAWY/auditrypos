-- ============================================================
-- FIX: Robust Account Resolution and Voucher Payment Mapping
-- ============================================================

BEGIN;

-- 1) Fix get_cash_account
CREATE OR REPLACE FUNCTION public.get_cash_account(p_restaurant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- First try to find by system_key or is_cash_account or standard codes
  SELECT id INTO v_account_id 
  FROM public.chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id 
    AND (system_key = 'cash_on_hand' OR is_cash_account = true OR code = '1000' OR code = '101')
  LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (
      restaurant_id, code, name, account_type, is_cash_account, subtype, system_key, normal_side, account_class
    )
    VALUES (
      p_restaurant_id, '1000', 'الصندوق الرئيسي', 'asset', true, 'cash', 'cash_on_hand', 'debit', 'asset'
    )
    ON CONFLICT (restaurant_id, code) DO UPDATE SET is_cash_account = true, system_key = 'cash_on_hand'
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$;


-- 2) Fix get_accounts_receivable
CREATE OR REPLACE FUNCTION public.get_accounts_receivable(p_restaurant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM public.chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id 
    AND (system_key = 'accounts_receivable' OR code = '1200' OR code = '102')
  LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (
      restaurant_id, code, name, account_type, subtype, system_key, normal_side, account_class
    )
    VALUES (
      p_restaurant_id, '1200', 'العملاء', 'asset', 'receivable', 'accounts_receivable', 'debit', 'asset'
    )
    ON CONFLICT (restaurant_id, code) DO UPDATE SET system_key = 'accounts_receivable'
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$;


-- 3) Fix get_accounts_payable
CREATE OR REPLACE FUNCTION public.get_accounts_payable(p_restaurant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM public.chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id 
    AND (system_key = 'accounts_payable' OR code = '2000' OR code = '201')
  LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (
      restaurant_id, code, name, account_type, subtype, system_key, normal_side, account_class
    )
    VALUES (
      p_restaurant_id, '2000', 'الموردين', 'liability', 'payable', 'accounts_payable', 'credit', 'liability'
    )
    ON CONFLICT (restaurant_id, code) DO UPDATE SET system_key = 'accounts_payable'
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$;


-- 4) Fix get_inventory_account
CREATE OR REPLACE FUNCTION public.get_inventory_account(p_restaurant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM public.chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id 
    AND (system_key = 'inventory' OR code = '1300' OR code = '103')
  LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (
      restaurant_id, code, name, account_type, subtype, system_key, normal_side, account_class
    )
    VALUES (
      p_restaurant_id, '1300', 'المخزون', 'asset', 'inventory', 'inventory', 'debit', 'asset'
    )
    ON CONFLICT (restaurant_id, code) DO UPDATE SET system_key = 'inventory'
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$;


-- 5) Fix get_sales_account
CREATE OR REPLACE FUNCTION public.get_sales_account(p_restaurant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM public.chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id 
    AND (system_key = 'sales_revenue' OR code = '4000' OR code = '401')
  LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (
      restaurant_id, code, name, account_type, subtype, system_key, normal_side, account_class
    )
    VALUES (
      p_restaurant_id, '4000', 'المبيعات', 'revenue', 'sales_revenue', 'sales_revenue', 'credit', 'revenue'
    )
    ON CONFLICT (restaurant_id, code) DO UPDATE SET system_key = 'sales_revenue'
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$;


-- 6) Fix get_sales_returns_account
CREATE OR REPLACE FUNCTION public.get_sales_returns_account(p_restaurant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM public.chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id 
    AND (code = '4020' OR code = '402' OR system_key = 'sales_returns')
  LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (
      restaurant_id, code, name, account_type, subtype, system_key, normal_side, account_class
    )
    VALUES (
      p_restaurant_id, '4020', 'مردودات المبيعات', 'revenue', 'sales_returns', 'sales_returns', 'debit', 'revenue'
    )
    ON CONFLICT (restaurant_id, code) DO UPDATE SET system_key = 'sales_returns'
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$;


-- 7) Fix get_cogs_account
CREATE OR REPLACE FUNCTION public.get_cogs_account(p_restaurant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM public.chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id 
    AND (system_key = 'cogs' OR code = '5000' OR code = '501')
  LIMIT 1;
  
  IF v_account_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (
      restaurant_id, code, name, account_type, subtype, system_key, normal_side, account_class
    )
    VALUES (
      p_restaurant_id, '5000', 'تكلفة المبيعات', 'expense', 'cogs', 'cogs', 'debit', 'expense'
    )
    ON CONFLICT (restaurant_id, code) DO UPDATE SET system_key = 'cogs'
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$;


-- 8) Fix get_or_create_expense_account
CREATE OR REPLACE FUNCTION public.get_or_create_expense_account(
  p_restaurant_id UUID,
  p_account_name TEXT,
  p_code TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM public.chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND (code = p_code OR name = p_account_name) AND account_type = 'expense';
  
  IF v_account_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (restaurant_id, code, name, account_type, subtype)
    VALUES (p_restaurant_id, p_code, p_account_name, 'expense', 'operating_expense')
    ON CONFLICT (restaurant_id, code) DO UPDATE SET name = EXCLUDED.name, account_type = 'expense'
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$;


-- 9) Fix _resolve_payment_account (resolve main cash/bank from global seed codes)
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
    IF v_id IS NULL THEN v_id := public._coa_by_code(p_restaurant_id, '1100'); END IF; -- bank as fallback
  END IF;

  RETURN v_id;
END;
$$;

COMMIT;
