-- Inventory permissions guard — additive and compatible with existing permission tables.

INSERT INTO public.permissions (code, name_ar, description_ar, module) VALUES
  ('inventory.view', 'عرض المخزون', 'عرض أرصدة وحركات المخزون حسب الفرع والمخزن', 'inventory'),
  ('inventory.edit', 'تعديل بيانات المخزون', 'تعديل ربط الصنف بالمخزن وحدود إعادة الطلب', 'inventory'),
  ('inventory.warehouse.manage', 'إدارة المخازن', 'إنشاء وتعديل وتعطيل المخازن', 'inventory'),
  ('inventory.transfer', 'تحويل بين المخازن', 'إنشاء وعكس تحويلات المخزون بين المخازن', 'inventory'),
  ('inventory.receive', 'استلام مشتريات', 'ترحيل استلام الفواتير إلى المخزون وطبقات التكلفة', 'inventory'),
  ('inventory.adjust', 'جرد وتسوية المخزون', 'تسجيل تسويات الجرد والفروقات المخزنية', 'inventory'),
  ('inventory.costing.manage', 'إدارة تكلفة المخزون', 'إدارة طريقة التقييم وطبقات التكلفة والتقارير', 'inventory'),
  ('inventory.reports', 'تقارير المخزون', 'عرض تقارير القيمة والتكلفة وبطاقات الأصناف', 'inventory')
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  module = EXCLUDED.module;

CREATE OR REPLACE FUNCTION public.warehouse_permission_granted(
  p_warehouse_id uuid,
  p_action text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_restaurant_id uuid;
  v_company_id uuid;
  v_user_role text;
  v_allowed boolean;
BEGIN
  SELECT w.restaurant_id, r.company_id
  INTO v_restaurant_id, v_company_id
  FROM public.warehouses w
  JOIN public.restaurants r ON r.id = w.restaurant_id
  WHERE w.id = p_warehouse_id;

  IF v_restaurant_id IS NULL THEN RETURN false; END IF;
  IF auth.uid() IS NULL THEN RETURN true; END IF;
  IF public.has_role(auth.uid(), 'super_admin'::public.app_role)
     OR public.is_restaurant_owner(auth.uid(), v_restaurant_id) THEN
    RETURN true;
  END IF;

  SELECT cu.role INTO v_user_role
  FROM public.company_users cu
  WHERE cu.company_id = v_company_id
    AND cu.user_id = auth.uid()
    AND cu.is_active = true
  LIMIT 1;

  IF v_user_role IN ('owner', 'admin', 'manager', 'branch_manager') THEN
    RETURN true;
  END IF;

  SELECT CASE p_action
    WHEN 'view' THEN COALESCE(wp.can_view_stock, false)
    WHEN 'edit' THEN COALESCE(wp.can_edit_stock, false)
    WHEN 'transfer' THEN COALESCE(wp.can_transfer, false)
    WHEN 'adjust' THEN COALESCE(wp.can_adjust, false)
    WHEN 'receive' THEN COALESCE(wp.can_edit_stock, false)
    WHEN 'issue' THEN COALESCE(wp.can_view_stock, false)
    ELSE false
  END
  INTO v_allowed
  FROM public.warehouse_permissions wp
  WHERE wp.warehouse_id = p_warehouse_id
    AND wp.user_id = auth.uid()
  LIMIT 1;

  IF COALESCE(v_allowed, false) THEN RETURN true; END IF;

  IF p_action = 'issue' THEN
    RETURN public.check_user_permission(auth.uid(), v_company_id, 'pos.checkout');
  ELSIF p_action = 'view' THEN
    RETURN public.check_user_permission(auth.uid(), v_company_id, 'inventory.view')
       OR public.check_user_permission(auth.uid(), v_company_id, 'inventory.access');
  ELSIF p_action = 'edit' THEN
    RETURN public.check_user_permission(auth.uid(), v_company_id, 'inventory.edit');
  ELSIF p_action = 'transfer' THEN
    RETURN public.check_user_permission(auth.uid(), v_company_id, 'inventory.transfer');
  ELSIF p_action = 'receive' THEN
    RETURN public.check_user_permission(auth.uid(), v_company_id, 'inventory.receive');
  ELSIF p_action = 'adjust' THEN
    RETURN public.check_user_permission(auth.uid(), v_company_id, 'inventory.adjust');
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_enforce_inventory_movement_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_action text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  v_action := CASE upper(COALESCE(NEW.movement_type, 'IN'))
    WHEN 'OUT' THEN 'issue'
    WHEN 'ADJUSTMENT_OUT' THEN 'adjust'
    WHEN 'ADJUSTMENT_IN' THEN 'adjust'
    WHEN 'TRANSFER_OUT' THEN 'transfer'
    WHEN 'TRANSFER_IN' THEN 'transfer'
    ELSE 'receive'
  END;

  IF NOT public.warehouse_permission_granted(NEW.sub_warehouse_id, v_action) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية % على هذا المخزن', v_action;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_inventory_movement_permission ON public.inventory_movements;
CREATE TRIGGER trg_enforce_inventory_movement_permission
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_inventory_movement_permission();

CREATE OR REPLACE FUNCTION public.tg_enforce_inventory_transfer_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NOT public.warehouse_permission_granted(NEW.from_warehouse_id, 'transfer')
     OR NOT public.warehouse_permission_granted(NEW.to_warehouse_id, 'transfer') THEN
    RAISE EXCEPTION 'ليس لديك صلاحية التحويل بين المخازن المحددة';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_inventory_transfer_permission ON public.inventory_transfers;
CREATE TRIGGER trg_enforce_inventory_transfer_permission
BEFORE INSERT ON public.inventory_transfers
FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_inventory_transfer_permission();

REVOKE ALL ON FUNCTION public.warehouse_permission_granted(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.warehouse_permission_granted(uuid, text) TO authenticated, service_role;
