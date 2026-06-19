
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileText, Send, CheckCircle, XCircle, Eye, Share2, MessageCircle } from 'lucide-react';
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

interface MarketingService {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
}

interface QuoteItem {
  service_id?: string;
  service_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface MarketingQuote {
  id: string;
  customer_id?: string;
  customer_name?: string;
  quote_number: string;
  status: string;
  valid_until: string;
  notes: string;
  total_amount: number;
  approved_at?: string;
  created_at: string;
  items: QuoteItem[];
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function MarketingQuotes({ restaurantId, currency }: Props) {
  const [quotes, setQuotes] = useState<MarketingQuote[]>([]);
  const [services, setServices] = useState<MarketingService[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<MarketingQuote | null>(null);
  const [editingQuote, setEditingQuote] = useState<MarketingQuote | null>(null);
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    valid_until: '',
    notes: '',
    status: 'draft'
  });
  const [items, setItems] = useState<QuoteItem[]>([
    { service_name: '', description: '', quantity: 1, unit_price: 0, total_price: 0 }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotesRes, servicesRes, customersRes] = await Promise.all([
        supabase.from('marketing_quotes').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('marketing_services').select('*').eq('restaurant_id', restaurantId).eq('is_active', true),
        supabase.from('customers').select('id, name').eq('restaurant_id', restaurantId).order('name')
      ]);
      setQuotes(quotesRes.data || []);
      setServices(servicesRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (e: any) {
      toast.error('خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const calculateItemTotal = (item: QuoteItem) => item.quantity * item.unit_price;

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'service_id') {
      const selectedService = services.find(s => s.id === value);
      if (selectedService) {
        newItems[index].service_name = selectedService.name;
        newItems[index].description = selectedService.description;
        newItems[index].unit_price = selectedService.base_price;
      }
    }
    newItems[index].total_price = calculateItemTotal(newItems[index]);
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { service_name: '', description: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleSave = async () => {
    if (items.length === 0 || !items[0].service_name.trim()) {
      toast.error('يرجى إضافة عنصر واحد على الأقل');
      return;
    }
    setLoading(true);
    try {
      const total = calculateTotal();
      const quoteNumber = editingQuote ? editingQuote.quote_number : `Q-${Date.now().toString().slice(-8)}`;
      
      const payload = {
        restaurant_id: restaurantId,
        customer_id: form.customer_id || null,
        customer_name: form.customer_name,
        quote_number: quoteNumber,
        valid_until: form.valid_until,
        notes: form.notes,
        status: form.status,
        total_amount: total
      };

      let quoteId;
      if (editingQuote) {
        const { error } = await supabase.from('marketing_quotes').update(payload).eq('id', editingQuote.id);
        if (error) throw error;
        quoteId = editingQuote.id;
        await supabase.from('marketing_quote_items').delete().eq('quote_id', editingQuote.id);
      } else {
        const { data, error } = await supabase.from('marketing_quotes').insert(payload as any).select();
        if (error) throw error;
        quoteId = data[0].id;
      }

      await supabase.from('marketing_quote_items').insert(
        items.map(item => ({
        quote_id: quoteId,
        service_id: item.service_id || null,
        service_name: item.service_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }))
      );

      toast.success(editingQuote ? 'تم تحديث عرض الأسعار بنجاح' : 'تم إنشاء عرض الأسعار بنجاح');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quote: MarketingQuote) => {
    if (!confirm(`هل تريد حذف عرض الأسعار رقم "${quote.quote_number}"؟`)) return;
    try {
      await supabase.from('marketing_quotes').delete().eq('id', quote.id);
      toast.success('تم الحذف');
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحذف: ' + e.message);
    }
  };

  const openView = async (quote: MarketingQuote) => {
    try {
      const { data: itemsData } = await supabase.from('marketing_quote_items').select('*').eq('quote_id', quote.id);
      setViewingQuote({ ...quote, items: itemsData || [] });
      setShowViewModal(true);
    } catch (e) {
      toast.error('خطأ في تحميل التفاصيل');
    }
  };

  const handleSendWhatsApp = (quote: MarketingQuote) => {
    let message = `📄 عرض سعر رقم ${quote.quote_number} - ${quote.customer_name || 'عميل'}:\n`;
    message += `تاريخ الإصدار: ${new Date(quote.created_at).toLocaleDateString('ar-EG')}\n`;
    message += `صالح حتى: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('ar-EG') : '-'}\n`;
    message += '\nالخدمات:\n';
    quote.items?.forEach((item, index) => {
      message += `${index + 1}. ${item.service_name} - ${item.quantity} × ${item.unit_price.toLocaleString()} = ${item.total_price.toLocaleString()} ${currency}\n`;
      if (item.description) message += `   ${item.description}\n`;
    });
    message += `\n💵 المجموع الكلي: ${quote.total_amount.toLocaleString()} ${currency}\n`;
    if (quote.notes) message += `\nملاحظات: ${quote.notes}\n`;
    message += '\nشكراً لتعاونكم! 🤝';

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const resetForm = () => {
    setForm({
      customer_id: '',
      customer_name: '',
      valid_until: '',
      notes: '',
      status: 'draft'
    });
    setItems([
      { service_name: '', description: '', quantity: 1, unit_price: 0, total_price: 0 }
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'approved': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'sent': return 'مرسل';
      case 'approved': return 'موافق عليه';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            عروض الأسعار
          </h2>
          <p className="text-sm text-muted-foreground mt-1">إنشاء عروض أسعار احترافية يمكن مشاركتها عبر واتساب</p>
        </div>
        <Button onClick={() => {
          setEditingQuote(null);
          resetForm();
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4 ml-2" /> عرض سعر جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">إجمالي العروض</p>
          <p className="text-2xl font-bold text-primary">{quotes.length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">الموافق عليها</p>
          <p className="text-2xl font-bold text-emerald-600">{quotes.filter(q => q.status === 'approved').length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">المرسلة</p>
          <p className="text-2xl font-bold text-blue-600">{quotes.filter(q => q.status === 'sent').length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">قيمة العروض</p>
          <p className="text-2xl font-bold">{quotes.reduce((sum, q) => sum + q.total_amount, 0).toLocaleString()} {currency}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quotes.map(quote => (
          <Card key={quote.id} className="p-5 hover:shadow-lg transition-all border-border/60">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">
                    عرض سعر رقم {quote.quote_number}
                  </h3>
                  <Badge className={getStatusColor(quote.status)}>
                    {getStatusLabel(quote.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{quote.customer_name || 'عميل غير محدد'}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openView(quote)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditingQuote(quote);
                  setForm({
                    customer_id: quote.customer_id || '',
                    customer_name: quote.customer_name || '',
                    valid_until: quote.valid_until,
                    notes: quote.notes,
                    status: quote.status
                  });
                  // Load items
                  (async () => {
                    const { data } = await supabase.from('marketing_quote_items').select('*').eq('quote_id', quote.id);
                    if (data) setItems(data);
                    setShowModal(true);
                  })();
                }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(quote)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-border/40">
              <div>
                <p className="text-xs text-muted-foreground">الإجمالي:</p>
                <p className="text-xl font-bold text-primary">{quote.total_amount.toLocaleString()} {currency}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  (async () => {
                    const { data } = await supabase.from('marketing_quote_items').select('*').eq('quote_id', quote.id);
                    handleSendWhatsApp({ ...quote, items: data || [] });
                  })();
                }}>
                  <MessageCircle className="w-4 h-4" /> إرسال
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {quotes.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">لا توجد عروض أسعار حتى الآن</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuote ? 'تعديل عرض الأسعار' : 'إضافة عرض سعر جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label>العميل</Label>
                <Select value={form.customer_id} onValueChange={(v) => {
                  const cust = customers.find(c => c.id === v);
                  setForm({ ...form, customer_id: v, customer_name: cust?.name || '' });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>اسم العميل (إذا لم يكن في القائمة)</Label>
                <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div>
                <Label>صالح حتى</Label>
                <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
              </div>
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue placeholder="الstatus" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="sent">مرسل</SelectItem>
                    <SelectItem value="approved">موافق عليه</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border rounded-xl border-primary/10 p-4 bg-primary/5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">الخدمات المطلوبة</h3>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4" /> إضافة خدمة
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label>الخدمة</Label>
                      <Select value={item.service_id} onValueChange={(v) => updateItem(index, 'service_id', v)}>
                        <SelectTrigger><SelectValue placeholder="اختر الخدمة" /></SelectTrigger>
                        <SelectContent>
                          {services.map(service => (
                          <SelectItem key={service.id} value={service.id}>{service.name} - {service.base_price.toLocaleString()} {currency}</SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Label>وصف الخدمة</Label>
                      <Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="وصف الخدمة" />
                    </div>
                    <div className="col-span-2">
                      <Label>الكمية</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <Label>سعر الوحدة</Label>
                      <Input type="number" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                  <div />
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">الإجمالي:</p>
                    <p className="text-xl font-bold text-primary">{calculateTotal().toLocaleString()} {currency}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value})} placeholder="ملاحظات إضافية لعرض السعر" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editingQuote ? 'تحديث' : 'حفظ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Quote Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>عرض سعر رقم {viewingQuote?.quote_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">العميل:</p>
                <p className="font-bold">{viewingQuote?.customer_name || 'عميل غير محدد'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحالة:</p>
                <Badge className={getStatusColor(viewingQuote?.status)}>{getStatusLabel(viewingQuote?.status)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صالح حتى:</p>
                <p className="font-bold">{viewingQuote?.valid_until ? new Date(viewingQuote.valid_until).toLocaleDateString('ar-EG') : '-'}</p>
              </div>
            </div>
            <div className="border-t border-primary/10 rounded-xl p-4">
              <h4 className="font-bold mb-3">الخدمات:</h4>
              <div className="space-y-2">
                {viewingQuote?.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-secondary/10 rounded-lg">
                    <div>
                      <p className="font-bold">{item.service_name}</p>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </div>
                    <div className="text-left">
                      <p>{item.quantity} × {item.unit_price.toLocaleString()}</p>
                      <p className="font-bold text-primary">{item.total_price.toLocaleString()} {currency}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border/50">
                <p className="font-bold text-xl">الإجمالي:</p>
                <p className="text-2xl font-bold text-primary">{viewingQuote?.total_amount.toLocaleString()} {currency}</p>
              </div>
            </div>
            {viewingQuote?.notes && <p className="text-muted-foreground text-sm">{viewingQuote.notes}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>إغلاق</Button>
            <Button onClick={() => handleSendWhatsApp(viewingQuote)}>
              <MessageCircle className="w-4 h-4 ml-2" /> إرسال عبر واتساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

