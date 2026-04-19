
-- ============================================================
-- VENTRO PRO: EXPERT FINANCIAL & ACCOUNTING SYSTEM (SIMPLIFIED)
-- ============================================================
-- All triggers use DROP IF EXISTS for safe re-runs
-- ============================================================

-- 1. CHART OF ACCOUNTS
-- ============================================================
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) CHECK (account_type IN (
    'asset', 'liability', 'equity', 'revenue', 'cogs', 'expense'
  )) NOT NULL,
  subtype VARCHAR(30),
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_bank_account BOOLEAN DEFAULT false,
  is_cash_account BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EGP',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, code)
);

-- 2. JOURNAL ENTRIES
-- ============================================================
DROP TABLE IF EXISTS public.journal_entries CASCADE;
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  entry_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT NOT NULL,
  source VARCHAR(30) DEFAULT 'manual',
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_posted BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, entry_number)
);

-- 3. JOURNAL ENTRY LINES
-- ============================================================
DROP TABLE IF EXISTS public.journal_entry_lines CASCADE;
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id) NOT NULL,
  debit DECIMAL(15,2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15,2) DEFAULT 0 CHECK (credit >= 0),
  description TEXT,
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INVENTORY COST LAYERS (FIFO)
-- ============================================================
DROP TABLE IF EXISTS public.inventory_cost_layers CASCADE;
CREATE TABLE public.inventory_cost_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  layer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL,
  remaining_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  layer_type VARCHAR(10) DEFAULT 'purchase',
  reference_id UUID,
  is_consumed BOOLEAN DEFAULT false,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TAX RATES
