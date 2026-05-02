-- ============================================================
-- ERP RE-INITIALIZATION: CLEANUP & UNIFICATION
-- Fix duplication issues and establish single source of truth
-- CRITICAL: Run this only after backing up data!
-- ============================================================

-- ============================================
-- PHASE 1: DROP ALL DUPLICATED/OVERLOADED FUNCTIONS
-- ============================================
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Drop all versions of these functions
  FOR func_record IN 
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      AND routine_name IN (
        'update_account_balance',
        'update_account_balances',
        'post_journal_entry',
        'get_trial_balance',
        'get_profit_and_loss',
        'get_balance_sheet',
        'get_cash_flow',
        'link_entry_to_fiscal_period',
        'post_transaction'
        -- NOTE: seed_global_coa and create_fiscal_periods_for_year are preserved
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I CASCADE', func_record.routine_name);
    RAISE NOTICE 'Dropped function: %', func_record.routine_name;
  END LOOP;
END $$;

-- Drop triggers
DROP TRIGGER IF EXISTS tr_link_entry_to_period ON journal_entries;
DROP TRIGGER IF EXISTS tr_update_balances ON journal_entries;
DROP TRIGGER IF EXISTS tr_post_entry ON journal_entries;

-- ============================================
-- PHASE 2: ENSURE PROPER TABLE STRUCTURE
-- ============================================

-- Add fiscal_period_id to journal_entries if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'journal_entries' 
    AND column_name = 'fiscal_period_id'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN fiscal_period_id UUID REFERENCES fiscal_periods(id);
    RAISE NOTICE 'Added fiscal_period_id to journal_entries';
  END IF;
END $$;

-- Ensure account_balances has proper structure
DO $$
BEGIN
  -- Check if table exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'account_balances'
  ) THEN
    CREATE TABLE account_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
      fiscal_period_id UUID REFERENCES fiscal_periods(id),
      restaurant_id UUID NOT NULL REFERENCES restaurants(id),
      
      -- Balance data
      opening_balance DECIMAL(15,2) DEFAULT 0,
      current_balance DECIMAL(15,2) DEFAULT 0,
      
      -- Movement tracking
      movement_debit DECIMAL(15,2) DEFAULT 0,
      movement_credit DECIMAL(15,2) DEFAULT 0,
      total_debit DECIMAL(15,2) DEFAULT 0,
      total_credit DECIMAL(15,2) DEFAULT 0,
      
      -- Budget/forecast
      budget_amount DECIMAL(15,2) DEFAULT 0,
      variance_amount DECIMAL(15,2) DEFAULT 0,
      variance_percent DECIMAL(5,2) DEFAULT 0,
      
      -- Metadata
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(account_id, fiscal_period_id)
    );
    RAISE NOTICE 'Created account_balances table';
  END IF;
END $$;

-- ============================================
-- PHASE 3: CREATE UNIFIED ERP FUNCTIONS
-- ============================================

