-- ============================================================
-- Add contacted/no_answer to delivery_status and create contact logs table
-- ============================================================

BEGIN;

-- 1. Update CHECK constraints on orders.delivery_status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_status_check CHECK (
  delivery_status IN ('pending', 'in_progress', 'contacted', 'no_answer', 'delivered', 'cancelled')
);

-- 2. Update CHECK constraints on service_invoices.delivery_status
ALTER TABLE public.service_invoices DROP CONSTRAINT IF EXISTS service_invoices_delivery_status_check;
ALTER TABLE public.service_invoices ADD CONSTRAINT service_invoices_delivery_status_check CHECK (
  delivery_status IN ('pending', 'in_progress', 'contacted', 'no_answer', 'delivered', 'cancelled')
);

-- 3. Create delivery_contact_logs table
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

-- 4. Enable Row Level Security (RLS) on delivery_contact_logs
ALTER TABLE public.delivery_contact_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS delivery_contact_logs_select ON public.delivery_contact_logs;
CREATE POLICY delivery_contact_logs_select ON public.delivery_contact_logs
  FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
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
      JOIN public.company_users cu ON cu.company_id = r.company_id AND cu.user_id = auth.uid() AND cu.is_active = true
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

COMMIT;
