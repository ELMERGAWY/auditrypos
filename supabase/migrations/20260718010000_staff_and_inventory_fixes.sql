-- ============================================================
-- FIX: Staff Access Approvals, Multi-Company RLS & Inventory Transfer Sync
-- ============================================================

BEGIN;

-- 1. Auto-create companies for new restaurants + membership
CREATE OR REPLACE FUNCTION public.tg_auto_create_restaurant_company()
RETURNS TRIGGER
AS $$
DECLARE
  v_company_id UUID;
  v_company_name TEXT;
BEGIN
  -- If company_id is already provided, ensure owner is a member
  IF NEW.company_id IS NOT NULL THEN
    INSERT INTO public.company_users (company_id, user_id, role, is_active)
    VALUES (NEW.company_id, NEW.owner_id, 'owner', true)
    ON CONFLICT (company_id, user_id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Check if owner already has a company
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE primary_owner_id = NEW.owner_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    -- Get owner's name for company name
    v_company_name := COALESCE((
      SELECT NULLIF(TRIM(p.full_name), '')
      FROM public.profiles p
      WHERE p.user_id = NEW.owner_id
      LIMIT 1
    ), NEW.name || ' Company');

    INSERT INTO public.companies (primary_owner_id, name)
    VALUES (NEW.owner_id, v_company_name)
    ON CONFLICT (primary_owner_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_company_id;
  END IF;

  -- Ensure owner membership
  INSERT INTO public.company_users (company_id, user_id, role, is_active)
  VALUES (v_company_id, NEW.owner_id, 'owner', true)
  ON CONFLICT (company_id, user_id) DO NOTHING;

  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_restaurant_company ON public.restaurants;
CREATE TRIGGER trg_auto_create_restaurant_company
BEFORE INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.tg_auto_create_restaurant_company();


-- 2. Backfill existing restaurants that still have company_id IS NULL
DO $$
DECLARE
  r RECORD;
  v_company_id UUID;
  v_company_name TEXT;
BEGIN
  FOR r IN SELECT id, owner_id, name FROM public.restaurants WHERE company_id IS NULL LOOP
    SELECT id INTO v_company_id FROM public.companies WHERE primary_owner_id = r.owner_id LIMIT 1;
    
    IF v_company_id IS NULL THEN
      v_company_name := COALESCE((
        SELECT NULLIF(TRIM(p.full_name), '')
        FROM public.profiles p
        WHERE p.user_id = r.owner_id
        LIMIT 1
      ), r.name || ' Company');

      INSERT INTO public.companies (primary_owner_id, name)
      VALUES (r.owner_id, v_company_name)
      ON CONFLICT (primary_owner_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO v_company_id;
    END IF;

    INSERT INTO public.company_users (company_id, user_id, role, is_active)
    VALUES (v_company_id, r.owner_id, 'owner', true)
    ON CONFLICT (company_id, user_id) DO NOTHING;

    UPDATE public.restaurants SET company_id = v_company_id WHERE id = r.id;
  END LOOP;
END $$;


-- 3. Super Admin RLS Policies for companies & company_users
DROP POLICY IF EXISTS super_admin_read_all_companies ON public.companies;
CREATE POLICY super_admin_read_all_companies ON public.companies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS super_admin_all_companies ON public.companies;
CREATE POLICY super_admin_all_companies ON public.companies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS super_admin_all_company_users ON public.company_users;
CREATE POLICY super_admin_all_company_users ON public.company_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );


-- 4. Trigger on inventory_movements to auto-sync inventory_balances
CREATE OR REPLACE FUNCTION public.tg_sync_inventory_balances_from_movements()
RETURNS TRIGGER
AS $$
DECLARE
  v_item_id UUID;
  v_sub_wh_id UUID;
  v_qty NUMERIC;
  v_sign INT;
  v_balance RECORD;
  v_unit_cost NUMERIC;
  v_avg_cost NUMERIC;
  v_total_value NUMERIC;
BEGIN
  -- Resolve item_id / product_id
  v_item_id := COALESCE(NEW.product_id, NEW.item_id);
  
  -- Resolve sub_warehouse_id / warehouse_id
  v_sub_wh_id := COALESCE(NEW.sub_warehouse_id, NEW.warehouse_id);

  IF v_item_id IS NULL OR v_sub_wh_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_qty := COALESCE(NEW.quantity, 0);
  v_unit_cost := COALESCE(NEW.unit_cost, 0);

  -- Determine if we add or subtract stock
  IF NEW.movement_type IN ('IN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN', 'PRODUCTION_IN') THEN
    v_sign := 1;
  ELSIF NEW.movement_type IN ('OUT', 'TRANSFER_OUT', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'PRODUCTION_OUT', 'LOSS', 'VOICE') THEN
    v_sign := -1;
  ELSE
    -- Unknown movement type, do nothing
    RETURN NEW;
  END IF;

  -- Upsert inventory_balances
  SELECT * INTO v_balance 
  FROM public.inventory_balances
  WHERE item_id = v_item_id AND sub_warehouse_id = v_sub_wh_id;

  IF NOT FOUND THEN
    INSERT INTO public.inventory_balances (
      item_id,
      sub_warehouse_id,
      quantity_on_hand,
      quantity_allocated,
      quantity_available,
      quantity_incoming,
      quantity_reserved,
      unit_cost,
      average_cost,
      last_purchase_cost,
      total_value,
      valuation_method,
      accounting_standard,
      inventory_valuation_rule,
      updated_at
    ) VALUES (
      v_item_id,
      v_sub_wh_id,
      GREATEST(0, v_sign * v_qty),
      0,
      GREATEST(0, v_sign * v_qty),
      0,
      0,
      v_unit_cost,
      v_unit_cost,
      v_unit_cost,
      GREATEST(0, v_sign * v_qty * v_unit_cost),
      'AVERAGE',
      NEW.accounting_standard,
      'IAS2_AVERAGE',
      NOW()
    );
  ELSE
    -- Calculate new quantity on hand & available
    v_qty := v_balance.quantity_on_hand + (v_sign * v_qty);
    v_total_value := v_balance.total_value + (v_sign * NEW.quantity * v_unit_cost);
    IF v_qty > 0 THEN
      v_avg_cost := v_total_value / v_qty;
    ELSE
      v_avg_cost := v_unit_cost;
    END IF;

    UPDATE public.inventory_balances
    SET quantity_on_hand = GREATEST(0, v_qty),
        quantity_available = GREATEST(0, v_balance.quantity_available + (v_sign * NEW.quantity)),
        unit_cost = v_unit_cost,
        average_cost = v_avg_cost,
        total_value = GREATEST(0, v_total_value),
        updated_at = NOW()
    WHERE id = v_balance.id;
  END IF;

  -- Also update public.products.quantity to keep total business quantity in sync if needed!
  -- But only if the movement is not a transfer (since transfer is net-zero for the restaurant).
  IF NEW.movement_type NOT IN ('TRANSFER_IN', 'TRANSFER_OUT') THEN
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) + (v_sign * NEW.quantity),
        updated_at = NOW()
    WHERE id = v_item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_inventory_balances_from_movements ON public.inventory_movements;
CREATE TRIGGER trg_sync_inventory_balances_from_movements
AFTER INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.tg_sync_inventory_balances_from_movements();

COMMIT;
