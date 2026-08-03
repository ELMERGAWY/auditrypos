# Auditry — Enterprise-Grade Architecture Refactor

The request covers five deep architectural tracks across a codebase of ~250 files and ~90,000 lines. Doing it all in one pass would risk the stability of a live system that is currently working. The plan below sequences the work into phases that each land safely, in priority order, with no destructive schema changes and no removal of existing features.

## Guiding rules for every phase

- No dropping of existing tables, columns, or user data. Additive migrations only.
- No feature removal. Consolidation happens behind the existing entry points.
- Each phase ends with the app compiling and the preview verified.

## Phase 1 — Mandatory GL binding (highest priority)

Goal: no financial document can exist without a balanced journal entry.

- Build one server-side posting engine (`fn_post_document_journal`) as the single entry point for every document type: POS order, sales invoice, purchase invoice, expense, receipt voucher, payment voucher, inventory movement, payroll.
- Add a hard balance guard: a deferred constraint trigger on `journal_entries` that rejects any entry whose lines do not sum to zero at transaction commit (replacing the current per-row check that breaks multi-line inserts).
- Attach `AFTER INSERT OR UPDATE` triggers to every transactional table so posting happens in the database, not the client — the client can never skip it.
- Add reversal-on-delete/cancel triggers so voided documents reverse their entries instead of leaving orphans.
- Add a `GL Health` panel listing any document without a balanced entry, plus a one-click backfill for historical rows.

## Phase 2 — Inventory and costing engine

Goal: atomic, race-free stock and cost mutations.

- Move every stock mutation into RPCs (`rpc_inventory_receive`, `rpc_inventory_issue`, `rpc_inventory_adjust`, `rpc_inventory_transfer`) that take a row lock on the item/warehouse balance, recompute Weighted Average Cost inside the same transaction, and write the movement, the balance, and the COGS/inventory journal entry together.
- Enforce per-warehouse item isolation at the data layer so an item assigned to one warehouse never appears in another.
- Add perpetual inventory posting: every issue writes COGS at the current WAC, every receipt capitalises into the inventory account.
- Add an item card report (opening, movements, running balance, running cost) per item per warehouse.
- Replace direct client-side `stock_movements` inserts with the RPC calls throughout the app.

## Phase 3 — Unified POS component

Goal: one POS, configuration-driven, global-standard UX.

- Merge `RetailPOS` and `RestaurantPOS` into a single `UnifiedPOS` driven by a config object derived from business type (table service, kitchen display, weights/fractional quantities, service variables, courses).
- Keep both current entry points working; they render the unified component with different config.
- UX upgrades: global barcode listener with buffer/timeout detection, touch-optimised virtualized product grid, instant tax and line/invoice discounts, split payments (cash + card + credit in one sale), held/parked tickets, and an offline-ready queue layer around the existing offline engine.

## Phase 4 — Full i18n coverage

Goal: zero hardcoded strings, three languages.

- Expand the i18n layer with namespaced resource files per module rather than one flat file per language.
- Sweep every component, replacing hardcoded Arabic/English strings with translation keys (currently only 13 of 250 files use `useTranslation`).
- RTL correctness pass: logical spacing utilities, mirrored icons, numeral and currency formatting per locale, Arabic-appropriate font stack.
- Add a build-time check that fails on untranslated literal text in JSX.

Because of its breadth, this phase runs module by module: POS and invoices first, then dashboards and reports, then settings and admin.

## Phase 5 — Code hygiene

- Introduce centralized typed service modules (`services/sales`, `services/inventory`, `services/accounting`, `services/crm`) and route all Supabase calls through them with uniform error handling and toasts.
- Remove the 78 `@ts-nocheck` suppressions progressively as each module gets typed.
- Split the oversized files (`InventoryTab` 2,586 lines, `CustomerManager` 2,284, `AuditryCRM` 1,938) into focused components.
- Delete dead scratch files and duplicated helpers.

## Technical notes

- All schema work goes through additive migrations; the balance guard is installed as `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` so multi-line entries insert cleanly.
- Posting functions are `SECURITY DEFINER` with `search_path = public` and are not executable by `anon`.
- Inventory RPCs use `SELECT ... FOR UPDATE` on the balance row to serialize concurrent sales.
- Posting failures are logged to the existing `gl_posting_failures` table and never block document save; the health panel drives retries.

## Suggested order of execution

I recommend starting with Phase 1 and Phase 2 together, since costing and GL are coupled, and verifying against real data before touching POS and i18n.
