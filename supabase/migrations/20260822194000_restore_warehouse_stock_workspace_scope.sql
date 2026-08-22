-- Restore branch scope columns for incomplete inventory installations.
-- Additive-only and data-preserving: no rows are deleted and quantities are not changed.

ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS workspace_id uuid
  REFERENCES public.workspaces(id)
  ON DELETE SET NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS workspace_id uuid
  REFERENCES public.workspaces(id)
  ON DELETE SET NULL;

ALTER TABLE public.warehouse_stock
  ADD COLUMN IF NOT EXISTS workspace_id uuid
  REFERENCES public.workspaces(id)
  ON DELETE SET NULL;

-- Existing installations may not have warehouse_id on products, so product
-- scope is derived from the restaurant default workspace only.
UPDATE public.warehouses w
SET workspace_id = (
  SELECT d.id
  FROM public.workspaces d
  WHERE d.restaurant_id = w.restaurant_id
    AND d.is_default = true
  ORDER BY d.created_at
  LIMIT 1
)
WHERE w.workspace_id IS NULL;

UPDATE public.products p
SET workspace_id = (
  SELECT d.id
  FROM public.workspaces d
  WHERE d.restaurant_id = p.restaurant_id
    AND d.is_default = true
  ORDER BY d.created_at
  LIMIT 1
)
WHERE p.workspace_id IS NULL;

UPDATE public.warehouse_stock ws
SET workspace_id = COALESCE(
  (SELECT w.workspace_id FROM public.warehouses w WHERE w.id = ws.warehouse_id),
  (SELECT p.workspace_id FROM public.products p WHERE p.id = ws.product_id),
  (SELECT d.id
   FROM public.workspaces d
   WHERE d.restaurant_id = ws.restaurant_id
     AND d.is_default = true
   ORDER BY d.created_at
   LIMIT 1)
)
WHERE ws.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_warehouses_workspace_scope
  ON public.warehouses (workspace_id, restaurant_id);

CREATE INDEX IF NOT EXISTS idx_products_workspace_scope
  ON public.products (workspace_id, restaurant_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_workspace_scope
  ON public.warehouse_stock (workspace_id, restaurant_id, warehouse_id, product_id);

ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';
