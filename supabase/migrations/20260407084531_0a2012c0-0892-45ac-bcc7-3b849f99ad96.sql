
-- Create restaurant_staff table
CREATE TABLE public.restaurant_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'cashier',
  phone text NOT NULL DEFAULT '',
  pin text NOT NULL DEFAULT '0000',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages staff"
ON public.restaurant_staff
FOR ALL
TO authenticated
USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add payment fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;
