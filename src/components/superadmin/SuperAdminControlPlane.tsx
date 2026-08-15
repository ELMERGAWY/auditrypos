import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantHealth {
  restaurant_id: string;
  restaurant_name: string;
  status: string;
  plan_id?: string | null;
  orders_24h: number;
  revenue_24h: number;
  active_staff: number;
  last_order_at?: string | null;
  health_state: 'healthy' | 'no_activity' | 'expired' | 'blocked' | string;
}

interface AdminAuditEvent {
  id: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  created_at: string;
  details?: Record<string, unknown>;
}

const HEALTH_LABELS: Record<string, string> = {
  healthy: 'سليم',
  no_activity: 'لا نشاط حديث',
  expired: 'اشتراك منتهٍ',
  blocked: 'موقوف',
};

const HEALTH_CLASS: Record<string, string> = {
  healthy: 'text-emerald-500 border-emerald-500/30',
  no_activity: 'text-amber-500 border-amber-500/30',
  expired: 'text-orange-500 border-orange-500/30',
  blocked: 'text-destructive border-destructive/30',
};

export function SuperAdminControlPlane() {
  const [tenants, setTenants] = useState<TenantHealth[]>([]);
  const [auditEvents, setAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: health, error: healthError }, { data: audit, error: auditError }] = await Promise.all([
        (supabase as any).rpc('get_super_admin_tenant_health', { p_limit: 200 }),
        (supabase as any).rpc('get_super_admin_audit_events', { p_limit: 20 }),
      ]);
      if (healthError && !healthError.message?.includes('does not exist')) throw healthError;
      if (auditError && !auditError.message?.includes('does not exist')) throw auditError;
      setTenants((health || []) as TenantHealth[]);
      setAuditEvents((audit || []) as AdminAuditEvent[]);
      setAvailable(!healthError && !auditError);
      if (!healthError) {
        await (supabase as any).rpc('log_super_admin_action', {
          p_action: 'view_tenant_health',
          p_target_type: 'platform',
          p_details: { source: 'super_admin_control_plane' },
        });
      }
    } catch (error: any) {
      setAvailable(false);
      toast.error('تعذر تحميل صحة المستأجرين: ' + (error?.message || 'تحقق من migration Super Admin'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stateCounts = tenants.reduce<Record<string, number>>((acc, tenant) => {
    acc[tenant.health_state] = (acc[tenant.health_state] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> مركز التحكم التشغيلي</h2>
          <p className="text-sm text-muted-foreground mt-1">صحة المستأجرين ونشاطهم خلال آخر 24 ساعة وسجل إجراءات السوبر أدمن.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </Button>
      </div>

      {!available && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5 text-sm text-muted-foreground">
          طبّق migration `20260815080000_super_admin_control_plane.sql` لإظهار مؤشرات الصحة والسجل. البوابة الأساسية تظل متاحة دون هذا الجزء.
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><Activity className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-2xl font-bold">{stateCounts.healthy || 0}</p><p className="text-xs text-muted-foreground">مستأجر سليم</p></Card>
        <Card className="p-4"><Clock3 className="w-5 h-5 text-amber-500 mb-2" /><p className="text-2xl font-bold">{stateCounts.no_activity || 0}</p><p className="text-xs text-muted-foreground">دون نشاط حديث</p></Card>
        <Card className="p-4"><AlertTriangle className="w-5 h-5 text-orange-500 mb-2" /><p className="text-2xl font-bold">{(stateCounts.expired || 0) + (stateCounts.blocked || 0)}</p><p className="text-xs text-muted-foreground">يحتاج تدخلاً</p></Card>
        <Card className="p-4"><CheckCircle2 className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-bold">{tenants.length}</p><p className="text-xs text-muted-foreground">إجمالي المستأجرين</p></Card>
      </div>

      {available && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
          <Card className="p-4 overflow-auto">
            <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary" /><h3 className="font-bold">حالة الشركات</h3></div>
            <div className="space-y-2 min-w-[620px]">
              {tenants.slice(0, 30).map((tenant) => (
                <div key={tenant.restaurant_id} className="grid grid-cols-[1.4fr_.7fr_.7fr_.7fr_1fr] items-center gap-3 border-b border-border/50 py-3 text-sm">
                  <div><p className="font-medium truncate">{tenant.restaurant_name}</p><p className="text-xs text-muted-foreground">{tenant.plan_id || 'legacy'}</p></div>
                  <span>{tenant.orders_24h} طلب/24س</span>
                  <span>{Number(tenant.revenue_24h || 0).toLocaleString()} مبيعات</span>
                  <span>{tenant.active_staff} موظف</span>
                  <Badge variant="outline" className={HEALTH_CLASS[tenant.health_state] || ''}>{HEALTH_LABELS[tenant.health_state] || tenant.health_state}</Badge>
                </div>
              ))}
              {tenants.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">لا توجد بيانات صحة متاحة.</p>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4 text-primary" /><h3 className="font-bold">آخر إجراءات الإدارة</h3></div>
            <div className="space-y-3">
              {auditEvents.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-start gap-2 text-sm border-b border-border/50 pb-3">
                  <XCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div><p className="font-medium">{event.action}</p><p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString('ar-EG')}</p></div>
                </div>
              ))}
              {auditEvents.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">لا توجد إجراءات مسجلة بعد.</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
