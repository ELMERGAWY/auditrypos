-- ============================================================
-- MARKETING AGENCY MANAGEMENT SYSTEM
-- ============================================================
-- Comprehensive system for marketing agencies including:
-- - Projects & Timesheet Management
-- - CRM & Sales Pipeline
-- - Retainer Contracts Management
-- - Expenses & Freelancer Management
-- - Facebook Pages Integration
-- - Multi-tenant Employee Access
-- - Revenue Recognition
-- ============================================================

-- ============================================================
-- 1. PROJECTS & TIMESHEET MANAGEMENT
-- ============================================================

-- Projects Table
CREATE TABLE IF NOT EXISTS marketing_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    project_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    project_type VARCHAR(50) NOT NULL DEFAULT 'project' CHECK (project_type IN ('project', 'retainer', 'hourly', 'fixed')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Budget & Financials
    budget_amount DECIMAL(18,4) DEFAULT 0,
    budget_currency VARCHAR(10) DEFAULT 'EGP',
    actual_cost DECIMAL(18,4) DEFAULT 0,
    actual_revenue DECIMAL(18,4) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    
    -- Dates
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Team
    project_manager_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    
    -- Metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_project_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_marketing_projects_restaurant ON marketing_projects(restaurant_id);
CREATE INDEX idx_marketing_projects_client ON marketing_projects(client_id);
CREATE INDEX idx_marketing_projects_status ON marketing_projects(status);
CREATE INDEX idx_marketing_projects_dates ON marketing_projects(start_date, end_date);

-- Project Tasks
CREATE TABLE IF NOT EXISTS marketing_project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES marketing_projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES marketing_project_tasks(id) ON DELETE SET NULL,
    
    task_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    
    -- Task Details
    task_type VARCHAR(50) DEFAULT 'task' CHECK (task_type IN ('milestone', 'task', 'subtask')),
    status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Time Estimation
    estimated_hours DECIMAL(10,2) DEFAULT 0,
    actual_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Assignment
    assigned_to UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    
    -- Dates
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    due_date DATE,
    
    -- Progress
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Dependencies
    depends_on_task_ids UUID[],
    
    -- Metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_project_tasks_project ON marketing_project_tasks(project_id);
CREATE INDEX idx_marketing_project_tasks_assigned ON marketing_project_tasks(assigned_to);
CREATE INDEX idx_marketing_project_tasks_status ON marketing_project_tasks(status);
CREATE INDEX idx_marketing_project_tasks_dates ON marketing_project_tasks(due_date);

-- Timesheet Entries
CREATE TABLE IF NOT EXISTS marketing_timesheet_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES marketing_project_tasks(id) ON DELETE SET NULL,
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    
    -- Time Details
    work_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    hours_worked DECIMAL(10,2) NOT NULL,
    
    -- Description
    description TEXT,
    activity_type VARCHAR(50) DEFAULT 'billable' CHECK (activity_type IN ('billable', 'non_billable', 'overtime', 'meeting')),
    
    -- Billing
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    billable_amount DECIMAL(10,2) DEFAULT 0,
    is_billable BOOLEAN DEFAULT TRUE,
    
    -- Approval
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_timesheet_staff ON marketing_timesheet_entries(staff_id);
CREATE INDEX idx_marketing_timesheet_project ON marketing_timesheet_entries(project_id);
CREATE INDEX idx_marketing_timesheet_date ON marketing_timesheet_entries(work_date);
CREATE INDEX idx_marketing_timesheet_approval ON marketing_timesheet_entries(is_approved);

-- ============================================================
-- 2. CRM & SALES PIPELINE
-- ============================================================

-- CRM Leads / Opportunities
CREATE TABLE IF NOT EXISTS marketing_crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Lead Information
    lead_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(255),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    
    -- Lead Details
    lead_source VARCHAR(50) DEFAULT 'other' CHECK (lead_source IN ('website', 'referral', 'social_media', 'cold_call', 'email', 'event', 'other')),
    lead_status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    pipeline_stage VARCHAR(50) NOT NULL DEFAULT 'new',
    
    -- Opportunity Details
    opportunity_value DECIMAL(18,4) DEFAULT 0,
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    
    -- Assignment
    sales_rep_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    
    -- Notes
    notes TEXT,
    next_follow_up DATE,
    
    -- Metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_crm_leads_restaurant ON marketing_crm_leads(restaurant_id);
CREATE INDEX idx_marketing_crm_leads_client ON marketing_crm_leads(client_id);
CREATE INDEX idx_marketing_crm_leads_status ON marketing_crm_leads(lead_status);
CREATE INDEX idx_marketing_crm_leads_pipeline ON marketing_crm_leads(pipeline_stage);
CREATE INDEX idx_marketing_crm_leads_sales_rep ON marketing_crm_leads(sales_rep_id);

-- Pipeline Stages Configuration
CREATE TABLE IF NOT EXISTS marketing_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    stage_name_ar VARCHAR(100),
    stage_order INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    probability_percentage INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_stage_order UNIQUE (restaurant_id, stage_order)
);

