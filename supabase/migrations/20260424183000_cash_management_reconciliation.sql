-- ============================================================
-- CASH MANAGEMENT & RECONCILIATION
-- - Unified treasury accounts (cash drawers / banks)
-- - Daily reconciliation with variance tracking
-- - KPI views and helper functions
-- ============================================================

BEGIN;

-- 1) Treasury accounts registry
CREATE TABLE IF NOT EXISTS public.treasury_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('cash_drawer', 'bank_account')),
  chart_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  external_ref text, -- drawer id / bank iban / account number
  currency text NOT NULL DEFAULT 'EGP',
  opening_balance numeric(15,2) NOT NULL DEFAULT 0,
  current_balance numeric(15,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treasury_accounts_restaurant
ON public.treasury_accounts(restaurant_id, account_type, is_active);

ALTER TABLE public.treasury_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS treasury_accounts_tenant_policy ON public.treasury_accounts;
CREATE POLICY treasury_accounts_tenant_policy ON public.treasury_accounts
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.trg_touch_treasury_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_treasury_updated_at ON public.treasury_accounts;
CREATE TRIGGER trg_touch_treasury_updated_at
BEFORE UPDATE ON public.treasury_accounts
FOR EACH ROW
EXECUTE FUNCTION public.trg_touch_treasury_updated_at();

-- 2) Treasury movements ledger
CREATE TABLE IF NOT EXISTS public.treasury_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  treasury_account_id uuid NOT NULL REFERENCES public.treasury_accounts(id) ON DELETE CASCADE,
  movement_date date NOT NULL DEFAULT current_date,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'transfer_in', 'transfer_out', 'adjustment')),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  source_module text,
  source_event text,
  source_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treasury_movements_account_date
ON public.treasury_movements(treasury_account_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_treasury_movements_restaurant_date
ON public.treasury_movements(restaurant_id, movement_date DESC);

ALTER TABLE public.treasury_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS treasury_movements_tenant_policy ON public.treasury_movements;
CREATE POLICY treasury_movements_tenant_policy ON public.treasury_movements
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- 3) Auto-maintain current treasury balance from movement inserts
CREATE OR REPLACE FUNCTION public.apply_treasury_movement_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_sign numeric(15,2);
BEGIN
  IF NEW.movement_type IN ('in', 'transfer_in') THEN
    v_sign := 1;
  ELSIF NEW.movement_type IN ('out', 'transfer_out') THEN
    v_sign := -1;
  ELSE
    -- adjustment can be positive/negative by convention from source_event
    v_sign := CASE WHEN COALESCE(NEW.source_event, '') ILIKE '%decrease%' THEN -1 ELSE 1 END;
  END IF;

  UPDATE public.treasury_accounts
  SET current_balance = COALESCE(current_balance, 0) + (NEW.amount * v_sign),
      updated_at = now()
  WHERE id = NEW.treasury_account_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_treasury_movement_balance ON public.treasury_movements;
CREATE TRIGGER trg_apply_treasury_movement_balance
AFTER INSERT ON public.treasury_movements
FOR EACH ROW
EXECUTE FUNCTION public.apply_treasury_movement_balance();

-- 4) Reconciliation table
CREATE TABLE IF NOT EXISTS public.treasury_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  treasury_account_id uuid NOT NULL REFERENCES public.treasury_accounts(id) ON DELETE CASCADE,
  reconciliation_date date NOT NULL DEFAULT current_date,
  system_balance numeric(15,2) NOT NULL DEFAULT 0,
  counted_balance numeric(15,2) NOT NULL DEFAULT 0,
  variance_amount numeric(15,2) GENERATED ALWAYS AS (counted_balance - system_balance) STORED,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (treasury_account_id, reconciliation_date)
);

CREATE INDEX IF NOT EXISTS idx_treasury_reconciliation_restaurant_date
ON public.treasury_reconciliations(restaurant_id, reconciliation_date DESC, status);

ALTER TABLE public.treasury_reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS treasury_reconciliations_tenant_policy ON public.treasury_reconciliations;
CREATE POLICY treasury_reconciliations_tenant_policy ON public.treasury_reconciliations
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- 5) Snapshot helper: create draft reconciliation from current balance
CREATE OR REPLACE FUNCTION public.create_treasury_reconciliation_snapshot(
  p_treasury_account_id uuid,
  p_counted_balance numeric,
  p_notes text DEFAULT NULL
)
RETURNS public.treasury_reconciliations
LANGUAGE plpgsql
AS $$
DECLARE
  v_account public.treasury_accounts;
  v_rec public.treasury_reconciliations;
