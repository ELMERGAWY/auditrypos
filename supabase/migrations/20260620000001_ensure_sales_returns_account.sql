-- ============================================================
-- ENSURE SALES RETURNS ACCOUNT EXISTS FOR ALL RESTAURANTS
-- ============================================================
-- This migration ensures that the sales returns account (4020)
-- exists for all restaurants to prevent errors when processing sales returns.

BEGIN;

-- 1. Ensure get_sales_returns_account function exists and is robust
CREATE OR REPLACE FUNCTION public.get_sales_returns_account(p_restaurant_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public._get_or_create_account(
    p_restaurant_id, '4020', 'مردودات المبيعات',
    'revenue', 'sales_returns', 'sales_returns', 'debit', FALSE, FALSE
  );
END; $$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_sales_returns_account TO authenticated;

-- 3. Create sales returns account for all existing restaurants
DO $$
DECLARE
  v_restaurant RECORD;
  v_account_id UUID;
BEGIN
  FOR v_restaurant IN SELECT id FROM public.restaurants LOOP
    -- Try to get or create the account
    SELECT public.get_sales_returns_account(v_restaurant.id) INTO v_account_id;
    
    IF v_account_id IS NOT NULL THEN
      RAISE NOTICE '✅ Sales returns account ensured for restaurant %', v_restaurant.id;
    END IF;
  END LOOP;
END;
$$;

COMMIT;
