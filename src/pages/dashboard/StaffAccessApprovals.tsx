// @ts-nocheck
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  restaurantId?: string;
  /** When true, load all pending requests and allow assigning to multiple companies */
  superAdmin?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  cashier: 'كاشير',
  accountant: 'محاسب',
  manager: 'إداري',
  admin: 'أدمن',
  viewer: 'مشاهدة',
};

export function StaffAccessApprovals({ restaurantId, superAdmin }: Props) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [roleByReq, setRoleByReq] = useState<Record<string, string>>({});
  const [extraCompanies, setExtraCompanies] = useState<Record<string, string[]>>({});

  const load = async () => {
    setLoading(true);
    try {
      let cid: string | null = null;

      if (!superAdmin) {
        if (restaurantId) {
          const { data: rest } = await supabase
            .from('restaurants')
            .select('company_id')
            .eq('id', restaurantId)
            .maybeSingle();
          cid = rest?.company_id || null;
        }

        if (!cid) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: membership } = await supabase
              .from('company_users')
              .select('company_id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .limit(1);
            if (membership && membership.length > 0) {
              cid = membership[0].company_id;
            }
          }
        }
        setCompanyId(cid);
      }

      if (superAdmin) {
        const { data: allCos } = await supabase.from('companies').select('id, name').order('name');
        setCompanies(allCos || []);
      }

      // Pending: assigned to this company OR unassigned (admin will bind on approve)
      let q = supabase
        .from('staff_access_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!superAdmin && cid) {
        q = q.or(`company_id.eq.${cid},company_id.is.null`);
      }

      const { data, error } = await q;
      if (error) throw error;

      const list = data || [];
      setRequests(list);
      const roles: Record<string, string> = {};
      list.forEach((r) => { roles[r.id] = r.requested_role || 'cashier'; });
      setRoleByReq(roles);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'فشل تحميل طلبات الموظفين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [restaurantId, superAdmin]);

  const approve = async (req: any) => {
    const role = roleByReq[req.id] || req.requested_role || 'cashier';
    let companyIds: string[] | null = null;

    if (superAdmin) {
      const picked = extraCompanies[req.id] || [];
      if (picked.length > 0) {
        companyIds = picked;
      } else if (req.company_id) {
        companyIds = [req.company_id];
      } else if (companies[0]) {
        // force pick
        toast.error('اختر شركة واحدة على الأقل للموافقة');
        return;
      }
    } else if (companyId) {
      companyIds = [companyId];
      // ensure request has company
      if (!req.company_id) {
        await supabase.from('staff_access_requests').update({ company_id: companyId }).eq('id', req.id);
      }
    }

    const { error } = await supabase.rpc('approve_staff_access', {
      p_request_id: req.id,
      p_role: role,
      p_company_ids: companyIds,
    });
    if (error) return toast.error(error.message);
    toast.success(`تمت الموافقة على ${req.full_name}`);
    load();
  };

  const reject = async (req: any) => {
    const { error } = await supabase.rpc('reject_staff_access', {
      p_request_id: req.id,
      p_note: 'مرفوض من الأدمن',
    });
    if (error) return toast.error(error.message);
    toast.success('تم الرفض');
    load();
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          طلبات انضمام بانتظار الموافقة
          <Badge variant="secondary">{requests.length}</Badge>
        </h3>
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3 h-3" /></Button>
      </div>

      {!superAdmin && (
        <p className="text-xs text-muted-foreground">
          الموظف يسجّل من /staff-login ثم يظهر هنا للموافقة. عند الموافقة يُضم تلقائياً لشركتك.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">جاري التحميل...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl">لا توجد طلبات معلقة</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="p-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-bold">{req.full_name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{req.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(req.created_at).toLocaleString('ar-EG')}
                    {req.company_hint ? ` · الشركة المذكورة: ${req.company_hint}` : ''}
                  </p>
                </div>
                <Badge>{ROLE_LABELS[req.requested_role] || req.requested_role}</Badge>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <Select value={roleByReq[req.id] || 'cashier'} onValueChange={(v) => setRoleByReq({ ...roleByReq, [req.id]: v })}>
                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="الدور" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {superAdmin && (
                  <Select
                    value={(extraCompanies[req.id] || [])[0] || req.company_id || ''}
                    onValueChange={(v) => setExtraCompanies({ ...extraCompanies, [req.id]: [v] })}
                  >
                    <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="اختر الشركة" /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {superAdmin && companies.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {companies.slice(0, 12).map((c) => {
                      const selected = (extraCompanies[req.id] || (req.company_id ? [req.company_id] : [])).includes(c.id);
                      return (
                        <Button
                          key={c.id}
                          type="button"
                          size="sm"
                          variant={selected ? 'default' : 'outline'}
                          className="h-7 text-[10px]"
                          onClick={() => {
                            const cur = new Set(extraCompanies[req.id] || (req.company_id ? [req.company_id] : []));
                            if (cur.has(c.id)) cur.delete(c.id); else cur.add(c.id);
                            setExtraCompanies({ ...extraCompanies, [req.id]: Array.from(cur) });
                          }}
                        >
                          {c.name}
                        </Button>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 mr-auto">
                  <Button size="sm" className="h-8 gap-1" onClick={() => approve(req)}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> موافقة
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive" onClick={() => reject(req)}>
                    <XCircle className="w-3.5 h-3.5" /> رفض
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
