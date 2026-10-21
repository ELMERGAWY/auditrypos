-- Fix supplier merge authorization for explicitly permitted employees.
-- Preserves the existing supplier merge data-movement logic and currency behavior.
CREATE OR REPLACE FUNCTION public.merge_suppliers(
  p_subscriber_id uuid,
  p_target_supplier_id uuid,
  p_source_supplier_ids uuid[],
  p_new_name text DEFAULT NULL::text,
  p_new_name_en text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_profile_company uuid;
  v_source_count integer;
  v_voucher_count integer := 0;
  v_bank_account_count integer := 0;
  v_cancelled_check_count integer := 0;
  v_currency_count integer := 0;
  v_source uuid;
  v_target_default_currency text;
  v_source_default_currency text;
  v_fallback_currency text;
  v_can_merge boolean := false;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = (SELECT auth.uid())
  LIMIT 1;

  -- A merge permission must be explicitly granted on a supplier-related screen.
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = (SELECT auth.uid())
      AND up.can_merge IS TRUE
      AND up.screen_key ILIKE '%supplier%'
  ) INTO v_can_merge;

  -- Keep tenant isolation for every non-super-admin, including employees.
  IF v_role IS DISTINCT FROM 'super_admin' THEN
    SELECT p.company_id INTO v_profile_company
    FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid())
    LIMIT 1;

    IF v_profile_company IS DISTINCT FROM p_subscriber_id THEN
      RAISE EXCEPTION 'SUBSCRIBER_ACCESS_DENIED';
    END IF;
  END IF;

  IF NOT (
    v_role IN ('admin', 'super_admin')
    OR COALESCE(v_can_merge, false)
  ) THEN
    RAISE EXCEPTION 'SUPPLIER_MERGE_NOT_ALLOWED';
  END IF;

  IF p_target_supplier_id = ANY(COALESCE(p_source_supplier_ids, '{}'::uuid[])) THEN
    RAISE EXCEPTION 'TARGET_MUST_NOT_BE_SOURCE';
  END IF;

  SELECT count(*) INTO v_source_count
  FROM unnest(COALESCE(p_source_supplier_ids, '{}'::uuid[])) s(id)
  WHERE s.id = p_target_supplier_id;

  IF v_source_count > 0 THEN
    RAISE EXCEPTION 'TARGET_MUST_NOT_BE_SOURCE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = p_target_supplier_id
      AND c.entity_type = 'supplier'
      AND c.subscriber_id = p_subscriber_id
      AND c.merged_into_id IS NULL
  ) THEN
    RAISE EXCEPTION 'TARGET_SUPPLIER_NOT_FOUND';
  END IF;

  IF COALESCE(array_length(p_source_supplier_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'NO_SOURCE_SUPPLIERS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = ANY(p_source_supplier_ids)
      AND (
        c.entity_type <> 'supplier'
        OR c.subscriber_id IS DISTINCT FROM p_subscriber_id
        OR c.merged_into_id IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'INVALID_SOURCE_SUPPLIER';
  END IF;

  SELECT count(*) INTO v_voucher_count
  FROM public.vouchers v
  WHERE v.company_id = ANY(p_source_supplier_ids);

  SELECT count(*) INTO v_bank_account_count
  FROM public.supplier_bank_accounts a
  WHERE a.supplier_id = ANY(p_source_supplier_ids);

  SELECT count(*) INTO v_cancelled_check_count
  FROM public.cancelled_checks c
  WHERE c.supplier_id = ANY(p_source_supplier_ids);

  SELECT upper(trim(sc.currency)) INTO v_target_default_currency
  FROM public.supplier_currencies sc
  WHERE sc.supplier_id = p_target_supplier_id
    AND sc.is_default = true
  LIMIT 1;

  IF v_target_default_currency IS NULL THEN
    SELECT upper(trim(sc.currency)) INTO v_source_default_currency
    FROM public.supplier_currencies sc
    WHERE sc.supplier_id = ANY(p_source_supplier_ids)
      AND sc.is_default = true
    ORDER BY array_position(p_source_supplier_ids, sc.supplier_id)
    LIMIT 1;
  END IF;

  -- Existing financial references: preserve the original merge behavior.
  UPDATE public.vouchers
  SET company_id = p_target_supplier_id
  WHERE company_id = ANY(p_source_supplier_ids);

  UPDATE public.supplier_bank_accounts
  SET supplier_id = p_target_supplier_id, updated_at = now()
  WHERE supplier_id = ANY(p_source_supplier_ids);

  UPDATE public.cancelled_checks
  SET supplier_id = p_target_supplier_id, updated_at = now()
  WHERE supplier_id = ANY(p_source_supplier_ids);

  -- Merge currency master data only; never rewrite historical voucher currencies.
  INSERT INTO public.supplier_currencies (supplier_id, currency, is_default)
  SELECT p_target_supplier_id, upper(trim(sc.currency)), false
  FROM public.supplier_currencies sc
  WHERE sc.supplier_id = ANY(p_source_supplier_ids)
    AND length(trim(sc.currency)) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.supplier_currencies tc
      WHERE tc.supplier_id = p_target_supplier_id
        AND upper(trim(tc.currency)) = upper(trim(sc.currency))
    )
  GROUP BY upper(trim(sc.currency));

  GET DIAGNOSTICS v_currency_count = ROW_COUNT;

  UPDATE public.supplier_currencies
  SET is_default = false
  WHERE supplier_id = p_target_supplier_id;

  v_fallback_currency := COALESCE(v_target_default_currency, v_source_default_currency);

  IF v_fallback_currency IS NULL THEN
    SELECT upper(trim(sc.currency)) INTO v_fallback_currency
    FROM public.supplier_currencies sc
    WHERE sc.supplier_id = p_target_supplier_id
    ORDER BY sc.currency
    LIMIT 1;
  END IF;

  IF v_fallback_currency IS NOT NULL THEN
    UPDATE public.supplier_currencies
    SET is_default = true
    WHERE supplier_id = p_target_supplier_id
      AND upper(trim(currency)) = v_fallback_currency;
  END IF;

  UPDATE public.companies t
  SET name = COALESCE(NULLIF(trim(p_new_name), ''), t.name),
      name_en = COALESCE(NULLIF(trim(p_new_name_en), ''), t.name_en, s.name_en),
      address = COALESCE(t.address, s.address),
      phone = COALESCE(t.phone, s.phone),
      tax_id = COALESCE(t.tax_id, s.tax_id),
      sap_number = COALESCE(t.sap_number, s.sap_number),
      bank_account_number = COALESCE(t.bank_account_number, s.bank_account_number),
      bank_account_iban = COALESCE(t.bank_account_iban, s.bank_account_iban),
      bank_account_bank_name = COALESCE(t.bank_account_bank_name, s.bank_account_bank_name)
  FROM public.companies s
  WHERE t.id = p_target_supplier_id
    AND s.id = p_source_supplier_ids[1];

  FOREACH v_source IN ARRAY p_source_supplier_ids LOOP
    UPDATE public.companies
    SET merged_into_id = p_target_supplier_id
    WHERE id = v_source;
  END LOOP;

  RETURN jsonb_build_object(
    'target_supplier_id', p_target_supplier_id,
    'merged_supplier_count', array_length(p_source_supplier_ids, 1),
    'vouchers_moved', v_voucher_count,
    'bank_accounts_moved', v_bank_account_count,
    'cancelled_checks_moved', v_cancelled_check_count,
    'currencies_added', v_currency_count
  );
END;
$function$;

NOTIFY pgrst, 'reload schema';
