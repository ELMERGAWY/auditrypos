
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  target_type text NOT NULL DEFAULT 'owner',
  target_id text DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
