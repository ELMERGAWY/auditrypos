-- ============================================================
-- FIX ALL CUSTOMER BALANCES - RECALCULATE FROM TRANSACTIONS
-- COPY TO SUPABASE SQL EDITOR
-- ============================================================

BEGIN;

-- 1. First, let's check the current state
DO $$
DECLARE
  v_total_customers INT;
  v_total_transactions INT;
  v_total_balance NUMERIC;
  v_calc_balance NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_total_customers FROM public.customers;
  SELECT COUNT(*) INTO v_total_transactions FROM public.customer_transactions;
  SELECT COALESCE(SUM(COALESCE(balance, 0)), 0) INTO v_total_balance FROM public.customers;
  
  RAISE NOTICE 'Current state:';
  RAISE NOTICE 'Total customers: %', v_total_customers;
  RAISE NOTICE 'Total transactions: %', v_total_transactions;
  RAISE NOTICE 'Total balance from customers table: %', v_total_balance;
END $$;

-- 2. Create or update the function to calculate balance from transactions
CREATE OR REPLACE FUNCTION public.get_customer_balance(p_customer_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC := 0;
BEGIN
  -- Calculate balance from all transactions
  -- Positive amounts increase balance (customer owes us more)
  -- Negative amounts decrease balance (customer pays us)
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('sale', 'sales_order', 'invoice') THEN amount
      WHEN type IN ('payment', 'receipt_voucher', 'sales_return') THEN -amount
      ELSE 0
    END
  ), 0) INTO v_balance
  FROM public.customer_transactions
  WHERE customer_id = p_customer_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Create function to recalculate and update all customer balances
CREATE OR REPLACE FUNCTION public.recalculate_all_customer_balances()
RETURNS JSONB AS $$
DECLARE
  v_customer RECORD;
  v_current_balance NUMERIC;
  v_calculated_balance NUMERIC;
  v_fixed_count INT := 0;
  v_result JSONB := '{"success": true, "fixed_count": 0, "details": []}'::JSONB;
BEGIN
  FOR v_customer IN 
    SELECT id, name, COALESCE(balance, 0) as current_balance
    FROM public.customers
  LOOP
    v_current_balance := v_customer.current_balance;
    v_calculated_balance := public.get_customer_balance(v_customer.id);
    
    -- If there's a difference, update it
    IF v_current_balance != v_calculated_balance THEN
      UPDATE public.customers
      SET balance = v_calculated_balance,
          updated_at = NOW()
      WHERE id = v_customer.id;
      
      v_fixed_count := v_fixed_count + 1;
      
      -- Add to result details
      v_result := v_result || jsonb_build_object(
        'details', (v_result->'details') || jsonb_build_object(
          v_customer.id::text, jsonb_build_object(
            'name', v_customer.name,
            'old_balance', v_current_balance,
            'new_balance', v_calculated_balance,
            'difference', v_calculated_balance - v_current_balance
          )
        )
      );
    END IF;
  END LOOP;
  
  v_result := jsonb_set(v_result, ARRAY['fixed_count'], to_jsonb(v_fixed_count));
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure triggers on customer_transactions are correct
DROP TRIGGER IF EXISTS trg_customer_transaction_insert ON public.customer_transactions;
DROP TRIGGER IF EXISTS trg_customer_transaction_update ON public.customer_transactions;
DROP TRIGGER IF EXISTS trg_customer_transaction_delete ON public.customer_transactions;

CREATE TRIGGER trg_customer_transaction_insert
AFTER INSERT ON public.customer_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_balance_from_transaction();

CREATE TRIGGER trg_customer_transaction_update
AFTER UPDATE ON public.customer_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_balance_from_transaction();

CREATE TRIGGER trg_customer_transaction_delete
AFTER DELETE ON public.customer_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_balance_from_transaction();

-- 5. Recalculate all customer balances now
DO $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT public.recalculate_all_customer_balances() INTO v_result;
  
  RAISE NOTICE 'Balance recalculation result: %', v_result;
  RAISE NOTICE 'Fixed % customer balances', (v_result->>'fixed_count')::INT;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ All customer balances recalculated from transactions';
END
$$;