-- ============================================================
DROP TABLE IF EXISTS public.tax_rates CASCADE;
CREATE TABLE public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  type VARCHAR(20) DEFAULT 'vat',
  is_compound BOOLEAN DEFAULT false,
  is_included_in_price BOOLEAN DEFAULT false,
  applies_to TEXT[] DEFAULT ARRAY['all'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER TAXES
-- ============================================================
DROP TABLE IF EXISTS public.order_taxes CASCADE;
CREATE TABLE public.order_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  tax_rate_id UUID REFERENCES public.tax_rates(id),
  taxable_amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL,
  tax_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDIT LOG
-- ============================================================
DROP TABLE IF EXISTS public.audit_log CASCADE;
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(10) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function: Update account balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  net_change DECIMAL(15,2);
BEGIN
  net_change := NEW.debit - NEW.credit;
  UPDATE chart_of_accounts 
  SET current_balance = current_balance + net_change,
      updated_at = NOW()
  WHERE id = NEW.account_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_account_balance ON journal_entry_lines;
CREATE TRIGGER trg_update_account_balance
AFTER INSERT ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Function: Validate journal balance
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_debit != NEW.total_credit THEN
    RAISE EXCEPTION 'Journal entry must balance: debit % != credit %', NEW.total_debit, NEW.total_credit;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_journal_balance ON journal_entries;
CREATE TRIGGER trg_validate_journal_balance
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION validate_journal_balance();

-- Function: Create default chart of accounts
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(p_restaurant_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO chart_of_accounts (restaurant_id, code, name, account_type, subtype, is_cash_account, is_bank_account) VALUES
  (p_restaurant_id, '1100', 'الصندوق', 'asset', 'current_asset', true, false),
  (p_restaurant_id, '1200', 'العملاء', 'asset', 'current_asset', false, false),
  (p_restaurant_id, '1300', 'المخزون', 'asset', 'current_asset', false, false),
  (p_restaurant_id, '1400', 'البنوك', 'asset', 'current_asset', false, true),
  (p_restaurant_id, '2100', 'الموردين', 'liability', 'current_liability', false, false),
  (p_restaurant_id, '2150', 'الضرائب المستحقة', 'liability', 'current_liability', false, false),
  (p_restaurant_id, '3100', 'رأس المال', 'equity', 'capital', false, false),
  (p_restaurant_id, '3200', 'الأرباح المحتجزة', 'equity', 'retained_earnings', false, false),
  (p_restaurant_id, '4100', 'المبيعات', 'revenue', 'operating_revenue', false, false),
  (p_restaurant_id, '4200', 'إيرادات الخدمات', 'revenue', 'operating_revenue', false, false),
  (p_restaurant_id, '5100', 'تكلفة البضاعة المباعة', 'cogs', 'direct_cogs', false, false),
  (p_restaurant_id, '6100', 'المرتبات', 'expense', 'operating_expense', false, false),
  (p_restaurant_id, '6200', 'الإيجار', 'expense', 'operating_expense', false, false),
  (p_restaurant_id, '6300', 'المرافق', 'expense', 'operating_expense', false, false),
  (p_restaurant_id, '6400', 'الإهلاك', 'expense', 'operating_expense', false, false)
  ON CONFLICT (restaurant_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-create accounts for new restaurants
CREATE OR REPLACE FUNCTION auto_create_restaurant_accounts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_chart_of_accounts(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_accounts ON restaurants;
CREATE TRIGGER trg_auto_create_accounts
AFTER INSERT ON restaurants
FOR EACH ROW EXECUTE FUNCTION auto_create_restaurant_accounts();

-- Function: Audit log
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (restaurant_id, table_name, record_id, action, old_data, changed_by)
    VALUES (OLD.restaurant_id, TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (restaurant_id, table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (NEW.restaurant_id, TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (restaurant_id, table_name, record_id, action, new_data, changed_by)
    VALUES (NEW.restaurant_id, TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers
DROP TRIGGER IF EXISTS trg_audit_orders ON orders;
CREATE TRIGGER trg_audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS trg_audit_products ON products;
CREATE TRIGGER trg_audit_products AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS trg_audit_journal_entries ON journal_entries;
CREATE TRIGGER trg_audit_journal_entries AFTER INSERT OR UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- RLS POLICIES
-- ============================================================
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_cost_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS isolation_chart_of_accounts ON chart_of_accounts;
CREATE POLICY isolation_chart_of_accounts ON chart_of_accounts 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS isolation_journal_entries ON journal_entries;
CREATE POLICY isolation_journal_entries ON journal_entries 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS isolation_journal_lines ON journal_entry_lines;
CREATE POLICY isolation_journal_lines ON journal_entry_lines 
  FOR ALL USING (entry_id IN (
    SELECT id FROM journal_entries 
    WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  ));

DROP POLICY IF EXISTS isolation_inventory_cost ON inventory_cost_layers;
CREATE POLICY isolation_inventory_cost ON inventory_cost_layers 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS isolation_tax_rates ON tax_rates;
CREATE POLICY isolation_tax_rates ON tax_rates 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- 9b. EXTEND EXISTING TABLES
-- ============================================================

-- Add delivery_fee to restaurants if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'delivery_fee') THEN
    ALTER TABLE public.restaurants ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- 10. ADDITIONAL TABLES FOR BUSINESS FEATURES
-- ============================================================

-- Inventory Consumption Tracking
DROP TABLE IF EXISTS public.inventory_consumption CASCADE;
CREATE TABLE public.inventory_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_consumption ENABLE ROW LEVEL SECURITY;

CREATE POLICY isolation_inventory_consumption ON inventory_consumption 
  FOR ALL USING (order_id IN (SELECT id FROM orders WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())));

-- Tables Management for Restaurants
DROP TABLE IF EXISTS public.tables CASCADE;
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  table_number INTEGER NOT NULL,
  capacity INTEGER DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  location VARCHAR(50),
  qr_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

-- Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY isolation_tables ON tables 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Staff Management
DROP TABLE IF EXISTS public.staff CASCADE;
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  role VARCHAR(50) DEFAULT 'waiter' CHECK (role IN ('manager', 'waiter', 'chef', 'cashier', 'delivery', 'barista', 'other')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  hire_date DATE,
  salary DECIMAL(10,2),
  commission_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY isolation_staff ON staff 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- SEED DATA FOR EXISTING RESTAURANTS
-- ============================================================
-- Run this after migration:
-- SELECT create_default_chart_of_accounts(id) FROM restaurants;
