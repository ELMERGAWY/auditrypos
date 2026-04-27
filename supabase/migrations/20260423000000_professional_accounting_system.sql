-- ============================================================
-- PROFESSIONAL ACCOUNTING SYSTEM - BY BUSINESS TYPE
-- ============================================================
-- Architecture:
-- 1. CORE: All businesses (Chart of Accounts, Journal, Fiscal)
-- 2. MODULES: Business-specific (Services, Retail, Restaurant, Pharmacy)
-- 3. POSTING ENGINE: Correct double-entry per transaction type
-- 4. REPORTING: P&L, BS, CF, TB, Financial Indicators
-- ============================================================

-- ============================================================
-- SECTION 1: CORE ACCOUNTING (All Businesses)
-- ============================================================

-- 1.1 FISCAL PERIODS
-- ============================================================
DROP TABLE IF EXISTS public.fiscal_periods CASCADE;
CREATE TABLE public.fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  period_name VARCHAR(50) NOT NULL, -- "يناير 2024"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  is_posting_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, start_date)
);

-- 1.2 CHART OF ACCOUNTS
-- ============================================================
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN (
    'asset', 'liability', 'equity', 'revenue', 'expense'
  )),
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_bank_account BOOLEAN DEFAULT false,
  is_cash_account BOOLEAN DEFAULT false,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, code)
);

-- 1.3 JOURNAL ENTRIES
-- ============================================================
DROP TABLE IF EXISTS public.journal_entries CASCADE;
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  entry_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type VARCHAR(50), -- 'service_invoice', 'retail_sale', 'restaurant_order'
  reference_id UUID,
  description TEXT NOT NULL,
  source VARCHAR(30), -- 'manual', 'system', 'pos'
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, entry_number)
);

-- 1.4 JOURNAL ENTRY LINES
-- ============================================================
DROP TABLE IF EXISTS public.journal_entry_lines CASCADE;
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id) NOT NULL,
  debit DECIMAL(15,2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15,2) DEFAULT 0 CHECK (credit >= 0),
  description TEXT,
  line_order INTEGER DEFAULT 0
);

-- ============================================================
-- SECTION 2: BUSINESS TYPE FLAGS
-- ============================================================

-- Add business type tracking to restaurants
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS accounting_config JSONB DEFAULT '{
  "business_type": "retail",
  "has_inventory": true,
  "has_bom": false,
  "has_batches": false,
  "chart_template": "standard"
}'::jsonb;

-- ============================================================
-- SECTION 3: SERVICES MODULE (No Inventory)
-- ============================================================
-- For: Accountants, Lawyers, Consultants, Service providers

-- 3.1 SERVICE INVOICES
DROP TABLE IF EXISTS public.service_invoices CASCADE;
CREATE TABLE public.service_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(50),
  service_description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  payment_method VARCHAR(50), -- 'cash', 'bank', 'credit'
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, invoice_number)
);

-- ============================================================
-- SECTION 4: RETAIL MODULE (Inventory - Weighted Average/FIFO)
-- ============================================================
-- For: Supermarkets, Shops, Electronics stores

-- 4.1 WAREHOUSES
DROP TABLE IF EXISTS public.warehouses CASCADE;
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(200) NOT NULL,
  location TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 INVENTORY ITEMS (Extended from products table)
DROP TABLE IF EXISTS public.inventory_items CASCADE;
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  cost_method VARCHAR(20) DEFAULT 'wac' CHECK (cost_method IN ('fifo', 'wac', 'standard')),
  current_cost DECIMAL(15,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 INVENTORY STOCK (Current quantities)
DROP TABLE IF EXISTS public.inventory_stock CASCADE;
CREATE TABLE public.inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity_on_hand DECIMAL(15,3) DEFAULT 0,
  quantity_reserved DECIMAL(15,3) DEFAULT 0,
  average_cost DECIMAL(15,4) DEFAULT 0,
  last_movement_date DATE,
  UNIQUE(item_id, warehouse_id)
);

-- 4.4 COST LAYERS (For FIFO tracking)
DROP TABLE IF EXISTS public.cost_layers CASCADE;
CREATE TABLE public.cost_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  layer_date DATE NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL,
  remaining_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  is_consumed BOOLEAN DEFAULT false,
  reference_type VARCHAR(50), -- 'purchase', 'opening'
  reference_id UUID
);

-- 4.5 RETAIL SALES (Point of Sale)
DROP TABLE IF EXISTS public.retail_sales CASCADE;
CREATE TABLE public.retail_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name VARCHAR(200),
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  cogs_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, invoice_number)
);

-- 4.6 RETAIL SALE LINES
DROP TABLE IF EXISTS public.retail_sale_lines CASCADE;
CREATE TABLE public.retail_sale_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.retail_sales(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  total_cost DECIMAL(15,2) NOT NULL,
  cost_layers_used UUID[] -- For FIFO audit trail
);

