-- Fix for account type constraint violation
-- The constraint requires: 'asset', 'liability', 'equity', 'revenue', 'expense'

CREATE OR REPLACE FUNCTION public.seed_global_coa(p_restaurant_id uuid, p_profile text DEFAULT 'restaurant')
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.chart_of_accounts
  (restaurant_id, code, name, account_type, subtype, account_class, normal_side, system_key, posting_allowed, business_scope)
  VALUES
  (p_restaurant_id, '1000', 'Cash On Hand', 'asset', 'cash', 'asset', 'debit', 'cash_on_hand', true, ARRAY['all']),
  (p_restaurant_id, '1100', 'Bank Accounts', 'asset', 'bank', 'asset', 'debit', 'bank_main', true, ARRAY['all']),
  (p_restaurant_id, '1200', 'Accounts Receivable', 'asset', 'receivable', 'asset', 'debit', 'accounts_receivable', true, ARRAY['all']),
  (p_restaurant_id, '1300', 'Inventory', 'asset', 'inventory', 'asset', 'debit', 'inventory', true, ARRAY['retail', 'restaurant', 'pharmacy']),
  (p_restaurant_id, '2000', 'Accounts Payable', 'liability', 'payable', 'liability', 'credit', 'accounts_payable', true, ARRAY['all']),
  (p_restaurant_id, '2100', 'Tax Payable', 'liability', 'current_liability', 'liability', 'credit', 'tax_payable', true, ARRAY['all']),
  (p_restaurant_id, '3000', 'Owner Equity', 'equity', 'equity', 'equity', 'credit', 'owner_equity', true, ARRAY['all']),
  (p_restaurant_id, '4000', 'Sales Revenue', 'revenue', 'sales_revenue', 'revenue', 'credit', 'sales_revenue', true, ARRAY['all']),
  (p_restaurant_id, '4100', 'Service Revenue', 'revenue', 'other_revenue', 'revenue', 'credit', 'service_revenue', true, ARRAY['services']),
  (p_restaurant_id, '5000', 'COGS', 'expense', 'cogs', 'expense', 'debit', 'cogs', true, ARRAY['retail', 'restaurant', 'pharmacy']),
  (p_restaurant_id, '6000', 'Operating Expenses', 'expense', 'operating_expense', 'expense', 'debit', 'operating_expenses', true, ARRAY['all'])
  ON CONFLICT (restaurant_id, code) DO NOTHING;
END;
$$;
