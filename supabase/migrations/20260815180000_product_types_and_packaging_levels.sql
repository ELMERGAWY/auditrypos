-- Product types and multi-level packaging — additive and data preserving.

CREATE TABLE IF NOT EXISTS public.item_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  type text NOT NULL,
  is_inventory boolean NOT NULL DEFAULT true,
  requires_warehouse boolean NOT NULL DEFAULT true,
  accounting_account_code text,
  cogs_account_code text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_types_type_unique_auditry UNIQUE (type)
);

INSERT INTO public.item_types (name, name_ar, type, is_inventory, requires_warehouse)
VALUES
  ('Inventory item', 'صنف مخزني', 'INVENTORY', true, true),
  ('Non-inventory item', 'صنف غير مخزني', 'NON_INVENTORY', false, false),
  ('Service', 'خدمة', 'SERVICE', false, false),
  ('Assembly', 'تجميع/تصنيع', 'ASSEMBLY', true, true)
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  is_inventory = EXCLUDED.is_inventory,
  requires_warehouse = EXCLUDED.requires_warehouse;

ALTER TABLE public.item_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS item_types_authenticated_read ON public.item_types;
CREATE POLICY item_types_authenticated_read ON public.item_types
FOR SELECT TO authenticated USING (true);

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS item_type_id uuid,
  ADD COLUMN IF NOT EXISTS unit_category text NOT NULL DEFAULT 'count',
  ADD COLUMN IF NOT EXISTS base_unit text NOT NULL DEFAULT 'قطعة',
  ADD COLUMN IF NOT EXISTS purchase_unit text,
  ADD COLUMN IF NOT EXISTS sales_unit text,
  ADD COLUMN IF NOT EXISTS packaging_schema jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_item_type_id_auditry
  ON public.products(item_type_id);

DO $$
BEGIN
  IF to_regclass('public.item_types') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.products'::regclass
         AND conname = 'products_item_type_id_fkey_auditry'
     ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_item_type_id_fkey_auditry
      FOREIGN KEY (item_type_id) REFERENCES public.item_types(id)
      ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.product_packaging_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  unit_name text NOT NULL,
  unit_short_name text,
  units_to_base numeric NOT NULL CHECK (units_to_base > 0),
  parent_level_id uuid REFERENCES public.product_packaging_levels(id) ON DELETE SET NULL,
  is_base boolean NOT NULL DEFAULT false,
  is_purchase_unit boolean NOT NULL DEFAULT false,
  is_sales_unit boolean NOT NULL DEFAULT false,
  barcode text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, unit_name)
);

CREATE INDEX IF NOT EXISTS idx_product_packaging_product_scope
  ON public.product_packaging_levels(product_id, workspace_id, is_active, sort_order);

ALTER TABLE public.product_packaging_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_packaging_authenticated_access ON public.product_packaging_levels;
CREATE POLICY product_packaging_authenticated_access ON public.product_packaging_levels
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_packaging_levels.product_id
      AND (
        public.is_restaurant_owner(auth.uid(), p.restaurant_id)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.check_user_permission(
          auth.uid(),
          (SELECT r.company_id FROM public.restaurants r WHERE r.id = p.restaurant_id),
          'inventory.adjust'
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_packaging_levels.product_id
      AND (
        public.is_restaurant_owner(auth.uid(), p.restaurant_id)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.check_user_permission(
          auth.uid(),
          (SELECT r.company_id FROM public.restaurants r WHERE r.id = p.restaurant_id),
          'inventory.adjust'
        )
      )
  )
);

-- Seed only missing packaging metadata from the existing two-level columns.
INSERT INTO public.product_packaging_levels (
  product_id, workspace_id, unit_name, unit_short_name, units_to_base, is_base, is_purchase_unit, is_sales_unit, sort_order
)
SELECT
  p.id, p.workspace_id, COALESCE(NULLIF(p.unit, ''), 'قطعة'), NULLIF(p.unit, ''), 1, true,
  COALESCE(NULLIF(p.purchase_unit, ''), p.unit) = p.unit,
  COALESCE(NULLIF(p.sales_unit, ''), p.unit) = p.unit,
  0
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_packaging_levels pl WHERE pl.product_id = p.id AND pl.unit_name = COALESCE(NULLIF(p.unit, ''), 'قطعة')
)
ON CONFLICT (product_id, unit_name) DO NOTHING;

INSERT INTO public.product_packaging_levels (
  product_id, workspace_id, unit_name, unit_short_name, units_to_base, is_base, is_purchase_unit, is_sales_unit, sort_order
)
SELECT
  p.id, p.workspace_id, p.secondary_unit, p.secondary_unit,
  GREATEST(COALESCE(p.unit_conversion_factor, 1), 1), false,
  COALESCE(NULLIF(p.purchase_unit, ''), p.secondary_unit) = p.secondary_unit,
  COALESCE(NULLIF(p.sales_unit, ''), p.unit) = p.secondary_unit,
  1
FROM public.products p
WHERE NULLIF(p.secondary_unit, '') IS NOT NULL
  AND p.secondary_unit <> COALESCE(NULLIF(p.unit, ''), 'قطعة')
ON CONFLICT (product_id, unit_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.convert_product_quantity(
  p_product_id uuid,
  p_quantity numeric,
  p_unit_name text
) RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_factor numeric;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 0 THEN
    RAISE EXCEPTION 'الكمية يجب ألا تكون سالبة';
  END IF;
  SELECT units_to_base INTO v_factor
  FROM public.product_packaging_levels
  WHERE product_id = p_product_id
    AND unit_name = p_unit_name
    AND is_active = true
  LIMIT 1;
  IF v_factor IS NULL THEN
    RAISE EXCEPTION 'وحدة التعبئة غير معرفة لهذا الصنف';
  END IF;
  RETURN p_quantity * v_factor;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_product_quantity(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_product_quantity(uuid,numeric,text) TO authenticated, service_role;
