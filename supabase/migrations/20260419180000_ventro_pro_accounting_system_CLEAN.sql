
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
-- Note: audit_log doesn't need RLS as it's written by triggers only
-- ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

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

-- 11. ADVANCED COSTING: MENU ITEM TYPES & PRICING
-- ============================================================

-- Add product type and pricing columns to menu_items
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'product_type') THEN
    ALTER TABLE public.menu_items ADD COLUMN product_type VARCHAR(20) DEFAULT 'inventory' CHECK (product_type IN ('inventory', 'manufactured'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'pricing_method') THEN
    ALTER TABLE public.menu_items ADD COLUMN pricing_method VARCHAR(20) DEFAULT 'fixed' CHECK (pricing_method IN ('fixed', 'cost_plus'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'profit_margin_percent') THEN
    ALTER TABLE public.menu_items ADD COLUMN profit_margin_percent DECIMAL(5,2) DEFAULT 30;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'calculated_cost_price') THEN
    ALTER TABLE public.menu_items ADD COLUMN calculated_cost_price DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- 12. DAILY OVERHEADS (EXPENSES ALLOCATION)
-- ============================================================

DROP TABLE IF EXISTS public.daily_overheads CASCADE;
CREATE TABLE public.daily_overheads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  rent_amount DECIMAL(12,2) DEFAULT 0,
  electricity_amount DECIMAL(12,2) DEFAULT 0,
  salaries_amount DECIMAL(12,2) DEFAULT 0,
  other_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  is_distributed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(restaurant_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_overheads ENABLE ROW LEVEL SECURITY;

CREATE POLICY isolation_daily_overheads ON daily_overheads 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Function to calculate total overheads
CREATE OR REPLACE FUNCTION calculate_daily_overhead_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := COALESCE(NEW.rent_amount, 0) + 
                      COALESCE(NEW.electricity_amount, 0) + 
                      COALESCE(NEW.salaries_amount, 0) + 
                      COALESCE(NEW.other_amount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_overhead_total ON daily_overheads;
CREATE TRIGGER trg_calc_overhead_total
  BEFORE INSERT OR UPDATE ON daily_overheads
  FOR EACH ROW EXECUTE FUNCTION calculate_daily_overhead_total();

-- 13. INVENTORY RECEIPTS (فواتير استلام المخزون)
-- ============================================================

DROP TABLE IF EXISTS public.inventory_receipt_items CASCADE;
DROP TABLE IF EXISTS public.inventory_receipts CASCADE;

CREATE TABLE public.inventory_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  receipt_number VARCHAR(20) NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'posted', 'cancelled')),
  notes TEXT,
  -- Accounting integration
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(restaurant_id, receipt_number)
);

CREATE TABLE public.inventory_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_receipt_id UUID REFERENCES public.inventory_receipts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10,4) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  -- Batch tracking
  batch_number VARCHAR(50),
  expiry_date DATE,
  -- Unit info
  unit VARCHAR(20),
  -- Storage
  warehouse_location VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY isolation_inventory_receipts ON inventory_receipts 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY isolation_inventory_receipt_items ON inventory_receipt_items 
  FOR ALL USING (inventory_receipt_id IN (SELECT id FROM inventory_receipts WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())));

-- Trigger to calculate receipt totals
CREATE OR REPLACE FUNCTION calculate_receipt_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := (
    SELECT COALESCE(SUM(total_cost), 0) 
    FROM inventory_receipt_items 
    WHERE inventory_receipt_id = NEW.id
  );
  NEW.net_amount := NEW.total_amount - COALESCE(NEW.discount_amount, 0) + COALESCE(NEW.tax_amount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_receipt_total ON inventory_receipts;
CREATE TRIGGER trg_calc_receipt_total
  BEFORE INSERT OR UPDATE ON inventory_receipts
  FOR EACH ROW EXECUTE FUNCTION calculate_receipt_total();

-- 14. SALES RETURNS (مردودات المبيعات)
-- ============================================================

DROP TABLE IF EXISTS public.sales_return_items CASCADE;
DROP TABLE IF EXISTS public.sales_returns CASCADE;

CREATE TABLE public.sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  return_number VARCHAR(20) NOT NULL,
  original_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
  -- Financial integration
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  -- Inventory tracking
  inventory_adjusted BOOLEAN DEFAULT FALSE,
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(restaurant_id, return_number)
);

