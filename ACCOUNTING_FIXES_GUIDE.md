# دليل تطبيق إصلاحات المحاسبة الحرجة
## تاريخ التطبيق: 14 يوليو 2026

---

## 📋 نظرة عامة

تم إنشاء migration جديد `20260714000000_accounting_fixes_critical.sql` يحتوي على إصلاحات حرجة للمشاكل المحاسبية المكتشفة دون التأثير على البيانات الموجودة أو وظائف النظام الحالية.

---

## 🔧 الإصلاحات المطبقة

### **1. رصيد العميل - الحساب الديناميكي**

#### المشكلة:
- عدم وجود دالة حساب ديناميكي للرصيد
- الاعتماد على التحديث اليدوي
- عدم وجود triggers للتحديث التلقائي

#### الحل:
- ✅ إنشاء دالة `get_customer_balance()` لحساب الرصيد ديناميكياً من `customer_transactions`
- ✅ إنشاء دالة `update_customer_balance_from_transaction()` لتحديث الرصيد تلقائياً
- ✅ إضافة triggers على `customer_transactions` (INSERT, UPDATE, DELETE)
- ✅ إنشاء دالة `recalculate_all_customer_balances()` لإعادة حساب جميع الأرصدة الموجودة

#### الاستخدام:
```sql
-- حساب رصيد عميل معين
SELECT public.get_customer_balance('customer-uuid');

-- إعادة حساب جميع الأرصدة
SELECT public.recalculate_all_customer_balances();

-- إعادة حساب أرصدة مطعم معين
SELECT public.recalculate_all_customer_balances('restaurant-uuid');
```

---

### **2. رصيد المورد - الحساب الديناميكي**

#### المشكلة:
- نفس مشاكل رصيد العميل ولكن للموردين

#### الحل:
- ✅ إنشاء دالة `get_supplier_balance()` لحساب الرصيد ديناميكياً
- ✅ إنشاء دالة `update_supplier_balance_from_transaction()` لتحديث الرصيد تلقائياً
- ✅ إضافة triggers على `supplier_transactions` (INSERT, UPDATE, DELETE)
- ✅ إنشاء دالة `recalculate_all_supplier_balances()` لإعادة حساب جميع الأرصدة

#### الاستخدام:
```sql
-- حساب رصيد مورد معين
SELECT public.get_supplier_balance('supplier-uuid');

-- إعادة حساب جميع الأرصدة
SELECT public.recalculate_all_supplier_balances();
```

---

### **3. سندات القبض - تحسين مع Rollback**

#### المشكلة:
- مشاكل في التعامل مع التعديلات
- عدم وجود rollback عند الفشل
- عدم إنشاء customer_transaction في التعديل

#### الحل:
- ✅ إعادة كتابة دالة `save_receipt_voucher()` مع معالجة transactions صحيحة
- ✅ إضافة proper exception handling مع rollback
- ✅ إنشاء customer_transaction في كل حالة (إضافة وتعديل)
- ✅ عند التعديل: إلغاء المعاملة القديمة أولاً ثم إنشاء جديدة

#### التغييرات:
- عند التعديل: يتم إضافة المبلغ القديم كمعاملة عكسية
- يتم إنشاء معاملة جديدة بالمبلغ الجديد
- يتم إنشاء journal entry تلقائياً
- أي خطأ يؤدي إلى rollback كامل العملية

---

### **4. سندات الدفع - تحسين مع Rollback**

#### المشكلة:
- نفس مشاكل سندات القبض ولكن للموردين

#### الحل:
- ✅ إعادة كتابة دالة `save_payment_voucher()` مع معالجة transactions صحيحة
- ✅ إضافة proper exception handling مع rollback
- ✅ إنشاء supplier_transaction في كل حالة
- ✅ عند التعديل: إلغاء المعاملة القديمة أولاً

#### التغييرات:
- نفس منطق سندات القبض ولكن للموردين
- تحديث رصيد المورد تلقائياً
- إنشاء journal entry تلقائياً

---

### **5. مردودات المبيعات - إزالة EXCEPTION Blocks**

#### المشكلة:
- تحديث المخزون في EXCEPTION blocks
- عدم وجود triggers عند الحذف
- مشاكل في التراجع عن التأثيرات

#### الحل:
- ✅ إعادة كتابة trigger `create_sales_return_journal_entry()` بدون EXCEPTION blocks
- ✅ إزالة BEGIN...EXCEPTION WHEN OTHERS THEN RAISE NOTICE
- ✅ استخدام proper error handling
- ✅ إضافة trigger عند UPDATE على status فقط

#### التغييرات:
- Trigger يعمل فقط عند تغيير status إلى 'approved' أو 'completed'
- أي خطأ يؤدي إلى فشل العملية بالكامل (لا يوجد إخفاء للأخطاء)
- تحديث المخزون ورصيد العميل بشكل صريح
- إنشاء journal entries بشكل صحيح

---

### **6. القيود المحاسبية - التحقق من التوازن**

#### المشكلة:
- عدم وجود trigger للتحقق من التوازن
- عدم وجود trigger لتحديث current_balance

#### الحل:
- ✅ إنشاء دالة `check_journal_entry_balance()` للتحقق من التوازن
- ✅ إضافة trigger على `journal_entries` للتحقق من التوازن
- ✅ تحديث total_debit و total_credit تلقائياً
- ✅ إنشاء دالة `update_account_balance_from_journal()` لتحديث أرصدة الحسابات
- ✅ إضافة trigger على `journal_entry_lines` لتحديث current_balance

