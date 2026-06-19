# تحليل شامل لنظام المحاسبة - Auditry ERP
## تاريخ المراجعة: 19 يونيو 2026

---

## 🔴 المشاكل الرئيسية المكتشفة

### 1. مشكلة رصيد العميل عند الإنشاء
**المشكلة:** عند إنشاء عميل جديد يظهر له رصيد حتى بدون معاملات، وحتى عند حذف معاملاته رصيده يظل غير مضبوط.

**الأسباب المحتملة:**
- عدم وجود دالة لإعادة حساب الرصيد من customer_transactions
- الاعتماد على عمود balance المحدث يدوياً بدلاً من الحساب الدينامي
- عدم وجود trigger عند حذف المعاملات لتحديث الرصيد

---

## 📊 بنية الجداول المحاسبية

### جدول customers
```sql
CREATE TABLE public.customers (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  customer_type TEXT DEFAULT 'retail',
  credit_limit NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,        -- ⚠️ مشكلة: يتم تحديثه يدوياً
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**المشاكل:**
- عمود balance يتم تحديثه يدوياً في كل معاملة
- لا يوجد trigger لإعادة الحساب من customer_transactions
- عند حذف المعاملات، الرصيد لا يتم تحديثه تلقائياً

---

### جدول customer_transactions
```sql
CREATE TABLE public.customer_transactions (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  restaurant_id UUID REFERENCES restaurants(id),
  type TEXT,                    -- 'payment', 'sales_return', 'invoice', etc.
  amount NUMERIC,               -- ⚠️ قد يكون موجباً أو سالباً
  description TEXT,
  payment_method TEXT,
  reference_number TEXT,
  created_at TIMESTAMPTZ
);
```

**المشاكل:**
- لا يوجد trigger لتحديث customer.balance عند إضافة/حذف/تعديل transaction
- amount يمكن أن يكون موجباً أو سالباً بدون قواعد واضحة
- لا يوجد ربط واضح مع journal_entries

---

## 💳 سندات القبض (Receipt Vouchers)

### دالة save_receipt_voucher
```sql
CREATE OR REPLACE FUNCTION public.save_receipt_voucher(
  p_restaurant_id UUID,
  p_customer_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_voucher_date DATE,
  p_notes TEXT,
  p_account_id UUID,
  p_counter_account_id UUID,
  p_voucher_id UUID
)
```

**التدفق الحالي:**
1. التحقق من المبلغ > 0
2. تحديد حساب النقد/البنك (debit side)
3. تحديد حساب الذمم المدينة (credit side)
4. إذا تعديل: إضافة المبلغ القديم للرصيد
5. تحديث/إنشاء receipt_voucher
6. إضافة customer_transaction بـ amount = -p_amount
7. تحديث customer.balance = balance - p_amount
8. إنشاء journal entry

**المشاكل:**
- عند التعديل، يتم إضافة المبلغ القديم ثم طرح الجديد - قد يسبب مشاكل
- لا يوجد rollback إذا فشلت journal entry
- customer_transaction يتم إنشاؤها فقط في حالة الإضافة، ليس التعديل

---

## 💸 سندات الدفع (Payment Vouchers)

### دالة save_payment_voucher
```sql
CREATE OR REPLACE FUNCTION public.save_payment_voucher(
  p_restaurant_id UUID,
  p_supplier_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_voucher_date DATE,
  p_reference_number TEXT,
  p_notes TEXT,
  p_account_id UUID,
  p_counter_account_id UUID,
  p_voucher_id UUID
)
```

**التدفق الحالي:**
1. التحقق من المبلغ > 0
2. تحديد حساب النقد/البنك (credit side)
3. تحديد حساب الدائنين (debit side)
4. إذا تعديل: إضافة المبلغ القديم للرصيد
5. تحديث/إنشاء payment_voucher
6. إضافة supplier_transaction بـ amount = p_amount
7. تحديث supplier.balance = balance - p_amount
8. إنشاء journal entry

**المشاكل:**
- نفس مشاكل receipt_voucher
- لا يوجد ربط واضح مع المخزون (للمشتريات)

---

## 🔄 مردودات المبيعات (Sales Returns)

### دالة create_sales_return_journal_entry
```sql
CREATE OR REPLACE FUNCTION public.create_sales_return_journal_entry()
RETURNS TRIGGER
```

**التدفق الحالي:**
1. التحقق من status = 'approved' أو 'completed'
2. التحقق من عدم وجود journal_entry_id بالفعل
3. حساب total_amount من sales_return_items
4. تحديث المخزون (إضافة الكميات المرتجعة)
5. إنشاء journal entry:
   - DR: Sales Returns Account
   - CR: Accounts Receivable (أو Cash)
   - DR: Inventory (بتكلفة)
   - CR: COGS (بتكلفة)
6. تحديث customer.balance = balance - total_amount
7. إضافة customer_transaction

**المشاكل:**
- تحديث المخزون في BEGIN...EXCEPTION block - قد يفشل بصمت
- تحديث customer.balance في BEGIN...EXCEPTION block - قد يفشل بصمت
- لا يوجد rollback إذا فشل أي جزء
- لا يوجد trigger عند حذف sales_return لتراجع التأثيرات

---

## 📦 المخزون (Inventory)

### نظام التكلفة
- FIFO (First In, First Out)
- WAC (Weighted Average Cost)
- Standard Cost

### المشاكل:
- لا يوجد ربط واضح بين حركات المخزون والقيود المحاسبية
- عند مرتجعات المشتريات، لا يتم تحديث تكلفة المخزون بشكل صحيح
- لا يوجد trigger لإنشاء journal entries تلقائياً لحركات المخزون

---

## 📒 القيود المحاسبية (Journal Entries)

### جدول journal_entries
```sql
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  entry_number VARCHAR(50),
  entry_date DATE,
  reference_type TEXT,      -- 'receipt_voucher', 'payment_voucher', 'sales_return', etc.
  reference_id UUID,
  description TEXT,
  source TEXT,              -- 'manual', 'system', 'pos'
  total_debit NUMERIC,
  total_credit NUMERIC,
  is_posted BOOLEAN,
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ
);
```

### جدول journal_entry_lines
```sql
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY,
  entry_id UUID REFERENCES journal_entries(id),
  account_id UUID REFERENCES chart_of_accounts(id),
  debit NUMERIC,
  credit NUMERIC,
  description TEXT,
  line_order INTEGER
);
```

**المشاكل:**
- لا يوجد trigger للتحقق من التوازن (debit = credit)
- لا يوجد trigger لتحديث current_balance في chart_of_accounts
- لا يوجد trigger عند حذف journal_entry لتراجع التأثيرات
- لا يوجد ربط واضح مع customer/supplier balances

---

## 🏦 دليل الحسابات (Chart of Accounts)

### جدول chart_of_accounts
```sql
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  code VARCHAR(20),
  name VARCHAR(200),
  account_type VARCHAR(20),   -- 'asset', 'liability', 'equity', 'revenue', 'expense'
  parent_id UUID REFERENCES chart_of_accounts(id),
  is_bank_account BOOLEAN,
  is_cash_account BOOLEAN,
  opening_balance NUMERIC,
  current_balance NUMERIC,     -- ⚠️ مشكلة: يتم تحديثه يدوياً
  notes TEXT,
  created_at TIMESTAMPTZ
);
```

**المشاكل:**
- current_balance يتم تحديثه يدوياً
- لا يوجد trigger لإعادة الحساب من journal_entry_lines
- لا يوجد trigger عند حذف journal_entry_lines

---

## 🔧 الحلول المقترحة

### 1. إصلاح رصيد العميل

#### الحل A: استخدام دالة حساب دينامي
```sql
CREATE OR REPLACE FUNCTION public.get_customer_balance(p_customer_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT COALESCE(SUM(CASE 
      WHEN type IN ('invoice', 'sale') THEN amount
      WHEN type IN ('payment', 'sales_return') THEN -amount
      ELSE 0
    END), 0)
    FROM public.customer_transactions
    WHERE customer_id = p_customer_id),
    0
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

