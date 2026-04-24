-- ============================================================
-- JOURNAL APPROVAL WORKFLOW
-- - Draft -> Submitted -> Approved -> Posted
-- - Separation of duties (maker/checker)
-- - Optional rejection path with reason
-- ============================================================

BEGIN;

-- 1) Extend app roles for accounting approval flow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
      AND e.enumlabel = 'accountant'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'accountant';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
      AND e.enumlabel = 'finance_manager'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'finance_manager';
  END IF;
END $$;

-- 2) Journal workflow columns
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'draft'
    CHECK (workflow_status IN ('draft', 'submitted', 'approved', 'rejected', 'posted')),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_journal_entries_workflow_status
ON public.journal_entries(restaurant_id, workflow_status, entry_date);

-- 3) Approval history (audit trail)
CREATE TABLE IF NOT EXISTS public.journal_approval_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'post')),
  action_by uuid REFERENCES auth.users(id),
  action_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_journal_approval_actions_entry
ON public.journal_approval_actions(journal_entry_id, action_at DESC);

ALTER TABLE public.journal_approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jaa_tenant_policy ON public.journal_approval_actions;
CREATE POLICY jaa_tenant_policy ON public.journal_approval_actions
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- 4) Authorization helper for approval actions
CREATE OR REPLACE FUNCTION public.can_approve_journal(p_user_id uuid, p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_restaurant_owner(p_user_id, p_restaurant_id)
    OR public.has_role(p_user_id, 'super_admin'::public.app_role)
    OR public.has_role(p_user_id, 'finance_manager'::public.app_role)
  );
$$;

