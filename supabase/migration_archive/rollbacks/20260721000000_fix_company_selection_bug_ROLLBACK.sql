-- ============================================================
-- ROLLBACK: FIX COMPANY SELECTION BUG
-- ============================================================
-- This rollback reverts the company selection bug fix
-- ============================================================

BEGIN;

-- Restore original get_my_staff_access function (without restaurant_id)
CREATE OR REPLACE FUNCTION public.get_my_staff_access()
RETURNS TABLE (
  has_access BOOLEAN,
  pending_request BOOLEAN,
  full_name TEXT,
  companies JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid() AND cu.is_active
      ),
      FALSE
    ) AS has_access,
    COALESCE(
      EXISTS (
        SELECT 1 FROM public.staff_access_requests sar
        WHERE sar.user_id = auth.uid() AND sar.status = 'pending'
      ),
      FALSE
    ) AS pending_request,
    COALESCE(
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    ) AS full_name,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'company_id', cu.company_id,
        'role', cu.role,
        'company_name', c.name
      ))
      FROM public.company_users cu
      JOIN public.companies c ON c.id = cu.company_id
      WHERE cu.user_id = auth.uid() AND cu.is_active
    ), '[]'::JSONB) AS companies;
END;
$$;

COMMIT;
