-- Add 'contractor' to payment_vouchers_actor_type_check constraint
-- This allows payment vouchers to be created for contractors

BEGIN;

-- Drop the existing constraint
ALTER TABLE public.payment_vouchers 
DROP CONSTRAINT IF EXISTS payment_vouchers_actor_type_check;

-- Recreate the constraint with 'contractor' included
ALTER TABLE public.payment_vouchers 
ADD CONSTRAINT payment_vouchers_actor_type_check 
CHECK (actor_type IN ('customer', 'supplier', 'contractor'));

COMMIT;
