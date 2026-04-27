
-- Add discount and notes columns to orders for POS premium features
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '';
