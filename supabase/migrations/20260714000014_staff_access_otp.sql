-- Staff self-register + email OTP membership + document attribution

-- 1) Company join codes (short code employees use when registering)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS join_code TEXT;

UPDATE public.companies
SET join_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE join_code IS NULL OR join_code = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_join_code
  ON public.companies (join_code)
  WHERE join_code IS NOT NULL;

-- 2) Pending staff access requests
CREATE TABLE IF NOT EXISTS public.staff_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  requested_role TEXT NOT NULL DEFAULT 'cashier'
    CHECK (requested_role IN ('admin', 'manager', 'accountant', 'cashier', 'viewer')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  join_code TEXT,
  company_hint TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_access_requests_pending
  ON public.staff_access_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_access_requests_company
  ON public.staff_access_requests (company_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_access_requests_user
  ON public.staff_access_requests (user_id);

ALTER TABLE public.staff_access_requests ENABLE ROW LEVEL SECURITY;

-- 3) More audit name columns
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sales_invoices','purchase_invoices','receipt_vouchers','payment_vouchers',
    'expense_vouchers','orders','inventory_receipts','journal_entries',
    'sales_orders','purchase_orders','supplier_contracts'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by_name TEXT', t);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by_name TEXT', t);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by UUID', t);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by UUID', t);
    END IF;
  END LOOP;
END $$;

-- 4) Helper: is company admin/owner (or restaurant owner linked to company)
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = _company_id
      AND cu.user_id = _user_id
      AND cu.is_active = true
      AND cu.role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.company_id = _company_id
      AND r.owner_id = _user_id
  )
  OR public.has_role(_user_id, 'super_admin');
$$;

-- 5) RLS for staff_access_requests
DROP POLICY IF EXISTS staff_req_select ON public.staff_access_requests;
CREATE POLICY staff_req_select ON public.staff_access_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR (company_id IS NOT NULL AND public.is_company_admin(auth.uid(), company_id))
    OR (
      company_id IS NULL
      AND join_code IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.join_code = staff_access_requests.join_code
          AND public.is_company_admin(auth.uid(), c.id)
      )
    )
  );

DROP POLICY IF EXISTS staff_req_update ON public.staff_access_requests;
CREATE POLICY staff_req_update ON public.staff_access_requests
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (company_id IS NOT NULL AND public.is_company_admin(auth.uid(), company_id))
    OR (
      company_id IS NULL
      AND join_code IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.join_code = staff_access_requests.join_code
          AND public.is_company_admin(auth.uid(), c.id)
      )
    )
  );

