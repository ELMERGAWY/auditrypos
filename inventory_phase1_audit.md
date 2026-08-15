# AuditryPOS Inventory Phase 1 Audit

## Confirmed structural defects

1. `InventoryTab.tsx` aggregates `warehouse_stock` into products, but `handleSave` deletes all `warehouse_stock` rows for a product in the workspace before inserting one selected warehouse row. Editing a product can therefore collapse a multi-warehouse balance into one warehouse.
2. `startEdit` calls `.maybeSingle()` for `warehouse_stock` by `product_id` only. A product with stock in more than one warehouse returns a multiple-row error and the edit form loses its warehouse assignment.
3. The edit modal embeds `<WarehouseManager />` without the required `restaurantId`, `warehouses`, and `onRefresh` props. This is a direct runtime/UX defect and contributes to the reported broken/unstable product edit experience.
4. The edit modal embeds the legacy `ItemWarehouseAssignments` path, which reads unscoped `sub_warehouses` and `item_warehouse_assignments`, while the main inventory screen uses `warehouses` and `warehouse_stock`. Two parallel warehouse models explain inconsistent routing and duplicate-looking products.
5. `warehouse_stock` was created with `UNIQUE(warehouse_id, product_id)` and no workspace key. The current v2 transfer RPC uses the same product ID for source/destination stock, which is correct for a shared product master, but old `execute_inventory_transfer` searches by barcode/SKU/name and creates destination product rows. Both models remain present and can cause duplicates.
6. `InventoryTransfersManager` loads every product passed from `InventoryTab` and does not filter products by selected source warehouse. Its product picker is a plain `<select>` with no search. It does support any source/target warehouse in this component, but the UX is slow and the displayed quantities may be wrong for the selected source.
7. `WarehouseManager` only renders the inline transfer action when the selected warehouse is `MAIN`, although the transfer RPC and target selector can support any warehouse. This is the hard-coded main-to-sub restriction reported by the user.
8. `InventoryTransfersManager.handleDeleteTransfer` deletes transfer rows without reversing stock, despite the fact that the transfer has already mutated balances. This is unsafe for financial/inventory auditability and must be replaced by void/reversal, not physical delete.
9. Transfer UI posts a journal entry with the same account `1300` on both debit and credit and does not create warehouse-specific accounting dimensions; the accounting bridge should be server-side/outbox-driven and not silently skip failures.
10. `inventoryService.ts` routes receive/issue/adjust/transfer to the `inventory_balances`/`inventory_movements`/`inventory_cost_layers` model through `sub_warehouse_id`, while the primary UI routes transfers and warehouse views through `warehouse_stock`. The two models are only partially synchronized by compatibility functions.
11. `WarehouseManager` update/create forms display advanced location/capacity/control fields but do not persist these fields in `handleSubmit`; editing resets them to empty/default values. This is a feature-not-working defect.
12. Product creation includes `item_type_id` and `batch_number` in form state but does not persist either field in `handleSave`; the UI gives the impression that these features work while silently dropping them.
13. Custom image uploads store a base64 data URL directly in `products.image`, which can create oversized rows and slow the edit/list UI. This should be moved to storage or bounded with a safe fallback in a later pass.
14. `products.quantity` is used as a compatibility aggregate while `warehouse_stock` and `inventory_balances` are per-warehouse sources. Reports that use `products.quantity` or `cost_price` without an explicit warehouse/cost layer can show incorrect values.

## Safe implementation direction

- Keep the existing product master; do not create a second product row merely because stock is moved to another warehouse.
- Make `warehouse_stock` the operational warehouse-level balance for the current UI, with explicit workspace/restaurant validation and a unique index that matches the actual tenant scope after duplicate review.
- Stop destructive reassignment on product edit. Edit product master fields independently; use a dedicated stock assignment/adjustment action for warehouse quantity.
- Remove the legacy assignment UI from the product edit modal or replace it with a scoped view over `warehouse_stock`; do not delete existing legacy tables or data in the first migration.
- Add a server-side/additive transfer reversal/void flow and prohibit physical delete of completed transfers.
- Add a searchable, source-stock-aware transfer selector and allow every active warehouse as source and destination, excluding only the same warehouse.
- Add a transaction-safe cost engine for weighted average and FIFO first; keep LIFO only when explicitly allowed by the company standard policy. Purchases, receipts, returns, sales, adjustments, and transfer reversals must write auditable movement/cost rows and an accounting outbox event.
- Preserve old rows and expose reconciliation reports before any data normalization or manual repair.
