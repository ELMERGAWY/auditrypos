-- ============================================================
-- Customer Classification System
-- Adds risk level, warning flags, and VIP status to customers
-- ============================================================

BEGIN;

-- 1. Add classification columns to customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'normal' CHECK (risk_level IN ('normal', 'medium', 'high', 'blocked')),
  ADD COLUMN IF NOT EXISTS warning_flags INTEGER DEFAULT 0 CHECK (warning_flags >= 0 AND warning_flags <= 4),
  ADD COLUMN IF NOT EXISTS vip_status BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create index for faster customer lookup by name and phone
CREATE INDEX IF NOT EXISTS idx_customers_name_phone 
  ON public.customers (restaurant_id, name, phone);

-- 3. Create function to check if customer should be blocked
CREATE OR REPLACE FUNCTION public.is_customer_blocked(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.customers 
    WHERE id = p_customer_id AND risk_level = 'blocked'
  );
END;
$$;

-- 4. Create function to add warning flag to customer
CREATE OR REPLACE FUNCTION public.add_customer_warning(p_customer_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_flags INTEGER;
  v_new_flags INTEGER;
BEGIN
  SELECT warning_flags INTO v_current_flags 
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
  
  RETURN v_new_flags;
END;
$$;

-- 5. Create function to remove warning flag from customer
CREATE OR REPLACE FUNCTION public.remove_customer_warning(p_customer_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_flags INTEGER;
  v_new_flags INTEGER;
BEGIN
  SELECT warning_flags INTO v_current_flags 
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
  
  RETURN v_new_flags;
END;
$$;

-- 6. Create table for warning history
CREATE TABLE IF NOT EXISTS public.customer_warning_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('add', 'remove')),
  warning_count_before INTEGER,
  warning_count_after INTEGER,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create index for warning history
CREATE INDEX IF NOT EXISTS idx_warning_history_customer 
  ON public.customer_warning_history (customer_id, created_at DESC);

-- 8. Functions will be created separately to avoid conflicts

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_customer_blocked TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_customer_warning TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_customer_warning TO authenticated;

-- 11. Grant table permissions
GRANT SELECT, INSERT ON public.customer_warning_history TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Customer classification system added: risk_level, warning_flags, vip_status';
END $$;
