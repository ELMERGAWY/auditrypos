# تسليم مراحل تطوير موديول التسويق في AuditryPOS

## الحالة العامة

تم تنفيذ مراحل تطوير موديول التسويق تدريجياً داخل المسارات الحالية، دون إنشاء صفحات موازية ودون تعديل تلقائي للطلبات أو الفواتير أو أرصدة المخزون. جميع التغييرات مرفوعة على الفرع:

```text
manus/marketing-security-foundation
```

آخر commit هو:

```text
c3372c0 feat: add secured scheduled social publish worker
```

الفرع نظيف بعد الرفع. نجحت اختبارات Vitest بعدد 4 اختبارات، وفحص TypeScript، وVite build، وparsing لكل Edge Functions الجديدة أو المعدلة.

## ترتيب الـmigrations

طبّق الملفات التالية يدوياً في Lovable/Supabase SQL Editor، بهذا الترتيب، وبعد التأكد من نجاح كل ملف قبل الانتقال إلى الذي يليه:

| الترتيب | الملف | الوظيفة |
|---:|---|---|
| 1 | `20260815000000_marketing_oauth_secret_hardening.sql` | إغلاق قراءة وكتابة الأسرار والتوكنات من المستخدمين المصادق عليهم |
| 2 | `20260815010000_meta_oauth_state_and_assets.sql` | state أحادي الاستخدام واكتشاف أصول Meta server-side |
| 3 | `20260815020000_marketing_content_approval_queue.sql` | صلاحيات التسويق، دورة الاعتماد، وطابور تسليم المنشورات |
| 4 | `20260815030000_marketing_social_webhooks_inbox.sql` | Webhooks وLead Ads وInbox ومنع التكرار |
| 5 | `20260815040000_meta_ads_campaigns_insights.sql` | الحملات ومؤشرات Insights والإنفاق وسجل المزامنة |
| 6 | `20260815050000_marketing_spend_accounting_bridge.sql` | جسر الإنفاق إلى المحاسبة مع outbox منفصل وإعادة محاولة |

لا تعِد تشغيل migrations القديمة التي تحتوي على بيانات إعدادات العملاء. لا تستخدم `DELETE` أو `TRUNCATE`، ولا تشغّل migration جديدة أثناء وجود transaction أخرى مفتوحة.

## Edge Functions المطلوبة

انشر أو ارفع الوظائف التالية من الفرع نفسه:

```text
supabase/functions/social-oauth
supabase/functions/social-publish
supabase/functions/social-publish-worker
supabase/functions/crm-social-webhooks
supabase/functions/social-ads
```

المسارات الحالية في الواجهة تستدعي هذه الوظائف من `MarketingHub` و`SocialMediaDashboard` و`AdAnalyticsDashboard`. لا تنشئ route أو صفحة بديلة.

## إعدادات التشغيل

الإعدادات العامة المدمجة في Supabase هي `SUPABASE_URL` و`SUPABASE_ANON_KEY` و`SUPABASE_SERVICE_ROLE_KEY`. لا تضع أيّاً منها في الواجهة أو في GitHub.

| المتغير | الاستخدام |
|---|---|
| `META_GRAPH_VERSION` | إصدار Graph API، والقيمة المستخدمة افتراضياً `v26.0` |
| `OAUTH_ALLOWED_REDIRECT_ORIGINS` | origins مسموحة مفصولة بفواصل، مثل `https://your-domain.example` |
| `META_WEBHOOK_VERIFY_TOKEN` | بديل server-side لقيمة تحقق Meta إذا لم تُحفظ في `crm_platform_configs` |
| `SOCIAL_PUBLISH_WORKER_SECRET` | سر مستقل لاستدعاء worker المجدول، ولا يُرسل إلى المتصفح |

يتم حفظ `client_id` و`client_secret` في جدول إعداد OAuth server-side واستخدامهما داخل `social-oauth` فقط. بسبب وجود قيمة قديمة محتملة في migration سابقة، يجب تدوير Meta App Secret من لوحة Meta إذا كان قد استُخدم فعلياً، ثم تحديث القيمة الجديدة في إعداد server-side. لا تُرسل قيمة السر في المحادثة ولا تضعها في ملف الواجهة.

## تشغيل الربط لأول مرة

يبدأ مالك الشركة أو مدير التكاملات OAuth من تبويب الحسابات داخل مركز التسويق. بعد العودة من Meta، يتم تبادل code server-side، ثم تظهر الأصول المكتشفة للاختيار. الموظف لا يرى كلمة المرور أو `client_secret` أو access token. بعد اختيار Page أو Instagram Professional أو Ad Account يتم تخزين الربط server-side.

يجب أن يكون الحساب Instagram من النوع الاحترافي ومربوطاً بصفحة Facebook عند استخدام مسار Meta الحالي. نشر Instagram يحتاج رابط وسائط عام قابل للوصول من Meta.

## تشغيل المحتوى

دورة المنشور هي:

```text
مسودة → إرسال للمراجعة → اعتماد/رفض → طابور → نشر فعلي
```

النشر اليدوي يمر عبر `social-publish`. النشر المجدول يمر عبر `social-publish-worker`، لكنه **غير مفعّل تلقائياً**. لتفعيله بعد الاختبار، استدعِ الوظيفة بطلب POST داخلي مع header:

