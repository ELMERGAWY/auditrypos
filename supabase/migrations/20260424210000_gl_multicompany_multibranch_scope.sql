-- ============================================================
-- AUDITRY POS: GL scope for Multi-Company + Multi-Workspace
-- ============================================================
-- Goal:
-- - Add company_id + workspace_id to accounting core tables (if they exist)
-- - Backfill from restaurant_id -> restaurants.company_id and default workspace
-- - Ensure new writes auto-fill these columns (triggers)
--
-- Tables targeted (when present):
-- - chart_of_accounts
-- - fiscal_years / fiscal_periods
-- - journal_entries
-- - journal_entry_lines
--
-- Safety:
-- - Idempotent, safe to rerun
-- - No destructive drops of existing accounting data

BEGIN;

-- Ensure helper exists (created earlier in workspace-scope migration, but we re-ensure here)
CREATE OR REPLACE FUNCTION public.fn_default_workspace_id(p_restaurant_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT w.id
  FROM public.workspaces w
  WHERE w.restaurant_id = p_restaurant_id
    AND w.is_default = true
  ORDER BY w.created_at ASC
  LIMIT 1
$$;

-- ============================================================
-- 1) Add columns + backfill (table-by-table, only if exists)
-- ============================================================

-- chart_of_accounts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chart_of_accounts') THEN
    EXECUTE 'ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_coa_company_id ON public.chart_of_accounts(company_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_coa_workspace_id ON public.chart_of_accounts(workspace_id)';

    -- Backfill from restaurant_id (present in existing schema)
    EXECUTE $SQL$
      UPDATE public.chart_of_accounts a
      SET company_id = r.company_id,
          workspace_id = COALESCE(a.workspace_id, public.fn_default_workspace_id(a.restaurant_id))
      FROM public.restaurants r
      WHERE a.restaurant_id = r.id
        AND (a.company_id IS NULL OR a.workspace_id IS NULL)
    $SQL$;
  END IF;
END $$;

-- fiscal_years
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fiscal_years') THEN
    EXECUTE 'ALTER TABLE public.fiscal_years ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE public.fiscal_years ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fiscal_years_company_id ON public.fiscal_years(company_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fiscal_years_workspace_id ON public.fiscal_years(workspace_id)';

    EXECUTE $SQL$
      UPDATE public.fiscal_years fy
      SET company_id = r.company_id,
          workspace_id = COALESCE(fy.workspace_id, public.fn_default_workspace_id(fy.restaurant_id))
      FROM public.restaurants r
      WHERE fy.restaurant_id = r.id
        AND (fy.company_id IS NULL OR fy.workspace_id IS NULL)
    $SQL$;
  END IF;
END $$;

-- fiscal_periods
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fiscal_periods') THEN
    EXECUTE 'ALTER TABLE public.fiscal_periods ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE public.fiscal_periods ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fiscal_periods_company_id ON public.fiscal_periods(company_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fiscal_periods_workspace_id ON public.fiscal_periods(workspace_id)';

    EXECUTE $SQL$
      UPDATE public.fiscal_periods fp
      SET company_id = r.company_id,
          workspace_id = COALESCE(fp.workspace_id, public.fn_default_workspace_id(fp.restaurant_id))
      FROM public.restaurants r
      WHERE fp.restaurant_id = r.id
        AND (fp.company_id IS NULL OR fp.workspace_id IS NULL)
    $SQL$;
  END IF;
END $$;

-- journal_entries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='journal_entries') THEN
    EXECUTE 'ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON public.journal_entries(company_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_journal_entries_workspace_id ON public.journal_entries(workspace_id)';

    EXECUTE $SQL$
      UPDATE public.journal_entries je
      SET company_id = r.company_id,
          workspace_id = COALESCE(je.workspace_id, public.fn_default_workspace_id(je.restaurant_id))
      FROM public.restaurants r
      WHERE je.restaurant_id = r.id
        AND (je.company_id IS NULL OR je.workspace_id IS NULL)
    $SQL$;

    -- Add a safe uniqueness index for entry_number per company when both exist
    -- (does not drop any existing constraints)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='journal_entries' AND column_name='entry_number'
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_entries_company_entry_number ON public.journal_entries(company_id, entry_number) WHERE company_id IS NOT NULL AND entry_number IS NOT NULL';
    END IF;
  END IF;
