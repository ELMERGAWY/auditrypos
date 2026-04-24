-- ============================================================
-- AUDITRY POS: Auto-Posting Settings Engine (Company/Profile aware)
-- ============================================================
-- Goal:
-- - Centralize posting mappings in DB (instead of hardcoded rules)
-- - Resolve DR/CR accounts by company + workspace + profile + movement
-- - Provide reusable function to auto-create balanced journal entries
--
-- Notes:
-- - Idempotent and safe to rerun
-- - Compatible with multi-company / multi-workspace GL scope

BEGIN;

-- ============================================================
-- 1) Posting settings table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gl_posting_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id uuid NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_profile_id uuid NULL REFERENCES public.company_business_profiles(id) ON DELETE SET NULL,
  profile_code text NOT NULL REFERENCES public.business_profiles(code) ON DELETE RESTRICT,

  movement_type text NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'expense')),
  movement_subtype text NOT NULL DEFAULT 'standard',
  payment_method text NOT NULL DEFAULT 'any' CHECK (payment_method IN ('any', 'cash', 'card', 'bank', 'credit', 'mixed')),

  debit_account_id uuid NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  debit_system_key text NULL,
  credit_account_id uuid NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  credit_system_key text NULL,

  auto_post boolean NOT NULL DEFAULT true,
  requires_approval boolean NOT NULL DEFAULT false,
  posting_priority int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,

  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gl_posting_settings_debit_source_chk
    CHECK (debit_account_id IS NOT NULL OR debit_system_key IS NOT NULL),
  CONSTRAINT gl_posting_settings_credit_source_chk
    CHECK (credit_account_id IS NOT NULL OR credit_system_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_gl_posting_settings_company
  ON public.gl_posting_settings(company_id);

CREATE INDEX IF NOT EXISTS idx_gl_posting_settings_workspace
  ON public.gl_posting_settings(workspace_id);

CREATE INDEX IF NOT EXISTS idx_gl_posting_settings_lookup
  ON public.gl_posting_settings(
    company_id, profile_code, movement_type, movement_subtype, payment_method, is_active, posting_priority
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_gl_posting_settings_company_default
  ON public.gl_posting_settings(company_id, profile_code, movement_type, movement_subtype, payment_method)
  WHERE workspace_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_gl_posting_settings_workspace_override
  ON public.gl_posting_settings(company_id, workspace_id, profile_code, movement_type, movement_subtype, payment_method)
  WHERE workspace_id IS NOT NULL;

ALTER TABLE public.gl_posting_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2) Timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_set_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gl_posting_settings_updated_at ON public.gl_posting_settings;
CREATE TRIGGER trg_gl_posting_settings_updated_at
BEFORE UPDATE ON public.gl_posting_settings
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_timestamp_updated_at();

-- ============================================================
-- 3) Resolve account ID from system_key
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_resolve_coa_account_id(
  p_company_id uuid,
  p_workspace_id uuid,
  p_system_key text
)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT a.id
  FROM public.chart_of_accounts a
  WHERE a.company_id = p_company_id
    AND a.system_key = p_system_key
    AND (
      a.workspace_id = p_workspace_id
      OR a.workspace_id IS NULL
    )
  ORDER BY CASE WHEN a.workspace_id = p_workspace_id THEN 0 ELSE 1 END
  LIMIT 1
$$;