CREATE INDEX idx_marketing_pipeline_stages_restaurant ON marketing_pipeline_stages(restaurant_id);

-- ============================================================
-- 3. RETAINER CONTRACTS MANAGEMENT
-- ============================================================

-- Retainer Contracts
CREATE TABLE IF NOT EXISTS marketing_retainer_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
    
    -- Contract Details
    contract_code VARCHAR(50) NOT NULL UNIQUE,
    contract_name VARCHAR(255) NOT NULL,
    contract_type VARCHAR(50) NOT NULL DEFAULT 'monthly' CHECK (contract_type IN ('monthly', 'quarterly', 'annual', 'custom')),
    
    -- Financials
    retainer_amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EGP',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual', 'custom')),
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT FALSE,
    notice_period_days INTEGER DEFAULT 30,
    
    -- Terms
    payment_terms VARCHAR(50) DEFAULT 'net_30',
    invoicing_day INTEGER DEFAULT 1, -- Day of month to invoice
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired', 'terminated')),
    
    -- Revenue Recognition
    revenue_recognition_method VARCHAR(50) DEFAULT 'straight_line' CHECK (revenue_recognition_method IN ('straight_line', 'milestone', 'usage_based')),
    
    -- Metadata
    terms_conditions TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_retainer_dates CHECK (end_date IS NULL OR start_date <= end_date)
);

CREATE INDEX idx_marketing_retainer_contracts_restaurant ON marketing_retainer_contracts(restaurant_id);
CREATE INDEX idx_marketing_retainer_contracts_client ON marketing_retainer_contracts(client_id);
CREATE INDEX idx_marketing_retainer_contracts_status ON marketing_retainer_contracts(status);
CREATE INDEX idx_marketing_retainer_contracts_dates ON marketing_retainer_contracts(start_date, end_date);

-- Retainer Invoices (Auto-generated)
CREATE TABLE IF NOT EXISTS marketing_retainer_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    retainer_contract_id UUID NOT NULL REFERENCES marketing_retainer_contracts(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
    
    -- Invoice Details
    invoice_number VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    invoice_amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EGP',
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'sent', 'paid', 'overdue', 'cancelled')),
    
    -- Revenue Recognition
    recognized_amount DECIMAL(18,4) DEFAULT 0,
    recognition_date DATE,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_retainer_invoices_contract ON marketing_retainer_invoices(retainer_contract_id);
CREATE INDEX idx_marketing_retainer_invoices_status ON marketing_retainer_invoices(status);
CREATE INDEX idx_marketing_retainer_invoices_period ON marketing_retainer_invoices(period_start, period_end);

-- ============================================================
-- 4. EXPENSES & FREELANCER MANAGEMENT
-- ============================================================

