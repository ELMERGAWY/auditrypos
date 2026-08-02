-- ============================================================
-- ODOO-STYLE DOUBLE ENTRY INVENTORY SYSTEM
-- ============================================================
-- This migration implements Odoo's Double-Entry Inventory system
-- where every stock movement is a transfer from one location to another
-- ============================================================

BEGIN;

-- 1. Create Stock Locations (Odoo-style)
-- Locations can be: warehouses, virtual locations (customers, suppliers, loss, production)
CREATE TABLE IF NOT EXISTS public.stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  code VARCHAR(50) UNIQUE,
  
  -- Location type: internal (warehouse), customer, supplier, production, loss, etc.
  location_type VARCHAR(50) NOT NULL DEFAULT 'internal',
  -- usage: internal, supplier, customer, inventory, production, transit
  usage VARCHAR(50) NOT NULL DEFAULT 'internal',
  
  -- Hierarchy support
  parent_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  path VARCHAR(1000), -- Full path like "WH/Stock/Shelf A"
  
  -- Address for physical locations
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Egypt',
  
  -- Configuration
  is_scrap_location BOOLEAN DEFAULT FALSE,
  is_return_location BOOLEAN DEFAULT FALSE,
  is_internal BOOLEAN DEFAULT TRUE,
  
  -- Link to existing warehouse for backward compatibility
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  
  -- Active status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_locations_restaurant_id ON public.stock_locations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_location_type ON public.stock_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_stock_locations_usage ON public.stock_locations(usage);
CREATE INDEX IF NOT EXISTS idx_stock_locations_parent_id ON public.stock_locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_warehouse_id ON public.stock_locations(warehouse_id);

-- Add check constraints
ALTER TABLE public.stock_locations 
ADD CONSTRAINT stock_locations_type_check 
CHECK (location_type IN ('internal', 'customer', 'supplier', 'transit', 'production', 'loss', 'inventory'));

ALTER TABLE public.stock_locations 
ADD CONSTRAINT stock_locations_usage_check 
CHECK (usage IN ('internal', 'supplier', 'customer', 'inventory', 'production', 'transit'));