DROP POLICY IF EXISTS staff_req_insert ON public.staff_access_requests;
CREATE POLICY staff_req_insert ON public.staff_access_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 6) Submit access request after OTP login
CREATE OR REPLACE FUNCTION public.submit_staff_access_request(
  p_full_name TEXT,
  p_requested_role TEXT DEFAULT 'cashier',
  p_join_code TEXT DEFAULT NULL,
  p_company_hint TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_company_id UUID;
  v_existing UUID;
  v_role TEXT := LOWER(COALESCE(NULLIF(TRIM(p_requested_role), ''), 'cashier'));
  v_code TEXT := UPPER(NULLIF(TRIM(p_join_code), ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً (OTP)';
  END IF;

  IF v_role NOT IN ('admin', 'manager', 'accountant', 'cashier', 'viewer') THEN
    v_role := 'cashier';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  v_email := COALESCE(v_email, '');

  -- Update profile name
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (v_uid, COALESCE(NULLIF(TRIM(p_full_name), ''), split_part(v_email, '@', 1)), v_email)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = COALESCE(EXCLUDED.email, profiles.email),
        updated_at = NOW();

  IF v_code IS NOT NULL THEN
    SELECT id INTO v_company_id FROM public.companies WHERE join_code = v_code LIMIT 1;
  END IF;

  -- Already active member?
  IF EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = v_uid AND is_active = true
  ) THEN
    RETURN NULL; -- already approved somewhere
  END IF;

  SELECT id INTO v_existing
  FROM public.staff_access_requests
  WHERE user_id = v_uid AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.staff_access_requests
    SET full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
        requested_role = v_role,
        company_id = COALESCE(v_company_id, company_id),
        join_code = COALESCE(v_code, join_code),
        company_hint = COALESCE(NULLIF(TRIM(p_company_hint), ''), company_hint),
        updated_at = NOW()
    WHERE id = v_existing;
    RETURN v_existing;
  END IF;

  INSERT INTO public.staff_access_requests (
    user_id, email, full_name, requested_role, company_id, join_code, company_hint, status
  ) VALUES (
    v_uid, v_email, COALESCE(NULLIF(TRIM(p_full_name), ''), split_part(v_email, '@', 1)),
    v_role, v_company_id, v_code, NULLIF(TRIM(p_company_hint), ''), 'pending'
  )
  RETURNING id INTO v_existing;

  RETURN v_existing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_staff_access_request(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 7) Approve (company admin or super admin). Super admin can pass multiple company ids.
CREATE OR REPLACE FUNCTION public.approve_staff_access(
  p_request_id UUID,
  p_role TEXT DEFAULT NULL,
  p_company_ids UUID[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.staff_access_requests%ROWTYPE;
  v_role TEXT;
  v_cid UUID;
  v_ids UUID[];
  v_is_super BOOLEAN := public.has_role(auth.uid(), 'super_admin');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  SELECT * INTO v_req FROM public.staff_access_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب غير موجود';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'تمت معالجة هذا الطلب مسبقاً';
  END IF;

  v_role := LOWER(COALESCE(NULLIF(TRIM(p_role), ''), v_req.requested_role, 'cashier'));
  IF v_role NOT IN ('owner','admin','manager','accountant','cashier','viewer') THEN
    v_role := 'cashier';
  END IF;
  -- Never grant owner via staff approval path
  IF v_role = 'owner' THEN v_role := 'admin'; END IF;

  IF p_company_ids IS NOT NULL AND array_length(p_company_ids, 1) > 0 THEN
    IF NOT v_is_super THEN
      RAISE EXCEPTION 'ضم الموظف لأكثر من شركة متاح للسوبر أدمن فقط';
    END IF;
    v_ids := p_company_ids;
  ELSIF v_req.company_id IS NOT NULL THEN
    v_ids := ARRAY[v_req.company_id];
  ELSE
    RAISE EXCEPTION 'حدد شركة للموافقة';
  END IF;

  FOREACH v_cid IN ARRAY v_ids LOOP
    IF NOT v_is_super AND NOT public.is_company_admin(auth.uid(), v_cid) THEN
      RAISE EXCEPTION 'لست أدمن لهذه الشركة';
    END IF;

    INSERT INTO public.company_users (company_id, user_id, role, is_active)
    VALUES (v_cid, v_req.user_id, v_role, true)
    ON CONFLICT (company_id, user_id) DO UPDATE
      SET role = EXCLUDED.role,
          is_active = true;
  END LOOP;

  UPDATE public.staff_access_requests
  SET status = 'approved',
      company_id = v_ids[1],
      requested_role = v_role,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  -- Keep profile in sync
  UPDATE public.profiles
  SET full_name = COALESCE(NULLIF(v_req.full_name, ''), full_name),
      updated_at = NOW()
  WHERE user_id = v_req.user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_staff_access(UUID, TEXT, UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_staff_access(
  p_request_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.staff_access_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.staff_access_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'طلب غير موجود'; END IF;

  IF NOT (
    public.has_role(auth.uid(), 'super_admin')
    OR (v_req.company_id IS NOT NULL AND public.is_company_admin(auth.uid(), v_req.company_id))
  ) THEN
    RAISE EXCEPTION 'غير مصرح برفض هذا الطلب';
  END IF;

  UPDATE public.staff_access_requests
  SET status = 'rejected',
      review_note = p_note,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_staff_access(UUID, TEXT) TO authenticated;

-- 8) Check if current user can access dashboard as staff/member
CREATE OR REPLACE FUNCTION public.get_my_staff_access()
RETURNS TABLE (
  has_access BOOLEAN,
  pending_request BOOLEAN,
  full_name TEXT,
  companies JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::TEXT, '[]'::JSONB;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (
      EXISTS (SELECT 1 FROM public.company_users cu WHERE cu.user_id = v_uid AND cu.is_active)
      OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.owner_id = v_uid)
      OR public.has_role(v_uid, 'super_admin')
    ) AS has_access,
    EXISTS (
      SELECT 1 FROM public.staff_access_requests sar
      WHERE sar.user_id = v_uid AND sar.status = 'pending'
    ) AS pending_request,
    COALESCE(
      (SELECT p.full_name FROM public.profiles p WHERE p.user_id = v_uid LIMIT 1),
      (SELECT sar.full_name FROM public.staff_access_requests sar WHERE sar.user_id = v_uid ORDER BY sar.created_at DESC LIMIT 1)
    ) AS full_name,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'company_id', cu.company_id,
        'role', cu.role,
        'company_name', c.name
      ))
      FROM public.company_users cu
      JOIN public.companies c ON c.id = cu.company_id
      WHERE cu.user_id = v_uid AND cu.is_active
    ), '[]'::JSONB) AS companies;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_staff_access() TO authenticated;

-- 9) Ensure restaurants.owner always has company_users row when company exists
CREATE OR REPLACE FUNCTION public.ensure_owner_company_membership()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_users (company_id, user_id, role, is_active)
  SELECT r.company_id, r.owner_id, 'owner', true
  FROM public.restaurants r
  WHERE r.company_id IS NOT NULL
    AND r.owner_id IS NOT NULL
  ON CONFLICT (company_id, user_id) DO NOTHING;