CREATE TABLE public.sales_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_return_id UUID REFERENCES public.sales_returns(id) ON DELETE CASCADE NOT NULL,
  original_order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity_returned INTEGER NOT NULL CHECK (quantity_returned > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  -- Cost tracking for COGS adjustment
  cost_price_at_return DECIMAL(10,2),
  -- Condition of returned item
  condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'expired', 'defective')),
  -- Where to return stock
  return_to_inventory BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY isolation_sales_returns ON sales_returns 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY isolation_sales_return_items ON sales_return_items 
  FOR ALL USING (sales_return_id IN (SELECT id FROM sales_returns WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())));

-- 14. PURCHASE RETURNS (مردودات المشتريات)
-- ============================================================

DROP TABLE IF EXISTS public.purchase_return_items CASCADE;
DROP TABLE IF EXISTS public.purchase_returns CASCADE;

CREATE TABLE public.purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  return_number VARCHAR(20) NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  -- Can be linked to inventory receipt or standalone
  inventory_receipt_id UUID REFERENCES public.inventory_receipts(id) ON DELETE SET NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
  -- Financial integration
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  -- How return is handled
  refund_method VARCHAR(20) DEFAULT 'credit' CHECK (refund_method IN ('cash', 'credit', 'bank_transfer', 'deduct_from_future')),
  -- Supplier credit tracking
  supplier_credit_applied BOOLEAN DEFAULT FALSE,
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(restaurant_id, return_number)
);

CREATE TABLE public.purchase_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_return_id UUID REFERENCES public.purchase_returns(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity_returned DECIMAL(10,3) NOT NULL CHECK (quantity_returned > 0),
  unit_cost DECIMAL(10,4) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  -- Batch/lot tracking
  batch_number VARCHAR(50),
  expiry_date DATE,
  -- Reason
  reason VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY isolation_purchase_returns ON purchase_returns 
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY isolation_purchase_return_items ON purchase_return_items 
  FOR ALL USING (purchase_return_id IN (SELECT id FROM purchase_returns WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())));

-- 15. FUNCTIONS FOR RETURNS
-- ============================================================

