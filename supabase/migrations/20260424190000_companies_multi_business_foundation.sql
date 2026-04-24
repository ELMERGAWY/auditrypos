-- ============================================================
-- AUDITRY POS: Companies (Tenant) foundation for Multi-business ERP
-- ============================================================
-- Goal:
-- 1) Introduce a tenant root entity: companies
-- 2) Attach existing restaurants (current tenant root) to companies
-- 3) Add company_id to core operational & accounting tables
-- 4) Auto-populate company_id from restaurant_id to avoid breaking current app
--
-- Notes:
-- - We DO NOT remove restaurant_id. The current app relies on it heavily.
-- - We backfill company_id for existing rows and enforce consistency moving forward.
-- - RLS policies can be upgraded later to use company scope. This migration stays compatible.

BEGIN;

-- 0) Extensions (safe-if-exists)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tenant root: companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  legal_name TEXT DEFAULT '',
  tax_number TEXT DEFAULT '',
  commercial_registration TEXT DEFAULT '',
  currency VARCHAR(3) NOT NULL DEFAULT 'egp',
  timezone VARCHAR(50) DEFAULT 'Africa/Cairo',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Unique per owner (NULLs are allowed and can repeat in Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_primary_owner_id
ON public.companies(primary_owner_id);

-- Company membership (who belongs to which company)
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'manager', 'accountant', 'cashier', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Minimal RLS (safe default): only members can read; only owners/admins can write.
DO $$
BEGIN
  -- companies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'company_members_can_read'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY company_members_can_read
      ON public.companies
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = companies.id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
      ));
    $POL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'company_owners_admins_can_write'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY company_owners_admins_can_write
      ON public.companies
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = companies.id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
          AND cu.role IN ('owner','admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = companies.id
          AND cu.user_id = auth.uid()
          AND cu.is_active = true
          AND cu.role IN ('owner','admin')
      ));
    $POL$;
  END IF;

  -- company_users
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_users' AND policyname = 'company_users_members_can_read'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY company_users_members_can_read
      ON public.company_users
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.company_id = company_users.company_id
            AND cu.user_id = auth.uid()
            AND cu.is_active = true
            AND cu.role IN ('owner','admin')
        )
      );
    $POL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_users' AND policyname = 'company_users_owners_admins_can_write'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY company_users_owners_admins_can_write
      ON public.company_users
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.company_id = company_users.company_id
            AND cu.user_id = auth.uid()
            AND cu.is_active = true
            AND cu.role IN ('owner','admin')
        )
      );
    $POL$;
  END IF;
END $$;

-- 2) Attach restaurants to companies
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_company_id ON public.restaurants(company_id);

-- 2.1) Backfill: create one company per owner_id (safe default)
-- If restaurants already share the same owner_id, they become branches under one company.
WITH owners AS (
  SELECT DISTINCT r.owner_id
  FROM public.restaurants r
  WHERE r.owner_id IS NOT NULL
),
ins AS (
  INSERT INTO public.companies (primary_owner_id, name)
  SELECT owners.owner_id,
         COALESCE((
    SELECT NULLIF(trim(p.full_name), '')
    FROM public.profiles p
    WHERE p.user_id = owners.owner_id
    LIMIT 1
  ), 'Company') AS name
  FROM owners
  ON CONFLICT (primary_owner_id) DO NOTHING
  RETURNING id, primary_owner_id
)
SELECT 1;

-- Map restaurants -> company_id by primary owner
UPDATE public.restaurants r
SET company_id = c.id
FROM public.companies c
WHERE c.primary_owner_id = r.owner_id
  AND r.company_id IS NULL;

-- 2.2) Ensure the owner is a member (owner role) in that company
INSERT INTO public.company_users (company_id, user_id, role)
SELECT DISTINCT r.company_id, r.owner_id, 'owner'
FROM public.restaurants r
WHERE r.company_id IS NOT NULL AND r.owner_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- 3) Helper trigger: auto set company_id from restaurant_id
CREATE OR REPLACE FUNCTION public.tg_set_company_id_from_restaurant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.restaurant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT r.company_id INTO v_company_id
  FROM public.restaurants r
  WHERE r.id = NEW.restaurant_id
  LIMIT 1;

  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$;

