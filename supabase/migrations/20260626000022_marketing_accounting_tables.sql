-- Marketing Accounting System Tables
-- This migration adds tables for tracking costs, profitability, and billing for marketing projects

-- Table: marketing_hourly_rates
-- Stores hourly rates for staff members by role/department
CREATE TABLE IF NOT EXISTS marketing_hourly_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    department_id UUID REFERENCES staff_departments(id) ON DELETE SET NULL,
    role VARCHAR(100),
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS for marketing_hourly_rates
ALTER TABLE marketing_hourly_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view hourly rates for their restaurant" ON marketing_hourly_rates;
CREATE POLICY "Users can view hourly rates for their restaurant"
    ON marketing_hourly_rates FOR SELECT
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all hourly rates" ON marketing_hourly_rates;
CREATE POLICY "Super admin can view all hourly rates"
    ON marketing_hourly_rates FOR SELECT
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can insert hourly rates for their restaurant" ON marketing_hourly_rates;
CREATE POLICY "Users can insert hourly rates for their restaurant"
    ON marketing_hourly_rates FOR INSERT
    WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can insert hourly rates" ON marketing_hourly_rates;
CREATE POLICY "Super admin can insert hourly rates"
    ON marketing_hourly_rates FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can update hourly rates for their restaurant" ON marketing_hourly_rates;
CREATE POLICY "Users can update hourly rates for their restaurant"
    ON marketing_hourly_rates FOR UPDATE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can update hourly rates" ON marketing_hourly_rates;
CREATE POLICY "Super admin can update hourly rates"
    ON marketing_hourly_rates FOR UPDATE
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can delete hourly rates for their restaurant" ON marketing_hourly_rates;
CREATE POLICY "Users can delete hourly rates for their restaurant"
    ON marketing_hourly_rates FOR DELETE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can delete hourly rates" ON marketing_hourly_rates;