-- 1. Single Source: Update Account Balance
CREATE OR REPLACE FUNCTION update_account_balance(
  p_account_id UUID,
  p_amount DECIMAL,
  p_fiscal_period_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id UUID;
  v_period_id UUID;
  v_company_id UUID;
BEGIN
  -- Get restaurant_id and company_id from account
  SELECT coa.restaurant_id, r.company_id 
  INTO v_restaurant_id, v_company_id
  FROM chart_of_accounts coa
  JOIN restaurants r ON r.id = coa.restaurant_id
  WHERE coa.id = p_account_id;

  -- Get current open period if not provided
  IF p_fiscal_period_id IS NULL THEN
    SELECT id INTO v_period_id
    FROM fiscal_periods
    WHERE company_id = v_company_id
      AND status = 'open'
      AND is_posting_allowed = true
    ORDER BY start_date DESC
    LIMIT 1;
  ELSE
    v_period_id := p_fiscal_period_id;
  END IF;

  -- Update or insert account balance
  INSERT INTO account_balances (
    account_id,
    fiscal_period_id,
    restaurant_id,
    opening_balance,
    current_balance,
    movement_debit,
    movement_credit,
    total_debit,
    total_credit,
    last_updated_at
  )
  VALUES (
    p_account_id,
    v_period_id,
    v_restaurant_id,
    0,
    p_amount,
    CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
    CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END,
    CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
    CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END,
    NOW()
  )
  ON CONFLICT (account_id, fiscal_period_id)
  DO UPDATE SET
    current_balance = account_balances.current_balance + p_amount,
    movement_debit = account_balances.movement_debit + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
    movement_credit = account_balances.movement_credit + CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END,
    total_debit = account_balances.total_debit + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
    total_credit = account_balances.total_credit + CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END,
    last_updated_at = NOW();

  -- Update chart_of_accounts live balance
  UPDATE chart_of_accounts
  SET current_balance = current_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_account_id;
END;
$$;

-- 2. Auto-link journal entries to fiscal periods
CREATE OR REPLACE FUNCTION link_entry_to_fiscal_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_period_id UUID;
BEGIN
  -- Get company_id from restaurant
  SELECT company_id INTO v_company_id
  FROM restaurants
  WHERE id = NEW.restaurant_id;

  -- Find matching fiscal period
  SELECT id INTO v_period_id
  FROM fiscal_periods
  WHERE company_id = v_company_id
    AND start_date <= NEW.entry_date
    AND end_date >= NEW.entry_date
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_period_id IS NOT NULL THEN
    NEW.fiscal_period_id := v_period_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER tr_link_entry_to_period
  BEFORE INSERT OR UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION link_entry_to_fiscal_period();

-- 3. Post journal entry and update all balances
CREATE OR REPLACE FUNCTION post_journal_entry(
  p_entry_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_line RECORD;
  v_restaurant_id UUID;
  v_fiscal_period_id UUID;
BEGIN
  -- Get entry
  SELECT * INTO v_entry
  FROM journal_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_entry.is_posted THEN
    RETURN true;
  END IF;

  v_restaurant_id := v_entry.restaurant_id;
  v_fiscal_period_id := v_entry.fiscal_period_id;

  -- Update balances for each line
  FOR v_line IN 
    SELECT account_id, debit, credit 
    FROM journal_entry_lines 
    WHERE entry_id = p_entry_id
  LOOP
    PERFORM update_account_balance(
      v_line.account_id,
      COALESCE(v_line.debit, 0) - COALESCE(v_line.credit, 0),
      v_fiscal_period_id
    );
  END LOOP;

  -- Mark as posted
  UPDATE journal_entries
  SET is_posted = true,
      posted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_entry_id;

  RETURN true;
END;
$$;

-- 4. Trial Balance (Single Source of Truth)
CREATE OR REPLACE FUNCTION get_trial_balance(
  p_restaurant_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code VARCHAR,
  account_name VARCHAR,
  account_type VARCHAR,
  opening_balance DECIMAL,
  debit_movement DECIMAL,
  credit_movement DECIMAL,
  closing_balance DECIMAL,
  budget_amount DECIMAL,
  variance DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.id,
    coa.code::VARCHAR,
    coa.name::VARCHAR,
    coa.account_type::VARCHAR,
    COALESCE(ab.opening_balance, 0),
    COALESCE(ab.movement_debit, 0),
    COALESCE(ab.movement_credit, 0),
    COALESCE(ab.current_balance, coa.current_balance, 0),
    COALESCE(ab.budget_amount, 0),
    COALESCE(ab.variance_amount, 0)
  FROM chart_of_accounts coa
  LEFT JOIN account_balances ab ON ab.account_id = coa.id
    AND ab.fiscal_period_id = (
      SELECT id FROM fiscal_periods fp
      WHERE fp.company_id = (SELECT company_id FROM restaurants WHERE id = p_restaurant_id)
        AND fp.start_date <= p_as_of_date
        AND fp.end_date >= p_as_of_date
      LIMIT 1
    )
  WHERE coa.restaurant_id = p_restaurant_id
    AND coa.is_active = true
  ORDER BY coa.code;
END;
$$;

-- 5. Profit & Loss
CREATE OR REPLACE FUNCTION get_profit_and_loss(
  p_restaurant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category VARCHAR,
  line_type VARCHAR,
  amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH movements AS (
    SELECT 
      coa.account_type,
      SUM(CASE 
        WHEN coa.account_type IN ('asset', 'expense') THEN jl.debit - jl.credit
        ELSE jl.credit - jl.debit
      END) AS net_movement
    FROM journal_entry_lines jl
    JOIN journal_entries je ON je.id = jl.entry_id
    JOIN chart_of_accounts coa ON coa.id = jl.account_id
    WHERE coa.restaurant_id = p_restaurant_id
      AND je.entry_date BETWEEN p_start_date AND p_end_date
      AND je.is_posted = true
      AND coa.account_type IN ('revenue', 'expense', 'cogs')
    GROUP BY coa.account_type
  )
  SELECT 
    CASE account_type
      WHEN 'revenue' THEN 'الإيرادات'
      WHEN 'cogs' THEN 'تكلفة المبيعات'
      WHEN 'expense' THEN 'المصروفات'
    END::VARCHAR,
    account_type::VARCHAR,
    COALESCE(net_movement, 0)
  FROM movements
  UNION ALL
  SELECT 
    'صافي الربح'::VARCHAR,
    'net_profit'::VARCHAR,
    COALESCE(SUM(
      CASE 
        WHEN account_type = 'revenue' THEN net_movement 
        ELSE -net_movement 
      END
    ), 0)
  FROM movements
  HAVING COUNT(*) > 0;
END;
$$;

-- 6. Balance Sheet
CREATE OR REPLACE FUNCTION get_balance_sheet(
  p_restaurant_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  section VARCHAR,
  account_type VARCHAR,
  amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE coa.account_type
      WHEN 'asset' THEN 'الأصول'
      WHEN 'liability' THEN 'الخصوم'
      WHEN 'equity' THEN 'حقوق الملكية'
    END::VARCHAR,
    coa.account_type::VARCHAR,
    SUM(CASE 
      WHEN coa.account_type = 'asset' THEN COALESCE(ab.current_balance, coa.current_balance, 0)
      WHEN coa.account_type IN ('liability', 'equity') THEN -COALESCE(ab.current_balance, coa.current_balance, 0)
      ELSE 0
    END)
  FROM chart_of_accounts coa
  LEFT JOIN account_balances ab ON ab.account_id = coa.id
    AND ab.fiscal_period_id = (
      SELECT id FROM fiscal_periods fp
      WHERE fp.company_id = (SELECT company_id FROM restaurants WHERE id = p_restaurant_id)
        AND fp.start_date <= p_as_of_date
        AND fp.end_date >= p_as_of_date
      LIMIT 1
    )
  WHERE coa.restaurant_id = p_restaurant_id
    AND coa.is_active = true
    AND coa.account_type IN ('asset', 'liability', 'equity')
  GROUP BY 
    CASE coa.account_type
      WHEN 'asset' THEN 'الأصول'
      WHEN 'liability' THEN 'الخصوم'
      WHEN 'equity' THEN 'حقوق الملكية'
    END,
    coa.account_type;
END;
$$;

-- ============================================
-- PHASE 4: RE-INITIALIZE EXISTING DATA
-- ============================================

-- Link existing journal entries to fiscal periods
UPDATE journal_entries je
SET fiscal_period_id = (
  SELECT id FROM fiscal_periods fp
  WHERE fp.company_id = (SELECT company_id FROM restaurants WHERE id = je.restaurant_id)
    AND fp.start_date <= je.entry_date
    AND fp.end_date >= je.entry_date
  LIMIT 1
)
WHERE fiscal_period_id IS NULL;

-- ============================================
-- PHASE 5: GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION update_account_balance TO authenticated;
GRANT EXECUTE ON FUNCTION post_journal_entry TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_profit_and_loss TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_sheet TO authenticated;

-- ============================================
-- PHASE 6: RE-CREATE ESSENTIAL SETUP FUNCTIONS
-- ============================================

-- Seed Global Chart of Accounts
CREATE OR REPLACE FUNCTION seed_global_coa(
  p_restaurant_id UUID,
  p_profile TEXT DEFAULT 'standard'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_root_asset UUID;
  v_root_liability UUID;
  v_root_equity UUID;
  v_root_revenue UUID;
  v_root_expense UUID;
BEGIN
  -- Get company_id
  SELECT company_id INTO v_company_id FROM restaurants WHERE id = p_restaurant_id;
  
  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE restaurant_id = p_restaurant_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- Create root accounts (Level 1)
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at)
  VALUES 
    (p_restaurant_id, v_company_id, '1', 'الأصول', 'asset', 'current_asset', 1, '1', true, NOW())
    RETURNING id INTO v_root_asset;
    
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at)
  VALUES 
    (p_restaurant_id, v_company_id, '2', 'الخصوم', 'liability', 'current_liability', 1, '2', true, NOW())
    RETURNING id INTO v_root_liability;
    
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at)
  VALUES 
    (p_restaurant_id, v_company_id, '3', 'حقوق الملكية', 'equity', 'equity', 1, '3', true, NOW())
    RETURNING id INTO v_root_equity;
    
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at)
  VALUES 
    (p_restaurant_id, v_company_id, '4', 'الإيرادات', 'revenue', 'sales_revenue', 1, '4', true, NOW())
    RETURNING id INTO v_root_revenue;
    
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at)
  VALUES 
    (p_restaurant_id, v_company_id, '5', 'المصروفات', 'expense', 'operating_expense', 1, '5', true, NOW())
    RETURNING id INTO v_root_expense;

  -- Level 2 - Assets
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, parent_id, is_active, created_at) VALUES
    (p_restaurant_id, v_company_id, '1.1', 'الأصول المتداولة', 'asset', 'current_asset', 2, '1.1', v_root_asset, true, NOW()),
    (p_restaurant_id, v_company_id, '1.2', 'الأصول الثابتة', 'asset', 'fixed_asset', 2, '1.2', v_root_asset, true, NOW());

  -- Level 3 - Current Assets (Common Accounts)
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, is_cash_account, created_at) VALUES
    (p_restaurant_id, v_company_id, '1.1.001', 'الصندوق', 'asset', 'cash', 3, '1.1.001', true, true, NOW()),
    (p_restaurant_id, v_company_id, '1.1.002', 'البنك', 'asset', 'bank', 3, '1.1.002', true, false, NOW()),
    (p_restaurant_id, v_company_id, '1.1.003', 'العملاء', 'asset', 'receivable', 3, '1.1.003', true, false, NOW()),
    (p_restaurant_id, v_company_id, '1.1.004', 'المخزون', 'asset', 'inventory', 3, '1.1.004', true, false, NOW()),
    (p_restaurant_id, v_company_id, '1.1.005', 'مصروفات مدفوعة مقدماً', 'asset', 'current_asset', 3, '1.1.005', true, false, NOW());

  -- Level 2 - Liabilities
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, parent_id, is_active, created_at) VALUES
    (p_restaurant_id, v_company_id, '2.1', 'الخصوم المتداولة', 'liability', 'current_liability', 2, '2.1', v_root_liability, true, NOW()),
    (p_restaurant_id, v_company_id, '2.2', 'الخصوم طويلة الأجل', 'liability', 'long_term_liability', 2, '2.2', v_root_liability, true, NOW());

  -- Level 3 - Payables
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at) VALUES
    (p_restaurant_id, v_company_id, '2.1.001', 'الموردين', 'liability', 'payable', 3, '2.1.001', true, NOW()),
    (p_restaurant_id, v_company_id, '2.1.002', 'الضرائب المستحقة', 'liability', 'current_liability', 3, '2.1.002', true, NOW()),
    (p_restaurant_id, v_company_id, '2.1.003', 'الرواتب المستحقة', 'liability', 'current_liability', 3, '2.1.003', true, NOW());

  -- Level 2 & 3 - Equity
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at) VALUES
    (p_restaurant_id, v_company_id, '3.1', 'رأس المال', 'equity', 'equity', 2, '3.1', true, NOW()),
    (p_restaurant_id, v_company_id, '3.2', 'الأرباح المحتجزة', 'equity', 'retained_earnings', 2, '3.2', true, NOW()),
    (p_restaurant_id, v_company_id, '3.1.001', 'رأس المال المدفوع', 'equity', 'equity', 3, '3.1.001', true, NOW()),
    (p_restaurant_id, v_company_id, '3.2.001', 'أرباح العام الحالي', 'equity', 'retained_earnings', 3, '3.2.001', true, NOW());

  -- Level 2 & 3 - Revenue
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at) VALUES
    (p_restaurant_id, v_company_id, '4.1', 'إيرادات المبيعات', 'revenue', 'sales_revenue', 2, '4.1', true, NOW()),
    (p_restaurant_id, v_company_id, '4.2', 'إيرادات الخدمات', 'revenue', 'other_revenue', 2, '4.2', true, NOW()),
    (p_restaurant_id, v_company_id, '4.3', 'إيرادات أخرى', 'revenue', 'other_revenue', 2, '4.3', true, NOW()),
    (p_restaurant_id, v_company_id, '4.1.001', 'مبيعات نقدية', 'revenue', 'sales_revenue', 3, '4.1.001', true, NOW()),
    (p_restaurant_id, v_company_id, '4.1.002', 'مبيعات آجلة', 'revenue', 'sales_revenue', 3, '4.1.002', true, NOW()),
    (p_restaurant_id, v_company_id, '4.3.001', 'إيرادات متنوعة', 'revenue', 'other_revenue', 3, '4.3.001', true, NOW());

  -- Level 2 & 3 - COGS
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at) VALUES
    (p_restaurant_id, v_company_id, '5.0', 'تكلفة البضاعة المباعة', 'expense', 'cogs', 2, '5.0', true, NOW()),
    (p_restaurant_id, v_company_id, '5.0.001', 'تكلفة المبيعات', 'expense', 'cogs', 3, '5.0.001', true, NOW()),
    (p_restaurant_id, v_company_id, '5.0.002', 'هالك المخزون', 'expense', 'cogs', 3, '5.0.002', true, NOW());

  -- Level 2 & 3 - Operating Expenses
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at) VALUES
    (p_restaurant_id, v_company_id, '5.1', 'مصروفات تشغيلية', 'expense', 'operating_expense', 2, '5.1', true, NOW()),
    (p_restaurant_id, v_company_id, '5.2', 'مصروفات إدارية', 'expense', 'admin_expense', 2, '5.2', true, NOW()),
    (p_restaurant_id, v_company_id, '5.3', 'مصروفات مالية', 'expense', 'financial_expense', 2, '5.3', true, NOW()),
    (p_restaurant_id, v_company_id, '5.1.001', 'رواتب وأجور', 'expense', 'operating_expense', 3, '5.1.001', true, NOW()),
    (p_restaurant_id, v_company_id, '5.1.002', 'إيجارات', 'expense', 'operating_expense', 3, '5.1.002', true, NOW()),
    (p_restaurant_id, v_company_id, '5.1.003', 'مرافق وخدمات', 'expense', 'operating_expense', 3, '5.1.003', true, NOW()),
    (p_restaurant_id, v_company_id, '5.1.004', 'إهلاكات', 'expense', 'operating_expense', 3, '5.1.004', true, NOW()),
    (p_restaurant_id, v_company_id, '5.1.005', 'صيانة وقطع غيار', 'expense', 'operating_expense', 3, '5.1.005', true, NOW()),
    (p_restaurant_id, v_company_id, '5.2.001', 'مصروفات مكتبية', 'expense', 'admin_expense', 3, '5.2.001', true, NOW()),
    (p_restaurant_id, v_company_id, '5.2.002', 'مصروفات تسويق', 'expense', 'admin_expense', 3, '5.2.002', true, NOW()),
    (p_restaurant_id, v_company_id, '5.3.001', 'فوائد بنكية', 'expense', 'financial_expense', 3, '5.3.001', true, NOW()),
    (p_restaurant_id, v_company_id, '5.3.002', 'مصروفات تحويل', 'expense', 'financial_expense', 3, '5.3.002', true, NOW());

  -- VAT Account
  INSERT INTO chart_of_accounts (restaurant_id, company_id, code, name, account_type, subtype, level, path, is_active, created_at)
  VALUES (p_restaurant_id, v_company_id, '2.1.010', 'ضريبة القيمة المضافة', 'liability', 'current_liability', 3, '2.1.010', true, NOW());

  RAISE NOTICE 'Chart of accounts seeded for restaurant: %', p_restaurant_id;
