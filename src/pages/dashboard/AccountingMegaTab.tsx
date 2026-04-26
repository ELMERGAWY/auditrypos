import { useState, useEffect } from 'react';
import { 
  Users, Store, Wallet, DollarSign, TrendingUp, RotateCcw, 
  ChevronRight, ArrowRight, FileText, Landmark, Building2,
  ArrowUpRight, ArrowDownLeft, RefreshCcw, ShoppingBag,
  Truck, Package, ClipboardList, Briefcase, UsersRound,
  Calculator, History, Settings, BarChart3, HardDrive,
  Banknote, Receipt, Layers, Boxes, Ban, LayoutDashboard,
  Plus, Search, Download, Printer, Filter, X, Scale as ScaleIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomersTab } from './CustomersTab';
import { SuppliersTab } from './SuppliersTab';
import { ExpensesTab } from './ExpensesTab';
import { FinancialsTab } from './FinancialsTab';
import { BOMManager } from './BOMManager';
import { InventoryTab } from './InventoryTab';
import { StaffTab } from './StaffTab';
import { CustomReportBuilder } from './CustomReportBuilder';
import { BankCashModule } from './BankCashModule';
import { AdvancedReportsHub } from './AdvancedReportsHub';

interface Props {
  restaurantId: string;
  currency: string;
}

type SubModule = 'overview' | 'bank_cash' | 'customers' | 'suppliers' | 'expenses' | 'inventory' | 'production' | 'hr' | 'assets' | 'ledger' | 'reports' | 'financials';

