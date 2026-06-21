-- Marketing Company Module Tables
-- This migration creates tables for marketing contracts, projects, tasks, messaging, KPIs, and financial tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. contracts table (التعاقدات)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  client_name TEXT NOT NULL,
  client_contact TEXT,
  client_phone TEXT,
  client_email TEXT,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('MARKETING', 'ADVERTISING', 'SOCIAL_MEDIA', 'EVENT', 'CONTENT')),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  total_amount DECIMAL(15,2) DEFAULT 0,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  currency TEXT NOT NULL DEFAULT 'EGP' CHECK (currency IN ('EGP', 'USD')),
  accounting_account_code TEXT,
  revenue_account_code TEXT,
  notes TEXT,
  attachments JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. projects table (مشاريع التنفيذ)
CREATE TABLE IF NOT EXISTS marketing_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  project_type TEXT NOT NULL CHECK (project_type IN ('CAMPAIGN', 'CONTENT_CREATION', 'EVENT_MANAGEMENT', 'SOCIAL_MEDIA_MANAGEMENT')),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  budget DECIMAL(15,2) DEFAULT 0,
  spent_budget DECIMAL(15,2) DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_members UUID[],
  notes TEXT,
  attachments JSONB,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. tasks table (المهام)
CREATE TABLE IF NOT EXISTS marketing_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('MARKETING', 'DESIGN', 'WRITING', 'APPROVAL', 'REPORTING')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  due_date DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  description TEXT,
  attachments JSONB,
  parent_task_id UUID REFERENCES marketing_tasks(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. employee_messages table (التواصل الفوري)
CREATE TABLE IF NOT EXISTS employee_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID,
  message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'FILE', 'VIDEO')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  related_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES marketing_tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. kpi_definitions table (تعريف KPIs)
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  kpi_type TEXT NOT NULL CHECK (kpi_type IN ('REVENUE', 'PROFIT', 'EFFICIENCY', 'QUALITY', 'GROWTH')),
  calculation_formula TEXT,
  target_value DECIMAL(15,2),
  unit TEXT CHECK (unit IN ('EGP', 'USD', '%', 'COUNT', 'HOUR')),
  frequency TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  department TEXT CHECK (department IN ('MARKETING', 'SALES', 'OPERATIONS', 'FINANCE')),
  is_active BOOLEAN DEFAULT TRUE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. kpi_results table (نتائج KPIs)
CREATE TABLE IF NOT EXISTS kpi_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id UUID REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_value DECIMAL(15,2),
  target_value DECIMAL(15,2),
  variance DECIMAL(15,2) GENERATED ALWAYS AS (actual_value - target_value) STORED,
  variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN target_value = 0 THEN 0 ELSE ((actual_value - target_value) / target_value) * 100 END) STORED,
  department_id UUID,
  calculated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. marketing_revenues table (إيرادات التسويق)
CREATE TABLE IF NOT EXISTS marketing_revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('CONTRACT_VALUE', 'EXTRA_SERVICE', 'PENALTY', 'REFUND')),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP' CHECK (currency IN ('EGP', 'USD')),
  payment_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID')),
  accounting_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  invoice_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. marketing_expenses table (مصروفات التسويق)
CREATE TABLE IF NOT EXISTS marketing_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('MEDIA_BUY', 'PRODUCTION', 'TRAVEL', 'ACCOMMODATION', 'SALARY', 'OUTSIDE_SERVICES')),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP' CHECK (currency IN ('EGP', 'USD')),
  expense_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID')),
  vendor_name TEXT,
  vendor_id UUID,
  accounting_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  invoice_number TEXT,
  attachments JSONB,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_restaurant_id ON contracts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);

