-- ============================================================
-- ROLLBACK: FIX STAFF APPROVAL AND RESTAURANT ACCESS
-- ============================================================
-- This rollback reverts staff approval and restaurant access fixes
-- ============================================================

BEGIN;

-- Drop staff approval function
DROP FUNCTION IF EXISTS public.approve_staff_access(p_request_id UUID, p_company_id UUID);

-- Restore original RLS policies for restaurants
DROP POLICY IF EXISTS company_members_view_restaurants ON public.restaurants;

-- Restore original staff access request triggers
DROP TRIGGER IF EXISTS on_staff_access_request_approved ON public.staff_access_requests;

COMMIT;
