-- ============================================
-- AUDITRYPOS - WAREHOUSE MODULE COMPLETE MIGRATION (FINAL FIXED)
-- ============================================
-- Date: 2026-06-21
-- ============================================

-- 1. DROP EXISTING TABLES
DROP TABLE IF EXISTS item_warehouse_stock_history;
DROP TABLE IF EXISTS inventory_cost_layers;
DROP TABLE IF EXISTS inventory_movements;
DROP TABLE IF EXISTS inventory_balances;
DROP TABLE IF EXISTS item_warehouse_assignments;
DROP TABLE IF EXISTS sub_warehouses;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS item_types;

-- 2. CREATE WAREHOUSES
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    type VARCHAR(30) NOT NULL DEFAULT 'MAIN' 
      CHECK (type IN ('MAIN', 'SUB', 'RAW_MATERIALS', 'WORK_IN_PROGRESS', 
                      'FINISHED_GOODS', 'SERVICE', 'PROJECT', 'RECEIVED', 'WASTAGE')),
    warehouse_category VARCHAR(30) DEFAULT 'STANDARD' 
      CHECK (warehouse_category IN ('STANDARD', 'MANUFACTURING', 'SERVICE', 'PROJECT')),
    parent_warehouse_id UUID REFERENCES warehouses(id),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Egypt',
    phone VARCHAR(50),
    email VARCHAR(200),
    manager_name VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    currency VARCHAR(3) DEFAULT 'EGP',
    accounting_account_code VARCHAR(100),
    inventory_account_code VARCHAR(100),
    cogs_account_code VARCHAR(100),
    accounting_standard VARCHAR(20) DEFAULT 'IFRS' 
      CHECK (accounting_standard IN ('EAS', 'IFRS', 'US_GAAP')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT warehouses_code_unique UNIQUE (code)
);

CREATE INDEX idx_warehouses_parent ON warehouses(parent_warehouse_id);
CREATE INDEX idx_warehouses_active ON warehouses(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouses_default ON warehouses(is_default) WHERE is_default = true AND deleted_at IS NULL;
CREATE INDEX idx_warehouses_type ON warehouses(type);
CREATE INDEX idx_warehouses_category ON warehouses(warehouse_category);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_view_warehouses" ON warehouses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_can_manage_warehouses" ON warehouses FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. CREATE SUB_WAREHOUSES
CREATE TABLE sub_warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    location_zone VARCHAR(100),
    aisle VARCHAR(50),
    bin VARCHAR(50),
    floor VARCHAR(50),
    building VARCHAR(100),
    capacity_quantity DECIMAL(18, 2),
    capacity_volume DECIMAL(18, 3),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    temperature_control BOOLEAN DEFAULT false,
    humidity_control BOOLEAN DEFAULT false,
    security_level VARCHAR(20) DEFAULT 'normal',
    accounting_account_code VARCHAR(100),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT sub_warehouses_code_unique UNIQUE (code, warehouse_id, deleted_at)
);

CREATE INDEX idx_sub_warehouses_warehouse ON sub_warehouses(warehouse_id);
CREATE INDEX idx_sub_warehouses_active ON sub_warehouses(is_active, warehouse_id) WHERE deleted_at IS NULL;

ALTER TABLE sub_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_view_sub_warehouses" ON sub_warehouses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_can_manage_sub_warehouses" ON sub_warehouses FOR ALL USING (auth.uid() IS NOT NULL);

-- 4. CREATE ITEM_TYPES
CREATE TABLE item_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  type VARCHAR(30) NOT NULL CHECK (type IN ('INVENTORY', 'NON_INVENTORY', 'SERVICE', 'ASSEMBLY')),
  is_inventory BOOLEAN DEFAULT true,
  requires_warehouse BOOLEAN DEFAULT true,
  accounting_account_code VARCHAR(100),
  cogs_account_code VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT item_types_type_unique UNIQUE (type)
);

