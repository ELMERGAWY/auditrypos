import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Book, CheckCircle2, AlertCircle, Info, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUSINESS_TYPES } from '@/lib/businessTypes';

interface Props {
  restaurant: any;
  loadData: () => void;
}

const STANDARDS = [
  { id: 'IFRS', label: 'معايير المحاسبة الدولية (IFRS)', description: 'المعايير المعتمدة عالمياً، تدعم FIFO والمتوسط المرجح.', forbidden: ['LIFO'] },
  { id: 'EAS', label: 'معايير المحاسبة المصرية (EAS)', description: 'المعايير المحلية المصرية، تتوافق مع IFRS وتمنع LIFO.', forbidden: ['LIFO'] },
  { id: 'US_GAAP', label: 'المعايير الأمريكية (US GAAP)', description: 'تسمح باستخدام LIFO ولها متطلبات إفصاح خاصة.', forbidden: [] },
];

const METHODS = [
  { id: 'FIFO', label: 'ما يرد أولاً يصرف أولاً (FIFO)', description: 'حساب التكلفة بناءً على أقدم شحنة موجودة.' },
  { id: 'WEIGHTED_AVG', label: 'المتوسط المرجح (Weighted Average)', description: 'حساب متوسط تكلفة لكافة القطع الموجودة.' },
  { id: 'LIFO', label: 'ما يرد أخيراً يصرف أولاً (LIFO)', description: 'حساب التكلفة بناءً على أحدث شحنة (خاص بالمعايير الأمريكية).' },
];

const SYSTEMS = [
  { id: 'PERPETUAL', label: 'الجرد المستمر (Perpetual)', description: 'تحديث المخزون والتكلفة مع كل عملية بيع أو شراء لحظياً.' },
  { id: 'PERIODIC', label: 'الجرد الدوري (Periodic)', description: 'تحديث المخزون في نهاية الفترة المحاسبية فقط.' },
];

export function AccountingSettings({ restaurant, loadData }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    accounting_standard: restaurant.accounting_standard || 'IFRS',
    inventory_method: restaurant.inventory_method || 'FIFO',
    inventory_system: restaurant.inventory_system || 'PERPETUAL',
    business_type: restaurant.business_type || 'restaurant'
  });

  const handleSave = async () => {
    // Validation
    const standard = STANDARDS.find(s => s.id === form.accounting_standard);
    if (standard?.forbidden.includes(form.inventory_method)) {
      toast.error(`طريقة ${form.inventory_method} غير مسموح بها في ${standard.label}`);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('restaurants').update({
      accounting_standard: form.accounting_standard,
      inventory_method: form.inventory_method,
      inventory_system: form.inventory_system,
      business_type: form.business_type
    } as any).eq('id', restaurant.id);

    if (error) {
      console.error('Save settings error:', error);
      toast.error(`فشل حفظ الإعدادات: ${error.message}`);
    } else {
      toast.success('تم تحديث المعايير المحاسبية بنجاح');
      loadData();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center gap-2 mb-2">
        <Book className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">تخصيص المعايير المحاسبية والمخزون</h3>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Standard Selection */}
        <div className="glass-card p-4 space-y-4">
          <label className="block text-sm font-bold text-muted-foreground">المعيار المحاسبي المتبع</label>
          <div className="grid gap-2">
            {STANDARDS.map(s => (
              <button key={s.id} onClick={() => setForm({ ...form, accounting_standard: s.id })}
                className={`p-3 rounded-xl border-2 text-right transition-all flex items-center justify-between ${form.accounting_standard === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <div className="flex-1">
                  <p className="font-bold text-sm">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.description}</p>
                </div>
                {form.accounting_standard === s.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Method */}
        <div className="glass-card p-4 space-y-4">
          <label className="block text-sm font-bold text-muted-foreground">طريقة تقييم المخزون</label>
          <div className="grid gap-2">
            {METHODS.map(m => {
              const isForbidden = STANDARDS.find(s => s.id === form.accounting_standard)?.forbidden.includes(m.id);
              return (
                <button key={m.id} disabled={isForbidden} onClick={() => setForm({ ...form, inventory_method: m.id })}
                  className={`p-3 rounded-xl border-2 text-right transition-all flex items-center justify-between ${isForbidden ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${form.inventory_method === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">{m.description}</p>
                  </div>
                  {form.inventory_method === m.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  {isForbidden && <AlertCircle className="w-4 h-4 text-destructive" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inventory System */}
        <div className="glass-card p-4 space-y-4 lg:col-span-2">
          <label className="block text-sm font-bold text-muted-foreground">نظام جرد المخزون</label>
          <div className="flex gap-4">
            {SYSTEMS.map(sys => (
              <button key={sys.id} onClick={() => setForm({ ...form, inventory_system: sys.id })}
                className={`flex-1 p-4 rounded-xl border-2 text-right transition-all ${form.inventory_system === sys.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <p className="font-bold text-sm">{sys.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{sys.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Business Module Selection */}
      <div className="glass-card p-4 space-y-4 lg:col-span-2 border-primary/20">
        <label className="block text-sm font-bold text-primary flex items-center gap-2">
          <Building2 className="w-4 h-4" /> موديول النظام المخصص (Business Modules)
        </label>
        <p className="text-xs text-muted-foreground mb-4">
          اختر طبيعة نشاطك التجاري. هذا الاختيار سيقوم بتخصيص الواجهات، القوائم، التقارير، والربط المحاسبي (Chart of Accounts) آلياً بما يتوافق مع ممارسات هذا النشاط.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Object.values(BUSINESS_TYPES).map(bt => (
            <button 
              key={bt.id} 
              type="button"
              onClick={() => setForm({ ...form, business_type: bt.id })}
              className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-2 relative group ${form.business_type === bt.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30 bg-card/50'}`}
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">{bt.icon}</span>
              <span className="font-bold text-[11px] leading-tight">{bt.label}</span>
              {form.business_type === bt.id && (
                <div className="absolute top-1 left-1">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-primary shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-primary">تأثير التغيير:</p>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            تغيير موديول النظام سيؤدي إلى ظهور/اختفاء بعض التبويبات في القائمة الجانبية (مثل الطاولات للمطاعم أو العقود للعقارات). كما سيتم توجيه القيود المحاسبية للحسابات الخاصة بالنشاط الجديد.
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full h-12 gradient-bg text-primary-foreground text-lg border-0 shadow-lg shadow-primary/20">
        {loading ? 'جاري حفظ التكوينات...' : 'تحديث إعدادات الموديول والمحاسبة'}
      </Button>
    </div>
  );
}
