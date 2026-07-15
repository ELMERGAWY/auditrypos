// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ClipboardList, Package, Plus, RefreshCcw,
  Scissors, Shirt, Truck, Ruler, Layers, Search, DollarSign, Factory
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
import { findOrCreateCustomer } from '@/lib/customerUtils';

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

const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGES.map(s => [s.id, s.label]));
const COST_TYPES = [
  { id: 'internal', label: 'داخلي' },
  { id: 'outsourcing', label: 'تصنيع خارجي' },
  { id: 'material', label: 'مواد' },
  { id: 'overhead', label: 'أعباء' },
];

function nextStage(current: string): string | null {
  const idx = STAGES.findIndex(s => s.id === current);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1].id;
}

export function GarmentFactoryHub({ restaurantId, currency = 'ج.م', profileName }: Props) {
  const [view, setView] = useState<'board' | 'fabrics' | 'cutting' | 'costs' | 'outsourcing'>('board');
  const [orders, setOrders] = useState<any[]>([]);
  const [rolls, setRolls] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [orderOpen, setOrderOpen] = useState(false);
  const [rollOpen, setRollOpen] = useState(false);
  const [cutOpen, setCutOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [recvOpen, setRecvOpen] = useState(false);
  const [recvJobId, setRecvJobId] = useState<string | null>(null);

  const [orderForm, setOrderForm] = useState({
    order_number: '', style_name: '', style_code: '', color: '', fabric_type: '',
    customer_name: '', quantity_planned: 100, unit_price: 0, due_date: '',
    cutting_waste_limit_pct: 5, notes: '', sizes: 'S:0,M:0,L:0,XL:0', fabric_product_id: '',
  });
  const [rollForm, setRollForm] = useState({
    roll_number: '', fabric_type: '', color: '', width_cm: '', meters_received: '',
    weight_kg: '', supplier_name: '', notes: '', product_id: '',
  });
  const [cutForm, setCutForm] = useState({
    fabric_roll_id: '', lot_number: '', marker_length_m: '', lays_count: '1',
    meters_planned: '', meters_actual: '', pieces_planned: '', pieces_cut: '', notes: '',
  });
  const [advanceForm, setAdvanceForm] = useState({
    to_stage: '', quantity: '', qc_pass: '', qc_fail: '', laundry_ref: '', notes: '',
  });
  const [costForm, setCostForm] = useState({
    stage: 'cutting', cost_type: 'internal', quantity: '', unit_cost: '', vendor_name: '', notes: '',
  });
  const [outForm, setOutForm] = useState({
    stage: 'front', vendor_name: '', vendor_phone: '', qty_sent: '', unit_cost: '',
    due_date: '', external_ref: '', notes: '',
  });
  const [recvForm, setRecvForm] = useState({ qty_received: '', qty_rejected: '', notes: '' });

  const actor = profileName || 'مستخدم';

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [o, r, c, sc, oj, p] = await Promise.all([
      supabase.from('garment_orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
      supabase.from('garment_fabric_rolls').select('*').eq('restaurant_id', restaurantId).order('received_at', { ascending: false }),
      supabase.from('garment_cutting_lots').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(200),
      supabase.from('garment_stage_costs').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(500),
      supabase.from('garment_outsourcing_jobs').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(300),
      supabase.from('products').select('id, name, quantity, unit').eq('restaurant_id', restaurantId).order('name').limit(500),
    ]);
    if (o.error) toast.error(o.error.message);
    setOrders(o.data || []);
    setRolls(r.data || []);
    setLots(c.data || []);
    setCosts(sc.error ? [] : (sc.data || []));
    setJobs(oj.error ? [] : (oj.data || []));
    setProducts(p.data || []);
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
    const outOpen = jobs.filter(j => j.status === 'sent' || j.status === 'partial').length;
    const stageCost = orders.reduce((s, o) => s + Number(o.total_stage_cost || 0) + Number(o.total_outsourcing_cost || 0), 0);
    return { open, pendingCut, fabricM, delivered, outOpen, stageCost };
  }, [orders, lots, rolls, jobs]);

  const stageCostSummary = useMemo(() => {
    const map: Record<string, { internal: number; outsourcing: number; material: number; overhead: number; total: number }> = {};
    const list = selectedId ? costs.filter(c => c.garment_order_id === selectedId) : costs;
    for (const c of list) {
      if (!map[c.stage]) map[c.stage] = { internal: 0, outsourcing: 0, material: 0, overhead: 0, total: 0 };
      const t = c.cost_type || 'internal';
      map[c.stage][t] = (map[c.stage][t] || 0) + Number(c.total_cost || 0);
      map[c.stage].total += Number(c.total_cost || 0);
    }
    return map;
  }, [costs, selectedId]);

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
    let customer_id: string | null = null;
    if (orderForm.customer_name.trim()) {
      customer_id = await findOrCreateCustomer(restaurantId, orderForm.customer_name.trim());
    }
    const { error } = await supabase.from('garment_orders').insert({
      restaurant_id: restaurantId,
      order_number,
      style_name: orderForm.style_name.trim(),
      style_code: orderForm.style_code || null,
      color: orderForm.color || null,
      fabric_type: orderForm.fabric_type || null,
      customer_name: orderForm.customer_name || null,
      customer_id,
      fabric_product_id: orderForm.fabric_product_id || null,
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
      cutting_waste_limit_pct: 5, notes: '', sizes: 'S:0,M:0,L:0,XL:0', fabric_product_id: '',
    });
    load();
  };

  const addRoll = async () => {
    const orderId = selectedId || orders.find(o => o.status !== 'completed' && o.status !== 'cancelled')?.id;
    if (!orderId) return toast.error('أنشئ أمر تشغيل أولاً');
    if (!rollForm.roll_number.trim() || !rollForm.meters_received) return toast.error('رقم التوب والمتراج مطلوبان');
    const productId = rollForm.product_id || selected?.fabric_product_id || null;
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
      product_id: productId,
      received_by_name: actor,
      status: 'in_stock',
    });
    if (error) return toast.error(error.message);
    if (productId) {
      await supabase.from('garment_orders').update({ fabric_product_id: productId }).eq('id', orderId).is('fabric_product_id', null);
    }
    await supabase.from('garment_orders').update({
      current_stage: 'fabric_receipt',
      status: 'in_progress',
      updated_by_name: actor,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    toast.success(productId ? 'تم استلام التوب وربطه بالمخزون' : 'تم استلام التوب');
    setRollOpen(false);
    setRollForm({ roll_number: '', fabric_type: '', color: '', width_cm: '', meters_received: '', weight_kg: '', supplier_name: '', notes: '', product_id: '' });
    load();
  };

  const recordCutting = async () => {
    const orderId = selectedId;
    if (!orderId) return toast.error('اختر أمر تشغيل');
    if (!cutForm.meters_actual || !cutForm.pieces_cut) return toast.error('المتراج الفعلي والقطع مطلوبان');
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
    const lot = (await supabase.from('garment_cutting_lots').select('variance_flag, inventory_deducted').eq('id', data).maybeSingle()).data;
    if (lot?.variance_flag) toast.warning('انحراف قص — يحتاج موافقة قبل ترحيل القطع');
    else if (lot?.inventory_deducted) toast.success('تم القص + خصم المتراج من المخزون');
    else toast.success('تم تسجيل القص (اربط أصناف القماش من المخزون للخصم التلقائي)');
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
    const delivering = advanceForm.to_stage === 'delivery' || advanceForm.to_stage === 'completed';
    if (delivering) {
      const { error } = await supabase.rpc('garment_deliver_and_invoice', {
        p_order_id: selectedId,
        p_quantity: Number(advanceForm.quantity) || null,
        p_paid_amount: 0,
        p_payment_method: 'credit',
        p_actor_name: actor,
        p_notes: advanceForm.notes || null,
      });
      if (error) return toast.error(error.message);
      toast.success('تم التسليم وإنشاء فاتورة بيع تلقائياً');
    } else {
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
    }
    setAdvanceOpen(false);
    load();
  };

  const deliverNow = async (order: any) => {
    setSelectedId(order.id);
    const { error } = await supabase.rpc('garment_deliver_and_invoice', {
      p_order_id: order.id,
      p_quantity: order.quantity_packed || order.quantity_planned,
      p_paid_amount: 0,
      p_payment_method: 'credit',
      p_actor_name: actor,
      p_notes: null,
    });
    if (error) return toast.error(error.message);
    toast.success('فاتورة بيع تم إنشاؤها من التسليم');
    load();
  };

  const saveCost = async () => {
    const orderId = selectedId;
    if (!orderId) return toast.error('اختر أمر تشغيل');
    if (!costForm.unit_cost && !costForm.quantity) return toast.error('أدخل الكمية وسعر الوحدة');
    const { error } = await supabase.rpc('garment_record_stage_cost', {
      p_restaurant_id: restaurantId,
      p_garment_order_id: orderId,
      p_stage: costForm.stage,
      p_cost_type: costForm.cost_type,
      p_quantity: Number(costForm.quantity) || 0,
      p_unit_cost: Number(costForm.unit_cost) || 0,
      p_vendor_name: costForm.vendor_name || null,
      p_outsourcing_job_id: null,
      p_notes: costForm.notes || null,
      p_actor_name: actor,
    });
    if (error) return toast.error(error.message);
    toast.success('تم تسجيل تكلفة المرحلة');
    setCostOpen(false);
    load();
  };

  const createOutsourcing = async () => {
    const orderId = selectedId;
    if (!orderId) return toast.error('اختر أمر تشغيل');
    if (!outForm.vendor_name.trim() || !outForm.qty_sent) return toast.error('الورشة والكمية مطلوبان');
    const { error } = await supabase.rpc('garment_create_outsourcing', {
      p_restaurant_id: restaurantId,
      p_garment_order_id: orderId,
      p_stage: outForm.stage,
      p_vendor_name: outForm.vendor_name.trim(),
      p_qty_sent: Number(outForm.qty_sent),
      p_unit_cost: Number(outForm.unit_cost) || 0,
      p_vendor_phone: outForm.vendor_phone || null,
      p_due_date: outForm.due_date || null,
      p_external_ref: outForm.external_ref || null,
      p_notes: outForm.notes || null,
      p_actor_name: actor,
      p_auto_cost: true,
    });
    if (error) return toast.error(error.message);
    toast.success('تم إرسال المرحلة للتصنيع الخارجي + تسجيل التكلفة');
    setOutOpen(false);
    setOutForm({ stage: 'front', vendor_name: '', vendor_phone: '', qty_sent: '', unit_cost: '', due_date: '', external_ref: '', notes: '' });
    setView('outsourcing');
    load();
  };

  const receiveOutsourcing = async () => {
    if (!recvJobId) return;
    const { error } = await supabase.rpc('garment_receive_outsourcing', {
      p_job_id: recvJobId,
      p_qty_received: Number(recvForm.qty_received) || 0,
      p_qty_rejected: Number(recvForm.qty_rejected) || 0,
      p_actor_name: actor,
      p_notes: recvForm.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success('تم استلام التصنيع الخارجي');
    setRecvOpen(false);
    setRecvForm({ qty_received: '', qty_rejected: '', notes: '' });
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

  const VIEWS = [
    { id: 'board', label: 'لوحة المراحل' },
    { id: 'fabrics', label: 'الأقمشة' },
    { id: 'cutting', label: 'رقابة القص' },
    { id: 'costs', label: 'تكاليف المراحل' },
    { id: 'outsourcing', label: 'تصنيع خارجي' },
  ] as const;

  return (
    <div className="space-y-4 p-1" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight">إنتاج مصنع الملابس</h1>
          <p className="text-xs text-muted-foreground">أتواب → قص + مخزون → مراحل/خارجي → فاتورة عند التسليم</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="w-4 h-4 ml-1" />تحديث</Button>
          <Button size="sm" onClick={() => setOrderOpen(true)}><Plus className="w-4 h-4 ml-1" />أمر تشغيل</Button>
          <Button size="sm" variant="secondary" onClick={() => setRollOpen(true)}><Package className="w-4 h-4 ml-1" />استلام توب</Button>
          <Button size="sm" variant="secondary" disabled={!selectedId} onClick={() => setCutOpen(true)}>
            <Scissors className="w-4 h-4 ml-1" />قص
          </Button>
          <Button size="sm" variant="secondary" disabled={!selectedId} onClick={() => setCostOpen(true)}>
            <DollarSign className="w-4 h-4 ml-1" />تكلفة مرحلة
          </Button>
          <Button size="sm" variant="secondary" disabled={!selectedId} onClick={() => setOutOpen(true)}>
            <Factory className="w-4 h-4 ml-1" />تصنيع خارجي
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          { label: 'أوامر نشطة', value: kpis.open, color: 'text-rose-600' },
          { label: 'قص بانتظار موافقة', value: kpis.pendingCut, color: 'text-amber-600' },
          { label: 'متر أقمشة', value: `${kpis.fabricM.toFixed(1)} م`, color: 'text-sky-600' },
          { label: 'خارجي معلّق', value: kpis.outOpen, color: 'text-orange-600' },
          { label: 'تكاليف مراحل', value: `${kpis.stageCost.toLocaleString()} ${currency}`, color: 'text-violet-600' },
          { label: 'قطع مسلّمة', value: kpis.delivered, color: 'text-emerald-600' },
        ].map(k => (
          <Card key={k.label} className="p-3 border-border/60">
            <div className="text-[10px] text-muted-foreground font-bold">{k.label}</div>
            <div className={cn('text-lg font-black mt-1', k.color)}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map(v => (
          <Button key={v.id} size="sm" variant={view === v.id ? 'default' : 'outline'} onClick={() => setView(v.id)}>
            {v.label}
          </Button>
        ))}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pr-8 h-9" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
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
                          <div>قص {o.quantity_cut || 0} · تعبئة {o.quantity_packed || 0}</div>
                          <div>تكلفة: {(Number(o.total_stage_cost || 0) + Number(o.total_outsourcing_cost || 0)).toLocaleString()} {currency}</div>
                          {o.sales_order_id && <Badge className="text-[9px] bg-emerald-600">فاتورة مرتبطة</Badge>}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button size="sm" className="h-7 text-[10px] flex-1" onClick={e => { e.stopPropagation(); openAdvance(o); }}>
                            مرحلة
                          </Button>
                          {!o.sales_order_id && (o.current_stage === 'packing' || o.current_stage === 'delivery') && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={e => { e.stopPropagation(); deliverNow(o); }}>
                              تسليم+فاتورة
                            </Button>
                          )}
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
                <th className="py-2 text-right">صنف مخزون</th>
                <th className="py-2 text-right">مستلم / مستهلك / متبقي</th>
                <th className="py-2 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rolls.map(r => {
                const rem = Number(r.meters_remaining ?? Math.max(Number(r.meters_received) - Number(r.meters_consumed), 0));
                const ord = orders.find(o => o.id === r.garment_order_id);
                const prod = products.find(p => p.id === r.product_id);
                return (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-2 font-bold">{r.roll_number}</td>
                    <td className="py-2">{ord?.order_number || '—'}</td>
                    <td className="py-2 text-xs">{prod ? `${prod.name} (${Number(prod.quantity).toFixed(1)})` : 'غير مربوط'}</td>
                    <td className="py-2">{Number(r.meters_received).toFixed(1)} / {Number(r.meters_consumed).toFixed(1)} / <span className={cn('font-black', rem < 5 ? 'text-rose-600' : 'text-emerald-600')}>{rem.toFixed(1)} م</span></td>
                    <td className="py-2"><Badge variant="outline">{r.status}</Badge></td>
                  </tr>
                );
              })}
              {rolls.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">لا توجد أتواب</td></tr>}
            </tbody>
          </table>
        </Card>
      ) : view === 'cutting' ? (
        <div className="space-y-3">
          {lots.some(l => l.requires_approval && l.status === 'pending') && (
            <Card className="p-3 border-amber-500/40 bg-amber-500/5 text-amber-700 font-bold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> دفعات قص تحتاج موافقة
            </Card>
          )}
          <Card className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-muted-foreground border-b">
                  <th className="py-2 text-right">الدفعة</th>
                  <th className="py-2 text-right">الأمر</th>
                  <th className="py-2 text-right">مخطط/فعلي</th>
                  <th className="py-2 text-right">هدر %</th>
                  <th className="py-2 text-right">مخزون</th>
                  <th className="py-2 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {lots.map(l => {
                  const ord = orders.find(o => o.id === l.garment_order_id);
                  return (
                    <tr key={l.id} className={cn('border-b', l.variance_flag && 'bg-rose-500/5')}>
                      <td className="py-2 font-bold">{l.lot_number}</td>
                      <td className="py-2">{ord?.order_number || '—'}</td>
                      <td className="py-2">{Number(l.meters_planned).toFixed(1)} / {Number(l.meters_actual).toFixed(1)}</td>
                      <td className="py-2 font-black">{Number(l.waste_pct || 0).toFixed(1)}%</td>
                      <td className="py-2">{l.inventory_deducted ? <Badge className="bg-emerald-600 text-[9px]">خُصم</Badge> : <Badge variant="outline" className="text-[9px]">—</Badge>}</td>
                      <td className="py-2">
                        {l.status === 'pending' && l.requires_approval && (
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => approveLot(l.id)}>موافقة</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      ) : view === 'costs' ? (
        <div className="space-y-3">
          <Card className="p-4">
            <div className="text-xs font-black mb-3">ملخص تكلفة المراحل {selected ? `— ${selected.order_number}` : '(كل الأوامر)'}</div>
            <div className="grid md:grid-cols-3 gap-2">
              {Object.entries(stageCostSummary).map(([stage, vals]) => (
                <Card key={stage} className="p-3 border-border/50">
                  <div className="font-bold text-sm">{STAGE_LABEL[stage] || stage}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                    <div>داخلي: {vals.internal.toLocaleString()}</div>
                    <div>خارجي: {vals.outsourcing.toLocaleString()}</div>
                    <div>مواد/أعباء: {(vals.material + vals.overhead).toLocaleString()}</div>
                  </div>
                  <div className="font-black text-primary mt-1">{vals.total.toLocaleString()} {currency}</div>
                </Card>
              ))}
              {Object.keys(stageCostSummary).length === 0 && (
                <div className="text-sm text-muted-foreground col-span-3 py-8 text-center">لا توجد تكاليف مراحل بعد — سجّل تكلفة أو صرّف مرحلة خارجياً</div>
              )}
            </div>
          </Card>
          <Card className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-muted-foreground border-b">
                  <th className="py-2 text-right">الأمر</th>
                  <th className="py-2 text-right">المرحلة</th>
                  <th className="py-2 text-right">النوع</th>
                  <th className="py-2 text-right">كمية × سعر</th>
                  <th className="py-2 text-right">الإجمالي</th>
                  <th className="py-2 text-right">جهة</th>
                </tr>
              </thead>
              <tbody>
                {(selectedId ? costs.filter(c => c.garment_order_id === selectedId) : costs).map(c => {
                  const ord = orders.find(o => o.id === c.garment_order_id);
                  return (
                    <tr key={c.id} className="border-b border-border/40">
                      <td className="py-2">{ord?.order_number || '—'}</td>
                      <td className="py-2">{STAGE_LABEL[c.stage] || c.stage}</td>
                      <td className="py-2"><Badge variant="outline">{COST_TYPES.find(t => t.id === c.cost_type)?.label || c.cost_type}</Badge></td>
                      <td className="py-2">{Number(c.quantity).toLocaleString()} × {Number(c.unit_cost).toLocaleString()}</td>
                      <td className="py-2 font-black">{Number(c.total_cost).toLocaleString()}</td>
                      <td className="py-2 text-xs">{c.vendor_name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          <Card className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-muted-foreground border-b">
                  <th className="py-2 text-right">الأمر</th>
                  <th className="py-2 text-right">المرحلة</th>
                  <th className="py-2 text-right">الورشة</th>
                  <th className="py-2 text-right">مرسل / مستلم / مرفوض</th>
                  <th className="py-2 text-right">تكلفة</th>
                  <th className="py-2 text-right">الحالة</th>
                  <th className="py-2 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => {
                  const ord = orders.find(o => o.id === j.garment_order_id);
                  return (
                    <tr key={j.id} className="border-b border-border/40">
                      <td className="py-2 font-bold">{ord?.order_number || '—'}</td>
                      <td className="py-2">{STAGE_LABEL[j.stage] || j.stage}</td>
                      <td className="py-2">
                        <div>{j.vendor_name}</div>
                        <div className="text-[10px] text-muted-foreground">{j.vendor_phone || j.external_ref || ''}</div>
                      </td>
                      <td className="py-2">{j.qty_sent} / {j.qty_received} / {j.qty_rejected}</td>
                      <td className="py-2 font-black">{Number(j.total_cost).toLocaleString()} {currency}</td>
                      <td className="py-2"><Badge variant={j.status === 'received' ? 'default' : 'secondary'}>{j.status}</Badge></td>
                      <td className="py-2">
                        {(j.status === 'sent' || j.status === 'partial') && (
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => {
                            setRecvJobId(j.id);
                            setRecvForm({ qty_received: String(j.qty_sent - j.qty_received), qty_rejected: '0', notes: '' });
                            setRecvOpen(true);
                          }}>استلام</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {jobs.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">لا أوامر تصنيع خارجي</td></tr>}
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
            <span>داخلي {Number(selected.total_stage_cost || 0).toLocaleString()} · خارجي {Number(selected.total_outsourcing_cost || 0).toLocaleString()} {currency}</span>
            {selected.sales_order_id && <Badge className="bg-emerald-600">فاتورة بيع</Badge>}
            <Button size="sm" className="h-7 mr-auto" onClick={() => openAdvance(selected)}>نقل مرحلة</Button>
          </div>
        </Card>
      )}

      {/* dialogs */}
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>أمر تشغيل جديد</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1"><Label>الموديل *</Label><Input value={orderForm.style_name} onChange={e => setOrderForm(f => ({ ...f, style_name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>رقم الأمر</Label><Input value={orderForm.order_number} onChange={e => setOrderForm(f => ({ ...f, order_number: e.target.value }))} /></div>
            <div className="space-y-1"><Label>كود الموديل</Label><Input value={orderForm.style_code} onChange={e => setOrderForm(f => ({ ...f, style_code: e.target.value }))} /></div>
            <div className="space-y-1"><Label>العميل</Label><Input value={orderForm.customer_name} onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>الكمية</Label><Input type="number" value={orderForm.quantity_planned} onChange={e => setOrderForm(f => ({ ...f, quantity_planned: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label>سعر القطعة</Label><Input type="number" value={orderForm.unit_price} onChange={e => setOrderForm(f => ({ ...f, unit_price: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label>حد هدر %</Label><Input type="number" value={orderForm.cutting_waste_limit_pct} onChange={e => setOrderForm(f => ({ ...f, cutting_waste_limit_pct: Number(e.target.value) }))} /></div>
            <div className="col-span-2 space-y-1">
              <Label>صنف قماش من المخزون (للخصم عند القص)</Label>
              <Select value={orderForm.fabric_product_id || 'none'} onValueChange={v => setOrderForm(f => ({ ...f, fabric_product_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون ربط</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — رصيد {Number(p.quantity).toFixed(1)} {p.unit || 'م'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1"><Label>ملاحظات</Label><Textarea value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={createOrder}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rollOpen} onOpenChange={setRollOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>استلام توب</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={selectedId || ''} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="أمر التشغيل" /></SelectTrigger>
              <SelectContent>
                {orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.order_number} — {o.style_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="رقم التوب *" value={rollForm.roll_number} onChange={e => setRollForm(f => ({ ...f, roll_number: e.target.value }))} />
            <Input type="number" placeholder="المتراج المستلم *" value={rollForm.meters_received} onChange={e => setRollForm(f => ({ ...f, meters_received: e.target.value }))} />
            <Select value={rollForm.product_id || 'none'} onValueChange={v => setRollForm(f => ({ ...f, product_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="صنف المخزون" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون ربط مخزون</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({Number(p.quantity).toFixed(1)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">عند القص يُخصم المتراج الفعلي من رصيد هذا الصنف مباشرة.</p>
          </div>
          <DialogFooter><Button onClick={addRoll}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cutOpen} onOpenChange={setCutOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>قص + خصم مخزون</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={cutForm.fabric_roll_id} onValueChange={v => setCutForm(f => ({ ...f, fabric_roll_id: v }))}>
              <SelectTrigger><SelectValue placeholder="التوب" /></SelectTrigger>
              <SelectContent>
                {orderRolls.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.roll_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="متراج مخطط" value={cutForm.meters_planned} onChange={e => setCutForm(f => ({ ...f, meters_planned: e.target.value }))} />
              <Input type="number" placeholder="متراج فعلي *" value={cutForm.meters_actual} onChange={e => setCutForm(f => ({ ...f, meters_actual: e.target.value }))} />
              <Input type="number" placeholder="قطع مخططة" value={cutForm.pieces_planned} onChange={e => setCutForm(f => ({ ...f, pieces_planned: e.target.value }))} />
              <Input type="number" placeholder="قطع مقصوصة *" value={cutForm.pieces_cut} onChange={e => setCutForm(f => ({ ...f, pieces_cut: e.target.value }))} />
            </div>
          </div>
          <DialogFooter><Button onClick={recordCutting}><ClipboardList className="w-4 h-4 ml-1" />حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>نقل مرحلة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={advanceForm.to_stage} onValueChange={v => setAdvanceForm(f => ({ ...f, to_stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {(advanceForm.to_stage === 'delivery' || advanceForm.to_stage === 'completed') && (
              <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-emerald-800">
                سيتم إنشاء فاتورة بيع تلقائياً وربطها بالأمر.
              </div>
            )}
            <Input type="number" placeholder="الكمية" value={advanceForm.quantity} onChange={e => setAdvanceForm(f => ({ ...f, quantity: e.target.value }))} />
            <Textarea placeholder="ملاحظات" value={advanceForm.notes} onChange={e => setAdvanceForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter><Button onClick={advanceStage}>تأكيد</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>تكلفة مرحلة إنتاجية</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={costForm.stage} onValueChange={v => setCostForm(f => ({ ...f, stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={costForm.cost_type} onValueChange={v => setCostForm(f => ({ ...f, cost_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COST_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="الكمية" value={costForm.quantity} onChange={e => setCostForm(f => ({ ...f, quantity: e.target.value }))} />
              <Input type="number" placeholder="تكلفة الوحدة" value={costForm.unit_cost} onChange={e => setCostForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <Input placeholder="جهة / مركز تكلفة" value={costForm.vendor_name} onChange={e => setCostForm(f => ({ ...f, vendor_name: e.target.value }))} />
            <Textarea placeholder="ملاحظات" value={costForm.notes} onChange={e => setCostForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter><Button onClick={saveCost}>حفظ التكلفة</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={outOpen} onOpenChange={setOutOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>إرسال مرحلة لتصنيع خارجي</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">لو مرحلة معينة مكلفة داخلياً، أرسلها لورشة خارجية وتابع الاستلام والتكلفة هنا.</p>
            <Select value={outForm.stage} onValueChange={v => setOutForm(f => ({ ...f, stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.filter(s => !['fabric_receipt','completed'].includes(s.id)).map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="اسم الورشة / المصنع *" value={outForm.vendor_name} onChange={e => setOutForm(f => ({ ...f, vendor_name: e.target.value }))} />
            <Input placeholder="هاتف" value={outForm.vendor_phone} onChange={e => setOutForm(f => ({ ...f, vendor_phone: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="كمية مرسلة *" value={outForm.qty_sent} onChange={e => setOutForm(f => ({ ...f, qty_sent: e.target.value }))} />
              <Input type="number" placeholder="تكلفة القطعة" value={outForm.unit_cost} onChange={e => setOutForm(f => ({ ...f, unit_cost: e.target.value }))} />
              <Input type="date" value={outForm.due_date} onChange={e => setOutForm(f => ({ ...f, due_date: e.target.value }))} />
              <Input placeholder="مرجع خارجي" value={outForm.external_ref} onChange={e => setOutForm(f => ({ ...f, external_ref: e.target.value }))} />
            </div>
          </div>
          <DialogFooter><Button onClick={createOutsourcing}>إرسال + تسجيل تكلفة</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recvOpen} onOpenChange={setRecvOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>استلام من التصنيع الخارجي</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="number" placeholder="كمية مستلمة" value={recvForm.qty_received} onChange={e => setRecvForm(f => ({ ...f, qty_received: e.target.value }))} />
            <Input type="number" placeholder="مرفوض" value={recvForm.qty_rejected} onChange={e => setRecvForm(f => ({ ...f, qty_rejected: e.target.value }))} />
            <Textarea placeholder="ملاحظات" value={recvForm.notes} onChange={e => setRecvForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter><Button onClick={receiveOutsourcing}>تأكيد الاستلام</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GarmentFactoryHub;
