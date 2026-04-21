-- ============================================================
-- ERP COMPLETE SYSTEM - PRODUCTION-GRADE ARCHITECTURE
-- ============================================================
-- Layer 1: Financial Core
-- Layer 2: Inventory Costing Engine
-- Layer 3: Posting Engine
-- Layer 4: Operations Modules
-- Layer 5: Reporting Engine
-- ============================================================

-- ============================================================
-- LAYER 1: FINANCIAL CORE
-- ============================================================

-- 1.1 COMPANIES (Multi-tenant support)
-- ============================================================
DROP TABLE IF EXISTS public.companies CASCADE;
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200),
  tax_id VARCHAR(50),
  commercial_registration VARCHAR(50),
  industry_type VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'EGP',
  fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link to existing restaurants
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 1.2 FISCAL YEARS
-- ============================================================
DROP TABLE IF EXISTS public.fiscal_years CASCADE;
CREATE TABLE public.fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  year_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'locked')),
  opening_balances_posted BOOLEAN DEFAULT false,
  closing_date TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year_number)
);

-- 1.3 FISCAL PERIODS (Monthly)
-- ============================================================
DROP TABLE IF EXISTS public.fiscal_periods CASCADE;
CREATE TABLE public.fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  fiscal_year_id UUID REFERENCES public.fiscal_years(id) ON DELETE CASCADE NOT NULL,
  period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 12),
  period_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'locked')),
  is_posting_allowed BOOLEAN DEFAULT true,
  posting_restriction_reason TEXT,
  
  -- Summary data (denormalized)
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_expenses DECIMAL(15,2) DEFAULT 0,
  net_profit DECIMAL(15,2) DEFAULT 0,
  
  closing_date TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, fiscal_year_id, period_number)
);

-- 1.4 CHART OF ACCOUNTS (Hierarchical)
-- ============================================================
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'cogs')),
  subtype VARCHAR(30) NOT NULL CHECK (subtype IN (
    'current_asset', 'fixed_asset', 'inventory', 'receivable', 'bank', 'cash',
    'current_liability', 'long_term_liability', 'payable',
    'equity', 'retained_earnings',
    'sales_revenue', 'other_revenue',
    'cogs', 'operating_expense', 'admin_expense', 'financial_expense'
  )),
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  path VARCHAR(100) NOT NULL, -- Full path like "1.01.001"
  
  -- Account flags
  is_bank_account BOOLEAN DEFAULT false,
  is_cash_account BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Balances
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  budget_amount DECIMAL(15,2),
  
  -- Dimensions
  cost_center_allowed BOOLEAN DEFAULT false,
  project_allowed BOOLEAN DEFAULT false,
  
  -- Metadata
  currency VARCHAR(3) DEFAULT 'EGP',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, code)
);

-- 1.5 ACCOUNT BALANCES (Period-based)
-- ============================================================
DROP TABLE IF EXISTS public.account_balances CASCADE;
CREATE TABLE public.account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE NOT NULL,
  fiscal_period_id UUID REFERENCES public.fiscal_periods(id) ON DELETE CASCADE NOT NULL,
  
  opening_balance DECIMAL(15,2) DEFAULT 0,
  debit_movement DECIMAL(15,2) DEFAULT 0,
  credit_movement DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2) DEFAULT 0,
  
  budget_amount DECIMAL(15,2) DEFAULT 0,
  variance_amount DECIMAL(15,2) DEFAULT 0,
  variance_percent DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, fiscal_period_id)
);

-- 1.6 JOURNAL ENTRIES
-- ============================================================
DROP TABLE IF EXISTS public.journal_entries CASCADE;
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  fiscal_period_id UUID REFERENCES public.fiscal_periods(id) ON DELETE CASCADE NOT NULL,
  
  entry_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL,
  
  source VARCHAR(30) NOT NULL CHECK (source IN (
    'manual', 'sales_invoice', 'sales_return', 'purchase_invoice', 'purchase_return',
    'payment', 'receipt', 'expense', 'inventory', 'costing', 'payroll', 'closing', 'opening', 'system'
  )),
  
  reference_type VARCHAR(50),
  reference_id UUID,
  
  description TEXT NOT NULL,
  notes TEXT,
  
  -- Totals
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
  is_recurring BOOLEAN DEFAULT false,
  recurring_template_id UUID,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),
  reversed_at TIMESTAMPTZ,
  reverse_reason TEXT,
  original_entry_id UUID REFERENCES public.journal_entries(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, entry_number)
);