-- 2. Create Stock Quants (Inventory quantities per location)
-- This replaces warehouse_stock with a more flexible system
CREATE TABLE IF NOT EXISTS public.stock_quants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE CASCADE NOT NULL,
  
  -- Quantity on hand (can be negative for backorders)
  quantity_on_hand DECIMAL(15,3) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(15,3) GENERATED ALWAYS AS (quantity_on_hand - reserved_quantity) STORED,
  
  -- Cost tracking (for FIFO/LIFO)
  unit_cost DECIMAL(15,4),
  total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity_on_hand * unit_cost) STORED,
  
  -- Batch/Lot tracking
  lot_id UUID,
  lot_name VARCHAR(100),
  expiry_date DATE,
  production_date DATE,
  
  -- Package tracking
  package_id UUID,
  package_name VARCHAR(100),
  
  -- Owner tracking (for consignment)
  owner_id UUID,
  owner_type VARCHAR(50), -- 'customer', 'supplier'
  
  -- In date (when this quant was created)
  in_date TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one quant per product/location/lot/package
  CONSTRAINT stock_quants_unique UNIQUE (product_id, location_id, lot_id, package_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_quants_restaurant_id ON public.stock_quants(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_quants_product_id ON public.stock_quants(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_quants_location_id ON public.stock_quants(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_quants_lot_id ON public.stock_quants(lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_quants_expiry_date ON public.stock_quants(expiry_date);

-- 3. Create Stock Moves (Odoo-style double entry)
-- Every move has a source location and destination location
CREATE TABLE IF NOT EXISTS public.stock_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  
  -- Reference to the move group (picking)
  picking_id UUID,
  picking_type_id UUID,
  
  -- Product and quantity
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_uom_id UUID, -- Unit of measure
  quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  quantity_done DECIMAL(15,3) NOT NULL DEFAULT 0,
  
  -- Locations (Double Entry: from -> to)
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE RESTRICT NOT NULL, -- Source
  location_dest_id UUID REFERENCES public.stock_locations(id) ON DELETE RESTRICT NOT NULL, -- Destination
  
  -- Move state
  state VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- States: draft, confirmed, assigned, done, cancel
  
  -- Additional info
  name VARCHAR(200), -- Move description
  origin VARCHAR(200), -- Reference (order number, etc.)
  reference VARCHAR(200), -- Internal reference
  
  -- Cost tracking
  price_unit DECIMAL(15,4),
  currency VARCHAR(10),
  
  -- Date tracking
  date_expected DATE,
  date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Lot/Package tracking
  lot_id UUID,
  lot_name VARCHAR(100),
  package_id UUID,
  result_package_id UUID,
  
  -- Owner tracking
  owner_id UUID,
  partner_id UUID, -- Customer or supplier
  
  -- Backorder tracking
  backorder_id UUID REFERENCES public.stock_moves(id),
  is_backorder BOOLEAN DEFAULT FALSE,
  
  -- Propagation
  propagate BOOLEAN DEFAULT TRUE,
  
  -- Additional data
  note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_moves_restaurant_id ON public.stock_moves(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product_id ON public.stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_location_id ON public.stock_moves(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_location_dest_id ON public.stock_moves(location_dest_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_picking_id ON public.stock_moves(picking_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_state ON public.stock_moves(state);
CREATE INDEX IF NOT EXISTS idx_stock_moves_date ON public.stock_moves(date);
CREATE INDEX IF NOT EXISTS idx_stock_moves_partner_id ON public.stock_moves(partner_id);

-- Add check constraints
ALTER TABLE public.stock_moves 
ADD CONSTRAINT stock_moves_state_check 
CHECK (state IN ('draft', 'confirmed', 'assigned', 'done', 'cancel'));

-- 4. Create Stock Picking (Move groups)
CREATE TABLE IF NOT EXISTS public.stock_picking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  
  -- Picking type
  picking_type_id UUID,
  picking_type_code VARCHAR(50), -- 'incoming', 'outgoing', 'internal', 'mrp'
  
  -- Reference
  name VARCHAR(200) NOT NULL, -- Picking number (auto-generated)
  origin VARCHAR(200), -- Source document (PO, SO, etc.)
  backorder_id UUID REFERENCES public.stock_picking(id),
  
  -- Locations
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE RESTRICT, -- Source
  location_dest_id UUID REFERENCES public.stock_locations(id) ON DELETE RESTRICT, -- Destination
  
  -- Partner (customer/supplier)
  partner_id UUID,
  partner_type VARCHAR(50), -- 'customer', 'supplier'
  
  -- State
  state VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- States: draft, confirmed, assigned, done, cancel
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal', -- 'not urgent', 'normal', 'urgent', 'very urgent'
  
  -- Dates
  scheduled_date DATE,
  date_done TIMESTAMPTZ,
  
  -- Additional info
  note TEXT,
  carrier_id UUID,
  carrier_tracking_ref VARCHAR(100),
  
  -- Weight and volume
  weight DECIMAL(15,3),
  volume DECIMAL(15,3),
  
  -- Printing
  printed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_picking_restaurant_id ON public.stock_picking(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_picking_picking_type_id ON public.stock_picking(picking_type_id);
CREATE INDEX IF NOT EXISTS idx_stock_picking_partner_id ON public.stock_picking(partner_id);
CREATE INDEX IF NOT EXISTS idx_stock_picking_state ON public.stock_picking(state);
CREATE INDEX IF NOT EXISTS idx_stock_picking_scheduled_date ON public.stock_picking(scheduled_date);

-- Add check constraints
ALTER TABLE public.stock_picking 
ADD CONSTRAINT stock_picking_state_check 
CHECK (state IN ('draft', 'confirmed', 'assigned', 'done', 'cancel'));

ALTER TABLE public.stock_picking 
ADD CONSTRAINT stock_picking_priority_check 
CHECK (priority IN ('not urgent', 'normal', 'urgent', 'very urgent'));

-- 5. Create Picking Types (Operation types)
CREATE TABLE IF NOT EXISTS public.stock_picking_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  code VARCHAR(50) NOT NULL, -- 'incoming', 'outgoing', 'internal', 'mrp'
  
  -- Sequence configuration
  sequence_id UUID,
  sequence_prefix VARCHAR(20),
  sequence_padding INTEGER DEFAULT 5,
  
  -- Default locations
  default_location_src_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  default_location_dest_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  
  -- Configuration
  show_entire_packs BOOLEAN DEFAULT TRUE,
  show_operations BOOLEAN DEFAULT FALSE,
  show_lots BOOLEAN DEFAULT FALSE,
  
  -- Color for UI
  color INTEGER,
  
  -- Active
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_picking_types_restaurant_id ON public.stock_picking_types(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_picking_types_code ON public.stock_picking_types(code);

-- Add check constraints
ALTER TABLE public.stock_picking_types 
ADD CONSTRAINT stock_picking_types_code_check 
CHECK (code IN ('incoming', 'outgoing', 'internal', 'mrp'));

-- 6. Create Reordering Rules (Auto-reorder system)
CREATE TABLE IF NOT EXISTS public.stock_reordering_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_tmpl_id UUID, -- For product variants
  
  -- Location
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  
  -- Reorder parameters
  min_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  max_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  quantity_multiple DECIMAL(15,3) DEFAULT 1,
  
  -- Supplier
  supplier_id UUID,
  
  -- Lead time (days)
  lead_time_days INTEGER DEFAULT 7,
  
  -- Active
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_reordering_rules_restaurant_id ON public.stock_reordering_rules(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_reordering_rules_product_id ON public.stock_reordering_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reordering_rules_warehouse_id ON public.stock_reordering_rules(warehouse_id);

-- 7. Create Stock Move Lines (Detailed move lines)
CREATE TABLE IF NOT EXISTS public.stock_move_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  
  -- Reference to move
  move_id UUID REFERENCES public.stock_moves(id) ON DELETE CASCADE NOT NULL,
  picking_id UUID REFERENCES public.stock_picking(id) ON DELETE SET NULL,
  
  -- Product
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_uom_id UUID,
  
  -- Quantity
  qty_done DECIMAL(15,3) NOT NULL DEFAULT 0,
  product_uom_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  
  -- Locations
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE RESTRICT NOT NULL,
  location_dest_id UUID REFERENCES public.stock_locations(id) ON DELETE RESTRICT NOT NULL,
  
  -- Lot/Package
  lot_id UUID,
  lot_name VARCHAR(100),
  package_id UUID,
  result_package_id UUID,
  
  -- Owner
  owner_id UUID,
  
  -- Date
  date TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stock_move_lines_restaurant_id ON public.stock_move_lines(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_move_lines_move_id ON public.stock_move_lines(move_id);
CREATE INDEX IF NOT EXISTS idx_stock_move_lines_picking_id ON public.stock_move_lines(picking_id);
CREATE INDEX IF NOT EXISTS idx_stock_move_lines_lot_id ON public.stock_move_lines(lot_id);

-- 8. Add RLS policies
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_quants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_picking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_picking_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reordering_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_move_lines ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "owner_all_stock_locations" 
ON public.stock_locations 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_stock_quants" 
ON public.stock_quants 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_stock_moves" 
ON public.stock_moves 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_stock_picking" 
ON public.stock_picking 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_stock_picking_types" 
ON public.stock_picking_types 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_stock_reordering_rules" 
ON public.stock_reordering_rules 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_all_stock_move_lines" 
ON public.stock_move_lines 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- 9. Helper Functions for Inventory Operations

-- Function to create a stock move (double entry)
CREATE OR REPLACE FUNCTION public.create_stock_move(
  p_restaurant_id UUID,
  p_product_id UUID,
  p_location_src_id UUID,
  p_location_dest_id UUID,
  p_quantity DECIMAL,
  p_picking_id UUID DEFAULT NULL,
  p_reference VARCHAR DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_move_id UUID;
BEGIN
  INSERT INTO public.stock_moves (
    restaurant_id,
    product_id,
    location_id,
    location_dest_id,
    quantity,
    quantity_done,
    picking_id,
    reference,
    note,
    state,
    created_by
  ) VALUES (
    p_restaurant_id,
    p_product_id,
    p_location_src_id,
    p_location_dest_id,
    p_quantity,
    p_quantity,
    p_picking_id,
    p_reference,
    p_note,
    'done',
    p_created_by
  ) RETURNING id INTO v_move_id;
  
  -- Update stock quants
  PERFORM public.update_stock_quants(
    p_restaurant_id,
    p_product_id,
    p_location_src_id,
    p_location_dest_id,
    p_quantity
  );
  
  RETURN v_move_id;
END;
$$;

-- Function to update stock quants (double entry)
CREATE OR REPLACE FUNCTION public.update_stock_quants(
  p_restaurant_id UUID,
  p_product_id UUID,
  p_location_src_id UUID,
  p_location_dest_id UUID,
  p_quantity DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Decrease quantity from source location
  INSERT INTO public.stock_quants (
    restaurant_id,
    product_id,
    location_id,
    quantity_on_hand,
    in_date
  ) VALUES (
    p_restaurant_id,
    p_product_id,
    p_location_src_id,
    -p_quantity,
    NOW()
  )
  ON CONFLICT (product_id, location_id, lot_id, package_id)
  DO UPDATE SET
    quantity_on_hand = stock_quants.quantity_on_hand - p_quantity,
    updated_at = NOW();
  
  -- Increase quantity in destination location
  INSERT INTO public.stock_quants (
    restaurant_id,
    product_id,
    location_id,
    quantity_on_hand,
    in_date
  ) VALUES (
    p_restaurant_id,
    p_product_id,
    p_location_dest_id,
    p_quantity,
    NOW()
  )
  ON CONFLICT (product_id, location_id, lot_id, package_id)
  DO UPDATE SET
    quantity_on_hand = stock_quants.quantity_on_hand + p_quantity,
    updated_at = NOW();
END;
$$;

-- Function to check product availability
CREATE OR REPLACE FUNCTION public.check_product_availability(
  p_restaurant_id UUID,
  p_product_id UUID,
  p_location_id UUID,
  p_quantity DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available DECIMAL;
BEGIN
  SELECT COALESCE(SUM(available_quantity), 0)
  INTO v_available
  FROM public.stock_quants
  WHERE restaurant_id = p_restaurant_id
    AND product_id = p_product_id
    AND location_id = p_location_id;
  
  RETURN v_available >= p_quantity;
END;
$$;

-- Function to create a picking
CREATE OR REPLACE FUNCTION public.create_picking(
  p_restaurant_id UUID,
  p_picking_type_code VARCHAR,
  p_location_src_id UUID,
  p_location_dest_id UUID,
  p_partner_id UUID DEFAULT NULL,
  p_partner_type VARCHAR DEFAULT NULL,
  p_origin VARCHAR DEFAULT NULL,
  p_scheduled_date DATE DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_picking_id UUID;
  v_picking_type_id UUID;
  v_picking_name VARCHAR;
BEGIN
  -- Get picking type
  SELECT id INTO v_picking_type_id
  FROM public.stock_picking_types
  WHERE restaurant_id = p_restaurant_id
    AND code = p_picking_type_code
    AND is_active = TRUE
  LIMIT 1;
  
  -- Generate picking name
  v_picking_name := p_picking_type_code || '-' || LPAD(NEXTVAL('stock_picking_seq')::TEXT, 5, '0');
  
  INSERT INTO public.stock_picking (
    restaurant_id,
    picking_type_id,
    picking_type_code,
    name,
    origin,
    location_id,
    location_dest_id,
    partner_id,
    partner_type,
    scheduled_date,
    state,
    created_by
  ) VALUES (
    p_restaurant_id,
    v_picking_type_id,
    p_picking_type_code,
    v_picking_name,
    p_origin,
    p_location_src_id,
    p_location_dest_id,
    p_partner_id,
    p_partner_type,
    p_scheduled_date,
    'draft',
    p_created_by
  ) RETURNING id INTO v_picking_id;
  
  RETURN v_picking_id;
END;
$$;

-- Function to get product quantity on hand
CREATE OR REPLACE FUNCTION public.get_product_qty_on_hand(
  p_restaurant_id UUID,
  p_product_id UUID,
  p_location_id UUID DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quantity DECIMAL;
BEGIN
  IF p_location_id IS NULL THEN
    -- Get total across all locations
    SELECT COALESCE(SUM(quantity_on_hand), 0)
    INTO v_quantity
    FROM public.stock_quants
    WHERE restaurant_id = p_restaurant_id
      AND product_id = p_product_id;
  ELSE
    -- Get quantity for specific location
    SELECT COALESCE(SUM(quantity_on_hand), 0)
    INTO v_quantity
    FROM public.stock_quants
    WHERE restaurant_id = p_restaurant_id
      AND product_id = p_product_id
      AND location_id = p_location_id;
  END IF;
  
  RETURN v_quantity;
END;
$$;

-- Function to check and trigger reordering
CREATE OR REPLACE FUNCTION public.check_reordering_rules(
  p_restaurant_id UUID
)
RETURNS TABLE (
  product_id UUID,
  product_name VARCHAR,
  current_qty DECIMAL,
  min_qty DECIMAL,
  suggested_qty DECIMAL,
  supplier_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.product_id,
    p.name AS product_name,
    COALESCE(SUM(q.quantity_on_hand), 0) AS current_qty,
    r.min_quantity,
    r.max_quantity - COALESCE(SUM(q.quantity_on_hand), 0) AS suggested_qty,
    r.supplier_id
  FROM public.stock_reordering_rules r
  LEFT JOIN public.products p ON r.product_id = p.id
  LEFT JOIN public.stock_quants q ON r.product_id = q.product_id 
    AND (r.location_id IS NULL OR q.location_id = r.location_id)
  WHERE r.restaurant_id = p_restaurant_id
    AND r.is_active = TRUE
  GROUP BY r.product_id, p.name, r.min_quantity, r.max_quantity, r.supplier_id
  HAVING COALESCE(SUM(q.quantity_on_hand), 0) < r.min_quantity;
END;
$$;

-- Create sequence for picking numbers
CREATE SEQUENCE IF NOT EXISTS stock_picking_seq START 1;

COMMIT;