#### الحل B: إضافة triggers
```sql
-- Trigger عند إضافة transaction
CREATE TRIGGER trg_customer_transaction_insert
AFTER INSERT ON public.customer_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_balance_from_transaction();

-- Trigger عند حذف transaction
CREATE TRIGGER trg_customer_transaction_delete
AFTER DELETE ON public.customer_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_balance_from_transaction();

-- Trigger عند تعديل transaction
CREATE TRIGGER trg_customer_transaction_update
AFTER UPDATE ON public.customer_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_balance_from_transaction();
```

### 2. إصلاح سندات القبض/الدفع

#### الحل: استخدام transaction واحدة
```sql
CREATE OR REPLACE FUNCTION public.save_receipt_voucher(...)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- استخدام transaction واحدة مع rollback
  BEGIN
    -- 1. إنشاء/تحديث voucher
    -- 2. إنشاء/تحديث journal entry
    -- 3. تحديث customer balance
    -- 4. إضافة customer transaction
    -- إذا فشل أي شيء، rollback كل شيء
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
```

### 3. إصلاح مردودات المبيعات

#### الحل: إزالة EXCEPTION blocks
```sql
-- بدلاً من BEGIN...EXCEPTION WHEN OTHERS THEN RAISE NOTICE
-- استخدام proper error handling مع rollback
```