-- Freelancers
CREATE TABLE IF NOT EXISTS marketing_freelancers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Personal Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    
    -- Professional Details
    specialization VARCHAR(255),
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'EGP',
    
    -- Payment Details
    payment_method VARCHAR(50) DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'paypal', 'wise', 'crypto', 'cash')),
    bank_account_details JSONB DEFAULT '{}',
    
    -- Tax Information
    tax_id VARCHAR(50),
    vat_number VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_freelancers_restaurant ON marketing_freelancers(restaurant_id);
CREATE INDEX idx_marketing_freelancers_active ON marketing_freelancers(is_active);

-- Ad Spend Expenses (Pass-through to clients)
CREATE TABLE IF NOT EXISTS marketing_ad_spend_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Platform Details
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'google', 'tiktok', 'twitter', 'linkedin', 'snapchat', 'other')),
    platform_account_id VARCHAR(100),
    
    -- Campaign Details
    campaign_name VARCHAR(255),
    campaign_id VARCHAR(100),
    
    -- Financials
    spend_amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    exchange_rate DECIMAL(10,6) DEFAULT 1,
    base_currency_amount DECIMAL(18,4) GENERATED ALWAYS AS (spend_amount * exchange_rate) STORED,
    
    -- Dates
    spend_date DATE NOT NULL,
    
    -- Billing
    is_billable_to_client BOOLEAN DEFAULT TRUE,
    billed_amount DECIMAL(18,4) DEFAULT 0,
    invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'billed', 'paid', 'disputed')),
    
    -- Receipts/Proof
    receipt_url TEXT,
    screenshot_url TEXT,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_ad_spend_restaurant ON marketing_ad_spend_expenses(restaurant_id);
CREATE INDEX idx_marketing_ad_spend_project ON marketing_ad_spend_expenses(project_id);
CREATE INDEX idx_marketing_ad_spend_client ON marketing_ad_spend_expenses(client_id);
CREATE INDEX idx_marketing_ad_spend_date ON marketing_ad_spend_expenses(spend_date);
CREATE INDEX idx_marketing_ad_spend_platform ON marketing_ad_spend_expenses(platform);

-- Freelancer Payments
CREATE TABLE IF NOT EXISTS marketing_freelancer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES marketing_freelancers(id) ON DELETE CASCADE,
    project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
    
    -- Payment Details
    payment_amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EGP',
    payment_date DATE NOT NULL,
    
    -- Work Details
    hours_worked DECIMAL(10,2) DEFAULT 0,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    task_description TEXT,
    
    -- Project Allocation
    project_allocation JSONB DEFAULT '{}', -- {project_id: amount, ...}
    
    -- Payment Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    
    -- Payment Method
    payment_method VARCHAR(50),
    transaction_reference VARCHAR(100),
    
    -- Accounting
    expense_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_freelancer_payments_freelancer ON marketing_freelancer_payments(freelancer_id);
CREATE INDEX idx_marketing_freelancer_payments_project ON marketing_freelancer_payments(project_id);
CREATE INDEX idx_marketing_freelancer_payments_date ON marketing_freelancer_payments(payment_date);
CREATE INDEX idx_marketing_freelancer_payments_status ON marketing_freelancer_payments(status);

-- ============================================================
-- 5. FACEBOOK PAGES INTEGRATION
-- ============================================================

-- Facebook Business Accounts
CREATE TABLE IF NOT EXISTS marketing_facebook_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Account Details
    business_id VARCHAR(100),
    account_name VARCHAR(255),
    
    -- OAuth Tokens (Encrypted)
    access_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    refresh_token_encrypted TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_connected BOOLEAN DEFAULT FALSE,
    
    -- Permissions
    permissions TEXT[],
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_facebook_accounts_restaurant ON marketing_facebook_accounts(restaurant_id);
CREATE INDEX idx_marketing_facebook_accounts_active ON marketing_facebook_accounts(is_active);