-- 1.7 JOURNAL ENTRY LINES
-- ============================================================
DROP TABLE IF EXISTS public.journal_entry_lines CASCADE;
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id) NOT NULL,
  
  -- Double-entry amounts
  debit DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  
  -- Dimensions
  cost_center_id UUID,
  project_id UUID,
  branch_id UUID,
  
  description TEXT,
  line_reference VARCHAR(100),
  line_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.8 COST CENTERS
-- ============================================================
DROP TABLE IF EXISTS public.cost_centers CASCADE;
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  parent_id UUID REFERENCES public.cost_centers(id),
  manager_id UUID,
  budget_amount DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- 1.9 PROJECTS
-- ============================================================
DROP TABLE IF EXISTS public.projects CASCADE;
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Project details
  customer_id UUID,
  project_manager_id UUID,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  
  -- Financial
  budget_amount DECIMAL(15,2) DEFAULT 0,
  actual_cost DECIMAL(15,2) DEFAULT 0,
  revenue_recognized DECIMAL(15,2) DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- ============================================================
-- LAYER 2: INVENTORY COSTING ENGINE
-- ============================================================

-- 2.1 WAREHOUSES
-- ============================================================
DROP TABLE IF EXISTS public.warehouses CASCADE;
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  location TEXT,
  manager_id UUID,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  allow_negative_stock BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- 2.2 INVENTORY PRODUCTS (extends products table)
-- ============================================================
DROP TABLE IF EXISTS public.inventory_products CASCADE;
CREATE TABLE public.inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  category_id UUID,
  
  -- Costing
  costing_method VARCHAR(20) DEFAULT 'weighted_average' CHECK (costing_method IN ('fifo', 'weighted_average', 'standard_cost')),
  standard_cost DECIMAL(15,4) DEFAULT 0,
  average_cost DECIMAL(15,4) DEFAULT 0,
  last_purchase_price DECIMAL(15,4) DEFAULT 0,
  
  -- Tracking
  unit_of_measure VARCHAR(50) DEFAULT 'piece',
  weight DECIMAL(10,3),
  track_expiry BOOLEAN DEFAULT false,
  track_batches BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_inventory_item BOOLEAN DEFAULT true,
  
  -- Accounting links
  inventory_account_id UUID REFERENCES public.chart_of_accounts(id),
  cogs_account_id UUID REFERENCES public.chart_of_accounts(id),
  revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, sku)
);

-- 2.3 INVENTORY LEVELS
-- ============================================================
DROP TABLE IF EXISTS public.inventory_levels CASCADE;
CREATE TABLE public.inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.inventory_products(id) ON DELETE CASCADE NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  
  -- Quantities
  quantity_on_hand DECIMAL(15,3) DEFAULT 0,
  quantity_reserved DECIMAL(15,3) DEFAULT 0,
  quantity_available DECIMAL(15,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  
  -- Valuation
  average_cost DECIMAL(15,4) DEFAULT 0,
  total_value DECIMAL(15,2) DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

-- 2.4 COST LAYERS (FIFO tracking)
-- ============================================================
DROP TABLE IF EXISTS public.cost_layers CASCADE;
CREATE TABLE public.cost_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.inventory_products(id) ON DELETE CASCADE NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  
  layer_date DATE NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  
  quantity DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL,
  total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  
  remaining_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  consumed_quantity DECIMAL(15,3) DEFAULT 0,
  
  is_consumed BOOLEAN DEFAULT false,
  consumed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 INVENTORY MOVEMENTS
-- ============================================================
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.inventory_products(id) ON DELETE CASCADE NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN (
    'purchase', 'purchase_return', 'sale', 'sale_return', 'adjustment',
    'transfer_in', 'transfer_out', 'production_in', 'production_out', 'opening_balance'
  )),
  movement_date DATE NOT NULL,
  
  quantity DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL DEFAULT 0,
  total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  reference_line_id UUID,
  
  source_warehouse_id UUID REFERENCES public.warehouses(id),
  destination_warehouse_id UUID REFERENCES public.warehouses(id),
  
  cost_layer_ids UUID[],
  
  batch_number VARCHAR(50),
  expiry_date DATE,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  journal_entry_id UUID REFERENCES public.journal_entries(id)
);

-- 2.6 INVENTORY BATCHES (for pharmacy/food tracking)
-- ============================================================
DROP TABLE IF EXISTS public.inventory_batches CASCADE;
CREATE TABLE public.inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.inventory_products(id) ON DELETE CASCADE NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  
  batch_number VARCHAR(100) NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  
  initial_quantity DECIMAL(15,3) NOT NULL,
  remaining_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  
  unit_cost DECIMAL(15,4) NOT NULL,
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'consumed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 BILL OF MATERIALS
-- ============================================================
DROP TABLE IF EXISTS public.bill_of_materials CASCADE;
CREATE TABLE public.bill_of_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.inventory_products(id) NOT NULL,
  version VARCHAR(10) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  
  standard_labor_cost DECIMAL(15,4) DEFAULT 0,
  standard_overhead_cost DECIMAL(15,4) DEFAULT 0,
  standard_total_cost DECIMAL(15,4) DEFAULT 0,
  
  expected_yield_quantity DECIMAL(15,3) DEFAULT 1,
  expected_yield_percentage DECIMAL(5,2) DEFAULT 100,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, version)
);

