-- ==============================================================================
-- Migration: Granular Permissions System
-- Description: Adds dynamic permissions matrix for roles in each company
-- ==============================================================================

-- 1. Create Permissions Dictionary
CREATE TABLE IF NOT EXISTS public.permissions (
  code VARCHAR(50) PRIMARY KEY,
  name_ar VARCHAR(100) NOT NULL,
  description_ar TEXT,
  module VARCHAR(50) NOT NULL -- e.g., 'pos', 'inventory', 'finance'
);

-- 2. Create Role Permissions Map
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- e.g., 'cashier', 'manager'
  permission_code VARCHAR(50) REFERENCES public.permissions(code) ON DELETE CASCADE,
  is_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, role, permission_code)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for permissions (Read Only for everyone)
DROP POLICY IF EXISTS permissions_read_all ON public.permissions;
CREATE POLICY permissions_read_all ON public.permissions FOR SELECT USING (true);

-- Policies for role_permissions
DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
CREATE POLICY role_permissions_read ON public.role_permissions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = role_permissions.company_id AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS role_permissions_write ON public.role_permissions;
CREATE POLICY role_permissions_write ON public.role_permissions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu 
      WHERE cu.company_id = role_permissions.company_id 
        AND cu.user_id = auth.uid() 
        AND cu.role IN ('owner', 'admin')
    )
  );

-- 3. Insert Base Permissions
INSERT INTO public.permissions (code, name_ar, module) VALUES
('pos.access', 'الدخول لنقطة البيع', 'pos'),
('pos.apply_discount', 'تطبيق خصم', 'pos'),
('pos.void_order', 'إلغاء الطلبات', 'pos'),
('pos.delete_item', 'حذف صنف من السلة', 'pos'),
('pos.checkout', 'إتمام الدفع', 'pos'),
('inventory.access', 'الدخول للمخزون', 'inventory'),
('inventory.adjust', 'تسوية المخزون', 'inventory'),
('finance.access', 'الدخول للحسابات', 'finance'),
('finance.view_reports', 'عرض التقارير المالية', 'finance'),
('settings.access', 'الدخول للإعدادات', 'settings')
ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar, module = EXCLUDED.module;

-- 4. RPC Function to check permission dynamically
CREATE OR REPLACE FUNCTION public.check_user_permission(p_user_id UUID, p_company_id UUID, p_permission_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR(50);
  v_is_allowed BOOLEAN;
BEGIN
  -- 1. Get user role in the company
  SELECT role INTO v_role
  FROM public.company_users
  WHERE user_id = p_user_id AND company_id = p_company_id
  LIMIT 1;

  -- If user is owner or admin, always return true
  IF v_role IN ('owner', 'admin') THEN
    RETURN true;
  END IF;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Check specific role permission
  SELECT is_allowed INTO v_is_allowed
  FROM public.role_permissions
  WHERE company_id = p_company_id 
    AND role = v_role 
    AND permission_code = p_permission_code
  LIMIT 1;

  -- If explicitly defined, return it
  IF v_is_allowed IS NOT NULL THEN
    RETURN v_is_allowed;
  END IF;

  -- Default fallbacks if not explicitly defined in the matrix
  IF v_role = 'manager' THEN
    RETURN true; -- Managers can do mostly everything by default
  ELSIF v_role = 'cashier' THEN
    -- Cashiers default to POS only
    IF p_permission_code IN ('pos.access', 'pos.checkout', 'pos.delete_item') THEN
      RETURN true;
    ELSE
      RETURN false;
    END IF;
  ELSIF v_role = 'accountant' THEN
    IF p_permission_code LIKE 'finance.%' OR p_permission_code LIKE 'inventory.%' THEN
      RETURN true;
    ELSE
      RETURN false;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