export function AccountingMegaTab({ restaurantId, currency }: Props) {
  const [activeModule, setActiveModule] = useState<SubModule>('overview');
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showManualJournal, setShowManualJournal] = useState(false);

  // Form States
  const [newAsset, setNewAsset] = useState({ name: '', category: 'machinery', value: 0, life: 5 });
  const [newJournal, setNewJournal] = useState({ description: '', debit_acc: '', credit_acc: '', amount: 0 });

  useEffect(() => {
    loadAccountingData();
  }, [restaurantId]);

  const loadAccountingData = async () => {
    setLoading(true);
    const { data: entries } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines (
          *,
          chart_of_accounts (name, code)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    
    const { data: accs } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId);

    const { data: asts } = await supabase
      .from('fixed_assets')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (entries) setJournalEntries(entries);
    if (accs) setAccounts(accs);
    if (asts) setAssets(asts);
    setLoading(false);
  };

  const handleAddAsset = async () => {
    if (!newAsset.name || newAsset.value <= 0) return toast.error('يرجى إكمال بيانات الأصل');
    
    setLoading(true);
    try {
      // 1. Save Asset
      const { data: asset, error: assetErr } = await supabase.from('fixed_assets').insert({
        restaurant_id: restaurantId,
        name: newAsset.name,
        category: newAsset.category,
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_value: newAsset.value,
        useful_life_years: newAsset.life,
        current_value: newAsset.value
      }).select().single();

      if (asset) {
        // 2. Generate Journal Entry
        const entryNum = `AST-${Date.now().toString().slice(-6)}`;
        const { data: entry } = await supabase.from('journal_entries').insert({
          restaurant_id: restaurantId,
          entry_number: entryNum,
          entry_date: new Date().toISOString().split('T')[0],
          description: `شراء أصل ثابت: ${newAsset.name}`,
          total_debit: newAsset.value,
          total_credit: newAsset.value,
          is_posted: true
        }).select().single();

        toast.success('تم إضافة الأصل وتوليد القيد المحاسبي بنجاح');
        setShowAddAsset(false);
        loadAccountingData();
      }
    } catch (e) {
      toast.error('خطأ في إضافة الأصل');
    }
    setLoading(false);
  };

  const handleAddManualJournal = async () => {
    if (!newJournal.debit_acc || !newJournal.credit_acc || newJournal.amount <= 0) return toast.error('البيانات غير مكتملة');
    
    setLoading(true);
    try {
      const entryNum = `JV-${Date.now().toString().slice(-6)}`;
      const { data: entry } = await supabase.from('journal_entries').insert({
        restaurant_id: restaurantId,
        entry_number: entryNum,
        entry_date: new Date().toISOString().split('T')[0],
        description: newJournal.description || 'قيد تسوية يدوي',
        total_debit: newJournal.amount,
        total_credit: newJournal.amount,
        is_posted: true
      }).select().single();

      if (entry) {
        await supabase.from('journal_entry_lines').insert([
          { entry_id: entry.id, account_id: newJournal.debit_acc, debit: newJournal.amount },
          { entry_id: entry.id, account_id: newJournal.credit_acc, credit: newJournal.amount }
        ]);

        toast.success('تم تسجيل القيد المحاسبي المزدوج بنجاح');
        setShowManualJournal(false);
        loadAccountingData();
      }
    } catch (e) {
      toast.error('خطأ في تسجيل القيد');
    }
    setLoading(false);
  };

  const sections = [
    {
      title: 'النقدية والبنوك',
      icon: Banknote,
      items: [
        { id: 'bank_cash', label: 'حسابات البنك والخزينة', icon: Building2 },
        { id: 'expenses', label: 'المقبوضات والمدفوعات', icon: Banknote },
      ]
    },
    {
      title: 'المبيعات والمشتريات',
      icon: ShoppingBag,
      items: [
        { id: 'customers', label: 'حسابات العملاء', icon: Users },
        { id: 'suppliers', label: 'حسابات الموردين', icon: Store },
      ]
    },
    {
      title: 'المخزون والإنتاج',
      icon: Layers,
      items: [
        { id: 'inventory', label: 'أصناف المخزون', icon: Boxes },
        { id: 'production', label: 'أوامر الإنتاج والتكاليف', icon: HardDrive },
      ]
    },
    {
      title: 'الإدارة والمالية',
      icon: Calculator,
      items: [
        { id: 'financials', label: 'القوائم المالية', icon: Landmark },
        { id: 'assets', label: 'الأصول الثابتة', icon: Truck },
        { id: 'hr', label: 'الموظفون والرواتب', icon: UsersRound },
      ]
    },
    {
      title: 'التقارير والدفاتر',
      icon: BarChart3,
      items: [
        { id: 'ledger', label: 'دفتر الأستاذ العام', icon: ClipboardList },
        { id: 'reports', label: 'مولد التقارير المخصص', icon: FileText },
      ]
    }
  ];

  if (activeModule !== 'overview') {
    return (
      <div className="flex flex-col h-full bg-background" dir="rtl">
        <header className="border-b bg-card/50 backdrop-blur-md p-3 flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setActiveModule('overview')} className="gap-2">
            <ArrowRight className="w-4 h-4" /> العودة للوحة ERP
          </Button>
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">موديول:</span>
             <span className="text-xs font-bold text-primary">{activeModule.toUpperCase()}</span>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {activeModule === 'customers' && <CustomersTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'suppliers' && <SuppliersTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'expenses' && <ExpensesTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'financials' && <FinancialsTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'inventory' && <InventoryTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'production' && <BOMManager restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'hr' && <StaffTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'reports' && <AdvancedReportsHub restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'bank_cash' && <BankCashModule restaurantId={restaurantId} currency={currency} />}
          
          {activeModule === 'ledger' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">دفتر الأستاذ العام (Journal Entries)</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowManualJournal(true)}><Plus className="w-4 h-4" /> قيد يدوي</Button>
                  <Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" /> تصدير</Button>
                </div>
              </div>
              
              <div className="glass-card overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4">رقم القيد</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">البيان</th>
                      <th className="p-4">المدين</th>
                      <th className="p-4">الدائن</th>
                      <th className="p-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {journalEntries?.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-primary">{entry.entry_number}</td>
                        <td className="p-4 text-xs">{entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('ar-EG') : '-'}</td>
                        <td className="p-4 max-w-xs truncate">{entry.description || '-'}</td>
                        <td className="p-4 font-bold text-emerald-500">{(entry.total_debit || 0).toLocaleString()}</td>
                        <td className="p-4 font-bold text-destructive">{(entry.total_credit || 0).toLocaleString()}</td>
                        <td className="p-4">
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-0">مرحّل</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeModule === 'assets' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">سجل الأصول الثابتة</h3>
                <Button size="sm" onClick={() => setShowAddAsset(true)} className="gradient-bg text-primary-foreground border-0 gap-2"><Plus className="w-4 h-4" /> إضافة أصل</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets?.map(asset => (
                   <div key={asset.id} className="glass-card p-6 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{asset.category}</p>
                          <h4 className="text-lg font-bold">{asset.name}</h4>
                        </div>
                        <Truck className="w-8 h-8 text-primary/10" />
                      </div>
                      <div className="mt-6 flex justify-between items-end">
                        <div>
                          <p className="text-xs text-muted-foreground">القيمة الحالية</p>
                          <p className="text-2xl font-black text-primary">{asset.current_value?.toLocaleString()} <span className="text-xs font-normal">{currency}</span></p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">تم الشراء: {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('ar-EG') : '-'}</p>
                      </div>
                   </div>
                ))}
                {assets.length === 0 && (
                  <div className="col-span-3 p-20 text-center border-2 border-dashed rounded-3xl text-muted-foreground">
                    <Truck className="w-16 h-16 mb-4 opacity-10 mx-auto" />
                    <p>لا توجد أصول مسجلة حالياً. ابدأ بإضافة أصل جديد لحساب الإهلاكات آلياً.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setShowAddAsset(true)}>إضافة أول أصل</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODALS */}
        {showAddAsset && (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="glass-card p-8 max-w-md w-full space-y-6 shadow-2xl scale-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> إضافة أصل ثابت</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAddAsset(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-4 text-right">
                <div className="space-y-2">
                  <label className="text-xs font-bold">اسم الأصل</label>
                  <Input placeholder="مثال: ماكينة قهوة احترافية" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold">التصنيف</label>
                    <select value={newAsset.category} onChange={e => setNewAsset({...newAsset, category: e.target.value})} className="w-full bg-secondary p-2 rounded-lg text-sm border-0 h-10">
                      <option value="machinery">آلات ومعدات</option>
                      <option value="furniture">أثاث ومفروشات</option>
                      <option value="vehicles">وسائل نقل</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold">العمر الإنتاجي (سنوات)</label>
                    <Input type="number" value={newAsset.life} onChange={e => setNewAsset({...newAsset, life: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">قيمة الشراء</label>
                  <Input type="number" placeholder="0.00" value={newAsset.value} onChange={e => setNewAsset({...newAsset, value: Number(e.target.value)})} className="h-12 text-2xl font-black text-center" />
                </div>
                <Button onClick={handleAddAsset} disabled={loading} className="w-full gradient-bg border-0 h-12 text-lg font-bold">
                  {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'حفظ الأصل وتوليد القيد'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {showManualJournal && (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="glass-card p-8 max-w-lg w-full space-y-6 shadow-2xl scale-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2"><ScaleIcon className="w-5 h-5 text-primary" /> تسجيل قيد يدوي (JV)</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowManualJournal(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-4 text-right">
                <div className="space-y-2">
                  <label className="text-xs font-bold">البيان / الوصف</label>
                  <Input placeholder="مثال: تسوية رصيد عجز الخزينة" value={newJournal.description} onChange={e => setNewJournal({...newJournal, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold">الحساب المدين (Dr)</label>
                    <select value={newJournal.debit_acc} onChange={e => setNewJournal({...newJournal, debit_acc: e.target.value})} className="w-full bg-secondary p-2 rounded-lg text-sm border-0 h-10">
                      <option value="">اختر حساب</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold">الحساب الدائن (Cr)</label>
                    <select value={newJournal.credit_acc} onChange={e => setNewJournal({...newJournal, credit_acc: e.target.value})} className="w-full bg-secondary p-2 rounded-lg text-sm border-0 h-10">
                      <option value="">اختر حساب</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">القيمة المالية</label>
                  <Input type="number" value={newJournal.amount} onChange={e => setNewJournal({...newJournal, amount: Number(e.target.value)})} className="h-12 text-2xl font-black text-center" />
                </div>
                <Button onClick={handleAddManualJournal} disabled={loading} className="w-full gradient-bg border-0 h-12 text-lg font-bold">
                  {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'ترحيل القيد لدفتر الأستاذ'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background overflow-hidden" dir="rtl">
      {/* Sidebar Navigation */}
      <div className="w-64 border-l bg-card/40 backdrop-blur-xl p-4 flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-2xl">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
            <Landmark className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-md tracking-tight">Auditry ERP</span>
        </div>

        <div className="flex-1 space-y-7">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] px-3 mb-3">{section.title}</p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id as any)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all hover:bg-primary/10 hover:text-primary group relative overflow-hidden"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main Command Center */}
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
        <div className="max-w-6xl mx-auto space-y-10">
          <header className="flex items-end justify-between border-b pb-6 border-border/50">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold font-display tracking-tight text-foreground">مركز التحكم المالي</h1>
              <p className="text-muted-foreground text-lg">مرحباً بك في لوحة الإدارة المتكاملة لمؤسستك</p>
            </div>
            <div className="flex gap-3">
               <Button variant="outline" className="gap-2"><Settings className="w-4 h-4" /> الإعدادات</Button>
               <Button className="gradient-bg text-primary-foreground border-0 gap-2 shadow-lg shadow-primary/20" onClick={() => setShowManualJournal(true)}><Plus className="w-4 h-4" /> قيد جديد</Button>
            </div>
          </header>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'إجمالي السيولة', val: accounts.filter(a => a.is_cash_account || a.is_bank_account).reduce((s, a) => s + (a.current_balance || 0), 0).toLocaleString(), icon: Banknote, color: 'primary' },
              { label: 'مديونية العملاء', val: accounts.find(a => a.code === '1200')?.current_balance?.toLocaleString() || '0', icon: Users, color: 'destructive' },
              { label: 'التزامات الموردين', val: accounts.find(a => a.code === '2100')?.current_balance?.toLocaleString() || '0', icon: Store, color: 'amber' },
              { label: 'إجمالي الأصول', val: assets.reduce((s, a) => s + (a.current_value || 0), 0).toLocaleString(), icon: Landmark, color: 'emerald' }
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-6 group hover:translate-y-[-4px] transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</p>
                <h3 className="text-xl font-bold tracking-tight">{stat.val} <span className="text-[10px] font-normal text-muted-foreground opacity-60">{currency}</span></h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Real GL Activity Feed */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-xl flex items-center gap-2 tracking-tight">
                  <History className="w-5 h-5 text-primary" /> سجل العمليات المالية الحية
                </h3>
                <Button variant="link" className="text-xs" onClick={() => setActiveModule('ledger')}>عرض كافة القيود</Button>
              </div>
              <div className="glass-card divide-y divide-border/30 overflow-hidden shadow-xl shadow-black/5">
                {journalEntries?.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="p-5 flex items-center justify-between hover:bg-muted/40 transition-all cursor-pointer group">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-inner">
                        <ScaleIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold">{entry.description || 'عملية مالية'}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">الرقم: {entry.entry_number} • المصدر: {entry.source}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-sm text-primary">
                        {(entry.total_debit || 0).toLocaleString()} {currency}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1">{entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('ar-EG') : '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions & Metrics */}
            <div className="space-y-8">
               <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent">
                  <h4 className="font-bold mb-4 text-sm flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-amber-500" /> إجراءات محاسبية سريعة</h4>
                  <div className="grid grid-cols-2 gap-3">
                     <Button variant="secondary" onClick={() => setShowAddAsset(true)} className="text-[10px] h-16 flex-col gap-1 py-2 rounded-2xl bg-background/50 hover:bg-background shadow-sm border-0"><Truck className="w-4 h-4 text-primary" /> إضافة أصل</Button>
                     <Button variant="secondary" onClick={() => setActiveModule('hr')} className="text-[10px] h-16 flex-col gap-1 py-2 rounded-2xl bg-background/50 hover:bg-background shadow-sm border-0"><UsersRound className="w-4 h-4 text-emerald-500" /> صرف رواتب</Button>
                     <Button variant="secondary" onClick={() => setActiveModule('inventory')} className="text-[10px] h-16 flex-col gap-1 py-2 rounded-2xl bg-background/50 hover:bg-background shadow-sm border-0"><RotateCcw className="w-4 h-4 text-blue-500" /> جرد مخزني</Button>
                     <Button variant="secondary" onClick={() => setShowManualJournal(true)} className="text-[10px] h-16 flex-col gap-1 py-2 rounded-2xl bg-background/50 hover:bg-background shadow-sm border-0"><ScaleIcon className="w-4 h-4 text-amber-500" /> قيد يدوي</Button>
                  </div>
               </div>

               <div className="glass-card p-8 text-center space-y-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">توزيع المصروفات</p>
                  <div className="w-32 h-32 rounded-full border-[10px] border-primary/10 border-t-primary border-r-emerald-500 mx-auto flex items-center justify-center">
                     <span className="text-2xl font-black">74%</span>
                  </div>
                  <div className="flex justify-center gap-4 text-[10px] font-bold">
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> ثابتة</span>
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> متغيرة</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefreshCcw({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
    </svg>
  );
}
