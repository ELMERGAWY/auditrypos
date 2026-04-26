import { useState, useEffect } from 'react';
import { 
  Users, Store, Wallet, DollarSign, TrendingUp, RotateCcw, 
  ChevronRight, ArrowRight, FileText, Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomersTab } from './CustomersTab';
import { SuppliersTab } from './SuppliersTab';
import { ExpensesTab } from './ExpensesTab';
import { FinancialsTab } from './FinancialsTab';

interface Props {
  restaurantId: string;
  currency: string;
}

export function AccountingMegaTab({ restaurantId, currency }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'customers' | 'suppliers' | 'expenses' | 'financials'>('overview');

  const menu = [
    { id: 'customers', label: 'حسابات العملاء', icon: Users, desc: 'إدارة الديون، التحصيل، وكشوف الحسابات' },
    { id: 'suppliers', label: 'حسابات الموردين', icon: Store, desc: 'فواتير المشتريات والمدفوعات للموردين' },
    { id: 'expenses', label: 'المصروفات العامة', icon: Wallet, desc: 'تسجيل المصاريف اليومية والرواتب والمرافق' },
    { id: 'financials', label: 'التقارير المالية', icon: Landmark, desc: 'قائمة الدخل، الميزانية، والأرباح والخسائر' },
  ];

  if (activeSubTab !== 'overview') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveSubTab('overview')} className="gap-2">
          <ArrowRight className="w-4 h-4" /> العودة للقائمة المحاسبية
        </Button>
        {activeSubTab === 'customers' && <CustomersTab restaurantId={restaurantId} currency={currency} />}
        {activeSubTab === 'suppliers' && <SuppliersTab restaurantId={restaurantId} currency={currency} />}
        {activeSubTab === 'expenses' && <ExpensesTab restaurantId={restaurantId} currency={currency} />}
        {activeSubTab === 'financials' && <FinancialsTab restaurantId={restaurantId} currency={currency} />}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
          <Landmark className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-display">المحاسبة والمالية</h2>
          <p className="text-sm text-muted-foreground">إدارة كافة العمليات المالية والحسابات من مكان واحد</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menu.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSubTab(item.id as any)}
            className="glass-card p-6 text-right hover:border-primary/50 transition-all group relative overflow-hidden"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-[-4px] transition-all" />
            </div>
          </button>
        ))}
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="p-4 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-6 h-6 text-success mb-2" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground">صافي الربح التقديري</p>
          <p className="text-xl font-bold">-- {currency}</p>
        </div>
        <div className="p-4 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center">
          <Users className="w-6 h-6 text-destructive mb-2" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground">إجمالي ديون العملاء</p>
          <p className="text-xl font-bold">-- {currency}</p>
        </div>
        <div className="p-4 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center">
          <RotateCcw className="w-6 h-6 text-warning mb-2" />
          <p className="text-[10px] uppercase font-bold text-muted-foreground">التزامات الموردين</p>
          <p className="text-xl font-bold">-- {currency}</p>
        </div>
      </div>
    </div>
  );
}
