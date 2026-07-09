// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, TrendingUp, Target, DollarSign, BarChart3, Edit, X, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { getActorNameAsync } from '@/lib/actor';
import { toast } from 'sonner';

const CAMPAIGN_TYPES = [
  { value: 'awareness', label: 'وعي بالعلامة' },
  { value: 'traffic', label: 'زيارات الموقع' },
  { value: 'engagement', label: 'تفاعل' },
  { value: 'lead_gen', label: 'جذب عملاء محتملين' },
  { value: 'conversion', label: 'تحويلات / مبيعات' },
];

const CHANNELS = ['Meta (Facebook & Instagram)', 'Google Ads', 'TikTok', 'YouTube', 'Snapchat', 'X (Twitter)', 'LinkedIn', 'Influencer'];

const emptyForm = () => ({
  id: null as string | null,
  client_name: '',
  plan_name: '',
  campaign_type: 'awareness',
  channels: [] as { channel: string; budget: number }[],
  start_date: '',
  end_date: '',
  total_budget: 0,
  actual_spend: 0,
  kpis: { impressions_target: 0, clicks_target: 0, conversions_target: 0, cpa_target: 0 },
  results: { impressions: 0, clicks: 0, conversions: 0 },
  revenue_generated: 0,
  status: 'draft',
  notes: '',
});