CREATE POLICY "Super admin can delete hourly rates"
    ON marketing_hourly_rates FOR DELETE
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_hourly_rates_restaurant ON marketing_hourly_rates(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_hourly_rates_staff ON marketing_hourly_rates(staff_id);
CREATE INDEX IF NOT EXISTS idx_marketing_hourly_rates_department ON marketing_hourly_rates(department_id);
CREATE INDEX IF NOT EXISTS idx_marketing_hourly_rates_active ON marketing_hourly_rates(is_active, effective_from, effective_to);

-- Table: marketing_project_costs
-- Tracks all costs associated with a marketing project
CREATE TABLE IF NOT EXISTS marketing_project_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
    cost_type VARCHAR(50) NOT NULL CHECK (cost_type IN ('labor', 'materials', 'software', 'outsourcing', 'overhead', 'other')),
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'EGP',
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit VARCHAR(50),
    task_id UUID REFERENCES marketing_workflow_tasks(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    invoice_id UUID,
    invoice_date DATE,
    is_billable BOOLEAN DEFAULT true,
    billed BOOLEAN DEFAULT false,
    billed_amount DECIMAL(12, 2) DEFAULT 0,
    billed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS for marketing_project_costs
ALTER TABLE marketing_project_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project costs for their restaurant" ON marketing_project_costs;
CREATE POLICY "Users can view project costs for their restaurant"
    ON marketing_project_costs FOR SELECT
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all project costs" ON marketing_project_costs;
CREATE POLICY "Super admin can view all project costs"
    ON marketing_project_costs FOR SELECT
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can insert project costs for their restaurant" ON marketing_project_costs;
CREATE POLICY "Users can insert project costs for their restaurant"
    ON marketing_project_costs FOR INSERT
    WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can insert project costs" ON marketing_project_costs;
CREATE POLICY "Super admin can insert project costs"
    ON marketing_project_costs FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can update project costs for their restaurant" ON marketing_project_costs;
CREATE POLICY "Users can update project costs for their restaurant"
    ON marketing_project_costs FOR UPDATE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can update project costs" ON marketing_project_costs;
CREATE POLICY "Super admin can update project costs"
    ON marketing_project_costs FOR UPDATE
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can delete project costs for their restaurant" ON marketing_project_costs;
CREATE POLICY "Users can delete project costs for their restaurant"
    ON marketing_project_costs FOR DELETE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can delete project costs" ON marketing_project_costs;
CREATE POLICY "Super admin can delete project costs"
    ON marketing_project_costs FOR DELETE
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_project_costs_restaurant ON marketing_project_costs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_project_costs_workflow ON marketing_project_costs(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_marketing_project_costs_type ON marketing_project_costs(cost_type);
CREATE INDEX IF NOT EXISTS idx_marketing_project_costs_task ON marketing_project_costs(task_id);
CREATE INDEX IF NOT EXISTS idx_marketing_project_costs_staff ON marketing_project_costs(staff_id);
CREATE INDEX IF NOT EXISTS idx_marketing_project_costs_billed ON marketing_project_costs(billed);

-- Table: marketing_project_revenue
-- Tracks revenue and billing for marketing projects
CREATE TABLE IF NOT EXISTS marketing_project_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
    revenue_type VARCHAR(50) NOT NULL CHECK (revenue_type IN ('project_fee', 'retainer', 'hourly_billing', 'milestone', 'additional', 'other')),
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'EGP',
    sales_invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
    milestone_id UUID,
    milestone_name VARCHAR(200),
    milestone_status VARCHAR(50) DEFAULT 'pending' CHECK (milestone_status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    milestone_date DATE,
    is_paid BOOLEAN DEFAULT false,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    paid_date DATE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS for marketing_project_revenue
ALTER TABLE marketing_project_revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project revenue for their restaurant" ON marketing_project_revenue;
CREATE POLICY "Users can view project revenue for their restaurant"
    ON marketing_project_revenue FOR SELECT
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all project revenue" ON marketing_project_revenue;
CREATE POLICY "Super admin can view all project revenue"
    ON marketing_project_revenue FOR SELECT
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can insert project revenue for their restaurant" ON marketing_project_revenue;
CREATE POLICY "Users can insert project revenue for their restaurant"
    ON marketing_project_revenue FOR INSERT
    WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can insert project revenue" ON marketing_project_revenue;
CREATE POLICY "Super admin can insert project revenue"
    ON marketing_project_revenue FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can update project revenue for their restaurant" ON marketing_project_revenue;
CREATE POLICY "Users can update project revenue for their restaurant"
    ON marketing_project_revenue FOR UPDATE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can update project revenue" ON marketing_project_revenue;
CREATE POLICY "Super admin can update project revenue"
    ON marketing_project_revenue FOR UPDATE
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can delete project revenue for their restaurant" ON marketing_project_revenue;
CREATE POLICY "Users can delete project revenue for their restaurant"
    ON marketing_project_revenue FOR DELETE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can delete project revenue" ON marketing_project_revenue;
CREATE POLICY "Super admin can delete project revenue"
    ON marketing_project_revenue FOR DELETE
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_project_revenue_restaurant ON marketing_project_revenue(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_project_revenue_workflow ON marketing_project_revenue(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_marketing_project_revenue_type ON marketing_project_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_marketing_project_revenue_invoice ON marketing_project_revenue(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_marketing_project_revenue_paid ON marketing_project_revenue(is_paid);

-- Table: marketing_profitability
-- Stores calculated profitability metrics for projects
CREATE TABLE IF NOT EXISTS marketing_profitability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
    total_budget DECIMAL(12, 2) DEFAULT 0,
    total_cost DECIMAL(12, 2) DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    total_hours_logged DECIMAL(10, 2) DEFAULT 0,
    gross_profit DECIMAL(12, 2) DEFAULT 0,
    profit_margin_percentage DECIMAL(5, 2) DEFAULT 0,
    cost_per_hour DECIMAL(10, 2) DEFAULT 0,
    revenue_per_hour DECIMAL(10, 2) DEFAULT 0,
    budget_utilization_percentage DECIMAL(5, 2) DEFAULT 0,
    completion_percentage DECIMAL(5, 2) DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workflow_instance_id)
);

-- RLS for marketing_profitability
ALTER TABLE marketing_profitability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profitability for their restaurant" ON marketing_profitability;
CREATE POLICY "Users can view profitability for their restaurant"
    ON marketing_profitability FOR SELECT
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all profitability" ON marketing_profitability;
CREATE POLICY "Super admin can view all profitability"
    ON marketing_profitability FOR SELECT
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_profitability_restaurant ON marketing_profitability(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_profitability_workflow ON marketing_profitability(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_marketing_profitability_margin ON marketing_profitability(profit_margin_percentage);

-- Table: marketing_billing_schedule
-- Schedules for milestone-based or recurring billing
CREATE TABLE IF NOT EXISTS marketing_billing_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
    milestone_name VARCHAR(200) NOT NULL,
    milestone_description TEXT,
    scheduled_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'EGP',
    scheduled_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_date DATE,
    invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'due', 'overdue', 'invoiced', 'paid', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS for marketing_billing_schedule
ALTER TABLE marketing_billing_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view billing schedule for their restaurant" ON marketing_billing_schedule;
CREATE POLICY "Users can view billing schedule for their restaurant"
    ON marketing_billing_schedule FOR SELECT
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all billing schedule" ON marketing_billing_schedule;
CREATE POLICY "Super admin can view all billing schedule"
    ON marketing_billing_schedule FOR SELECT
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can insert billing schedule for their restaurant" ON marketing_billing_schedule;
CREATE POLICY "Users can insert billing schedule for their restaurant"
    ON marketing_billing_schedule FOR INSERT
    WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can insert billing schedule" ON marketing_billing_schedule;
CREATE POLICY "Super admin can insert billing schedule"
    ON marketing_billing_schedule FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can update billing schedule for their restaurant" ON marketing_billing_schedule;
CREATE POLICY "Users can update billing schedule for their restaurant"
    ON marketing_billing_schedule FOR UPDATE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can update billing schedule" ON marketing_billing_schedule;
CREATE POLICY "Super admin can update billing schedule"
    ON marketing_billing_schedule FOR UPDATE
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can delete billing schedule for their restaurant" ON marketing_billing_schedule;
CREATE POLICY "Users can delete billing schedule for their restaurant"
    ON marketing_billing_schedule FOR DELETE
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can delete billing schedule" ON marketing_billing_schedule;
CREATE POLICY "Super admin can delete billing schedule"
    ON marketing_billing_schedule FOR DELETE
    USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_billing_schedule_restaurant ON marketing_billing_schedule(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_billing_schedule_workflow ON marketing_billing_schedule(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_marketing_billing_schedule_date ON marketing_billing_schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_marketing_billing_schedule_status ON marketing_billing_schedule(status);

-- Function to calculate project profitability
CREATE OR REPLACE FUNCTION calculate_marketing_profitability(p_workflow_instance_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_cost DECIMAL(12, 2);
    v_total_revenue DECIMAL(12, 2);
    v_total_hours DECIMAL(10, 2);
    v_gross_profit DECIMAL(12, 2);
    v_profit_margin DECIMAL(5, 2);
    v_cost_per_hour DECIMAL(10, 2);
    v_revenue_per_hour DECIMAL(10, 2);
    v_budget_utilization DECIMAL(5, 2);
    v_completion_percentage DECIMAL(5, 2);
    v_total_budget DECIMAL(12, 2);
    v_restaurant_id UUID;
BEGIN
    -- Get restaurant_id
    SELECT restaurant_id INTO v_restaurant_id
    FROM marketing_workflow_instances
    WHERE id = p_workflow_instance_id;

    -- Calculate total cost
    SELECT COALESCE(SUM(amount * quantity), 0) INTO v_total_cost
    FROM marketing_project_costs
    WHERE workflow_instance_id = p_workflow_instance_id;

    -- Calculate total revenue
    SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
    FROM marketing_project_revenue
    WHERE workflow_instance_id = p_workflow_instance_id;

    -- Calculate total hours logged
    SELECT COALESCE(SUM(hours), 0) INTO v_total_hours
    FROM marketing_workflow_time_logs
    WHERE workflow_instance_id = p_workflow_instance_id;

    -- Get total budget
    SELECT COALESCE(budget, 0) INTO v_total_budget
    FROM marketing_workflow_instances
    WHERE id = p_workflow_instance_id;

    -- Calculate gross profit
    v_gross_profit := v_total_revenue - v_total_cost;

    -- Calculate profit margin
    IF v_total_revenue > 0 THEN
        v_profit_margin := (v_gross_profit / v_total_revenue) * 100;
    ELSE
        v_profit_margin := 0;
    END IF;

    -- Calculate cost per hour
    IF v_total_hours > 0 THEN
        v_cost_per_hour := v_total_cost / v_total_hours;
    ELSE
        v_cost_per_hour := 0;
    END IF;

    -- Calculate revenue per hour
    IF v_total_hours > 0 THEN
        v_revenue_per_hour := v_total_revenue / v_total_hours;
    ELSE
        v_revenue_per_hour := 0;
    END IF;

    -- Calculate budget utilization
    IF v_total_budget > 0 THEN
        v_budget_utilization := (v_total_cost / v_total_budget) * 100;
    ELSE
        v_budget_utilization := 0;
    END IF;

    -- Calculate completion percentage based on tasks
    SELECT COALESCE(
        (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)),
        0
    ) INTO v_completion_percentage
    FROM marketing_workflow_tasks
    WHERE workflow_instance_id = p_workflow_instance_id;

    -- Upsert profitability record
    INSERT INTO marketing_profitability (
        restaurant_id,
        workflow_instance_id,
        total_budget,
        total_cost,
        total_revenue,
        total_hours_logged,
        gross_profit,
        profit_margin_percentage,
        cost_per_hour,
        revenue_per_hour,
        budget_utilization_percentage,
        completion_percentage,
        calculated_at
    ) VALUES (
        v_restaurant_id,
        p_workflow_instance_id,
        v_total_budget,
        v_total_cost,
        v_total_revenue,
        v_total_hours,
        v_gross_profit,
        v_profit_margin,
        v_cost_per_hour,
        v_revenue_per_hour,
        v_budget_utilization,
        v_completion_percentage,
        NOW()
    )
    ON CONFLICT (workflow_instance_id)
    DO UPDATE SET
        total_budget = EXCLUDED.total_budget,
        total_cost = EXCLUDED.total_cost,
        total_revenue = EXCLUDED.total_revenue,
        total_hours_logged = EXCLUDED.total_hours_logged,
        gross_profit = EXCLUDED.gross_profit,
        profit_margin_percentage = EXCLUDED.profit_margin_percentage,
        cost_per_hour = EXCLUDED.cost_per_hour,
        revenue_per_hour = EXCLUDED.revenue_per_hour,
        budget_utilization_percentage = EXCLUDED.budget_utilization_percentage,
        completion_percentage = EXCLUDED.completion_percentage,
        calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_marketing_profitability(UUID) TO authenticated;

-- Trigger to auto-calculate profitability on cost/revenue changes
CREATE OR REPLACE FUNCTION trigger_calculate_profitability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM calculate_marketing_profitability(NEW.workflow_instance_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM calculate_marketing_profitability(NEW.workflow_instance_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM calculate_marketing_profitability(OLD.workflow_instance_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_profitability_costs
    AFTER INSERT OR UPDATE OR DELETE ON marketing_project_costs
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_profitability();

CREATE TRIGGER trigger_profitability_revenue
    AFTER INSERT OR UPDATE OR DELETE ON marketing_project_revenue
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_profitability();

CREATE TRIGGER trigger_profitability_time_logs
    AFTER INSERT OR UPDATE OR DELETE ON marketing_workflow_time_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_profitability();

-- Function to auto-create labor cost from time log
CREATE OR REPLACE FUNCTION create_labor_cost_from_time_log()
RETURNS TRIGGER AS $$
DECLARE
    v_hourly_rate DECIMAL(10, 2);
    v_cost_amount DECIMAL(12, 2);
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get hourly rate for the staff member
        SELECT COALESCE(hourly_rate, 0) INTO v_hourly_rate
        FROM marketing_hourly_rates
        WHERE staff_id = NEW.staff_id
        AND restaurant_id = NEW.restaurant_id
        AND is_active = true
        AND effective_from <= NOW()
        AND (effective_to IS NULL OR effective_to > NOW())
        ORDER BY effective_from DESC
        LIMIT 1;

        -- If no specific rate, try department rate
        IF v_hourly_rate = 0 THEN
            SELECT COALESCE(hourly_rate, 0) INTO v_hourly_rate
            FROM marketing_hourly_rates
            WHERE department_id = (SELECT department_id FROM staff_profiles WHERE id = NEW.staff_id)
            AND restaurant_id = NEW.restaurant_id
            AND is_active = true
            AND effective_from <= NOW()
            AND (effective_to IS NULL OR effective_to > NOW())
            ORDER BY effective_from DESC
            LIMIT 1;
        END IF;

        -- Calculate cost
        v_cost_amount := v_hourly_rate * NEW.hours;

        -- Create labor cost entry
        INSERT INTO marketing_project_costs (
            restaurant_id,
            workflow_instance_id,
            cost_type,
            description,
            amount,
            quantity,
            unit,
            task_id,
            staff_id,
            is_billable,
            created_by
        ) VALUES (
            NEW.restaurant_id,
            NEW.workflow_instance_id,
            'labor',
            'Labor cost from time log: ' || COALESCE(NEW.notes, 'No description'),
            v_cost_amount,
            NEW.hours,
            'hour',
            NEW.task_id,
            NEW.staff_id,
            true,
            NEW.created_by
        );

        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto labor cost
CREATE TRIGGER trigger_auto_labor_cost
    AFTER INSERT ON marketing_workflow_time_logs
    FOR EACH ROW EXECUTE FUNCTION create_labor_cost_from_time_log();
