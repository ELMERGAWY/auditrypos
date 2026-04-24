-- ============================================================
-- AUDITRY POS: Business Profiles + Accounting Policies (Multi-business ERP)
-- ============================================================
-- Goal:
-- - Define a "Business Profile" per company (Retail / Restaurant / Services)
-- - Store accounting policies (inventory costing, revenue recognition, tax mode, etc.)
-- - Allow workspace-level override (branch-specific profile)
-- - Backfill: create a default profile per company and attach restaurants/workspaces
--
-- Why this matters:
-- - Same POS core can support different industries by switching profile/policies
-- - ERP posting engine can read consistent rules instead of hard-coded conditions

BEGIN;

-- If business_profiles table already exists (partial/previous run), ensure it has company_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='business_profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='business_profiles' AND column_name='company_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.business_profiles ADD COLUMN company_id uuid REFERENCES public.companies ON DELETE CASCADE';
    END IF;

    -- Ensure required columns exist for re-runs (partial table definition from older attempts)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='business_profiles' AND column_name='is_default'
    ) THEN
      EXECUTE 'ALTER TABLE public.business_profiles ADD COLUMN is_default boolean NOT NULL DEFAULT false';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='business_profiles' AND column_name='is_active'
    ) THEN
      EXECUTE 'ALTER TABLE public.business_profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='business_profiles' AND column_name='business_type'
    ) THEN
      EXECUTE 'ALTER TABLE public.business_profiles ADD COLUMN business_type text NOT NULL DEFAULT ''restaurant''';
    END IF;

    -- Add/ensure CHECK constraint separately (no IF NOT EXISTS support for constraints)
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'business_profiles'
        AND c.conname = 'business_profiles_business_type_chk'
    ) THEN
      EXECUTE 'ALTER TABLE public.business_profiles ADD CONSTRAINT business_profiles_business_type_chk CHECK (business_type IN (''retail'',''restaurant'',''services''))';
    END IF;
  END IF;
END $$;

-- Ensure restaurants has company_id (in case step-1 was applied partially / older schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'restaurants'
      AND column_name = 'company_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.restaurants ADD COLUMN company_id uuid REFERENCES public.companies ON DELETE SET NULL';
  END IF;

  -- index (safe if column exists)
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'idx_restaurants_company_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_restaurants_company_id ON public.restaurants(company_id)';
  END IF;

  -- Best-effort backfill: by companies.primary_owner_id = restaurants.owner_id
  -- (works if companies table has primary_owner_id from our foundation migration)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'primary_owner_id'
  ) THEN
    EXECUTE $SQL$
      UPDATE public.restaurants r
      SET company_id = c.id
      FROM public.companies c
      WHERE c.primary_owner_id = r.owner_id
        AND r.company_id IS NULL
        AND r.owner_id IS NOT NULL
    $SQL$;
  END IF;
END $$;

-- Ensure workspaces has company_id (some older migrations created workspaces without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'company_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.workspaces ADD COLUMN company_id uuid REFERENCES public.companies ON DELETE SET NULL';
  END IF;

  -- index (safe if column exists)
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'idx_workspaces_company_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_workspaces_company_id ON public.workspaces(company_id)';
  END IF;

  -- Backfill (safe even if already filled)
  EXECUTE $SQL$
    UPDATE public.workspaces w
    SET company_id = r.company_id
    FROM public.restaurants r
    WHERE w.restaurant_id = r.id
      AND w.company_id IS NULL
  $SQL$;
END $$;

-- 1) Business profiles (company scope)
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,

  -- Identity
  name text NOT NULL,
  business_type text NOT NULL DEFAULT 'restaurant' CHECK (business_type IN ('retail','restaurant','services')),

  -- Accounting policies (high-signal controls)
  accounting_basis text NOT NULL DEFAULT 'accrual' CHECK (accounting_basis IN ('accrual','cash')),
  inventory_cost_method text NOT NULL DEFAULT 'avg' CHECK (inventory_cost_method IN ('fifo','avg','specific')),
  revenue_recognition text NOT NULL DEFAULT 'at_invoice' CHECK (revenue_recognition IN ('at_invoice','at_delivery','at_payment')),

  -- Tax policy
  tax_enabled boolean NOT NULL DEFAULT false,
  tax_included boolean NOT NULL DEFAULT true,
  default_tax_rate numeric(6,3) NOT NULL DEFAULT 0,

  -- Operational rules (kept flexible)
  pos_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  accounting_rules jsonb NOT NULL DEFAULT '{}'::jsonb,

  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_business_profiles_company_id ON public.business_profiles(company_id);

-- One default profile per company
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_profiles_one_default_per_company
ON public.business_profiles(company_id)
WHERE is_default = true;

-- 2) Workspace override (optional)
CREATE TABLE IF NOT EXISTS public.workspace_business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.business_profiles ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.workspace_business_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workspace_business_profiles_profile_id ON public.workspace_business_profiles(profile_id);