-- Facebook Pages
CREATE TABLE IF NOT EXISTS marketing_facebook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    facebook_account_id UUID REFERENCES marketing_facebook_accounts(id) ON DELETE SET NULL,
    client_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
    
    -- Page Details
    page_id VARCHAR(100) NOT NULL,
    page_name VARCHAR(255) NOT NULL,
    page_category VARCHAR(100),
    page_url TEXT,
    
    -- Ad Account
    ad_account_id VARCHAR(100),
    ad_account_name VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_managed BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_facebook_page UNIQUE (page_id, restaurant_id)
);

CREATE INDEX idx_marketing_facebook_pages_restaurant ON marketing_facebook_pages(restaurant_id);
CREATE INDEX idx_marketing_facebook_pages_account ON marketing_facebook_pages(facebook_account_id);
CREATE INDEX idx_marketing_facebook_pages_client ON marketing_facebook_pages(client_id);
CREATE INDEX idx_marketing_facebook_pages_project ON marketing_facebook_pages(project_id);

-- Ad Campaigns Data
CREATE TABLE IF NOT EXISTS marketing_ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    facebook_page_id UUID REFERENCES marketing_facebook_pages(id) ON DELETE SET NULL,
    project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
    
    -- Campaign Details
    campaign_id VARCHAR(100) NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL DEFAULT 'facebook',
    campaign_status VARCHAR(50) DEFAULT 'active',
    
    -- Dates
    start_date DATE,
    end_date DATE,
    
    -- Budget
    daily_budget DECIMAL(18,4),
    lifetime_budget DECIMAL(18,4),
    
    -- Objectives
    campaign_objective VARCHAR(100),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_ad_campaigns_restaurant ON marketing_ad_campaigns(restaurant_id);
CREATE INDEX idx_marketing_ad_campaigns_page ON marketing_ad_campaigns(facebook_page_id);
CREATE INDEX idx_marketing_ad_campaigns_project ON marketing_ad_campaigns(project_id);
CREATE INDEX idx_marketing_ad_campaigns_dates ON marketing_ad_campaigns(start_date, end_date);

-- Ad Performance Metrics (Daily)
CREATE TABLE IF NOT EXISTS marketing_ad_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES marketing_ad_campaigns(id) ON DELETE SET NULL,
    facebook_page_id UUID REFERENCES marketing_facebook_pages(id) ON DELETE SET NULL,
    
    -- Date
    metric_date DATE NOT NULL,
    
    -- Impressions & Reach
    impressions BIGINT DEFAULT 0,
    reach BIGINT DEFAULT 0,
    
    -- Engagement
    clicks BIGINT DEFAULT 0,
    click_through_rate DECIMAL(10,4) DEFAULT 0,
    engagements BIGINT DEFAULT 0,
    engagement_rate DECIMAL(10,4) DEFAULT 0,
    
    -- Conversions
    conversions BIGINT DEFAULT 0,
    conversion_rate DECIMAL(10,4) DEFAULT 0,
    
    -- Financials
    spend DECIMAL(18,4) DEFAULT 0,
    cost_per_click DECIMAL(10,4) DEFAULT 0,
    cost_per_conversion DECIMAL(10,4) DEFAULT 0,
    cost_per_thousand_impressions DECIMAL(10,4) DEFAULT 0,
    
    -- Revenue (if tracked)
    revenue DECIMAL(18,4) DEFAULT 0,
    return_on_ad_spend DECIMAL(10,4) DEFAULT 0,
    
    -- Metadata
    raw_data JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_metric_date UNIQUE (campaign_id, metric_date)
);

CREATE INDEX idx_marketing_ad_performance_campaign ON marketing_ad_performance(campaign_id);
CREATE INDEX idx_marketing_ad_performance_date ON marketing_ad_performance(metric_date);
CREATE INDEX idx_marketing_ad_performance_page ON marketing_ad_performance(facebook_page_id);

-- ============================================================
-- 6. MULTI-TENANT EMPLOYEE ACCESS
-- ============================================================