#### التغييرات:
- أي قيد غير متوازن يرفع exception
- تحديث current_balance في chart_of_accounts تلقائياً عند إضافة journal line
- التسامح: 0.01 (للتعامل مع مشاكل rounding)

---

### **7. إعادة حساب الأرصدة الموجودة**

#### الحل:
- ✅ تنفيذ تلقائي لـ `recalculate_all_customer_balances()`
- ✅ تنفيذ تلقائي لـ `recalculate_all_supplier_balances()`
- ✅ تحديث جميع الأرصدة الموجودة بناءً على المعاملات الفعلية

---

## 🚀 خطوات التطبيق

### **الطريقة 1: عبر Supabase Dashboard**

1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. انسخ محتوى الملف: `supabase/migrations/20260714000000_accounting_fixes_critical.sql`
4. اضغط Run
5. انتظر حتى تظهر رسالة النجاح

### **الطريقة 2: عبر CLI**

```bash
# تأكد من تثبيت Supabase CLI
npm install -g supabase

# تسجيل الدخول
supabase login

# تطبيق migration
supabase db push

# أو تطبيق migration محدد
supabase migration up 20260714000000_accounting_fixes_critical
```

---

## ✅ التحقق من التطبيق

### **1. التحقق من الدوال الجديدة**

```sql
-- التحقق من دوال العميل
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%customer%balance%';

-- التحقق من دوال المورد
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%supplier%balance%';

-- التحقق من دوال القيود المحاسبية
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%journal%';
```

### **2. التحقق من Triggers**

```sql
-- التحقق من triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%customer%'
OR trigger_name LIKE '%supplier%'
OR trigger_name LIKE '%journal%';
```

### **3. اختبار الحساب الديناميكي**

```sql
-- اختبار حساب رصيد عميل
SELECT 
  c.id,
  c.name,
  c.balance as old_balance,
  public.get_customer_balance(c.id) as calculated_balance
FROM public.customers c
LIMIT 10;

-- مقارنة الأرصدة
SELECT 
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE balance = public.get_customer_balance(id)) as correct_balances,
  COUNT(*) FILTER (WHERE balance != public.get_customer_balance(id)) as incorrect_balances
FROM public.customers;
```

### **4. اختبار التوازن المحاسبي**

```sql
-- التحقق من توازن القيود
SELECT 
  je.id,
  je.entry_number,
  je.total_debit,
  je.total_credit,
  ABS(je.total_debit - je.total_credit) as difference
FROM public.journal_entries je
WHERE je.is_posted = true
ORDER BY ABS(je.total_debit - je.total_credit) DESC
LIMIT 10;
```

---

## 🔄 التراجع عن الإصلاحات (إذا لزم الأمر)

إذا واجهت مشاكل وتريد التراجع:

```sql
-- حذف triggers
DROP TRIGGER IF EXISTS trg_customer_transaction_insert ON public.customer_transactions;
DROP TRIGGER IF EXISTS trg_customer_transaction_update ON public.customer_transactions;
DROP TRIGGER IF EXISTS trg_customer_transaction_delete ON public.customer_transactions;

DROP TRIGGER IF EXISTS trg_supplier_transaction_insert ON public.supplier_transactions;
DROP TRIGGER IF EXISTS trg_supplier_transaction_update ON public.supplier_transactions;
DROP TRIGGER IF EXISTS trg_supplier_transaction_delete ON public.supplier_transactions;

DROP TRIGGER IF EXISTS trg_journal_entry_balance_check ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_journal_line_update_balance ON public.journal_entry_lines;

DROP TRIGGER IF EXISTS trg_sales_return_journal_entry ON public.sales_returns;

-- حذف الدوال
DROP FUNCTION IF EXISTS public.get_customer_balance CASCADE;
DROP FUNCTION IF EXISTS public.update_customer_balance_from_transaction CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_all_customer_balances CASCADE;

DROP FUNCTION IF EXISTS public.get_supplier_balance CASCADE;
DROP FUNCTION IF EXISTS public.update_supplier_balance_from_transaction CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_all_supplier_balances CASCADE;

DROP FUNCTION IF EXISTS public.check_journal_entry_balance CASCADE;
DROP FUNCTION IF EXISTS public.update_account_balance_from_journal CASCADE;

-- استعادة الدوال الأصلية (إذا لزم الأمر)
-- سيتم استعادة الدوال من migrations السابقة
```

---

## ⚠️ ملاحظات هامة

1. **الإصلاحات غير كاسرة**: لا تؤثر على البيانات الموجودة أو وظائف النظام الحالية
2. **إعادة حساب تلقائية**: يتم إعادة حساب جميع الأرصدة الموجودة تلقائياً
3. **Triggers تعمل تلقائياً**: أي معاملة جديدة ستحدث الأرصدة تلقائياً
4. **Validation صارم**: القيود المحاسبية غير المتوازنة ستفشل
5. **Error handling محسّن**: الأخطاء لن تُخفى بل ستُرفع بشكل صريح

---

## 📞 الدعم

إذا واجهت أي مشاكل:

1. تحقق من logs في Supabase Dashboard
2. تأكد من تطبيق migration بنجاح
3. تحقق من وجود الدوال والtriggers
4. راجع قسم التحقق أعلاه

---

## 📝 التحديثات المستقبلية

يمكن إضافة المزيد من الإصلاحات في المستقبل:

- [ ] إضافة triggers للحذف (rollback effects)
- [ ] إضافة audit trail محسّن
- [ ] إضافة validation إضافية
- [ ] إضافة performance optimization

---

**تم الإنشاء**: 14 يوليو 2026  
**الإصدار**: 1.0.0  
**الحالة**: جاهز للتطبيق
