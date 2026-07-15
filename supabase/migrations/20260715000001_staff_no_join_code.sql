-- Allow company admins to see/approve unassigned staff requests (no join code required)

DROP POLICY IF EXISTS staff_req_select ON public.staff_access_requests;
CREATE POLICY staff_req_select ON public.staff_access_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR (company_id IS NOT NULL AND public.is_company_admin(auth.uid(), company_id))
    OR (
      company_id IS NULL
      AND status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
          AND cu.is_active = true
          AND cu.role IN ('owner', 'admin')
      )
    )
    OR (
      company_id IS NULL
      AND status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS staff_req_update ON public.staff_access_requests;
CREATE POLICY staff_req_update ON public.staff_access_requests
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (company_id IS NOT NULL AND public.is_company_admin(auth.uid(), company_id))
    OR (
      company_id IS NULL
      AND status = 'pending'
      AND (
        EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid()
            AND cu.is_active = true
            AND cu.role IN ('owner', 'admin')
        )
        OR EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.owner_id = auth.uid()
        )
      )
    )
  );

-- Reject RPC: allow company admin/owner to reject unassigned requests
CREATE OR REPLACE FUNCTION public.reject_staff_access(
  p_request_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.staff_access_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.staff_access_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'طلب غير موجود'; END IF;

  IF NOT (
    public.has_role(auth.uid(), 'super_admin')
    OR (v_req.company_id IS NOT NULL AND public.is_company_admin(auth.uid(), v_req.company_id))
    OR (
      v_req.company_id IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid() AND cu.is_active AND cu.role IN ('owner','admin')
        )
        OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_id = auth.uid())
      )
    )
  ) THEN
    RAISE EXCEPTION 'غير مصرح برفض هذا الطلب';
  END IF;

  UPDATE public.staff_access_requests
  SET status = 'rejected',
      review_note = p_note,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN true;
END;
$$;
