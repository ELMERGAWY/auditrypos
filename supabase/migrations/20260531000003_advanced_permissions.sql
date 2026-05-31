-- ==============================================================================
-- Migration: Advanced Permissions & Custom Roles
-- Description: Expands permissions dictionary and adds support for custom roles
-- ==============================================================================

-- 1. Expand Permissions Dictionary
INSERT INTO public.permissions (code, name_ar, module) VALUES
-- POS & Sales
('pos.access', 'الدخول لنقطة البيع', 'sales'),
('pos.apply_discount', 'تطبيق خصم', 'sales'),
('pos.void_order', 'إلغاء الطلبات', 'sales'),
('pos.delete_item', 'حذف صنف من السلة', 'sales'),
('pos.checkout', 'إتمام الدفع', 'sales'),
('sales.view', 'عرض فواتير المبيعات', 'sales'),
('sales.create', 'إنشاء فواتير مبيعات', 'sales'),
('sales.edit', 'تعديل الفواتير', 'sales'),
('sales.delete', 'حذف الفواتير', 'sales'),
('sales.return', 'إدارة المرتجعات', 'sales'),
('sales.post', 'ترحيل المبيعات للحسابات', 'sales'),

-- Inventory
('inventory.view', 'عرض المخزون', 'inventory'),
('inventory.adjust', 'تسوية المخزون', 'inventory'),
('inventory.transfer', 'تحويلات المخازن', 'inventory'),
('inventory.receipts', 'فواتير الاستلام', 'inventory'),
('inventory.setup', 'إعداد المستودعات والأصناف', 'inventory'),
('inventory.reports', 'تقارير المخزون', 'inventory'),

-- Finance & Accounting
('finance.access', 'الدخول للمحاسبة', 'finance'),
('finance.journal_entry', 'إنشاء قيود يومية', 'finance'),
('finance.ledger', 'عرض دفتر الأستاذ', 'finance'),
('finance.reports', 'عرض التقارير المالية', 'finance'),
('finance.balance_sheet', 'الميزانية والمركز المالي', 'finance'),
('finance.setup', 'إعداد شجرة الحسابات', 'finance'),

-- Human Resources
('hr.view_staff', 'عرض قائمة الموظفين', 'hr'),
('hr.manage_staff', 'إضافة وتعديل الموظفين', 'hr'),
('hr.payroll', 'إدارة الرواتب والصرف', 'hr'),
('hr.attendance', 'تتبع الحضور والانصراف', 'hr'),

-- CRM & Marketing
('crm.access', 'الدخول لنظام العملاء', 'crm'),
('crm.manage_customers', 'إدارة بيانات العملاء', 'crm'),
('crm.marketing', 'الحملات التسويقية والواتساب', 'crm'),
('crm.loyalty', 'إدارة نقاط الولاء', 'crm'),

-- Settings & System
('settings.general', 'الإعدادات العامة', 'settings'),
('settings.security', 'إدارة الصلاحيات والأمان', 'settings'),
('settings.accounting', 'إعدادات المحاسبة والضرائب', 'settings'),
('system.audit', 'سجل التدقيق والرقابة', 'settings')
ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar, module = EXCLUDED.module;

-- 2. Create Custom Roles Table (Optional enhancement)
CREATE TABLE IF NOT EXISTS public.restaurant_custom_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name_ar VARCHAR(100) NOT NULL,
    base_role VARCHAR(50), -- Reference to hardcoded roles if needed
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, name_ar)
);

-- Enable RLS for custom roles
ALTER TABLE public.restaurant_custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all_custom_roles ON public.restaurant_custom_roles
    FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- 3. Update check_user_permission to handle custom roles and restaurant_id
CREATE OR REPLACE FUNCTION public.check_staff_permission(p_staff_id UUID, p_permission_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR(50);
  v_restaurant_id UUID;
  v_is_allowed BOOLEAN;
BEGIN
  -- 1. Get staff info
  SELECT role, restaurant_id INTO v_role, v_restaurant_id
  FROM public.restaurant_staff
  WHERE id = p_staff_id
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Check specific role permission in the matrix
  SELECT is_allowed INTO v_is_allowed
  FROM public.role_permissions
  WHERE (company_id = v_restaurant_id OR company_id IS NULL) -- Support global defaults if needed
    AND role = v_role 
    AND permission_code = p_permission_code
  LIMIT 1;

  IF v_is_allowed IS NOT NULL THEN
    RETURN v_is_allowed;
  END IF;

  -- Default fallbacks
  IF v_role IN ('manager', 'branch_manager') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