-- 5) Submit journal
CREATE OR REPLACE FUNCTION public.submit_journal_entry(
  p_entry_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.journal_entries
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry public.journal_entries;
BEGIN
  SELECT * INTO v_entry
  FROM public.journal_entries
  WHERE id = p_entry_id;

  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'Journal entry not found: %', p_entry_id;
  END IF;

  IF v_entry.workflow_status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'Only draft/rejected entries can be submitted. Current status=%', v_entry.workflow_status;
  END IF;

  -- Ensure balanced at submission time.
  PERFORM public.recalc_journal_totals(v_entry.id);

  UPDATE public.journal_entries
  SET workflow_status = 'submitted',
      submitted_at = now(),
      submitted_by = auth.uid(),
      rejection_reason = NULL,
      rejected_at = NULL,
      rejected_by = NULL
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  INSERT INTO public.journal_approval_actions(restaurant_id, journal_entry_id, action, action_by, notes)
  VALUES (v_entry.restaurant_id, v_entry.id, 'submit', auth.uid(), p_notes);

  RETURN v_entry;
END;
$$;

-- 6) Approve journal
CREATE OR REPLACE FUNCTION public.approve_journal_entry(
  p_entry_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.journal_entries
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry public.journal_entries;
BEGIN
  SELECT * INTO v_entry
  FROM public.journal_entries
  WHERE id = p_entry_id;

  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'Journal entry not found: %', p_entry_id;
  END IF;

  IF v_entry.workflow_status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted entries can be approved. Current status=%', v_entry.workflow_status;
  END IF;

  IF NOT public.can_approve_journal(auth.uid(), v_entry.restaurant_id) THEN
    RAISE EXCEPTION 'Not authorized to approve journal entry %', p_entry_id;
  END IF;

  -- Maker/checker control:
  IF v_entry.submitted_by IS NOT NULL AND v_entry.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'Maker-checker violation: submitter cannot approve same entry';
  END IF;

  -- Ensure still balanced.
  PERFORM public.recalc_journal_totals(v_entry.id);

  UPDATE public.journal_entries
  SET workflow_status = 'approved',
      approved_at = now(),
      approved_by = auth.uid()
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  INSERT INTO public.journal_approval_actions(restaurant_id, journal_entry_id, action, action_by, notes)
  VALUES (v_entry.restaurant_id, v_entry.id, 'approve', auth.uid(), p_notes);

  RETURN v_entry;
END;
$$;

-- 7) Reject journal
CREATE OR REPLACE FUNCTION public.reject_journal_entry(
  p_entry_id uuid,
  p_reason text
)
RETURNS public.journal_entries
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry public.journal_entries;
BEGIN
  IF COALESCE(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  SELECT * INTO v_entry
  FROM public.journal_entries
  WHERE id = p_entry_id;

  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'Journal entry not found: %', p_entry_id;
  END IF;

  IF v_entry.workflow_status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted entries can be rejected. Current status=%', v_entry.workflow_status;
  END IF;

  IF NOT public.can_approve_journal(auth.uid(), v_entry.restaurant_id) THEN
    RAISE EXCEPTION 'Not authorized to reject journal entry %', p_entry_id;
  END IF;

  UPDATE public.journal_entries
  SET workflow_status = 'rejected',
      rejected_at = now(),
      rejected_by = auth.uid(),
      rejection_reason = p_reason
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  INSERT INTO public.journal_approval_actions(restaurant_id, journal_entry_id, action, action_by, notes)
  VALUES (v_entry.restaurant_id, v_entry.id, 'reject', auth.uid(), p_reason);

  RETURN v_entry;
END;
$$;

-- 8) Post approved journal
CREATE OR REPLACE FUNCTION public.post_approved_journal_entry(
  p_entry_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.journal_entries
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry public.journal_entries;
BEGIN
  SELECT * INTO v_entry
  FROM public.journal_entries
  WHERE id = p_entry_id;

  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'Journal entry not found: %', p_entry_id;
  END IF;

  IF v_entry.workflow_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved entries can be posted. Current status=%', v_entry.workflow_status;
  END IF;

  IF NOT public.can_approve_journal(auth.uid(), v_entry.restaurant_id) THEN
    RAISE EXCEPTION 'Not authorized to post journal entry %', p_entry_id;
  END IF;

  -- respect period locking and balancing
  PERFORM public.recalc_journal_totals(v_entry.id);

  UPDATE public.journal_entries
  SET workflow_status = 'posted',
      is_posted = true,
      posted_at = COALESCE(posted_at, now()),
      posted_by = COALESCE(posted_by, auth.uid())
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  INSERT INTO public.journal_approval_actions(restaurant_id, journal_entry_id, action, action_by, notes)
  VALUES (v_entry.restaurant_id, v_entry.id, 'post', auth.uid(), p_notes);

  RETURN v_entry;
END;
$$;

-- 9) Views for frontend workflow monitoring
DROP VIEW IF EXISTS public.v_journal_workflow_queue;
CREATE VIEW public.v_journal_workflow_queue AS
SELECT
  je.id,
  je.restaurant_id,
  je.entry_number,
  je.entry_date,
  je.description,
  je.total_debit,
  je.total_credit,
  je.workflow_status,
  je.submitted_at,
  je.submitted_by,
  je.approved_at,
  je.approved_by,
  je.rejected_at,
  je.rejected_by,
  je.rejection_reason,
  je.posted_at,
  je.posted_by
FROM public.journal_entries je
ORDER BY je.entry_date DESC, je.created_at DESC;

DROP VIEW IF EXISTS public.v_journal_approval_audit;
CREATE VIEW public.v_journal_approval_audit AS
SELECT
  a.restaurant_id,
  a.journal_entry_id,
  je.entry_number,
  a.action,
  a.action_by,
  a.action_at,
  a.notes
FROM public.journal_approval_actions a
JOIN public.journal_entries je ON je.id = a.journal_entry_id
ORDER BY a.action_at DESC;

GRANT SELECT ON public.v_journal_workflow_queue TO authenticated;
GRANT SELECT ON public.v_journal_approval_audit TO authenticated;

COMMIT;

