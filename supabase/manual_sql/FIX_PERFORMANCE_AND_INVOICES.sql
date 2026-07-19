-- ================================================================
-- 🔧 COMPREHENSIVE FIX: Performance + Invoice-Order Link
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nmkjyweoagbblkbqavdz/sql
-- ================================================================
-- This script fixes two root-cause issues:
--  A) Slow customer/data loading due to recursive RLS on company_users
--  B) Missing sales_invoices links to their POS orders
-- ================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- PART A: FIX RECURSIVE RLS ON company_users (PERFORMANCE FIX)
-- The "Admins can view company members" policy we added queries
-- company_users INSIDE the company_users RLS check → infinite loop
-- ════════════════════════════════════════════════════════════════

-- A1. Drop ALL policies we added that could cause recursion
DROP POLICY IF EXISTS "Users can view their own company memberships"  ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members"               ON public.company_users;
DROP POLICY IF EXISTS "company_users_safe_read"                       ON public.company_users;

-- A2. Keep only the safe non-recursive policies (from older migrations)
-- These are the original good ones:
--   "users_see_self"          → user_id = auth.uid()  (nuclear_rls_fix)
--   "company_users_self_view" → user_id = auth.uid()  (final_recursion_fix)
--   "super_admin_all_company_users" → super_admin bypass (staff_and_inventory_fixes)
-- If they don't exist, recreate them safely:

DROP POLICY IF EXISTS "users_see_self"          ON public.company_users;
DROP POLICY IF EXISTS "company_users_self_view" ON public.company_users;

CREATE POLICY "company_users_self_view"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- A3. Add index on company_users to speed up is_restaurant_owner() lookups
CREATE INDEX IF NOT EXISTS idx_company_users_user_id_active
  ON public.company_users (user_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_company_users_company_id
  ON public.company_users (company_id, user_id);

-- ════════════════════════════════════════════════════════════════
-- PART B: FIX SALES INVOICES — ensure orders have linked invoices
-- ════════════════════════════════════════════════════════════════

-- B1. Add order_id column to sales_invoices if somehow missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoices' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.sales_invoices
      ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_order_id ON public.sales_invoices(order_id);
  END IF;
END $$;

-- B2. Add restaurant_id column to sales_invoices if missing
--     (needed so the restaurant_isolation RLS policy works)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoices' AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE public.sales_invoices
      ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_restaurant_id ON public.sales_invoices(restaurant_id);
  END IF;
END $$;

-- B3. Backfill restaurant_id from the linked order (if missing)
UPDATE public.sales_invoices si
SET restaurant_id = o.restaurant_id
FROM public.orders o
WHERE si.order_id = o.id
  AND si.restaurant_id IS NULL;

-- B4. Link any unlinked sales_invoices to their orders via source_reference_id
UPDATE public.sales_invoices
SET order_id = source_reference_id
WHERE source_type = 'pos'
  AND source_reference_id IS NOT NULL
  AND order_id IS NULL;

-- After linking, backfill restaurant_id from orders again (now that order_id is filled)
UPDATE public.sales_invoices si
SET restaurant_id = o.restaurant_id
FROM public.orders o
WHERE si.order_id = o.id
  AND si.restaurant_id IS NULL;

-- B5. Fix the sales_invoices RLS to allow restaurant-based access
--     The old policy used user_owns_company(company_id) which is often wrong
--     We add a permissive restaurant-based policy as well

-- Drop restrictive restaurant_isolation policy if it blocks access
DROP POLICY IF EXISTS "restaurant_isolation" ON public.sales_invoices;

-- Recreate with both restaurant_id AND company_id checks
DROP POLICY IF EXISTS "sales_invoices_access" ON public.sales_invoices;
CREATE POLICY "sales_invoices_access"
  ON public.sales_invoices
  FOR ALL
  TO authenticated
  USING (
    -- Owner of the restaurant this invoice belongs to
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
    -- Staff member of the restaurant this invoice belongs to
    OR restaurant_id IN (
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
    -- Company owner (ERP invoices)
    OR public.user_owns_company(company_id)
    -- Super admin sees all
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- B6. Also fix sales_invoice_lines RLS
DROP POLICY IF EXISTS "users access their sales_invoice_lines" ON public.sales_invoice_lines;
CREATE POLICY "sales_invoice_lines_access"
  ON public.sales_invoice_lines
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales_invoices si
      WHERE si.id = sales_invoice_lines.invoice_id
        AND (
          si.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
          OR si.restaurant_id IN (
            SELECT r.id FROM public.restaurants r
            JOIN public.company_users cu ON cu.company_id = r.company_id
            WHERE cu.user_id = auth.uid() AND cu.is_active = true
          )
          OR public.user_owns_company(si.company_id)
          OR public.has_role(auth.uid(), 'super_admin')
        )
    )
  );

-- ════════════════════════════════════════════════════════════════
-- DIAGNOSTIC: Show current state
-- ════════════════════════════════════════════════════════════════

-- Show company_users policies (should be simple now)
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'company_users'
ORDER BY policyname;

-- Show how many sales_invoices have no order_id link
SELECT
  COUNT(*) FILTER (WHERE order_id IS NOT NULL) AS linked_to_order,
  COUNT(*) FILTER (WHERE order_id IS NULL)     AS unlinked,
  COUNT(*) TOTAL
FROM public.sales_invoices;

-- Show how many orders have NO corresponding sales_invoice
SELECT
  COUNT(*) AS orders_without_invoice
FROM public.orders o
WHERE o.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.sales_invoices si WHERE si.order_id = o.id
  );

COMMIT;

SELECT '✅ Fix applied: recursive RLS removed, invoices linked, policies updated!' AS status;