```text
x-social-worker-secret: <SOCIAL_PUBLISH_WORKER_SECRET>
```

وجسم بسيط:

```json
{"batchSize":25}
```

ابدأ بتشغيله يدوياً في بيئة اختبار. بعد نجاح المراجعة، يمكن ربطه بجدولة Supabase أو آلية تشغيل دورية متاحة في بيئتك. لا تُفعّل جدولة إنتاجية قبل اختبار منشور تجريبي وحالة فشل وإعادة محاولة.

## Webhooks وCRM

اضبط callback الخاص بـMeta على وظيفة:

```text
/functions/v1/crm-social-webhooks?platform=meta&restaurant_id=<RESTAURANT_ID>
```

يجب تسجيل `api_secret` و`webhook_verify_token` server-side، ثم تنفيذ handshake من Meta. الوظيفة تتحقق من `x-hub-signature-256` قبل معالجة body، وتكتب أحداثاً idempotent في `social_webhook_events`. Lead Ads تُحفظ في `crm_leads` مع `external_lead_id`، والرسائل والتعليقات في `crm_social_messages` مع `external_message_id`.

## الحملات والتحليلات

من لوحة تحليلات الإعلانات، اختر حساب Meta الإعلاني ثم نفّذ مزامنة الفترة المطلوبة. المزامنة تحفظ الحملات في `marketing_ad_campaigns` والمؤشرات اليومية في `marketing_ad_performance` وتكتب سجل التنفيذ في `social_ads_sync_runs`.

تغيير حالة الحملة إلى تشغيل أو إيقاف منفصل عن المزامنة ويتطلب صلاحية `marketing.ads.manage`. إنشاء حملة أو تعديل ميزانية أو نشر إعلان جديد لم يُفعّل تلقائياً؛ هذا مقصود لتقليل مخاطر الإنفاق قبل مراجعة صلاحيات Meta والحساب الإعلاني.

## الربط المحاسبي

مزامنة Insights لا تنشئ قيداً محاسبياً تلقائياً. من لوحة التحليلات، وبعد التأكد من عملة حساب الإعلانات، أدخل العملة وسعر الصرف ثم نفّذ:

1. **تسجيل الإنفاق** لإنشاء `marketing_ad_spend_expenses` وoutbox محاسبي مستقل.
2. **ترحيل القيود** لتشغيل `process_marketing_accounting_outbox` بعد امتلاك المستخدم صلاحية `finance.access`.

الجسر يستخدم حساب مصروف إعلانات برمز `6900` وحساب نقدية/بنوك مناسباً إن لم يكن موجوداً، ويمنع تكرار القيد عبر `accounting_entry_id` و`external_metric_key`. راجع العملة وسعر الصرف قبل الترحيل؛ لا يوجد تحويل صامت.

## استعلام تحقق شامل بعد التطبيق

```sql
SELECT
  to_regprocedure('public.process_accounting_posting_outbox(integer)') AS core_outbox_worker,
  to_regprocedure('public.process_marketing_accounting_outbox(integer)') AS marketing_accounting_worker,
  to_regclass('public.social_oauth_states') AS oauth_states,
  to_regclass('public.social_media_assets') AS discovered_assets,
  to_regclass('public.social_media_post_deliveries') AS publish_deliveries,
  to_regclass('public.social_webhook_events') AS webhook_events,
  to_regclass('public.social_ads_sync_runs') AS ads_sync_runs,
  to_regclass('public.marketing_accounting_outbox') AS marketing_outbox;
```

يجب ألا تظهر أي قيمة `NULL` باستثناء `core_outbox_worker` إذا لم تُطبّق بعد إصلاحية outbox السابقة. للتحقق من تعريف الجداول والـviews السابقة استخدم:

```sql
SELECT
  to_regclass('public.v_order_invoice_reconciliation') AS order_invoice_reconciliation,
  to_regclass('public.v_stock_scope_reconciliation') AS stock_reconciliation,
  to_regclass('public.v_ops_health_dashboard') AS ops_health,
  to_regclass('public.ops_reconciliation_runs') AS ops_runs;
```

## ما لم يُفعّل بعد

لم يتم تفعيل scheduler تلقائي، ولم يتم تخزين مفاتيح الإنتاج، ولم يتم إنشاء صلاحية Meta App أو مراجعة App Review نيابة عن العميل. LinkedIn وTikTok والمنصات الأخرى بقيت خارج النشر الإنتاجي حتى تُضبط تطبيقاتها الرسمية وOAuth الخاص بها؛ لا توجد واجهة وهمية تعلن نجاح عملية لم تنفذها المنصة.

كما أن إدارة Meta Ads الكاملة من إنشاء Campaign وAd Set وAd وCreative لم تُفعّل في هذه المرحلة. المتاح الآمن حالياً هو اكتشاف الحملات، مزامنة Insights والإنفاق، وتشغيل أو إيقاف الحملات بعد الصلاحية. تفعيل الإنشاء الكامل يحتاج سياسة اعتماد وميزانيات وحدود إنفاق واختبار Meta App Review منفصل.