BEGIN
  SELECT * INTO v_account
  FROM public.treasury_accounts
  WHERE id = p_treasury_account_id;

  IF v_account.id IS NULL THEN
    RAISE EXCEPTION 'Treasury account not found: %', p_treasury_account_id;
  END IF;

  INSERT INTO public.treasury_reconciliations (
    restaurant_id, treasury_account_id, reconciliation_date,
    system_balance, counted_balance, status, notes, created_by
  )
  VALUES (
    v_account.restaurant_id,
    v_account.id,
    current_date,
    COALESCE(v_account.current_balance, 0),
    COALESCE(p_counted_balance, 0),
    'draft',
    p_notes,
    auth.uid()
  )
  ON CONFLICT (treasury_account_id, reconciliation_date)
  DO UPDATE SET
    system_balance = EXCLUDED.system_balance,
    counted_balance = EXCLUDED.counted_balance,
    notes = EXCLUDED.notes,
    created_by = EXCLUDED.created_by
  RETURNING * INTO v_rec;

  RETURN v_rec;
END;
$$;

-- 6) Confirm reconciliation and optionally post variance movement
CREATE OR REPLACE FUNCTION public.confirm_treasury_reconciliation(
  p_reconciliation_id uuid,
  p_post_variance boolean DEFAULT true
)
RETURNS public.treasury_reconciliations
LANGUAGE plpgsql
AS $$
DECLARE
  v_rec public.treasury_reconciliations;
  v_variance numeric(15,2);
BEGIN
  SELECT * INTO v_rec
  FROM public.treasury_reconciliations
  WHERE id = p_reconciliation_id;

  IF v_rec.id IS NULL THEN
    RAISE EXCEPTION 'Reconciliation not found: %', p_reconciliation_id;
  END IF;

  IF v_rec.status = 'confirmed' THEN
    RETURN v_rec;
  END IF;

  UPDATE public.treasury_reconciliations
  SET status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = now()
  WHERE id = p_reconciliation_id
  RETURNING * INTO v_rec;

  v_variance := COALESCE(v_rec.variance_amount, 0);

  IF p_post_variance AND v_variance <> 0 THEN
    INSERT INTO public.treasury_movements (
      restaurant_id,
      treasury_account_id,
      movement_date,
      movement_type,
      amount,
      source_module,
      source_event,
      source_id,
      notes,
      created_by
    )
    VALUES (
      v_rec.restaurant_id,
      v_rec.treasury_account_id,
      v_rec.reconciliation_date,
      'adjustment',
      ABS(v_variance),
      'reconciliation',
      CASE WHEN v_variance < 0 THEN 'variance_decrease' ELSE 'variance_increase' END,
      v_rec.id,
      'Auto variance posting from reconciliation',
      auth.uid()
    );
  END IF;

  RETURN v_rec;
END;
$$;

-- 7) Treasury KPI view
DROP VIEW IF EXISTS public.v_treasury_kpi_snapshot;
CREATE VIEW public.v_treasury_kpi_snapshot AS
WITH today_mov AS (
  SELECT
    restaurant_id,
    SUM(CASE WHEN movement_type IN ('in', 'transfer_in') THEN amount ELSE 0 END) AS cash_in_today,
    SUM(CASE WHEN movement_type IN ('out', 'transfer_out') THEN amount ELSE 0 END) AS cash_out_today
  FROM public.treasury_movements
  WHERE movement_date = current_date
  GROUP BY restaurant_id
),
open_var AS (
  SELECT
    restaurant_id,
    SUM(ABS(variance_amount)) AS open_variance_amount
  FROM public.treasury_reconciliations
  WHERE status = 'draft'
  GROUP BY restaurant_id
),
balances AS (
  SELECT
    restaurant_id,
    SUM(current_balance) AS total_treasury_balance
  FROM public.treasury_accounts
  WHERE is_active = true
  GROUP BY restaurant_id
)
SELECT
  b.restaurant_id,
  COALESCE(b.total_treasury_balance, 0) AS total_treasury_balance,
  COALESCE(t.cash_in_today, 0) AS cash_in_today,
  COALESCE(t.cash_out_today, 0) AS cash_out_today,
  COALESCE(t.cash_in_today, 0) - COALESCE(t.cash_out_today, 0) AS net_cash_today,
  COALESCE(v.open_variance_amount, 0) AS draft_reconciliation_variance
FROM balances b
LEFT JOIN today_mov t ON t.restaurant_id = b.restaurant_id
LEFT JOIN open_var v ON v.restaurant_id = b.restaurant_id;

GRANT SELECT ON public.v_treasury_kpi_snapshot TO authenticated;

COMMIT;

