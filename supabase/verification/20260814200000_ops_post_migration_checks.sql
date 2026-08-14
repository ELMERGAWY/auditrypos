-- AuditryPOS post-migration verification queries
-- READ ONLY: no INSERT/UPDATE/DELETE/DDL statements.

-- 1) Workspace coverage by restaurant.
SELECT restaurant_id, COUNT(*) AS workspaces,
       COUNT(*) FILTER (WHERE is_default) AS default_workspaces
FROM public.workspaces
GROUP BY restaurant_id
ORDER BY restaurant_id;

-- 2) Rows that still need manual scope review.
SELECT 'warehouses' AS source, COUNT(*) AS missing_scope
FROM public.warehouses WHERE workspace_id IS NULL
UNION ALL
SELECT 'products', COUNT(*) FROM public.products WHERE workspace_id IS NULL
UNION ALL
SELECT 'menu_items', COUNT(*) FROM public.menu_items WHERE workspace_id IS NULL
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders WHERE workspace_id IS NULL
UNION ALL
SELECT 'sales_invoices', COUNT(*) FROM public.sales_invoices WHERE workspace_id IS NULL
UNION ALL
SELECT 'warehouse_stock', COUNT(*) FROM public.warehouse_stock WHERE workspace_id IS NULL;

-- 3) Cross-workspace stock anomalies.
SELECT reconciliation_state, COUNT(*) AS rows_count
FROM public.v_stock_scope_reconciliation
GROUP BY reconciliation_state
ORDER BY reconciliation_state;

-- 4) Current health by branch.
SELECT *
FROM public.v_ops_health_dashboard
ORDER BY health_status DESC, workspace_name;

-- 5) Orders with no invoice link; this is diagnostic only.
SELECT order_id, restaurant_id, workspace_id, order_number, order_created_at,
       order_status, order_total, reconciliation_state
FROM public.v_order_invoice_reconciliation
WHERE reconciliation_state = 'order_without_invoice'
ORDER BY order_created_at DESC
LIMIT 500;

-- 6) Invoices with no order link; never auto-link without business confirmation.
SELECT sales_invoice_id, restaurant_id, workspace_id, invoice_number,
       invoice_total, reconciliation_state
FROM public.v_order_invoice_reconciliation
WHERE reconciliation_state = 'invoice_without_order_link'
ORDER BY invoice_number
LIMIT 500;

-- 7) Amount mismatches.
SELECT order_id, sales_invoice_id, order_number, invoice_number,
       order_total, invoice_total, reconciliation_state
FROM public.v_order_invoice_reconciliation
WHERE reconciliation_state = 'amount_mismatch'
ORDER BY order_created_at DESC
LIMIT 500;

-- 8) Accounting outbox state.
SELECT workspace_id, status, COUNT(*) AS rows_count,
       MIN(created_at) AS oldest_created_at,
       MAX(last_error) AS latest_error
FROM public.accounting_posting_outbox
GROUP BY workspace_id, status
ORDER BY workspace_id, status;

-- 9) Legacy posting failures.
SELECT workspace_id, status, COUNT(*) AS rows_count,
       MIN(created_at) AS oldest_created_at,
       MAX(error_message) AS latest_error
FROM public.gl_posting_failures
GROUP BY workspace_id, status
ORDER BY workspace_id, status;

-- 10) Duplicate stock rows should be zero after the old cleanup migration.
SELECT warehouse_id, product_id, COUNT(*) AS duplicate_rows
FROM public.warehouse_stock
GROUP BY warehouse_id, product_id
HAVING COUNT(*) > 1;

-- 11) Latest reconciliation runs.
SELECT id, restaurant_id, workspace_id, run_type, status,
       summary, started_at, completed_at, error_message
FROM public.ops_reconciliation_runs
ORDER BY started_at DESC
LIMIT 50;
