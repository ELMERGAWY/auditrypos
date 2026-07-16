-- Global subscription plans & super admin notifications
-- Safe migration: all new columns nullable/default — existing operations unaffected

-- Subscription plans reference table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  price_usd DECIMAL(10,2) DEFAULT 0,
  price_eur DECIMAL(10,2) DEFAULT 0,
  price_egp DECIMAL(10,2) DEFAULT 0,
  max_modules INT DEFAULT 1,
  max_staff INT DEFAULT 3,
  max_branches INT DEFAULT 1,
  allowed_features JSONB DEFAULT '[]'::jsonb,
  locked_features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO subscription_plans (id, name_ar, name_en, name_fr, price_usd, price_eur, price_egp, max_modules, max_staff, max_branches, allowed_features, locked_features, sort_order)
VALUES
  ('free', 'مجاني', 'Free', 'Gratuit', 0, 0, 0, 1, 3, 1,
   '["pos","orders","menu","inventory","notifications","settings","chat","staff"]'::jsonb,
   '["crm","ai_assistant","analytics","financials","treasury","branches","marketing_hub"]'::jsonb, 0),
  ('starter', 'البداية', 'Starter', 'Débutant', 9, 8, 199, 1, 10, 1,
   '["pos","orders","menu","inventory","customers","suppliers","analytics","notifications","settings","chat","staff"]'::jsonb,
   '["crm","ai_assistant","financials","treasury","branches"]'::jsonb, 1),
  ('pro', 'احترافي', 'Pro', 'Pro', 29, 27, 499, 3, 50, 5,
   '["pos","orders","menu","inventory","crm","financials","treasury","analytics","ai_assistant","delivery","kds","notifications","settings","chat","staff"]'::jsonb,
   '["branches","marketing_hub"]'::jsonb, 2),
  ('enterprise', 'مؤسسات', 'Enterprise', 'Entreprise', 59, 55, 999, 999, 999, 999,
   '["all"]'::jsonb, '[]'::jsonb, 3)
ON CONFLICT (id) DO NOTHING;

-- Add plan_id to restaurants (nullable — existing rows unaffected)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT NULL REFERENCES subscription_plans(id);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ar';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'egp';

-- Super admin global notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_restaurant ON admin_notifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_plan_id ON restaurants(plan_id);

-- RLS for admin_notifications (super admin only)
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_admin_notifications" ON admin_notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "super_admin_update_admin_notifications" ON admin_notifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "system_insert_admin_notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

-- RLS for subscription_plans (public read)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_subscription_plans" ON subscription_plans
  FOR SELECT USING (true);

CREATE POLICY "super_admin_manage_subscription_plans" ON subscription_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Chat enhancements: typing indicators & pinned messages
ALTER TABLE employee_chat_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE employee_chat_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES employee_chat_messages(id) ON DELETE SET NULL;
ALTER TABLE employee_chat_messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS chat_typing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT,
  room_id TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, user_id, room_id)
);

ALTER TABLE chat_typing_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_members_chat_typing" ON chat_typing_status
  FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM staff_profiles sp
        JOIN profiles p ON p.email = sp.email
        WHERE p.user_id = auth.uid()
    )
  );

-- Function to notify super admin on free plan signup
CREATE OR REPLACE FUNCTION notify_admin_free_plan_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_id = 'free' THEN
    INSERT INTO admin_notifications (type, title, body, restaurant_id, metadata)
    VALUES (
      'free_signup',
      'تسجيل خطة مجانية جديدة',
      'شركة جديدة: ' || NEW.name,
      NEW.id,
      jsonb_build_object('plan_id', NEW.plan_id, 'business_type', NEW.business_type)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_free_plan_signup ON restaurants;
CREATE TRIGGER trg_notify_free_plan_signup
  AFTER INSERT ON restaurants
  FOR EACH ROW
  WHEN (NEW.plan_id = 'free')
  EXECUTE FUNCTION notify_admin_free_plan_signup();
