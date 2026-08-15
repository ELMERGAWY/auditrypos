# Global module research notes

## Warehouse and multi-location inventory

### Cin7 — Warehouse Inventory Management
Source: https://www.cin7.com/features/inventory/warehouse-management/

The official feature page emphasizes one centralized view of stock by warehouse, real-time location-level visibility, batch and expiry tracking, barcode-verified picking and packing, nearest-location order routing, location-specific reorder points, transfer recommendations, stocktake assignment by warehouse/team, mobile access, and integrated fulfillment. These are reference capabilities for AuditryPOS, not a request to copy Cin7's implementation.

### Cin7 — Multi-location challenges
Source: https://www.cin7.com/blog/top-5-multi-location-inventory-challenges-and-solutions/

The official article identifies real-time tracking, supply-chain cost control, communication between sites, localized demand forecasting, and returns/reverse logistics as recurring multi-location risks. The design implication for AuditryPOS is that stock visibility, transfers, cycle counts, returns, and reconciliation must be connected to the same scoped ledger and auditable workflow.

## Restaurant inventory and POS

### Square Restaurant Inventory by MarketMan
Source: https://squareup.com/help/us/en/article/8610-manage-ingredient-inventory-with-square-restaurant-inventory

The official Square support page highlights real-time ingredient tracking, purchase orders, menu/recipe costing, analytics, POS integration, menu profitability, COGS, and product variance reporting. The design implication is that restaurant mode requires recipe/BOM consumption and theoretical-versus-actual variance, not only finished-product quantities.

## Planned capability matrix

| Area | Reference capability | AuditryPOS direction |
|---|---|---|
| Warehouse | Real-time location stock and centralized dashboard | Keep `warehouse_stock`/`inventory_balances` scoped by workspace and expose one operational view. |
| Transfers | Bidirectional transfers with tracking and recommendations | Keep atomic transfer/receive/reversal workflow and add search, status, and in-transit visibility. |
| Picking/packing | Barcode verification and guided fulfillment | Add barcode scan-ready UI and validation after core inventory stability. |
| Replenishment | Location-specific reorder points and suggested purchase/transfer | Extend current reorder rules per warehouse; suggestions remain reviewable, not destructive auto-orders. |
| Stocktake | Assigned counts and variance reconciliation | Build on current read-only reconciliation, then add approved adjustment workflow. |
| Restaurant | Ingredient and recipe costing, theoretical vs actual usage | Add recipe/BOM consumption tied to POS and purchase costs; preserve service/retail paths. |
| Returns | Centralized returns and reverse logistics | Connect returns to inventory ledger and accounting reversal without deleting original transactions. |
| Storefront/marketing | Product/catalog sync, Meta events and campaign analytics | Extend current storefront/Meta foundation with configurable presentation and reporting. |

## Safety constraints

All enhancements must remain additive, scoped by tenant/workspace/warehouse, and deployable in Lovable SQL Editor. Historical transactions must not be deleted or rewritten automatically. Any stock or accounting correction must be represented as a controlled reversal or adjustment with an audit trail.
