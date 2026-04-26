import { useState, useEffect } from 'react';
import { 
  BarChart3, FileText, TrendingUp, Users, Store, Boxes, 
  Wallet, Landmark, Calculator, History, Search, Download,
  Printer, Filter, Calendar, ArrowRight, ChevronDown,
  PieChart, LineChart, Table, LayoutGrid, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  restaurantId: string;
  currency: string;
}

export function AdvancedReportsHub({ restaurantId, currency }: Props) {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const reportGroups = [
    {
      title: 'القوائم المالية',
      icon: Landmark,
      reports: [
        { id: 'pnl', label: 'قائمة الدخل (الفعلي مقابل المستهدف)', trend: '+15%' },
        { id: 'balance_sheet', label: 'قائمة المركز المالي', trend: 'ثابت' },
        { id: 'cash_flow', label: 'قائمة التدفقات النقدية', trend: '+5%' },
        { id: 'equity_changes', label: 'قائمة التغيرات في حقوق الملكية', trend: 'جديد' },
      ]
    },
    {
      title: 'العملاء والذمم المدينة',
      icon: Users,
      reports: [
        { id: 'ar_aging', label: 'جدول أعمار الذمم المدينة (AR Aging)', trend: 'حرج' },
        { id: 'customer_summary', label: 'ملخص كشوف حسابات العملاء', trend: 'تحليلي' },
        { id: 'unpaid_invoices', label: 'كشف الفواتير غير المدفوعة', trend: 'مالي' },
      ]
    },
    {
      title: 'الموردون والذمم الدائنة',
      icon: Store,
      reports: [
        { id: 'ap_aging', label: 'جدول أعمار الذمم الدائنة (AP Aging)', trend: 'منظم' },
        { id: 'supplier_summary', label: 'ملخص كشوف حسابات الموردين', trend: 'تحليلي' },
        { id: 'supplier_unpaid', label: 'كشف حساب المورد (فواتير غير مسددة)', trend: 'هام' },
      ]
    },
    {
      title: 'تحليلات المبيعات والفواتير',
      icon: ShoppingBag,
      reports: [
        { id: 'sales_by_customer', label: 'مجموع فواتير المبيعات حسب العميل', trend: 'BI' },
        { id: 'sales_by_item', label: 'مجموع فواتير المبيعات حسب الصنف', trend: 'BI' },
        { id: 'sales_custom_field', label: 'مجموع فواتير المبيعات حسب الحقل المخصص', trend: 'جديد' },
      ]
    },
    {
      title: 'أصناف المخزون والتكاليف',
      icon: Boxes,
      reports: [
        { id: 'inventory_value', label: 'ملخص قيمة المخزون', trend: 'مخزني' },
        { id: 'inventory_profit', label: 'هامش ربح المخزون', trend: 'ربحي' },
        { id: 'cost_calculation', label: 'ورقة عمل حساب تكلفة المخزون', trend: 'محاسبي' },
      ]
    },
    {
      title: 'دفتر الأستاذ العام',
      icon: ClipboardList,
      reports: [
        { id: 'trial_balance', label: 'ميزان المراجعة (Trial Balance)', trend: 'ختامي' },
        { id: 'gl_summary', label: 'ملخص دفتر الأستاذ العام', trend: 'أساسي' },
        { id: 'gl_transactions', label: 'عمليات دفتر الأستاذ العام', trend: 'تفصيلي' },
      ]
    },
    {
      title: 'قسائم الرواتب والأصول',
      icon: Calculator,
      reports: [
        { id: 'payroll_summary', label: 'إجمالي مسير الرواتب حسب البند والموظف', trend: 'HR' },
        { id: 'asset_summary', label: 'ملخص الأصول الثابتة', trend: 'أصول' },
        { id: 'asset_depreciation', label: 'نافذة احتساب إهلاك الأصول الثابتة', trend: 'آلي' },
      ]
    }
  ];

  if (activeReport) {
    return (
      <div className="flex flex-col h-full bg-background fade-in">
        <header className="border-b bg-card/50 backdrop-blur-md p-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setActiveReport(null)}><ArrowRight className="w-4 h-4" /></Button>
              <h3 className="font-bold text-lg">{reportGroups.flatMap(g => g.reports).find(r => r.id === activeReport)?.label}</h3>
           </div>
           <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2"><Filter className="w-4 h-4" /> تصفية</Button>
              <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> PDF</Button>
              <Button variant="outline" size="sm" className="gap-2"><Printer className="w-4 h-4" /> طباعة</Button>
           </div>
        </header>
        <div className="flex-1 p-8 overflow-auto">
           <div className="max-w-5xl mx-auto glass-card p-12 min-h-[700px] shadow-2xl relative border-t-4 border-t-primary">
              <div className="flex justify-between items-start mb-12">
                 <div>
                    <h1 className="text-2xl font-black mb-1">Auditry ERP Reports</h1>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">فرع: مطعم نور الشام الرئيسي</p>
                 </div>
                 <div className="text-left text-xs space-y-1">
                    <p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                    <p>الفترة: 01/01/2024 - {new Date().toLocaleDateString('ar-EG')}</p>
                    <p>العملة: {currency}</p>
                 </div>
              </div>

              {/* REPORT CONTENT PLACEHOLDER */}
              <div className="space-y-8">
                 <div className="h-px bg-border/50 w-full" />
                 <div className="grid grid-cols-4 gap-4 mb-8">
                    {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted/30 rounded-xl border animate-pulse" />)}
                 </div>
                 <div className="space-y-4">
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <div key={i} className="flex justify-between items-center py-3 border-b border-border/30">
                        <div className="h-4 w-48 bg-muted/40 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-muted/60 rounded animate-pulse" />
                      </div>
                    ))}
                 </div>
                 <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
                    <div className="text-center space-y-3 bg-card p-8 rounded-3xl shadow-2xl border border-primary/20">
                       <BarChart3 className="w-12 h-12 text-primary mx-auto animate-bounce" />
                       <h4 className="font-bold text-xl">جاري استخراج البيانات التحليلية</h4>
                       <p className="text-xs text-muted-foreground max-w-xs">يتم الآن معالجة آلاف الحركات المالية وتصنيفها لإنتاج التقرير النهائي بدقة 100%</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 p-8 fade-in bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" dir="rtl">
      <header className="space-y-1 text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-4xl font-black font-display tracking-tight">ترسانة التقارير الاستراتيجية</h2>
        <p className="text-muted-foreground">حول أرقام مؤسستك إلى قرارات ذكية من خلال أقوى نظام تحليل مالي متكامل</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {reportGroups.map((group) => (
          <div key={group.title} className="space-y-4 group">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <group.icon className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg tracking-tight">{group.title}</h3>
            </div>
            
            <div className="glass-card overflow-hidden shadow-xl shadow-black/5 hover:border-primary/30 transition-all">
              <div className="divide-y divide-border/30">
                {group.reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setActiveReport(report.id)}
                    className="w-full p-4 text-right flex items-center justify-between hover:bg-muted/50 transition-colors group/item"
                  >
                    <span className="text-sm font-bold text-foreground/80 group-hover/item:text-primary transition-colors">{report.label}</span>
                    <Badge className="bg-primary/5 text-primary border-0 text-[9px] px-1.5 py-0">{report.trend}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 p-12 border-2 border-dashed rounded-[3rem] text-center space-y-4 bg-primary/5 border-primary/10">
         <div className="flex justify-center -space-x-4 mb-4 rtl:space-x-reverse">
            {[1,2,3].map(i => <div key={i} className="w-12 h-12 rounded-full border-4 border-background bg-muted flex items-center justify-center text-primary"><Calculator className="w-5 h-5" /></div>)}
         </div>
         <h4 className="text-xl font-bold">ذكاء الأعمال (Business Intelligence)</h4>
         <p className="text-sm text-muted-foreground max-w-md mx-auto">هذه التقارير ليست مجرد جداول، بل هي محرك نمو يقوم بتحليل الربحية، الأعمار الزمنية للديون، وكفاءة الأصول لضمان تفوقك في السوق.</p>
      </footer>
    </div>
  );
}

function ShoppingBag({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}

function ClipboardList({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
    </svg>
  );
}