END;
$$;

SELECT public.ensure_owner_company_membership();

-- 10) upsert_pos_order: stamp created_by_name / updated_by_name
CREATE OR REPLACE FUNCTION public.upsert_pos_order(p_payload jsonb)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_client_id text := NULLIF(TRIM(p_payload->>'client_order_id'), '');
  v_order_number text := NULLIF(TRIM(p_payload->>'order_number'), '');
  v_restaurant_id uuid := (p_payload->>'restaurant_id')::uuid;
  v_paid numeric := COALESCE((p_payload->>'paid_amount')::numeric, 0);
  v_total numeric := COALESCE((p_payload->>'total')::numeric, 0);
  v_actor text := NULLIF(TRIM(COALESCE(p_payload->>'created_by_name', p_payload->>'updated_by_name', '')), '');
  v_actor_id uuid := NULLIF(p_payload->>'created_by', '')::uuid;
BEGIN
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id is required';
  END IF;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'client_order_id is required';
  END IF;
  IF v_order_number IS NULL THEN
    v_order_number := 'ORD-' || UPPER(RIGHT(REPLACE(v_client_id, '-', ''), 8));
  END IF;
  IF v_actor_id IS NULL THEN
    v_actor_id := auth.uid();
  END IF;
  IF v_actor IS NULL THEN
    SELECT NULLIF(TRIM(full_name), '') INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE client_order_id = v_client_id LIMIT 1;
  IF FOUND THEN
    UPDATE public.orders SET
      paid_amount = v_paid,  -- Use direct value, not GREATEST
      total = CASE WHEN v_total > 0 THEN v_total ELSE total END,
      discount = COALESCE((p_payload->>'discount')::numeric, discount),
      status = COALESCE(NULLIF(p_payload->>'status', ''), status),
      payment_method = COALESCE(NULLIF(p_payload->>'payment_method', ''), payment_method),
      customer_id = COALESCE(NULLIF(p_payload->>'customer_id', '')::uuid, customer_id),
      customer_name = COALESCE(NULLIF(p_payload->>'customer_name', ''), customer_name),
      customer_phone = COALESCE(NULLIF(p_payload->>'customer_phone', ''), customer_phone),
      notes = COALESCE(NULLIF(p_payload->>'notes', ''), notes),
      updated_by_name = COALESCE(v_actor, updated_by_name),
      updated_by = COALESCE(v_actor_id, updated_by),
      updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
    RETURN v_order;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE restaurant_id = v_restaurant_id AND order_number = v_order_number
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.orders SET
      client_order_id = COALESCE(client_order_id, v_client_id),
      paid_amount = v_paid,  -- Use direct value, not GREATEST
      total = CASE WHEN v_total > 0 THEN v_total ELSE total END,
      status = COALESCE(NULLIF(p_payload->>'status', ''), status),
      updated_by_name = COALESCE(v_actor, updated_by_name),
      updated_by = COALESCE(v_actor_id, updated_by),
      updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
    RETURN v_order;
  END IF;

  BEGIN
    INSERT INTO public.orders (
      restaurant_id, order_number, total, discount, status,
      table_number, order_type, customer_name, customer_phone, customer_ref,
      delivery_address, delivery_date, delivery_agent_id, payment_method,
      paid_amount, notes, client_order_id, customer_id,
      created_by_name, updated_by_name, created_by, updated_by
    ) VALUES (
      v_restaurant_id,
      v_order_number,
      v_total,
      COALESCE((p_payload->>'discount')::numeric, 0),
      COALESCE(NULLIF(p_payload->>'status', ''), 'completed'),
      NULLIF(p_payload->>'table_number', '')::int,
      COALESCE(NULLIF(p_payload->>'order_type', ''), 'takeaway'),
      COALESCE(NULLIF(p_payload->>'customer_name', ''), 'عميل نقدي'),
      COALESCE(p_payload->>'customer_phone', ''),
      NULLIF(p_payload->>'customer_ref', ''),
      COALESCE(p_payload->>'delivery_address', ''),
      NULLIF(p_payload->>'delivery_date', '')::timestamptz,
      NULLIF(p_payload->>'delivery_agent_id', '')::uuid,
      COALESCE(NULLIF(p_payload->>'payment_method', ''), 'cash'),
      v_paid,
      COALESCE(p_payload->>'notes', ''),
      v_client_id,
      NULLIF(p_payload->>'customer_id', '')::uuid,
      v_actor, v_actor, v_actor_id, v_actor_id
    )
    RETURNING * INTO v_order;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_order
    FROM public.orders
    WHERE client_order_id = v_client_id
       OR (restaurant_id = v_restaurant_id AND order_number = v_order_number)
    ORDER BY CASE WHEN client_order_id = v_client_id THEN 0 ELSE 1 END
    LIMIT 1;
    IF NOT FOUND THEN RAISE; END IF;
    UPDATE public.orders SET
      client_order_id = COALESCE(client_order_id, v_client_id),
      paid_amount = v_paid,  -- Use direct value, not GREATEST
      updated_by_name = COALESCE(v_actor, updated_by_name),
      updated_by = COALESCE(v_actor_id, updated_by),
      updated_at = NOW()
    WHERE id = v_order.id
    RETURNING * INTO v_order;
  END;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_pos_order(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_pos_order(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_pos_order(jsonb) TO service_role;

-- 11) Patch save_receipt_voucher: stamp actor names if columns exist
-- (soft: update after insert via trigger)
CREATE OR REPLACE FUNCTION public.tg_stamp_actor_names()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT NULLIF(TRIM(full_name), '') INTO v_name
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  IF v_name IS NULL THEN
    v_name := COALESCE(auth.jwt() ->> 'email', 'مستخدم');
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by_name IS NULL OR NEW.created_by_name = '' THEN
      NEW.created_by_name := v_name;
    END IF;
    IF NEW.updated_by_name IS NULL OR NEW.updated_by_name = '' THEN
      NEW.updated_by_name := v_name;
    END IF;
    BEGIN
      IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
      IF NEW.updated_by IS NULL THEN NEW.updated_by := auth.uid(); END IF;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by_name := v_name;
    BEGIN
      NEW.updated_by := auth.uid();
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sales_invoices','purchase_invoices','receipt_vouchers','payment_vouchers',
    'expense_vouchers','orders','inventory_receipts','journal_entries',
    'sales_orders','purchase_orders'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_stamp_actor_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_stamp_actor_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_stamp_actor_names()',
        t, t
      );
    END IF;
  END LOOP;
END $$;
