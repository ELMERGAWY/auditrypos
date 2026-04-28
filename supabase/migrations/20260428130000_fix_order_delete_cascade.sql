-- Fix order deletion by ensuring all related records are deleted automatically
-- We need to check and potentially drop existing constraints if they don't have CASCADE

-- 1. order_items
ALTER TABLE public.order_items 
DROP CONSTRAINT IF EXISTS order_items_order_id_fkey,
ADD CONSTRAINT order_items_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- 2. order_taxes
ALTER TABLE public.order_taxes 
DROP CONSTRAINT IF EXISTS order_taxes_order_id_fkey,
ADD CONSTRAINT order_taxes_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- 3. inventory_consumption
ALTER TABLE public.inventory_consumption 
DROP CONSTRAINT IF EXISTS inventory_consumption_order_id_fkey,
ADD CONSTRAINT inventory_consumption_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- 4. customer_transactions
ALTER TABLE public.customer_transactions 
DROP CONSTRAINT IF EXISTS customer_transactions_order_id_fkey,
ADD CONSTRAINT customer_transactions_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- 5. waiter_calls (if linked to order)
-- Check if waiter_calls has order_id
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='waiter_calls' AND column_name='order_id') THEN
    ALTER TABLE public.waiter_calls 
    DROP CONSTRAINT IF EXISTS waiter_calls_order_id_fkey,
    ADD CONSTRAINT waiter_calls_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;