-- Agency Employees (Separate from restaurant staff)
CREATE TABLE IF NOT EXISTS marketing_agency_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Personal Information
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    
    -- Role & Permissions
    role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee', 'contractor')),
    department VARCHAR(100),
    
    -- Access Control
    can_access_all_projects BOOLEAN DEFAULT FALSE,
    allowed_project_ids UUID[],
    
    -- Hourly Rate (for billing)
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'EGP',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Authentication (No access to main account password)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_agency_employees_restaurant ON marketing_agency_employees(restaurant_id);
CREATE INDEX idx_marketing_agency_employees_user ON marketing_agency_employees(user_id);
CREATE INDEX idx_marketing_agency_employees_active ON marketing_agency_employees(is_active);

-- Employee Project Access
CREATE TABLE IF NOT EXISTS marketing_employee_project_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES marketing_agency_employees(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES marketing_projects(id) ON DELETE CASCADE,
    
    -- Access Level
    access_level VARCHAR(50) DEFAULT 'view' CHECK (access_level IN ('view', 'edit', 'manage', 'admin')),
    
    -- Permissions
    can_view_financials BOOLEAN DEFAULT FALSE,
    can_edit_tasks BOOLEAN DEFAULT TRUE,
    can_log_time BOOLEAN DEFAULT TRUE,
    can_approve_time BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_employee_project UNIQUE (employee_id, project_id)
);

CREATE INDEX idx_marketing_employee_project_access_employee ON marketing_employee_project_access(employee_id);
CREATE INDEX idx_marketing_employee_project_access_project ON marketing_employee_project_access(project_id);

-- ============================================================
-- 7. REVENUE RECOGNITION
-- ============================================================

-- Revenue Recognition Schedule
CREATE TABLE IF NOT EXISTS marketing_revenue_recognition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    retainer_invoice_id UUID REFERENCES marketing_retainer_invoices(id) ON DELETE SET NULL,
    contract_id UUID REFERENCES marketing_retainer_contracts(id) ON DELETE SET NULL,
    
    -- Recognition Details
    total_amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EGP',
    recognition_method VARCHAR(50) DEFAULT 'straight_line',
    
    -- Schedule
    recognition_start_date DATE NOT NULL,
    recognition_end_date DATE NOT NULL,
    recognition_period VARCHAR(20) DEFAULT 'monthly' CHECK (recognition_period IN ('daily', 'weekly', 'monthly', 'quarterly')),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_revenue_recognition_restaurant ON marketing_revenue_recognition(restaurant_id);
CREATE INDEX idx_marketing_revenue_recognition_invoice ON marketing_revenue_recognition(retainer_invoice_id);
CREATE INDEX idx_marketing_revenue_recognition_status ON marketing_revenue_recognition(status);

-- Revenue Recognition Entries
CREATE TABLE IF NOT EXISTS marketing_revenue_recognition_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    recognition_id UUID NOT NULL REFERENCES marketing_revenue_recognition(id) ON DELETE CASCADE,
    
    -- Entry Details
    recognition_date DATE NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EGP',
    
    -- Accounting
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    revenue_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    deferred_revenue_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    
    -- Status
    is_recognized BOOLEAN DEFAULT FALSE,
    recognized_at TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_marketing_revenue_recognition_entries_recognition ON marketing_revenue_recognition_entries(recognition_id);
CREATE INDEX idx_marketing_revenue_recognition_entries_date ON marketing_revenue_recognition_entries(recognition_date);
CREATE INDEX idx_marketing_revenue_recognition_entries_journal ON marketing_revenue_recognition_entries(journal_entry_id);

-- ============================================================
-- 8. CURRENCY EXCHANGE RATES
-- ============================================================

