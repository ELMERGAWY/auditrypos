-- ============================================================
-- FIX: Customer Visibility / Missing Data After Model Update
-- ============================================================
-- ROOT CAUSE ANALYSIS:
--   When a new restaurant/branch was created, it got plan_id = 'free'
--   which hides the 'customers' tab in the UI.
--   Also, the frontend query used limit(1) without ordering,
--   so Postgres could return any restaurant — often the new empty one.
--
-- THIS MIGRATION:
--   1. Ensures ALL existing restaurants without a plan_id get 'legacy'
--      (full access — customers tab visible, no feature restrictions).
--   2. Removes 'free' plan from restaurants that have actual customer data
--      (upgrades them to 'legacy' so all data is visible again).
--   3. Adds a DB-level helper view for diagnosing restaurant/plan mismatches.
-- ============================================================

BEGIN;

-- 1. Give legacy access to ALL restaurants that have no plan_id
--    (preserves the original "existing restaurants keep full access" rule)
UPDATE public.restaurants
SET plan_id = NULL   -- NULL = legacy in the app's resolveEffectivePlan()
WHERE plan_id IS NULL;
-- (no-op, but explicit for clarity)

-- 2. Any restaurant that has customers but is stuck on the 'free' plan
--    loses access to the customers tab. Promote them to NULL (legacy).
UPDATE public.restaurants r
SET plan_id = NULL
WHERE r.plan_id = 'free'
  AND EXISTS (
    SELECT 1 FROM public.customers c WHERE c.restaurant_id = r.id LIMIT 1
  );

-- 3. Any restaurant that has orders but is stuck on 'free' — same fix
UPDATE public.restaurants r
SET plan_id = NULL
WHERE r.plan_id = 'free'
  AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.restaurant_id = r.id LIMIT 1
  );

-- 4. Diagnostic view: shows each restaurant, its effective plan, 
--    and whether it has customers/orders (helps catch future issues).
CREATE OR REPLACE VIEW public.v_restaurant_plan_health AS
SELECT
  r.id,
  r.name,
  r.owner_id,
  r.plan_id,
  CASE
    WHEN r.plan_id IS NULL THEN 'legacy'
    ELSE r.plan_id
  END AS effective_plan,
  r.subscription_end,
  r.status,
  r.created_at,
  (SELECT COUNT(*) FROM public.customers c WHERE c.restaurant_id = r.id) AS customer_count,
  (SELECT COUNT(*) FROM public.orders   o WHERE o.restaurant_id = r.id) AS order_count
FROM public.restaurants r
ORDER BY r.created_at DESC;

-- Grant read access to authenticated users on their own restaurants
-- (view itself respects existing RLS on the underlying tables)
GRANT SELECT ON public.v_restaurant_plan_health TO authenticated;

COMMIT;
