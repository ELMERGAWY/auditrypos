-- Service module foundation — additive, multi-tenant, and data preserving.

ALTER TABLE IF EXISTS public.service_invoices
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_description text,
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_service_invoices_workspace_date
  ON public.service_invoices(restaurant_id, workspace_id, invoice_date DESC);

DO $$
BEGIN
  IF to_regprocedure('public.tg_set_workspace_id_from_restaurant()') IS NOT NULL
     AND to_regclass('public.service_invoices') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_service_invoices_set_workspace ON public.service_invoices;
    CREATE TRIGGER trg_service_invoices_set_workspace
    BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.service_invoices
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_packages
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_service_packages_scope
  ON public.service_packages(restaurant_id, workspace_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.service_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_package_items_package
  ON public.service_package_items(package_id);

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_packages_owner_manage ON public.service_packages;
CREATE POLICY service_packages_owner_manage ON public.service_packages
FOR ALL TO authenticated
USING (
  public.is_restaurant_owner(auth.uid(), restaurant_id)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.restaurants r ON r.company_id = cu.company_id
    WHERE r.id = service_packages.restaurant_id
      AND cu.user_id = auth.uid()
      AND cu.is_active = true
      AND cu.role IN ('owner','admin','manager','branch_manager')
  )
)
WITH CHECK (
  public.is_restaurant_owner(auth.uid(), restaurant_id)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.restaurants r ON r.company_id = cu.company_id
    WHERE r.id = service_packages.restaurant_id
      AND cu.user_id = auth.uid()
      AND cu.is_active = true
      AND cu.role IN ('owner','admin','manager','branch_manager')
  )
);

DROP POLICY IF EXISTS service_package_items_owner_manage ON public.service_package_items;
CREATE POLICY service_package_items_owner_manage ON public.service_package_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_packages sp
    WHERE sp.id = service_package_items.package_id
      AND (
        public.is_restaurant_owner(auth.uid(), sp.restaurant_id)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          JOIN public.restaurants r ON r.company_id = cu.company_id
          WHERE r.id = sp.restaurant_id
            AND cu.user_id = auth.uid()
            AND cu.is_active = true
            AND cu.role IN ('owner','admin','manager','branch_manager')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_packages sp
    WHERE sp.id = service_package_items.package_id
      AND (
        public.is_restaurant_owner(auth.uid(), sp.restaurant_id)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          JOIN public.restaurants r ON r.company_id = cu.company_id
          WHERE r.id = sp.restaurant_id
            AND cu.user_id = auth.uid()
            AND cu.is_active = true
            AND cu.role IN ('owner','admin','manager','branch_manager')
        )
      )
  )
);