-- 3) Minimal RLS based on company membership
DO $$
BEGIN
  -- business_profiles: members read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='business_profiles' AND policyname='business_profiles_members_can_read'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY business_profiles_members_can_read
      ON public.business_profiles
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = business_profiles.company_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
      ));
    $POL$;
  END IF;

  -- business_profiles: owners/admins write
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='business_profiles' AND policyname='business_profiles_owners_admins_can_write'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY business_profiles_owners_admins_can_write
      ON public.business_profiles
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = business_profiles.company_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
          AND cu.role IN ('owner','admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = business_profiles.company_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
          AND cu.role IN ('owner','admin')
      ));
    $POL$;
  END IF;

  -- workspace_business_profiles: members read (through workspace->company)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspace_business_profiles' AND policyname='workspace_profiles_members_can_read'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY workspace_profiles_members_can_read
      ON public.workspace_business_profiles
      FOR SELECT
      USING (EXISTS (
        SELECT 1
        FROM public.workspaces w
        JOIN public.restaurants r ON r.id = w.restaurant_id
        JOIN public.company_users cu ON cu.company_id = r.company_id
        WHERE w.id = workspace_business_profiles.workspace_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
      ));
    $POL$;
  END IF;

  -- workspace_business_profiles: owners/admins write (through workspace->company)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspace_business_profiles' AND policyname='workspace_profiles_owners_admins_can_write'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY workspace_profiles_owners_admins_can_write
      ON public.workspace_business_profiles
      FOR ALL
      USING (EXISTS (
        SELECT 1
        FROM public.workspaces w
        JOIN public.restaurants r ON r.id = w.restaurant_id
        JOIN public.company_users cu ON cu.company_id = r.company_id
        WHERE w.id = workspace_business_profiles.workspace_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
          AND cu.role IN ('owner','admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1
        FROM public.workspaces w
        JOIN public.restaurants r ON r.id = w.restaurant_id
        JOIN public.company_users cu ON cu.company_id = r.company_id
        WHERE w.id = workspace_business_profiles.workspace_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
          AND cu.role IN ('owner','admin')
      ));
    $POL$;
  END IF;
END $$;

-- 4) Attach restaurants to a profile (company default)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS business_profile_id uuid REFERENCES public.business_profiles ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_business_profile_id ON public.restaurants(business_profile_id);

-- 5) Backfill: create a default profile per company (if missing)
-- We infer business_type from restaurants.business_type / restaurants.business_category when present.
INSERT INTO public.business_profiles (
  company_id, name, business_type, tax_enabled, tax_included, default_tax_rate, is_default, is_active, pos_rules, accounting_rules
)
SELECT
  c.id AS company_id,
  'Default Profile' AS name,
  COALESCE(NULLIF(lower(r.business_type), ''), NULLIF(lower(r.business_category), ''), 'restaurant') AS business_type,
  -- tax hints (if existing restaurants have tax_settings JSON)
  COALESCE((r.tax_settings->>'enabled')::boolean, false) AS tax_enabled,
  COALESCE((r.tax_settings->>'included')::boolean, true) AS tax_included,
  COALESCE((r.tax_settings->>'rate')::numeric, 0) AS default_tax_rate,
  true AS is_default,
  true AS is_active,
  jsonb_build_object(
    'uses_tables', (COALESCE(NULLIF(lower(r.business_type), ''), NULLIF(lower(r.business_category), ''), 'restaurant') = 'restaurant')
  ) AS pos_rules,
  '{}'::jsonb AS accounting_rules
FROM public.companies c
LEFT JOIN LATERAL (
  SELECT r2.*
  FROM public.restaurants r2
  WHERE r2.company_id = c.id
  ORDER BY r2.created_at ASC NULLS LAST
  LIMIT 1
) r ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_profiles bp
  WHERE bp.company_id = c.id AND bp.is_default = true
);

-- Normalize any unexpected business_type values to allowed set
UPDATE public.business_profiles
SET business_type = CASE
  WHEN business_type IN ('retail','restaurant','services') THEN business_type
  WHEN business_type IN ('trade','shop','grocery','pharmacy') THEN 'retail'
  WHEN business_type IN ('service','services_business') THEN 'services'
  ELSE 'restaurant'
END
WHERE business_type NOT IN ('retail','restaurant','services');

-- 6) Backfill restaurants.business_profile_id from company default
UPDATE public.restaurants r
SET business_profile_id = bp.id
FROM public.business_profiles bp
WHERE bp.company_id = r.company_id
  AND bp.is_default = true
  AND r.business_profile_id IS NULL;

-- 7) Workspace-level default: attach each workspace to the company default profile (unless overridden)
INSERT INTO public.workspace_business_profiles (workspace_id, profile_id)
SELECT
  w.id,
  bp.id
FROM public.workspaces w
JOIN public.business_profiles bp
  ON bp.company_id = COALESCE(w.company_id, (SELECT r.company_id FROM public.restaurants r WHERE r.id = w.restaurant_id LIMIT 1))
 AND bp.is_default = true
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_business_profiles wbp
  WHERE wbp.workspace_id = w.id
);

COMMIT;