-- 2.8 BOM COMPONENTS
-- ============================================================
DROP TABLE IF EXISTS public.bom_components CASCADE;
CREATE TABLE public.bom_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID REFERENCES public.bill_of_materials(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.inventory_products(id) NOT NULL,
  
  quantity_required DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit_of_measure VARCHAR(50) DEFAULT 'piece',
  wastage_percentage DECIMAL(5,2) DEFAULT 0,
  
  standard_cost DECIMAL(15,4) DEFAULT 0,
  
  is_optional BOOLEAN DEFAULT false,
  substitution_allowed BOOLEAN DEFAULT false,
  
  line_order INTEGER DEFAULT 0
);

-- 2.9 PRODUCTION ORDERS
-- ============================================================
DROP TABLE IF EXISTS public.production_orders CASCADE;
CREATE TABLE public.production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bom_id UUID REFERENCES public.bill_of_materials(id) NOT NULL,
  
  order_number VARCHAR(50) NOT NULL,
  order_date DATE NOT NULL,
  planned_quantity DECIMAL(15,3) NOT NULL,
  actual_quantity DECIMAL(15,3),
  
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  
  actual_material_cost DECIMAL(15,2) DEFAULT 0,
  actual_labor_cost DECIMAL(15,2) DEFAULT 0,
  actual_overhead_cost DECIMAL(15,2) DEFAULT 0,
  actual_total_cost DECIMAL(15,2) DEFAULT 0,
  
  material_variance DECIMAL(15,2) DEFAULT 0,
  labor_variance DECIMAL(15,2) DEFAULT 0,
  overhead_variance DECIMAL(15,2) DEFAULT 0,
  
  source_warehouse_id UUID REFERENCES public.warehouses(id),
  destination_warehouse_id UUID REFERENCES public.warehouses(id),
  
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(company_id, order_number)
);

-- ============================================================
-- LAYER 3: OPERATIONS MODULES
-- ============================================================

-- 3.1 CUSTOMERS (Enhanced)
-- ============================================================
DROP TABLE IF EXISTS public.customers CASCADE;
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  
  customer_code VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200),
  tax_id VARCHAR(50),
  
  -- Contact
  email VARCHAR(100),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  
  -- Address
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Egypt',
  
  -- Financial
  currency VARCHAR(3) DEFAULT 'EGP',
  credit_limit DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  
  -- Accounting links
  receivable_account_id UUID REFERENCES public.chart_of_accounts(id),
  revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 SUPPLIERS (Enhanced)
-- ============================================================
DROP TABLE IF EXISTS public.suppliers CASCADE;
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  
  supplier_code VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200),
  tax_id VARCHAR(50),
  
  -- Contact
  email VARCHAR(100),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  
  -- Address
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Egypt',
  
  -- Financial
  currency VARCHAR(3) DEFAULT 'EGP',
  credit_limit DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  
  -- Accounting links
  payable_account_id UUID REFERENCES public.chart_of_accounts(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 SALES INVOICES
-- ============================================================
DROP TABLE IF EXISTS public.sales_invoices CASCADE;
CREATE TABLE public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  fiscal_period_id UUID REFERENCES public.fiscal_periods(id) NOT NULL,
  
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  
  -- Amounts
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Payment
  amount_paid DECIMAL(15,2) DEFAULT 0,
  amount_due DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'partial', 'paid', 'cancelled')),
  
  -- References
  order_id UUID,
  quote_id UUID,
  
  -- Accounting
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  cogs_entry_id UUID REFERENCES public.journal_entries(id),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, invoice_number)
);

-- 3.4 SALES INVOICE LINES
-- ============================================================
DROP TABLE IF EXISTS public.sales_invoice_lines CASCADE;
CREATE TABLE public.sales_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE NOT NULL,
  
  product_id UUID REFERENCES public.inventory_products(id),
  
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Costing (for COGS)
  unit_cost DECIMAL(15,4) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  
  line_order INTEGER DEFAULT 0,
  
  project_id UUID REFERENCES public.projects(id),
  cost_center_id UUID REFERENCES public.cost_centers(id)
);

