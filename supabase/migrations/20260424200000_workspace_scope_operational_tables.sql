-- ============================================================
-- AUDITRY POS: Workspace-scope for operational tables (branches)
-- ============================================================
-- Goal:
-- - Add workspace_id to key operational tables
-- - Backfill workspace_id from restaurant_id -> default workspace
-- - Auto-assign workspace_id on new writes when missing
--
-- Tables covered (current app-critical):
-- - products, menu_items, stock_movements
-- - shifts, delivery_agents, waiter_calls
-- - customers, suppliers, expenses, notifications
--
-- Notes:
-- - We keep restaurant_id for compatibility with current UI logic.
-- - For insert/update, if workspace_id is NULL, we fill it from the restaurant's default workspace.

BEGIN;

-- Helper: get default workspace for restaurant
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

-- Trigger function: set workspace_id from restaurant_id if missing
CREATE OR REPLACE FUNCTION public.tg_set_workspace_id_from_restaurant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.restaurant_id IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.workspace_id := public.fn_default_workspace_id(NEW.restaurant_id);
  RETURN NEW;
END;
$$;

-- Add + backfill + trigger helper (repeated explicitly to avoid dynamic SQL surprises in SQL editor)

-- products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_workspace_id ON public.products(workspace_id);
UPDATE public.products p
SET workspace_id = public.fn_default_workspace_id(p.restaurant_id)
WHERE p.workspace_id IS NULL AND p.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_products_set_workspace_id ON public.products;
CREATE TRIGGER trg_products_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.products
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

-- menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_workspace_id ON public.menu_items(workspace_id);
UPDATE public.menu_items m
SET workspace_id = public.fn_default_workspace_id(m.restaurant_id)
WHERE m.workspace_id IS NULL AND m.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_menu_items_set_workspace_id ON public.menu_items;
CREATE TRIGGER trg_menu_items_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

-- stock_movements
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_workspace_id ON public.stock_movements(workspace_id);
UPDATE public.stock_movements sm
SET workspace_id = public.fn_default_workspace_id(sm.restaurant_id)
WHERE sm.workspace_id IS NULL AND sm.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_stock_movements_set_workspace_id ON public.stock_movements;
CREATE TRIGGER trg_stock_movements_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

-- shifts
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_workspace_id ON public.shifts(workspace_id);
UPDATE public.shifts s
SET workspace_id = public.fn_default_workspace_id(s.restaurant_id)
WHERE s.workspace_id IS NULL AND s.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_shifts_set_workspace_id ON public.shifts;
CREATE TRIGGER trg_shifts_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

-- delivery_agents
ALTER TABLE public.delivery_agents
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_agents_workspace_id ON public.delivery_agents(workspace_id);
UPDATE public.delivery_agents da
SET workspace_id = public.fn_default_workspace_id(da.restaurant_id)
WHERE da.workspace_id IS NULL AND da.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_delivery_agents_set_workspace_id ON public.delivery_agents;
CREATE TRIGGER trg_delivery_agents_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.delivery_agents
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

-- waiter_calls
ALTER TABLE public.waiter_calls
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_waiter_calls_workspace_id ON public.waiter_calls(workspace_id);
UPDATE public.waiter_calls wc
SET workspace_id = public.fn_default_workspace_id(wc.restaurant_id)
WHERE wc.workspace_id IS NULL AND wc.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_waiter_calls_set_workspace_id ON public.waiter_calls;
CREATE TRIGGER trg_waiter_calls_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.waiter_calls
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

-- customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_workspace_id ON public.customers(workspace_id);
UPDATE public.customers c
SET workspace_id = public.fn_default_workspace_id(c.restaurant_id)
WHERE c.workspace_id IS NULL AND c.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_customers_set_workspace_id ON public.customers;
CREATE TRIGGER trg_customers_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

-- suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_workspace_id ON public.suppliers(workspace_id);
UPDATE public.suppliers s
SET workspace_id = public.fn_default_workspace_id(s.restaurant_id)
WHERE s.workspace_id IS NULL AND s.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_suppliers_set_workspace_id ON public.suppliers;
CREATE TRIGGER trg_suppliers_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

-- expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_id ON public.expenses(workspace_id);
UPDATE public.expenses e
SET workspace_id = public.fn_default_workspace_id(e.restaurant_id)
WHERE e.workspace_id IS NULL AND e.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_expenses_set_workspace_id ON public.expenses;
CREATE TRIGGER trg_expenses_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

-- notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON public.notifications(workspace_id);
UPDATE public.notifications n
SET workspace_id = public.fn_default_workspace_id(n.restaurant_id)
WHERE n.workspace_id IS NULL AND n.restaurant_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_notifications_set_workspace_id ON public.notifications;
CREATE TRIGGER trg_notifications_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

COMMIT;