INSERT INTO item_types (name, name_ar, type, is_inventory, requires_warehouse)
VALUES ('Inventory Item', 'صنف مخزني', 'INVENTORY', true, true)
ON CONFLICT (type) DO NOTHING;

INSERT INTO item_types (name, name_ar, type, is_inventory, requires_warehouse)
VALUES ('Non-Inventory Item', 'صنف غير مخزني', 'NON_INVENTORY', false, false)
ON CONFLICT (type) DO NOTHING;

INSERT INTO item_types (name, name_ar, type, is_inventory, requires_warehouse)
VALUES ('Service', 'خدمة', 'SERVICE', false, false)
ON CONFLICT (type) DO NOTHING;

INSERT INTO item_types (name, name_ar, type, is_inventory, requires_warehouse)
VALUES ('Assembly', 'تجميع', 'ASSEMBLY', true, true)
ON CONFLICT (type) DO NOTHING;

-- 5. CREATE ITEM_WAREHOUSE_ASSIGNMENTS
CREATE TABLE item_warehouse_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    sub_warehouse_id UUID NOT NULL REFERENCES sub_warehouses(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    min_stock_level DECIMAL(18, 2) DEFAULT 0,
    max_stock_level DECIMAL(18, 2),
    reorder_point DECIMAL(18, 2),
    reorder_quantity DECIMAL(18, 2),
    costing_method VARCHAR(20) NOT NULL DEFAULT 'AVERAGE' 
      CHECK (costing_method IN ('FIFO', 'AVERAGE', 'SPECIFIC', 'LIFO')),
    accounting_standard VARCHAR(20) NOT NULL DEFAULT 'IFRS' 
      CHECK (accounting_standard IN ('EAS', 'IFRS', 'US_GAAP')),
    inventory_valuation_rule VARCHAR(50) DEFAULT 'IAS2_AVERAGE' 
      CHECK (inventory_valuation_rule IN ('IAS2_FIFO', 'IAS2_AVERAGE', 'IAS2_SPECIFIC', 'GAAP_FIFO', 'GAAP_AVERAGE', 'GAAP_LIFO')),
    CONSTRAINT costing_method_gaap_check CHECK ((accounting_standard = 'US_GAAP') OR (costing_method != 'LIFO')),
    stock_unit VARCHAR(50),
    sales_unit VARCHAR(50),
    purchase_unit VARCHAR(50),
    lead_time_days INTEGER DEFAULT 0,
    low_stock_alert BOOLEAN DEFAULT true,
    overstock_alert BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT item_warehouse_assignments_unique UNIQUE (item_id, sub_warehouse_id, deleted_at)
);

CREATE INDEX idx_item_warehouse_assignments_item ON item_warehouse_assignments(item_id);
CREATE INDEX idx_item_warehouse_assignments_sub_warehouse ON item_warehouse_assignments(sub_warehouse_id);

