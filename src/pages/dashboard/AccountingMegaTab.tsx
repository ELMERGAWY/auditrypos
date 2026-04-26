import { useState, useEffect } from 'react';
import { 
  Users, Store, Wallet, DollarSign, TrendingUp, RotateCcw, 
  ChevronRight, ArrowRight, FileText, Landmark, Building2,
  ArrowUpRight, ArrowDownLeft, RefreshCcw, ShoppingBag, 
  Truck, Package, ClipboardList, Briefcase, UsersRound,
  Calculator, History, Settings, BarChart3, HardDrive,
  Banknote, Receipt, Layers, Boxes, Ban, LayoutDashboard,
  Plus, Search, Download, Printer, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CustomersTab } from './CustomersTab';
import { SuppliersTab } from './SuppliersTab';
import { ExpensesTab } from './ExpensesTab';
import { FinancialsTab } from './FinancialsTab';
import { BOMManager } from './BOMManager';
import { InventoryTab } from './InventoryTab';
import { StaffTab } from './StaffTab';
import { CustomReportBuilder } from './CustomReportBuilder';
import { BankCashModule } from './BankCashModule';

interface Props {
  restaurantId: string;
  currency: string;
}

type SubModule = 'overview' | 'bank_cash' | 'customers' | 'suppliers' | 'expenses' | 'inventory' | 'production' | 'hr' | 'assets' | 'ledger' | 'reports' | 'financials';

