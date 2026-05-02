-- ============================================================
-- ACCOUNTING RPC FUNCTIONS
-- Add missing RPC functions for unified ERP accounting layer
-- ============================================================

-- Drop existing functions first (to handle signature changes)
DROP FUNCTION IF EXISTS post_journal_entry(UUID);
DROP FUNCTION IF EXISTS update_account_balance(UUID, DECIMAL, UUID);
DROP FUNCTION IF EXISTS get_trial_balance(UUID, DATE);
DROP FUNCTION IF EXISTS get_profit_and_loss(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_balance_sheet(UUID, DATE);
DROP TRIGGER IF EXISTS tr_link_entry_to_period ON journal_entries;
DROP FUNCTION IF EXISTS link_entry_to_fiscal_period();

-- 1. Function: Update Account Balance
-- Updates account_balances table when journal entries are posted
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
BEGIN
  -- Get restaurant_id from account
  SELECT restaurant_id INTO v_restaurant_id
  FROM chart_of_accounts
  WHERE id = p_account_id;

  -- If no fiscal period provided, get current open period
  IF p_fiscal_period_id IS NULL THEN
    SELECT id INTO v_period_id
    FROM fiscal_periods
    WHERE company_id = (SELECT company_id FROM restaurants WHERE id = v_restaurant_id)
      AND status = 'open'
      AND is_posting_allowed = true
    ORDER BY start_date DESC
    LIMIT 1;
  ELSE
    v_period_id := p_fiscal_period_id;
  END IF;

  -- Insert or update account balance
  INSERT INTO account_balances (
    account_id,
    fiscal_period_id,
    restaurant_id,
    current_balance,
    movement_debit,
    movement_credit,
    total_debit,
    total_credit
  )
  VALUES (
    p_account_id,
    v_period_id,
    v_restaurant_id,
    p_amount,
    CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
    CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END,
    CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
    CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END
  )
  ON CONFLICT (account_id, fiscal_period_id)
  DO UPDATE SET
    current_balance = account_balances.current_balance + p_amount,
    movement_debit = account_balances.movement_debit + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
    movement_credit = account_balances.movement_credit + CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END,
    total_debit = account_balances.total_debit + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
    total_credit = account_balances.total_credit + CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END,
    last_updated_at = NOW();

  -- Also update chart_of_accounts current_balance
  UPDATE chart_of_accounts
  SET current_balance = current_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_account_id;
END;
$$;

-- 2. Function: Get Trial Balance
-- Returns trial balance for a specific date/period
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
  closing_balance DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.id AS account_id,
    coa.code AS account_code,
    coa.name AS account_name,
    coa.account_type,
    COALESCE(ab.opening_balance, 0) AS opening_balance,
    COALESCE(ab.movement_debit, 0) AS debit_movement,
    COALESCE(ab.movement_credit, 0) AS credit_movement,
    COALESCE(ab.current_balance, coa.current_balance, 0) AS closing_balance
  FROM chart_of_accounts coa
  LEFT JOIN account_balances ab ON ab.account_id = coa.id
    AND ab.fiscal_period_id = (
      SELECT id FROM fiscal_periods 
      WHERE company_id = (SELECT company_id FROM restaurants WHERE id = p_restaurant_id)
        AND start_date <= p_as_of_date
        AND end_date >= p_as_of_date
      LIMIT 1
    )
  WHERE coa.restaurant_id = p_restaurant_id
    AND coa.is_active = true
  ORDER BY coa.code;
END;
$$;

-- 3. Function: Get Profit and Loss
-- Returns P&L report data
CREATE OR REPLACE FUNCTION get_profit_and_loss(
  p_restaurant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category VARCHAR,
  account_type VARCHAR,
  amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH period_movements AS (
    SELECT 
      coa.account_type,
      SUM(CASE 
        WHEN coa.account_type IN ('asset', 'expense', 'cogs') THEN jl.debit - jl.credit
        ELSE jl.credit - jl.debit
      END) AS net_amount
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
    CASE 
      WHEN account_type = 'revenue' THEN 'الإيرادات'
      WHEN account_type = 'cogs' THEN 'تكلفة المبيعات'
      WHEN account_type = 'expense' THEN 'المصروفات'
    END::VARCHAR AS category,
    account_type::VARCHAR,
    COALESCE(net_amount, 0) AS amount
  FROM period_movements
  UNION ALL
  SELECT 
    'صافي الربح' AS category,
    'net_profit' AS account_type,
    COALESCE(SUM(CASE WHEN account_type = 'revenue' THEN net_amount ELSE -net_amount END), 0) AS amount
  FROM period_movements
  HAVING COUNT(*) > 0;
END;
$$;

-- 4. Function: Get Balance Sheet
-- Returns balance sheet data
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
    CASE 
      WHEN coa.account_type = 'asset' THEN 'الأصول'
      WHEN coa.account_type = 'liability' THEN 'الخصوم'
      WHEN coa.account_type = 'equity' THEN 'حقوق الملكية'
    END::VARCHAR AS section,
    coa.account_type::VARCHAR,
    SUM(CASE 
      WHEN coa.account_type = 'asset' THEN COALESCE(ab.current_balance, coa.current_balance, 0)
      ELSE -COALESCE(ab.current_balance, coa.current_balance, 0)
    END) AS amount
  FROM chart_of_accounts coa
  LEFT JOIN account_balances ab ON ab.account_id = coa.id
  WHERE coa.restaurant_id = p_restaurant_id
    AND coa.is_active = true
    AND coa.account_type IN ('asset', 'liability', 'equity')
  GROUP BY 
    CASE 
      WHEN coa.account_type = 'asset' THEN 'الأصول'
      WHEN coa.account_type = 'liability' THEN 'الخصوم'
      WHEN coa.account_type = 'equity' THEN 'حقوق الملكية'
    END,
    coa.account_type;
END;
$$;

-- 5. Function: Link Journal Entry to Fiscal Period
-- Automatically assigns fiscal period to journal entries
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
  LIMIT 1;

  -- Update fiscal_period_id
  IF v_period_id IS NOT NULL THEN
    NEW.fiscal_period_id := v_period_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS tr_link_entry_to_period ON journal_entries;
CREATE TRIGGER tr_link_entry_to_period
  BEFORE INSERT OR UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION link_entry_to_fiscal_period();

-- 6. Function: Post Journal Entry
-- Posts entry and updates all balances
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
BEGIN
  -- Get entry details
  SELECT * INTO v_entry
  FROM journal_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_entry.is_posted THEN
    RETURN true; -- Already posted
  END IF;

  v_restaurant_id := v_entry.restaurant_id;

  -- Update account balances for each line
  FOR v_line IN 
    SELECT * FROM journal_entry_lines 
    WHERE entry_id = p_entry_id
  LOOP
    PERFORM update_account_balance(
      v_line.account_id,
      v_line.debit - v_line.credit,
      v_entry.fiscal_period_id
    );
  END LOOP;

  -- Mark entry as posted
  UPDATE journal_entries
  SET is_posted = true,
      posted_at = NOW()
  WHERE id = p_entry_id;

  RETURN true;
END;
$$;

-- 7. Add fiscal_period_id to journal_entries if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'journal_entries' 
    AND column_name = 'fiscal_period_id'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN fiscal_period_id UUID REFERENCES fiscal_periods(id);
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_account_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_profit_and_loss TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_sheet TO authenticated;
GRANT EXECUTE ON FUNCTION post_journal_entry TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_account_balance IS 'Updates account balance when journal entries are posted';
COMMENT ON FUNCTION get_trial_balance IS 'Returns trial balance report for a restaurant';
COMMENT ON FUNCTION get_profit_and_loss IS 'Returns P&L report for date range';
COMMENT ON FUNCTION get_balance_sheet IS 'Returns balance sheet as of date';
COMMENT ON FUNCTION post_journal_entry IS 'Posts journal entry and updates all balances';
