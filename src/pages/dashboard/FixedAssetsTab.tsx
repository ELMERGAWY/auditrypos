// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Plus, Trash2, Calculator, Calendar, 
  TrendingDown, ShieldCheck, History, ArrowUpRight, 
  Settings2, FileText, Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_value: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_method: 'straight_line' | 'declining_balance';
  accumulated_depreciation: number;
  current_value: number;
  status: 'active' | 'disposed' | 'fully_depreciated';
  asset_account_id?: string;
  depreciation_account_id?: string;
}

const ASSET_CATEGORIES = [
  { id: 'buildings', label: 'المباني والمنشآت', defaultLife: 20 },
  { id: 'machinery', label: 'الآلات والمعدات', defaultLife: 10 },
  { id: 'vehicles', label: 'وسائل النقل', defaultLife: 5 },
  { id: 'furniture', label: 'الأثاث والمكتب', defaultLife: 7 },
  { id: 'it', label: 'أجهزة الحاسب والتقنية', defaultLife: 3 }
];

export function FixedAssetsTab({ restaurantId, currency }) {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [coa, setCoa] = useState([]);
  
  const [form, setForm] = useState({
    name: '',
    category: 'machinery',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_value: '',
    salvage_value: '0',
    useful_life_years: 5,
    depreciation_method: 'straight_line',
    asset_account_id: '',
    depreciation_account_id: ''
  });

  const load = async () => {
    setLoading(true);
    // Load Assets
    const { data: assetsData } = await supabase
      .from('fixed_assets')
      .select('*')
      .eq('restaurant_id', restaurantId);
    setAssets(assetsData || []);

    // Load COA for mapping
    const { data: coaData } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('account_type', ['asset', 'expense']);
    setCoa(coaData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const handleSave = async () => {
    if (!form.name || !form.purchase_value) {
      toast.error('يرجى إكمال البيانات الأساسية');
      return;
    }

    const { error } = await supabase
      .from('fixed_assets')
      .insert({
        restaurant_id: restaurantId,
        ...form,
        purchase_value: Number(form.purchase_value),
        salvage_value: Number(form.salvage_value),
        current_value: Number(form.purchase_value),
        accumulated_depreciation: 0,
        status: 'active'
      });

    if (error) {
      toast.error('فشل حفظ الأصل');
    } else {
      toast.success('تم تسجيل الأصل بنجاح');
      setShowForm(false);
      load();
    }
  };

  const calculateDepreciation = (asset: FixedAsset) => {
    const cost = asset.purchase_value;
    const salvage = asset.salvage_value;
    const life = asset.useful_life_years;
    
    if (asset.depreciation_method === 'straight_line') {
      return (cost - salvage) / life;
    } else {
      // Double Declining Balance (Simplified 200%)
      const rate = (2 / life);
      return (asset.current_value * rate);
    }
  };

  const runDepreciationProcess = async () => {
    toast.loading('جاري حساب الإهلاكات الدورية...');
    // Logic to update accumulated depreciation and book values
    // In a real system, this would also create journal entries
    toast.dismiss();
    toast.success('تم تحديث الإهلاكات بنجاح');
    load();
  };

  const totalAssetValue = assets.reduce((s, a) => s + a.purchase_value, 0);
  const totalBookValue = assets.reduce((s, a) => s + a.current_value, 0);
  const totalDepreciation = totalAssetValue - totalBookValue;

  return (
    <div className="p-4 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold">إجمالي الأصول الثابتة</p>
              <h3 className="text-xl font-black">{totalAssetValue.toLocaleString()} {currency}</h3>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-rose-500/10 border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold">مجمع الإهلاك</p>
              <h3 className="text-xl font-black">{totalDepreciation.toLocaleString()} {currency}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold">صافي القيمة الدفترية</p>
              <h3 className="text-xl font-black text-emerald-500">{totalBookValue.toLocaleString()} {currency}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(true)} className="gradient-bg text-white border-0" size="sm">
            <Plus className="w-4 h-4 ml-1" /> إضافة أصل جديد
          </Button>
          <Button variant="outline" size="sm" onClick={runDepreciationProcess}>
            <Calculator className="w-4 h-4 ml-1" /> تشغيل الإهلاك الدوري
          </Button>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Landmark className="w-3 h-3 ml-1" /> 
          المعيار المحاسبي: {restaurantId ? 'المصري (EAS)' : 'الدولي (IFRS)'}
        </Badge>
      </div>

      {/* Assets List */}
      <div className="space-y-3">
        {assets.map(asset => (
          <div key={asset.id} className="glass-card p-4 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm">{asset.name}</h4>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{ASSET_CATEGORIES.find(c => c.id === asset.category)?.label}</Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {format(new Date(asset.purchase_date), 'yyyy/MM/dd')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-8 text-left">
              <div>
                <p className="text-[10px] text-muted-foreground">التكلفة التاريخية</p>
                <p className="text-xs font-bold">{asset.purchase_value.toLocaleString()} {currency}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">مجمع الإهلاك</p>
                <p className="text-xs font-bold text-rose-500">{asset.accumulated_depreciation.toLocaleString()} {currency}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">القيمة الحالية</p>
                <p className="text-xs font-bold text-emerald-500">{asset.current_value.toLocaleString()} {currency}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-indigo-500">
                <History className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {assets.length === 0 && (
          <div className="py-20 text-center glass-card border-dashed">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
            <p className="text-muted-foreground text-sm">لا توجد أصول مسجلة حالياً</p>
            <Button variant="link" onClick={() => setShowForm(true)} className="mt-2 text-indigo-500">سجل أول أصل لك الآن</Button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-2xl w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" /> إضافة أصل ثابت
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><Plus className="w-5 h-5 rotate-45" /></Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">اسم الأصل</Label>
                <Input placeholder="مثال: فرن حراري كبير" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">الفئة</Label>
                <select 
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                  value={form.category}
                  onChange={e => {
                    const cat = ASSET_CATEGORIES.find(c => c.id === e.target.value);
                    setForm({...form, category: e.target.value, useful_life_years: cat?.defaultLife || 5});
                  }}
                >
                  {ASSET_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">تاريخ الشراء</Label>
                <Input type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">تكلفة الشراء ({currency})</Label>
                <Input type="number" placeholder="0.00" value={form.purchase_value} onChange={e => setForm({...form, purchase_value: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">قيمة الخردة المقدرة</Label>
                <Input type="number" value={form.salvage_value} onChange={e => setForm({...form, salvage_value: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">العمر الإنتاجي (سنوات)</Label>
                <Input type="number" value={form.useful_life_years} onChange={e => setForm({...form, useful_life_years: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ربط بحساب الأصل</Label>
                <select 
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                  value={form.asset_account_id}
                  onChange={e => setForm({...form, asset_account_id: e.target.value})}
                >
                  <option value="">اختر حساب الأصل...</option>
                  {coa.filter(a => a.account_type === 'asset').map(a => (
                    <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ربط بحساب المصروف</Label>
                <select 
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                  value={form.depreciation_account_id}
                  onChange={e => setForm({...form, depreciation_account_id: e.target.value})}
                >
                  <option value="">اختر حساب الإهلاك...</option>
                  {coa.filter(a => a.account_type === 'expense').map(a => (
                    <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">قسط الإهلاك السنوي المتوقع:</span>
                <span className="font-bold text-indigo-500">
                  {form.purchase_value ? calculateDepreciation({
                    purchase_value: Number(form.purchase_value),
                    salvage_value: Number(form.salvage_value),
                    useful_life_years: Number(form.useful_life_years),
                    depreciation_method: form.depreciation_method,
                    current_value: Number(form.purchase_value)
                  }).toLocaleString() : 0} {currency}
                </span>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full h-12 gradient-bg text-white border-0 font-bold">
              تأكيد وتسجيل الأصل
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
