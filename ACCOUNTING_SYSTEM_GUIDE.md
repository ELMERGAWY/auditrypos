
# 📊 نظام المحاسبة المزدوج - Ventro Pro

## نظرة عامة

تم بناء **نظام محاسبي احترافي** متكامل يدعم:
- ✅ الدفتر المزدوج (Double Entry)
- ✅ FIFO/LIFO/WAC للمخزون
- ✅ نظام ضرائب ذكي
- ✅ تكامل تلقائي مع نقاط البيع
- ✅ دعم جميع أنواع الأنشطة التجارية

---

## 📁 الملفات المنشأة

| الملف | الوصف |
|-------|-------|
| `src/lib/accounting/types.ts` | جميع الأنواع والinterfaces |
| `src/lib/accounting/journalService.ts` | خدمة القيود المحاسبية |
| `src/lib/accounting/inventoryCosting.ts` | نظام تكلفة المخزون FIFO |
| `src/lib/accounting/taxService.ts` | حاسبة الضرائب |
| `src/lib/accounting/checkoutIntegration.ts` | تكامل مع Checkout |
| `src/lib/accounting/index.ts` | نقطة التصدير الرئيسية |
| `supabase/migrations/20260419180000_ventro_pro_accounting_system.sql` | Migration قاعدة البيانات |

---

## 🚀 خطوات التفعيل

### 1. تشغيل Migration
```sql
-- افتح Supabase SQL Editor
-- انسخ محتوى: supabase/migrations/20260419180000_ventro_pro_accounting_system.sql
-- اضغط Run
```

### 2. إنشاء الدليل المحاسبي للمطاعم الموجودة
```sql
-- شغل هذا لكل مطعم موجود
SELECT create_default_chart_of_accounts('RESTAURANT_ID_HERE');

-- أو لجميع المطاعم دفعة واحدة
SELECT create_default_chart_of_accounts(id) FROM restaurants;
```

### 3. تحديث Supabase Types
```bash
# في Terminal
npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/integrations/supabase/types.ts
```

---

## 💻 استخدام النظام في الكود

### 1. استيراد الخدمات
```typescript
import { 
  journalService, 
  inventoryCosting, 
  taxService, 
  checkoutIntegration 
} from '@/lib/accounting';
```

### 2. إنشاء قيد محاسبي يدوياً
```typescript
// قيد مبيعات
const entry = await journalService.createSaleJournalEntry(
  restaurantId,
  order,
  'restaurant', // نوع النشاط
  cogs,         // تكلفة البضاعة
  taxAmount     // مبلغ الضريبة
);
```

### 3. حساب الضرائب
```typescript
const taxCalc = await taxService.calculateOrderTaxes(
  restaurantId,
  [
    { product_id: '123', price: 100, quantity: 2, category: 'food' },
    { product_id: '456', price: 50, quantity: 1, category: 'beverage' }
  ],
  { isDelivery: true, deliveryFee: 20 }
);

console.log(taxCalc.taxAmount);    // مجموع الضريبة
console.log(taxCalc.total);        // الإجمالي مع الضريبة
console.log(taxCalc.taxLines);     // تفصيل الضرائب
```