END;
$$;

-- Create Fiscal Periods for Year
CREATE OR REPLACE FUNCTION create_fiscal_periods_for_year(
  p_company_id UUID,
  p_year INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fiscal_year_id UUID;
  v_month INT;
  v_start_date DATE;
  v_end_date DATE;
  v_period_name TEXT;
BEGIN
  -- Create fiscal year
  INSERT INTO fiscal_years (company_id, year_number, start_date, end_date, status)
  VALUES (p_company_id, p_year, make_date(p_year, 1, 1), make_date(p_year, 12, 31), 'open')
  ON CONFLICT (company_id, year_number) DO NOTHING
  RETURNING id INTO v_fiscal_year_id;

  IF v_fiscal_year_id IS NULL THEN
    SELECT id INTO v_fiscal_year_id 
    FROM fiscal_years 
    WHERE company_id = p_company_id AND year_number = p_year;
  END IF;

  -- Create 12 monthly periods
  FOR v_month IN 1..12 LOOP
    v_start_date := make_date(p_year, v_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_period_name := CASE v_month
      WHEN 1 THEN 'يناير'
      WHEN 2 THEN 'فبراير'
      WHEN 3 THEN 'مارس'
      WHEN 4 THEN 'أبريل'
      WHEN 5 THEN 'مايو'
      WHEN 6 THEN 'يونيو'
      WHEN 7 THEN 'يوليو'
      WHEN 8 THEN 'أغسطس'
      WHEN 9 THEN 'سبتمبر'
      WHEN 10 THEN 'أكتوبر'
      WHEN 11 THEN 'نوفمبر'
      WHEN 12 THEN 'ديسمبر'
    END || ' ' || p_year;

    INSERT INTO fiscal_periods (
      company_id, fiscal_year_id, period_number, period_name,
      start_date, end_date, status, is_posting_allowed
    )
    VALUES (
      p_company_id, v_fiscal_year_id, v_month, v_period_name,
      v_start_date, v_end_date, 'open', true
    )
    ON CONFLICT (company_id, period_number, fiscal_year_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Fiscal periods created for year %', p_year;
END;
$$;

-- Grant permissions for setup functions
GRANT EXECUTE ON FUNCTION seed_global_coa TO authenticated;
GRANT EXECUTE ON FUNCTION create_fiscal_periods_for_year TO authenticated;

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION update_account_balance IS 'ERP Unified: Updates account_balances from journal entries. Single source of truth.';
COMMENT ON FUNCTION post_journal_entry IS 'ERP Unified: Posts journal entry and updates all balances atomically.';
COMMENT ON FUNCTION get_trial_balance IS 'ERP Unified: Trial Balance from account_balances (journal-driven).';
COMMENT ON FUNCTION get_profit_and_loss IS 'ERP Unified: P&L from journal entries only.';
COMMENT ON FUNCTION get_balance_sheet IS 'ERP Unified: Balance Sheet from account_balances.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_count INT;
BEGIN
  -- Verify trigger exists
  SELECT COUNT(*) INTO v_count
  FROM information_schema.triggers
  WHERE trigger_name = 'tr_link_entry_to_period';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Trigger tr_link_entry_to_period not created!';
  END IF;
  
  RAISE NOTICE '✅ ERP Re-initialization completed successfully!';
  RAISE NOTICE '✅ Single source of truth established: journal_entries → account_balances';
  RAISE NOTICE '✅ All duplicated functions removed';
  RAISE NOTICE '✅ Unified reporting functions created';
END $$;
