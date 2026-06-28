-- ============================================================
-- MARKETING WORKFLOW SYSTEM TABLES
-- ============================================================
-- This creates the database structure for the marketing operations workflow
-- ============================================================

BEGIN;

-- 1. Workflow Stages Table - Defines the stages in the marketing workflow
CREATE TABLE IF NOT EXISTS marketing_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  stage_key VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'briefing', 'strategy', 'creative'
  stage_name_ar VARCHAR(100) NOT NULL, -- Arabic name
  stage_name_en VARCHAR(100) NOT NULL, -- English name
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0, -- For ordering stages
  is_active BOOLEAN DEFAULT true,
  default_duration_hours INTEGER DEFAULT 24, -- Expected duration in hours
  requires_approval BOOLEAN DEFAULT false, -- Whether this stage requires approval
  auto_transition BOOLEAN DEFAULT false, -- Whether to auto-transition to next stage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Workflow Instances Table - Tracks workflow instances for each project/lead
CREATE TABLE IF NOT EXISTS marketing_workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL, -- Link to CRM lead/project
  quote_id UUID REFERENCES marketing_quotes(id) ON DELETE SET NULL, -- Link to quote if exists
  contract_id UUID REFERENCES marketing_contracts(id) ON DELETE SET NULL, -- Link to contract if exists
  workflow_name VARCHAR(200), -- Custom name for this workflow instance
  current_stage_id UUID REFERENCES marketing_workflow_stages(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'on_hold', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_end_date TIMESTAMP WITH TIME ZONE,
  actual_end_date TIMESTAMP WITH TIME ZONE,
  total_budget DECIMAL(15,2) DEFAULT 0,
  total_spent DECIMAL(15,2) DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0, -- 0-100
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Workflow Stage History Table - Tracks movement through stages
CREATE TABLE IF NOT EXISTS marketing_workflow_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES marketing_workflow_stages(id) ON DELETE SET NULL,
  to_stage_id UUID NOT NULL REFERENCES marketing_workflow_stages(id) ON DELETE SET NULL,
  transitioned_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_hours DECIMAL(10,2), -- Time spent in the previous stage
  notes TEXT,
  status VARCHAR(50) DEFAULT 'completed' -- 'completed', 'skipped', 'returned'
);

