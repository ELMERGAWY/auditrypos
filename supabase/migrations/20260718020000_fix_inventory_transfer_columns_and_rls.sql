-- ============================================================
-- FIX: Inventory Transfers - Add missing columns & ensure warehouse_stock RLS
-- ============================================================

BEGIN;

-- 1. Add missing columns to inventory_transfers if they don't exist
DO $$
BEGIN
  -- items JSONB column (used to store transfer items inline as fallback)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_transfers' AND column_name = 'items'
  ) THEN
    ALTER TABLE public.inventory_transfers ADD COLUMN items JSONB;
  END IF;

  -- from_sub_warehouse_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_transfers' AND column_name = 'from_sub_warehouse_id'
  ) THEN
    ALTER TABLE public.inventory_transfers ADD COLUMN from_sub_warehouse_id UUID;
  END IF;

  -- to_sub_warehouse_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_transfers' AND column_name = 'to_sub_warehouse_id'
  ) THEN
    ALTER TABLE public.inventory_transfers ADD COLUMN to_sub_warehouse_id UUID;
  END IF;
END $$;

-- 2. Add restaurant_id column to inventory_transfer_items if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_transfer_items' AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE public.inventory_transfer_items ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Ensure warehouse_stock has RLS policies for authenticated users
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouse_stock_select ON public.warehouse_stock;
CREATE POLICY warehouse_stock_select ON public.warehouse_stock
  FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS warehouse_stock_insert ON public.warehouse_stock;
CREATE POLICY warehouse_stock_insert ON public.warehouse_stock
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
    )
    OR restaurant_id IS NULL
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS warehouse_stock_update ON public.warehouse_stock;
CREATE POLICY warehouse_stock_update ON public.warehouse_stock
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
    )
    OR restaurant_id IS NULL
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- 4. Ensure inventory_transfers RLS allows inserts
DROP POLICY IF EXISTS inventory_transfers_insert ON public.inventory_transfers;
CREATE POLICY inventory_transfers_insert ON public.inventory_transfers
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
    )
    OR restaurant_id IS NULL
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS inventory_transfers_select ON public.inventory_transfers;
CREATE POLICY inventory_transfers_select ON public.inventory_transfers
  FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
    )
    OR restaurant_id IS NULL
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- 5. Ensure inventory_transfer_items RLS allows inserts
ALTER TABLE public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_transfer_items_insert ON public.inventory_transfer_items;
CREATE POLICY inventory_transfer_items_insert ON public.inventory_transfer_items
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
    )
    OR restaurant_id IS NULL
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS inventory_transfer_items_select ON public.inventory_transfer_items;
CREATE POLICY inventory_transfer_items_select ON public.inventory_transfer_items
  FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
    )
    OR restaurant_id IS NULL
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

COMMIT;
