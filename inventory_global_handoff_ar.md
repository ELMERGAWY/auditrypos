# تسليم تطوير موديول المخزون — AuditryPOS

## الحالة الحالية

تم تطوير موديول المخزون داخل المسارات الحالية دون إنشاء صفحة إدارة موازية، مع الحفاظ على البيانات التاريخية وعدم تنفيذ حذف شامل أو إعادة كتابة أرصدة العملاء والمعاملات. آخر فرع مرفوع هو `manus/marketing-security-foundation`، وآخر commit وقت إعداد الوثيقة هو `dabcbe7`.

> **مهم:** رفع الملفات إلى GitHub لا يطبق migrations على Supabase. يجب تطبيق كل migration يدوياً في Lovable SQL Editor بعد فحصها، وبالترتيب الموضح أدناه.

## ما تم إصلاحه

أصبحت أرصدة المخازن تُقرأ وتُحفظ في نطاق `restaurant_id` و`workspace_id` و`warehouse_id` بدلاً من تجميع أرصدة الفروع. شاشة تعديل الصنف لم تعد تحذف أو تدمج أرصدة المخازن الأخرى، وتعرض الآن توزيع الرصيد حسب المخزن. كما أصبح التحويل متاحاً من أي مخزن فعال إلى أي مخزن آخر داخل نفس الفرع، مع بحث سريع للصنف ومنع إرسال صنف أو كمية قديمة عند تغيير المخزن المصدر.

تم توحيد استلام فاتورة الشراء وعكسها في RPC ذري، بحيث لا يُسجل استلام جزئي بصمت ولا يتم حذف سجل الاستلام عند الإلغاء. ويُنشئ الاستلام طبقة تكلفة وحركة مخزنية وoutbox محاسبياً مع idempotency. ويدعم محرك الصرف المتوسط المرجح وFIFO وLIFO، مع السماح بـLIFO فقط عندما يكون معيار الشركة `US_GAAP`.

تم ربط خصم POS بمحرك التكلفة الجديد، مع فحص idempotency مقابل كل من دفتر الحركات الحديث والمسار القديم. وأضيفت صلاحيات granular للمخازن وحماية server-side للحركات والتحويلات. كما أضيفت لوحة مطابقة read-only داخل تقرير المخازن تعرض فروق الكمية والقيمة بين `warehouse_stock` و`inventory_balances` دون تسوية تلقائية.

## ترتيب migrations الجديدة

| الترتيب | الملف | الغرض |
|---:|---|---|
| 1 | `20260815110000_inventory_scope_and_transfer_safety.sql` | فصل نطاق المخزون، ربط الصنف بالمخزن، عكس التحويلات بأمان، وإصلاح أنواع الحركات القديمة. |
| 2 | `20260815120000_purchase_receipt_costing_bridge.sql` | استلام وعكس فواتير الشراء، طبقات التكلفة، رصيد المخزون، وoutbox محاسبي. |
| 3 | `20260815130000_inventory_costing_engine_v2.sql` | محرك الصرف الذري حسب المتوسط/FIFO/LIFO. |
| 4 | `20260815140000_pos_inventory_costing_bridge.sql` | توحيد خصم POS مع محرك التكلفة الجديد. |
| 5 | `20260815150000_inventory_permissions_guard.sql` | صلاحيات المخازن وحماية الحركات والتحويلات server-side. |
| 6 | `20260815160000_inventory_reconciliation_controls.sql` | RPC مطابقة read-only وتقارير الفروق. |

## قاعدة التحقق قبل التنفيذ

لا تنفذ ملفاً سبق أن ظهرت جميع كائناته في نتيجة التحقق. إذا كان بعض الكائنات موجوداً وبعضها ناقصاً، لا تعِد تشغيل الملف كاملاً؛ احتفظ بالنتيجة واطلب corrective migration additive.

### الملف الأول

```sql
SELECT
  to_regclass('public.product_warehouse_assignments') AS assignments,
  to_regprocedure('public.get_product_warehouse_stock(uuid,uuid)') AS get_stock,
  to_regprocedure('public.upsert_product_warehouse_stock(uuid,uuid,uuid,uuid,numeric,numeric)') AS upsert_stock,
  to_regprocedure('public.execute_inventory_transfer_v2(uuid,uuid,uuid,uuid,uuid,numeric,text,text)') AS transfer_v2,
  to_regprocedure('public.void_inventory_transfer_v2(uuid,uuid,uuid,text)') AS void_transfer;
```

### الملف الثاني

```sql
SELECT
  to_regprocedure('public.post_purchase_invoice_receipt_v2(uuid,uuid,uuid)') AS post_receipt,
  to_regprocedure('public.void_purchase_invoice_receipt_v2(uuid,uuid,uuid,text)') AS void_receipt;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('purchase_invoices','inventory_receipts')
  AND column_name = 'workspace_id'
ORDER BY table_name;
```

### الملف الثالث

```sql
SELECT to_regprocedure(
  'public.rpc_inventory_issue_v2(uuid,uuid,numeric,text,text,text,uuid,text,boolean,numeric)'
) AS costing_issue_v2;
```

### الملف الرابع

```sql
SELECT to_regprocedure(
  'public.consume_pos_inventory_v2(uuid,uuid,uuid,uuid,jsonb)'
) AS pos_costing_bridge;
```

### الملف الخامس