-- 4. Workflow Tasks Table - Detailed tasks within each stage
CREATE TABLE IF NOT EXISTS marketing_workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES marketing_workflow_stages(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES marketing_workflow_tasks(id) ON DELETE SET NULL, -- For sub-tasks
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES staff_departments(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'done', 'blocked'
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2) DEFAULT 0,
  tags TEXT[], -- Array of tags for categorization
  attachments TEXT[], -- Array of file URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Workflow Time Logs Table - Tracks time spent on tasks
CREATE TABLE IF NOT EXISTS marketing_workflow_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
  task_id UUID REFERENCES marketing_workflow_tasks(id) ON DELETE SET NULL,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_hours DECIMAL(10,2),
  description TEXT,
  activity_type VARCHAR(50) DEFAULT 'work', -- 'work', 'meeting', 'review', 'research'
  billable BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Workflow Revisions Table - Tracks client revisions and changes
CREATE TABLE IF NOT EXISTS marketing_workflow_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
  task_id UUID REFERENCES marketing_workflow_tasks(id) ON DELETE SET NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  requested_by VARCHAR(100), -- 'client' or staff name
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
  completed_at TIMESTAMP WITH TIME ZONE,
  impact_assessment TEXT, -- How this revision affects timeline/budget
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Workflow Assets Table - Manages creative assets and files
CREATE TABLE IF NOT EXISTS marketing_workflow_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
  task_id UUID REFERENCES marketing_workflow_tasks(id) ON DELETE SET NULL,
  asset_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'document', 'design', 'copy'
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  thumbnail_url TEXT,
  version INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  description TEXT,
  tags TEXT[],
  is_final BOOLEAN DEFAULT false,
  client_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Workflow Comments Table - Internal communication on workflows
CREATE TABLE IF NOT EXISTS marketing_workflow_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES marketing_workflow_instances(id) ON DELETE CASCADE,
  task_id UUID REFERENCES marketing_workflow_tasks(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES marketing_workflow_assets(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true, -- true = internal team, false = client visible
  mentioned_staff UUID[], -- Array of staff IDs mentioned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_stages_restaurant ON marketing_workflow_stages(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_restaurant ON marketing_workflow_instances(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_lead ON marketing_workflow_instances(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_current_stage ON marketing_workflow_instances(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON marketing_workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_history_instance ON marketing_workflow_stage_history(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_instance ON marketing_workflow_tasks(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned ON marketing_workflow_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON marketing_workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_time_logs_instance ON marketing_workflow_time_logs(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_time_logs_staff ON marketing_workflow_time_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_workflow_revisions_instance ON marketing_workflow_revisions(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assets_instance ON marketing_workflow_assets(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_instance ON marketing_workflow_comments(workflow_instance_id);

-- Enable Row Level Security
ALTER TABLE marketing_workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_workflow_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_workflow_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_workflow_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_workflow_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_workflow_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view workflow stages for their restaurant"
  ON marketing_workflow_stages FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert workflow stages for their restaurant"
  ON marketing_workflow_stages FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update workflow stages for their restaurant"
  ON marketing_workflow_stages FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view workflow instances for their restaurant"
  ON marketing_workflow_instances FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert workflow instances for their restaurant"
  ON marketing_workflow_instances FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update workflow instances for their restaurant"
  ON marketing_workflow_instances FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete workflow instances for their restaurant"
  ON marketing_workflow_instances FOR DELETE
  USING (restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid()));

-- Similar policies for other tables
CREATE POLICY "Users can view workflow history for their restaurant"
  ON marketing_workflow_stage_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_stage_history.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert workflow history"
  ON marketing_workflow_stage_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_stage_history.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can view workflow tasks for their restaurant"
  ON marketing_workflow_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_tasks.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert workflow tasks"
  ON marketing_workflow_tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_tasks.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can update workflow tasks"
  ON marketing_workflow_tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_tasks.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can delete workflow tasks"
  ON marketing_workflow_tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_tasks.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

-- Similar policies for time_logs, revisions, assets, comments
CREATE POLICY "Users can view workflow time logs for their restaurant"
  ON marketing_workflow_time_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_time_logs.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert workflow time logs"
  ON marketing_workflow_time_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_time_logs.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can view workflow revisions for their restaurant"
  ON marketing_workflow_revisions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_revisions.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert workflow revisions"
  ON marketing_workflow_revisions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_revisions.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can view workflow assets for their restaurant"
  ON marketing_workflow_assets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_assets.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert workflow assets"
  ON marketing_workflow_assets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_assets.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can view workflow comments for their restaurant"
  ON marketing_workflow_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_comments.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert workflow comments"
  ON marketing_workflow_comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM marketing_workflow_instances 
    WHERE id = marketing_workflow_comments.workflow_instance_id
    AND restaurant_id IN (SELECT restaurant_id FROM staff_profiles WHERE id = auth.uid())
  ));

-- Insert default workflow stages for marketing agencies
INSERT INTO marketing_workflow_stages (restaurant_id, stage_key, stage_name_ar, stage_name_en, description, order_index, default_duration_hours, requires_approval) VALUES
  ('00000000-0000-0000-0000-000000000000', 'briefing', 'استلام الطلب', 'Briefing', 'استلام متطلبات العميل وتحديد نطاق المشروع', 1, 24, true),
  ('00000000-0000-0000-0000-000000000000', 'strategy', 'الاستراتيجية', 'Strategy', 'وضع الاستراتيجية التسويقية وخطة العمل', 2, 48, true),
  ('00000000-0000-0000-0000-000000000000', 'creative', 'الإبداع والتصميم', 'Creative', 'مرحلة الإبداع والتصميم والإنتاج', 3, 72, true),
  ('00000000-0000-0000-0000-000000000000', 'review', 'المراجعة', 'Review', 'مراجعة العميل والتعديلات', 4, 24, true),
  ('00000000-0000-0000-0000-000000000000', 'delivery', 'التسليم', 'Delivery', 'التسليم النهائي للمشروع', '5', 8, false),
  ('00000000-0000-0000-0000-000000000000', 'followup', 'المتابعة', 'Follow-up', 'متابعة ما بعد التسليم', 6, 24, false)
ON CONFLICT (stage_key) DO NOTHING;

COMMIT;
