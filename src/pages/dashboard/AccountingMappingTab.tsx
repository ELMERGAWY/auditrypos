import { useState, useEffect } from 'react';
import { 
  Settings2, Save, Info, RefreshCcw, 
  ArrowRightLeft, Landmark, Wallet, ShoppingCart, 
  Users, DollarSign, Package, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BUSINESS_ACCOUNT_MAPPINGS } from '@/lib/accounting/types';

interface Props {
  restaurantId: string;
  currency: string;
}

export function AccountingMappingTab({ restaurantId, currency }: Props) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Chart of Accounts
      const { data: coa } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('code');
      
      setAccounts(coa || []);

      // 2. Load Existing Mappings (from a settings table or restaurant metadata)
      const { data: rest } = await supabase
        .from('restaurants')
        .select('account_mappings')
        .eq('id', restaurantId)
        .single();
      
      setMappings(rest?.account_mappings || {});
    } catch (e) {
      toast.error('فشل تحميل بيانات التوجيه المحاسبي');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ account_mappings: mappings } as any)
        .eq('id', restaurantId);
      
      if (error) throw error;
      toast.success('تم حفظ التوجيه المحاسبي بنجاح ✅');
    } catch (e: any) {
      toast.error(`فشل الحفظ: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const renderAccountSelector = (label: string, mappingKey: string, icon: any) => {
    const Icon = icon;
    return (
      <div className="flex flex-col gap-2 p-4 glass-card border border-border/50 hover:border-primary/30 transition-all group">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform">
            <Icon className="w-4 h-4" />
          </div>
          <Label className="font-bold text-sm">{label}</Label>
        </div>
        <select 
          value={mappings[mappingKey] || ''} 
          onChange={e => setMappings({...mappings, [mappingKey]: e.target.value})}
          className="w-full bg-secondary/50 border-0 p-2.5 rounded-xl font-mono text-sm focus:ring-2 ring-primary/20"
        >
          <option value="">-- اختر الحساب من الدليل --</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.code}>
              [{acc.code}] - {acc.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  if (loading) return <div className="p-20 flex justify-center"><RefreshCcw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 fade-in p-2 md:p-6 pb-24" dir="rtl">
      <header className="flex justify-between items-end border-b border-border/50 pb-6">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-primary" />
            التوجيه المحاسبي (Mapping)
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            هنا يمكنك تحديد الحسابات الدليلية التي سيتم توجيه القيود الآلية إليها (المبيعات، المخزون، المشتريات، إلخ).
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gradient-bg text-white border-0 gap-2 h-12 px-8 shadow-lg shadow-primary/20">
          <Save className="w-4 h-4" /> {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <section className="space-y-4 lg:col-span-3">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Activity className="w-5 h-5" />
            <span>حسابات النقدية والبنوك</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderAccountSelector('حساب النقدية الرئيسي', 'cashAccount', Wallet)}
            {renderAccountSelector('حساب البنك الرئيسي', 'bankAccount', Landmark)}
            {renderAccountSelector('حساب العجز والزيادة', 'adjustmentAccount', RefreshCcw)}
          </div>
        </section>

        <section className="space-y-4 lg:col-span-3">
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <ShoppingCart className="w-5 h-5" />
            <span>حسابات المبيعات والمخزون</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderAccountSelector('إيرادات المبيعات', 'salesRevenue', DollarSign)}
            {renderAccountSelector('تكلفة البضاعة المباعة', 'cogsAccount', Activity)}
            {renderAccountSelector('حساب المخزون الرئيسي', 'inventoryAccount', Package)}
          </div>
        </section>

        <section className="space-y-4 lg:col-span-3">
          <div className="flex items-center gap-2 text-orange-600 font-bold">
            <Users className="w-5 h-5" />
            <span>حسابات الذمم والضرائب</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderAccountSelector('حساب العملاء (AR)', 'accountsReceivable', Users)}
            {renderAccountSelector('حساب الموردين (AP)', 'accountsPayable', Users)}
            {renderAccountSelector('حساب ضريبة القيمة المضافة', 'taxPayable', Percent)}
          </div>
        </section>
      </div>

      <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl flex gap-4 mt-8">
        <Info className="w-6 h-6 text-primary shrink-0" />
        <div className="space-y-2">
          <h4 className="font-bold text-primary">تنبيه هام حول التوجيه المحاسبي:</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            النظام يقوم بتوليد قيود يومية آلية لكل عملية بيع أو شراء. إذا تركت الحسابات فارغة، سيستخدم النظام الأكواد الافتراضية (مثل 1100 للنقدية، 4100 للمبيعات). 
            يرجى التأكد من مطابقة هذه الأكواد مع الدليل المحاسبي الخاص بك لتجنب الأخطاء في التقارير المالية.
          </p>
        </div>
      </div>
    </div>
  );
}

const Percent = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" x2="5" y1="5" y2="19" />
    <circle cx="9" cy="9" r="2" />
    <circle cx="15" cy="15" r="2" />
  </svg>
);
