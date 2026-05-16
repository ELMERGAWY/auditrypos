-- ============================================================
-- FIX ORDER STATUS CONSTRAINT
-- ============================================================
-- The previous constraint prevented orders from being marked as 'cancelled' or 'returned'.
-- This blocked the inventory restoration logic and order deletion flow.

BEGIN;

-- 1. Drop the restrictive constraint if it exists
-- The name 'orders_status_check' is the default name given by Postgres for CHECK (status IN (...))
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Add the expanded constraint
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled', 'returned'));

-- 3. Update existing statuses if any are mismatched (safety)
-- (No action needed as they wouldn't have been allowed in anyway)

COMMIT;
