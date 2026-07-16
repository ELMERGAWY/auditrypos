-- ============================================================
-- Abandoned Carts: track anonymous visitor carts for retargeting
-- ============================================================

BEGIN;

-- Table to store abandoned cart snapshots from the storefront
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  visitor_id    text NOT NULL,          -- anonymous UUID stored in browser localStorage
  customer_name text,                   -- filled if user started checkout
  customer_phone text,                  -- filled if user started checkout
  cart_items    jsonb NOT NULL DEFAULT '[]'::jsonb,
  cart_total    numeric NOT NULL DEFAULT 0,
  item_count    int NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'converted', 'expired')),
  last_activity timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookup by visitor
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_visitor
  ON public.abandoned_carts (restaurant_id, visitor_id);

-- Index for dashboard queries (latest active carts per restaurant)
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_restaurant_status
  ON public.abandoned_carts (restaurant_id, status, last_activity DESC);

-- ──────────────────────────────────────────────
-- RPC: upsert an abandoned cart snapshot
-- Called from the storefront on every cart change (debounced)
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_abandoned_cart(
  p_restaurant_id uuid,
  p_visitor_id    text,
  p_cart_items    jsonb,
  p_cart_total    numeric,
  p_item_count    int,
  p_customer_name  text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.abandoned_carts (
    restaurant_id, visitor_id, cart_items, cart_total, item_count,
    customer_name, customer_phone, status, last_activity
  )
  VALUES (
    p_restaurant_id, p_visitor_id, p_cart_items, p_cart_total, p_item_count,
    p_customer_name, p_customer_phone, 'active', now()
  )
  ON CONFLICT (restaurant_id, visitor_id)
  DO UPDATE SET
    cart_items    = EXCLUDED.cart_items,
    cart_total    = EXCLUDED.cart_total,
    item_count    = EXCLUDED.item_count,
    customer_name  = COALESCE(EXCLUDED.customer_name, abandoned_carts.customer_name),
    customer_phone = COALESCE(EXCLUDED.customer_phone, abandoned_carts.customer_phone),
    status        = 'active',
    last_activity = now();
END;
$$;

-- Add unique constraint needed for ON CONFLICT (restaurant_id, visitor_id)
ALTER TABLE public.abandoned_carts
  DROP CONSTRAINT IF EXISTS abandoned_carts_restaurant_visitor_unique;
ALTER TABLE public.abandoned_carts
  ADD CONSTRAINT abandoned_carts_restaurant_visitor_unique
  UNIQUE (restaurant_id, visitor_id);

-- ──────────────────────────────────────────────
-- RPC: mark cart as converted (called after successful order)
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_cart_converted(
  p_restaurant_id uuid,
  p_visitor_id    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.abandoned_carts
  SET status = 'converted', last_activity = now()
  WHERE restaurant_id = p_restaurant_id AND visitor_id = p_visitor_id;
END;
$$;

-- ──────────────────────────────────────────────
-- Permissions: anon users can call both RPCs
-- ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.upsert_abandoned_cart(uuid, text, jsonb, numeric, int, text, text)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_cart_converted(uuid, text)
  TO anon, authenticated;

-- Auto-expire carts older than 30 days (can be run via pg_cron or a scheduled function)
-- For now, owners can query status='active' AND last_activity > now() - interval '30 days'

COMMIT;
