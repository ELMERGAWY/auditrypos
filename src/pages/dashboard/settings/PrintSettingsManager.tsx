import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Printer, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PrintElementSettings {
  logo: boolean;
  restaurantName: boolean;
  invoiceNumber: boolean;
  dateTime: boolean;
  itemCount: boolean;
  customerName: boolean;
  customerPhone: boolean;
  customerRef: boolean;
  deliveryAddress: boolean;
  items: boolean;
  totalQty: boolean;
  subtotal: boolean;
  discount: boolean;
  total: boolean;
  paymentMethod: boolean;
  paidAmount: boolean;
  remaining: boolean;
  change: boolean;
  notes: boolean;
  thankYou: boolean;
  poweredBy: boolean;
}

interface CopySettings {
  customerCopy: boolean;
  businessCopy: boolean;
  kitchenCopy: boolean;
}

interface CombinedPrintSettings extends PrintElementSettings, CopySettings {}

interface PrintSettingsManagerProps {
  restaurantId: string;
}

export function PrintSettingsManager({ restaurantId }: PrintSettingsManagerProps) {
  const [printSettings, setPrintSettings] = useState<CombinedPrintSettings>({
    // Element settings
    logo: true,
    restaurantName: true,
    invoiceNumber: true,
    dateTime: true,
    itemCount: true,
    customerName: true,
    customerPhone: true,
    customerRef: true,
    deliveryAddress: true,
    items: true,
    totalQty: true,
    subtotal: true,
    discount: true,
    total: true,
    paymentMethod: true,
    paidAmount: true,
    remaining: true,
    change: true,
    notes: true,
    thankYou: true,
    poweredBy: true,
    // Copy settings
    customerCopy: true,
    businessCopy: true,
    kitchenCopy: true,
  });

  const [loading, setLoading] = useState(false);

  // Load print settings from database on mount
  useEffect(() => {
    const loadPrintSettings = async () => {
      if (!restaurantId) return;
      try {
        const { data, error } = await supabase.rpc('get_or_create_print_settings' as any, { 
          restaurant_id: restaurantId 
        });
        if (error) throw error;
        if (data) {
          setPrintSettings(data as CombinedPrintSettings);
        }
      } catch (error) {
        console.error('Failed to load print settings:', error);
      }
    };
    loadPrintSettings();
  }, [restaurantId]);

  const handleSave = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_print_settings' as any, { 
        restaurant_id: restaurantId, 
        new_settings: printSettings 
      });
      if (error) throw error;
      toast.success('تم حفظ إعدادات الطباعة بنجاح');
    } catch (error) {
      console.error('Failed to save print settings:', error);
      toast.error('فشل حفظ إعدادات الطباعة');
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = (key: keyof CombinedPrintSettings) => {
    setPrintSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Printer className="w-5 h-5 text-primary" /> إعدادات الطباعة
        </h2>
        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="gradient-bg text-primary-foreground border-0"
        >
          {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" /> عناصر الإيصال
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'logo', label: 'شعار المطعم' },
              { key: 'restaurantName', label: 'اسم المطعم' },
              { key: 'invoiceNumber', label: 'رقم الفاتورة' },
              { key: 'dateTime', label: 'التاريخ والوقت' },
              { key: 'itemCount', label: 'عدد الأصناف' },
              { key: 'customerName', label: 'اسم العميل' },
              { key: 'customerPhone', label: 'هاتف العميل' },
              { key: 'customerRef', label: 'مرجع العميل' },
              { key: 'deliveryAddress', label: 'العنوان' },
              { key: 'items', label: 'الأصناف' },
              { key: 'totalQty', label: 'إجمالي الكمية' },
              { key: 'subtotal', label: 'المجموع الفرعي' },
              { key: 'discount', label: 'الخصم' },
              { key: 'total', label: 'الإجمالي' },
              { key: 'paymentMethod', label: 'طريقة الدفع' },
              { key: 'paidAmount', label: 'المدفوع' },
              { key: 'remaining', label: 'المتبقي' },
              { key: 'change', label: 'الباقي للعميل' },
              { key: 'notes', label: 'الملاحظات' },
              { key: 'thankYou', label: 'شكراً لزيارتكم' },
              { key: 'poweredBy', label: 'Powered by Auditry' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-secondary/50">
                <input
                  type="checkbox"
                  checked={printSettings[key as keyof CombinedPrintSettings]}
                  onChange={() => toggleSetting(key as keyof CombinedPrintSettings)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <X className="w-4 h-4 text-blue-500" /> النسخ المطبوعة
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'customerCopy', label: 'نسخة العميل' },
              { key: 'businessCopy', label: 'نسخة النشاط' },
              { key: 'kitchenCopy', label: 'نسخة المطبخ' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-secondary/50">
                <input
                  type="checkbox"
                  checked={printSettings[key as keyof CombinedPrintSettings]}
                  onChange={() => toggleSetting(key as keyof CombinedPrintSettings)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
