-- Migration to inspect warehouse_stock data and identify issues
BEGIN;

-- 1. Show all warehouse_stock records with warehouse and product info
SELECT 
    ws.id,
    ws.warehouse_id,
    w.name_ar as warehouse_name,
    w.type as warehouse_type,
    ws.product_id,
    p.name as product_name,
    ws.quantity
FROM public.warehouse_stock ws
JOIN public.warehouses w ON ws.warehouse_id = w.id
JOIN public.products p ON ws.product_id = p.id
ORDER BY w.name_ar, p.name;

-- 2. Count products per warehouse
SELECT 
    w.name_ar as warehouse_name,
    w.type as warehouse_type,
    COUNT(*) as product_count
FROM public.warehouse_stock ws
JOIN public.warehouses w ON ws.warehouse_id = w.id
GROUP BY w.id, w.name_ar, w.type
ORDER BY w.name_ar;

-- 3. Check for products in multiple warehouses
SELECT 
    p.name as product_name,
    COUNT(*) as warehouse_count,
    STRING_AGG(w.name_ar, ', ') as warehouses
FROM public.warehouse_stock ws
JOIN public.warehouses w ON ws.warehouse_id = w.id
JOIN public.products p ON ws.product_id = p.id
GROUP BY p.id, p.name
HAVING COUNT(*) > 1
ORDER BY p.name;

-- 4. Check products.warehouse_id values (should be NULL after cleanup)
SELECT 
    p.id,
    p.name as product_name,
    p.warehouse_id,
    w.name_ar as assigned_warehouse_name
FROM public.products p
LEFT JOIN public.warehouses w ON p.warehouse_id = w.id
WHERE p.warehouse_id IS NOT NULL
ORDER BY p.name;

ROLLBACK; -- This is a read-only migration, so we rollback