```sql
SELECT
  to_regprocedure('public.warehouse_permission_granted(uuid,text)') AS warehouse_permission,
  to_regprocedure('public.tg_enforce_inventory_movement_permission()') AS movement_guard,
  to_regprocedure('public.tg_enforce_inventory_transfer_permission()') AS transfer_guard;

SELECT code
FROM public.permissions
WHERE code LIKE 'inventory.%'
ORDER BY code;
```

### الملف السادس

```sql
SELECT to_regprocedure(
  'public.get_inventory_reconciliation(uuid,uuid,boolean,integer)'
) AS reconciliation_rpc;
```

## تحقق شامل بعد التطبيق

```sql
SELECT
  to_regprocedure('public.get_product_warehouse_stock(uuid,uuid)') AS scoped_stock,
  to_regprocedure('public.post_purchase_invoice_receipt_v2(uuid,uuid,uuid)') AS purchase_receipt,
  to_regprocedure('public.void_purchase_invoice_receipt_v2(uuid,uuid,uuid,text)') AS purchase_void,
  to_regprocedure('public.rpc_inventory_issue_v2(uuid,uuid,numeric,text,text,text,uuid,text,boolean,numeric)') AS costing_issue,
  to_regprocedure('public.consume_pos_inventory_v2(uuid,uuid,uuid,uuid,jsonb)') AS pos_bridge,
  to_regprocedure('public.warehouse_permission_granted(uuid,text)') AS warehouse_permissions,
  to_regprocedure('public.get_inventory_reconciliation(uuid,uuid,boolean,integer)') AS reconciliation;
```

## الاختبار التشغيلي الآمن

استخدم شركة و`workspace_id` ومخزنين تجريبيين داخل نفس الشركة. أنشئ صنفاً واحداً، اربطه بالمخزن الأول، ثم أنشئ رصيداً أولياً من خلال واجهة المخزون. تحقق من أن شاشة المخزن الثاني لا تعرض الصنف أو رصيده. بعد ذلك أنشئ تحويلًا من الأول إلى الثاني، وتحقق من نقص المصدر وزيادة الهدف وظهور سجلين للحركة وoutbox واحد للتحويل. أعد فتح التحويل نفسه أو أعد إرسال نفس idempotency key للتأكد من عدم تكرار الرصيد.

أنشئ فاتورة شراء للصنف، ثم نفذ الاستلام مرة واحدة. تحقق من وجود `inventory_receipts` و`inventory_receipt_items` و`inventory_cost_layers` و`inventory_movements` وoutbox محاسبي. أعد محاولة الاستلام ولاحظ أن RPC يرجع `replayed` ولا يضيف كمية ثانية. بعد ذلك ألغ الفاتورة المستلمة وتحقق من إنشاء عكس دون حذف سجل الاستلام أو الحركة الأصلية.

أجرِ عمليتي شراء بسعرين مختلفين ثم بيع كمية جزئية. عند اختيار `AVERAGE` يجب أن يخرج COGS من المتوسط المرجح. عند `FIFO` يجب استهلاك الطبقة الأقدم أولاً. عند `LIFO` يجب أن يرفض النظام المعيار `IFRS` أو `EAS` ويقبل `US_GAAP` فقط. لا تعتمد على `products.cost_price` إلا كـfallback معلن عند غياب طبقات التكلفة، ولا تعتبره قيمة المخزون الرئيسية.

## ملاحظات rollout

لا تُجرِ تسوية تلقائية للفروق التي تظهر في لوحة المطابقة. الفروق التاريخية قد تكون نتيجة اختلاف النموذج القديم أو أرصدة أنشئت قبل فصل `workspace_id`. يجب اعتماد أي تسوية جرد من المدير المالي، ثم تسجيلها كحركة adjustment موثقة.

طبّق migrations في بيئة اختبار أو خارج ساعات الذروة، وراقب `accounting_posting_outbox` و`inventory_movements` بعد التطبيق. إذا ظهرت رسالة `policy already exists` أو `relation already exists`، أوقف إعادة التشغيل وشغّل كود التحقق الخاص بالملف أولاً. لا تستخدم `DROP POLICY` أو `DELETE` أو `TRUNCATE` كحل سريع.

## الاختبارات البرمجية

آخر فحص محلي قبل التسليم: **TypeScript ناجح، Vite build ناجح، 35 اختباراً ناجحاً**، وفحص أمني ثابت للمigrations الجديدة ناجح: لا توجد عمليات `DROP TABLE` أو `TRUNCATE` أو `DELETE FROM`، ولا منح صلاحيات مباشرة لـ`anon` أو `PUBLIC` في migrations الجديدة.

## الملفات الرئيسية

- `src/pages/dashboard/InventoryTab.tsx`
- `src/components/inventory/WarehouseManager.tsx`
- `src/components/inventory/InventoryTransfersManager.tsx`
- `src/components/inventory/ProductWarehouseBalances.tsx`
- `src/components/inventory/WarehouseReportTab.tsx`
- `src/pages/dashboard/PurchaseInvoices.tsx`
- `src/pages/dashboard/SalesInvoices.tsx`
- `src/services/inventoryService.ts`
- `supabase/migrations/20260815110000_inventory_scope_and_transfer_safety.sql`
- `supabase/migrations/20260815120000_purchase_receipt_costing_bridge.sql`
- `supabase/migrations/20260815130000_inventory_costing_engine_v2.sql`
- `supabase/migrations/20260815140000_pos_inventory_costing_bridge.sql`
- `supabase/migrations/20260815150000_inventory_permissions_guard.sql`
- `supabase/migrations/20260815160000_inventory_reconciliation_controls.sql`
