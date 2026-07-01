// @ts-nocheck
import { lazy, Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone, FileText, FileCheck, Workflow, DollarSign, Layers, Briefcase, Package
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const MarketingServices = lazy(() => import('./MarketingServices').then(m => ({ default: m.MarketingServices })));
const MarketingQuotes = lazy(() => import('./MarketingQuotes').then(m => ({ default: m.MarketingQuotes })));
const MarketingContracts = lazy(() => import('./MarketingContracts').then(m => ({ default: m.MarketingContracts })));
const MarketingWorkflow = lazy(() => import('./MarketingWorkflow').then(m => ({ default: m.MarketingWorkflow })));
const MarketingAccounting = lazy(() => import('./MarketingAccounting'));
const MarketingProjects = lazy(() => import('./MarketingProjects').then(m => ({ default: m.MarketingProjects })));
const ServiceDeliverables = lazy(() => import('./ServiceDeliverables').then(m => ({ default: m.ServiceDeliverables })));

type SubTab = 'services' | 'quotes' | 'contracts' | 'projects' | 'workflow' | 'deliverables' | 'accounting';

const TABS: { id: SubTab; label: string; icon: any; color: string }[] = [
  { id: 'services', label: 'الخدمات والأسعار', icon: Layers, color: 'text-blue-500' },
  { id: 'quotes', label: 'عروض الأسعار', icon: FileText, color: 'text-cyan-500' },
  { id: 'contracts', label: 'العقود', icon: FileCheck, color: 'text-emerald-500' },
  { id: 'projects', label: 'المشاريع', icon: Briefcase, color: 'text-indigo-500' },
  { id: 'workflow', label: 'سير العمل', icon: Workflow, color: 'text-purple-500' },
  { id: 'deliverables', label: 'المخرجات', icon: Package, color: 'text-orange-500' },
  { id: 'accounting', label: 'المحاسبة والربحية', icon: DollarSign, color: 'text-green-600' },
];

export function MarketingHub(props: any) {
  const [sub, setSub] = useState<SubTab>('projects');

  const renderSub = () => {
    switch (sub) {
      case 'services': return <MarketingServices {...props} />;
      case 'quotes': return <MarketingQuotes {...props} />;
      case 'contracts': return <MarketingContracts {...props} />;
      case 'projects': return <MarketingProjects {...props} />;
      case 'workflow': return <MarketingWorkflow {...props} />;
      case 'deliverables': return <ServiceDeliverables {...props} />;
      case 'accounting': return <MarketingAccounting {...props} />;
    }
  };

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <header className="flex items-center gap-3">
        <div className="p-2 rounded-2xl gradient-bg text-white shadow-lg">
          <Megaphone className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black">مركز إدارة الوكالة التسويقية</h2>
          <p className="text-muted-foreground text-sm">كل ما يخص عمل الوكالة — عروض، عقود، مشاريع، سير عمل، ومحاسبة — تحت مظلة واحدة.</p>
        </div>
      </header>

      {/* Sub Nav */}
      <Card className="p-2 sticky top-0 z-20 backdrop-blur bg-card/95">
        <div className="flex flex-wrap gap-1">
          {TABS.map(t => {
            const Active = sub === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSub(t.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  Active ? 'gradient-bg text-white shadow-lg' : 'hover:bg-secondary text-muted-foreground'
                }`}
              >
                <t.icon className={`w-4 h-4 ${Active ? '' : t.color}`} />
                {t.label}
                {Active && (
                  <motion.div
                    layoutId="mkt-active"
                    className="absolute inset-0 rounded-xl border-2 border-primary/40 pointer-events-none"
                  />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
        {renderSub()}
      </Suspense>
    </div>
  );
}
