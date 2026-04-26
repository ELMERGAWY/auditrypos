import { useState, useEffect } from 'react';
import { 
  Users, Store, Wallet, DollarSign, TrendingUp, RotateCcw, 
  ChevronRight, ArrowRight, FileText, Landmark, Building2,
  ArrowUpRight, ArrowDownLeft, RefreshCcw, ShoppingBag, 
  Truck, Package, ClipboardList, Briefcase, UsersRound,
  Calculator, History, Settings, BarChart3, HardDrive,
  Banknote, Receipt, Layers, Boxes, Ban, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomersTab } from './CustomersTab';
import { SuppliersTab } from './SuppliersTab';
import { ExpensesTab } from './ExpensesTab';
import { FinancialsTab } from './FinancialsTab';
import { BOMManager } from './BOMManager';
import { InventoryTab } from './InventoryTab';
import { StaffTab } from './StaffTab';
import { CustomReportBuilder } from './CustomReportBuilder';

interface Props {
  restaurantId: string;
  currency: string;
}

type SubModule = 'overview' | 'bank_cash' | 'customers' | 'suppliers' | 'expenses' | 'inventory' | 'production' | 'hr' | 'assets' | 'ledger' | 'reports' | 'financials';

export function AccountingMegaTab({ restaurantId, currency }: Props) {
  const [activeModule, setActiveModule] = useState<SubModule>('overview');
  const [bizName, setBizName] = useState('نظام الإدارة المتكامل');

  const sections = [
    {
      title: 'النقدية والبنوك',
      icon: Banknote,
      items: [
        { id: 'expenses', label: 'المقبوضات والمدفوعات', icon: Banknote, count: 3223 },
        { id: 'bank_cash', label: 'حسابات البنك والخزينة', icon: Building2, count: 2 },
      ]
    },
    {
      title: 'المبيعات والمشتريات',
      icon: ShoppingBag,
      items: [
        { id: 'customers', label: 'حسابات العملاء', icon: Users, count: 29 },
        { id: 'suppliers', label: 'حسابات الموردين', icon: Store, count: 53 },
      ]
    },
    {
      title: 'المخزون والإنتاج',
      icon: Layers,
      items: [
        { id: 'inventory', label: 'أصناف المخزون', icon: Boxes, count: 117 },
        { id: 'production', label: 'أوامر الإنتاج والتكاليف', icon: HardDrive, count: 235 },
      ]
    },
    {
      title: 'الإدارة والمالية',
      icon: Calculator,
      items: [
        { id: 'financials', label: 'القوائم المالية', icon: Landmark, count: 0 },
        { id: 'assets', label: 'الأصول الثابتة', icon: Truck, count: 82 },
        { id: 'hr', label: 'الموظفون والرواتب', icon: UsersRound, count: 0 },
      ]
    },
    {
      title: 'التقارير المتقدمة',
      icon: BarChart3,
      items: [
        { id: 'reports', label: 'مولد التقارير المخصص', icon: FileText, count: 0 },
        { id: 'ledger', label: 'القيود والدفاتر', icon: ClipboardList, count: 90 },
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
          {activeModule === 'reports' && <CustomReportBuilder restaurantId={restaurantId} currency={currency} />}
          
          {/* Fallback for other modules */}
          {!['customers', 'suppliers', 'expenses', 'financials', 'inventory', 'production', 'hr', 'reports'].includes(activeModule) && (
            <div className="glass-card p-12 text-center space-y-4 border-dashed border-2 border-primary/20 max-w-2xl mx-auto mt-20">
              <Landmark className="w-16 h-16 text-primary/10 mx-auto" />
              <h3 className="text-2xl font-bold">تكامل البيانات المالية</h3>
              <p className="text-muted-foreground">يتم الآن مزامنة كافة القيود المحاسبية والارتباطات لهذا القسم لضمان دقة التقارير المالية والختامية.</p>
              <Button variant="outline" onClick={() => setActiveModule('overview')}>رجوع للرئيسية</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background overflow-hidden" dir="rtl">
      {/* Sidebar Navigation */}
      <div className="w-64 border-l bg-card/40 backdrop-blur-xl p-4 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
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
                  {item.count > 0 && (
                    <span className="text-[9px] font-bold bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary">
                      {item.count}
                    </span>
                  )}
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
               <Button className="gradient-bg text-primary-foreground border-0 gap-2 shadow-lg shadow-primary/20"><FileText className="w-4 h-4" /> تصدير ميزان المراجعة</Button>
            </div>
          </header>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'إجمالي السيولة', val: '128,450.00', icon: Banknote, color: 'primary', trend: '+8%' },
              { label: 'صافي الربح', val: '42,900.00', icon: TrendingUp, color: 'emerald', trend: '+12%' },
              { label: 'مديونية العملاء', val: '15,200.00', icon: Users, color: 'destructive', trend: '-2%' },
              { label: 'التزامات الموردين', val: '9,150.00', icon: Store, color: 'amber', trend: '0%' }
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-6 group hover:translate-y-[-4px] transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-${stat.color}-500/10 text-${stat.color}-500`}>{stat.trend}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</p>
                <h3 className="text-xl font-bold tracking-tight">{stat.val} <span className="text-[10px] font-normal text-muted-foreground opacity-60">{currency}</span></h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Real-time Activity */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-xl flex items-center gap-2 tracking-tight">
                  <History className="w-5 h-5 text-primary" /> سجل العمليات المالية اللحظي
                </h3>
                <Button variant="link" className="text-xs">عرض الكل</Button>
              </div>
              <div className="glass-card divide-y divide-border/30 overflow-hidden shadow-xl shadow-black/5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-5 flex items-center justify-between hover:bg-muted/40 transition-all cursor-pointer">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${i % 2 === 0 ? "bg-emerald-500/10 text-emerald-500 shadow-inner" : "bg-destructive/10 text-destructive shadow-inner"}`}>
                        {i % 2 === 0 ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold">{i % 2 === 0 ? 'مقبوضات من عميل' : 'سداد فاتورة مورد'}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">الرقم المرجعي: JV-240426-00{i} • بواسطة: المدير</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={`font-black text-sm ${i % 2 === 0 ? "text-emerald-500" : "text-destructive"}`}>
                        {i % 2 === 0 ? '+' : '-'}{(i * 850).toLocaleString()} {currency}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1">منذ {i*2} دقيقة</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions & Metrics */}
            <div className="space-y-8">
               <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent">
                  <h4 className="font-bold mb-4 text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> إجراءات محاسبية سريعة</h4>
                  <div className="grid grid-cols-2 gap-3">
                     <Button variant="secondary" className="text-[10px] h-16 flex-col gap-1 py-2 rounded-2xl bg-background/50 hover:bg-background shadow-sm border-0"><Calculator className="w-4 h-4" /> إهلاك أصول</Button>
                     <Button variant="secondary" className="text-[10px] h-16 flex-col gap-1 py-2 rounded-2xl bg-background/50 hover:bg-background shadow-sm border-0"><UsersRound className="w-4 h-4" /> صرف رواتب</Button>
                     <Button variant="secondary" className="text-[10px] h-16 flex-col gap-1 py-2 rounded-2xl bg-background/50 hover:bg-background shadow-sm border-0"><RotateCcw className="w-4 h-4" /> جرد مخزني</Button>
                     <Button variant="secondary" className="text-[10px] h-16 flex-col gap-1 py-2 rounded-2xl bg-background/50 hover:bg-background shadow-sm border-0"><FileText className="w-4 h-4" /> تسوية بنكية</Button>
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

function Zap({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4Z"/>
    </svg>
  );
}