END $$;

-- journal_entry_lines
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='journal_entry_lines') THEN
    EXECUTE 'ALTER TABLE public.journal_entry_lines ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE public.journal_entry_lines ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces ON DELETE SET NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_company_id ON public.journal_entry_lines(company_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_workspace_id ON public.journal_entry_lines(workspace_id)';

    -- Backfill from entry_id -> journal_entries
    EXECUTE $SQL$
      UPDATE public.journal_entry_lines jel
      SET company_id = je.company_id,
          workspace_id = je.workspace_id
      FROM public.journal_entries je
      WHERE jel.entry_id = je.id
        AND (jel.company_id IS NULL OR jel.workspace_id IS NULL)
    $SQL$;
  END IF;
END $$;

-- ============================================================
-- 2) Triggers to auto-fill on new writes
-- ============================================================

-- From restaurant_id -> company_id/workspace_id
CREATE OR REPLACE FUNCTION public.tg_set_company_workspace_from_restaurant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.restaurant_id IS NOT NULL THEN
    SELECT r.company_id INTO NEW.company_id
    FROM public.restaurants r
    WHERE r.id = NEW.restaurant_id
    LIMIT 1;
  END IF;

  IF NEW.workspace_id IS NULL AND NEW.restaurant_id IS NOT NULL THEN
    NEW.workspace_id := public.fn_default_workspace_id(NEW.restaurant_id);
  END IF;

  RETURN NEW;
END;
$$;

-- From journal entry -> line
CREATE OR REPLACE FUNCTION public.tg_set_company_workspace_from_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.company_id IS NULL OR NEW.workspace_id IS NULL) AND NEW.entry_id IS NOT NULL THEN
    SELECT je.company_id, je.workspace_id
    INTO NEW.company_id, NEW.workspace_id
    FROM public.journal_entries je
    WHERE je.id = NEW.entry_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Apply triggers only if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chart_of_accounts') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_coa_set_company_workspace ON public.chart_of_accounts';
    EXECUTE 'CREATE TRIGGER trg_coa_set_company_workspace BEFORE INSERT OR UPDATE OF restaurant_id, company_id, workspace_id ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.tg_set_company_workspace_from_restaurant()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fiscal_years') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_fiscal_years_set_company_workspace ON public.fiscal_years';
    EXECUTE 'CREATE TRIGGER trg_fiscal_years_set_company_workspace BEFORE INSERT OR UPDATE OF restaurant_id, company_id, workspace_id ON public.fiscal_years FOR EACH ROW EXECUTE FUNCTION public.tg_set_company_workspace_from_restaurant()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fiscal_periods') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_fiscal_periods_set_company_workspace ON public.fiscal_periods';
    EXECUTE 'CREATE TRIGGER trg_fiscal_periods_set_company_workspace BEFORE INSERT OR UPDATE OF restaurant_id, company_id, workspace_id ON public.fiscal_periods FOR EACH ROW EXECUTE FUNCTION public.tg_set_company_workspace_from_restaurant()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='journal_entries') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_journal_entries_set_company_workspace ON public.journal_entries';
    EXECUTE 'CREATE TRIGGER trg_journal_entries_set_company_workspace BEFORE INSERT OR UPDATE OF restaurant_id, company_id, workspace_id ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.tg_set_company_workspace_from_restaurant()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='journal_entry_lines') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_journal_entry_lines_set_company_workspace ON public.journal_entry_lines';
    EXECUTE 'CREATE TRIGGER trg_journal_entry_lines_set_company_workspace BEFORE INSERT OR UPDATE OF entry_id, company_id, workspace_id ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION public.tg_set_company_workspace_from_entry()';
  END IF;
END $$;

COMMIT;

