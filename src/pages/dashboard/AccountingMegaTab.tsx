import { useState } from 'react';
import { 
  Users, Store, Wallet, DollarSign, TrendingUp, RotateCcw, 
  ChevronRight, ArrowRight, FileText, Landmark, Building2,
  ArrowUpRight, ArrowDownLeft, RefreshCcw, ShoppingBag, 
  Truck, Package, ClipboardList, Briefcase, UsersRound,
  Calculator, History, Settings, BarChart3, HardDrive,
  Banknote, Receipt, Layers, Boxes, Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomersTab } from './CustomersTab';
import { SuppliersTab } from './SuppliersTab';
import { ExpensesTab } from './ExpensesTab';
import { FinancialsTab } from './FinancialsTab';
import { BOMManager } from './BOMManager';

interface Props {
  restaurantId: string;
  currency: string;
}

type SubModule = 'overview' | 'bank_cash' | 'sales' | 'purchases' | 'inventory' | 'production' | 'hr' | 'assets' | 'ledger' | 'reports';

export function AccountingMegaTab({ restaurantId, currency }: Props) {
  const [activeModule, setActiveModule] = useState<SubModule>('overview');

  const sections = [
    {
      title: 'النقدية والبنوك',
      icon: Banknote,
      items: [
        { id: 'bank_accounts', label: 'حسابات البنك والنقدية', icon: Building2, count: 2 },
        { id: 'receipts', label: 'المقبوضات', icon: ArrowDownLeft, count: 216 },
        { id: 'payments', label: 'المدفوعات', icon: ArrowUpRight, count: 3007 },
        { id: 'transfers', label: 'تحويلات بين الحسابات', icon: RefreshCcw, count: 115 },
      ]
    },
    {
      title: 'المبيعات والعملاء',
      icon: ShoppingBag,
      items: [
        { id: 'customers', label: 'العملاء', icon: Users, count: 29 },
        { id: 'sales_invoices', label: 'فواتير البيع', icon: Receipt, count: 438 },
        { id: 'credit_notes', label: 'الإشعارات الدائنة', icon: FileText, count: 0 },
        { id: 'delivery_notes', label: 'سندات التسليم', icon: Truck, count: 0 },
      ]
    },
    {
      title: 'المشتريات والموردين',
      icon: Store,
      items: [
        { id: 'suppliers', label: 'الموردون', icon: Store, count: 53 },
        { id: 'purchase_invoices', label: 'فواتير الشراء', icon: Receipt, count: 775 },
        { id: 'debit_notes', label: 'الإشعارات المدينة', icon: FileText, count: 0 },
        { id: 'goods_receipts', label: 'سندات استلام البضائع', icon: Package, count: 0 },
      ]
    },
    {
      title: 'المخزون والإنتاج',
      icon: Layers,
      items: [
        { id: 'inventory_items', label: 'أصناف المخزون', icon: Boxes, count: 117 },
        { id: 'inventory_transfers', label: 'تحويلات المخزون', icon: RefreshCcw, count: 0 },
        { id: 'inventory_writeoffs', label: 'شطب المخزون', icon: Ban, count: 0 },
        { id: 'production_orders', label: 'أوامر الإنتاج (BOM)', icon: HardDrive, count: 235 },
      ]
    },
    {
      title: 'الموارد البشرية والمشاريع',
      icon: UsersRound,
      items: [
        { id: 'projects', label: 'المشاريع', icon: Briefcase, count: 1 },
        { id: 'staff', label: 'الموظفون', icon: UsersRound, count: 0 },
        { id: 'payslips', label: 'قسائم الرواتب', icon: History, count: 0 },
      ]
    },
    {
      title: 'الأصول والقيود',
      icon: Calculator,
      items: [
        { id: 'fixed_assets', label: 'الأصول الثابتة', icon: Truck, count: 82 },
        { id: 'capital_accounts', label: 'حسابات رأس المال', icon: Landmark, count: 0 },
        { id: 'journal_entries', label: 'القيود المحاسبية', icon: Scale, count: 90 },
      ]
    }
  ];

  if (activeModule !== 'overview') {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveModule('overview')} className="gap-2 text-muted-foreground hover:text-primary">
          <ArrowRight className="w-4 h-4" /> العودة للوحة ERP الرئيسية
        </Button>
        {activeModule === 'customers' && <CustomersTab restaurantId={restaurantId} currency={currency} />}
        {activeModule === 'suppliers' && <SuppliersTab restaurantId={restaurantId} currency={currency} />}
        {activeModule === 'payments' && <ExpensesTab restaurantId={restaurantId} currency={currency} />}
        {activeModule === 'receipts' && <ExpensesTab restaurantId={restaurantId} currency={currency} />}
        {activeModule === 'financials' && <FinancialsTab restaurantId={restaurantId} currency={currency} />}
        
        {/* Placeholder for others */}
        {!['customers', 'suppliers', 'payments', 'receipts', 'financials'].includes(activeModule) && (
          <div className="glass-card p-6 min-h-[600px] flex items-center justify-center border-dashed border-2">
            <div className="text-center space-y-3">
              <Landmark className="w-12 h-12 text-primary/20 mx-auto" />
              <h3 className="text-xl font-bold">هذا المودول قيد التفعيل</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">جاري ربط كافة الحسابات والبيانات التاريخية لهذا القسم المحاسبي بشكل آلي</p>
              <Button variant="outline" onClick={() => setActiveModule('overview')}>رجوع</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background" dir="rtl">
      {/* Sidebar-like Navigation inside Tab */}
      <div className="w-72 border-l bg-card/50 backdrop-blur-md p-4 overflow-y-auto hidden lg:block custom-scrollbar">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
            <Landmark className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Ventro ERP</span>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-3 mb-2">{section.title}</p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id as any)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all hover:bg-primary/5 hover:text-primary group"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    <span>{item.label}</span>
                  </div>
                  {item.count > 0 && (
                    <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
          
          <div className="pt-4 border-t border-border/50">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-all">
              <BarChart3 className="w-4 h-4" /> التقارير والختام
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-all">
              <Settings className="w-4 h-4" /> الإعدادات المالية
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold font-display tracking-tight">نظام الإدارة المالية المتكامل</h1>
            <p className="text-muted-foreground">مرحباً بك في مركز التحكم المحاسبي - راقب نمو أعمالك بدقة</p>
          </header>

          {/* Quick Dashboard Overviews */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary"><Wallet className="w-5 h-5" /></div>
                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0">+12.5%</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium">إجمالي السيولة النقدية</p>
              <h3 className="text-2xl font-bold mt-1">45,280.00 <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
            </div>

            <div className="glass-card p-6 bg-gradient-to-br from-destructive/5 to-transparent border-destructive/10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive"><Users className="w-5 h-5" /></div>
                <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0">-5.2%</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium">ديون العملاء المعلقة</p>
              <h3 className="text-2xl font-bold mt-1">12,450.00 <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
            </div>

            <div className="glass-card p-6 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><Store className="w-5 h-5" /></div>
                <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0">ثابت</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium">التزامات الموردين</p>
              <h3 className="text-2xl font-bold mt-1">8,900.00 <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
            </div>
          </div>

          {/* Business Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 px-1">
                <History className="w-5 h-5 text-primary" /> آخر الحركات المالية
              </h3>
              <div className="glass-card divide-y divide-border/50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        i % 2 === 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                      )}>
                        {i % 2 === 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{i % 2 === 0 ? 'مقبوضات من عميل' : 'سداد فاتورة مورد'}</p>
                        <p className="text-[10px] text-muted-foreground">اليوم، 10:45 صباحاً — قيد رقم #JV-004{i}</p>
                      </div>
                    </div>
                    <p className={cn(
                      "font-bold text-sm",
                      i % 2 === 0 ? "text-emerald-500" : "text-destructive"
                    )}>
                      {i % 2 === 0 ? '+' : '-'}{i * 1250} {currency}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 px-1">
                <Calculator className="w-5 h-5 text-primary" /> كفاءة الأصول
              </h3>
              <div className="glass-card p-6 h-[290px] flex flex-col items-center justify-center text-center">
                 <div className="w-32 h-32 rounded-full border-8 border-primary/10 border-t-primary flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold">85%</span>
                 </div>
                 <p className="font-bold">معدل دوران الأصول</p>
                 <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">أداء مالي ممتاز يشير إلى كفاءة عالية في إدارة رأس المال</p>
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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

function Badge({ children, className, variant }: { children: React.ReactNode, className?: string, variant?: string }) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center justify-center",
      className
    )}>
      {children}
    </span>
  );
}