-- Function to calculate sales return total
CREATE OR REPLACE FUNCTION calculate_sales_return_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := (
    SELECT COALESCE(SUM(total_price), 0) 
    FROM sales_return_items 
    WHERE sales_return_id = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_sales_return_total ON sales_returns;
CREATE TRIGGER trg_calc_sales_return_total
  BEFORE INSERT OR UPDATE ON sales_returns
  FOR EACH ROW EXECUTE FUNCTION calculate_sales_return_total();

-- Function to calculate purchase return total
CREATE OR REPLACE FUNCTION calculate_purchase_return_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := (
    SELECT COALESCE(SUM(total_cost), 0) 
    FROM purchase_return_items 
    WHERE purchase_return_id = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_purchase_return_total ON purchase_returns;
CREATE TRIGGER trg_calc_purchase_return_total
  BEFORE INSERT OR UPDATE ON purchase_returns
  FOR EACH ROW EXECUTE FUNCTION calculate_purchase_return_total();

-- Function to generate return numbers
CREATE OR REPLACE FUNCTION generate_return_number(return_type TEXT, restaurant_id UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_number INTEGER;
  result TEXT;
BEGIN
  IF return_type = 'sales' THEN
    prefix := 'SR-';
    SELECT COUNT(*) + 1 INTO next_number FROM sales_returns WHERE restaurant_id = restaurant_id;
  ELSE
    prefix := 'PR-';
    SELECT COUNT(*) + 1 INTO next_number FROM purchase_returns WHERE restaurant_id = restaurant_id;
  END IF;
  result := prefix || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 16. ACCOUNTING INTEGRATION FUNCTIONS (الربط المحاسبي الكامل)
-- ============================================================

-- Function to get or create default expense account
CREATE OR REPLACE FUNCTION get_or_create_expense_account(
  p_restaurant_id UUID,
  p_account_name TEXT,
  p_code TEXT
) RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Try to find existing account
  SELECT id INTO v_account_id 
  FROM chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND name = p_account_name AND account_type = 'expense';
  
  -- Create if not exists
  IF v_account_id IS NULL THEN
    INSERT INTO chart_of_accounts (restaurant_id, code, name, account_type, subtype)
    VALUES (p_restaurant_id, p_code, p_account_name, 'expense', 'operating_expense')
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get cash account
CREATE OR REPLACE FUNCTION get_cash_account(p_restaurant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND is_cash_account = true;
  
  IF v_account_id IS NULL THEN
    INSERT INTO chart_of_accounts (restaurant_id, code, name, account_type, is_cash_account, subtype)
    VALUES (p_restaurant_id, '101', 'الصندوق', 'asset', true, 'current_asset')
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get accounts payable (موردين) account
CREATE OR REPLACE FUNCTION get_accounts_payable(p_restaurant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND code = '201';
  
  IF v_account_id IS NULL THEN
    INSERT INTO chart_of_accounts (restaurant_id, code, name, account_type, subtype)
    VALUES (p_restaurant_id, '201', 'الموردين', 'liability', 'current_liability')
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get accounts receivable (عملاء) account
CREATE OR REPLACE FUNCTION get_accounts_receivable(p_restaurant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND code = '102';
  
  IF v_account_id IS NULL THEN
    INSERT INTO chart_of_accounts (restaurant_id, code, name, account_type, subtype)
    VALUES (p_restaurant_id, '102', 'العملاء', 'asset', 'current_asset')
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get inventory account
CREATE OR REPLACE FUNCTION get_inventory_account(p_restaurant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND code = '103';
  
  IF v_account_id IS NULL THEN
    INSERT INTO chart_of_accounts (restaurant_id, code, name, account_type, subtype)
    VALUES (p_restaurant_id, '103', 'المخزون', 'asset', 'current_asset')
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get sales account
CREATE OR REPLACE FUNCTION get_sales_account(p_restaurant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND code = '401';
  
  IF v_account_id IS NULL THEN
    INSERT INTO chart_of_accounts (restaurant_id, code, name, account_type, subtype)
    VALUES (p_restaurant_id, '401', 'المبيعات', 'revenue', 'operating_revenue')
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get sales returns account
CREATE OR REPLACE FUNCTION get_sales_returns_account(p_restaurant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND code = '402';
  
  IF v_account_id IS NULL THEN
    INSERT INTO chart_of_accounts (restaurant_id, code, name, account_type, subtype)
    VALUES (p_restaurant_id, '402', 'مردودات المبيعات', 'revenue', 'sales_returns')
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get COGS account (تكلفة البضاعة المباعة)
CREATE OR REPLACE FUNCTION get_cogs_account(p_restaurant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id 
  FROM chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND code = '501';
  
  IF v_account_id IS NULL THEN
    INSERT INTO chart_of_accounts (restaurant_id, code, name, account_type, subtype)
    VALUES (p_restaurant_id, '501', 'تكلفة المبيعات', 'cogs', 'direct_cogs')
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate journal entry number
CREATE OR REPLACE FUNCTION generate_entry_number(p_restaurant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_result TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count 
  FROM journal_entries 
  WHERE restaurant_id = p_restaurant_id 
  AND DATE(created_at) = CURRENT_DATE;
  
  v_result := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 17. DAILY OVERHEADS ACCOUNTING INTEGRATION
-- ============================================================

-- Function to create journal entry for daily overheads
CREATE OR REPLACE FUNCTION create_overhead_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_cash_account UUID;
  v_rent_account UUID;
  v_electricity_account UUID;
  v_salaries_account UUID;
  v_other_account UUID;
  v_entry_number TEXT;
  v_line_order INTEGER := 0;
BEGIN
  -- Only process when is_distributed changes from false to true
  IF OLD.is_distributed = TRUE OR NEW.is_distributed = FALSE THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_cash_account := get_cash_account(NEW.restaurant_id);
  v_rent_account := get_or_create_expense_account(NEW.restaurant_id, 'إيجار', '601');
  v_electricity_account := get_or_create_expense_account(NEW.restaurant_id, 'كهرباء', '602');
  v_salaries_account := get_or_create_expense_account(NEW.restaurant_id, 'رواتب', '603');
  v_other_account := get_or_create_expense_account(NEW.restaurant_id, 'مصاريف أخرى', '609');
  
  -- Generate entry number
  v_entry_number := generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.date, 'daily_overheads', NEW.id,
    'تسجيل النفقات اليومية - ' || NEW.date, 'auto', NEW.total_amount, NEW.total_amount, true
  ) RETURNING id INTO v_entry_id;
  
  -- Create journal entry lines (Debit expenses)
  IF NEW.rent_amount > 0 THEN
    v_line_order := v_line_order + 1;
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_rent_account, NEW.rent_amount, 0, 'إيجار', v_line_order);
  END IF;
  
  IF NEW.electricity_amount > 0 THEN
    v_line_order := v_line_order + 1;
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_electricity_account, NEW.electricity_amount, 0, 'كهرباء', v_line_order);
  END IF;
  
  IF NEW.salaries_amount > 0 THEN
    v_line_order := v_line_order + 1;
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_salaries_account, NEW.salaries_amount, 0, 'رواتب', v_line_order);
  END IF;
  
  IF NEW.other_amount > 0 THEN
    v_line_order := v_line_order + 1;
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_other_account, NEW.other_amount, 0, COALESCE(NEW.notes, 'مصاريف أخرى'), v_line_order);
  END IF;
  
  -- Credit cash (one line for total)
  v_line_order := v_line_order + 1;
  INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES (v_entry_id, v_cash_account, 0, NEW.total_amount, 'دفع نقدي', v_line_order);
  
  -- Update journal_entry_id
  NEW.journal_entry_id := v_entry_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_overhead_journal ON daily_overheads;
CREATE TRIGGER trg_create_overhead_journal
  BEFORE UPDATE ON daily_overheads
  FOR EACH ROW EXECUTE FUNCTION create_overhead_journal_entry();

-- ============================================================
-- 18. INVENTORY RECEIPTS ACCOUNTING INTEGRATION
-- ============================================================

-- Function to create journal entry for inventory receipt
CREATE OR REPLACE FUNCTION create_receipt_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_inventory_account UUID;
  v_payable_account UUID;
  v_entry_number TEXT;
BEGIN
  -- Only process when status changes to 'posted'
  IF NEW.status != 'posted' OR (OLD.status = 'posted' AND NEW.status = 'posted') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_inventory_account := get_inventory_account(NEW.restaurant_id);
  v_payable_account := get_accounts_payable(NEW.restaurant_id);
  
  -- Generate entry number
  v_entry_number := generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.receipt_date, 'inventory_receipt', NEW.id,
    'استلام مخزون - فاتورة ' || NEW.receipt_number || COALESCE(' - ' || NEW.notes, ''), 'auto', 
    NEW.net_amount, NEW.net_amount, true
  ) RETURNING id INTO v_entry_id;
  
  -- Debit inventory (asset increases)
  INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES (v_entry_id, v_inventory_account, NEW.total_amount - COALESCE(NEW.discount_amount, 0), 0, 'بضاعة مستلمة', 1);
  
  -- Debit tax (if any)
  IF COALESCE(NEW.tax_amount, 0) > 0 THEN
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, get_or_create_expense_account(NEW.restaurant_id, 'ضريبة قيمة مضافة', '604'), NEW.tax_amount, 0, 'ضريبة', 2);
  END IF;
  
  -- Credit accounts payable (liability increases)
  INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES (v_entry_id, v_payable_account, 0, NEW.net_amount, 'مستحق للمورد', 3);
  
  -- Update journal_entry_id
  NEW.journal_entry_id := v_entry_id;
  
  -- Update supplier balance (increase payable)
  IF NEW.supplier_id IS NOT NULL THEN
    UPDATE suppliers SET balance = COALESCE(balance, 0) + NEW.net_amount WHERE id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_receipt_journal ON inventory_receipts;
CREATE TRIGGER trg_create_receipt_journal
  BEFORE UPDATE ON inventory_receipts
  FOR EACH ROW EXECUTE FUNCTION create_receipt_journal_entry();

-- ============================================================
-- 19. SALES RETURNS ACCOUNTING INTEGRATION
-- ============================================================

-- Function to create journal entry for sales return
CREATE OR REPLACE FUNCTION create_sales_return_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_sales_returns_account UUID;
  v_receivable_account UUID;
  v_cash_account UUID;
  v_cogs_account UUID;
  v_inventory_account UUID;
  v_entry_number TEXT;
  v_total_cost DECIMAL(15,2) := 0;
BEGIN
  -- Only process when status changes to 'approved' or 'completed'
  IF NEW.status NOT IN ('approved', 'completed') OR OLD.status IN ('approved', 'completed') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_sales_returns_account := get_sales_returns_account(NEW.restaurant_id);
  v_receivable_account := get_accounts_receivable(NEW.restaurant_id);
  v_cash_account := get_cash_account(NEW.restaurant_id);
  v_cogs_account := get_cogs_account(NEW.restaurant_id);
  v_inventory_account := get_inventory_account(NEW.restaurant_id);
  
  -- Calculate total cost from return items
  SELECT COALESCE(SUM(cost_price_at_return * quantity_returned), 0) INTO v_total_cost
  FROM sales_return_items 
  WHERE sales_return_id = NEW.id AND return_to_inventory = true;
  
  -- Generate entry number
  v_entry_number := generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.return_date, 'sales_return', NEW.id,
    'مردود مبيعات - ' || NEW.return_number || COALESCE(' - ' || NEW.reason, ''), 'auto', 
    NEW.total_amount + v_total_cost, NEW.total_amount + v_total_cost, true
  ) RETURNING id INTO v_entry_id;
  
  -- Debit sales returns (reduces revenue)
  INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES (v_entry_id, v_sales_returns_account, NEW.total_amount, 0, 'مردود مبيعات', 1);
  
  -- Credit accounts receivable (if credit sale) or cash (if cash refund)
  IF NEW.customer_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_receivable_account, 0, NEW.total_amount, 'مستحق من العميل', 2);
    
    -- Update customer balance (reduce receivable)
    UPDATE customers SET balance = COALESCE(balance, 0) - NEW.total_amount WHERE id = NEW.customer_id;
  ELSE
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_cash_account, 0, NEW.total_amount, 'استرداد نقدي', 2);
  END IF;
  
  -- If returning to inventory, reverse COGS
  IF v_total_cost > 0 THEN
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_inventory_account, v_total_cost, 0, 'إعادة للمخزون', 3);
    
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_cogs_account, 0, v_total_cost, 'عكس تكلفة', 4);
  END IF;
  
  -- Update journal_entry_id
  NEW.journal_entry_id := v_entry_id;
  NEW.inventory_adjusted := true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_sales_return_journal ON sales_returns;
