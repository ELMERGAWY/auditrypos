-- ============================================================
-- Customer Warning Functions
-- Creates functions for managing customer warnings
-- ============================================================

BEGIN;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.add_customer_warning CASCADE;
DROP FUNCTION IF EXISTS public.remove_customer_warning CASCADE;

-- Create add_customer_warning function
CREATE FUNCTION public.add_customer_warning(p_customer_id UUID, p_reason TEXT DEFAULT NULL, p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_flags INTEGER;
  v_new_flags INTEGER;
  v_restaurant_id UUID;
BEGIN
  SELECT warning_flags, restaurant_id INTO v_current_flags, v_restaurant_id 
  FROM public.customers 
  WHERE id = p_customer_id;
  
  IF v_current_flags IS NULL THEN
    v_current_flags := 0;
  END IF;
  
  v_new_flags := LEAST(v_current_flags + 1, 4);
  
  UPDATE public.customers 
  SET warning_flags = v_new_flags,
      risk_level = CASE 
        WHEN v_new_flags >= 3 THEN 'high'
        WHEN v_new_flags >= 2 THEN 'medium'
        ELSE 'normal'
      END
  WHERE id = p_customer_id;
  
  -- Record history
  INSERT INTO public.customer_warning_history (
    restaurant_id, customer_id, user_id, action, 
    warning_count_before, warning_count_after, reason
  ) VALUES (
    v_restaurant_id, p_customer_id, p_user_id, 'add',
    v_current_flags, v_new_flags, p_reason
  );
  
  RETURN v_new_flags;
END;
$$;

-- Create remove_customer_warning function
CREATE FUNCTION public.remove_customer_warning(p_customer_id UUID, p_reason TEXT DEFAULT NULL, p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_flags INTEGER;
  v_new_flags INTEGER;
  v_restaurant_id UUID;
BEGIN
  SELECT warning_flags, restaurant_id INTO v_current_flags, v_restaurant_id 
  FROM public.customers 
  WHERE id = p_customer_id;
  
  IF v_current_flags IS NULL OR v_current_flags = 0 THEN
    RETURN 0;
  END IF;
  
  v_new_flags := GREATEST(v_current_flags - 1, 0);
  
  UPDATE public.customers 
  SET warning_flags = v_new_flags,
      risk_level = CASE 
        WHEN v_new_flags >= 3 THEN 'high'
        WHEN v_new_flags >= 2 THEN 'medium'
        ELSE 'normal'
      END
  WHERE id = p_customer_id;
  
  -- Record history
  INSERT INTO public.customer_warning_history (
    restaurant_id, customer_id, user_id, action, 
    warning_count_before, warning_count_after, reason
  ) VALUES (
    v_restaurant_id, p_customer_id, p_user_id, 'remove',
    v_current_flags, v_new_flags, p_reason
  );
  
  RETURN v_new_flags;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_customer_warning TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_customer_warning TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Customer warning functions created';
END $$;
