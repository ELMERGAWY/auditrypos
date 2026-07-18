// @ts-nocheck
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Truck, Search, LayoutGrid, Rows3, Clock, PlayCircle, CheckCircle2, XCircle,
  Phone, MapPin, Receipt, User, Package, FileText, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DeliveryTab } from './DeliveryTab';

type DeliveryStatus = 'pending' | 'in_progress' | 'contacted' | 'no_answer' | 'delivered' | 'cancelled';

const STATUS_META: Record<DeliveryStatus, { label: string; color: string; icon: any; bg: string }> = {
  pending: { label: 'قيد الانتظار', color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/30', icon: Clock },
  in_progress: { label: 'قيد التنفيذ', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/30', icon: PlayCircle },
  contacted: { label: 'تم التواصل', color: 'text-indigo-600', bg: 'bg-indigo-500/10 border-indigo-500/30', icon: Phone },
  no_answer: { label: 'بدون رد', color: 'text-rose-600', bg: 'bg-rose-500/10 border-rose-500/30', icon: Phone },
  delivered: { label: 'تم التسليم', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  cancelled: { label: 'ملغي', color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle },
};

interface DeliveryItem {
  id: string;
  source: 'order' | 'invoice';
  number: string;
  customer_name?: string;
  customer_phone?: string;
  address?: string;
  total: number;
  created_at: string;
  delivery_status: DeliveryStatus;
  agent_id?: string;
  service_desc?: string;
  currency?: string;
  contact_logs?: any[];
}

export function DeliveryHub(props: any) {
  const { restaurantId, agents, currency } = props;
  const [view, setView] = useState<'kanban' | 'table' | 'legacy'>('kanban');
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [dragging, setDragging] = useState<DeliveryItem | null>(null);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [ordersRes, invRes, logsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, customer_name, customer_phone, delivery_address, total, created_at, delivery_status, delivery_agent_id, order_type')
          .eq('restaurant_id', restaurantId)
          .or('order_type.eq.delivery,delivery_agent_id.not.is.null')
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(300),
        supabase
          .from('service_invoices')
          .select('id, invoice_number, customer_name, customer_phone, service_description, total_amount, invoice_date, delivery_status, created_at')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(300),
        supabase
          .from('delivery_contact_logs')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
      ]);

      const logs = logsRes.data || [];
      const merged: DeliveryItem[] = [];
      (ordersRes.data || []).forEach((o: any) => merged.push({
        id: o.id,
        source: 'order',
        number: o.order_number,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        address: o.delivery_address,
        total: Number(o.total || 0),
        created_at: o.created_at,
        delivery_status: (o.delivery_status || 'pending') as DeliveryStatus,
        agent_id: o.delivery_agent_id,
        contact_logs: logs.filter((l: any) => l.order_id === o.id),
      }));
      (invRes.data || []).forEach((i: any) => merged.push({
        id: i.id,
        source: 'invoice',
        number: i.invoice_number,
        customer_name: i.customer_name,
        customer_phone: i.customer_phone,
        service_desc: i.service_description,
        total: Number(i.total_amount || 0),
        created_at: i.created_at || i.invoice_date,
        delivery_status: (i.delivery_status || 'pending') as DeliveryStatus,
        contact_logs: logs.filter((l: any) => l.invoice_id === i.id),
      }));
      setItems(merged);
    } catch (e: any) {
      toast.error('فشل تحميل قائمة التسليم');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  // realtime
  useEffect(() => {
    if (!restaurantId) return;
    const ch = supabase
      .channel(`delivery-hub-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_invoices', filter: `restaurant_id=eq.${restaurantId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_contact_logs', filter: `restaurant_id=eq.${restaurantId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [restaurantId, load]);

  const filtered = useMemo(() => {
    if (!q) return items;
    const s = q.toLowerCase();
    return items.filter(i =>
      i.number?.toLowerCase().includes(s) ||
      i.customer_name?.toLowerCase().includes(s) ||
      i.customer_phone?.includes(s) ||
      i.address?.toLowerCase().includes(s)
    );
  }, [items, q]);

  const grouped = useMemo(() => ({
    pending: filtered.filter(i => i.delivery_status === 'pending'),
    in_progress: filtered.filter(i => i.delivery_status === 'in_progress'),
    contacted: filtered.filter(i => i.delivery_status === 'contacted'),
    no_answer: filtered.filter(i => i.delivery_status === 'no_answer'),
    delivered: filtered.filter(i => i.delivery_status === 'delivered'),
  }), [filtered]);

  const logContactAttempt = async (item: DeliveryItem, status: 'contacted' | 'no_answer') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const insertData: any = {
        restaurant_id: restaurantId,
        source: item.source,
        status,
        created_by: user?.id || null,
      };
      if (item.source === 'order') {
        insertData.order_id = item.id;
      } else {
        insertData.invoice_id = item.id;
      }
      const { error } = await supabase.from('delivery_contact_logs').insert(insertData);
      if (error) throw error;
    } catch (e: any) {
      console.error('Error logging contact attempt:', e);
    }
  };

  const updateStatus = async (item: DeliveryItem, status: DeliveryStatus) => {
    // If transitioning to contacted or no_answer, log it first
    if (status === 'contacted' || status === 'no_answer') {
      await logContactAttempt(item, status);
    }

    // optimistic
    setItems(prev => prev.map(x => x.id === item.id && x.source === item.source ? { ...x, delivery_status: status } : x));
    const table = item.source === 'order' ? 'orders' : 'service_invoices';
    const { error } = await supabase.from(table).update({ delivery_status: status }).eq('id', item.id);
    if (error) {
      toast.error('فشل تحديث الحالة');
      load();
    } else {
      toast.success(`تم النقل إلى: ${STATUS_META[status].label}`);
    }
  };

  const onDrop = (status: DeliveryStatus) => {
    if (!dragging) return;
    if (dragging.delivery_status !== status) updateStatus(dragging, status);
    setDragging(null);
  };

  if (view === 'legacy') {
    return (
      <div>
        <div className="p-4 flex justify-end">
          <div className="inline-flex rounded-xl bg-secondary p-1">
            <Button size="sm" variant={view === 'legacy' ? 'default' : 'ghost'} onClick={() => setView('kanban')}>
              <LayoutGrid className="w-4 h-4 ml-1" /> عودة إلى لوحة التسليم
            </Button>
          </div>
        </div>
        <DeliveryTab {...props} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <div className="p-2 rounded-2xl gradient-bg text-white shadow-lg">
              <Truck className="w-6 h-6" />
            </div>
            مركز التسليم الموحّد
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            كل الطلبات وفواتير الخدمات في مكان واحد — اسحب البطاقة لتغيير حالتها فوراً.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-1 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </Button>
          <div className="inline-flex rounded-xl bg-secondary p-1">
            <Button size="sm" variant={view === 'kanban' ? 'default' : 'ghost'} onClick={() => setView('kanban')} className="gap-1">
              <LayoutGrid className="w-4 h-4" /> لوحة Kanban
            </Button>
            <Button size="sm" variant={view === 'table' ? 'default' : 'ghost'} onClick={() => setView('table')} className="gap-1">
              <Rows3 className="w-4 h-4" /> جدول
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setView('legacy')} className="gap-1">
              <Truck className="w-4 h-4" /> المناديب
            </Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(['pending', 'in_progress', 'contacted', 'no_answer', 'delivered'] as DeliveryStatus[]).map(s => {
          const M = STATUS_META[s];
          const count = grouped[s]?.length || 0;
          return (
            <Card key={s} className={`p-4 border ${M.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold ${M.color}`}>{M.label}</p>
                  <p className="text-3xl font-black mt-1">{count}</p>
                </div>
                <M.icon className={`w-8 h-8 ${M.color}`} />
              </div>
            </Card>
          );
        })}
        <Card className="p-4 border col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground">إجمالي القيمة قيد التنفيذ</p>
              <p className="text-2xl font-black mt-1 text-primary">
                {(
                  grouped.in_progress.reduce((s, i) => s + i.total, 0) +
                  grouped.pending.reduce((s, i) => s + i.total, 0) +
                  grouped.contacted.reduce((s, i) => s + i.total, 0) +
                  grouped.no_answer.reduce((s, i) => s + i.total, 0)
                ).toFixed(0)}{' '}
                <span className="text-xs">{currency || 'ج.م'}</span>
              </p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="ابحث برقم الفاتورة، اسم العميل، الهاتف أو العنوان..."
          className="pr-12 h-11 rounded-xl"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="text-center py-8 text-muted-foreground text-sm">جاري التحميل...</div>}

      {!loading && view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(['pending', 'in_progress', 'contacted', 'no_answer', 'delivered'] as DeliveryStatus[]).map(s => {
            const M = STATUS_META[s];
            return (
              <div
                key={s}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(s)}
                className={`rounded-2xl border-2 border-dashed p-3 min-h-[450px] flex flex-col ${M.bg}`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className={`flex items-center gap-2 font-black ${M.color}`}>
                    <M.icon className="w-5 h-5" />
                    {M.label}
                  </div>
                  <Badge variant="outline" className="font-mono">{grouped[s].length}</Badge>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1 custom-scrollbar">
                  {grouped[s].map(it => (
                    <motion.div
                      key={`${it.source}-${it.id}`}
                      layout
                      draggable
                      onDragStart={() => setDragging(it)}
                      onDragEnd={() => setDragging(null)}
                      className="glass-card p-3 cursor-move hover:shadow-lg transition-all border-l-4"
                      style={{ borderLeftColor: it.source === 'invoice' ? 'hsl(var(--primary))' : 'hsl(var(--accent-foreground))' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1 text-xs font-bold">
                          {it.source === 'invoice' ? <Receipt className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          #{it.number?.slice(-6) || '—'}
                        </div>
                        <span className="text-[10px] font-black text-primary">
                          {it.total.toFixed(0)} {currency || 'ج.م'}
                        </span>
                      </div>
                      {it.customer_name && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <User className="w-3 h-3" /> {it.customer_name}
                        </div>
                      )}
                      {it.customer_phone && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Phone className="w-3 h-3" /> {it.customer_phone}
                        </div>
                      )}
                      {it.address && (
                        <div className="flex items-start gap-1 text-[10px] text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{it.address}</span>
                        </div>
                      )}
                      {it.service_desc && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{it.service_desc}</p>
                      )}

                      {/* Contact attempts history list */}
                      {it.contact_logs && it.contact_logs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                          <p className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> سجل المتابعة والاتصال ({it.contact_logs.length}):
                          </p>
                          <div className="max-h-[80px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {it.contact_logs.map((log: any) => {
                              const isContacted = log.status === 'contacted';
                              return (
                                <div
                                  key={log.id}
                                  className={`flex items-center justify-between text-[9px] px-1.5 py-0.5 rounded border ${
                                    isContacted
                                      ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                                      : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                  }`}
                                >
                                  <span className="font-bold flex items-center gap-1">
                                    {isContacted ? '📞 تم التواصل' : '📵 بدون رد'}
                                  </span>
                                  <span className="opacity-85 text-[8px] font-mono">
                                    {new Date(log.created_at).toLocaleDateString('ar-EG', { month: '2-digit', day: '2-digit' })}{' '}
                                    {new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quick transition & call logs buttons */}
                      <div className="flex gap-1 mt-2 pt-2 border-t border-border/50 flex-wrap">
                        {s !== 'delivered' && (
                          <>
                            <button
                              onClick={() => updateStatus(it, 'contacted')}
                              className="flex-1 py-1 px-1 rounded text-[9px] font-bold border bg-indigo-500/10 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/20"
                              title="تسجيل مكالمة ناجحة (تم التواصل)"
                            >
                              📞 تم التواصل
                            </button>
                            <button
                              onClick={() => updateStatus(it, 'no_answer')}
                              className="flex-1 py-1 px-1 rounded text-[9px] font-bold border bg-rose-500/10 border-rose-500/30 text-rose-600 hover:bg-rose-500/20"
                              title="تسجيل مكالمة غير مجابة (لا يوجد رد)"
                            >
                              📵 لا رد
                            </button>
                          </>
                        )}
                        {s !== 'delivered' && s !== 'pending' && (
                          <button
                            onClick={() => updateStatus(it, 'delivered')}
                            className="w-full mt-1 py-1 rounded text-[9px] font-bold border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20"
                          >
                            ✓ تم التسليم
                          </button>
                        )}
                        {s === 'pending' && (
                          <button
                            onClick={() => updateStatus(it, 'in_progress')}
                            className="w-full mt-1 py-1 rounded text-[9px] font-bold border bg-blue-500/10 border-blue-500/30 text-blue-600 hover:bg-blue-500/20"
                          >
                            → تنفيذ
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {grouped[s].length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8 my-auto opacity-50">اسحب هنا</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && view === 'table' && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">الرقم</th>
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">الهاتف</th>
                <th className="p-3 text-right">العنوان / الخدمة</th>
                <th className="p-3 text-right">آخر مكالمات</th>
                <th className="p-3 text-right">القيمة</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it => {
                const M = STATUS_META[it.delivery_status];
                return (
                  <tr key={`${it.source}-${it.id}`} className="border-t hover:bg-muted/40">
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">
                        {it.source === 'invoice' ? 'فاتورة خدمة' : 'طلب'}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-xs">#{it.number}</td>
                    <td className="p-3">{it.customer_name || '—'}</td>
                    <td className="p-3 text-xs">{it.customer_phone || '—'}</td>
                    <td className="p-3 text-xs max-w-[200px] truncate">{it.address || it.service_desc || '—'}</td>
                    <td className="p-3 text-xs">
                      {it.contact_logs && it.contact_logs.length > 0 ? (
                        <div className="flex gap-1 flex-wrap max-w-[200px]">
                          {it.contact_logs.slice(0, 3).map((log: any) => (
                            <Badge
                              key={log.id}
                              variant="outline"
                              className={`text-[8px] ${
                                log.status === 'contacted'
                                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600'
                              }`}
                            >
                              {log.status === 'contacted' ? 'تم التواصل' : 'لا رد'} (
                              {new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-primary">{it.total.toFixed(2)} {currency || 'ج.م'}</td>
                    <td className="p-3">
                      <select
                        value={it.delivery_status}
                        onChange={e => updateStatus(it, e.target.value as DeliveryStatus)}
                        className={`text-xs font-bold rounded-lg px-2 py-1 border ${M.bg} ${M.color}`}
                      >
                        {(['pending', 'in_progress', 'contacted', 'no_answer', 'delivered', 'cancelled'] as DeliveryStatus[]).map(x => (
                          <option key={x} value={x}>{STATUS_META[x].label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا يوجد بيانات للتسليم بعد</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