CREATE TRIGGER trg_create_sales_return_journal
  BEFORE UPDATE ON sales_returns
  FOR EACH ROW EXECUTE FUNCTION create_sales_return_journal_entry();

-- ============================================================
-- 20. PURCHASE RETURNS ACCOUNTING INTEGRATION
-- ============================================================

-- Function to create journal entry for purchase return
CREATE OR REPLACE FUNCTION create_purchase_return_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_payable_account UUID;
  v_inventory_account UUID;
  v_cash_account UUID;
  v_entry_number TEXT;
BEGIN
  -- Only process when status changes to 'approved' or 'completed'
  IF NEW.status NOT IN ('approved', 'completed') OR OLD.status IN ('approved', 'completed') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_payable_account := get_accounts_payable(NEW.restaurant_id);
  v_inventory_account := get_inventory_account(NEW.restaurant_id);
  v_cash_account := get_cash_account(NEW.restaurant_id);
  
  -- Generate entry number
  v_entry_number := generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, NEW.return_date, 'purchase_return', NEW.id,
    'مردود مشتريات - ' || NEW.return_number || COALESCE(' - ' || NEW.reason, ''), 'auto', 
    NEW.total_amount, NEW.total_amount, true
  ) RETURNING id INTO v_entry_id;
  
  -- Debit accounts payable (reduce liability)
  INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES (v_entry_id, v_payable_account, NEW.total_amount, 0, 'تخفيض ذمم الموردين', 1);
  
  -- Credit inventory (reduce asset)
  INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES (v_entry_id, v_inventory_account, 0, NEW.total_amount, 'إخراج من المخزون', 2);
  
  -- Update journal_entry_id
  NEW.journal_entry_id := v_entry_id;
  
  -- Update supplier balance (reduce payable)
  IF NEW.supplier_id IS NOT NULL THEN
    UPDATE suppliers SET balance = COALESCE(balance, 0) - NEW.total_amount WHERE id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_purchase_return_journal ON purchase_returns;