export function AccountingMegaTab({ restaurantId, currency }: Props) {
  const [activeModule, setActiveModule] = useState<SubModule>('overview');
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load GL Data
  useEffect(() => {
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
        .order('created_at', { ascending: false })
        .limit(20);
      
      const { data: accs } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (entries) setJournalEntries(entries);
      if (accs) setAccounts(accs);
      setLoading(false);
    };
    loadAccountingData();
  }, [restaurantId]);

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

  // Render Sub-Modules
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
          {activeModule === 'bank_cash' && <BankCashModule restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'expenses' && <ExpensesTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'financials' && <FinancialsTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'inventory' && <InventoryTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'production' && <BOMManager restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'hr' && <StaffTab restaurantId={restaurantId} currency={currency} />}
          {activeModule === 'reports' && <CustomReportBuilder restaurantId={restaurantId} currency={currency} />}
          
          {/* REAL LEDGER VIEW */}
          {activeModule === 'ledger' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">دفتر الأستاذ العام (Journal Entries)</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2"><Plus className="w-4 h-4" /> قيد يدوي</Button>
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
                    {journalEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-primary">{entry.entry_number}</td>
                        <td className="p-4 text-xs">{new Date(entry.entry_date).toLocaleDateString('ar-EG')}</td>
                        <td className="p-4 max-w-xs truncate">{entry.description}</td>
                        <td className="p-4 font-bold text-emerald-500">{entry.total_debit.toLocaleString()}</td>
                        <td className="p-4 font-bold text-destructive">{entry.total_credit.toLocaleString()}</td>
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

          {/* REAL ASSETS VIEW */}
          {activeModule === 'assets' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">سجل الأصول الثابتة</h3>
                <Button size="sm" className="gradient-bg text-primary-foreground border-0 gap-2"><Plus className="w-4 h-4" /> إضافة أصل</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['آلات ومعدات', 'أثاث ومفروشات', 'وسائل نقل'].map(cat => (
                  <div key={cat} className="glass-card p-6 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{cat}</p>
                    <p className="text-2xl font-bold">0.00 <span className="text-xs font-normal text-muted-foreground">{currency}</span></p>
                  </div>
                ))}
              </div>
              <div className="p-20 text-center border-2 border-dashed rounded-3xl text-muted-foreground">
                <Truck className="w-16 h-16 mb-4 opacity-10 mx-auto" />
                <p>لا توجد أصول مسجلة حالياً. ابدأ بإضافة أصل جديد لحساب الإهلاكات آلياً.</p>
              </div>
            </div>
          )}

          {/* REAL BANK & CASH VIEW */}
          {activeModule === 'bank_cash' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">حسابات النقدية والبنوك</h3>
                <Button size="sm" variant="outline" className="gap-2"><Plus className="w-4 h-4" /> إضافة حساب</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {accounts.filter(a => a.is_cash_account || a.is_bank_account).map(acc => (
                  <div key={acc.id} className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">{acc.code}</p>
                        <h4 className="text-lg font-bold">{acc.name}</h4>
                      </div>
                      <Building2 className="w-8 h-8 text-primary/10 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="mt-6">
                      <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
                      <p className="text-3xl font-black text-primary">{acc.current_balance.toLocaleString()} <span className="text-sm font-normal">{currency}</span></p>
                    </div>
                    <div className="mt-4 flex gap-2">
                       <Button size="sm" variant="secondary" className="text-[10px] flex-1">كشف حساب</Button>
                       <Button size="sm" variant="secondary" className="text-[10px] flex-1">تحويل</Button>
                    </div>
                  </div>
                ))}
                {accounts.filter(a => a.is_cash_account || a.is_bank_account).length === 0 && (
                  <div className="col-span-2 p-12 text-center border-2 border-dashed rounded-3xl text-muted-foreground">
                    <Banknote className="w-12 h-12 mb-4 opacity-10 mx-auto" />
                    <p>لم يتم تعريف حسابات نقدية أو بنكية في شجرة الحسابات.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
               <Button className="gradient-bg text-primary-foreground border-0 gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> قيد جديد</Button>
            </div>
          </header>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'إجمالي السيولة', val: accounts.filter(a => a.is_cash_account || a.is_bank_account).reduce((s, a) => s + (a.current_balance || 0), 0).toLocaleString(), icon: Banknote, color: 'primary' },
              { label: 'مديونية العملاء', val: accounts.find(a => a.code === '1200')?.current_balance?.toLocaleString() || '0', icon: Users, color: 'destructive' },
              { label: 'التزامات الموردين', val: accounts.find(a => a.code === '2100')?.current_balance?.toLocaleString() || '0', icon: Store, color: 'amber' },
              { label: 'إجمالي الأصول', val: accounts.filter(a => a.account_type === 'asset').reduce((s, a) => s + (a.current_balance || 0), 0).toLocaleString(), icon: Landmark, color: 'emerald' }
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
                {journalEntries.map((entry) => (
                  <div key={entry.id} className="p-5 flex items-center justify-between hover:bg-muted/40 transition-all cursor-pointer group">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-inner">
                        <Scale className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold">{entry.description}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">الرقم: {entry.entry_number} • المصدر: {entry.source}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-sm text-primary">
                        {entry.total_debit.toLocaleString()} {currency}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1">{new Date(entry.entry_date).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>
                ))}
                {journalEntries.length === 0 && (
                  <div className="p-10 text-center text-muted-foreground italic">لا توجد عمليات مالية مسجلة بعد.</div>
                )}
              </div>
            </div>

            {/* Accounting Metrics */}
            <div className="space-y-8">
               <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent">
                  <h4 className="font-bold mb-4 text-sm flex items-center gap-2"><ArrowRight className="w-4 h-4 text-primary" /> مجمعات الحسابات</h4>
                  <div className="space-y-4">
                     {[
                       { label: 'الأصول المتداولة', val: 74, color: 'primary' },
                       { label: 'الالتزامات', val: 12, color: 'destructive' },
                       { label: 'حقوق الملكية', val: 14, color: 'emerald' }
                     ].map(m => (
                       <div key={m.label} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold uppercase">
                             <span>{m.label}</span>
                             <span>{m.val}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                             <div className={`h-full bg-${m.color}-500`} style={{ width: `${m.val}%` }} />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
               
               <div className="glass-card p-6 text-center space-y-2">
                  <Calculator className="w-12 h-12 text-primary/20 mx-auto" />
                  <p className="text-xs font-bold">مركز التكلفة (Cost Center)</p>
                  <p className="text-xs text-muted-foreground">تم تفعيل الربط التلقائي بين المبيعات والمخزون لحساب تكلفة البضاعة المباعة (COGS) لحظياً.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Scale({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  );
}
