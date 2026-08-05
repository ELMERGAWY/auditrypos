CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_document_idempotency_idx
ON public.inventory_movements (item_id, sub_warehouse_id, reference_type, reference_id, movement_type)
WHERE reference_id IS NOT NULL AND reference_type IS NOT NULL;