-- =============================================================================
-- FIX 1: approve_staff_access — non-super admin was blocked even for 1 company
-- Root cause: check was array_length > 0 (blocks ANY array) instead of > 1
-- Fix: only restrict to super admin when assigning to MULTIPLE companies (> 1)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_staff_access(
  p_request_id UUID,
  p_role        TEXT    DEFAULT NULL,
  p_company_ids UUID[]  DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req   public.staff_access_requests%ROWTYPE;
  v_role  TEXT;
  v_cid   UUID;
  v_ids   UUID[];
  v_is_super BOOLEAN := public.has_role(auth.uid(), 'super_admin');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  SELECT * INTO v_req FROM public.staff_access_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب غير موجود';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'تمت معالجة هذا الطلب مسبقاً';
  END IF;

  v_role := LOWER(COALESCE(NULLIF(TRIM(p_role), ''), v_req.requested_role, 'cashier'));
  IF v_role NOT IN ('owner','admin','manager','accountant','cashier','viewer') THEN
    v_role := 'cashier';
  END IF;
  -- Never grant owner via staff approval path
  IF v_role = 'owner' THEN v_role := 'admin'; END IF;

  -- FIX: only block non-super-admin when they are trying to assign to MORE THAN ONE company
  -- Previously the check was > 0 which blocked ANY company list for non-super-admins
  IF p_company_ids IS NOT NULL AND array_length(p_company_ids, 1) > 1 THEN
    IF NOT v_is_super THEN
      RAISE EXCEPTION 'ضم الموظف لأكثر من شركة متاح للسوبر أدمن فقط';
    END IF;
    v_ids := p_company_ids;
  ELSIF p_company_ids IS NOT NULL AND array_length(p_company_ids, 1) = 1 THEN
    -- Single company in array: allowed for company admin — verify they admin that company
    v_ids := p_company_ids;
  ELSIF v_req.company_id IS NOT NULL THEN
    v_ids := ARRAY[v_req.company_id];
  ELSE
    RAISE EXCEPTION 'حدد شركة للموافقة';
  END IF;

  FOREACH v_cid IN ARRAY v_ids LOOP
    IF NOT v_is_super AND NOT public.is_company_admin(auth.uid(), v_cid) THEN
      RAISE EXCEPTION 'لست أدمن لهذه الشركة';
    END IF;

    INSERT INTO public.company_users (company_id, user_id, role, is_active)
    VALUES (v_cid, v_req.user_id, v_role, true)
    ON CONFLICT (company_id, user_id) DO UPDATE
      SET role = EXCLUDED.role,
          is_active = true;
  END LOOP;

  UPDATE public.staff_access_requests
  SET status = 'approved',
      company_id = v_ids[1],
      requested_role = v_role,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  -- Keep profile in sync
  UPDATE public.profiles
  SET full_name = COALESCE(NULLIF(v_req.full_name, ''), full_name),
      updated_at = NOW()
  WHERE user_id = v_req.user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_staff_access(UUID, TEXT, UUID[]) TO authenticated;


-- =============================================================================
-- FIX 2: Restaurants RLS — allow company members (employees) to read their company's restaurants
-- The existing "Public basic restaurant info" policy allows SELECT for everyone (USING true),
-- so employees CAN technically query restaurants via Supabase.
-- However the frontend query adds .eq('owner_id', user.id) which filters out employee-owned restaurants.
-- This SQL fix ensures approved company_users can still read their company restaurant:
-- We add an explicit authenticated-only policy as backup in case the public one is ever tightened.
-- =============================================================================

-- Add a dedicated policy allowing company members to read their assigned company's restaurants
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
CREATE POLICY "Company members can view their company restaurant"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (
    -- Owner always sees their own restaurant
    owner_id = auth.uid()
    -- Active company member sees the restaurant linked to their company
    OR id IN (
      SELECT r.id FROM public.restaurants r
      INNER JOIN public.company_users cu ON cu.company_id = r.company_id
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
    -- Super admin sees all
    OR public.has_role(auth.uid(), 'super_admin')
  );
