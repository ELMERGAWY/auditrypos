-- AuditryPOS CRM sales automation foundation
-- Additive only: no deletes, truncates, or changes to existing customer/order amounts.

ALTER TABLE public.marketing_crm_leads
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS automation_status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS public.marketing_crm_lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.marketing_crm_leads(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  assignment_type TEXT NOT NULL DEFAULT 'round_robin'
    CHECK (assignment_type IN ('manual','round_robin','skill_match','fallback')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.marketing_crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.marketing_crm_leads(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN
    ('call','email','meeting','whatsapp','sms','note','status_change','follow_up','social','purchase')),
  subject TEXT NOT NULL,
  details TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (restaurant_id, source, external_id)
);

CREATE TABLE IF NOT EXISTS public.marketing_crm_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.marketing_crm_leads(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  reminder_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','cancelled','overdue')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'automation',
  automation_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mkt_crm_assignments_lead_active
  ON public.marketing_crm_lead_assignments (restaurant_id, lead_id, unassigned_at);
CREATE INDEX IF NOT EXISTS idx_mkt_crm_assignments_staff_active
  ON public.marketing_crm_lead_assignments (restaurant_id, staff_id, unassigned_at);
CREATE INDEX IF NOT EXISTS idx_mkt_crm_activities_lead_time
  ON public.marketing_crm_activities (restaurant_id, lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_crm_followups_due
  ON public.marketing_crm_followups (restaurant_id, status, due_at);

INSERT INTO public.permissions (code, name_ar, description_ar, module) VALUES
  ('crm.access', 'إدارة CRM', 'الوصول إلى دورة متابعة العملاء والفرص', 'crm'),
  ('crm.leads.assign', 'تعيين العملاء المحتملين', 'تعيين العملاء للمندوبين يدوياً أو تلقائياً', 'crm'),
  ('crm.activities.write', 'تسجيل أنشطة CRM', 'تسجيل المكالمات والرسائل والاجتماعات والمتابعات', 'crm'),
  ('crm.followups.manage', 'إدارة المتابعات', 'إنشاء وإكمال وإعادة جدولة المتابعات', 'crm'),
  ('crm.reports.read', 'تقارير CRM', 'قراءة أداء العملاء والمندوبين والتحويلات', 'crm')
ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar, description_ar = EXCLUDED.description_ar, module = EXCLUDED.module;

ALTER TABLE public.marketing_crm_lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_crm_followups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='marketing_crm_lead_assignments' AND policyname='mkt_crm_assignments_company_access') THEN
    CREATE POLICY mkt_crm_assignments_company_access ON public.marketing_crm_lead_assignments
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = marketing_crm_lead_assignments.restaurant_id
          AND (r.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
          ))
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = marketing_crm_lead_assignments.restaurant_id
          AND (r.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
          ))
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='marketing_crm_activities' AND policyname='mkt_crm_activities_company_access') THEN
    CREATE POLICY mkt_crm_activities_company_access ON public.marketing_crm_activities
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = marketing_crm_activities.restaurant_id
          AND (r.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
          ))
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = marketing_crm_activities.restaurant_id
          AND (r.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
          ))
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='marketing_crm_followups' AND policyname='mkt_crm_followups_company_access') THEN
    CREATE POLICY mkt_crm_followups_company_access ON public.marketing_crm_followups
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = marketing_crm_followups.restaurant_id
          AND (r.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
          ))
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = marketing_crm_followups.restaurant_id
          AND (r.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
          ))
      ));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.assign_marketing_crm_lead(
  p_lead_id UUID,
  p_assignment_type TEXT DEFAULT 'round_robin'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead public.marketing_crm_leads%ROWTYPE;
  v_staff UUID;
  v_company UUID;
  v_type TEXT := COALESCE(NULLIF(p_assignment_type, ''), 'round_robin');
BEGIN
  SELECT * INTO v_lead FROM public.marketing_crm_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CRM lead not found'; END IF;

  SELECT company_id INTO v_company FROM public.restaurants WHERE id = v_lead.restaurant_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = v_lead.restaurant_id
      AND (r.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = r.company_id AND cu.user_id = auth.uid()
          AND cu.is_active = true AND cu.role IN ('owner','admin','manager')
      ))
  ) AND auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not allowed to assign CRM leads';
  END IF;

  SELECT sp.id INTO v_staff
  FROM public.staff_profiles sp
  WHERE sp.restaurant_id = v_lead.restaurant_id
    AND lower(COALESCE(sp.status, 'active')) = 'active'
    AND (
      lower(COALESCE(sp.position, '')) LIKE '%sales%'
      OR lower(COALESCE(sp.position, '')) LIKE '%مبيعات%'
      OR lower(COALESCE(sp.position, '')) LIKE '%marketing%'
      OR lower(COALESCE(sp.position, '')) LIKE '%تسويق%'
      OR lower(COALESCE(sp.position, '')) LIKE '%account%'
      OR lower(COALESCE(sp.position, '')) LIKE '%حساب%'
    )
  ORDER BY (
    SELECT count(*) FROM public.marketing_crm_lead_assignments a
    WHERE a.restaurant_id = v_lead.restaurant_id
      AND a.staff_id = sp.id AND a.unassigned_at IS NULL
  ), sp.created_at, sp.id
  LIMIT 1;

  IF v_staff IS NULL THEN
    SELECT sp.id INTO v_staff
    FROM public.staff_profiles sp
    WHERE sp.restaurant_id = v_lead.restaurant_id
      AND lower(COALESCE(sp.status, 'active')) = 'active'
    ORDER BY (
      SELECT count(*) FROM public.marketing_crm_lead_assignments a
      WHERE a.restaurant_id = v_lead.restaurant_id
        AND a.staff_id = sp.id AND a.unassigned_at IS NULL
    ), sp.created_at, sp.id
    LIMIT 1;
    v_type := 'fallback';
  END IF;

  IF v_staff IS NULL THEN RETURN NULL; END IF;

  UPDATE public.marketing_crm_lead_assignments
  SET unassigned_at = now()
  WHERE lead_id = p_lead_id AND unassigned_at IS NULL;

  INSERT INTO public.marketing_crm_lead_assignments
    (restaurant_id, lead_id, staff_id, assignment_type, assigned_by)
  VALUES (v_lead.restaurant_id, p_lead_id, v_staff, v_type, auth.uid());

  UPDATE public.marketing_crm_leads
  SET sales_rep_id = v_staff, assigned_at = now(), updated_at = now()
  WHERE id = p_lead_id;

  INSERT INTO public.marketing_crm_activities
    (restaurant_id, lead_id, staff_id, activity_type, subject, details, created_by, source)
  VALUES (v_lead.restaurant_id, p_lead_id, v_staff, 'status_change', 'تم تعيين مسؤول بيع',
          'تم التعيين تلقائياً وفق أقل عدد من العملاء النشطين.', auth.uid(), 'assignment');

  RETURN v_staff;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_marketing_crm_automation(
  p_restaurant_id UUID,
  p_limit INTEGER DEFAULT 100
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company UUID;
  v_lead RECORD;
  v_staff UUID;
  v_due TIMESTAMPTZ;
  v_count INTEGER := 0;
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
BEGIN
  SELECT company_id INTO v_company FROM public.restaurants WHERE id = p_restaurant_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND (r.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = r.company_id AND cu.user_id = auth.uid()
          AND cu.is_active = true AND cu.role IN ('owner','admin','manager')
      ))
  ) AND auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not allowed to run CRM automation';
  END IF;

  FOR v_lead IN
    SELECT * FROM public.marketing_crm_leads
    WHERE restaurant_id = p_restaurant_id
      AND lead_status NOT IN ('won','lost')
      AND (
        sales_rep_id IS NULL
        OR next_follow_up_at <= now()
        OR (next_follow_up IS NOT NULL AND next_follow_up <= current_date)
      )
    ORDER BY COALESCE(next_follow_up_at, next_follow_up::timestamptz, created_at)
    LIMIT v_limit
  LOOP
    IF v_lead.sales_rep_id IS NULL THEN
      v_staff := public.assign_marketing_crm_lead(v_lead.id, 'round_robin');
    ELSE
      v_staff := v_lead.sales_rep_id;
    END IF;

    v_due := COALESCE(v_lead.next_follow_up_at, v_lead.next_follow_up::timestamptz, now());
    INSERT INTO public.marketing_crm_followups
      (restaurant_id, lead_id, assigned_to, title, due_at, reminder_at, priority, created_by, source, automation_key)
    VALUES (
      p_restaurant_id, v_lead.id, COALESCE(v_staff, v_lead.sales_rep_id),
      'متابعة العميل المحتمل: ' || COALESCE(v_lead.contact_name, v_lead.company_name, v_lead.lead_code),
      v_due, v_due - interval '1 hour',
      CASE WHEN v_lead.opportunity_value >= 100000 THEN 'high' ELSE 'medium' END,
      auth.uid(), 'automation',
      'lead-followup:' || v_lead.id::text || ':' || to_char(v_due, 'YYYY-MM-DD-HH24-MI')
    ) ON CONFLICT (automation_key) DO NOTHING;

    UPDATE public.marketing_crm_leads
    SET last_activity_at = now(), updated_at = now()
    WHERE id = v_lead.id;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.marketing_crm_followups
  SET status = 'overdue'
  WHERE restaurant_id = p_restaurant_id
    AND status IN ('pending','in_progress')
    AND due_at < now();

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_marketing_crm_lead(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_marketing_crm_lead(UUID, TEXT) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.run_marketing_crm_automation(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_marketing_crm_automation(UUID, INTEGER) TO authenticated, service_role;

COMMENT ON FUNCTION public.assign_marketing_crm_lead(UUID, TEXT) IS 'Idempotent round-robin/skill-first assignment for marketing CRM leads.';
COMMENT ON FUNCTION public.run_marketing_crm_automation(UUID, INTEGER) IS 'Creates due CRM follow-ups and assigns unowned leads; no customer or order mutation.';