export function MediaPlans({ restaurant }: any) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    const { data, error } = await supabase.from('media_plans').select('*').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false });
    if (error) toast.error(error.message); else setPlans(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant?.id]);

  const totals = useMemo(() => {
    const budget = plans.reduce((s, p) => s + Number(p.total_budget || 0), 0);
    const spend = plans.reduce((s, p) => s + Number(p.actual_spend || 0), 0);
    const revenue = plans.reduce((s, p) => s + Number(p.revenue_generated || 0), 0);
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
    return { budget, spend, revenue, roi, active: plans.filter(p => p.status === 'active').length };
  }, [plans]);

  const openNew = () => { setForm(emptyForm()); setShowForm(true); };
  const openEdit = (p: any) => {
    setForm({
      ...emptyForm(),
      ...p,
      channels: Array.isArray(p.channels) ? p.channels : [],
      kpis: p.kpis || emptyForm().kpis,
      results: p.results || emptyForm().results,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.client_name || !form.plan_name) { toast.error('اكتب اسم العميل واسم الخطة'); return; }
    const actor = await getActorNameAsync();
    const payload: any = {
      restaurant_id: restaurant.id,
      client_name: form.client_name,
      plan_name: form.plan_name,
      campaign_type: form.campaign_type,
      channels: form.channels,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      total_budget: Number(form.total_budget || 0),
      actual_spend: Number(form.actual_spend || 0),
      kpis: form.kpis,
      results: form.results,
      revenue_generated: Number(form.revenue_generated || 0),
      status: form.status,
      notes: form.notes,
    };
    const { error } = form.id
      ? await supabase.from('media_plans').update(payload).eq('id', form.id)
      : await supabase.from('media_plans').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success('تم الحفظ');
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('حذف خطة الإعلام؟')) return;
    const { error } = await supabase.from('media_plans').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const addChannel = () => setForm(f => ({ ...f, channels: [...f.channels, { channel: CHANNELS[0], budget: 0 }] }));
  const updateChannel = (i: number, k: string, v: any) => setForm(f => ({ ...f, channels: f.channels.map((c, idx) => idx === i ? { ...c, [k]: v } : c) }));
  const removeChannel = (i: number) => setForm(f => ({ ...f, channels: f.channels.filter((_, idx) => idx !== i) }));

  const roi = (p: any) => {
    const s = Number(p.actual_spend || 0);
    return s > 0 ? (((Number(p.revenue_generated || 0) - s) / s) * 100).toFixed(1) : '—';
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'خطط نشطة', value: totals.active, icon: Target, color: 'text-primary' },
          { label: 'إجمالي الميزانية', value: totals.budget.toFixed(0), icon: DollarSign, color: 'text-blue-500' },
          { label: 'الإنفاق الفعلي', value: totals.spend.toFixed(0), icon: TrendingUp, color: 'text-amber-500' },
          { label: 'الإيرادات المُولّدة', value: totals.revenue.toFixed(0), icon: BarChart3, color: 'text-emerald-500' },
          { label: 'ROI %', value: totals.roi.toFixed(1) + '%', icon: TrendingUp, color: totals.roi >= 0 ? 'text-emerald-500' : 'text-destructive' },
        ].map(s => (
          <Card key={s.label} className="p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
            <div><p className="text-[10px] text-muted-foreground">{s.label}</p><p className={`font-bold ${s.color}`}>{s.value}</p></div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> خطط الإعلام (Media Plans)</h3>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> خطة جديدة</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs">
            <tr>
              {['العميل', 'الخطة', 'النوع', 'الفترة', 'الميزانية', 'الإنفاق', 'الإيرادات', 'ROI', 'الحالة', ''].map(h => (
                <th key={h} className="p-3 text-right font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
            ) : plans.length === 0 ? (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">لا توجد خطط بعد — أنشئ أول خطة لعميلك</td></tr>
            ) : plans.map(p => (
              <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t hover:bg-secondary/30">
                <td className="p-3 font-bold">{p.client_name}</td>
                <td className="p-3">{p.plan_name}</td>
                <td className="p-3"><Badge variant="outline">{CAMPAIGN_TYPES.find(c => c.value === p.campaign_type)?.label || p.campaign_type}</Badge></td>
                <td className="p-3 text-xs text-muted-foreground">{p.start_date || '—'} → {p.end_date || '—'}</td>
                <td className="p-3">{Number(p.total_budget).toFixed(0)}</td>
                <td className="p-3 text-amber-600">{Number(p.actual_spend).toFixed(0)}</td>
                <td className="p-3 text-emerald-600">{Number(p.revenue_generated).toFixed(0)}</td>
                <td className={`p-3 font-bold ${Number(roi(p)) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{roi(p)}{roi(p) !== '—' && '%'}</td>
                <td className="p-3"><Badge>{p.status}</Badge></td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto" dir="rtl">
          <DialogHeader><DialogTitle>{form.id ? 'تعديل خطة الإعلام' : 'خطة إعلام جديدة'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold">اسم العميل *</label><Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} /></div>
            <div><label className="text-xs font-bold">اسم الخطة *</label><Input value={form.plan_name} onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))} /></div>
            <div>
              <label className="text-xs font-bold">نوع الحملة</label>
              <Select value={form.campaign_type} onValueChange={v => setForm(f => ({ ...f, campaign_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAMPAIGN_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold">الحالة</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['draft', 'active', 'paused', 'completed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-bold">من</label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label className="text-xs font-bold">إلى</label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            <div><label className="text-xs font-bold">الميزانية الإجمالية</label><Input type="number" value={form.total_budget} onChange={e => setForm(f => ({ ...f, total_budget: Number(e.target.value) }))} /></div>
            <div><label className="text-xs font-bold">الإنفاق الفعلي</label><Input type="number" value={form.actual_spend} onChange={e => setForm(f => ({ ...f, actual_spend: Number(e.target.value) }))} /></div>
            <div><label className="text-xs font-bold">الإيرادات المُولّدة</label><Input type="number" value={form.revenue_generated} onChange={e => setForm(f => ({ ...f, revenue_generated: Number(e.target.value) }))} /></div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold">القنوات والميزانيات</label>
              <Button size="sm" variant="outline" onClick={addChannel} className="gap-1"><Plus className="w-3 h-3" /> قناة</Button>
            </div>
            {form.channels.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={c.channel} onValueChange={v => updateChannel(i, 'channel', v)}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map(ch => <SelectItem key={ch} value={ch}>{ch}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="الميزانية" className="w-32" value={c.budget} onChange={e => updateChannel(i, 'budget', Number(e.target.value))} />
                <Button size="sm" variant="ghost" onClick={() => removeChannel(i)}><X className="w-3 h-3" /></Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 text-xs font-bold text-muted-foreground mt-2">مؤشرات الأداء المستهدفة (KPIs)</div>
            <div><label className="text-xs">الظهور</label><Input type="number" value={form.kpis.impressions_target} onChange={e => setForm(f => ({ ...f, kpis: { ...f.kpis, impressions_target: Number(e.target.value) } }))} /></div>
            <div><label className="text-xs">النقرات</label><Input type="number" value={form.kpis.clicks_target} onChange={e => setForm(f => ({ ...f, kpis: { ...f.kpis, clicks_target: Number(e.target.value) } }))} /></div>
            <div><label className="text-xs">التحويلات</label><Input type="number" value={form.kpis.conversions_target} onChange={e => setForm(f => ({ ...f, kpis: { ...f.kpis, conversions_target: Number(e.target.value) } }))} /></div>
            <div><label className="text-xs">CPA المستهدف</label><Input type="number" value={form.kpis.cpa_target} onChange={e => setForm(f => ({ ...f, kpis: { ...f.kpis, cpa_target: Number(e.target.value) } }))} /></div>

            <div className="col-span-2 text-xs font-bold text-muted-foreground mt-2">النتائج الفعلية</div>
            <div><label className="text-xs">الظهور</label><Input type="number" value={form.results.impressions} onChange={e => setForm(f => ({ ...f, results: { ...f.results, impressions: Number(e.target.value) } }))} /></div>
            <div><label className="text-xs">النقرات</label><Input type="number" value={form.results.clicks} onChange={e => setForm(f => ({ ...f, results: { ...f.results, clicks: Number(e.target.value) } }))} /></div>
            <div><label className="text-xs">التحويلات</label><Input type="number" value={form.results.conversions} onChange={e => setForm(f => ({ ...f, results: { ...f.results, conversions: Number(e.target.value) } }))} /></div>
          </div>

          <div><label className="text-xs font-bold">ملاحظات</label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={save} className="gap-2"><Save className="w-4 h-4" /> حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
