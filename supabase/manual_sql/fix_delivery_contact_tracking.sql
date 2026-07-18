-- ============================================================
-- Emergency Fix: Delivery Contact Tracking System
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- STEP 1: Drop ALL existing delivery_status constraints
-- (constraint names may vary, so we try all possibilities)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_delivery_status;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_status_fkey;

ALTER TABLE public.service_invoices DROP CONSTRAINT IF EXISTS service_invoices_delivery_status_check;
ALTER TABLE public.service_invoices DROP CONSTRAINT IF EXISTS check_service_invoices_delivery_status;
ALTER TABLE public.service_invoices DROP CONSTRAINT IF EXISTS service_invoices_delivery_status_fkey;

-- STEP 2: Find and drop any remaining constraints dynamically
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%delivery_status%'
  LOOP
    EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;

  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.service_invoices'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%delivery_status%'
  LOOP
    EXECUTE 'ALTER TABLE public.service_invoices DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END;
$$;

-- STEP 3: Add new constraints accepting all status values including contacted/no_answer
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_status_check CHECK (
  delivery_status IN ('pending', 'in_progress', 'contacted', 'no_answer', 'delivered', 'cancelled')
);

ALTER TABLE public.service_invoices ADD CONSTRAINT service_invoices_delivery_status_check CHECK (
  delivery_status IN ('pending', 'in_progress', 'contacted', 'no_answer', 'delivered', 'cancelled')
);

-- STEP 4: Create delivery_contact_logs table if not exists
CREATE TABLE IF NOT EXISTS public.delivery_contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.service_invoices(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL CHECK (source IN ('order', 'invoice')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('contacted', 'no_answer')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- STEP 5: Enable RLS
ALTER TABLE public.delivery_contact_logs ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create RLS Policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS delivery_contact_logs_select ON public.delivery_contact_logs;
CREATE POLICY delivery_contact_logs_select ON public.delivery_contact_logs
  FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id
        AND cu.user_id = auth.uid()
        AND cu.is_active = true
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS delivery_contact_logs_insert ON public.delivery_contact_logs;
CREATE POLICY delivery_contact_logs_insert ON public.delivery_contact_logs
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id
        AND cu.user_id = auth.uid()
        AND cu.is_active = true
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- STEP 7: Verify everything is in place
SELECT 'delivery_contact_logs table exists: ' || COUNT(*)::text FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'delivery_contact_logs';

SELECT 'orders constraint updated: ' || conname FROM pg_constraint
WHERE conrelid = 'public.orders'::regclass AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%contacted%';

SELECT 'service_invoices constraint updated: ' || conname FROM pg_constraint
WHERE conrelid = 'public.service_invoices'::regclass AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%contacted%';

-- Done
SELECT 'Setup complete! Contact tracking system is ready.' AS result;