-- Exchange Rates Table
CREATE TABLE IF NOT EXISTS marketing_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Currency Pair
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    
    -- Rate
    exchange_rate DECIMAL(18,8) NOT NULL,
    
    -- Date
    effective_date DATE NOT NULL,
    
    -- Source
    rate_source VARCHAR(50) DEFAULT 'manual',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_currency_date UNIQUE (restaurant_id, from_currency, to_currency, effective_date)
);

CREATE INDEX idx_marketing_exchange_rates_restaurant ON marketing_exchange_rates(restaurant_id);
CREATE INDEX idx_marketing_exchange_rates_date ON marketing_exchange_rates(effective_date);
CREATE INDEX idx_marketing_exchange_rates_pair ON marketing_exchange_rates(from_currency, to_currency);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE marketing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_retainer_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_retainer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_ad_spend_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_facebook_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_ad_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_agency_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_employee_project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_revenue_recognition ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_revenue_recognition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurant_id
CREATE POLICY "Users can view their restaurant's marketing data" ON marketing_projects
    FOR SELECT USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert marketing data for their restaurant" ON marketing_projects
    FOR INSERT WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update marketing data for their restaurant" ON marketing_projects
    FOR UPDATE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete marketing data for their restaurant" ON marketing_projects
    FOR DELETE USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_users WHERE user_id = auth.uid()));

-- Apply similar policies to all other tables (simplified for brevity)
-- In production, create specific policies for each table

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to calculate project profitability
CREATE OR REPLACE FUNCTION calculate_project_profitability(p_project_id UUID)
RETURNS TABLE (
    total_revenue DECIMAL,
    total_cost DECIMAL,
    gross_profit DECIMAL,
    profit_margin DECIMAL,
    hours_billed DECIMAL,
    hours_worked DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_restaurant_id UUID;
BEGIN
    SELECT restaurant_id INTO v_restaurant_id FROM marketing_projects WHERE id = p_project_id;
    
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN status = 'won' THEN opportunity_value ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(actual_cost), 0) as total_cost,
        COALESCE(SUM(CASE WHEN status = 'won' THEN opportunity_value ELSE 0 END), 0) - COALESCE(SUM(actual_cost), 0) as gross_profit,
        CASE 
            WHEN SUM(CASE WHEN status = 'won' THEN opportunity_value ELSE 0 END) > 0 
            THEN ((COALESCE(SUM(CASE WHEN status = 'won' THEN opportunity_value ELSE 0 END), 0) - COALESCE(SUM(actual_cost), 0)) / SUM(CASE WHEN status = 'won' THEN opportunity_value ELSE 0 END)) * 100 
            ELSE 0 
        END as profit_margin,
        COALESCE(SUM(CASE WHEN is_billable = TRUE THEN hours_worked ELSE 0 END), 0) as hours_billed,
        COALESCE(SUM(hours_worked), 0) as hours_worked
    FROM marketing_projects
    LEFT JOIN marketing_timesheet_entries ON marketing_projects.id = marketing_timesheet_entries.project_id
    LEFT JOIN marketing_crm_leads ON marketing_projects.id = marketing_crm_leads.project_id
    WHERE marketing_projects.id = p_project_id
    GROUP BY marketing_projects.id;
END;
$$;

-- Function to generate retainer invoice
CREATE OR REPLACE FUNCTION generate_retainer_invoice(p_retainer_id UUID, p_period_start DATE, p_period_end DATE)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_invoice_id UUID;
    v_restaurant_id UUID;
    v_contract RECORD;
BEGIN
    SELECT * INTO v_contract FROM marketing_retainer_contracts WHERE id = p_retainer_id;
    
    -- Create retainer invoice record
    INSERT INTO marketing_retainer_invoices (
        restaurant_id, retainer_contract_id, invoice_number, 
        period_start, period_end, invoice_amount, currency, status
    ) VALUES (
        v_contract.restaurant_id, p_retainer_id, 
        'RET-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || substr(gen_random_uuid()::text, 1, 8),
        p_period_start, p_period_end, v_contract.retainer_amount, v_contract.currency, 'pending'
    ) RETURNING id INTO v_invoice_id;
    
    RETURN v_invoice_id;
