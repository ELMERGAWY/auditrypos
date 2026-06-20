// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  FileText, Search, Calendar, Printer, Download, 
  RotateCcw, Eye, RefreshCcw, DollarSign, Users, Plus, X, Trash2, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { journalService } from '@/lib/accounting/journalService';
import { CustomerSearch } from './CustomerSearch';
import { InvoiceViewer } from '@/components/InvoiceViewer';
import { extractCustomerRef } from './types';

interface Invoice {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string | null;
  customer_ref?: string | null;
  customer_phone?: string | null;
  total: number;
  paid_amount?: number;
  discount?: number;
  notes?: string;
  status: string;
  payment_method: string;
  journal_entry_id?: string | null;
}

interface Props {
  restaurantId: string;
  currency: string;
  restaurant?: any;
  isSuperAdmin?: boolean;
  isOwner?: boolean;
}

export function SalesInvoices({ restaurantId, currency, restaurant, isSuperAdmin, isOwner }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    customer_name: '',
    amount: '',
    description: '',
    payment_method: 'cash',
    customer_ref: '',
    paid_amount: '',
    discount: '',
    notes: ''
  });
  const [editItems, setEditItems] = useState<any[]>([]);

  // Check if invoice editing is allowed
  const canEditInvoices = isSuperAdmin || isOwner || (restaurant?.allow_invoice_editing === true);

  useEffect(() => {
    loadInvoices();
  }, [restaurantId]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل الفواتير: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManual = async () => {
    if (!form.amount || !form.customer_name) {
      toast.error('يرجى إدخال اسم العميل والمبلغ');
      return;
    }

    try {
      const amount = parseFloat(form.amount);
      const orderNumber = `INV-${Date.now().toString().slice(-6)}`;
      
      // 1. Create the order record
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          order_number: orderNumber,
          customer_name: form.customer_name,
          total: amount,
          status: 'completed',
          payment_method: form.payment_method,
          is_pos: false // Mark as manual
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Ensure Accounting & Create Journal Entry
      await journalService.ensureAccountingSetup(restaurantId, currency);
      await journalService.createSaleJournalEntry(restaurantId, {
        ...order,
        items: [], // Manual invoice might not have line items in this simplified version
        paid_amount: amount
      }, 'retail');

      toast.success('تم إنشاء الفاتورة وترحيلها محاسبياً ✅');
      setShowManualForm(false);
      setForm({ customer_name: '', amount: '', description: '', payment_method: 'cash', customer_ref: '', paid_amount: '', discount: '', notes: '' });
      loadInvoices();
    } catch (e: any) {
      toast.error('فشل إنشاء الفاتورة: ' + e.message);
    }
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setForm({
      customer_name: invoice.customer_name || '',
      amount: String(invoice.total || ''),
      description: '',
      payment_method: invoice.payment_method || 'cash',
      customer_ref: extractCustomerRef(invoice),
      paid_amount: String(invoice.paid_amount ?? invoice.total ?? ''),
      discount: String(invoice.discount || 0),
      notes: invoice.notes || ''
    });
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', invoice.id);
    setEditItems(items || []);
    setShowManualForm(true);
  };

  const handleUpdateInvoice = async () => {
    if (!form.amount || !form.customer_name || !editingInvoice) {
      toast.error('يرجى إدخال اسم العميل والمبلغ');
      return;
    }

    try {
      const amount = parseFloat(form.amount);
      const paidAmount = parseFloat(form.paid_amount) || amount;
      const discount = parseFloat(form.discount) || 0;

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_name: form.customer_name,
          customer_ref: form.customer_ref || null,
          total: amount,
          paid_amount: paidAmount,
          discount,
          notes: form.notes || '',
          payment_method: form.payment_method
        } as any)
        .eq('id', editingInvoice.id);

      if (orderError) throw orderError;

      for (const item of editItems) {
        await supabase.from('order_items').update({
          quantity: item.quantity,
          price: item.price,
          menu_item_name: item.menu_item_name
        }).eq('id', item.id);
      }

      toast.success('تم تحديث الفاتورة بنجاح ✅');
      setShowManualForm(false);
      setEditingInvoice(null);
      setEditItems([]);
      setForm({ customer_name: '', amount: '', description: '', payment_method: 'cash', customer_ref: '', paid_amount: '', discount: '', notes: '' });
      loadInvoices();
    } catch (e: any) {
      toast.error('فشل تحديث الفاتورة: ' + e.message);
    }
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`هل أنت متأكد من حذف الفاتورة ${inv.order_number}؟ سيتم حذف الأصناف وقيود اليومية المرتبطة.`)) return;
    try {
      // Delete dependents first (order_items, order_taxes, journal_entries)
      await supabase.from('order_items').delete().eq('order_id', inv.id);
      await supabase.from('order_taxes').delete().eq('order_id', inv.id);
      await supabase.from('journal_entries').delete().eq('source_id', inv.id).eq('source', 'sale');
      const { error } = await supabase.from('orders').delete().eq('id', inv.id);
      if (error) throw error;
      toast.success('تم حذف الفاتورة');
      loadInvoices();
    } catch (e: any) {
      toast.error('فشل الحذف: ' + e.message);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const q = searchQuery.toLowerCase();
    return inv.order_number.toLowerCase().includes(q) ||
      inv.customer_name?.toLowerCase().includes(q) ||
      inv.customer_ref?.toLowerCase().includes(q) ||
      extractCustomerRef(inv).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 fade-in p-4">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-primary">فواتير البيع (Sales Invoices)</h2>
          <p className="text-muted-foreground text-sm">إدارة الفواتير الناتجة عن POS والمبيعات المباشرة.</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={() => setShowManualForm(true)} className="gradient-bg border-0 text-white gap-2">
              <Plus className="w-4 h-4" /> فاتورة يدوية
           </Button>
           <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> تصدير
           </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="p-4 glass-card border-primary/20 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">إجمالي الفواتير</p>
            <h4 className="text-xl font-bold">{invoices.length}</h4>
         </Card>
         <Card className="p-4 glass-card border-emerald-500/20 bg-emerald-500/5">
            <p className="text-xs text-muted-foreground mb-1">إجمالي المبيعات المفوترة</p>
            <h4 className="text-xl font-bold">{invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toLocaleString()} {currency}</h4>
         </Card>
         <Card className="p-4 glass-card border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-muted-foreground mb-1">فواتير اليوم</p>
            <h4 className="text-xl font-bold">
               {invoices.filter(inv => new Date(inv.created_at).toDateString() === new Date().toDateString()).length}
            </h4>
         </Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="البحث برقم الفاتورة أو العميل أو الرقم المرجعي..." 
          className="pr-10 h-11 bg-card/50" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredInvoices.map(inv => (
          <Card key={inv.id} className="p-4 glass-card hover:border-primary/50 transition-all flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{inv.order_number}</span>
                  <Badge variant="outline" className="text-[10px]">{inv.payment_method === 'cash' ? 'نقدي' : 'آجل'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{inv.customer_name || 'عميل نقدي'} • {new Date(inv.created_at).toLocaleString('ar-EG')}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-left">
                <span className="font-black text-lg text-primary">{inv.total.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground mr-1">{currency}</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewingId(inv.id)} title="عرض الفاتورة">
                  <Eye className="w-4 h-4" />
                </Button>
                {canEditInvoices && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditInvoice(inv)} title="تعديل الفاتورة">
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewingId(inv.id)} title="طباعة">
                  <Printer className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(inv)} title="حذف">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filteredInvoices.length === 0 && !loading && (
          <div className="text-center py-20 text-muted-foreground italic">لا توجد فواتير مطابقة للبحث</div>
        )}
      </div>

      {/* Manual Invoice Modal */}
      <AnimatePresence>
        {showManualForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 max-w-md w-full relative">
              <button onClick={() => { setShowManualForm(false); setEditingInvoice(null); }} className="absolute left-4 top-4 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-2xl font-black mb-6">{editingInvoice ? 'تعديل الفاتورة' : 'إنشاء فاتورة يدوية'}</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">اسم العميل</Label>
                  <CustomerSearch
                    restaurantId={restaurantId}
                    value={form.customer_name}
                    onChange={(name) => setForm({ ...form, customer_name: name })}
                    placeholder="ابحث عن عميل أو أدخل اسم جديد..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>المبلغ الإجمالي</Label>
                    <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                  </div>
                  {editingInvoice && (
                    <div>
                      <Label>المدفوع</Label>
                      <Input type="number" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} />
                    </div>
                  )}
                </div>

                {editingInvoice && editItems.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                    <Label>بنود الفاتورة</Label>
                    {editItems.map((item, idx) => (
                      <div key={item.id || idx} className="grid grid-cols-3 gap-2 text-sm">
                        <Input value={item.menu_item_name || ''} onChange={e => {
                          const next = [...editItems];
                          next[idx] = { ...item, menu_item_name: e.target.value };
                          setEditItems(next);
                        }} />
                        <Input type="number" value={item.quantity || 0} onChange={e => {
                          const next = [...editItems];
                          next[idx] = { ...item, quantity: Number(e.target.value) };
                          setEditItems(next);
                          const newTotal = next.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
                          setForm(f => ({ ...f, amount: String(newTotal), paid_amount: String(newTotal) }));
                        }} />
                        <Input type="number" value={item.price || 0} onChange={e => {
                          const next = [...editItems];
                          next[idx] = { ...item, price: Number(e.target.value) };
                          setEditItems(next);
                          const newTotal = next.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
                          setForm(f => ({ ...f, amount: String(newTotal), paid_amount: String(newTotal) }));
                        }} />
                      </div>
                    ))}
                  </div>
                )}

                {editingInvoice && (
                  <div>
                    <Label>ملاحظات</Label>
                    <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                )}

                <div>
                  <Label>طريقة الدفع</Label>
                  <select className="w-full bg-secondary p-2 rounded-lg" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                    <option value="cash">نقدي</option>
                    <option value="credit">آجل (ذمم مدينة)</option>
                    <option value="bank">تحويل بنكي</option>
                  </select>
                </div>

                <Button className="w-full h-12 gradient-bg border-0 text-white font-bold text-lg mt-4" onClick={editingInvoice ? handleUpdateInvoice : handleCreateManual}>
                  {editingInvoice ? 'تحديث الفاتورة' : 'حفظ وترحيل الفاتورة'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {viewingId && (
        <InvoiceViewer
          open={!!viewingId}
          onClose={() => setViewingId(null)}
          source="order"
          recordId={viewingId}
          currency={currency}
          restaurantId={restaurantId}
        />
      )}
    </div>
  );
}
