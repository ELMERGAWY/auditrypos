-- ============================================================
-- 🚨 EMERGENCY FIX: Customer Visibility Restoration
-- ============================================================
-- Run this directly in Supabase SQL Editor
-- It will make ALL customer data visible again immediately
-- ============================================================

-- STEP 1: Show current state (run this first to diagnose)
SELECT 
  r.id,
  r.name,
  r.plan_id,
  r.status,
  r.created_at,
  (SELECT COUNT(*) FROM customers c WHERE c.restaurant_id = r.id) AS customer_count,
  (SELECT COUNT(*) FROM orders   o WHERE o.restaurant_id = r.id) AS order_count
FROM restaurants r
ORDER BY r.created_at DESC;

-- ============================================================
-- STEP 2: THE FIX
-- Promote any restaurant that is on 'free' plan but has 
-- real data (customers OR orders) back to NULL (= legacy = full access)
-- ============================================================

UPDATE restaurants r
SET plan_id = NULL
WHERE r.plan_id = 'free'
  AND (
    EXISTS (SELECT 1 FROM customers c WHERE c.restaurant_id = r.id LIMIT 1)
    OR
    EXISTS (SELECT 1 FROM orders   o WHERE o.restaurant_id = r.id LIMIT 1)
  );

-- How many rows were updated?
SELECT 'Fixed restaurants: ' || COUNT(*) 
FROM restaurants 
WHERE plan_id IS NULL;

-- ============================================================
-- STEP 3: Verify fix (run after step 2)
-- ============================================================
SELECT 
  r.id,
  r.name,
  COALESCE(r.plan_id, 'legacy (full access)') AS effective_plan,
  (SELECT COUNT(*) FROM customers c WHERE c.restaurant_id = r.id) AS customer_count,
  (SELECT COUNT(*) FROM orders   o WHERE o.restaurant_id = r.id) AS order_count
FROM restaurants r
ORDER BY r.created_at DESC;
