-- ============================================================
-- CHECK TRANSACTION DETAILS FOR SPECIFIC CUSTOMER
-- COPY TO SUPABASE SQL EDITOR
-- ============================================================

-- Check transactions for the customer "حسام منتصر" (390 balance but should be 0)
SELECT
  ct.id,
  ct.type,
  ct.amount,
  ct.description,
  ct.reference_type,
  ct.reference_id,
  ct.created_at
FROM public.customer_transactions ct
WHERE ct.customer_id = '4c624384-aa3c-47e1-b93a-01aca0527699'
ORDER BY ct.created_at;
