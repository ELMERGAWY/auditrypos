
-- Helper function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.telegram_bot_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_bot_id uuid NOT NULL REFERENCES public.telegram_bots(id) ON DELETE CASCADE UNIQUE,
  restaurant_id uuid NOT NULL,
  update_offset bigint NOT NULL DEFAULT 0,
  last_polled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_bot_state_restaurant ON public.telegram_bot_state(restaurant_id);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read bot state"
  ON public.telegram_bot_state FOR SELECT
  USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Owners manage bot state"
  ON public.telegram_bot_state FOR ALL
  USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_telegram_bot_state_updated_at
  BEFORE UPDATE ON public.telegram_bot_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ai_journal_suggestions
  ADD COLUMN IF NOT EXISTS analysis_standard varchar(20) DEFAULT 'EAS' CHECK (analysis_standard IN ('IFRS','EAS','US_GAAP'));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_journal_suggestions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