### 4. إصلاح القيود المحاسبية

#### الحل: إضافة triggers للتحقق من التوازن
```sql
CREATE OR REPLACE FUNCTION public.check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit NUMERIC;
  v_total_credit NUMERIC;
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM public.journal_entry_lines
  WHERE entry_id = NEW.id;
  
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry not balanced: Debit=%, Credit=%', 
      v_total_debit, v_total_credit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5. إصلاح دليل الحسابات

#### الحل: إضافة trigger لتحديث current_balance
```sql
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- حساب الرصيد من journal_entry_lines
  SELECT COALESCE(SUM(debit) - SUM(credit), 0)
  INTO v_balance
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON jel.entry_id = je.id
  WHERE jel.account_id = NEW.id AND je.is_posted = true;
  
  -- تحديث current_balance
  UPDATE public.chart_of_accounts
  SET current_balance = v_balance + opening_balance
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📋 خطة التنفيذ الموصى بها

### المرحلة 1: إصلاح أساسي (عاجل)
1. ✅ إضافة دالة get_customer_balance() للحساب الدينامي
2. ✅ إضافة triggers لتحديث customer.balance
3. ✅ إصلاح save_receipt_voucher لاستخدام transaction واحدة
4. ✅ إصلاح save_payment_voucher لاستخدام transaction واحدة
5. ✅ إزالة EXCEPTION blocks من sales_returns

### المرحلة 2: تحسين القيود المحاسبية
1. ✅ إضافة trigger للتحقق من توازن journal entries
2. ✅ إضافة trigger لتحديث current_balance في chart_of_accounts
3. ✅ إضافة triggers عند حذف journal entries لتراجع التأثيرات
4. ✅ ربط journal entries مع customer/supplier balances

### المرحلة 3: تحسين المخزون
1. ✅ إضافة journal entries تلقائية لحركات المخزون
2. ✅ إصلاح تكلفة المخزون في مرتجعات المشتريات
3. ✅ ربط حركات المخزون مع COGS

### المرحلة 4: التقارير والكشوفات
1. ✅ إنشاء دالة get_customer_statement() لكشف الحساب
2. ✅ إنشاء دالة get_supplier_statement() لكشف المورد
3. ✅ تحسين التقارير المالية لاستخدام البيانات المحسوبة ديناميكياً

---

## ⚠️ تحذيرات هامة

1. **لا تقم بحذف المعاملات مباشرة** - يجب استخدام دوال مخصصة للتراجع
2. **لا تقم بتعديل customer.balance يدوياً** - يجب استخدام دوال محسوبة
3. **يجب اختبار كل تغيير على بيئة staging أولاً**
4. **يجب عمل backup قبل تطبيق أي إصلاحات**

---

## 📞 ملاحظات للمستخدم

هذا التحليل يعتمد على مراجعة الـ migrations والوظائف الحالية. لتشخيص دقيق للمشكلة، أحتاج إلى:

1. **بيانات فعلية من قاعدة البيانات:**
   - SELECT * FROM customers WHERE balance != 0 LIMIT 10;
   - SELECT * FROM customer_transactions WHERE customer_id = '...' ORDER BY created_at;
   - SELECT * FROM journal_entries WHERE reference_type = 'receipt_voucher' LIMIT 10;

2. **سجلات الأخطاء:**
   - تحقق من console logs في المتصفح
   - تحقق من Supabase logs

3. **خطوات التكرار:**
   - كيف تقوم بإنشاء عميل جديد؟
   - كيف تقوم بحذف المعاملات؟
   - ما هي النتائج المتوقعة مقابل النتائج الفعلية؟
