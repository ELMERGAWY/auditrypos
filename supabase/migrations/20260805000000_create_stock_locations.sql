-- ============================================================
-- STOCK LOCATIONS MIGRATION
-- ============================================================

-- Create stock_locations table
CREATE TABLE IF NOT EXISTS stock_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    code VARCHAR(50),
    location_type VARCHAR(50) NOT NULL DEFAULT 'internal', -- internal, customer, supplier, transit, production, loss, inventory
    usage VARCHAR(50) NOT NULL DEFAULT 'internal', -- internal, supplier, customer, inventory, production, transit
    
    -- Hierarchy
    parent_id UUID REFERENCES stock_locations(id) ON DELETE SET NULL,
    path TEXT,
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Egypt',
    
    -- Flags
    is_scrap_location BOOLEAN DEFAULT FALSE,
    is_return_location BOOLEAN DEFAULT FALSE,
    is_internal BOOLEAN DEFAULT TRUE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_locations_restaurant ON stock_locations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_warehouse ON stock_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_parent ON stock_locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_type ON stock_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_stock_locations_active ON stock_locations(is_active);

-- Create stock_moves table
CREATE TABLE IF NOT EXISTS stock_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Product
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Locations
    location_id UUID REFERENCES stock_locations(id) ON DELETE SET NULL,
    location_dest_id UUID REFERENCES stock_locations(id) ON DELETE SET NULL,
    
    -- Quantity
    quantity DECIMAL(18,6) NOT NULL,
    quantity_done DECIMAL(18,6) DEFAULT 0,
    
    -- State
    state VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, confirmed, assigned, done, cancel
    
    -- Reference
    reference VARCHAR(100),
    origin VARCHAR(100),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    picking_id UUID,
    partner_id UUID,
    
    -- Notes
    note TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_moves_restaurant ON stock_moves(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product ON stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_location_src ON stock_moves(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_location_dest ON stock_moves(location_dest_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_state ON stock_moves(state);
CREATE INDEX IF NOT EXISTS idx_stock_moves_date ON stock_moves(date);

-- Foreign key constraints for stock_moves
-- Note: IF NOT EXISTS is not supported for ADD CONSTRAINT in PostgreSQL
-- These will be created only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stock_moves_location_id_fkey'
    ) THEN
        ALTER TABLE stock_moves ADD CONSTRAINT stock_moves_location_id_fkey 
            FOREIGN KEY (location_id) REFERENCES stock_locations(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stock_moves_location_dest_id_fkey'
    ) THEN
        ALTER TABLE stock_moves ADD CONSTRAINT stock_moves_location_dest_id_fkey 
            FOREIGN KEY (location_dest_id) REFERENCES stock_locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_moves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_locations (with IF NOT EXISTS check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_locations' AND policyname = 'Users can view stock_locations') THEN
        CREATE POLICY "Users can view stock_locations" ON stock_locations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_locations' AND policyname = 'Users can insert stock_locations') THEN
        CREATE POLICY "Users can insert stock_locations" ON stock_locations FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_locations' AND policyname = 'Users can update stock_locations') THEN
        CREATE POLICY "Users can update stock_locations" ON stock_locations FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_locations' AND policyname = 'Users can delete stock_locations') THEN
        CREATE POLICY "Users can delete stock_locations" ON stock_locations FOR DELETE USING (true);
    END IF;
END $$;

-- RLS Policies for stock_moves (with IF NOT EXISTS check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_moves' AND policyname = 'Users can view stock_moves') THEN
        CREATE POLICY "Users can view stock_moves" ON stock_moves FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_moves' AND policyname = 'Users can insert stock_moves') THEN
        CREATE POLICY "Users can insert stock_moves" ON stock_moves FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_moves' AND policyname = 'Users can update stock_moves') THEN
        CREATE POLICY "Users can update stock_moves" ON stock_moves FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_moves' AND policyname = 'Users can delete stock_moves') THEN
        CREATE POLICY "Users can delete stock_moves" ON stock_moves FOR DELETE USING (true);
    END IF;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_stock_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stock_locations_updated_at 
    BEFORE UPDATE ON stock_locations
    FOR EACH ROW EXECUTE FUNCTION update_stock_locations_updated_at();

CREATE OR REPLACE FUNCTION update_stock_moves_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stock_moves_updated_at 
    BEFORE UPDATE ON stock_moves
    FOR EACH ROW EXECUTE FUNCTION update_stock_moves_updated_at();

-- Create function to create stock move
CREATE OR REPLACE FUNCTION create_stock_move(
    p_restaurant_id UUID,
    p_product_id UUID,
    p_quantity DECIMAL,
    p_location_src_id UUID DEFAULT NULL,
    p_location_dest_id UUID DEFAULT NULL,
    p_reference VARCHAR(100) DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_move_id UUID;
BEGIN
    INSERT INTO stock_moves (
        restaurant_id,
        product_id,
        quantity,
        location_id,
        location_dest_id,
        reference,
        note,
        created_by,
        state,
        date
    ) VALUES (
        p_restaurant_id,
        p_product_id,
        p_quantity,
        p_location_src_id,
        p_location_dest_id,
        p_reference,
        p_note,
        p_created_by,
        'draft',
        CURRENT_DATE
    ) RETURNING id INTO v_move_id;
    
    RETURN v_move_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