CREATE INDEX IF NOT EXISTS idx_marketing_projects_restaurant_id ON marketing_projects(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_projects_contract_id ON marketing_projects(contract_id);
CREATE INDEX IF NOT EXISTS idx_marketing_projects_status ON marketing_projects(status);

CREATE INDEX IF NOT EXISTS idx_marketing_tasks_restaurant_id ON marketing_tasks(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_tasks_project_id ON marketing_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_marketing_tasks_contract_id ON marketing_tasks(contract_id);
CREATE INDEX IF NOT EXISTS idx_marketing_tasks_status ON marketing_tasks(status);
CREATE INDEX IF NOT EXISTS idx_marketing_tasks_assigned_to ON marketing_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_employee_messages_sender_id ON employee_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_employee_messages_receiver_id ON employee_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_employee_messages_thread_id ON employee_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_employee_messages_restaurant_id ON employee_messages(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_kpi_definitions_restaurant_id ON kpi_definitions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_department ON kpi_definitions(department);

CREATE INDEX IF NOT EXISTS idx_kpi_results_restaurant_id ON kpi_results(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_results_kpi_id ON kpi_results(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_results_period ON kpi_results(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_marketing_revenues_restaurant_id ON marketing_revenues(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_revenues_contract_id ON marketing_revenues(contract_id);
CREATE INDEX IF NOT EXISTS idx_marketing_revenues_project_id ON marketing_revenues(project_id);

CREATE INDEX IF NOT EXISTS idx_marketing_expenses_restaurant_id ON marketing_expenses(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_expenses_contract_id ON marketing_expenses(contract_id);
CREATE INDEX IF NOT EXISTS idx_marketing_expenses_project_id ON marketing_expenses(project_id);

-- Enable Row Level Security
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contracts
CREATE POLICY "Users can view contracts in their restaurant" ON contracts
  FOR SELECT USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert contracts in their restaurant" ON contracts
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update contracts in their restaurant" ON contracts
  FOR UPDATE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete contracts in their restaurant" ON contracts
  FOR DELETE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

-- RLS Policies for marketing_projects
CREATE POLICY "Users can view projects in their restaurant" ON marketing_projects
  FOR SELECT USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert projects in their restaurant" ON marketing_projects
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update projects in their restaurant" ON marketing_projects
  FOR UPDATE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete projects in their restaurant" ON marketing_projects
  FOR DELETE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

-- RLS Policies for marketing_tasks
CREATE POLICY "Users can view tasks in their restaurant" ON marketing_tasks
  FOR SELECT USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert tasks in their restaurant" ON marketing_tasks
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update tasks in their restaurant" ON marketing_tasks
  FOR UPDATE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete tasks in their restaurant" ON marketing_tasks
  FOR DELETE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

-- RLS Policies for employee_messages
CREATE POLICY "Users can view messages they sent or received" ON employee_messages
  FOR SELECT USING (
    sender_id = auth.uid() 
    OR receiver_id = auth.uid()
    OR restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert messages" ON employee_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update messages they sent" ON employee_messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete messages they sent" ON employee_messages
  FOR DELETE USING (sender_id = auth.uid());

-- RLS Policies for kpi_definitions
CREATE POLICY "Users can view KPIs in their restaurant" ON kpi_definitions
  FOR SELECT USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert KPIs in their restaurant" ON kpi_definitions
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update KPIs in their restaurant" ON kpi_definitions
  FOR UPDATE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete KPIs in their restaurant" ON kpi_definitions
  FOR DELETE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

-- RLS Policies for kpi_results
CREATE POLICY "Users can view KPI results in their restaurant" ON kpi_results
  FOR SELECT USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert KPI results in their restaurant" ON kpi_results
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update KPI results in their restaurant" ON kpi_results
  FOR UPDATE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete KPI results in their restaurant" ON kpi_results
  FOR DELETE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

-- RLS Policies for marketing_revenues
CREATE POLICY "Users can view revenues in their restaurant" ON marketing_revenues
  FOR SELECT USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert revenues in their restaurant" ON marketing_revenues
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update revenues in their restaurant" ON marketing_revenues
  FOR UPDATE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete revenues in their restaurant" ON marketing_revenues
  FOR DELETE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

-- RLS Policies for marketing_expenses
CREATE POLICY "Users can view expenses in their restaurant" ON marketing_expenses
  FOR SELECT USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert expenses in their restaurant" ON marketing_expenses
  FOR INSERT WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update expenses in their restaurant" ON marketing_expenses
  FOR UPDATE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete expenses in their restaurant" ON marketing_expenses
  FOR DELETE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
