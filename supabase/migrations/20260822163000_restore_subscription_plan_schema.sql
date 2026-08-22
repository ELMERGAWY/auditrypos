-- Additive repair for subscription plan metadata used during signup.
-- Safe to rerun: no tables or operational data are dropped, truncated, or rewritten.
BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  name_fr text NOT NULL,
  price_usd numeric(10,2) NOT NULL DEFAULT 0,
  price_eur numeric(10,2) NOT NULL DEFAULT 0,
  price_egp numeric(10,2) NOT NULL DEFAULT 0,
  max_modules integer NOT NULL DEFAULT 1,
  max_staff integer NOT NULL DEFAULT 3,
  max_branches integer NOT NULL DEFAULT 1,
  allowed_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  locked_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_plans
  (id, name_ar, name_en, name_fr, price_usd, price_eur, price_egp,
   max_modules, max_staff, max_branches, allowed_features, locked_features, sort_order)
VALUES
  ('free', 'مجاني', 'Free', 'Gratuit', 0, 0, 0, 1, 3, 1,
   '["pos","orders","menu","inventory","notifications","settings","chat","staff"]'::jsonb,
   '["crm","ai_assistant","analytics","financials","treasury","branches","marketing_hub"]'::jsonb, 0),
  ('starter', 'البداية', 'Starter', 'Débutant', 9, 8, 199, 1, 10, 1,
   '["pos","orders","menu","inventory","customers","suppliers","analytics","notifications","settings","chat","staff"]'::jsonb,
   '["crm","ai_assistant","financials","treasury","branches"]'::jsonb, 1),
  ('pro', 'احترافي', 'Pro', 'Pro', 29, 27, 499, 3, 50, 5,
   '["pos","orders","menu","inventory","crm","financials","treasury","analytics","ai_assistant","delivery","kds","notifications","settings","chat","staff"]'::jsonb,
   '["branches","marketing_hub"]'::jsonb, 2),
  ('enterprise', 'مؤسسات', 'Enterprise', 'Entreprise', 59, 55, 999, 999, 999, 999,
   '["all"]'::jsonb, '[]'::jsonb, 3)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='subscription_plans'
      AND policyname='anyone_read_subscription_plans'
  ) THEN
    CREATE POLICY anyone_read_subscription_plans
      ON public.subscription_plans
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='subscription_plans'
      AND policyname='super_admin_manage_subscription_plans'
  ) THEN
    CREATE POLICY super_admin_manage_subscription_plans
      ON public.subscription_plans
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
      ));
  END IF;
END $$;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS plan_id text;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'ar';

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'egp';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='restaurants_plan_id_fkey'
      AND conrelid='public.restaurants'::regclass
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_plan_id_fkey
      FOREIGN KEY (plan_id)
      REFERENCES public.subscription_plans(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_restaurants_plan_id
  ON public.restaurants (plan_id);

COMMIT;
