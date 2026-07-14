// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Calendar, AlertTriangle, CheckCircle, Clock,
  Package, Search, Filter, Truck, RefreshCcw, User, Hash, Layers, ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DeliverableSource = 'marketing' | 'order';

interface DeliverableItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  sold_unit?: string | null;
  variables?: any;
  is_delivered?: boolean;
}

interface ServiceDeliverable {
  id: string;
  source: DeliverableSource;
  contract_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  invoice_line_id: string | null;
  service_id: string | null;
  service_name: string;
  description: string | null;
  expected_delivery_date: string;
  actual_delivery_date: string | null;
  status: string;
  priority: string;
  notes: string | null;
  created_at: string;
  invoice_number?: string;
  customer_name?: string;
  customer_phone?: string;
  item_labels?: string[];
  items?: DeliverableItem[];
  delivery_received_by?: string | null;
  delivery_receipt_note?: string | null;
  delivered_count?: number;
  items_count?: number;
}

interface Props {
  restaurantId: string;
  currency?: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-slate-500', text: 'text-slate-700', soft: 'bg-slate-500/10 border-slate-500/30' },
  { value: 'in_progress', label: 'قيد التنفيذ', color: 'bg-sky-500', text: 'text-sky-700', soft: 'bg-sky-500/10 border-sky-500/30' },
  { value: 'partial', label: 'تسليم جزئي', color: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-500/10 border-amber-500/30' },
  { value: 'delivered', label: 'تم التسليم', color: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-500/10 border-emerald-500/30' },
  { value: 'delayed', label: 'متأخر', color: 'bg-rose-500', text: 'text-rose-700', soft: 'bg-rose-500/10 border-rose-500/30' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-zinc-400', text: 'text-zinc-600', soft: 'bg-zinc-500/10 border-zinc-500/30' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'منخفض', color: 'border-zinc-400 text-zinc-600' },
  { value: 'medium', label: 'متوسط', color: 'border-amber-500 text-amber-700' },
  { value: 'high', label: 'عالي', color: 'border-orange-500 text-orange-700' },
  { value: 'urgent', label: 'عاجل', color: 'border-rose-600 text-rose-700' },
];

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function mapOrderDeliveryStatus(
  deliveryStatus: string | null | undefined,
  expectedDate: string,
  deliveredCount = 0,
  itemsCount = 0
): string {
  const ds = String(deliveryStatus || 'pending');
  if (ds === 'delivered' || ds === 'completed') return 'delivered';
  if (ds === 'cancelled') return 'cancelled';
  if (ds === 'partial' || (itemsCount > 0 && deliveredCount > 0 && deliveredCount < itemsCount)) return 'partial';
  if (ds === 'in_progress' || ds === 'out_for_delivery' || ds === 'preparing') return 'in_progress';
  if (daysUntil(expectedDate) < 0) return 'delayed';
  return 'pending';
}

function toOrderDeliveryStatus(status: string): string {
  if (status === 'delivered') return 'delivered';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'partial') return 'partial';
  if (status === 'in_progress') return 'in_progress';
  return 'pending';
}

const emptyForm = {
  contract_id: '',
  quote_id: '',
  invoice_id: '',
  service_id: '',
  service_name: '',
  description: '',
  expected_delivery_date: '',
  actual_delivery_date: '',
  status: 'pending',
  priority: 'medium',
  notes: '',
};

export function ServiceDeliverables({ restaurantId }: Props) {
  const [deliverables, setDeliverables] = useState<ServiceDeliverable[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<ServiceDeliverable | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Receipt confirmation (who received + date + item selection)
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<ServiceDeliverable | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [receiptForm, setReceiptForm] = useState({
    received_by: '',
    receipt_date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [savingReceipt, setSavingReceipt] = useState(false);

  const safeContracts = Array.isArray(contracts) ? contracts : [];
  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const safeServices = Array.isArray(services) ? services : [];

  const loadDeliverables = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [{ data: marketingDeliverables, error: marketingError }, { data: ordersWithDelivery, error: ordersError }] =
        await Promise.all([
          supabase
            .from('marketing_service_deliverables')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('expected_delivery_date', { ascending: true }),
          supabase
            .from('orders')
            .select('id, order_number, customer_name, customer_phone, notes, delivery_date, delivery_status, actual_delivery_date, delivery_received_by, delivery_receipt_note, created_at, status, order_items(id, menu_item_name, quantity, sold_unit, variables, is_delivered)')
            .eq('restaurant_id', restaurantId)
            .not('delivery_date', 'is', null)
            .neq('status', 'cancelled')
            .order('delivery_date', { ascending: true }),
        ]);

      if (marketingError) throw marketingError;
      let ordersData = ordersWithDelivery;
      if (ordersError) {
        // Fallback if new receipt columns not migrated yet
        const fb = await supabase
          .from('orders')
          .select('id, order_number, customer_name, customer_phone, notes, delivery_date, delivery_status, created_at, status, order_items(id, menu_item_name, quantity, sold_unit, variables)')
          .eq('restaurant_id', restaurantId)
          .not('delivery_date', 'is', null)
          .neq('status', 'cancelled')
          .order('delivery_date', { ascending: true });
        if (fb.error) throw fb.error;
        ordersData = fb.data;
      }

      const fromMarketing: ServiceDeliverable[] = (marketingDeliverables || []).map((d: any) => {
        let status = d.status || 'pending';
        if (status !== 'delivered' && status !== 'cancelled' && d.expected_delivery_date && daysUntil(d.expected_delivery_date) < 0) {
          status = 'delayed';
        }
        return {
          ...d,
          source: 'marketing' as const,
          status,
          priority: d.priority || 'medium',
          items: [],
          delivered_count: status === 'delivered' ? 1 : 0,
          items_count: 1,
        };
      });

      const fromOrders: ServiceDeliverable[] = (ordersData || []).map((order: any) => {
        const items: DeliverableItem[] = (Array.isArray(order.order_items) ? order.order_items : []).map((it: any) => ({
          id: it.id,
          menu_item_name: it.menu_item_name || 'صنف',
          quantity: Number(it.quantity) || 0,
          sold_unit: it.sold_unit,
          variables: it.variables,
          is_delivered: !!it.is_delivered,
        }));
        const labels = items.map((it) => {
          const unit = it.sold_unit ? ` (${it.sold_unit})` : '';
          return `${it.menu_item_name}${unit} ×${it.quantity}${it.is_delivered ? ' ✓' : ''}`;
        });
        const deliveredCount = items.filter((i) => i.is_delivered).length;
        const expected = order.delivery_date;
        return {
          id: order.id,
          source: 'order' as const,
          contract_id: null,
          quote_id: null,
          invoice_id: null,
          invoice_line_id: null,
          service_id: null,
          service_name: labels[0] || `طلب #${String(order.order_number || '').slice(-4)}`,
          description: order.notes || null,
          expected_delivery_date: expected,
          actual_delivery_date: order.actual_delivery_date || null,
          status: mapOrderDeliveryStatus(order.delivery_status, expected, deliveredCount, items.length),
          priority: 'medium',
          notes: order.notes || null,
          created_at: order.created_at,
          invoice_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          item_labels: labels,
          items,
          delivery_received_by: order.delivery_received_by || null,
          delivery_receipt_note: order.delivery_receipt_note || null,
          delivered_count: deliveredCount,
          items_count: items.length,
        };
      });

      const combined = [...fromMarketing, ...fromOrders].sort(
        (a, b) =>
          new Date(a.expected_delivery_date).getTime() - new Date(b.expected_delivery_date).getTime()
      );
      setDeliverables(combined);
    } catch (e: any) {
      toast.error('خطأ في تحميل التسليمات: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const loadRelatedData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const [contractsRes, quotesRes, servicesRes, invoicesRes] = await Promise.all([
        supabase.from('marketing_contracts').select('id, contract_number, customer_name').eq('restaurant_id', restaurantId),
        supabase.from('marketing_quotes').select('id, quote_number, customer_name').eq('restaurant_id', restaurantId),
        supabase.from('marketing_services').select('id, name').eq('restaurant_id', restaurantId),
        supabase
          .from('orders')
          .select('id, order_number, customer_name, order_items(*)')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      setContracts(contractsRes.data || []);
      setQuotes(quotesRes.data || []);
      setServices(servicesRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (e) {
      console.error('Error loading related data:', e);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadDeliverables();
    loadRelatedData();
  }, [loadDeliverables, loadRelatedData]);

  const openReceiptConfirm = (deliverable: ServiceDeliverable, preferAll = false) => {
    setReceiptTarget(deliverable);
    const items = deliverable.items || [];
    if (preferAll || deliverable.source === 'marketing') {
      setSelectedItemIds(items.map((i) => i.id));
    } else {
      setSelectedItemIds(items.filter((i) => i.is_delivered).map((i) => i.id));
    }
    setReceiptForm({
      received_by: deliverable.delivery_received_by || '',
      receipt_date: deliverable.actual_delivery_date
        ? String(deliverable.actual_delivery_date).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      note: deliverable.delivery_receipt_note || '',
    });
    setShowReceiptModal(true);
  };

  const updateStatusQuick = async (deliverable: ServiceDeliverable, nextStatus: string) => {
    if (deliverable.status === nextStatus) return;

    // تسليم كامل / جزئي → نافذة اختيار الأصناف + المستلم + التاريخ
    if (nextStatus === 'delivered' || nextStatus === 'partial') {
      openReceiptConfirm(deliverable, nextStatus === 'delivered');
      return;
    }

    setSavingId(deliverable.id);
    const prev = deliverable.status;
    setDeliverables((list) =>
      list.map((d) => (d.id === deliverable.id ? { ...d, status: nextStatus } : d))
    );
    try {
      if (deliverable.source === 'order') {
        const { error } = await supabase
          .from('orders')
          .update({ delivery_status: toOrderDeliveryStatus(nextStatus) } as any)
          .eq('id', deliverable.id);
        if (error) throw error;
      } else {
        const payload: any = {
          status: nextStatus,
          updated_at: new Date().toISOString(),
        };
        if (nextStatus !== 'delivered') payload.actual_delivery_date = null;
        const { error } = await supabase
          .from('marketing_service_deliverables')
          .update(payload)
          .eq('id', deliverable.id);
        if (error) throw error;
      }
      toast.success('تم تحديث الحالة');
      loadDeliverables();
    } catch (e: any) {
      setDeliverables((list) =>
        list.map((d) => (d.id === deliverable.id ? { ...d, status: prev } : d))
      );
      toast.error('فشل تحديث الحالة: ' + e.message);
    } finally {
      setSavingId(null);
    }
  };

  const saveReceiptConfirm = async () => {
    if (!receiptTarget) return;
    if (!receiptForm.received_by.trim()) {
      toast.error('اكتب اسم من استلم الطلب');
      return;
    }
    if (!receiptForm.receipt_date) {
      toast.error('حدد تاريخ الاستلام');
      return;
    }

    const items = receiptTarget.items || [];
    if (receiptTarget.source === 'order' && items.length > 0 && selectedItemIds.length === 0) {
      toast.error('اختر صنفًا واحدًا على الأقل، أو الكل');
      return;
    }

    setSavingReceipt(true);
    try {
      const selected = new Set(selectedItemIds);
      const allDelivered =
        receiptTarget.source === 'marketing' ||
        (items.length > 0 && items.every((i) => selected.has(i.id))) ||
        (items.length === 0 && selectedItemIds.length === 0);
      const anyDelivered = receiptTarget.source === 'marketing' || selectedItemIds.length > 0;
      const nextStatus = allDelivered ? 'delivered' : anyDelivered ? 'partial' : 'pending';

      if (receiptTarget.source === 'order') {
        // Update each item delivery flag
        for (const item of items) {
          const delivered = selected.has(item.id);
          const { error: itemErr } = await supabase
            .from('order_items')
            .update({
              is_delivered: delivered,
              delivered_at: delivered ? new Date().toISOString() : null,
            } as any)
            .eq('id', item.id);
          if (itemErr) {
            // Columns may not exist yet — soft warn once
            if (String(itemErr.message || '').includes('is_delivered')) {
              toast.error('يلزم تشغيل migration أعمدة التسليم الجزئي في Supabase');
              throw itemErr;
            }
            throw itemErr;
          }
        }

        const receiptNote = [
          receiptForm.note?.trim() || '',
          `استلم: ${receiptForm.received_by.trim()}`,
          `بتاريخ: ${receiptForm.receipt_date}`,
        ]
          .filter(Boolean)
          .join(' | ');

        const { error } = await supabase
          .from('orders')
          .update({
            delivery_status: toOrderDeliveryStatus(nextStatus),
            actual_delivery_date: receiptForm.receipt_date,
            delivery_received_by: receiptForm.received_by.trim(),
            delivery_receipt_note: receiptNote,
          } as any)
          .eq('id', receiptTarget.id);
        if (error) throw error;
      } else {
        const note = [
          receiptForm.note?.trim() || receiptTarget.notes || '',
          `استلم: ${receiptForm.received_by.trim()}`,
        ]
          .filter(Boolean)
          .join(' | ');
        const { error } = await supabase
          .from('marketing_service_deliverables')
          .update({
            status: nextStatus,
            actual_delivery_date: receiptForm.receipt_date,
            notes: note,
            updated_at: new Date().toISOString(),
          })
          .eq('id', receiptTarget.id);
        if (error) throw error;
      }

      toast.success(allDelivered ? 'تم تسجيل التسليم الكامل' : 'تم تسجيل التسليم الجزئي');
      setShowReceiptModal(false);
      setReceiptTarget(null);
      loadDeliverables();
    } catch (e: any) {
      toast.error('فشل تسجيل التسليم: ' + e.message);
    } finally {
      setSavingReceipt(false);
    }
  };

  const handleSave = async () => {
    if (!form.service_name.trim() || !form.expected_delivery_date) {
      toast.error('يرجى إدخال اسم الخدمة وتاريخ التسليم المتوقع');
      return;
    }
    if (editingDeliverable?.source === 'order') {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('orders')
          .update({
            delivery_date: form.expected_delivery_date,
            delivery_status: toOrderDeliveryStatus(form.status),
            notes: form.notes || form.description || null,
          } as any)
          .eq('id', editingDeliverable.id);
        if (error) throw error;
        toast.success('تم تحديث تسليم الطلب');
        setShowModal(false);
        setEditingDeliverable(null);
        setForm(emptyForm);
        loadDeliverables();
      } catch (e: any) {
        toast.error('خطأ في الحفظ: ' + e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        contract_id: form.contract_id || null,
        quote_id: form.quote_id || null,
        invoice_id: form.invoice_id || null,
        service_id: form.service_id || null,
        service_name: form.service_name,
        description: form.description || null,
        expected_delivery_date: form.expected_delivery_date,
        actual_delivery_date: form.actual_delivery_date || null,
        status: form.status,
        priority: form.priority,
        notes: form.notes || null,
      };

      if (editingDeliverable) {
        const { error } = await supabase
          .from('marketing_service_deliverables')
          .update(payload)
          .eq('id', editingDeliverable.id);
        if (error) throw error;
        toast.success('تم تحديث التسليم بنجاح');
      } else {
        const { error } = await supabase
          .from('marketing_service_deliverables')
          .insert(payload as any);
        if (error) throw error;
        toast.success('تم إضافة التسليم بنجاح');
      }
      setShowModal(false);
      setEditingDeliverable(null);
      setForm(emptyForm);
      loadDeliverables();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deliverable: ServiceDeliverable) => {
    if (deliverable.source === 'order') {
      toast.info('تسليمات الطلبات تُدار من كارت الطلب/الفاتورة — احذف تاريخ التسليم من الطلب إن أردت إخفاءه');
      return;
    }
    if (!confirm(`هل تريد حذف تسليم "${deliverable.service_name}"؟`)) return;
    try {
      const { error } = await supabase.from('marketing_service_deliverables').delete().eq('id', deliverable.id);
      if (error) throw error;
      toast.success('تم حذف التسليم');
      loadDeliverables();
    } catch (e: any) {
      toast.error('خطأ في الحذف: ' + e.message);
    }
  };

  const openEdit = (deliverable: ServiceDeliverable) => {
    setEditingDeliverable(deliverable);
    setForm({
      contract_id: deliverable.contract_id || '',
      quote_id: deliverable.quote_id || '',
      invoice_id: deliverable.invoice_id || '',
      service_id: deliverable.service_id || '',
      service_name: deliverable.service_name,
      description: deliverable.description || '',
      expected_delivery_date: String(deliverable.expected_delivery_date || '').slice(0, 10),
      actual_delivery_date: deliverable.actual_delivery_date
        ? String(deliverable.actual_delivery_date).slice(0, 10)
        : '',
      status: deliverable.status === 'delayed' ? 'pending' : deliverable.status,
      priority: deliverable.priority || 'medium',
      notes: deliverable.notes || '',
    });
    setShowModal(true);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deliverables.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
      if (sourceFilter !== 'all' && d.source !== sourceFilter) return false;
      if (!q) return true;
      const hay = [
        d.service_name,
        d.customer_name,
        d.invoice_number,
        d.description,
        d.notes,
        ...(d.item_labels || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [deliverables, searchQuery, statusFilter, priorityFilter, sourceFilter]);

  const stats = useMemo(() => {
    const delayed = deliverables.filter((d) => d.status === 'delayed').length;
    const pending = deliverables.filter((d) => d.status === 'pending').length;
    const inProgress = deliverables.filter((d) => d.status === 'in_progress').length;
    const partial = deliverables.filter((d) => d.status === 'partial').length;
    const delivered = deliverables.filter((d) => d.status === 'delivered').length;
    return { delayed, pending, inProgress, partial, delivered, total: deliverables.length };
  }, [deliverables]);

  const getStatusInfo = (status: string) =>
    STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  const getPriorityInfo = (priority: string) =>
    PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            متابعة التسليمات
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            لوحة موحّدة لكل التسليمات من الطلبات والخدمات — غيّر الحالة مباشرة من الكارت
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => loadDeliverables()} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 ml-1 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </Button>
          <Button
            onClick={() => {
              setEditingDeliverable(null);
              setForm(emptyForm);
              setShowModal(true);
            }}
          >
            <Plus className="w-4 h-4 ml-2" /> تسليم جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, className: 'text-primary' },
          { label: 'انتظار', value: stats.pending, className: 'text-slate-600' },
          { label: 'تنفيذ', value: stats.inProgress, className: 'text-sky-600' },
          { label: 'جزئي', value: stats.partial, className: 'text-amber-600' },
          { label: 'تم التسليم', value: stats.delivered, className: 'text-emerald-600' },
          { label: 'متأخر', value: stats.delayed, className: 'text-rose-600' },
        ].map((s) => (
          <Card key={s.label} className="p-3 border-border/60">
            <p className="text-[11px] text-muted-foreground font-bold">{s.label}</p>
            <p className={`text-2xl font-black ${s.className}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {stats.delayed > 0 && (
        <Card className="p-4 border-rose-500/40 bg-rose-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-rose-800 dark:text-rose-300">
                تنبيه: {stats.delayed} تسليم متأخر
              </p>
              <p className="text-sm text-muted-foreground">راجع الكروت المتأخرة وحدّث حالتها من القائمة السريعة</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mr-auto border-rose-500/40"
              onClick={() => setStatusFilter('delayed')}
            >
              عرض المتأخر
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-3 border-border/60">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="بحث بالعميل، الصنف، رقم الطلب، الملاحظات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-3.5 h-3.5 ml-1" />
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="الأولوية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأولويات</SelectItem>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="المصدر" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المصادر</SelectItem>
                <SelectItem value="order">طلبات/فواتير</SelectItem>
                <SelectItem value="marketing">تسليمات يدوية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((deliverable) => {
          const statusInfo = getStatusInfo(deliverable.status);
          const priorityInfo = getPriorityInfo(deliverable.priority);
          const delta = daysUntil(deliverable.expected_delivery_date);
          const overdue = deliverable.status === 'delayed' || (delta < 0 && deliverable.status !== 'delivered' && deliverable.status !== 'cancelled');

          return (
            <Card
              key={`${deliverable.source}-${deliverable.id}`}
              className={`p-4 flex flex-col gap-3 border transition-shadow hover:shadow-md ${
                overdue ? 'border-rose-500/50' : 'border-border/60'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {deliverable.source === 'order' ? (
                        <><Hash className="w-3 h-3 ml-0.5" /> طلب</>
                      ) : (
                        <><Layers className="w-3 h-3 ml-0.5" /> يدوي</>
                      )}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${priorityInfo.color}`}>
                      {priorityInfo.label}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-base leading-snug line-clamp-2">{deliverable.service_name}</h3>
                  {deliverable.customer_name && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {deliverable.customer_name}
                      {deliverable.invoice_number ? ` · #${String(deliverable.invoice_number).slice(-4)}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(deliverable)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  {deliverable.source === 'marketing' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(deliverable)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick status — outside edit modal */}
              <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <Label className="text-[10px] text-muted-foreground mb-1 block">تغيير الحالة</Label>
                <Select
                  value={deliverable.status}
                  onValueChange={(v) => updateStatusQuick(deliverable, v)}
                  disabled={savingId === deliverable.id}
                >
                  <SelectTrigger className={`h-9 ${statusInfo.soft} border`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full mt-2 h-8 text-xs gap-1"
                  onClick={() => openReceiptConfirm(deliverable, false)}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  تسجيل تسليم / اختيار الأصناف
                </Button>
              </div>

              {(deliverable.items_count || 0) > 0 && deliverable.source === 'order' && (
                <div className="rounded-lg bg-muted/40 border border-border/50 p-2 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>الأصناف</span>
                    <span>
                      {deliverable.delivered_count || 0}/{deliverable.items_count || 0} تم تسليمها
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{
                        width: `${
                          deliverable.items_count
                            ? Math.round((100 * (deliverable.delivered_count || 0)) / deliverable.items_count)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {(deliverable.items || []).map((it) => (
                      <div key={it.id} className="flex justify-between gap-2 text-[11px]">
                        <span className={`truncate ${it.is_delivered ? 'text-emerald-700' : ''}`}>
                          {it.is_delivered ? '✓ ' : '○ '}
                          {it.menu_item_name}
                          {it.sold_unit ? ` (${it.sold_unit})` : ''} ×{it.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(deliverable.delivery_received_by || deliverable.actual_delivery_date) && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px] space-y-0.5">
                  {deliverable.delivery_received_by && (
                    <p><span className="text-muted-foreground">المستلم:</span> <strong>{deliverable.delivery_received_by}</strong></p>
                  )}
                  {deliverable.actual_delivery_date && (
                    <p><span className="text-muted-foreground">تاريخ الاستلام:</span> {new Date(deliverable.actual_delivery_date).toLocaleDateString('ar-EG')}</p>
                  )}
                  {deliverable.delivery_receipt_note && (
                    <p className="text-muted-foreground line-clamp-2">{deliverable.delivery_receipt_note}</p>
                  )}
                </div>
              )}

              <div className="mt-auto space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    متوقع: {new Date(deliverable.expected_delivery_date).toLocaleDateString('ar-EG')}
                  </span>
                  {deliverable.status === 'delivered' ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> مكتمل
                    </span>
                  ) : deliverable.status === 'partial' ? (
                    <span className="text-amber-600 font-bold">جزئي</span>
                  ) : overdue ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> متأخر {Math.abs(delta)} يوم
                    </span>
                  ) : (
                    <span className="text-sky-700 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {delta === 0 ? 'اليوم' : `بعد ${delta} يوم`}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-2xl">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-bold">لا توجد تسليمات مطابقة</p>
            <p className="text-sm mt-1">أضف تسليمًا يدويًا أو حدّد تاريخ تسليم على الفاتورة/الطلب</p>
            <Button
              variant="link"
              onClick={() => {
                setEditingDeliverable(null);
                setForm(emptyForm);
                setShowModal(true);
              }}
            >
              أضف تسليمًا جديدًا
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
            <DialogTitle>
              {editingDeliverable
                ? editingDeliverable.source === 'order'
                  ? 'تعديل تسليم طلب'
                  : 'تعديل التسليم'
                : 'إضافة تسليم جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {editingDeliverable?.source !== 'order' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>العقد (اختياري)</Label>
                    <Select
                      value={form.contract_id || '__none__'}
                      onValueChange={async (v) => {
                        const id = v === '__none__' ? '' : v;
                        setForm({ ...form, contract_id: id });
                        if (!id) return;
                        const { data: contractServices } = await supabase
                          .from('marketing_contract_services')
                          .select('*, marketing_services(*)')
                          .eq('contract_id', id);
                        if (contractServices?.length) {
                          const firstService = contractServices[0];
                          setForm((f) => ({
                            ...f,
                            service_id: firstService.marketing_services?.id || '',
                            service_name:
                              firstService.marketing_services?.name ||
                              firstService.service_name ||
                              '',
                            description:
                              firstService.marketing_services?.description ||
                              firstService.description ||
                              '',
                          }));
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="اختر العقد" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— بدون —</SelectItem>
                        {safeContracts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.contract_number} - {c.customer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>عرض السعر (اختياري)</Label>
                    <Select
                      value={form.quote_id || '__none__'}
                      onValueChange={(v) => setForm({ ...form, quote_id: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="اختر عرض السعر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— بدون —</SelectItem>
                        {safeQuotes.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.quote_number} - {q.customer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>الفاتورة / الطلب (اختياري)</Label>
                    <Select
                      value={form.invoice_id || '__none__'}
                      onValueChange={async (v) => {
                        const id = v === '__none__' ? '' : v;
                        setForm({ ...form, invoice_id: id });
                        if (!id) return;
                        const invoice = invoices.find((inv: any) => inv.id === id);
                        if (invoice?.order_items?.length) {
                          const firstItem = invoice.order_items[0];
                          setForm((f) => ({
                            ...f,
                            service_name: firstItem.menu_item_name || '',
                            description: invoice.notes || '',
                          }));
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="اختر الفاتورة" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="__none__">— بدون —</SelectItem>
                        {invoices.map((inv: any) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.order_number} - {inv.customer_name || 'عميل'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>الخدمة (اختياري)</Label>
                  <Select
                    value={form.service_id || '__none__'}
                    onValueChange={(v) => {
                      const id = v === '__none__' ? '' : v;
                      const service = safeServices.find((s) => s.id === id);
                      setForm({
                        ...form,
                        service_id: id,
                        service_name: service?.name || form.service_name,
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر الخدمة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— بدون —</SelectItem>
                      {safeServices.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label>اسم التسليم *</Label>
              <Input
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                placeholder="مثال: تسليم بضاعة / تصميم شعار"
                disabled={editingDeliverable?.source === 'order'}
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="تفاصيل التسليم"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>تاريخ التسليم المتوقع *</Label>
                <Input
                  type="date"
                  value={form.expected_delivery_date}
                  onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })}
                />
              </div>
              {editingDeliverable?.source !== 'order' && (
                <div>
                  <Label>تاريخ التسليم الفعلي</Label>
                  <Input
                    type="date"
                    value={form.actual_delivery_date}
                    onChange={(e) => setForm({ ...form, actual_delivery_date: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.filter((s) => s.value !== 'delayed').map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingDeliverable?.source !== 'order' && (
                <div>
                  <Label>الأولوية</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر الأولوية" /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="أي ملاحظات إضافية"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
            <Button variant="outline" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={loading}>
              {editingDeliverable ? 'تحديث' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delivery: which items + who received + date */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              تأكيد التسليم
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {receiptTarget && (
              <p className="text-sm text-muted-foreground">
                {receiptTarget.customer_name || 'عميل'} · #{String(receiptTarget.invoice_number || receiptTarget.id).slice(-4)}
              </p>
            )}

            {receiptTarget?.source === 'order' && (receiptTarget.items?.length || 0) > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>الأصناف المسلّمة</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        setSelectedItemIds((receiptTarget.items || []).map((i) => i.id))
                      }
                    >
                      تحديد الكل
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setSelectedItemIds([])}
                    >
                      إلغاء الكل
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-border divide-y max-h-48 overflow-y-auto">
                  {(receiptTarget.items || []).map((it) => {
                    const checked = selectedItemIds.includes(it.id);
                    return (
                      <label
                        key={it.id}
                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setSelectedItemIds((prev) =>
                              v ? [...prev, it.id] : prev.filter((id) => id !== it.id)
                            );
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-snug">
                            {it.menu_item_name}
                            {it.sold_unit ? ` (${it.sold_unit})` : ''} ×{it.quantity}
                          </p>
                          {it.variables && Array.isArray(it.variables) && it.variables.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {it.variables.map((v: any) => `${v.label}: ${v.value}`).join(' · ')}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  محدد {selectedItemIds.length} من {(receiptTarget.items || []).length}
                  {selectedItemIds.length > 0 &&
                  selectedItemIds.length < (receiptTarget.items || []).length
                    ? ' → تسليم جزئي'
                    : selectedItemIds.length === (receiptTarget.items || []).length && selectedItemIds.length > 0
                      ? ' → تسليم كامل'
                      : ''}
                </p>
              </div>
            )}

            <div>
              <Label>اسم المستلم *</Label>
              <Input
                value={receiptForm.received_by}
                onChange={(e) => setReceiptForm({ ...receiptForm, received_by: e.target.value })}
                placeholder="مثال: أحمد محمد / مندوب الفرع"
              />
            </div>
            <div>
              <Label>تاريخ الاستلام *</Label>
              <Input
                type="date"
                value={receiptForm.receipt_date}
                onChange={(e) => setReceiptForm({ ...receiptForm, receipt_date: e.target.value })}
              />
            </div>
            <div>
              <Label>ملاحظة تذكير (اختياري)</Label>
              <Textarea
                value={receiptForm.note}
                onChange={(e) => setReceiptForm({ ...receiptForm, note: e.target.value })}
                placeholder="أي ملاحظة بعد التسليم..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowReceiptModal(false)}>إلغاء</Button>
            <Button onClick={saveReceiptConfirm} disabled={savingReceipt}>
              {savingReceipt ? 'جاري الحفظ...' : 'تأكيد التسليم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