ALTER TABLE item_warehouse_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_view_item_warehouse_assignments" ON item_warehouse_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_can_manage_item_warehouse_assignments" ON item_warehouse_assignments FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. CREATE INVENTORY_BALANCES
CREATE TABLE inventory_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    sub_warehouse_id UUID NOT NULL REFERENCES sub_warehouses(id) ON DELETE CASCADE,
    quantity_on_hand DECIMAL(18, 6) NOT NULL DEFAULT 0,
    quantity_allocated DECIMAL(18, 6) NOT NULL DEFAULT 0,
    quantity_available DECIMAL(18, 6) NOT NULL DEFAULT 0,
    quantity_incoming DECIMAL(18, 6) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(18, 6) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(18, 6) NOT NULL DEFAULT 0,
    average_cost DECIMAL(18, 6) NOT NULL DEFAULT 0,
    last_purchase_cost DECIMAL(18, 6) NOT NULL DEFAULT 0,
    total_value DECIMAL(18, 2) NOT NULL DEFAULT 0,
    valuation_method VARCHAR(20) DEFAULT 'AVERAGE' 
      CHECK (valuation_method IN ('FIFO', 'AVERAGE', 'SPECIFIC', 'LIFO')),
    accounting_standard VARCHAR(20) DEFAULT 'IFRS' 
      CHECK (accounting_standard IN ('EAS', 'IFRS', 'US_GAAP')),
    inventory_valuation_rule VARCHAR(50) DEFAULT 'IAS2_AVERAGE' 
      CHECK (inventory_valuation_rule IN ('IAS2_FIFO', 'IAS2_AVERAGE', 'IAS2_SPECIFIC', 'GAAP_FIFO', 'GAAP_AVERAGE', 'GAAP_LIFO')),
    CONSTRAINT valuation_method_gaap_check CHECK ((accounting_standard = 'US_GAAP') OR (valuation_method != 'LIFO')),
    net_realizable_value DECIMAL(18, 2),
    lcm_adjustment DECIMAL(18, 2) DEFAULT 0,
    is_lcm_applied BOOLEAN DEFAULT false,
    last_movement_id UUID,
    last_movement_at TIMESTAMP WITH TIME ZONE,
    last_purchase_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    CONSTRAINT inventory_balances_unique UNIQUE (item_id, sub_warehouse_id)
);

CREATE INDEX idx_inventory_balances_item ON inventory_balances(item_id);
CREATE INDEX idx_inventory_balances_sub_warehouse ON inventory_balances(sub_warehouse_id);

ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_view_inventory_balances" ON inventory_balances FOR SELECT USING (auth.uid() IS NOT NULL);

-- 7. CREATE INVENTORY_MOVEMENTS
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    sub_warehouse_id UUID NOT NULL REFERENCES sub_warehouses(id) ON DELETE CASCADE,
    movement_type VARCHAR(30) NOT NULL 
      CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_IN', 'RETURN_OUT', 'PRODUCTION_IN', 'PRODUCTION_OUT', 'VOICE', 'LOSS')),
    quantity DECIMAL(18, 6) NOT NULL,
    unit_cost DECIMAL(18, 6) NOT NULL DEFAULT 0,
    total_cost DECIMAL(18, 2) NOT NULL DEFAULT 0,
    reference_type VARCHAR(50) 
      CHECK (reference_type IN ('PURCHASE', 'PURCHASE_RETURN', 'SALE', 'SALE_RETURN', 'TRANSFER', 'JOURNAL', 'PRODUCTION', 'PRODUCTION_CONSUMPTION', 'VOICE', 'LOSS', 'ADJUSTMENT', 'QUANTITY_CORRECTION')),
    reference_id UUID,
    reference_number VARCHAR(100),
    from_sub_warehouse_id UUID REFERENCES sub_warehouses(id),
    to_sub_warehouse_id UUID REFERENCES sub_warehouses(id),
    cost_layer_id UUID,
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    quality_status VARCHAR(20) DEFAULT 'GOOD' 
      CHECK (quality_status IN ('GOOD', 'DAMAGED', 'EXPIRED', 'QUARANTINE', 'INSPECTION')),
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    posting_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accounting_entry_id UUID,
    is_posted BOOLEAN DEFAULT false,
    accounting_standard VARCHAR(20) DEFAULT 'IFRS' 
      CHECK (accounting_standard IN ('EAS', 'IFRS', 'US_GAAP')),
    created_by UUID NOT NULL,
    notes TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_sub_warehouse ON inventory_movements(sub_warehouse_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(movement_date DESC);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_view_inventory_movements" ON inventory_movements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_can_create_inventory_movements" ON inventory_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 8. CREATE INVENTORY_COST_LAYERS
CREATE TABLE inventory_cost_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    sub_warehouse_id UUID NOT NULL REFERENCES sub_warehouses(id) ON DELETE CASCADE,
    quantity DECIMAL(18, 6) NOT NULL,
    unit_cost DECIMAL(18, 6) NOT NULL,
    total_cost DECIMAL(18, 2) NOT NULL,
    layer_type VARCHAR(30) NOT NULL 
      CHECK (layer_type IN ('PURCHASE', 'ADJUSTMENT_POSITIVE', 'ADJUSTMENT_NEGATIVE', 'TRANSFER_IN', 'TRANSFER_OUT', 'PRODUCTION', 'RETURN')),
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(100),
    purchase_date TIMESTAMP WITH TIME ZONE,
    accounting_standard VARCHAR(20) DEFAULT 'IFRS' 
      CHECK (accounting_standard IN ('EAS', 'IFRS', 'US_GAAP')),
    is_consumed BOOLEAN DEFAULT false,
    consumed_quantity DECIMAL(18, 6) DEFAULT 0,
    remaining_quantity DECIMAL(18, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID
);

CREATE INDEX idx_inventory_cost_layers_item ON inventory_cost_layers(item_id);
CREATE INDEX idx_inventory_cost_layers_sub_warehouse ON inventory_cost_layers(sub_warehouse_id);

ALTER TABLE inventory_cost_layers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_view_cost_layers" ON inventory_cost_layers FOR SELECT USING (auth.uid() IS NOT NULL);

-- 9. CREATE ITEM_WAREHOUSE_STOCK_HISTORY
CREATE TABLE item_warehouse_stock_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    sub_warehouse_id UUID NOT NULL,
    previous_quantity_on_hand DECIMAL(18, 6),
    previous_quantity_available DECIMAL(18, 6),
    previous_unit_cost DECIMAL(18, 6),
    previous_total_value DECIMAL(18, 2),
    new_quantity_on_hand DECIMAL(18, 6),
    new_quantity_available DECIMAL(18, 6),
    new_unit_cost DECIMAL(18, 6),
    new_total_value DECIMAL(18, 2),
    movement_id UUID,
    movement_type VARCHAR(30),
    quantity_change DECIMAL(18, 6),
    accounting_standard VARCHAR(20) DEFAULT 'IFRS' 
      CHECK (accounting_standard IN ('EAS', 'IFRS', 'US_GAAP')),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    changed_by UUID,
    reason TEXT
);

