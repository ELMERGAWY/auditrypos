-- ============================================================
-- ROLLBACK: DELIVERY CONTACT LOGS AND STATUS
-- ============================================================
-- This rollback removes delivery contact logs and status tracking
-- ============================================================

BEGIN;

-- Drop delivery contact logs table
DROP TABLE IF EXISTS public.delivery_contact_logs CASCADE;

-- Remove delivery status columns from orders
ALTER TABLE public.orders DROP COLUMN IF EXISTS delivery_status;
ALTER TABLE public.orders DROP COLUMN IF EXISTS delivery_contact_name;
ALTER TABLE public.orders DROP COLUMN IF EXISTS delivery_contact_phone;

COMMIT;
