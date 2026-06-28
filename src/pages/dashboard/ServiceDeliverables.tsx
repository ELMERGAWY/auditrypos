import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceDeliverable {
  id: string;
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
}

interface Props {
  restaurantId: string;
  currency: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'قيد التنفيذ', color: 'bg-blue-500' },
  { value: 'delivered', label: 'تم التسليم', color: 'bg-green-500' },
  { value: 'delayed', label: 'متأخر', color: 'bg-red-500' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-gray-400' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'منخفض', color: 'bg-gray-400' },
  { value: 'medium', label: 'متوسط', color: 'bg-yellow-500' },
  { value: 'high', label: 'عالي', color: 'bg-orange-500' },
  { value: 'urgent', label: 'عاجل', color: 'bg-red-600' }
];

export function ServiceDeliverables({ restaurantId, currency }: Props) {
  const [deliverables, setDeliverables] = useState<ServiceDeliverable[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<ServiceDeliverable | null>(null);
  const [form, setForm] = useState({
    contract_id: '',
    quote_id: '',
    service_id: '',
    service_name: '',
    description: '',
    expected_delivery_date: '',
    actual_delivery_date: '',
    status: 'pending',
    priority: 'medium',
    notes: ''
  });

  // Safety checks for arrays to prevent React error #306
  const safeDeliverables = Array.isArray(deliverables) ? deliverables : [];
  const safeContracts = Array.isArray(contracts) ? contracts : [];
  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const safeServices = Array.isArray(services) ? services : [];

  const loadDeliverables = async () => {
    setLoading(true);
    try {
      // Load from marketing_service_deliverables
      const { data: marketingDeliverables, error: marketingError } = await supabase
        .from('marketing_service_deliverables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('expected_delivery_date', { ascending: true });
      
      if (marketingError) throw marketingError;
      
      // Load from orders with delivery_date
      const { data: ordersWithDelivery, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurantId)
        .not('delivery_date', 'is', null)
        .order('delivery_date', { ascending: true });
      
      if (ordersError) throw ordersError;
      
      // Convert orders to deliverable format
      const orderDeliverables = (ordersWithDelivery || []).map((order: any) => {
        const expectedDate = new Date(order.delivery_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expectedDate.setHours(0, 0, 0, 0);

        // Determine status based on delivery date, not order status
        let status = 'pending';
        if (order.actual_delivery_date) {
          status = 'delivered';
        } else if (expectedDate < today) {
          status = 'delayed';
        }

        return {
          id: order.id,
          contract_id: null,
          quote_id: null,
          invoice_id: null,
          invoice_line_id: null,
          service_id: null,
          service_name: order.order_items?.[0]?.menu_item_name || 'خدمة من الطلب',
          description: order.notes,
          expected_delivery_date: order.delivery_date,
          actual_delivery_date: order.actual_delivery_date || null,
          status: status,
          priority: 'medium',
          notes: order.notes,
          created_at: order.created_at,
          invoice_number: order.order_number,
          customer_name: order.customer_name
        };
      });
      
      // Combine both sources
      setDeliverables([...(marketingDeliverables || []), ...orderDeliverables]);
    } catch (e: any) {
      toast.error('خطأ في تحميل الاستلامات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async () => {
    try {
      const [contractsRes, quotesRes, servicesRes] = await Promise.all([
        supabase.from('marketing_contracts').select('id, contract_number, customer_name').eq('restaurant_id', restaurantId),
        supabase.from('marketing_quotes').select('id, quote_number, customer_name').eq('restaurant_id', restaurantId),
        supabase.from('marketing_services').select('id, name').eq('restaurant_id', restaurantId)
      ]);
      setContracts(contractsRes.data || []);
      setQuotes(quotesRes.data || []);
      setServices(servicesRes.data || []);
    } catch (e: any) {
      console.error('Error loading related data:', e);
    }
  };

  useEffect(() => {
    loadDeliverables();
    loadRelatedData();
  }, [restaurantId]);

  const handleSave = async () => {
    if (!form.service_name.trim() || !form.expected_delivery_date) {
      toast.error('يرجى إدخال اسم الخدمة وتاريخ التسليم المتوقع');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        contract_id: form.contract_id || null,
        quote_id: form.quote_id || null,
        service_id: form.service_id || null,
        service_name: form.service_name,
        description: form.description || null,
        expected_delivery_date: form.expected_delivery_date,
        actual_delivery_date: form.actual_delivery_date || null,
        status: form.status,
        priority: form.priority,
        notes: form.notes || null
      };

      if (editingDeliverable) {
        const { error } = await supabase
          .from('marketing_service_deliverables')
          .update(payload)
          .eq('id', editingDeliverable.id);
        if (error) throw error;
        toast.success('تم تحديث الاستلام بنجاح');
      } else {
        const { error } = await supabase
          .from('marketing_service_deliverables')
          .insert(payload as any);
        if (error) throw error;
        toast.success('تم إضافة الاستلام بنجاح');
      }
      setShowModal(false);
      setEditingDeliverable(null);
      resetForm();
      loadDeliverables();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deliverable: ServiceDeliverable) => {
    if (!confirm(`هل تريد حذف استلام "${deliverable.service_name}"؟`)) return;
    try {
      const { error } = await supabase.from('marketing_service_deliverables').delete().eq('id', deliverable.id);
      if (error) throw error;
      toast.success('تم حذف الاستلام');
      loadDeliverables();
    } catch (e: any) {
      toast.error('خطأ في الحذف: ' + e.message);
    }
  };

  const resetForm = () => {
    setForm({
      contract_id: '',
      quote_id: '',
      service_id: '',
      service_name: '',
      description: '',
      expected_delivery_date: '',
      actual_delivery_date: '',
      status: 'pending',
      priority: 'medium',
      notes: ''
    });
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const getPriorityInfo = (priority: string) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[1];
  };

  const isOverdue = (expectedDate: string, status: string) => {
    return new Date(expectedDate) < new Date() && status !== 'delivered' && status !== 'cancelled';
  };

  const delayedCount = safeDeliverables.filter(d => d.status === 'delayed').length;
  const pendingCount = safeDeliverables.filter(d => d.status === 'pending').length;
  const deliveredCount = safeDeliverables.filter(d => d.status === 'delivered').length;

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            متابعة استلام الخدمات
          </h2>
          <p className="text-sm text-muted-foreground mt-1">تتبع مواعيد تسليم الخدمات والتنبيهات للتأخيرات</p>
        </div>
        <Button onClick={() => {
          setEditingDeliverable(null);
          resetForm();
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4 ml-2" /> استلام جديد
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">إجمالي الاستلامات</p>
          <p className="text-2xl font-bold text-primary">{safeDeliverables.length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">قيد الانتظار</p>
          <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">تم التسليم</p>
          <p className="text-2xl font-bold text-emerald-600">{deliveredCount}</p>
        </Card>
        <Card className={`p-4 glass-card ${delayedCount > 0 ? 'border-red-500' : ''}`}>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            متأخر
            {delayedCount > 0 && <AlertTriangle className="w-3 h-3 text-red-500" />}
          </p>
          <p className="text-2xl font-bold text-red-600">{delayedCount}</p>
        </Card>
      </div>

      {/* Delayed Alert */}
      {delayedCount > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-bold text-red-900">تنبيه: هناك {delayedCount} استلامات متأخرة</p>
              <p className="text-sm text-red-700">يرجى مراجعة الاستلامات المتأخرة واتخاذ الإجراء اللازم</p>
            </div>
          </div>
        </Card>
      )}

      {/* Deliverables List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeDeliverables.map(deliverable => {
          const statusInfo = getStatusInfo(deliverable.status);
          const priorityInfo = getPriorityInfo(deliverable.priority);
          const overdue = isOverdue(deliverable.expected_delivery_date, deliverable.status);
          
          return (
            <Card key={deliverable.id} className={`p-5 hover:shadow-lg transition-all border-border/60 ${overdue ? 'border-red-500' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{deliverable.service_name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    <Badge variant="outline" className={priorityInfo.color}>{priorityInfo.label}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingDeliverable(deliverable);
                    setForm({
                      contract_id: deliverable.contract_id || '',
                      quote_id: deliverable.quote_id || '',
                      service_id: deliverable.service_id || '',
                      service_name: deliverable.service_name,
                      description: deliverable.description || '',
                      expected_delivery_date: deliverable.expected_delivery_date,
                      actual_delivery_date: deliverable.actual_delivery_date || '',
                      status: deliverable.status,
                      priority: deliverable.priority,
                      notes: deliverable.notes || ''
                    });
                    setShowModal(true);
                  }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(deliverable)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {deliverable.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{deliverable.description}</p>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>التسليم المتوقع: {new Date(deliverable.expected_delivery_date).toLocaleDateString('ar-EG')}</span>
                </div>
                {deliverable.actual_delivery_date && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>تم التسليم: {new Date(deliverable.actual_delivery_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
                {overdue && (
                  <div className="flex items-center gap-2 text-red-600 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    <span>متأخر!</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {deliverables.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">لا توجد استلامات مضافة حتى الآن</p>
            <Button variant="link" onClick={() => {
              setEditingDeliverable(null);
              resetForm();
              setShowModal(true);
            }}>أضف استلامك الأول</Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDeliverable ? 'تعديل الاستلام' : 'إضافة استلام جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>العقد (اختياري)</Label>
                <Select value={form.contract_id} onValueChange={async (v) => {
                  setForm({ ...form, contract_id: v });
                  if (v) {
                    // Load services from the contract
                    const { data: contractServices } = await supabase
                      .from('marketing_contract_services')
                      .select('*, marketing_services(*)')
                      .eq('contract_id', v);
                    if (contractServices && contractServices.length > 0) {
                      const firstService = contractServices[0];
                      setForm(f => ({
                        ...f,
                        service_id: firstService.marketing_services?.id || '',
                        service_name: firstService.marketing_services?.name || firstService.service_name || '',
                        description: firstService.marketing_services?.description || firstService.description || ''
                      }));
                    }
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر العقد" /></SelectTrigger>
                  <SelectContent>
                    {safeContracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.contract_number} - {c.customer_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>عرض السعر (اختياري)</Label>
                <Select value={form.quote_id} onValueChange={(v) => setForm({ ...form, quote_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر عرض السعر" /></SelectTrigger>
                  <SelectContent>
                    {safeQuotes.map(q => (
                      <SelectItem key={q.id} value={q.id}>{q.quote_number} - {q.customer_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>الخدمة (اختياري)</Label>
              <Select value={form.service_id} onValueChange={(v) => {
                const service = safeServices.find(s => s.id === v);
                setForm({ ...form, service_id: v, service_name: service?.name || form.service_name });
              }}>
                <SelectTrigger><SelectValue placeholder="اختر الخدمة" /></SelectTrigger>
                <SelectContent>
                  {safeServices.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>اسم الخدمة *</Label>
              <Input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} placeholder="مثال: تصميم شعار" />
            </div>
            <div>
              <Label>وصف الخدمة</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف تفصيلي للخدمة" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ التسليم المتوقع *</Label>
                <Input type="date" value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} />
              </div>
              <div>
                <Label>تاريخ التسليم الفعلي</Label>
                <Input type="date" value={form.actual_delivery_date} onChange={(e) => setForm({ ...form, actual_delivery_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الأولوية" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="أي ملاحظات إضافية" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editingDeliverable ? 'تحديث' : 'حفظ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