CREATE INDEX idx_stock_history_item ON item_warehouse_stock_history(item_id DESC);
CREATE INDEX idx_stock_history_date ON item_warehouse_stock_history(changed_at DESC);

ALTER TABLE item_warehouse_stock_history ENABLE ROW LEVEL SECURITY;

-- 10. CREATE TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_sub_warehouses_updated_at BEFORE UPDATE ON sub_warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_item_warehouse_assignments_updated_at BEFORE UPDATE ON item_warehouse_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. CREATE TRIGGER FOR NON-INVENTORY VALIDATION
CREATE OR REPLACE FUNCTION validate_item_warehouse_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM items 
    WHERE id = NEW.item_id 
    AND item_type_id IS NOT NULL
    AND item_type_id IN (
      SELECT id FROM item_types WHERE type IN ('NON_INVENTORY', 'SERVICE') AND is_inventory = false
    )
  ) THEN
    RAISE EXCEPTION 'Non-inventory items and services cannot be assigned to warehouses';
  END IF;
  IF EXISTS (
    SELECT 1 FROM items WHERE id = NEW.item_id AND item_type_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Item must have a type assigned';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_item_warehouse_assignment
  BEFORE INSERT OR UPDATE ON item_warehouse_assignments
  FOR EACH ROW EXECUTE FUNCTION validate_item_warehouse_assignment();

-- 12. CREATE DEFAULT WAREHOUSE
INSERT INTO warehouses (code, name, name_ar, type, warehouse_category, is_default, is_active, currency, accounting_standard)
VALUES ('MAIN-001', 'Main Warehouse', 'المخزن الرئيسي', 'MAIN', 'STANDARD', true, true, 'EGP', 'IFRS')
ON CONFLICT (code) DO NOTHING;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- ✅ MIGRATION COMPLETED SUCCESSFULLY
