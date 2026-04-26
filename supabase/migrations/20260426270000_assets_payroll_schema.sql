-- ============================================================
-- FIXED ASSETS & PAYROLL DATABASE SCHEMA
-- ============================================================

BEGIN;

-- 1. Fixed Assets Table
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'machinery', 'furniture', 'vehicles', 'buildings'
  purchase_date DATE NOT NULL,
  purchase_value DECIMAL(15,2) NOT NULL,
  salvage_value DECIMAL(15,2) DEFAULT 0,
  useful_life_years INTEGER NOT NULL, -- Depreciation period
  depreciation_method VARCHAR(20) DEFAULT 'straight_line',
  accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
  current_value DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'disposed', 'fully_depreciated'
  asset_account_id UUID REFERENCES public.chart_of_accounts(id), -- e.g., 1201 Machinery
  depreciation_account_id UUID REFERENCES public.chart_of_accounts(id), -- e.g., 5301 Depreciation Exp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff & Payroll Table
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  position VARCHAR(100),
  basic_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
  allowances DECIMAL(15,2) DEFAULT 0,
  deductions DECIMAL(15,2) DEFAULT 0,
  hire_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Payroll Transactions
CREATE TABLE IF NOT EXISTS public.payroll_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  net_salary DECIMAL(15,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