-- 4.7 PURCHASE INVOICES
DROP TABLE IF EXISTS public.purchase_invoices CASCADE;
CREATE TABLE public.purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  invoice_date DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  warehouse_id UUID REFERENCES public.warehouses(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.8 PURCHASE LINES
DROP TABLE IF EXISTS public.purchase_lines CASCADE;
CREATE TABLE public.purchase_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL
);

-- ============================================================
-- SECTION 5: RESTAURANT MODULE (BOM - Bill of Materials)
-- ============================================================
-- For: Restaurants, Cafes, Food trucks

-- 5.1 MENU ITEMS WITH COSTING
DROP TABLE IF EXISTS public.menu_items_costing CASCADE;
CREATE TABLE public.menu_items_costing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  theoretical_cost DECIMAL(15,4) DEFAULT 0,
  actual_cost DECIMAL(15,4) DEFAULT 0,
  target_margin DECIMAL(5,2) DEFAULT 30, -- 30%
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 RECIPE COMPONENTS (BOM)
DROP TABLE IF EXISTS public.recipe_components CASCADE;
CREATE TABLE public.recipe_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  quantity_required DECIMAL(15,4) NOT NULL, -- 0.15 kg beef
  wastage_percent DECIMAL(5,2) DEFAULT 0,
  unit_cost_at_time DECIMAL(15,4), -- Snapshot when added
  line_order INTEGER DEFAULT 0
);

-- 5.3 RESTAURANT ORDERS
DROP TABLE IF EXISTS public.restaurant_orders CASCADE;
CREATE TABLE public.restaurant_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  table_number VARCHAR(50),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  cogs_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.4 RESTAURANT ORDER LINES
DROP TABLE IF EXISTS public.restaurant_order_lines CASCADE;
CREATE TABLE public.restaurant_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,4) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  theoretical_cogs DECIMAL(15,2) NOT NULL, -- From recipe
  actual_cogs DECIMAL(15,2) NOT NULL -- From current inventory costs
);

-- 5.5 INVENTORY CONSUMPTION (Auto-created from orders)
DROP TABLE IF EXISTS public.inventory_consumption CASCADE;
CREATE TABLE public.inventory_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.restaurant_orders(id),
  item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id),
  consumed_qty DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL,
  total_cost DECIMAL(15,2) NOT NULL,
  consumed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 6: PHARMACY MODULE (Batch Tracking)
-- ============================================================
-- For: Pharmacies, Drug stores

-- 6.1 INVENTORY BATCHES
DROP TABLE IF EXISTS public.inventory_batches CASCADE;
CREATE TABLE public.inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  initial_qty DECIMAL(15,3) NOT NULL,
  remaining_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(15,4) NOT NULL,
  -- is_expired removed: use view or check expiry_date directly
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'consumed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 BATCH CONSUMPTION (FIFO by batch)
DROP TABLE IF EXISTS public.batch_consumption CASCADE;
CREATE TABLE public.batch_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE CASCADE,
  sale_line_id UUID REFERENCES public.retail_sale_lines(id),
  consumed_qty DECIMAL(15,3) NOT NULL,
  consumed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 7: EXPENSES MODULE (All Businesses)
-- ============================================================

DROP TABLE IF EXISTS public.expense_vouchers CASCADE;
CREATE TABLE public.expense_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  voucher_number VARCHAR(50) NOT NULL,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_account_id UUID REFERENCES public.chart_of_accounts(id) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50),
  bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, voucher_number)
);

-- ============================================================
-- SECTION 8: INDEXES & RLS
-- ============================================================

-- Indexes for performance
CREATE INDEX idx_journal_entries_restaurant_date ON public.journal_entries(restaurant_id, entry_date);
CREATE INDEX idx_journal_lines_account ON public.journal_entry_lines(account_id);
CREATE INDEX idx_retail_sales_restaurant ON public.retail_sales(restaurant_id, sale_date);
CREATE INDEX idx_cost_layers_item ON public.cost_layers(item_id, layer_date);
CREATE INDEX idx_inventory_batches_expiry ON public.inventory_batches(expiry_date);

-- Enable RLS
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_vouchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY restaurant_isolation_fiscal ON public.fiscal_periods
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY restaurant_isolation_coa ON public.chart_of_accounts
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY restaurant_isolation_journal ON public.journal_entries
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Function to validate journal entry balance
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_debit != NEW.total_credit THEN
    RAISE EXCEPTION 'Journal entry is not balanced: debit % != credit %', NEW.total_debit, NEW.total_credit;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_journal_balance
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION validate_journal_balance();

-- Function to auto-post journal entry
CREATE OR REPLACE FUNCTION post_journal_entry(p_entry_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.journal_entries
  SET is_posted = true, posted_at = NOW()
  WHERE id = p_entry_id;
END;
$$ LANGUAGE plpgsql;
