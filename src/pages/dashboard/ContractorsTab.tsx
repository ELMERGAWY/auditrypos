// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, Trash2, Edit, User, Phone, MapPin, DollarSign, CheckCircle, Clock, AlertCircle, Receipt } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Restaurant } from './types';

interface Contractor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  specialty?: string;
  payment_type: 'fixed' | 'percentage';
  payment_value: number;
  balance: number;
  notes?: string;
  is_active: boolean;
  service_variables?: string[];
}

interface ContractorService {
  id: string;
  contractor_id: string;
  service_name: string;
  service_amount: number;
  contractor_amount: number;
  status: 'pending' | 'completed' | 'approved' | 'paid';
  completion_date?: string;
  notes?: string;
  created_at: string;
}

interface Props {
  restaurant: Restaurant;
}

export function ContractorsTab({ restaurant }: Props) {
  if (!restaurant) return <div className="p-8 text-center">جاري تحميل بيانات النشاط...</div>;

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorServices, setContractorServices] = useState<ContractorService[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [serviceForm, setServiceForm] = useState({
    contractor_id: '',
    service_name: '',
    service_amount: '',
    notes: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    contractor_id: '',
    amount: '',
    payment_method: 'cash',
    reference: '',
    notes: ''
  });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    specialty: '',
    payment_type: 'fixed' as 'fixed' | 'percentage',
    payment_value: '',
    notes: '',
    service_variables: '' as string,
  });

  const loadContractors = async () => {
    const { data } = await supabase
      .from('contractors')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('name');
    setContractors(data || []);
  };

  const loadContractorServices = async (contractorId: string) => {
    const { data } = await supabase
      .from('contractor_services')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });
    setContractorServices(data || []);
  };

  const loadPayments = async (contractorId: string) => {
    const { data } = await supabase
      .from('contractor_payments')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('payment_date', { ascending: false });
    setPayments(data || []);
  };

  useEffect(() => {
    loadContractors();
  }, [restaurant.id]);

  const loadInvoices = async () => {
    const companyId = restaurant.company_id || restaurant.id;
    let query = supabase
      .from('sales_invoices')
      .select('id, invoice_number, total_amount, created_at, orders(order_items(id, menu_item_name, quantity, price, variables)), sales_invoice_lines(id, description, quantity, unit_price, line_total)')
      .eq('company_id', companyId);
    
    if (dateFilterStart) {
      const startDate = new Date(dateFilterStart);
      startDate.setHours(0, 0, 0, 0);
      query = query.gte('created_at', startDate.toISOString());
    }
    if (dateFilterEnd) {
      const endDate = new Date(dateFilterEnd);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }
    
    console.log('Loading invoices with date filter:', { dateFilterStart, dateFilterEnd });
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) {
      console.error('Error loading invoices:', error);
      toast.error('خطأ في تحميل الفواتير: ' + error.message);
    } else {
      console.log('Loaded invoices:', data?.length);
      setInvoices(data || []);
    }
  };

  const loadOrders = async () => {
    let query = supabase
      .from('orders')
      .select('id, order_number, total, created_at, order_items(id, menu_item_name, quantity, price, variables)')
      .eq('restaurant_id', restaurant.id);
    
    if (dateFilterStart) {
      const startDate = new Date(dateFilterStart);
      startDate.setHours(0, 0, 0, 0);
      query = query.gte('created_at', startDate.toISOString());
    }
    if (dateFilterEnd) {
      const endDate = new Date(dateFilterEnd);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }
    
    console.log('Loading orders with date filter:', { dateFilterStart, dateFilterEnd });
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) {
      console.error('Error loading orders:', error);
      toast.error('خطأ في تحميل الطلبات: ' + error.message);
    } else {
      console.log('Loaded orders:', data?.length);
      setOrders(data || []);
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    !invoiceSearch ||
    inv.invoice_number?.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  const filteredOrders = orders.filter(ord =>
    !orderSearch ||
    ord.order_number?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    setSelectedOrder('');
    setSelectedService(null);
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrder(orderId);
    setSelectedInvoice('');
    setSelectedService(null);
  };

  const handleServiceSelect = (service: any) => {
    // Add to selected services array with unique ID
    const itemTotal = service.line_total || service.total || (Number(service.quantity) * Number(service.price || service.unit_price));
    const uniqueId = `${service.id}-${Date.now()}-${Math.random()}`; // Unique ID for each selection
    const newService = {
      uniqueId: uniqueId, // Use unique ID for removal
      id: service.id,
      item_name: service.description || service.product_name || service.menu_item_name || service.item_name,
      unit_price: service.unit_price || service.price,
      total: itemTotal,
      quantity: service.quantity,
      invoice_id: selectedInvoice,
      order_id: selectedOrder,
      invoice_number: invoices.find(i => i.id === selectedInvoice)?.invoice_number,
      order_number: orders.find(o => o.id === selectedOrder)?.order_number,
      variables: service.variables
    };
    const updatedServices = [...selectedServices, newService];
    setSelectedServices(updatedServices);
    // Update service form with total
    const totalServicesAmount = updatedServices.reduce((sum, s) => sum + (s.total || 0), 0);
    setServiceForm({
      ...serviceForm,
      service_name: newService.item_name,
      service_amount: totalServicesAmount.toString()
    });
    // Clear selection to allow adding more services
    setSelectedInvoice('');
    setSelectedOrder('');
    setSelectedService(null);
  };

  const handleRemoveService = (uniqueId: string) => {
    const updatedServices = selectedServices.filter(s => s.uniqueId !== uniqueId);
    setSelectedServices(updatedServices);
    // Recalculate total
    const totalServicesAmount = updatedServices.reduce((sum, s) => sum + (s.total || 0), 0);
    setServiceForm({
      ...serviceForm,
      service_amount: totalServicesAmount.toString()
    });
  };

  const openAddServiceDialog = async () => {
    // Clear date filters to load all data by default
    setDateFilterStart('');
    setDateFilterEnd('');
    await Promise.all([loadInvoices(), loadOrders()]);
    setSelectedServices([]);
    setServiceForm({
      contractor_id: '',
      service_name: '',
      service_amount: '',
      notes: ''
    });
    setSelectedInvoice('');
    setSelectedOrder('');
    setSelectedService(null);
    setShowAddServiceDialog(true);
  };

  // Auto-match: when contractor is chosen, pre-select items whose variables match its keywords
  useEffect(() => {
    if (!showAddServiceDialog || !serviceForm.contractor_id) return;
    const c = contractors.find(x => x.id === serviceForm.contractor_id);
    const keywords = (c?.service_variables || []).map(k => k.trim().toLowerCase()).filter(Boolean);
    if (!keywords.length) return;

    const matchItem = (vars: any[]) =>
      Array.isArray(vars) && vars.some((v: any) => {
        const l = String(v?.label || '').toLowerCase();
        const val = String(v?.value || '').toLowerCase();
        return keywords.some(k => l.includes(k) || val.includes(k));
      });

    const auto: any[] = [];
    invoices.forEach((inv: any) => {
      const lines = inv?.orders?.order_items || [];
      lines.forEach((item: any) => {
        if (matchItem(item.variables)) {
          auto.push({
            id: `inv-${item.id}`,
            item_name: item.menu_item_name,
            unit_price: item.price,
            total: Number(item.price || 0) * Number(item.quantity || 0),
            quantity: item.quantity,
            invoice_id: inv.id,
            order_id: null,
            invoice_number: inv.invoice_number,
            order_number: null,
            variables: item.variables,
          });
        }
      });
    });
    orders.forEach((ord: any) => {
      (ord.order_items || []).forEach((item: any) => {
        if (matchItem(item.variables)) {
          auto.push({
            id: `ord-${item.id}`,
            item_name: item.menu_item_name,
            unit_price: item.price,
            total: Number(item.price || 0) * Number(item.quantity || 0),
            quantity: item.quantity,
            invoice_id: null,
            order_id: ord.id,
            invoice_number: null,
            order_number: ord.order_number,
            variables: item.variables,
          });
        }
      });
    });

    if (auto.length) {
      setSelectedServices(auto);
      const totalServicesAmount = auto.reduce((s, x) => s + (x.total || 0), 0);
      setServiceForm(prev => ({
        ...prev,
        service_name: auto[0].item_name,
        service_amount: totalServicesAmount.toString(),
      }));
      toast.success(`تم اختيار ${auto.length} خدمة مطابقة لمتغيرات الصنايعي تلقائياً`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceForm.contractor_id, showAddServiceDialog]);

  const handleSaveService = async () => {
    if (!serviceForm.contractor_id || !serviceForm.service_name || !serviceForm.service_amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const contractor = contractors.find(c => c.id === serviceForm.contractor_id);
    if (!contractor) {
      toast.error('يرجى اختيار صنايعي');
      return;
    }

    const serviceAmount = Number(serviceForm.service_amount);
    const contractorAmount = contractor.payment_type === 'fixed'
      ? contractor.payment_value
      : (serviceAmount * contractor.payment_value / 100);

    const payload: any = {
      restaurant_id: restaurant.id,
      contractor_id: serviceForm.contractor_id,
      service_name: serviceForm.service_name,
      service_amount: serviceAmount,
      contractor_amount: contractorAmount,
      status: 'pending' as const,
      notes: serviceForm.notes || null
    };

    if (selectedInvoice) {
      payload.invoice_id = selectedInvoice;
    } else if (selectedOrder) {
      payload.order_id = selectedOrder;
    }

    // If multiple services selected, save each one individually
    if (selectedServices.length > 0) {
      // Collect unique invoice and order IDs
      const invoiceIds = [...new Set(selectedServices.filter(s => s.invoice_id).map(s => s.invoice_id))];
      const orderIds = [...new Set(selectedServices.filter(s => s.order_id).map(s => s.order_id))];

      // Save each selected service as a separate contractor service
      for (const service of selectedServices) {
        const payload: any = {
          restaurant_id: restaurant.id,
          contractor_id: serviceForm.contractor_id,
          service_name: service.item_name,
          service_amount: service.total,
          contractor_amount: contractor.payment_type === 'fixed'
            ? contractor.payment_value
            : (service.total * contractor.payment_value / 100),
          status: 'pending' as const,
          notes: serviceForm.notes || null
        };

        if (service.invoice_id) {
          payload.invoice_id = service.invoice_id;
        } else if (service.order_id) {
          payload.order_id = service.order_id;
        }

        const { error } = await supabase.from('contractor_services').insert(payload);
        if (error) {
          toast.error('خطأ في إضافة الخدمة: ' + error.message);
          return;
        }
      }

      toast.success(`تم إضافة ${selectedServices.length} خدمة بنجاح`);

      // Clear form and close dialog
      setShowAddServiceDialog(false);
      setServiceForm({
        contractor_id: '',
        service_name: '',
        service_amount: '',
        notes: ''
      });
      setSelectedInvoice('');
      setSelectedOrder('');
      setSelectedService(null);
      setSelectedServices([]);

      // Reload contractor services to show the new services
      if (selectedContractor) {
        loadContractorServices(selectedContractor.id);
      }
      return;
    } else {
      // Single service (manual entry)
      const { error } = await supabase.from('contractor_services').insert(payload);
      if (error) {
        toast.error('خطأ في إضافة الخدمة: ' + error.message);
        return;
      }

      toast.success('تم إضافة الخدمة بنجاح');
    }

    setShowAddServiceDialog(false);
    setServiceForm({
      contractor_id: '',
      service_name: '',
      service_amount: '',
      notes: ''
    });
    setSelectedInvoice('');
    setSelectedOrder('');
    setSelectedService(null);
    setSelectedServices([]);

    if (selectedContractor) {
      loadContractorServices(selectedContractor.id);
    }
    loadContractors();
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      address: '',
      specialty: '',
      payment_type: 'fixed',
      payment_value: '',
      notes: '',
      service_variables: '',
    });
    setShowAddForm(false);
    setEditingContractor(null);
  };

  const handleSave = async () => {
    if (!form.name || !form.payment_value) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const svArr = (form.service_variables || '')
      .split(/[,،\n]/)
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      restaurant_id: restaurant.id,
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      specialty: form.specialty || null,
      payment_type: form.payment_type,
      payment_value: Number(form.payment_value),
      notes: form.notes || null,
      is_active: true,
      service_variables: svArr,
    };

    if (editingContractor) {
      const { error } = await supabase
        .from('contractors')
        .update(payload)
        .eq('id', editingContractor.id);
      if (error) {
        toast.error('خطأ في التحديث: ' + error.message);
        return;
      }
      toast.success('تم تحديث الصنايعي');
    } else {
      const { error } = await supabase
        .from('contractors')
        .insert(payload);
      if (error) {
        toast.error('خطأ في الإضافة: ' + error.message);
        return;
      }
      toast.success('تم إضافة الصنايعي');
    }
    resetForm();
    loadContractors();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('contractors').delete().eq('id', id);
    setContractors(contractors.filter(c => c.id !== id));
    toast.success('تم حذف الصنايعي');
  };

  const handleToggleActive = async (contractor: Contractor) => {
    await supabase
      .from('contractors')
      .update({ is_active: !contractor.is_active })
      .eq('id', contractor.id);
    setContractors(contractors.map(c => c.id === contractor.id ? { ...c, is_active: !contractor.is_active } : c));
  };

  const startEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setForm({
      name: contractor.name,
      phone: contractor.phone || '',
      address: contractor.address || '',
      specialty: contractor.specialty || '',
      payment_type: contractor.payment_type,
      payment_value: String(contractor.payment_value),
      notes: contractor.notes || '',
      service_variables: Array.isArray(contractor.service_variables)
        ? contractor.service_variables.join('، ')
        : '',
    });
    setShowAddForm(true);
  };

  const selectContractor = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    loadContractorServices(contractor.id);
    loadPayments(contractor.id);
  };

  const updateServiceStatus = async (serviceId: string, status: string) => {
    const { error } = await supabase
      .from('contractor_services')
      .update({
        status,
        completion_date: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', serviceId);
    if (error) {
      toast.error('خطأ في تحديث الحالة');
      return;
    }
    toast.success('تم تحديث الحالة');
    if (selectedContractor) {
      loadContractorServices(selectedContractor.id);
      loadContractors();
    }
  };

  const handleSavePayment = async () => {
    if (!paymentForm.contractor_id || !paymentForm.amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const contractor = contractors.find(c => c.id === paymentForm.contractor_id);
    if (!contractor) {
      toast.error('الصنايعي غير موجود');
      return;
    }

    try {
      // Create payment voucher using save_payment_voucher function
      const { data: voucherData, error: voucherError } = await supabase
        .rpc('save_payment_voucher', {
          p_restaurant_id: restaurant.id,
          p_actor_id: contractor.id,
          p_actor_type: 'contractor',
          p_amount: Number(paymentForm.amount),
          p_payment_method: paymentForm.payment_method,
          p_reference_number: paymentForm.reference || `PV-${Date.now()}`,
          p_notes: paymentForm.notes || `سداد مستحقات صنايعي - ${contractor.name}`
        });

      if (voucherError) {
        toast.error('خطأ في إنشاء إذن الدفع: ' + voucherError.message);
        return;
      }

      // Record contractor payment
      await supabase.from('contractor_payments').insert({
        restaurant_id: restaurant.id,
        contractor_id: contractor.id,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference,
        notes: paymentForm.notes
      });

      toast.success('تم إنشاء إذن الدفع وتسجيل السداد بنجاح');
      setShowPaymentDialog(false);
      setPaymentForm({
        contractor_id: '',
        amount: '',
        payment_method: 'cash',
        reference: '',
        notes: ''
      });

      if (selectedContractor) {
        loadPayments(selectedContractor.id);
        loadContractors();
      }
    } catch (error: any) {
      toast.error('خطأ في إنشاء إذن الدفع: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'قيد الانتظار', className: 'bg-yellow-500/20 text-yellow-700' },
      completed: { label: 'تم الإنجاز', className: 'bg-blue-500/20 text-blue-700' },
      approved: { label: 'معتمد', className: 'bg-green-500/20 text-green-700' },
      paid: { label: 'مدفوع', className: 'bg-purple-500/20 text-purple-700' },
      cancelled: { label: 'ملغي', className: 'bg-red-500/20 text-red-700' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">إدارة الصنايعية ({contractors.length})</h2>
        <div className="flex gap-2">
          <Dialog open={showAddServiceDialog} onOpenChange={setShowAddServiceDialog}>
            <DialogTrigger asChild>
              <Button onClick={openAddServiceDialog} variant="outline">
                <Receipt className="w-4 h-4 ml-1" /> إضافة خدمة من فاتورة/طلب
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>إضافة خدمة للصنايعي</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>الصنايعي *</Label>
                  <Select value={serviceForm.contractor_id} onValueChange={(v) => setServiceForm({ ...serviceForm, contractor_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصنايعي" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractors.filter(c => c.is_active).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} - {c.specialty || 'بدون تخصص'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المصدر (اختياري)</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">من تاريخ</Label>
                        <Input
                          type="date"
                          value={dateFilterStart}
                          onChange={(e) => setDateFilterStart(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">إلى تاريخ</Label>
                        <Input
                          type="date"
                          value={dateFilterEnd}
                          onChange={(e) => setDateFilterEnd(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { 
                      console.log('Load button clicked with filters:', { dateFilterStart, dateFilterEnd });
                      loadInvoices(); 
                      loadOrders(); 
                    }} className="w-full">
                      تحميل الفواتير والطلبات
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-xs">فاتورة</Label>
                      <div className="space-y-2">
                        <Input
                          placeholder="بحث برقم الفاتورة أو العميل..."
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Select value={selectedInvoice} onValueChange={handleInvoiceSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر فاتورة" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredInvoices.length > 0 ? (
                              filteredInvoices.map(inv => (
                                <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number} ({inv.total_amount} ج.م)</SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-xs text-muted-foreground">لا توجد فواتير</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">طلب</Label>
                      <div className="space-y-2">
                        <Input
                          placeholder="بحث برقم الطلب أو العميل..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Select value={selectedOrder} onValueChange={handleOrderSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر طلب" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredOrders.length > 0 ? (
                              filteredOrders.map(ord => (
                                <SelectItem key={ord.id} value={ord.id}>{ord.order_number} ({ord.total} ج.م)</SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-xs text-muted-foreground">لا توجد طلبات</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Show items when invoice/order is selected */}
                {selectedInvoice && (
                  <div>
                    <Label className="text-xs">اختر صنف من الفاتورة (اختياري)</Label>
                    <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {(() => {
                        const invoice = invoices.find(i => i.id === selectedInvoice);
                        const items = invoice?.sales_invoice_lines;
                        if (!items || items.length === 0) {
                          return <div className="p-2 text-xs text-muted-foreground">لا توجد أصناف في هذه الفاتورة</div>;
                        }
                        
                        // Filter items to show only those matching contractor variables
                        const contractor = contractors.find(c => c.id === serviceForm.contractor_id);
                        const keywords = contractor?.service_variables || [];
                        
                        const matchItem = (vars: any[]) =>
                          Array.isArray(vars) && vars.some((v: any) => {
                            const l = String(v?.label || '').toLowerCase();
                            const val = String(v?.value || '').toLowerCase();
                            return keywords.some(k => l.includes(k) || val.includes(k));
                          });
                        
                        // Show all items, but highlight matching ones
                        return items.map((item: any) => {
                          const matches = matchItem(item.variables);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleServiceSelect(item)}
                              className={`p-2 rounded cursor-pointer hover:bg-primary/10 text-xs ${
                                selectedService?.id === item.id ? 'bg-primary/20 border border-primary/30' : ''
                              } ${!matches ? 'opacity-50' : ''}`}
                            >
                              <div className="font-medium">{item.description}</div>
                              <div className="text-muted-foreground">
                                {item.quantity} × {item.unit_price} = {item.line_total} ج.م
                              </div>
                              {item.variables && item.variables.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  المتغيرات: {item.variables.map((v: any) => v.label || v.value).join(', ')}
                                </div>
                              )}
                              {matches && (
                                <div className="text-xs text-green-600 mt-1">✓ يطابق متغيرات الصنايعي</div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {selectedOrder && (
                  <div>
                    <Label className="text-xs">اختر صنف من الطلب (اختياري)</Label>
                    <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {(() => {
                        const order = orders.find(o => o.id === selectedOrder);
                        const items = order?.order_items;
                        if (!items || items.length === 0) {
                          return <div className="p-2 text-xs text-muted-foreground">لا توجد أصناف في هذا الطلب</div>;
                        }
                        
                        // Filter items to show only those matching contractor variables
                        const contractor = contractors.find(c => c.id === serviceForm.contractor_id);
                        const keywords = contractor?.service_variables || [];
                        
                        const matchItem = (vars: any[]) =>
                          Array.isArray(vars) && vars.some((v: any) => {
                            const l = String(v?.label || '').toLowerCase();
                            const val = String(v?.value || '').toLowerCase();
                            return keywords.some(k => l.includes(k) || val.includes(k));
                          });
                        
                        // Show all items, but highlight matching ones
                        return items.map((item: any) => {
                          const matches = matchItem(item.variables);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleServiceSelect(item)}
                              className={`p-2 rounded cursor-pointer hover:bg-primary/10 text-xs ${
                                selectedService?.id === item.id ? 'bg-primary/20 border border-primary/30' : ''
                              } ${!matches ? 'opacity-50' : ''}`}
                            >
                              <div className="font-medium">{item.menu_item_name}</div>
                              <div className="text-muted-foreground">
                                {item.quantity} × {item.price} = {(Number(item.quantity) * Number(item.price)).toFixed(2)} ج.م
                              </div>
                              {item.variables && item.variables.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  المتغيرات: {item.variables.map((v: any) => v.label || v.value).join(', ')}
                                </div>
                              )}
                              {matches && (
                                <div className="text-xs text-green-600 mt-1">✓ يطابق متغيرات الصنايعي</div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
                {selectedServices.length === 0 && (
                  <div>
                    <Label>اسم الخدمة *</Label>
                    <Input
                      value={serviceForm.service_name}
                      onChange={e => setServiceForm({ ...serviceForm, service_name: e.target.value })}
                      placeholder="مثال: تركيب سباكة، صيانة كهرباء"
                    />
                  </div>
                )}
                <div>
                  <Label>قيمة الخدمات (ج.م) *</Label>
                  <Input
                    type="number"
                    value={serviceForm.service_amount}
                    onChange={e => setServiceForm({ ...serviceForm, service_amount: e.target.value })}
                    placeholder="إجمالي قيمة الخدمات"
                    readOnly={selectedServices.length > 0}
                  />
                </div>

                {/* Selected Services List */}
                {selectedServices.length > 0 && (
                  <div>
                    <Label className="text-xs">الخدمات المختارة</Label>
                    <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {selectedServices.map((service, idx) => (
                        <div key={service.uniqueId} className="flex items-center justify-between p-2 bg-secondary/50 rounded text-xs">
                          <div className="flex-1">
                            <div className="font-medium">{service.item_name}</div>
                            <div className="text-muted-foreground">
                              {service.invoice_number ? `فاتورة ${service.invoice_number}` : `طلب ${service.order_number}`} - {service.customer_name || 'بدون عميل'}
                            </div>
                            <div className="text-muted-foreground">
                              {service.quantity} × {service.unit_price} = {service.total} ج.م
                            </div>
                          </div>
                          <Button
                            onClick={() => handleRemoveService(service.uniqueId)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {serviceForm.contractor_id && (
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">طريقة الدفع: {contractors.find(c => c.id === serviceForm.contractor_id)?.payment_type === 'fixed' ? 'مبلغ مقطوع' : 'نسبة'}</p>
                    <p className="text-sm text-muted-foreground">المستحق للصنايعي: {
                      contractors.find(c => c.id === serviceForm.contractor_id)?.payment_type === 'fixed'
                        ? `${contractors.find(c => c.id === serviceForm.contractor_id)?.payment_value} ج.م`
                        : `${(Number(serviceForm.service_amount) * (contractors.find(c => c.id === serviceForm.contractor_id)?.payment_value || 0) / 100).toFixed(2)} ج.م`
                    }</p>
                  </div>
                )}
                <div>
                  <Label>ملاحظات</Label>
                  <Input
                    value={serviceForm.notes}
                    onChange={e => setServiceForm({ ...serviceForm, notes: e.target.value })}
                    placeholder="ملاحظات إضافية"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveService} className="gradient-bg text-primary-foreground border-0 flex-1">
                    <Save className="w-4 h-4 ml-1" /> إضافة الخدمة
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddServiceDialog(false)}>إلغاء</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => { resetForm(); setShowAddForm(true); }} className="gradient-bg text-primary-foreground border-0">
            <Plus className="w-4 h-4 ml-1" /> إضافة صنايعي
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-display font-bold">{editingContractor ? 'تعديل الصنايعي' : 'إضافة صنايعي جديد'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>الاسم *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم الصنايعي" />
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="رقم الهاتف" />
                </div>
                <div>
                  <Label>العنوان</Label>
                  <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان" />
                </div>
                <div>
                  <Label>التخصص</Label>
                  <Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="مثال: سباك، كهربائي" />
                </div>
                <div>
                  <Label>طريقة الدفع</Label>
                  <select
                    value={form.payment_type}
                    onChange={e => setForm({ ...form, payment_type: e.target.value as 'fixed' | 'percentage' })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="fixed">مبلغ مقطوع</option>
                    <option value="percentage">نسبة من الخدمة</option>
                  </select>
                </div>
                <div>
                  <Label>{form.payment_type === 'fixed' ? 'المبلغ المقطوع (ج.م)' : 'النسبة (%)'}</Label>
                  <Input
                    type="number"
                    value={form.payment_value}
                    onChange={e => setForm({ ...form, payment_value: e.target.value })}
                    placeholder={form.payment_type === 'fixed' ? 'مثال: 100' : 'مثال: 20'}
                  />
                </div>
              </div>
              <div>
                <Label>متغيرات الخدمة (كلمات دلالية للربط التلقائي)</Label>
                <Input
                  value={form.service_variables}
                  onChange={e => setForm({ ...form, service_variables: e.target.value })}
                  placeholder="مثال: صبغة، رفا، تنظيف (افصل بينها بفاصلة)"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  عند إضافة خدمة من فاتورة أو طلب سيتم اختيار العناصر التي تحتوي متغيراتها على أي من هذه الكلمات تلقائياً.
                </p>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات إضافية" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="gradient-bg text-primary-foreground border-0">
                  <Save className="w-4 h-4 ml-1" /> {editingContractor ? 'حفظ التعديلات' : 'إضافة'}
                </Button>
                <Button variant="outline" onClick={resetForm}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contractors List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {contractors.map(contractor => (
          <div
            key={contractor.id}
            className={`glass-card p-4 cursor-pointer transition-all ${selectedContractor?.id === contractor.id ? 'ring-2 ring-primary' : 'hover:shadow-lg'}`}
            onClick={() => selectContractor(contractor)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{contractor.name}</p>
                  <p className="text-xs text-muted-foreground">{contractor.specialty || 'بدون تخصص'}</p>
                </div>
              </div>
              <Badge className={!contractor.is_active ? 'status-suspended' : 'status-active'}>
                {contractor.is_active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              {contractor.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  {contractor.phone}
                </div>
              )}
              {contractor.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {contractor.address}
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                {contractor.payment_type === 'fixed' ? `${contractor.payment_value} ج.م` : `${contractor.payment_value}%`}
              </div>
              <div className="flex items-center gap-2 text-primary font-bold">
                <DollarSign className="w-3 h-3" />
                الرصيد المستحق: {contractor.balance.toFixed(2)} ج.م
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); startEdit(contractor); }}>
                <Edit className="w-3 h-3 ml-1" /> تعديل
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleToggleActive(contractor); }}>
                {contractor.is_active ? 'إيقاف' : 'تفعيل'}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDelete(contractor.id); }}>
                <Trash2 className="w-3 h-3 ml-1" /> حذف
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Contractor Services Detail */}
      {selectedContractor && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">خدمات {selectedContractor.name}</h3>
            <div className="flex gap-2">
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <DollarSign className="w-3 h-3 ml-1" /> إضافة دفع
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>إضافة دفع للصنايعي</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>الصنايعي *</Label>
                      <Select value={paymentForm.contractor_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, contractor_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الصنايعي" />
                        </SelectTrigger>
                        <SelectContent>
                          {contractors.filter(c => c.is_active).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} - الرصيد: {c.balance.toFixed(2)} ج.م</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>المبلغ (ج.م) *</Label>
                      <Input
                        type="number"
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        placeholder="المبلغ المراد دفعه"
                      />
                    </div>
                    <div>
                      <Label>طريقة الدفع</Label>
                      <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                          <SelectItem value="check">شيك</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>رقم الإيصال</Label>
                      <Input
                        value={paymentForm.reference}
                        onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                        placeholder="رقم الإيصال"
                      />
                    </div>
                    <div>
                      <Label>ملاحظات</Label>
                      <Input
                        value={paymentForm.notes}
                        onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        placeholder="ملاحظات إضافية"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSavePayment} className="gradient-bg text-primary-foreground border-0 flex-1">
                        <Save className="w-4 h-4 ml-1" /> إضافة الدفع
                      </Button>
                      <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>إلغاء</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" onClick={() => setSelectedContractor(null)}>إغلاق</Button>
            </div>
          </div>
          <div className="space-y-2">
            {contractorServices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد خدمات مسجلة لهذا الصنايعي</p>
            ) : (
              contractorServices.map(service => (
                <div key={service.id} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{service.service_name}</p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(service.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
                            supabase.from('contractor_services').delete().eq('id', service.id).then(() => {
                              toast.success('تم حذف الخدمة');
                              loadContractorServices(selectedContractor!.id);
                            });
                          }
                        }}
                        className="text-destructive hover:text-destructive h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">قيمة الخدمة: {service.service_amount} ج.م</span>
                    <span className="text-primary font-bold">المستحق: {service.contractor_amount} ج.م</span>
                  </div>
                  {service.completion_date && (
                    <p className="text-xs text-muted-foreground">تاريخ الإنجاز: {new Date(service.completion_date).toLocaleDateString('ar-EG')}</p>
                  )}
                  <div className="flex gap-2">
                    {service.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => updateServiceStatus(service.id, 'completed')}>
                        <CheckCircle className="w-3 h-3 ml-1" /> تم الإنجاز
                      </Button>
                    )}
                    {service.status === 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => updateServiceStatus(service.id, 'approved')}>
                        <CheckCircle className="w-3 h-3 ml-1" /> اعتماد للدفع
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Payments History */}
          <div className="space-y-2">
            <h4 className="font-display font-bold">سجل المدفوعات</h4>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">لا توجد مدفوعات مسجلة</p>
            ) : (
              payments.map(payment => (
                <div key={payment.id} className="p-3 rounded-lg bg-secondary/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{payment.amount} ج.م</p>
                    <span className="text-xs text-muted-foreground">{new Date(payment.payment_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{payment.payment_method === 'cash' ? 'نقدي' : payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}</span>
                    {payment.reference && <span className="text-xs text-muted-foreground">إيصال: {payment.reference}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
