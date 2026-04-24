-- ============================================================
-- AUDITRY POS: Workspaces bootstrap (default branch per restaurant)
-- ============================================================
-- Goal:
-- - Ensure workspaces table exists (multi-branch)
-- - Create a default workspace for each existing restaurant
-- - Backfill orders.workspace_id for existing orders
-- - Auto-assign workspace_id on new orders when missing
--
-- Compatibility:
-- - Current app still uses restaurant_id heavily; we do NOT remove it.
-- - This migration is safe to run multiple times (idempotent).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Ensure workspaces table exists (if the Ventro migration wasn't applied yet)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'main', -- main, branch, warehouse, kiosk
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  address TEXT DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  manager_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_restaurant_id ON public.workspaces(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_company_id ON public.workspaces(company_id);

-- Ensure is_default column exists even if table came from older migration
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- One default workspace per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspaces_one_default_per_restaurant
ON public.workspaces(restaurant_id)
WHERE is_default = true;

-- 2) Backfill company_id on existing workspaces (if missing)
UPDATE public.workspaces w
SET company_id = r.company_id
FROM public.restaurants r
WHERE w.restaurant_id = r.id
  AND w.company_id IS NULL;

-- 3) Create default workspace per restaurant (if none exists)
INSERT INTO public.workspaces (restaurant_id, company_id, name, code, type, is_default, is_active)
SELECT
  r.id AS restaurant_id,
  r.company_id AS company_id,
  COALESCE(NULLIF(trim(r.name), ''), 'Main') AS name,
  -- deterministic-ish code to avoid collisions
  ('WS-' || substring(replace(r.id::text, '-', ''), 1, 8))::varchar(20) AS code,
  'main' AS type,
  true AS is_default,
  true AS is_active
FROM public.restaurants r
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w
  WHERE w.restaurant_id = r.id
    AND w.is_default = true
);

-- If a restaurant has workspaces but none is marked default, mark the oldest as default
WITH candidates AS (
  SELECT DISTINCT ON (w.restaurant_id)
    w.id, w.restaurant_id
  FROM public.workspaces w
  WHERE w.is_active = true
  ORDER BY w.restaurant_id, w.created_at ASC
)
UPDATE public.workspaces w
SET is_default = true
FROM candidates c
WHERE w.id = c.id
  AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w2
    WHERE w2.restaurant_id = c.restaurant_id
      AND w2.is_default = true
  );

-- 4) Ensure orders.workspace_id exists, then backfill old orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_workspace_id ON public.orders(workspace_id);

UPDATE public.orders o
SET workspace_id = w.id
FROM public.workspaces w
WHERE o.restaurant_id = w.restaurant_id
  AND w.is_default = true
  AND o.workspace_id IS NULL;

-- 5) Auto-assign workspace_id for new orders when missing
CREATE OR REPLACE FUNCTION public.tg_set_default_workspace_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.restaurant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT w.id INTO v_workspace_id
  FROM public.workspaces w
  WHERE w.restaurant_id = NEW.restaurant_id
    AND w.is_default = true
  ORDER BY w.created_at ASC
  LIMIT 1;

  NEW.workspace_id := v_workspace_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_set_default_workspace_id ON public.orders;
CREATE TRIGGER trg_orders_set_default_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_set_default_workspace_id();

COMMIT;