-- 4) Add company_id to core tables + backfill + triggers
-- Operational tables used by current app
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'products',
    'menu_items',
    'orders',
    'order_items',
    'waiter_calls',
    'delivery_agents',
    'shifts',
    'notifications',
    'customers',
    'customer_transactions',
    'suppliers',
    'stock_movements',
    'expenses'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_company_id ON public.%I(company_id)', t, t);
  END LOOP;
END $$;

-- Backfill company_id for operational tables via restaurant_id
UPDATE public.products p SET company_id = r.company_id
FROM public.restaurants r
WHERE p.restaurant_id = r.id AND p.company_id IS NULL;

UPDATE public.menu_items m SET company_id = r.company_id
FROM public.restaurants r
WHERE m.restaurant_id = r.id AND m.company_id IS NULL;

UPDATE public.orders o SET company_id = r.company_id
FROM public.restaurants r
WHERE o.restaurant_id = r.id AND o.company_id IS NULL;

UPDATE public.waiter_calls wc SET company_id = r.company_id
FROM public.restaurants r
WHERE wc.restaurant_id = r.id AND wc.company_id IS NULL;

UPDATE public.delivery_agents da SET company_id = r.company_id
FROM public.restaurants r
WHERE da.restaurant_id = r.id AND da.company_id IS NULL;

UPDATE public.shifts s SET company_id = r.company_id
FROM public.restaurants r
WHERE s.restaurant_id = r.id AND s.company_id IS NULL;

UPDATE public.notifications n SET company_id = r.company_id
FROM public.restaurants r
WHERE n.restaurant_id = r.id AND n.company_id IS NULL;

UPDATE public.customers c SET company_id = r.company_id
FROM public.restaurants r
WHERE c.restaurant_id = r.id AND c.company_id IS NULL;

UPDATE public.customer_transactions ct SET company_id = r.company_id
FROM public.restaurants r
WHERE ct.restaurant_id = r.id AND ct.company_id IS NULL;

UPDATE public.suppliers s SET company_id = r.company_id
FROM public.restaurants r
WHERE s.restaurant_id = r.id AND s.company_id IS NULL;

UPDATE public.stock_movements sm SET company_id = r.company_id
FROM public.restaurants r
WHERE sm.restaurant_id = r.id AND sm.company_id IS NULL;

UPDATE public.expenses e SET company_id = r.company_id
FROM public.restaurants r
WHERE e.restaurant_id = r.id AND e.company_id IS NULL;

-- order_items doesn't have restaurant_id in some schemas; backfill via order_id
UPDATE public.order_items oi
SET company_id = o.company_id
FROM public.orders o
WHERE oi.order_id = o.id AND oi.company_id IS NULL;

-- Triggers to keep company_id set on new writes (only if table has restaurant_id)
DO $$
DECLARE
  t TEXT;
  tables_with_restaurant_id TEXT[] := ARRAY[
    'products',
    'menu_items',
    'orders',
    'waiter_calls',
    'delivery_agents',
    'shifts',
    'notifications',
    'customers',
    'customer_transactions',
    'suppliers',
    'stock_movements',
    'expenses'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_restaurant_id LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_set_company_id ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_set_company_id BEFORE INSERT OR UPDATE OF restaurant_id, company_id ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_set_company_id_from_restaurant()',
      t, t
    );
  END LOOP;
END $$;

-- order_items: set company_id via order.company_id (works even if no restaurant_id)
CREATE OR REPLACE FUNCTION public.tg_set_company_id_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.order_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT o.company_id INTO v_company_id
  FROM public.orders o
  WHERE o.id = NEW.order_id
  LIMIT 1;
  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_set_company_id ON public.order_items;
CREATE TRIGGER trg_order_items_set_company_id
BEFORE INSERT OR UPDATE OF order_id, company_id ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.tg_set_company_id_from_order();

-- 5) Extend workspaces (if already created) to carry company_id
-- (Keeps future branch/warehouse logic consistent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspaces'
  ) THEN
    EXECUTE 'ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workspaces_company_id ON public.workspaces(company_id)';

    EXECUTE '
      UPDATE public.workspaces w
      SET company_id = r.company_id
      FROM public.restaurants r
      WHERE w.restaurant_id = r.id AND w.company_id IS NULL
    ';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_workspaces_set_company_id ON public.workspaces';
    EXECUTE '
      CREATE TRIGGER trg_workspaces_set_company_id
      BEFORE INSERT OR UPDATE OF restaurant_id, company_id ON public.workspaces
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_company_id_from_restaurant()
    ';
  END IF;
END $$;

COMMIT;

