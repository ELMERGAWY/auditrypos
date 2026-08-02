-- ============================================================
-- ADD DEPRECIATION HISTORY TABLE FOR FIXED ASSETS
-- ============================================================

BEGIN;

-- 1. Add depreciation history table
CREATE TABLE IF NOT EXISTS public.asset_depreciation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.fixed_assets(id) ON DELETE CASCADE NOT NULL,
  depreciation_date DATE NOT NULL,
  depreciation_amount DECIMAL(15,2) NOT NULL,
  accumulated_depreciation_before DECIMAL(15,2) NOT NULL,
  accumulated_depreciation_after DECIMAL(15,2) NOT NULL,
  book_value_before DECIMAL(15,2) NOT NULL,
  book_value_after DECIMAL(15,2) NOT NULL,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_history_asset_id ON public.asset_depreciation_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_history_restaurant_id ON public.asset_depreciation_history(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_history_date ON public.asset_depreciation_history(depreciation_date);

-- 3. Add RLS policies
ALTER TABLE public.asset_depreciation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_asset_depreciation_history" 
ON public.asset_depreciation_history 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- 4. Add function to record depreciation with journal entry
CREATE OR REPLACE FUNCTION public.record_asset_depreciation(
  p_asset_id UUID,
  p_restaurant_id UUID,
  p_depreciation_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_asset RECORD;
  v_depreciation_amount DECIMAL(15,2);
  v_new_accumulated_depreciation DECIMAL(15,2);
  v_new_book_value DECIMAL(15,2);
  v_journal_entry_id UUID;
  v_depreciation_history_id UUID;
  v_asset_account_id UUID;
  v_depreciation_account_id UUID;
BEGIN
  -- Get asset details
  SELECT * INTO v_asset
  FROM public.fixed_assets
  WHERE id = p_asset_id AND restaurant_id = p_restaurant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  
  -- Calculate depreciation amount
  IF v_asset.depreciation_method = 'straight_line' THEN
    v_depreciation_amount := (v_asset.purchase_value - v_asset.salvage_value) / v_asset.useful_life_years;
  ELSE
    -- Double declining balance
    v_depreciation_amount := (v_asset.current_value * 2.0 / v_asset.useful_life_years);
  END IF;
  
  -- Don't depreciate below salvage value
  IF (v_asset.accumulated_depreciation + v_depreciation_amount) > (v_asset.purchase_value - v_asset.salvage_value) THEN
    v_depreciation_amount := (v_asset.purchase_value - v_asset.salvage_value) - v_asset.accumulated_depreciation;
  END IF;
  
  -- Stop if fully depreciated
  IF v_depreciation_amount <= 0 THEN
    RAISE NOTICE 'Asset is already fully depreciated';
    RETURN NULL;
  END IF;
  
  -- Calculate new values
  v_new_accumulated_depreciation := v_asset.accumulated_depreciation + v_depreciation_amount;
  v_new_book_value := v_asset.current_value - v_depreciation_amount;
  
  -- Update asset
  UPDATE public.fixed_assets
  SET 
    accumulated_depreciation = v_new_accumulated_depreciation,
    current_value = v_new_book_value,
    status = CASE 
      WHEN v_new_accumulated_depreciation >= (v_asset.purchase_value - v_asset.salvage_value) 
      THEN 'fully_depreciated' 
      ELSE 'active' 
    END
  WHERE id = p_asset_id;
  
  -- Record depreciation history
  INSERT INTO public.asset_depreciation_history (
    restaurant_id,
    asset_id,
    depreciation_date,
    depreciation_amount,
    accumulated_depreciation_before,
    accumulated_depreciation_after,
    book_value_before,
    book_value_after,
    notes
  ) VALUES (
    p_restaurant_id,
    p_asset_id,
    p_depreciation_date,
    v_depreciation_amount,
    v_asset.accumulated_depreciation,
    v_new_accumulated_depreciation,
    v_asset.current_value,
    v_new_book_value,
    p_notes
  ) RETURNING id INTO v_depreciation_history_id;
  
  -- Create journal entry if accounts are linked
  IF v_asset.asset_account_id IS NOT NULL AND v_asset.depreciation_account_id IS NOT NULL THEN
    -- Insert journal entry
    INSERT INTO public.journal_entries (
      restaurant_id,
      entry_date,
      reference_type,
      reference_id,
      description,
      is_posted,
      created_by
    ) VALUES (
      p_restaurant_id,
      p_depreciation_date,
      'depreciation',
      v_depreciation_history_id,
      'إهلاك: ' || v_asset.name,
      true,
      p_created_by
    ) RETURNING id INTO v_journal_entry_id;
    
    -- Insert journal entry lines
    -- Debit depreciation expense
    INSERT INTO public.journal_entry_lines (
      journal_entry_id,
      account_id,
      debit,
      credit
    ) VALUES (
      v_journal_entry_id,
      v_asset.depreciation_account_id,
      v_depreciation_amount,
      0
    );
    
    -- Credit accumulated depreciation
    INSERT INTO public.journal_entry_lines (
      journal_entry_id,
      account_id,
      debit,
      credit
    ) VALUES (
      v_journal_entry_id,
      v_asset.asset_account_id,
      0,
      v_depreciation_amount
    );
    
    -- Update history with journal entry reference
    UPDATE public.asset_depreciation_history
    SET journal_entry_id = v_journal_entry_id
    WHERE id = v_depreciation_history_id;
  END IF;
  
  RETURN v_depreciation_history_id;
END;
$$;

COMMIT;
