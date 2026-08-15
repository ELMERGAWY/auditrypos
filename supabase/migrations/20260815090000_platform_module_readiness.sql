-- AuditryPOS platform module readiness registry
-- Read-oriented governance layer. No customer, order, inventory, or journal mutation.

CREATE TABLE IF NOT EXISTS public.platform_module_registry (
  code TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  description_ar TEXT,
  criticality TEXT NOT NULL DEFAULT 'standard'
    CHECK (criticality IN ('core','financial','standard','optional')),
  display_order INTEGER NOT NULL DEFAULT 100,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.platform_module_registry (code, name_ar, description_ar, criticality, display_order) VALUES
  ('pos', 'نقطة البيع', 'الدورة الأساسية لإنشاء الطلبات والتحصيل', 'core', 10),
  ('orders', 'الطلبات', 'تجميع الطلبات وحالاتها ومطابقتها', 'core', 20),
  ('inventory', 'المخزون', 'المنتجات والأرصدة وحركات المخزون', 'core', 30),
  ('customers', 'العملاء', 'ملفات العملاء والأرصدة والولاء', 'core', 40),
  ('accounting', 'المحاسبة', 'دليل الحسابات والقيود والمطابقة', 'financial', 50),
  ('crm', 'CRM والمبيعات', 'العملاء المحتملون والتعيين والمتابعات', 'standard', 60),
  ('storefront', 'المتجر العام', 'واجهة المنتجات والطلب والـLanding Page', 'standard', 70),
  ('marketing', 'التسويق', 'Pixels وMeta والمحتوى والحملات', 'standard', 80),
  ('staff', 'الموظفون', 'الملفات والصلاحيات والفرق', 'core', 90),
  ('payroll', 'الرواتب', 'مسيرات الرواتب وربطها بالحسابات', 'financial', 100),
  ('operations', 'التشغيل والمراقبة', 'Outbox والتدقيق والصحة التشغيلية', 'core', 110)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  criticality = EXCLUDED.criticality,
  display_order = EXCLUDED.display_order;

ALTER TABLE public.platform_module_registry ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='platform_module_registry'
      AND policyname='super admins read module registry'
  ) THEN
    CREATE POLICY "super admins read module registry"
      ON public.platform_module_registry FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_platform_module_readiness(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  module_code TEXT,
  module_name TEXT,
  criticality TEXT,
  tenants_total BIGINT,
  tenants_ready BIGINT,
  readiness_percent INTEGER,
  status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Super Admin access required';
  END IF;

  RETURN QUERY
  WITH modules AS (
    SELECT code, name_ar, criticality, display_order
    FROM public.platform_module_registry
    WHERE is_enabled = true
    ORDER BY display_order
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
  ), tenant_module AS (
    SELECT
      m.code,
      m.name_ar,
      m.criticality,
      m.display_order,
      r.id AS restaurant_id,
      CASE m.code
        WHEN 'pos' THEN EXISTS (SELECT 1 FROM public.orders o WHERE o.restaurant_id = r.id)
        WHEN 'orders' THEN EXISTS (SELECT 1 FROM public.orders o WHERE o.restaurant_id = r.id)
        WHEN 'inventory' THEN EXISTS (SELECT 1 FROM public.products p WHERE p.restaurant_id = r.id)
        WHEN 'customers' THEN EXISTS (SELECT 1 FROM public.customers c WHERE c.restaurant_id = r.id)
        WHEN 'accounting' THEN EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.restaurant_id = r.id)
        WHEN 'crm' THEN EXISTS (SELECT 1 FROM public.marketing_crm_leads l WHERE l.restaurant_id = r.id)
        WHEN 'storefront' THEN (
          EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.restaurant_id = r.id)
          OR EXISTS (SELECT 1 FROM public.products p2 WHERE p2.restaurant_id = r.id)
        )
        WHEN 'marketing' THEN (
          EXISTS (SELECT 1 FROM public.tracking_pixels tp WHERE tp.restaurant_id = r.id AND tp.is_active = true)
          OR EXISTS (SELECT 1 FROM public.marketing_crm_leads l2 WHERE l2.restaurant_id = r.id)
        )
        WHEN 'staff' THEN EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.restaurant_id = r.id)
        WHEN 'payroll' THEN EXISTS (SELECT 1 FROM public.payroll_transactions pt WHERE pt.restaurant_id = r.id)
        WHEN 'operations' THEN EXISTS (SELECT 1 FROM public.accounting_posting_outbox ao WHERE ao.restaurant_id = r.id)
        ELSE false
      END AS ready
    FROM modules m
    CROSS JOIN public.restaurants r
  )
  SELECT
    tm.code,
    tm.name_ar,
    tm.criticality,
    count(*)::BIGINT,
    count(*) FILTER (WHERE tm.ready)::BIGINT,
    CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE tm.ready) / count(*))::INTEGER END,
    CASE
      WHEN count(*) FILTER (WHERE tm.ready) = count(*) THEN 'ready'
      WHEN count(*) FILTER (WHERE tm.ready) = 0 THEN 'not_ready'
      ELSE 'partial'
    END
  FROM tenant_module tm
  GROUP BY tm.code, tm.name_ar, tm.criticality
  ORDER BY min(tm.display_order);
END;
$$;
REVOKE ALL ON FUNCTION public.get_platform_module_readiness(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_module_readiness(INTEGER) TO authenticated, service_role;
