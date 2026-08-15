import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Layers3, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ModuleReadiness {
  module_code: string;
  module_name: string;
  criticality: 'core' | 'financial' | 'standard' | 'optional' | string;
  tenants_total: number;
  tenants_ready: number;
  readiness_percent: number;
  status: 'ready' | 'partial' | 'not_ready' | string;
}

const STATUS_LABELS: Record<string, string> = {
  ready: 'جاهز',
  partial: 'جاهزية جزئية',
  not_ready: 'غير جاهز',
};

const STATUS_CLASS: Record<string, string> = {
  ready: 'text-emerald-500 border-emerald-500/30',
  partial: 'text-amber-500 border-amber-500/30',
  not_ready: 'text-destructive border-destructive/30',
};

const CRITICALITY_LABELS: Record<string, string> = {
  core: 'أساسي',
  financial: 'مالي',
  standard: 'قياسي',
  optional: 'اختياري',
};

export function ModuleReadinessPanel() {
  const [rows, setRows] = useState<ModuleReadiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_platform_module_readiness', { p_limit: 100 });
      if (error && !error.message?.includes('does not exist')) throw error;
      setRows((data || []) as ModuleReadiness[]);
      setAvailable(!error);
    } catch (error: any) {
      setAvailable(false);
      toast.error('تعذر تحميل جاهزية الموديولات: ' + (error?.message || 'تحقق من migration الجاهزية'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><Layers3 className="w-4 h-4 text-primary" /><h3 className="font-bold">جاهزية الموديولات</h3></div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading} aria-label="تحديث جاهزية الموديولات">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {!available ? (
        <div className="flex items-start gap-2 text-sm text-muted-foreground py-3"><CircleAlert className="w-4 h-4 text-amber-500 mt-0.5" /><span>طبّق migration `20260815090000_platform_module_readiness.sql` لإظهار بيانات الجاهزية.</span></div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.module_code} className="grid grid-cols-[1.25fr_.65fr_1fr_auto] items-center gap-3 border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
              <div className="min-w-0"><p className="font-medium truncate">{row.module_name}</p><p className="text-xs text-muted-foreground">{row.module_code} · {CRITICALITY_LABELS[row.criticality] || row.criticality}</p></div>
              <span className="text-xs text-muted-foreground">{row.tenants_ready}/{row.tenants_total}</span>
              <Progress value={Number(row.readiness_percent || 0)} aria-label={`جاهزية ${row.module_name}`} />
              <div className="flex items-center gap-1"><Badge variant="outline" className={STATUS_CLASS[row.status] || ''}>{row.status === 'ready' && <CheckCircle2 className="w-3 h-3 ml-1" />}{STATUS_LABELS[row.status] || row.status}</Badge></div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد نتائج جاهزية بعد.</p>}
        </div>
      )}
    </Card>
  );
}
