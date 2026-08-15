import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, LayoutGrid, Palette, Save, Table2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const THEME_PRESETS = [
  { id: 'indigo', label: 'Indigo Executive', primary: '221 83% 53%', accent: '262 83% 58%' },
  { id: 'emerald', label: 'Emerald Operations', primary: '160 84% 39%', accent: '173 80% 40%' },
  { id: 'violet', label: 'Violet Studio', primary: '262 83% 58%', accent: '291 64% 42%' },
  { id: 'amber', label: 'Amber Commerce', primary: '32 95% 44%', accent: '20 90% 48%' },
  { id: 'rose', label: 'Rose Retail', primary: '346 77% 49%', accent: '330 81% 60%' },
];

const CARD_LABELS: Record<string, string> = {
  sales: 'مبيعات اليوم',
  profit: 'صافي الربح',
  customers: 'العملاء النشطون',
  orders: 'الطلبات المعلقة',
  suppliers: 'الموردون',
};

const TABLE_OPTIONS = [
  { id: 'orders', label: 'الطلبات' },
  { id: 'sales_invoices', label: 'فواتير البيع' },
  { id: 'receipts', label: 'سندات القبض' },
  { id: 'customers', label: 'العملاء' },
  { id: 'products', label: 'الأصناف' },
  { id: 'inventory', label: 'تقارير المخزون' },
];

type AppearanceConfig = {
  theme_preset: string;
  dashboard_variant: 'executive' | 'operations' | 'commerce' | 'minimal';
  density: 'comfortable' | 'compact';
  sidebar_style: 'expanded' | 'icon';
  card_order: string[];
  table_views: Record<string, 'table' | 'cards' | 'compact'>;
};

const DEFAULT_CONFIG: AppearanceConfig = {
  theme_preset: 'indigo',
  dashboard_variant: 'executive',
  density: 'comfortable',
  sidebar_style: 'expanded',
  card_order: ['sales', 'profit', 'customers', 'orders', 'suppliers'],
  table_views: {
    orders: 'cards',
    sales_invoices: 'table',
    receipts: 'table',
    customers: 'table',
    products: 'table',
    inventory: 'table',
  },
};

function mergeConfig(restaurant: any): AppearanceConfig {
  const theme = restaurant?.theme_settings || {};
  const layout = restaurant?.layout_config || {};
  return {
    ...DEFAULT_CONFIG,
    ...theme,
    ...layout,
    card_order: Array.isArray(layout.card_order) ? layout.card_order : DEFAULT_CONFIG.card_order,
    table_views: { ...DEFAULT_CONFIG.table_views, ...(layout.table_views || {}) },
  };
}

export function AppearanceSettings({ restaurant, loadData }: { restaurant: any; loadData: () => void }) {
  const [config, setConfig] = useState<AppearanceConfig>(() => mergeConfig(restaurant));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfig(mergeConfig(restaurant));
  }, [restaurant]);

  const updateConfig = (patch: Partial<AppearanceConfig>) => setConfig(prev => ({ ...prev, ...patch }));

  const moveCard = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.card_order.length) return;
    const next = [...config.card_order];
    [next[index], next[target]] = [next[target], next[index]];
    updateConfig({ card_order: next });
  };

  const save = async () => {
    if (!restaurant?.id) return;
    setSaving(true);
    try {
      const preset = THEME_PRESETS.find(item => item.id === config.theme_preset) || THEME_PRESETS[0];
      const themeSettings = {
        ...(restaurant.theme_settings || {}),
        theme_preset: config.theme_preset,
        primary_hsl: preset.primary,
        accent_hsl: preset.accent,
        dashboard_variant: config.dashboard_variant,
        density: config.density,
        sidebar_style: config.sidebar_style,
      };
      const layoutConfig = {
        ...(restaurant.layout_config || {}),
        dashboard_variant: config.dashboard_variant,
        density: config.density,
        sidebar_style: config.sidebar_style,
        card_order: config.card_order,
        table_views: config.table_views,
      };
      const { error } = await supabase
        .from('restaurants')
        .update({ theme_settings: themeSettings, layout_config: layoutConfig } as any)
        .eq('id', restaurant.id);
      if (error) throw error;
      toast.success('تم حفظ مظهر النظام وطرق العرض');
      loadData();
    } catch (error: any) {
      toast.error('تعذر حفظ المظهر: ' + (error?.message || 'تحقق من صلاحيات النشاط'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold flex items-center gap-2"><Palette className="w-5 h-5" /> مظهر النظام وطرق العرض</h2>
        <p className="text-sm text-muted-foreground mt-1">إعدادات محفوظة للنشاط نفسه، وتظهر لكل موظف وفق صلاحياته دون إنشاء واجهة مستقلة.</p>
      </div>

      <div className="glass-card p-5 space-y-5">
        <div>
          <Label className="mb-2 block">القالب البصري</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {THEME_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateConfig({ theme_preset: preset.id })}
                className={`relative rounded-xl border p-3 text-right transition-colors ${config.theme_preset === preset.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
              >
                <span className="flex gap-1 mb-2"><span className="w-5 h-5 rounded-full" style={{ background: `hsl(${preset.primary})` }} /><span className="w-5 h-5 rounded-full" style={{ background: `hsl(${preset.accent})` }} /></span>
                <span className="text-xs font-semibold">{preset.label}</span>
                {config.theme_preset === preset.id && <Check className="absolute top-2 left-2 w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label>أسلوب لوحة التحكم</Label><Select value={config.dashboard_variant} onValueChange={(value: AppearanceConfig['dashboard_variant']) => updateConfig({ dashboard_variant: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="executive">تنفيذي</SelectItem><SelectItem value="operations">تشغيلي</SelectItem><SelectItem value="commerce">تجاري</SelectItem><SelectItem value="minimal">مبسط</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>كثافة المحتوى</Label><Select value={config.density} onValueChange={(value: AppearanceConfig['density']) => updateConfig({ density: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="comfortable">مريح</SelectItem><SelectItem value="compact">مضغوط</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>الشريط الجانبي</Label><Select value={config.sidebar_style} onValueChange={(value: AppearanceConfig['sidebar_style']) => updateConfig({ sidebar_style: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expanded">موسع</SelectItem><SelectItem value="icon">أيقونات فقط</SelectItem></SelectContent></Select></div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2"><LayoutGrid className="w-5 h-5" /> ترتيب بطاقات لوحة التحكم</h3>
        <div className="space-y-2">
          {config.card_order.map((card, index) => (
            <div key={card} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="font-medium">{index + 1}. {CARD_LABELS[card] || card}</span>
              <div className="flex gap-1"><Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moveCard(index, -1)}><ArrowUp className="w-4 h-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={index === config.card_order.length - 1} onClick={() => moveCard(index, 1)}><ArrowDown className="w-4 h-4" /></Button></div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Table2 className="w-5 h-5" /> طريقة العرض الافتراضية للجداول</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {TABLE_OPTIONS.map(table => (
            <div key={table.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><span className="text-sm font-medium">{table.label}</span><Select value={config.table_views[table.id]} onValueChange={(value: 'table' | 'cards' | 'compact') => updateConfig({ table_views: { ...config.table_views, [table.id]: value } })}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="table">جدول</SelectItem><SelectItem value="cards">بطاقات</SelectItem><SelectItem value="compact">مضغوط</SelectItem></SelectContent></Select></div>
          ))}
        </div>
      </div>

      <Button type="button" onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ إعدادات المظهر والعرض'}</Button>
    </div>
  );
}
