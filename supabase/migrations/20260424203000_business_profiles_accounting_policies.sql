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

-- ============================================================
-- Company-level business configuration (compatible with existing global business_profiles(code))
-- ============================================================
-- Many environments already have `public.business_profiles` as a GLOBAL catalog with:
--   code (text PK), name_ar/name_en, features...
-- So we do NOT recreate it here.

-- 1) Company business profile (tenant-scoped) referencing global business_profiles(code)
CREATE TABLE IF NOT EXISTS public.company_business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies ON DELETE CASCADE,
  profile_code text NOT NULL REFERENCES public.business_profiles(code) ON DELETE RESTRICT,

  -- Policies / rules (per company)
  accounting_basis text NOT NULL DEFAULT 'accrual' CHECK (accounting_basis IN ('accrual','cash')),
  inventory_cost_method text NOT NULL DEFAULT 'avg' CHECK (inventory_cost_method IN ('fifo','avg','specific')),
  revenue_recognition text NOT NULL DEFAULT 'at_invoice' CHECK (revenue_recognition IN ('at_invoice','at_delivery','at_payment')),

  tax_enabled boolean NOT NULL DEFAULT false,
  tax_included boolean NOT NULL DEFAULT true,
  default_tax_rate numeric(6,3) NOT NULL DEFAULT 0,

  pos_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  accounting_rules jsonb NOT NULL DEFAULT '{}'::jsonb,

  is_default boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(company_id)
);

ALTER TABLE public.company_business_profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_company_business_profiles_company_id ON public.company_business_profiles(company_id);

-- 2) Workspace mapping to company profile (override-ready)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='workspace_business_profiles'
  ) THEN
    -- Old table name from earlier attempts; keep DB clean to avoid confusion
    EXECUTE 'DROP TABLE public.workspace_business_profiles CASCADE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='workspace_company_profiles'
  ) THEN
    EXECUTE $SQL$
      CREATE TABLE public.workspace_company_profiles (
        workspace_id uuid PRIMARY KEY REFERENCES public.workspaces ON DELETE CASCADE,
        company_profile_id uuid NOT NULL REFERENCES public.company_business_profiles(id) ON DELETE CASCADE,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    $SQL$;
    EXECUTE 'ALTER TABLE public.workspace_company_profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE INDEX idx_workspace_company_profiles_company_profile_id ON public.workspace_company_profiles(company_profile_id)';
  END IF;
END $$;

-- 3) RLS: company members read; owners/admins write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_business_profiles' AND policyname='cbp_members_can_read'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY cbp_members_can_read
      ON public.company_business_profiles
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = company_business_profiles.company_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
      ));
    $POL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_business_profiles' AND policyname='cbp_owners_admins_can_write'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY cbp_owners_admins_can_write
      ON public.company_business_profiles
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = company_business_profiles.company_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
          AND cu.role IN ('owner','admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = company_business_profiles.company_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
          AND cu.role IN ('owner','admin')
      ));
    $POL$;
  END IF;

  -- workspace_company_profiles: members read/write through workspace->restaurant->company
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspace_company_profiles' AND policyname='wcp_members_can_read'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY wcp_members_can_read
      ON public.workspace_company_profiles
      FOR SELECT
      USING (EXISTS (
        SELECT 1
        FROM public.workspaces w
        JOIN public.restaurants r ON r.id = w.restaurant_id
        JOIN public.company_users cu ON cu.company_id = r.company_id
        WHERE w.id = workspace_company_profiles.workspace_id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
      ));
    $POL$;
  END IF;
END $$;

-- 4) Backfill: create default company profile per company
-- Prefer restaurant_business_profiles.profile_code if present; otherwise infer from restaurants fields.
INSERT INTO public.company_business_profiles (
  company_id, profile_code, tax_enabled, tax_included, default_tax_rate, pos_rules, accounting_rules, is_default, is_active
)
SELECT
  c.id AS company_id,
  COALESCE(rbp.profile_code,
           NULLIF(lower(r.business_type::text), ''),
           NULLIF(lower(r.business_category::text), ''),
           'restaurant') AS profile_code,
  COALESCE((r.tax_settings->>'enabled')::boolean, false) AS tax_enabled,
  COALESCE((r.tax_settings->>'included')::boolean, true) AS tax_included,
  COALESCE((r.tax_settings->>'rate')::numeric, 0) AS default_tax_rate,
  jsonb_build_object(
    'uses_tables', (COALESCE(rbp.profile_code, NULLIF(lower(r.business_type::text), ''), NULLIF(lower(r.business_category::text), ''), 'restaurant') = 'restaurant')
  ) AS pos_rules,
  '{}'::jsonb AS accounting_rules,
  true AS is_default,
  true AS is_active
FROM public.companies c
LEFT JOIN LATERAL (
  SELECT r2.*
  FROM public.restaurants r2
  WHERE r2.company_id = c.id
  ORDER BY r2.created_at ASC NULLS LAST
  LIMIT 1
) r ON true
LEFT JOIN LATERAL (
  SELECT rbp2.profile_code
  FROM public.restaurant_business_profiles rbp2
  WHERE rbp2.restaurant_id = r.id
  LIMIT 1
) rbp ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_business_profiles cbp
  WHERE cbp.company_id = c.id
);

-- 5) Backfill: attach each workspace to the company profile
INSERT INTO public.workspace_company_profiles (workspace_id, company_profile_id)
SELECT
  w.id,
  cbp.id
FROM public.workspaces w
JOIN public.restaurants r ON r.id = w.restaurant_id
JOIN public.company_business_profiles cbp ON cbp.company_id = r.company_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_company_profiles wcp
  WHERE wcp.workspace_id = w.id
);

COMMIT;