CREATE TRIGGER trg_create_purchase_return_journal
  BEFORE UPDATE ON purchase_returns
  FOR EACH ROW EXECUTE FUNCTION create_purchase_return_journal_entry();

-- ============================================================
-- 21. ORDER CHECKOUT ACCOUNTING INTEGRATION (مبيعات نقاط البيع)
-- ============================================================

-- Function to create journal entry for order completion
CREATE OR REPLACE FUNCTION create_order_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_cash_account UUID;
  v_receivable_account UUID;
  v_sales_account UUID;
  v_tax_account UUID;
  v_cogs_account UUID;
  v_inventory_account UUID;
  v_entry_number TEXT;
  v_tax_amount DECIMAL(15,2);
  v_total_cost DECIMAL(15,2);
BEGIN
  -- Only process when status changes to 'completed' and not already processed
  IF NEW.status != 'completed' OR OLD.status = 'completed' OR NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if we have the required column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'journal_entry_id') THEN
    RETURN NEW;
  END IF;
  
  -- Get accounts
  v_cash_account := get_cash_account(NEW.restaurant_id);
  v_receivable_account := get_accounts_receivable(NEW.restaurant_id);
  v_sales_account := get_sales_account(NEW.restaurant_id);
  v_tax_account := get_or_create_expense_account(NEW.restaurant_id, 'ضريبة مبيعات', '605');
  v_cogs_account := get_cogs_account(NEW.restaurant_id);
  v_inventory_account := get_inventory_account(NEW.restaurant_id);
  
  -- Calculate tax (14% of total)
  v_tax_amount := ROUND(NEW.total * 0.14 / 1.14, 2);
  
  -- Calculate COGS from order items
  SELECT COALESCE(SUM(COALESCE(cost_price_snapshot, 0) * quantity), 0) INTO v_total_cost
  FROM order_items WHERE order_id = NEW.id;
  
  -- Generate entry number
  v_entry_number := generate_entry_number(NEW.restaurant_id);
  
  -- Create journal entry header
  INSERT INTO journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    NEW.restaurant_id, v_entry_number, COALESCE(NEW.created_at::DATE, CURRENT_DATE), 'order', NEW.id,
    'بيع - طلب #' || COALESCE(NEW.order_number, NEW.id::TEXT), 'auto', 
    NEW.total + v_total_cost, NEW.total + v_total_cost, true
  ) RETURNING id INTO v_entry_id;
  
  -- Debit cash (if paid) or accounts receivable (if credit)
  IF COALESCE(NEW.paid_amount, 0) >= NEW.total THEN
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_cash_account, NEW.total, 0, 'نقدي', 1);
  ELSE
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_receivable_account, NEW.total, 0, 'آجل', 1);
    
    -- Update customer balance if customer_id exists
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE customers SET balance = COALESCE(balance, 0) + NEW.total WHERE id = NEW.customer_id;
    END IF;
  END IF;
  
  -- Credit sales
  INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
  VALUES (v_entry_id, v_sales_account, 0, NEW.total - v_tax_amount, 'مبيعات', 2);
  
  -- Credit tax payable
  IF v_tax_amount > 0 THEN
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_tax_account, 0, v_tax_amount, 'ضريبة مبيعات', 3);
  END IF;
  
  -- COGS entry (debit COGS, credit inventory)
  IF v_total_cost > 0 THEN
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_cogs_account, v_total_cost, 0, 'تكلفة البضاعة المباعة', 4);
    
    INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_inventory_account, 0, v_total_cost, 'إنقاص مخزون', 5);
  END IF;
  
  -- Update order with journal entry reference
  UPDATE orders SET journal_entry_id = v_entry_id WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add journal_entry_id to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'journal_entry_id') THEN
    ALTER TABLE public.orders ADD COLUMN journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_create_order_journal ON orders;
CREATE TRIGGER trg_create_order_journal
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION create_order_journal_entry();

-- ============================================================
-- 22. BALANCE UPDATE TRIGGERS (تحديث أرصدة الحسابات تلقائياً)
-- ============================================================

-- Function to update account balance when journal line is added
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chart_of_accounts
  SET current_balance = COALESCE(current_balance, 0) + COALESCE(NEW.debit, 0) - COALESCE(NEW.credit, 0),
      updated_at = NOW()
  WHERE id = NEW.account_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_account_balance ON journal_entry_lines;
CREATE TRIGGER trg_update_account_balance
  AFTER INSERT ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- ============================================================
-- SEED DATA FOR EXISTING RESTAURANTS
-- ============================================================
-- Run this after migration:
-- SELECT create_default_chart_of_accounts(id) FROM restaurants;
