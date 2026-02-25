
-- Create bans table for customers and delivery agents
CREATE TABLE public.bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('customer', 'agent')),
  target_identifier text NOT NULL, -- phone number or agent id
  target_name text NOT NULL DEFAULT '',
  ban_level text NOT NULL CHECK (ban_level IN ('warning', 'temporary', 'permanent')),
  reason text NOT NULL DEFAULT '',
  banned_by uuid NOT NULL,
  banned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, -- NULL for permanent bans
  is_active boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

-- Only restaurant owners and super admins can manage bans
CREATE POLICY "Owner manages bans"
ON public.bans FOR ALL
TO authenticated
USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Anon cannot access bans
CREATE POLICY "Anon cannot access bans"
ON public.bans FOR SELECT
TO anon
USING (false);