END;
$$;

-- Function to recognize revenue
CREATE OR REPLACE FUNCTION recognize_revenue(p_recognition_id UUID, p_recognition_date DATE)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_recognition RECORD;
    v_amount DECIMAL;
BEGIN
    SELECT * INTO v_recognition FROM marketing_revenue_recognition WHERE id = p_recognition_id;
    
    -- Calculate daily recognition amount
    v_amount := v_recognition.total_amount / 
        (EXTRACT(DAY FROM v_recognition.recognition_end_date - v_recognition.recognition_start_date) + 1);
    
    -- Create recognition entry
    INSERT INTO marketing_revenue_recognition_entries (
        restaurant_id, recognition_id, recognition_date, amount, currency, is_recognized, recognized_at
    ) VALUES (
        v_recognition.restaurant_id, p_recognition_id, p_recognition_date, v_amount, v_recognition.currency, TRUE, NOW()
    );
    
    RETURN TRUE;
END;
$$;

-- Function to convert currency
CREATE OR REPLACE FUNCTION convert_currency(p_amount DECIMAL, p_from_currency VARCHAR, p_to_currency VARCHAR, p_restaurant_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_rate DECIMAL;
BEGIN
    -- If same currency, return amount
    IF p_from_currency = p_to_currency THEN
        RETURN p_amount;
    END IF;
    
    -- Get exchange rate
    SELECT exchange_rate INTO v_rate FROM marketing_exchange_rates
    WHERE restaurant_id = p_restaurant_id
        AND from_currency = p_from_currency
        AND to_currency = p_to_currency
        AND effective_date <= p_date
    ORDER BY effective_date DESC LIMIT 1;
    
    -- If no rate found, return NULL
    IF v_rate IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN p_amount * v_rate;
END;
$$;

-- Function to calculate employee utilization
CREATE OR REPLACE FUNCTION calculate_employee_utilization(p_employee_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
    total_hours DECIMAL,
    billable_hours DECIMAL,
    utilization_rate DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(hours_worked), 0) as total_hours,
        COALESCE(SUM(CASE WHEN is_billable = TRUE THEN hours_worked ELSE 0 END), 0) as billable_hours,
        CASE 
            WHEN SUM(hours_worked) > 0 
            THEN (SUM(CASE WHEN is_billable = TRUE THEN hours_worked ELSE 0 END) / SUM(hours_worked)) * 100 
            ELSE 0 
        END as utilization_rate
    FROM marketing_timesheet_entries
    WHERE staff_id = p_employee_id
        AND work_date BETWEEN p_start_date AND p_end_date;
END;
$$;

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER trigger_marketing_projects_updated_at BEFORE UPDATE ON marketing_projects
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_project_tasks_updated_at BEFORE UPDATE ON marketing_project_tasks
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_timesheet_entries_updated_at BEFORE UPDATE ON marketing_timesheet_entries
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_crm_leads_updated_at BEFORE UPDATE ON marketing_crm_leads
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_retainer_contracts_updated_at BEFORE UPDATE ON marketing_retainer_contracts
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_freelancers_updated_at BEFORE UPDATE ON marketing_freelancers
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_ad_spend_expenses_updated_at BEFORE UPDATE ON marketing_ad_spend_expenses
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_facebook_accounts_updated_at BEFORE UPDATE ON marketing_facebook_accounts
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_facebook_pages_updated_at BEFORE UPDATE ON marketing_facebook_pages
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_ad_campaigns_updated_at BEFORE UPDATE ON marketing_ad_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_ad_performance_updated_at BEFORE UPDATE ON marketing_ad_performance
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_agency_employees_updated_at BEFORE UPDATE ON marketing_agency_employees
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER trigger_marketing_revenue_recognition_updated_at BEFORE UPDATE ON marketing_revenue_recognition
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();
