// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ClipboardList, Package, Plus, RefreshCcw,
  Scissors, Shirt, Truck, Ruler, Layers, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  restaurantId: string;
  currency?: string;
  restaurant?: { name?: string };
  profileName?: string;
}

const STAGES = [
  { id: 'fabric_receipt', label: 'استلام أتواب', icon: Package },
  { id: 'cutting', label: 'القص', icon: Scissors },
  { id: 'preparation', label: 'التحضير', icon: Layers },
  { id: 'front', label: 'الصدر', icon: Shirt },
  { id: 'back', label: 'الظهر', icon: Shirt },
  { id: 'sleeve', label: 'الكوع', icon: Shirt },
  { id: 'assembly', label: 'التجميع', icon: Layers },
  { id: 'quality', label: 'الجودة', icon: CheckCircle2 },
  { id: 'laundry_out', label: 'خروج مغسلة', icon: Truck },
  { id: 'laundry_in', label: 'عودة مغسلة', icon: Truck },
  { id: 'packing', label: 'التعبئة', icon: Package },
  { id: 'delivery', label: 'التسليم', icon: Truck },
  { id: 'completed', label: 'مكتمل', icon: CheckCircle2 },
] as const;

type StageId = (typeof STAGES)[number]['id'];

const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGES.map(s => [s.id, s.label]));

function nextStage(current: string): string | null {
  const idx = STAGES.findIndex(s => s.id === current);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1].id;
}