-- 3.5 PURCHASE INVOICES
-- ============================================================
DROP TABLE IF EXISTS public.purchase_invoices CASCADE;
CREATE TABLE public.purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  fiscal_period_id UUID REFERENCES public.fiscal_periods(id) NOT NULL,
  
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
  
  -- Amounts
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Payment
  amount_paid DECIMAL(15,2) DEFAULT 0,
  amount_due DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'partial', 'paid', 'cancelled')),
  
  -- References
  order_id UUID,
  
  -- Accounting
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, invoice_number)
);

-- 3.6 PURCHASE INVOICE LINES
-- ============================================================
DROP TABLE IF EXISTS public.purchase_invoice_lines CASCADE;
CREATE TABLE public.purchase_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.purchase_invoices(id) ON DELETE CASCADE NOT NULL,
  
  product_id UUID REFERENCES public.inventory_products(id),
  
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  line_order INTEGER DEFAULT 0,
  
  project_id UUID REFERENCES public.projects(id),
  cost_center_id UUID REFERENCES public.cost_centers(id)
);

-- 3.7 PAYMENTS
-- ============================================================
DROP TABLE IF EXISTS public.payments CASCADE;
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  fiscal_period_id UUID REFERENCES public.fiscal_periods(id) NOT NULL,
  
  payment_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  
  -- Payee
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('customer', 'supplier', 'expense', 'other')),
  entity_id UUID, -- Can be customer, supplier, or expense account
  entity_type VARCHAR(50), -- 'customer', 'supplier', 'account'
  
  -- Amount
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EGP',
  
  -- Payment method
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'card', 'other')),
  bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  check_number VARCHAR(50),
  
  -- References
  reference_type VARCHAR(50),
  reference_id UUID,
  
  -- Allocation (for customer/supplier payments)
  applied_amount DECIMAL(15,2) DEFAULT 0,
  unapplied_amount DECIMAL(15,2) DEFAULT 0,
  
  description TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  
  -- Accounting
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, payment_number)
);

-- 3.8 EXPENSE VOUCHERS
-- ============================================================
DROP TABLE IF EXISTS public.expense_vouchers CASCADE;
CREATE TABLE public.expense_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  fiscal_period_id UUID REFERENCES public.fiscal_periods(id) NOT NULL,
  
  voucher_number VARCHAR(50) NOT NULL,
  voucher_date DATE NOT NULL,
  
  -- Expense details
  expense_account_id UUID REFERENCES public.chart_of_accounts(id) NOT NULL,
  category VARCHAR(100),
  
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Payment
  payment_method VARCHAR(50),
  bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  
  -- Dimensions
  cost_center_id UUID REFERENCES public.cost_centers(id),
  project_id UUID REFERENCES public.projects(id),
  
  description TEXT,
  
  -- References
  reference_type VARCHAR(50),
  reference_id UUID,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  
  -- Accounting
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, voucher_number)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Journal entries
CREATE INDEX idx_journal_entries_company_date ON public.journal_entries(company_id, entry_date);
CREATE INDEX idx_journal_entries_source ON public.journal_entries(source, reference_type, reference_id);
CREATE INDEX idx_journal_lines_account ON public.journal_entry_lines(account_id);
CREATE INDEX idx_journal_lines_entry ON public.journal_entry_lines(entry_id);

-- Inventory
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id, movement_date);
CREATE INDEX idx_inventory_movements_warehouse ON public.inventory_movements(warehouse_id);
CREATE INDEX idx_cost_layers_product ON public.cost_layers(product_id, warehouse_id, layer_date);
CREATE INDEX idx_inventory_levels_product_warehouse ON public.inventory_levels(product_id, warehouse_id);

-- Operations
CREATE INDEX idx_sales_invoices_customer ON public.sales_invoices(customer_id, status);
CREATE INDEX idx_sales_invoices_date ON public.sales_invoices(company_id, invoice_date);
CREATE INDEX idx_purchase_invoices_supplier ON public.purchase_invoices(supplier_id, status);
CREATE INDEX idx_purchase_invoices_date ON public.purchase_invoices(company_id, invoice_date);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_companies_timestamp BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_of_accounts_timestamp BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fiscal_periods_timestamp BEFORE UPDATE ON public.fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_products_timestamp BEFORE UPDATE ON public.inventory_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_timestamp BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_timestamp BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_invoices_timestamp BEFORE UPDATE ON public.sales_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_invoices_timestamp BEFORE UPDATE ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;

-- Company isolation policy
CREATE POLICY company_isolation ON public.companies
  FOR ALL USING (
    id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

-- Helper table for user-company relationships
CREATE TABLE IF NOT EXISTS public.user_companies (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

-- Enable RLS on user_companies
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_companies_isolation ON public.user_companies
  FOR ALL USING (user_id = auth.uid());
