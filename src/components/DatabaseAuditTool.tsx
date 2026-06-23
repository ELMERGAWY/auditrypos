import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCcw, Database, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getUnlinkedTables, type UnlinkedTable } from '@/lib/audit_check';
import { toast } from 'sonner';

export function DatabaseAuditTool() {
  const [issues, setIssues] = useState<UnlinkedTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runAudit = async () => {
    setLoading(true);
    try {
      const data = await getUnlinkedTables();
      setIssues(data);
      setLastCheck(new Date());
      if (data.length > 0) {
        toast.warning(`تم العثور على ${data.length} جداول غير مرتبطة بالمنشأة`);
      } else {
        toast.success('قاعدة البيانات سليمة ومعزولة بالكامل');
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل فحص قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  return (
    <div className="glass-card p-6 border-primary/20 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${issues.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">تدقيق أمن البيانات (Data Isolation Audit)</h3>
            <p className="text-xs text-muted-foreground">التأكد من أن جميع الجداول مرتبطة بمعرف المنشأة لضمان الخصوصية.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={runAudit} disabled={loading} className="gap-2">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          إعادة الفحص
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border flex items-center gap-4 ${issues.length === 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-destructive/5 border-destructive/20'}`}>
          {issues.length === 0 ? (
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          ) : (
            <ShieldAlert className="w-8 h-8 text-destructive" />
          )}
          <div>
            <p className="text-sm font-bold">{issues.length === 0 ? 'حالة العزل: آمنة تماماً' : `حالة العزل: يوجد ${issues.length} ثغرات محتملة`}</p>
            <p className="text-[10px] text-muted-foreground">آخر فحص: {lastCheck?.toLocaleTimeString('ar-EG') || 'لم يتم الفحص بعد'}</p>
          </div>
        </div>
        
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm font-bold">التوصية</p>
            <p className="text-[10px] text-muted-foreground">
              {issues.length === 0 
                ? 'لا توجد إجراءات مطلوبة حالياً.' 
                : 'يجب إضافة عمود restaurant_id للجداول المذكورة وتفعيل RLS.'}
            </p>
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase px-2">الجداول المتأثرة:</p>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30">
                <span className="font-mono text-xs font-bold">{issue.table_name}</span>
                <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5 text-[10px]">
                  {issue.issue_type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