-- ============================================================
-- 4) Resolve posting setting (workspace override first)
-- ============================================================
-- Compatibility note:
-- Existing environments may already have fn_resolve_posting_setting()
-- with the same arguments but a different RETURN type. PostgreSQL does
-- not allow changing return type via CREATE OR REPLACE, so we drop first.
DROP FUNCTION IF EXISTS public.fn_resolve_posting_setting(uuid, uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.fn_resolve_posting_setting(
  p_company_id uuid,
  p_workspace_id uuid,
  p_profile_code text,
  p_movement_type text,
  p_movement_subtype text,
  p_payment_method text
)
RETURNS TABLE (
  setting_id uuid,
  debit_account_id uuid,
  credit_account_id uuid,
  auto_post boolean,
  requires_approval boolean
)
LANGUAGE sql
STABLE
AS $$
  WITH selected_setting AS (
    SELECT s.*
    FROM public.gl_posting_settings s
    WHERE s.company_id = p_company_id
      AND s.profile_code = p_profile_code
      AND s.movement_type = p_movement_type
      AND s.movement_subtype = p_movement_subtype
      AND s.is_active = true
      AND (s.payment_method = p_payment_method OR s.payment_method = 'any')
      AND (s.workspace_id = p_workspace_id OR s.workspace_id IS NULL)
    ORDER BY
      CASE WHEN s.workspace_id = p_workspace_id THEN 0 ELSE 1 END,
      CASE WHEN s.payment_method = p_payment_method THEN 0 ELSE 1 END,
      s.posting_priority ASC
    LIMIT 1
  )
  SELECT
    ss.id AS setting_id,
    COALESCE(
      ss.debit_account_id,
      public.fn_resolve_coa_account_id(p_company_id, p_workspace_id, ss.debit_system_key)
    ) AS debit_account_id,
    COALESCE(
      ss.credit_account_id,
      public.fn_resolve_coa_account_id(p_company_id, p_workspace_id, ss.credit_system_key)
    ) AS credit_account_id,
    ss.auto_post,
    ss.requires_approval
  FROM selected_setting ss
$$;

-- ============================================================
-- 5) Main auto-post function (idempotent by source keys)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_autopost_transaction(
  p_company_id uuid,
  p_workspace_id uuid,
  p_restaurant_id uuid,
  p_profile_code text,
  p_movement_type text,
  p_movement_subtype text,
  p_payment_method text,
  p_amount numeric,
  p_entry_date date,
  p_description text,
  p_source_module text,
  p_source_event text,
  p_source_id uuid,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setting record;
  v_entry_id uuid;
  v_existing_entry_id uuid;
  v_entry_number text;
BEGIN
  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Auto-post amount must be positive';
  END IF;

  -- Idempotency: do not repost same source
  SELECT je.id INTO v_existing_entry_id
  FROM public.journal_entries je
  WHERE je.company_id = p_company_id
    AND je.source_module = p_source_module
    AND je.source_event = p_source_event
    AND je.source_id = p_source_id
  LIMIT 1;

  IF v_existing_entry_id IS NOT NULL THEN
    RETURN v_existing_entry_id;
  END IF;

  SELECT * INTO v_setting
  FROM public.fn_resolve_posting_setting(
    p_company_id,
    p_workspace_id,
    p_profile_code,
    p_movement_type,
    p_movement_subtype,
    p_payment_method
  );

  IF v_setting.setting_id IS NULL THEN
    RAISE EXCEPTION
      'No posting setting found for company %, profile %, movement %/% payment %',
      p_company_id, p_profile_code, p_movement_type, p_movement_subtype, p_payment_method;
  END IF;

  IF v_setting.debit_account_id IS NULL OR v_setting.credit_account_id IS NULL THEN
    RAISE EXCEPTION
      'Posting setting % resolved null DR/CR account IDs',
      v_setting.setting_id;
  END IF;

  v_entry_id := gen_random_uuid();
  v_entry_number := 'JE-' || to_char(COALESCE(p_entry_date, current_date), 'YYYYMMDD') || '-' || substr(v_entry_id::text, 1, 8);

  INSERT INTO public.journal_entries (
    id,
    restaurant_id,
    company_id,
    workspace_id,
    entry_number,
    entry_date,
    description,
    source,
    source_module,
    source_event,
    source_id,
    total_debit,
    total_credit,
    is_posted,
    created_by
  )
  VALUES (
    v_entry_id,
    p_restaurant_id,
    p_company_id,
    p_workspace_id,
    v_entry_number,
    COALESCE(p_entry_date, current_date),
    COALESCE(p_description, 'Auto-posted transaction'),
    'system',
    p_source_module,
    p_source_event,
    p_source_id,
    p_amount,
    p_amount,
    COALESCE(v_setting.auto_post, true),
    p_created_by
  );

  INSERT INTO public.journal_entry_lines (
    entry_id,
    company_id,
    workspace_id,
    account_id,
    debit,
    credit,
    description,
    line_order
  )
  VALUES
    (v_entry_id, p_company_id, p_workspace_id, v_setting.debit_account_id, p_amount, 0, COALESCE(p_description, 'Auto-post debit'), 1),
    (v_entry_id, p_company_id, p_workspace_id, v_setting.credit_account_id, 0, p_amount, COALESCE(p_description, 'Auto-post credit'), 2);

  RETURN v_entry_id;
END;
$$;

-- ============================================================
-- 6) Seed default settings per company profile
-- ============================================================
INSERT INTO public.gl_posting_settings (
  company_id,
  workspace_id,
  company_profile_id,
  profile_code,
  movement_type,
  movement_subtype,
  payment_method,
  debit_system_key,
  credit_system_key,
  auto_post,
  requires_approval,
  posting_priority,
  is_active,
  notes
)
SELECT
  cbp.company_id,
  NULL::uuid,
  cbp.id,
  cbp.profile_code,
  t.movement_type,
  t.movement_subtype,
  t.payment_method,
  t.debit_system_key,
  t.credit_system_key,
  true,
  false,
  100,
  true,
  'Seeded by auto-posting settings engine'
FROM public.company_business_profiles cbp
CROSS JOIN (
  VALUES
    ('sale',     'cash_sale',      'cash',   'cash_on_hand',        'sales_revenue'),
    ('sale',     'card_sale',      'card',   'bank_main',           'sales_revenue'),
    ('sale',     'credit_sale',    'credit', 'accounts_receivable', 'sales_revenue'),
    ('purchase', 'cash_purchase',  'cash',   'inventory',           'cash_on_hand'),
    ('purchase', 'bank_purchase',  'bank',   'inventory',           'bank_main'),
    ('purchase', 'credit_purchase','credit', 'inventory',           'accounts_payable'),
    ('expense',  'cash_expense',   'cash',   'operating_expenses',  'cash_on_hand'),
    ('expense',  'bank_expense',   'bank',   'operating_expenses',  'bank_main'),
    ('expense',  'credit_expense', 'credit', 'operating_expenses',  'accounts_payable')
) AS t(
  movement_type,
  movement_subtype,
  payment_method,
  debit_system_key,
  credit_system_key
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.gl_posting_settings s
  WHERE s.company_id = cbp.company_id
    AND s.workspace_id IS NULL
    AND s.profile_code = cbp.profile_code
    AND s.movement_type = t.movement_type
    AND s.movement_subtype = t.movement_subtype
    AND s.payment_method = t.payment_method
);

COMMIT;