export function GarmentFactoryHub({ restaurantId, currency = 'ج.م', profileName }: Props) {
  const [view, setView] = useState<'board' | 'fabrics' | 'cutting'>('board');
  const [orders, setOrders] = useState<any[]>([]);
  const [rolls, setRolls] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [orderOpen, setOrderOpen] = useState(false);
  const [rollOpen, setRollOpen] = useState(false);
  const [cutOpen, setCutOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);

  const [orderForm, setOrderForm] = useState({
    order_number: '', style_name: '', style_code: '', color: '', fabric_type: '',
    customer_name: '', quantity_planned: 100, unit_price: 0, due_date: '',
    cutting_waste_limit_pct: 5, notes: '', sizes: 'S:0,M:0,L:0,XL:0',
  });
  const [rollForm, setRollForm] = useState({
    roll_number: '', fabric_type: '', color: '', width_cm: '', meters_received: '',
    weight_kg: '', supplier_name: '', notes: '',
  });
  const [cutForm, setCutForm] = useState({
    fabric_roll_id: '', lot_number: '', marker_length_m: '', lays_count: '1',
    meters_planned: '', meters_actual: '', pieces_planned: '', pieces_cut: '', notes: '',
  });
  const [advanceForm, setAdvanceForm] = useState({
    to_stage: '', quantity: '', qc_pass: '', qc_fail: '', laundry_ref: '', notes: '',
  });

  const actor = profileName || 'مستخدم';

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [o, r, c] = await Promise.all([
      supabase.from('garment_orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
      supabase.from('garment_fabric_rolls').select('*').eq('restaurant_id', restaurantId).order('received_at', { ascending: false }),
      supabase.from('garment_cutting_lots').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(200),
    ]);
    if (o.error) toast.error(o.error.message);
    setOrders(o.data || []);
    setRolls(r.data || []);
    setLots(c.data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(() => orders.find(o => o.id === selectedId) || null, [orders, selectedId]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(o =>
      [o.order_number, o.style_name, o.style_code, o.customer_name, o.color]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [orders, search]);

  const kpis = useMemo(() => {
    const open = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
    const pendingCut = lots.filter(l => l.requires_approval && l.status === 'pending').length;
    const fabricM = rolls.reduce((s, r) => s + Number(r.meters_remaining ?? Math.max(Number(r.meters_received) - Number(r.meters_consumed), 0)), 0);
    const delivered = orders.reduce((s, o) => s + Number(o.quantity_delivered || 0), 0);
    const value = orders.reduce((s, o) => s + Number(o.total_value || 0), 0);
    return { open, pendingCut, fabricM, delivered, value };
  }, [orders, lots, rolls]);

  const parseSizes = (raw: string) => {
    const out: Record<string, number> = {};
    raw.split(',').forEach(part => {
      const [k, v] = part.split(':').map(s => s.trim());
      if (k) out[k] = Number(v) || 0;
    });
    return out;
  };

  const createOrder = async () => {
    if (!orderForm.style_name.trim()) return toast.error('اسم الموديل مطلوب');
    const sizes = parseSizes(orderForm.sizes);
    const qty = Number(orderForm.quantity_planned) || Object.values(sizes).reduce((a, b) => a + b, 0);
    const order_number = orderForm.order_number.trim() || `GO-${Date.now().toString().slice(-8)}`;
    const unit = Number(orderForm.unit_price) || 0;
    const { error } = await supabase.from('garment_orders').insert({
      restaurant_id: restaurantId,
      order_number,
      style_name: orderForm.style_name.trim(),
      style_code: orderForm.style_code || null,
      color: orderForm.color || null,
      fabric_type: orderForm.fabric_type || null,
      customer_name: orderForm.customer_name || null,
      sizes,
      quantity_planned: qty,
      unit_price: unit,
      total_value: unit * qty,
      due_date: orderForm.due_date || null,
      cutting_waste_limit_pct: Number(orderForm.cutting_waste_limit_pct) || 5,
      notes: orderForm.notes || null,
      current_stage: 'fabric_receipt',
      status: 'open',
      created_by_name: actor,
    });
    if (error) return toast.error(error.message);
    toast.success('تم إنشاء أمر التشغيل');
    setOrderOpen(false);
    setOrderForm({
      order_number: '', style_name: '', style_code: '', color: '', fabric_type: '',
      customer_name: '', quantity_planned: 100, unit_price: 0, due_date: '',
      cutting_waste_limit_pct: 5, notes: '', sizes: 'S:0,M:0,L:0,XL:0',
    });
    load();
  };

  const addRoll = async () => {
    const orderId = selectedId || orders.find(o => o.status !== 'completed' && o.status !== 'cancelled')?.id;
    if (!orderId) return toast.error('أنشئ أمر تشغيل أولاً');
    if (!rollForm.roll_number.trim() || !rollForm.meters_received) return toast.error('رقم التوب والمتراج مطلوبان');
    const { error } = await supabase.from('garment_fabric_rolls').insert({
      restaurant_id: restaurantId,
      garment_order_id: orderId,
      roll_number: rollForm.roll_number.trim(),
      fabric_type: rollForm.fabric_type || selected?.fabric_type || null,
      color: rollForm.color || selected?.color || null,
      width_cm: rollForm.width_cm ? Number(rollForm.width_cm) : null,
      meters_received: Number(rollForm.meters_received),
      weight_kg: rollForm.weight_kg ? Number(rollForm.weight_kg) : null,
      supplier_name: rollForm.supplier_name || null,
      notes: rollForm.notes || null,
      received_by_name: actor,
      status: 'in_stock',
    });
    if (error) return toast.error(error.message);
    await supabase.from('garment_orders').update({
      current_stage: 'fabric_receipt',
      status: 'in_progress',
      updated_by_name: actor,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    toast.success('تم استلام التوب');
    setRollOpen(false);
    setRollForm({ roll_number: '', fabric_type: '', color: '', width_cm: '', meters_received: '', weight_kg: '', supplier_name: '', notes: '' });
    load();
  };

  const recordCutting = async () => {
    const orderId = selectedId;
    if (!orderId) return toast.error('اختر أمر تشغيل');
    if (!cutForm.meters_actual || !cutForm.pieces_cut) return toast.error('المتراج الفعلي والقطع م المطلوبان');
    const { data, error } = await supabase.rpc('garment_record_cutting', {
      p_restaurant_id: restaurantId,
      p_garment_order_id: orderId,
      p_fabric_roll_id: cutForm.fabric_roll_id || null,
      p_lot_number: cutForm.lot_number || null,
      p_marker_length_m: Number(cutForm.marker_length_m) || 0,
      p_lays_count: Number(cutForm.lays_count) || 1,
      p_meters_planned: Number(cutForm.meters_planned) || 0,
      p_meters_actual: Number(cutForm.meters_actual) || 0,
      p_pieces_planned: Number(cutForm.pieces_planned) || 0,
      p_pieces_cut: Number(cutForm.pieces_cut) || 0,
      p_cut_by_name: actor,
      p_notes: cutForm.notes || null,
    });
    if (error) return toast.error(error.message);
    const lot = (await supabase.from('garment_cutting_lots').select('variance_flag').eq('id', data).maybeSingle()).data;
    if (lot?.variance_flag) toast.warning('انحراف قص — يحتاج موافقة قبل ترحيل القطع');
    else toast.success('تم تسجيل القص وترحيل القطع');
    setCutOpen(false);
    setCutForm({
      fabric_roll_id: '', lot_number: '', marker_length_m: '', lays_count: '1',
      meters_planned: '', meters_actual: '', pieces_planned: '', pieces_cut: '', notes: '',
    });
    load();
  };

  const approveLot = async (lotId: string) => {
    const { error } = await supabase.rpc('garment_approve_cutting', {
      p_lot_id: lotId,
      p_approver_name: actor,
    });
    if (error) return toast.error(error.message);
    toast.success('تمت الموافقة على دفعة القص');
    load();
  };

  const advanceStage = async () => {
    if (!selectedId || !advanceForm.to_stage) return toast.error('حدد المرحلة التالية');
    const { error } = await supabase.rpc('garment_advance_stage', {
      p_order_id: selectedId,
      p_to_stage: advanceForm.to_stage,
      p_quantity: Number(advanceForm.quantity) || 0,
      p_qc_pass: Number(advanceForm.qc_pass) || 0,
      p_qc_fail: Number(advanceForm.qc_fail) || 0,
      p_laundry_ref: advanceForm.laundry_ref || null,
      p_actor_name: actor,
      p_notes: advanceForm.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success(`تم النقل إلى: ${STAGE_LABEL[advanceForm.to_stage] || advanceForm.to_stage}`);
    setAdvanceOpen(false);
    load();
  };

  const openAdvance = (order: any) => {
    setSelectedId(order.id);
    const nxt = nextStage(order.current_stage);
    setAdvanceForm({
      to_stage: nxt || 'completed',
      quantity: String(order.quantity_planned || 0),
      qc_pass: '',
      qc_fail: '',
      laundry_ref: '',
      notes: '',
    });
    setAdvanceOpen(true);
  };

  const orderRolls = useMemo(
    () => rolls.filter(r => !selectedId || r.garment_order_id === selectedId),
    [rolls, selectedId]
  );

  return (
    <div className="space-y-4 p-1" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight">إنتاج مصنع الملابس</h1>
          <p className="text-xs text-muted-foreground">أتواب → قص رقابي → خط الإنتاج → مغسلة → تعبئة → تسليم</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="w-4 h-4 ml-1" />تحديث</Button>
          <Button size="sm" onClick={() => setOrderOpen(true)}><Plus className="w-4 h-4 ml-1" />أمر تشغيل</Button>
          <Button size="sm" variant="secondary" onClick={() => setRollOpen(true)}><Package className="w-4 h-4 ml-1" />استلام توب</Button>
          <Button size="sm" variant="secondary" disabled={!selectedId} onClick={() => setCutOpen(true)}>
            <Scissors className="w-4 h-4 ml-1" />تسجيل قص
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'أوامر نشطة', value: kpis.open, color: 'text-rose-600' },
          { label: 'قص بانتظار موافقة', value: kpis.pendingCut, color: 'text-amber-600' },
          { label: 'متر أقمشة متاح', value: `${kpis.fabricM.toFixed(1)} م`, color: 'text-sky-600' },
          { label: 'قطع مسلّمة', value: kpis.delivered, color: 'text-emerald-600' },
          { label: 'قيمة الأوامر', value: `${kpis.value.toLocaleString()} ${currency}`, color: 'text-violet-600' },
        ].map(k => (
          <Card key={k.label} className="p-3 border-border/60">
            <div className="text-[10px] text-muted-foreground font-bold">{k.label}</div>
            <div className={cn('text-lg font-black mt-1', k.color)}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['board', 'fabrics', 'cutting'] as const).map(v => (
          <Button
            key={v}
            size="sm"
            variant={view === v ? 'default' : 'outline'}
            onClick={() => setView(v)}
          >
            {v === 'board' ? 'لوحة المراحل' : v === 'fabrics' ? 'الأقمشة' : 'رقابة القص'}
          </Button>
        ))}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pr-8 h-9" placeholder="بحث بأمر / موديل / عميل..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
      ) : view === 'board' ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {STAGES.filter(s => s.id !== 'completed').map(stage => {
              const Icon = stage.icon;
              const col = filteredOrders.filter(o => o.current_stage === stage.id && o.status !== 'cancelled');
              return (
                <div key={stage.id} className="w-64 shrink-0">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black">{stage.label}</span>
                    <Badge variant="secondary" className="text-[10px] mr-auto">{col.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
                    {col.map(o => (
                      <Card
                        key={o.id}
                        className={cn(
                          'p-3 cursor-pointer border transition-all hover:shadow-md',
                          selectedId === o.id ? 'ring-2 ring-primary border-primary' : 'border-border/50'
                        )}
                        onClick={() => setSelectedId(o.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-black">{o.order_number}</div>
                            <div className="text-sm font-bold mt-0.5">{o.style_name}</div>
                          </div>
                          <Badge className="text-[9px]">{o.quantity_planned}</Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                          {o.customer_name && <div>عميل: {o.customer_name}</div>}
                          <div>قص: {o.quantity_cut || 0} · تعبئة: {o.quantity_packed || 0} · تسليم: {o.quantity_delivered || 0}</div>
                          {o.unit_price > 0 && <div className="font-bold text-foreground/80">{Number(o.total_value).toLocaleString()} {currency}</div>}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button size="sm" className="h-7 text-[10px] flex-1" onClick={e => { e.stopPropagation(); openAdvance(o); }}>
                            مرحلة تالية
                          </Button>
                        </div>
                      </Card>
                    ))}
                    {col.length === 0 && (
                      <div className="text-[10px] text-muted-foreground text-center py-6 border border-dashed rounded-xl">فارغ</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === 'fabrics' ? (
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-muted-foreground border-b">
                <th className="py-2 text-right">التوب</th>
                <th className="py-2 text-right">الأمر</th>
                <th className="py-2 text-right">نوع / لون</th>
                <th className="py-2 text-right">مستلم</th>
                <th className="py-2 text-right">مستهلك</th>
                <th className="py-2 text-right">متبقي</th>
                <th className="py-2 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rolls.map(r => {
                const rem = Number(r.meters_remaining ?? Math.max(Number(r.meters_received) - Number(r.meters_consumed), 0));
                const ord = orders.find(o => o.id === r.garment_order_id);
                return (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-muted/40">
                    <td className="py-2 font-bold">{r.roll_number}</td>
                    <td className="py-2">{ord?.order_number || '—'}</td>
                    <td className="py-2">{r.fabric_type || '—'} / {r.color || '—'}</td>
                    <td className="py-2">{Number(r.meters_received).toFixed(2)} م</td>
                    <td className="py-2">{Number(r.meters_consumed).toFixed(2)} م</td>
                    <td className={cn('py-2 font-black', rem < 5 ? 'text-rose-600' : 'text-emerald-600')}>{rem.toFixed(2)} م</td>
                    <td className="py-2"><Badge variant="outline">{r.status}</Badge></td>
                  </tr>
                );
              })}
              {rolls.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">لا توجد أتواب بعد</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="space-y-3">
          {lots.filter(l => l.requires_approval && l.status === 'pending').length > 0 && (
            <Card className="p-3 border-amber-500/40 bg-amber-500/5">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                دفعات قص تحتاج موافقة (هدر أعلى من الحد أو نقص قطع)
              </div>
            </Card>
          )}
          <Card className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-muted-foreground border-b">
                  <th className="py-2 text-right">الدفعة</th>
                  <th className="py-2 text-right">الأمر</th>
                  <th className="py-2 text-right">مخطط / فعلي</th>
                  <th className="py-2 text-right">هدر %</th>
                  <th className="py-2 text-right">قطع</th>
                  <th className="py-2 text-right">القاص</th>
                  <th className="py-2 text-right">الحالة</th>
                  <th className="py-2 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {lots.map(l => {
                  const ord = orders.find(o => o.id === l.garment_order_id);
                  return (
                    <tr key={l.id} className={cn('border-b border-border/40', l.variance_flag && 'bg-rose-500/5')}>
                      <td className="py-2 font-bold">{l.lot_number}</td>
                      <td className="py-2">{ord?.order_number || '—'}</td>
                      <td className="py-2">{Number(l.meters_planned).toFixed(2)} / {Number(l.meters_actual).toFixed(2)} م</td>
                      <td className={cn('py-2 font-black', Number(l.waste_pct) > 5 ? 'text-rose-600' : '')}>
                        {Number(l.waste_pct || 0).toFixed(1)}%
                        {l.variance_flag && <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" />}
                      </td>
                      <td className="py-2">{l.pieces_cut}/{l.pieces_planned}</td>
                      <td className="py-2 text-xs">{l.cut_by_name || '—'}</td>
                      <td className="py-2"><Badge variant={l.status === 'posted' ? 'default' : 'secondary'}>{l.status}</Badge></td>
                      <td className="py-2">
                        {l.status === 'pending' && l.requires_approval && (
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => approveLot(l.id)}>موافقة</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {lots.length === 0 && (
                  <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">لا توجد دفعات قص</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {selected && (
        <Card className="p-3 border-primary/30 bg-primary/5">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Ruler className="w-4 h-4 text-primary" />
            <span className="font-black">{selected.order_number}</span>
            <span>{selected.style_name}</span>
            <Badge>{STAGE_LABEL[selected.current_stage] || selected.current_stage}</Badge>
            <span className="text-muted-foreground">حد هدر القص: {selected.cutting_waste_limit_pct}%</span>
            <Button size="sm" className="h-7 mr-auto" onClick={() => openAdvance(selected)}>نقل مرحلة</Button>
          </div>
        </Card>
      )}

      {/* New order */}
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>أمر تشغيل جديد</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>الموديل *</Label>
              <Input value={orderForm.style_name} onChange={e => setOrderForm(f => ({ ...f, style_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>رقم الأمر</Label>
              <Input placeholder="تلقائي إن تُرك فارغاً" value={orderForm.order_number} onChange={e => setOrderForm(f => ({ ...f, order_number: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>كود الموديل</Label>
              <Input value={orderForm.style_code} onChange={e => setOrderForm(f => ({ ...f, style_code: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>العميل</Label>
              <Input value={orderForm.customer_name} onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>الكمية المخططة</Label>
              <Input type="number" value={orderForm.quantity_planned} onChange={e => setOrderForm(f => ({ ...f, quantity_planned: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>اللون</Label>
              <Input value={orderForm.color} onChange={e => setOrderForm(f => ({ ...f, color: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>نوع القماش</Label>
              <Input value={orderForm.fabric_type} onChange={e => setOrderForm(f => ({ ...f, fabric_type: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>سعر القطعة ({currency})</Label>
              <Input type="number" value={orderForm.unit_price} onChange={e => setOrderForm(f => ({ ...f, unit_price: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>حد هدر القص %</Label>
              <Input type="number" value={orderForm.cutting_waste_limit_pct} onChange={e => setOrderForm(f => ({ ...f, cutting_waste_limit_pct: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>موعد التسليم</Label>
              <Input type="date" value={orderForm.due_date} onChange={e => setOrderForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>المقاسات (مثال S:20,M:40,L:30)</Label>
              <Input value={orderForm.sizes} onChange={e => setOrderForm(f => ({ ...f, sizes: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>ملاحظات</Label>
              <Textarea value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createOrder}>حفظ الأمر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fabric roll */}
      <Dialog open={rollOpen} onOpenChange={setRollOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>استلام توب قماش</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>ربط بأمر تشغيل</Label>
              <Select value={selectedId || ''} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder="اختر الأمر" /></SelectTrigger>
                <SelectContent>
                  {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.order_number} — {o.style_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>رقم التوب *</Label>
              <Input value={rollForm.roll_number} onChange={e => setRollForm(f => ({ ...f, roll_number: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>المتراج المستلم *</Label>
                <Input type="number" value={rollForm.meters_received} onChange={e => setRollForm(f => ({ ...f, meters_received: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>العرض (سم)</Label>
                <Input type="number" value={rollForm.width_cm} onChange={e => setRollForm(f => ({ ...f, width_cm: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>الوزن (كجم)</Label>
                <Input type="number" value={rollForm.weight_kg} onChange={e => setRollForm(f => ({ ...f, weight_kg: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>المورد</Label>
                <Input value={rollForm.supplier_name} onChange={e => setRollForm(f => ({ ...f, supplier_name: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addRoll}>تسجيل الاستلام</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cutting */}
      <Dialog open={cutOpen} onOpenChange={setCutOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>تسجيل قص + رقابة ميتراج</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
              إذا تجاوز الهدر حد الأمر ({selected?.cutting_waste_limit_pct ?? 5}%) أو نقصت القطع عن المخطط — يُجمَّد الترحيل حتى موافقة مشرف.
            </div>
            <div className="space-y-1">
              <Label>التوب</Label>
              <Select value={cutForm.fabric_roll_id} onValueChange={v => setCutForm(f => ({ ...f, fabric_roll_id: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر التوب" /></SelectTrigger>
                <SelectContent>
                  {orderRolls.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.roll_number} — متبقي {(Number(r.meters_remaining ?? Number(r.meters_received) - Number(r.meters_consumed))).toFixed(1)} م
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>رقم الدفعة</Label>
                <Input value={cutForm.lot_number} onChange={e => setCutForm(f => ({ ...f, lot_number: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>عدد الطبقات</Label>
                <Input type="number" value={cutForm.lays_count} onChange={e => setCutForm(f => ({ ...f, lays_count: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>طول الماركر (م)</Label>
                <Input type="number" value={cutForm.marker_length_m} onChange={e => setCutForm(f => ({ ...f, marker_length_m: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>متراج مخطط</Label>
                <Input type="number" value={cutForm.meters_planned} onChange={e => setCutForm(f => ({ ...f, meters_planned: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>متراج فعلي *</Label>
                <Input type="number" value={cutForm.meters_actual} onChange={e => setCutForm(f => ({ ...f, meters_actual: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>قطع مخططة</Label>
                <Input type="number" value={cutForm.pieces_planned} onChange={e => setCutForm(f => ({ ...f, pieces_planned: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>قطع مقصوصة *</Label>
                <Input type="number" value={cutForm.pieces_cut} onChange={e => setCutForm(f => ({ ...f, pieces_cut: e.target.value }))} />
              </div>
            </div>
            <Textarea placeholder="ملاحظات القص..." value={cutForm.notes} onChange={e => setCutForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button onClick={recordCutting}><ClipboardList className="w-4 h-4 ml-1" />حفظ القص</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance stage */}
      <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>نقل مرحلة الإنتاج</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>إلى مرحلة</Label>
              <Select value={advanceForm.to_stage} onValueChange={v => setAdvanceForm(f => ({ ...f, to_stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>الكمية</Label>
                <Input type="number" value={advanceForm.quantity} onChange={e => setAdvanceForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              {(advanceForm.to_stage === 'quality' || advanceForm.to_stage === 'laundry_out') && (
                <>
                  <div className="space-y-1">
                    <Label>نجاح جودة</Label>
                    <Input type="number" value={advanceForm.qc_pass} onChange={e => setAdvanceForm(f => ({ ...f, qc_pass: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>رفض جودة</Label>
                    <Input type="number" value={advanceForm.qc_fail} onChange={e => setAdvanceForm(f => ({ ...f, qc_fail: e.target.value }))} />
                  </div>
                </>
              )}
              {(advanceForm.to_stage === 'laundry_out' || advanceForm.to_stage === 'laundry_in') && (
                <div className="col-span-2 space-y-1">
                  <Label>مرجع المغسلة</Label>
                  <Input value={advanceForm.laundry_ref} onChange={e => setAdvanceForm(f => ({ ...f, laundry_ref: e.target.value }))} />
                </div>
              )}
            </div>
            <Textarea placeholder="ملاحظات..." value={advanceForm.notes} onChange={e => setAdvanceForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button onClick={advanceStage}>تأكيد النقل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GarmentFactoryHub;
