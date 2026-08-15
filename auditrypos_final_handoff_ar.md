# وثيقة التسليم النهائية — AuditryPOS

**التاريخ:** 15 أغسطس 2026

**المستودع:** [ELMERGAWY/auditrypos](https://github.com/ELMERGAWY/auditrypos)

**الفرع النشط:** `manus/marketing-security-foundation`

**آخر commit مرفوع:** `e9d1b38 — test: add regression and migration contract coverage`

## 1. خلاصة التنفيذ

تم تنفيذ الإصلاحات والتطويرات داخل المسارات الحالية للنظام، مع الحفاظ على بنية Lovable/React/Vite/Supabase، ودون إنشاء صفحات موازية أو إعادة كتابة بيانات العملاء والطلبات والفواتير والمخزون تلقائياً. التغييرات التي تتطلب قاعدة بيانات صيغت كـ migrations additive؛ لذلك يجب تطبيقها يدوياً في Lovable/Supabase SQL Editor بعد نسخة احتياطية واختبار staging.

النتيجة الحالية ليست مجرد واجهة تجميلية. أصبحت المنصة تحتوي على عزل workspace للمخزون والطلبات والفواتير، مسار POS ذرّي، outbox محاسبي قابل لإعادة المحاولة، مراقبة تشغيلية، Meta OAuth server-side، نشر وموافقات، Webhooks وCRM، مزامنة حملات وإحصاءات، متجر قابل للتخصيص، Pixel server-side، Super Admin control plane، سجل جاهزية للموديولات، وطبقة اختيارية للتقارير وفق EAS/IFRS/US GAAP.

> **تنبيه تشغيلي:** migration `20260814190000_auditrypos_full_safe_repair.sql` معلّمة في سياق المشروع بأنها منفذة. لا تعِد تشغيلها. بقية migrations المذكورة أدناه يجب تطبيقها فقط إذا أثبتت استعلامات التحقق أنها لم تُطبّق بنجاح من قبل.

## 2. سجل الإصدارات المرفوعة

| Commit | النتيجة الرئيسية |
|---|---|
| `9b73bb8` | إصلاحات العزل الآمن للمخزون والطلبات والفواتير، حد الطلبات 500، POS atomic RPC، وaccounting outbox. |
| `d312160` | طبقة المراقبة التشغيلية والإصلاحات التصحيحية الخاصة بـoutbox وreconciliation. |
| `343dfab` | مراجعة scopes المطلوبة لمسار Meta Ads وPage review. |
| `c3372c0` | worker اختياري للنشر المجدول، غير مفعّل تلقائياً. |
| `7d2c841` و`a950b2d` | إصلاح صافي الربح والتحليلات وإزالة القيم الوهمية الأساسية. |
| `5da6089` | تعيين CRM والمتابعات الآلية idempotent. |
| `d8630aa` | تخصيص المتجر وLanding Hero وأحداث Pixel server-side. |
| `1eb45a8` | Super Admin tenant health وسجل إجراءات الإدارة. |
| `4b9593f` | Module readiness، حدود الاستعلامات الحرجة، وإصلاح تكلفة طبقات المخزون. |
| `c2e4f1a` | طبقة المعايير المحاسبية الاختيارية وربط FinancialsTab بالمعيار والتقرير. |
| `e9d1b38` | اختبارات الربحية الموسعة، اختبارات عقد CRM والمعايير، وفحص عدم الانحدار. |

## 3. ترتيب تطبيق migrations يدوياً

طبّق الملفات بالترتيب التالي، مع إيقاف التنفيذ عند أول خطأ والتحقق قبل الانتقال للملف التالي. لا تُجرِ أي `DELETE` أو `TRUNCATE` يدوياً كحل لمشكلة migration.

| الترتيب | الملف | الحالة/الغرض |
|---:|---|---|
| 0 | `20260814190000_auditrypos_full_safe_repair.sql` | **منفذ حسب حالة المشروع؛ لا تعِد تشغيله.** |
| 1 | `20260814200000_global_ops_observability.sql` | طبقة المراقبة الأساسية، views الخاصة بالصحة والمطابقة، وسجل reconciliation. طبّقه فقط إن لم يكن ناجحاً. |
| 2 | `20260814210000_fix_missing_observability_components.sql` | الإصلاحية التي تضيف `process_accounting_posting_outbox` والمكوّنات المفقودة. طبّقها بعد migration المراقبة أو إذا أثبت التحقق أن الدوال ناقصة. |
| 3 | `20260815000000_marketing_oauth_secret_hardening.sql` | منع كشف OAuth secrets والتوكنات من الواجهة. |
| 4 | `20260815010000_meta_oauth_state_and_assets.sql` | state أحادي الاستخدام واكتشاف أصول Meta server-side. |
| 5 | `20260815020000_marketing_content_approval_queue.sql` | دورة draft → review → approve → publish وصلاحيات التسويق. |
| 6 | `20260815030000_marketing_social_webhooks_inbox.sql` | Webhooks وInbox وLead Ads وidempotency. |
| 7 | `20260815040000_meta_ads_campaigns_insights.sql` | الحملات، Insights، الإنفاق، وسجل المزامنة. |
| 8 | `20260815050000_marketing_spend_accounting_bridge.sql` | جسر إنفاق Meta إلى accounting outbox مستقل. |
| 9 | `20260815060000_crm_sales_automation.sql` | التعيين التلقائي والمتابعات المستحقة idempotent. |
| 10 | `20260815070000_storefront_builder_and_events.sql` | إعدادات المتجر، Landing Page، وstorefront events/Pixel server-side. |
| 11 | `20260815080000_super_admin_control_plane.sql` | tenant health، audit events، ودوال Super Admin المحمية. |
| 12 | `20260815090000_platform_module_readiness.sql` | سجل الموديولات ودالة قياس الجاهزية لكل شركة. |
| 13 | `20260815100000_accounting_standards_layer.sql` | EAS/IFRS/US GAAP، السياسات، views، وRPC التقارير. |

### التحقق من حالة migration قبل إعادة التطبيق

نفّذ الاستعلام التالي أولاً. إذا كانت object موجودة بالفعل، لا تعِد تشغيل migration عمياء؛ افحص تعريفها أو انتقل للملف التالي:

```sql
SELECT
  to_regclass('public.accounting_posting_outbox') AS core_outbox,
  to_regprocedure('public.process_accounting_posting_outbox(integer)') AS core_outbox_worker,
  to_regclass('public.v_ops_health_dashboard') AS ops_health,
  to_regclass('public.ops_reconciliation_runs') AS ops_runs,
  to_regclass('public.social_oauth_states') AS oauth_states,
  to_regclass('public.social_media_assets') AS discovered_assets,
  to_regclass('public.social_media_post_deliveries') AS publish_deliveries,
  to_regclass('public.social_webhook_events') AS webhook_events,
  to_regclass('public.social_ads_sync_runs') AS ads_sync_runs,
  to_regclass('public.marketing_accounting_outbox') AS marketing_outbox,
  to_regclass('public.super_admin_audit_events') AS super_admin_audit,
  to_regclass('public.platform_module_registry') AS module_registry,
  to_regclass('public.accounting_standard_settings') AS standards_settings;
```

## 4. ما تم إصلاحه وتطويره

### المخزون والـPOS والطلبات

تم الحفاظ على عزل المنتجات والمخازن والحركات والطلبات والفواتير حسب workspace، مع ربط التحويلات وخصم POS بـRPCs ذرية وidempotency. تم رفع تحميل الطلبات إلى 500 مع عدم تفريغ القائمة الحالية عند فشل الشبكة، وإضافة حدود للاستعلامات التابعة. تم إصلاح مسار تكلفة المخزون بحيث يقرأ `consumed_quantity` قبل تحديثه، ويرفض قيم الكمية والتكلفة غير الصالحة.

استعلامات Dashboard وAdvanced Inventory Reports أصبحت محدودة؛ فالقوائم الأساسية تستخدم حدوداً مثل 500، وعناصر الطلبات المحمّلة لمجموعة الطلبات تستخدم حد 10,000، وتحميل عنصر طلب realtime يستخدم حد 200. هذه الحدود تمنع انفجار الذاكرة، لكنها تعني أن التقارير الضخمة تحتاج pagination أو export server-side في مرحلة لاحقة.

### المحاسبة والربحية

تم تحويل صافي الربح إلى منطق signed يمنع `Math.abs()` من تحويل الخسائر أو العكس إلى أرباح، ويستبعد الطلبات الملغاة ويعامل القيم غير الصالحة كصفر. في FinancialsTab أزيلت أرقام الرسم التجريبية ومؤشر السيولة الثابت، وأصبح الرسم الشهري مبنياً على الطلبات والمصروفات المحمّلة فعلياً، وأصبح مؤشر العرض هو نسبة التحصيل، مع استخدام التقرير المحاسبي المعياري عند توفره.

أضيف outbox محاسبي قابل لإعادة المحاولة، مع reconciliation وسجل فشل بدلاً من إسقاط القيود بصمت. يظل تشغيل worker والترحيل الإنتاجي مسؤولية عملية يجب اختبارها بعد تطبيق migrations.

### التسويق وMeta

تم تنفيذ OAuth server-side بحيث لا يرى الموظف `client_secret` أو access token. الموظف يحصل على صلاحيات AuditryPOS فقط، وتُستخدم الأصول المكتشفة لاختيار Page وInstagram Professional وAd Account. تم تنفيذ دورة موافقات المنشورات، النشر الفعلي، worker اختياري للنشر المجدول، Webhooks للرسائل والتعليقات وLead Ads، Inbox للـCRM، مزامنة الحملات وInsights والإنفاق، وجسر الإنفاق إلى المحاسبة.

المتاح الآمن حالياً في الإعلانات هو اكتشاف الحملات، مزامنة Insights والإنفاق، وتشغيل أو إيقاف الحملة عند امتلاك الصلاحية. إنشاء Campaign/Ad Set/Ad/Creative وتعديل الميزانيات لم يُفعّل تلقائياً، لأن ذلك يحتاج حدود إنفاق وسياسة اعتماد وMeta App Review منفصلاً.

### CRM

تمت إضافة تعيين تلقائي round-robin/skill-first، تسجيل activity، follow-ups مستحقة، ومفتاح automation idempotent يمنع تكرار المتابعة نفسها. اختبار CRM الحالي هو migration contract test يثبت حدود التشغيل، `ON CONFLICT (automation_key) DO NOTHING`، وحدود الصلاحيات وعدم لمس الطلبات أو العملاء. يلزم اختبار runtime على staging بمستخدم مدير ومستخدم موظف قبل الإنتاج.

### المتجر والـLanding Page والـPixel

تمت إضافة إعدادات storefront آمنة server-side تشمل theme، Hero، CTA، الألوان، SEO metadata، وإظهار البحث والتصنيفات، مع RPC يتحقق من الصلاحيات ويعيد config آمن. تم تسجيل أحداث `PageView`, `ViewContent`, `Search`, `AddToCart`, `InitiateCheckout`, و`Purchase` في `storefront_events` مع idempotency على `event_id`. لا تسمح الطبقة الحالية بحقن raw scripts عشوائية من المتجر العام.

### Super Admin والجاهزية

أضيفت داخل overview الحالية، دون صفحة جديدة، لوحة تعرض صحة الشركات، عدد الطلبات خلال 24 ساعة، المبيعات، الموظفين النشطين، الحالة التشغيلية، وسجل إجراءات Super Admin. أضيفت ModuleReadinessPanel يعرض نسبة جاهزية POS والطلبات والمخزون والعملاء والمحاسبة وCRM والمتجر والتسويق والموظفين والرواتب والتشغيل.

## 5. طبقة المعايير المحاسبية الاختيارية

أضيف جدول `accounting_standard_settings` على مستوى `company_id`، وليس على مستوى موظف أو متصفح. القيم المدعومة هي `EAS`, `IFRS`, و`US_GAAP`. تدعم الإعدادات طريقة تكلفة المخزون، سياسة خفض القيمة، بداية السنة المالية، وتاريخ النفاذ. يمنع RPC اختيار LIFO خارج US GAAP.

أضيفت views وRPC `get_financial_report_by_standard(p_company_id, p_standard, p_period)` لإرجاع:

| المخرج | المحتوى |
|---|---|
| `income_statement` | الإيرادات، تكلفة المبيعات عند وجود حسابات COGS معروفة، المصروفات، وصافي الدخل. |
| `balance_sheet` | الأصول، الالتزامات، حقوق الملكية، وفحص التوازن. |
| `cash_flow` | التدفقات الداخلة والخارجة من حسابات النقدية والبنوك وحركة النقد الصافية. |
| `trial_balance` | إجمالي المدين والدائن وحالة التوازن. |
| `account_balances` | أرصدة الحسابات حتى 500 حساب في الطلب الواحد. |
| `policy` | طريقة التكلفة، سياسة NRV، السماح بـLIFO، والتنبيه بأن المراجعة القانونية لازمة. |

هذه الطبقة **تغير أساس العرض والسياسة المستقبلية ولا تعيد كتابة القيود التاريخية**. كما أن اختيار EAS لا يساوي تلقائياً اعتماداً قانونياً أو ضريبياً؛ يجب أن يراجعه المحاسب/المراجع المصري. صفحة IFRS Foundation الرسمية توضح أن IAS 2 يقيس المخزون بالأقل من التكلفة وصافي القيمة القابلة للتحقق، ويسمح FIFO أو المتوسط المرجح للعناصر المتبادلة.[1] أما صفحة FRA المصرية فكانت محجوبة في جلسة التحقق، لذلك لم يتم تقديم ادعاء قانوني تفصيلي عن EAS.[2]

## 6. إعداد Meta Developer بالتسلسل العملي

أنشئ أو استخدم Meta Business Portfolio وMeta Developer App مخصصاً للعميل. فعّل المنتجات التي يحتاجها المسار الفعلي فقط، مثل Facebook Login/Graph API وInstagram Graph API وWebhooks وMarketing API عند الحاجة إلى Ads. أضف redirect origin الخاص بالنظام إلى `OAUTH_ALLOWED_REDIRECT_ORIGINS`، وتأكد من أن redirect URI في التطبيق يطابق callback الخاص بـ`social-oauth` حرفياً.

احفظ App ID وApp Secret في إعداد OAuth server-side فقط. لا تضعهما في `.env` الخاص بالواجهة أو في GitHub. بعد تفعيل التطبيق، اطلب scopes المناسبة مثل Page discovery/management وInstagram basic/content publishing وBusiness/Ads/Lead Ads وفق الوظيفة المطلوبة وحالة التطبيق؛ Meta قد تتطلب App Review قبل استخدام بعض الصلاحيات أو الحسابات الإنتاجية. إذا كان App Secret قد استُخدم قبل الإصلاح، يجب تدويره من Meta ثم تحديث القيمة الجديدة server-side.

يشترط لمسار Instagram أن يكون الحساب Professional ومربوطاً بصفحة Facebook، وأن يكون رابط الوسائط عاماً وقابلاً للوصول من Meta عند النشر. بعد OAuth، يجب أن تظهر شاشة asset discovery داخل النظام؛ اختبر اختيار Page ثم Instagram ثم Ad Account كل واحد على حدة.

المتغيرات الأساسية:

| Secret/setting | المكان | الملاحظات |
|---|---|---|
| `META_GRAPH_VERSION` | Supabase Edge Functions secrets | القيمة الافتراضية الحالية `v26.0`، ويمكن تثبيتها بما يتوافق مع التطبيق. |
| `OAUTH_ALLOWED_REDIRECT_ORIGINS` | Supabase secrets | origins مفصولة بفواصل. |
| `META_WEBHOOK_VERIFY_TOKEN` | Supabase secrets أو server-side config | لا يُرسل للواجهة. |
| `SOCIAL_PUBLISH_WORKER_SECRET` | Supabase secrets | لا يُرسل للمتصفح؛ يستخدم فقط لتشغيل worker. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase managed secret | لا تضعه في الواجهة أو GitHub. |

## 7. اختبار Webhooks والـCRM بعد تطبيق migrations

استخدم endpoint HTTPS المنشور:

```text
/functions/v1/crm-social-webhooks?platform=meta&restaurant_id=<RESTAURANT_ID>
```

ضع Verify Token نفسه server-side وفي إعداد Meta، ثم نفّذ Meta webhook handshake. بعد نجاحه، اشترك Page في الأحداث التي يحتاجها التطبيق من خلال إعدادات Webhooks، مثل leadgen، feed/comments، وmessages وفق الصلاحيات التي قبلها Meta.

اختبر بالترتيب التالي على staging: تعليق تجريبي على Page، رسالة تجريبية، Lead Ad تجريبي، وإعادة إرسال نفس webhook payload مرة ثانية. يجب أن ترى event واحداً منطقياً لكل `external_message_id` أو `external_lead_id`، وأن يظهر الحدث في Inbox/CRM دون إنشاء سجل مكرر. تحقق من النتائج:

```sql
SELECT id, platform, event_type, external_event_id, status, received_at
FROM public.social_webhook_events
WHERE restaurant_id = '<RESTAURANT_ID>'
ORDER BY received_at DESC
LIMIT 50;

SELECT id, external_lead_id, lead_status, created_at
FROM public.crm_leads
WHERE restaurant_id = '<RESTAURANT_ID>'
ORDER BY created_at DESC
LIMIT 50;

SELECT id, external_message_id, message_type, created_at
FROM public.crm_social_messages
WHERE restaurant_id = '<RESTAURANT_ID>'
ORDER BY created_at DESC
LIMIT 50;
```

إذا ظهر webhook في Meta لكنه لم يصل للنظام، افحص HTTPS endpoint، Verify Token، توقيع `x-hub-signature-256`، صلاحية Page access، وربط `restaurant_id`. لا تعتبر وصول HTTP 200 وحده دليلاً على نجاح المعالجة؛ راجع حالة السجل و`last_error`.

## 8. استعلامات التحقق بعد التطبيق

### التحقق من العزل والمطابقة

```sql
SELECT restaurant_id,
       COUNT(*) AS workspaces,
       COUNT(*) FILTER (WHERE is_default) AS default_workspaces
FROM public.workspaces
GROUP BY restaurant_id
ORDER BY restaurant_id;

SELECT 'warehouses' AS source, COUNT(*) AS missing_scope FROM public.warehouses WHERE workspace_id IS NULL
UNION ALL SELECT 'products', COUNT(*) FROM public.products WHERE workspace_id IS NULL
UNION ALL SELECT 'menu_items', COUNT(*) FROM public.menu_items WHERE workspace_id IS NULL
UNION ALL SELECT 'orders', COUNT(*) FROM public.orders WHERE workspace_id IS NULL
UNION ALL SELECT 'sales_invoices', COUNT(*) FROM public.sales_invoices WHERE workspace_id IS NULL
UNION ALL SELECT 'warehouse_stock', COUNT(*) FROM public.warehouse_stock WHERE workspace_id IS NULL;

SELECT reconciliation_state, COUNT(*) AS rows_count
FROM public.v_stock_scope_reconciliation
GROUP BY reconciliation_state
ORDER BY reconciliation_state;
```

### التحقق من outbox والصحة التشغيلية

```sql
SELECT workspace_id, status, COUNT(*) AS rows_count,
       MIN(created_at) AS oldest_created_at,
       MAX(last_error) AS latest_error
FROM public.accounting_posting_outbox
GROUP BY workspace_id, status
ORDER BY workspace_id, status;

SELECT workspace_id, status, COUNT(*) AS rows_count,
       MIN(created_at) AS oldest_created_at,
       MAX(error_message) AS latest_error
FROM public.gl_posting_failures
GROUP BY workspace_id, status;

SELECT id, restaurant_id, workspace_id, run_type, status,
       summary, started_at, completed_at, error_message
FROM public.ops_reconciliation_runs
ORDER BY started_at DESC
LIMIT 50;
```

### التحقق من Super Admin والجاهزية والمعايير

نفّذ هذه RPCs من جلسة Super Admin أو من SQL Editor بصلاحية مناسبة:

```sql
SELECT * FROM public.get_super_admin_tenant_health(200);
SELECT * FROM public.get_super_admin_audit_events(100);
SELECT * FROM public.get_platform_module_readiness(100);
```

ولشركة محددة:

```sql
SELECT *
FROM public.get_accounting_standard_settings('<COMPANY_ID>');

SELECT public.get_financial_report_by_standard(
  '<COMPANY_ID>',
  'IFRS',
  jsonb_build_object(
    'start_date', '2026-01-01',
    'end_date', CURRENT_DATE
  )
);
```

## 9. نتائج الاختبارات الحالية

| الفحص | النتيجة |
|---|---|
| TypeScript `tsc --noEmit` | ناجح. |
| Vitest | **17 اختباراً ناجحاً** في 5 ملفات. |
| Vite production build | ناجح، مع تحذير chunk size/circular chunk غير مانع للتشغيل. |
| `git diff --check` | ناجح. |
| Static migration safety | ناجح: لا عمليات تدميرية في migrations الجديدة، ولا grants مباشرة لـanon. |
| Secret response scan | ناجح في المسارات التي تم فحصها؛ access tokens تستخدم server-side ولا تعاد في responses. |

تحذير الأداء الحالي من Vite يشير إلى chunks كبيرة، خصوصاً UI/XLSX، وإلى circular chunk بين vendor وUI. هذا لا يمنع الإصدار، لكنه backlog واضح لمرحلة code-splitting وlazy loading، خاصة لتبويبات Super Admin والمخزون والتقارير.

## 10. ما لم يُعتبر مكتملاً تلقائياً

لا يمكن اعتبار النظام معتمداً قانونياً وفق EAS أو IFRS أو US GAAP بمجرد اختيار selector؛ الاعتماد يحتاج chart mapping، سياسات الشركة، مراجعة محاسب، وإغلاق فترات مالية. كما لم يتم تشغيل migrations في قاعدة العميل من داخل هذه الجلسة، ولم يتم تخزين secrets الإنتاج، ولم يتم تنفيذ Meta App Review أو إنشاء حملات مدفوعة نيابة عن العميل.

ما زال هناك أكثر من ملف يستخدم `@ts-nocheck` في موديولات قديمة. تمت إزالة ذلك من `inventoryCosting.ts` وإصلاح عيب فعلي فيه، لكن إزالة جميع الاستخدامات تحتاج دفعات صغيرة لاحقة لأن بعضها يلامس مسارات تشغيل قديمة واسعة. كما أن pagination server-side للتقارير الضخمة، إنشاء إعلانات Meta الكامل، LinkedIn/TikTok، وجدولة worker الإنتاجية تبقى مراحل لاحقة اختيارية وليست مفعّلة صامتاً.

## 11. خطة الإطلاق الآمن المقترحة

ابدأ ببيئة staging وطبّق migration واحدة في كل مرة. شغّل استعلامات التحقق، ثم اختبر workspace واحداً، POS طلباً واحداً، خصم مخزون، ترحيل قيد واحد، OAuth Meta، webhook مكرر، CRM follow-up، وتقريراً معيارياً. بعد نجاح ذلك، فعّل secrets الإنتاج، ثم اختبر tenant واحداً منخفض المخاطر، ثم وسّع تدريجياً.

لا تربط scheduler للنشر قبل اختبار منشور تجريبي وحالة فشل وإعادة محاولة. لا تشغّل accounting outbox worker على كل السجلات دفعة واحدة؛ استخدم batch صغيراً، راقب `last_error`، وتأكد من idempotency. لا تُصلح أي order/invoice mismatch بتعديل تلقائي؛ استخدم views التشخيصية وراجع الحالة التجارية يدوياً.

## المراجع

[1]: https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/ "IFRS Foundation — IAS 2 Inventories"

[2]: https://fra.gov.eg/en/%D9%85%D8%B9%D8%A7%D9%8A%D9%8A%D8%B1%D8%A7%D9%84%D9%85%D8%AD%D8%A7%D8%B3%D8%A8%D8%A9%D9%88%D9%85%D8%B1%D8%A7%D9%82%D8%A8%D9%8A%D8%A7%D9%84%D8%AD%D8%B3%D8%A7%D8%A8%D8%A7%D8%AA/ "Egyptian Financial Regulatory Authority — Accounting Standards page"

[3]: https://github.com/ELMERGAWY/auditrypos "AuditryPOS repository"