### 4. حساب COGS بـ FIFO
```typescript
const { totalCOGS, itemsWithCost } = await inventoryCosting.calculateOrderCOGS(
  cartItems,
  restaurantId
);

// itemsWithCost تحتوي على unitCost لكل صنف
itemsWithCost.forEach(item => {
  console.log(`${item.name}: ${item.cogs} ((${item.unitCost} per unit)`);
});
```

### 5. Checkout متكامل (الطريقة الجديدة)
```typescript
const result = await checkoutIntegration.processCheckout(
  {
    restaurantId: restaurant.id,
    businessType: 'restaurant',
    currency: 'EGP',
    isOnline: true,
    userId: user.id
  },
  {
    cart,
    customerName: 'Ahmed',
    orderType: 'dine_in',
    paymentMethod: 'cash',
    // ... باقي البيانات
  }
);

if (result.success) {
  console.log('Order:', result.order.order_number);
  console.log('Journal:', result.journalEntryId);
  console.log('COGS:', result.cogs);
  console.log('Tax:', result.taxAmount);
}
```

---

## 📊 الهيكل المحاسبي

### دليل الحسابات (Chart of Accounts)

| الكود | الاسم | النوع | الاستخدام |
|-------|-------|-------|-----------|
| 1100 | الصندوق | Asset | النقدية |
| 1200 | العملاء | Asset | الذمم المدينة |
| 1300 | المخزون | Asset | بضاعة آخر المدة |
| 1400 | البنوك | Asset | حسابات بنكية |
| 2100 | الموردين | Liability | الذمم الدائنة |
| 2150 | الضرائب المستحقة | Liability | VAT مستحق |
| 4100 | المبيعات | Revenue | إيرادات المبيعات |
| 4200 | إيرادات الخدمات | Revenue | للخدمات |
| 4300 | إيرادات التوصيل | Revenue | رسوم التوصيل |
| 5100 | تكلفة البضاعة | COGS | COGS |
| 6100 | المرتبات | Expense | رواتب |
| 6200 | الإيجار | Expense | إيجارات |

---

## 🏪 اختلافات الأنشطة التجارية

### مطعم (Restaurant)
```typescript
// قيد مبيعات مطعم:
// Dr: Cash (1100)          100
// Dr: AR (1200)             50  (إذا فيه باقي)
// Cr: Sales (4100)         140
// Cr: Tax Payable (2150)    14  (VAT 14%)
// ---
// + COGS Entry:
// Dr: COGS (5100)           40
// Cr: Inventory (1300)      40
```

### محل تجاري (Retail)
```typescript
// نفس القيد + Barcode tracking + Loyalty points
```

### خدمات (Services)
```typescript
// No COGS entry (no inventory)
// Dr: Cash
// Cr: Service Revenue (4200)
```

### جملة (Wholesale)
```typescript
// Minimum order quantities
// Tiered pricing
// Credit terms tracking
```

---

## 📈 التقارير المالية

### 1. Trial Balance (ميزان المراجعة)
```typescript
const trialBalance = await journalService.getTrialBalance(
  restaurantId,
  new Date('2026-04-30')
);
```

### 2. Profit & Loss (قائمة الدخل)
```typescript
const pnl = await journalService.getProfitAndLoss(
  restaurantId,
  new Date('2026-04-01'),
  new Date('2026-04-30')
);

console.log(pnl.gross_profit);
console.log(pnl.net_profit);
```

### 3. Balance Sheet (الميزانية العمومية)
```typescript
const balanceSheet = await journalService.getBalanceSheet(
  restaurantId,
  new Date('2026-04-30')
);
```

---

## ⚙️ إعدادات النظام

### تعيين طريقة تكلفة المخزون
```typescript
// FIFO (افتراضي), LIFO, WAC, Specific
await inventoryCosting.setCostingMethod(restaurantId, 'fifo');
```

### إضافة معدل ضريبة
```typescript
await taxService.createTaxRate({
  restaurant_id: restaurantId,
  name: 'ضريبة القيمة المضافة',
  rate: 14,
  type: 'vat',
  is_included_in_price: false,
  applies_to: ['all']
});
```

### إعداد الضرائب الافتراضية لمصر
```typescript
await taxService.setupDefaultTaxes(restaurantId, 'EG');
```

---

## 🔒 الأمان

- ✅ RLS Policies على جميع الجداول
- ✅ Audit Trail لكل تغيير مالي
- ✅ Validation: القيود لازم تتوازن (Debit = Credit)
- ✅ User tracking: من أنشأ/عدل كل قيد

---

## 🐛 استكشاف الأخطاء

### مشكلة: "Account not found"
**الحل:** شغل `create_default_chart_of_accounts` للمطعم

### مشكلة: "Types not found"
**الحل:** حدث Supabase types بعد تشغيل Migration

### مشكلة: "Journal entry must balance"
**الحل:** تأكد إن مجموع Debit = مجموع Credit

---

## 📞 الدعم

للمزيد من التفاصيل:
- اقرأ `VENTRO_PRO_EXPERT_RECOMMENDATIONS.md`
- راجع الـ Migration في Supabase
- افحص Logs في Console

---

**الإصدار:** 1.0.0-VentroPro  
**تم الإنشاء:** 19 أبريل 2026
