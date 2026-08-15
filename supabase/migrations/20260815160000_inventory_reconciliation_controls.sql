-- Inventory reconciliation controls — read-only and data preserving.

CREATE OR REPLACE FUNCTION public.get_inventory_reconciliation(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_only_differences boolean DEFAULT false,
  p_limit integer DEFAULT 2000
) RETURNS TABLE (
  product_id uuid,
  warehouse_id uuid,
  product_name text,
  warehouse_name text,
  warehouse_quantity numeric,
  ledger_quantity numeric,
  quantity_difference numeric,
  warehouse_value numeric,
  ledger_value numeric,
  value_difference numeric,
  reconciliation_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND w.restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'الفرع لا يتبع الشركة المحددة';
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
     AND NOT EXISTS (SELECT 1 FROM public.auth_workspace_ids() aw WHERE aw = p_workspace_id)
     AND NOT public.is_restaurant_owner(auth.uid(), p_restaurant_id) THEN
    RAISE EXCEPTION 'غير مصرح بقراءة مطابقة المخزون لهذا الفرع';
  END IF;

  RETURN QUERY
  WITH stock AS (
    SELECT ws.product_id, ws.warehouse_id,
           COALESCE(SUM(ws.quantity), 0)::numeric AS quantity
    FROM public.warehouse_stock ws
    WHERE ws.restaurant_id = p_restaurant_id
      AND ws.workspace_id = p_workspace_id
    GROUP BY ws.product_id, ws.warehouse_id
  ), ledger AS (
    SELECT ib.item_id AS product_id, ib.sub_warehouse_id AS warehouse_id,
           COALESCE(ib.quantity_on_hand, 0)::numeric AS quantity,
           COALESCE(ib.total_value, 0)::numeric AS value
    FROM public.inventory_balances ib
  ), combined AS (
    SELECT
      COALESCE(s.product_id, l.product_id) AS product_id,
      COALESCE(s.warehouse_id, l.warehouse_id) AS warehouse_id,
      COALESCE(s.quantity, 0)::numeric AS warehouse_quantity,
      COALESCE(l.quantity, 0)::numeric AS ledger_quantity,
      COALESCE(l.value, 0)::numeric AS ledger_value
    FROM stock s
    FULL OUTER JOIN ledger l
      ON l.product_id = s.product_id
     AND l.warehouse_id = s.warehouse_id
  )
  SELECT
    c.product_id,
    c.warehouse_id,
    p.name,
    w.name,
    c.warehouse_quantity,
    c.ledger_quantity,
    c.warehouse_quantity - c.ledger_quantity,
    c.warehouse_quantity * COALESCE(p.cost_price, 0),
    c.ledger_value,
    (c.warehouse_quantity * COALESCE(p.cost_price, 0)) - c.ledger_value,
    CASE
      WHEN ABS(c.warehouse_quantity - c.ledger_quantity) < 0.000001
       AND ABS((c.warehouse_quantity * COALESCE(p.cost_price, 0)) - c.ledger_value) < 0.01
        THEN 'matched'
      WHEN c.warehouse_quantity = 0 AND c.ledger_quantity <> 0
        THEN 'ledger_only'
      WHEN c.warehouse_quantity <> 0 AND c.ledger_quantity = 0
        THEN 'warehouse_only'
      ELSE 'quantity_or_value_difference'
    END
  FROM combined c
  JOIN public.products p ON p.id = c.product_id
  JOIN public.warehouses w
    ON w.id = c.warehouse_id
   AND w.restaurant_id = p_restaurant_id
   AND w.workspace_id = p_workspace_id
  WHERE (p.workspace_id = p_workspace_id OR p.workspace_id IS NULL)
    AND (
      NOT p_only_differences
      OR ABS(c.warehouse_quantity - c.ledger_quantity) >= 0.000001
      OR ABS((c.warehouse_quantity * COALESCE(p.cost_price, 0)) - c.ledger_value) >= 0.01
    )
  ORDER BY ABS(c.warehouse_quantity - c.ledger_quantity) DESC,
           ABS((c.warehouse_quantity * COALESCE(p.cost_price, 0)) - c.ledger_value) DESC,
           p.name
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 2000), 10000));
END;
$$;

REVOKE ALL ON FUNCTION public.get_inventory_reconciliation(uuid, uuid, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_reconciliation(uuid, uuid, boolean, integer) TO authenticated, service_role;
