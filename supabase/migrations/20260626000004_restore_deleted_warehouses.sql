-- ============================================================
-- RESTORE DELETED WAREHOUSES
-- ============================================================
-- This migration restores warehouses that were soft-deleted
-- ============================================================

BEGIN;

-- Function to restore a specific warehouse by ID
CREATE OR REPLACE FUNCTION public.restore_warehouse(p_warehouse_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Restore the warehouse by setting deleted_at to null
  UPDATE public.warehouses
  SET deleted_at = NULL
  WHERE id = p_warehouse_id
  RETURNING row_to_json(warehouses.*)::jsonb;
END;
$$;

-- Function to restore all warehouses for a specific restaurant
CREATE OR REPLACE FUNCTION public.restore_restaurant_warehouses(p_restaurant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  restored_count INTEGER;
BEGIN
  -- Restore all warehouses for the restaurant
  UPDATE public.warehouses
  SET deleted_at = NULL
  WHERE restaurant_id = p_restaurant_id AND deleted_at IS NOT NULL;
  
  GET DIAGNOSTICS restored_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Restored warehouses',
    'count', restored_count
  );
END;
$$;

-- Function to list deleted warehouses for a restaurant
CREATE OR REPLACE FUNCTION public.list_deleted_warehouses(p_restaurant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_agg(
    jsonb_build_object(
      'id', id,
      'code', code,
      'name', name,
      'name_ar', name_ar,
      'type', type,
      'deleted_at', deleted_at
    )
  )
  FROM (
    SELECT id, code, name, name_ar, type, deleted_at
    FROM public.warehouses
    WHERE restaurant_id = p_restaurant_id AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  ) AS deleted_wh;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.restore_warehouse TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_restaurant_warehouses TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_deleted_warehouses TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Warehouse Restore Functions Created';
  RAISE NOTICE '   • restore_warehouse(p_warehouse_id): Restore specific warehouse';
  RAISE NOTICE '   • restore_restaurant_warehouses(p_restaurant_id): Restore all warehouses for restaurant';
  RAISE NOTICE '   • list_deleted_warehouses(p_restaurant_id): List deleted warehouses';
END $$;
