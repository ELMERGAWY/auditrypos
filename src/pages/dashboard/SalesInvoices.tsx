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
  RotateCcw, Eye, RefreshCcw, DollarSign, Users, Plus, X, Trash2, Edit,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { journalService } from '@/lib/accounting/journalService';
import { CustomerSearch } from './CustomerSearch';
import { InvoiceViewer } from '@/components/InvoiceViewer';
import { extractCustomerRef } from './types';
import { actorCreateFields, actorUpdateFields, formatActorLabel } from '@/lib/actor';

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
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [expandedInvoiceItems, setExpandedInvoiceItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_name: '',
    amount: '',
    description: '',
    payment_method: 'cash',
    customer_ref: '',
    paid_amount: '',
    discount: '',
    notes: '',
    delivery_date: ''
  });
  const [editItems, setEditItems] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Load menu items and products for manual invoice
  useEffect(() => {
    if (restaurantId) {
      loadMenuItems();
      loadProducts();
    }
  }, [restaurantId]);

  // Auto-update price when item is selected
  useEffect(() => {
    if (selectedItem) {
      const price = selectedItem.price || selectedItem.cost_price || 0;
      setNewItemPrice(price);
    }
  }, [selectedItem]);

  const loadMenuItems = async () => {
    const { data } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId);
    setMenuItems(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId);
    setProducts(data || []);
  };

  // Check if invoice editing is allowed - always allow for flexibility
  const canEditInvoices = true;

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
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error loading invoices:', error);
        throw error;
      }
      console.log('Loaded invoices:', data?.length || 0);
      
      // Log the first invoice data for debugging
      if (data && data.length > 0) {
        console.log('First invoice data:', data[0]);
        toast.info(`تم تحميل ${data.length} فاتورة، أول فاتورة: المبلغ=${data[0].total}`);
      }
      
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Failed to load invoices:', error);
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
      const paidAmount = parseFloat(form.paid_amount) || 0;
      const orderNumber = form.customer_ref ? `INV-${form.customer_ref}-${Date.now().toString().slice(-6)}` : `INV-${Date.now().toString().slice(-6)}`;
      
      const actor = await actorCreateFields();
      // 1. Create the order record
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          order_number: orderNumber,
          customer_name: form.customer_name,
          total: amount,
          paid_amount: paidAmount,
          status: 'completed',
          payment_method: form.payment_method,
          delivery_date: form.delivery_date || null,
          is_pos: false, // Mark as manual
          ...actor,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items from editItems
      for (const item of editItems) {
        await supabase.from('order_items').insert({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item_name,
          quantity: item.quantity,
          price: item.price,
          variables: item.variables || null
        });
      }

      // 3. Ensure Accounting & Create Journal Entry
      await journalService.ensureAccountingSetup(restaurantId, currency);
      await journalService.createSaleJournalEntry(restaurantId, {
        ...order,
        items: editItems,
        paid_amount: paidAmount
      }, 'retail');

      toast.success('تم إنشاء الفاتورة وترحيلها محاسبياً ✅');
      setShowManualForm(false);
      setForm({ customer_name: '', amount: '', description: '', payment_method: 'cash', customer_ref: '', paid_amount: '', discount: '', notes: '', delivery_date: '' });
      setEditItems([]);
      loadInvoices();
    } catch (e: any) {
      toast.error('فشل إنشاء الفاتورة: ' + e.message);
    }
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    setEditingInvoice(invoice);
    
    // Fetch fresh data from database instead of using the old invoice object
    const { data: freshInvoice } = await supabase
      .from('orders')
      .select('*')
      .eq('id', invoice.id)
      .single();

    if (freshInvoice) {
      setForm({
        customer_name: freshInvoice.customer_name || '',
        amount: String(freshInvoice.total || ''),
        description: '',
        payment_method: freshInvoice.payment_method || 'cash',
        customer_ref: extractCustomerRef(freshInvoice),
        paid_amount: String(freshInvoice.paid_amount ?? freshInvoice.total ?? ''),
        discount: String(freshInvoice.discount || 0),
        notes: freshInvoice.notes || '',
        delivery_date: freshInvoice.delivery_date || ''
      });
    } else {
      // Fallback to old invoice object if fetch fails
      setForm({
        customer_name: invoice.customer_name || '',
        amount: String(invoice.total || ''),
        description: '',
        payment_method: invoice.payment_method || 'cash',
        customer_ref: extractCustomerRef(invoice),
        paid_amount: String(invoice.paid_amount ?? invoice.total ?? ''),
        discount: String(invoice.discount || 0),
        notes: invoice.notes || '',
        delivery_date: invoice.delivery_date || ''
      });
    }

    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', invoice.id);
    setEditItems(items || []);
    setShowManualForm(true);
  };

  const loadInvoiceItems = async (invoiceId: string) => {
    try {
      const { data: items, error } = await supabase.from('order_items').select('*').eq('order_id', invoiceId);
      if (error) throw error;
      return items || [];
    } catch (err) {
      console.error('Error loading invoice items:', err);
      return [];
    }
  };

  const handleExpandInvoice = async (invoiceId: string) => {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null);
      setExpandedInvoiceItems([]);
    } else {
      const items = await loadInvoiceItems(invoiceId);
      setExpandedInvoiceId(invoiceId);
      setExpandedInvoiceItems(items);
    }
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

      toast.info(`بيانات المرسلة: المبلغ=${amount}, المدفوع=${paidAmount}, الخصم=${discount}`);

      // Update items FIRST to avoid trigger recalculating total from old items
      toast.info(`الخطوة 1: جاري تحديث ${editItems.length} بند...`);

      let itemUpdateErrors = 0;
      let itemUpdateSuccess = 0;
      let itemErrorsDetails: string[] = [];

      for (let i = 0; i < editItems.length; i++) {
        const item = editItems[i];
        try {
          toast.info(`جاري تحديث البند ${i + 1}/${editItems.length}: ${item.menu_item_name || 'صنف بدون اسم'}`);
          toast.info(`بيانات البند: الكمية=${item.quantity}, السعر=${item.price}`);
          
          // Try direct update first
          const { error: directError, data: itemData } = await supabase
            .from('order_items')
            .update({
              quantity: item.quantity,
              price: item.price,
              menu_item_name: item.menu_item_name,
              variables: item.variables || null
            })
            .eq('id', item.id)
            .select()
            .single();

          if (directError) {
            console.error('Direct item update failed:', item.id, directError);
            toast.error(`فشل تحديث البند (Direct): ${directError.message}`);
            // Fallback to RPC
            const { error: rpcError } = await supabase.rpc('update_order_item', {
              p_item_id: item.id,
              p_quantity: item.quantity,
              p_price: item.price,
              p_menu_item_name: item.menu_item_name,
              p_variables: item.variables || null
            });

            if (rpcError) {
              console.error('RPC item update also failed:', item.id, rpcError);
              itemUpdateErrors++;
              itemErrorsDetails.push(`${item.menu_item_name || 'صنف بدون اسم'}: ${rpcError.message}`);
            } else {
              itemUpdateSuccess++;
              toast.success(`تم تحديث البند (RPC): ${item.menu_item_name || 'صنف بدون اسم'}`);
            }
          } else {
            itemUpdateSuccess++;
            if (itemData) {
              toast.info(`تم تحديث البند (Direct): السعر=${itemData.price}, الكمية=${itemData.quantity}`);
            }
          }
        } catch (itemErr: any) {
          console.error('Exception updating item:', item.id, itemErr);
          itemUpdateErrors++;
          itemErrorsDetails.push(`${item.menu_item_name || 'صنف بدون اسم'}: ${itemErr.message}`);
        }
      }

      toast.info(`ملخص البنود: نجح ${itemUpdateSuccess}، فشل ${itemUpdateErrors}`);

      // NOW update the order total and other fields
      toast.info('الخطوة 2: جاري تحديث بيانات الفاتورة...');

      const { error: orderError, data: orderData } = await supabase
        .from('orders')
        .update({
          customer_name: form.customer_name,
          customer_ref: form.customer_ref || null,
          total: amount,
          paid_amount: paidAmount,
          discount,
          notes: form.notes || '',
          payment_method: form.payment_method,
          delivery_date: form.delivery_date || null,
          ...(await actorUpdateFields()),
        })
        .eq('id', editingInvoice.id)
        .select()
        .single();

      if (orderError) {
        console.error('Direct order update failed:', orderError);
        toast.error('فشل تحديث الفاتورة (Direct): ' + orderError.message);
        
        // Fallback to RPC if direct update fails
        toast.info('جاري المحاولة بطريقة RPC...');
        const { error: rpcError } = await supabase.rpc('update_order', {
          p_order_id: editingInvoice.id,
          p_customer_name: form.customer_name,
          p_customer_ref: form.customer_ref || null,
          p_total: amount,
          p_paid_amount: paidAmount,
          p_discount: discount,
          p_notes: form.notes || '',
          p_payment_method: form.payment_method
        });

        if (rpcError) {
          toast.error('فشل تحديث الفاتورة (RPC): ' + rpcError.message);
          throw rpcError;
        }
        toast.success('تم تحديث بيانات الفاتورة (RPC)');
      } else {
        toast.success('تم تحديث بيانات الفاتورة (Direct)');
        if (orderData) {
          toast.info(`بيانات المستلمة: المبلغ=${orderData.total}, المدفوع=${orderData.paid_amount}, الخصم=${orderData.discount}`);
        }
      }

      // Verify the update by fetching the invoice again immediately
      toast.info('الخطوة 3: جاري التحقق النهائي...');
      const { data: verifyData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', editingInvoice.id)
        .single();

      if (verifyData) {
        toast.info(`التحقق النهائي: المبلغ=${verifyData.total}, المدفوع=${verifyData.paid_amount}, الخصم=${verifyData.discount}`);
      }

      if (itemUpdateErrors > 0) {
        toast.warning(`تم تحديث الفاتورة ولكن فشل ${itemUpdateErrors} من ${editItems.length} بنود`);
        // Show detailed errors
        itemErrorsDetails.forEach(err => toast.error(err));
      } else {
        toast.success(`تم تحديث الفاتورة وجميع ${itemUpdateSuccess} بنود بنجاح ✅`);
      }

      // Update the invoice in the local state immediately
      if (verifyData) {
        setInvoices(prev => prev.map(inv => 
          inv.id === editingInvoice.id ? { ...inv, ...verifyData } : inv
        ));
      }

      setShowManualForm(false);
      setEditingInvoice(null);
      setEditItems([]);
      setForm({ customer_name: '', amount: '', description: '', payment_method: 'cash', customer_ref: '', paid_amount: '', discount: '', notes: '', delivery_date: '' });
      await loadInvoices();
    } catch (e: any) {
      console.error('Error updating invoice:', e);
      toast.error('فشل تحديث الفاتورة: ' + e.message);
    }
  };

  const handleDeleteAndRecreateInvoice = async () => {
    if (!editingInvoice) return;
    if (!restaurantId) {
      toast.error('خطأ: بيانات المطعم غير متاحة');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة وإعادة إنشائها؟ سيتم حذف جميع القيود المحاسبية المرتبطة بها.')) return;

    try {
      // Delete order items first
      await supabase.from('order_items').delete().eq('order_id', editingInvoice.id);

      // Delete the order
      const { error: deleteError } = await supabase.from('orders').delete().eq('id', editingInvoice.id);
      if (deleteError) throw deleteError;

      // Create new order with updated data
      const amount = parseFloat(form.amount);
      const paidAmount = parseFloat(form.paid_amount) || amount;
      const discount = parseFloat(form.discount) || 0;

      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          customer_name: form.customer_name,
          customer_ref: form.customer_ref || null,
          total: amount,
          paid_amount: paidAmount,
          discount,
          notes: form.notes || '',
          payment_method: form.payment_method,
          status: 'completed',
          is_pos: false
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Create order items
      for (const item of editItems) {
        await supabase.from('order_items').insert({
          order_id: newOrder.id,
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item_name,
          quantity: item.quantity,
          price: item.price,
          variables: item.variables || null
        });
      }

      // Create journal entry
      await journalService.ensureAccountingSetup(restaurantId, currency);
      await journalService.createSaleJournalEntry(restaurantId, {
        ...newOrder,
        items: editItems,
        paid_amount: paidAmount
      }, 'retail');

      toast.success('تم إعادة إنشاء الفاتورة وترحيلها محاسبياً بنجاح ✅');
      setShowManualForm(false);
      setEditingInvoice(null);
      setEditItems([]);
      setForm({ customer_name: '', amount: '', description: '', payment_method: 'cash', customer_ref: '', paid_amount: '', discount: '', notes: '' });
      loadInvoices();
    } catch (e: any) {
      toast.error('فشل إعادة إنشاء الفاتورة: ' + e.message);
    }
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`هل أنت متأكد من حذف الفاتورة ${inv.order_number}؟ سيتم إرجاع الكميات للمخزن وحذف القيود المرتبطة.`)) return;
    try {
      // استرجاع المخزون أولاً (idempotent) ثم احذف الطلب فقط — CASCADE يحذف الأصناف
      await supabase.rpc('restore_inventory_for_order', { p_order_id: inv.id });
      await supabase.from('order_taxes').delete().eq('order_id', inv.id);
      await supabase.from('journal_entries').delete().eq('source_id', inv.id).eq('source', 'sale');
      const { error } = await supabase.from('orders').delete().eq('id', inv.id);
      if (error) throw error;
      toast.success('تم حذف الفاتورة وإرجاع الكمية للمخزن');
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
          <div key={inv.id}>
            <Card className="p-4 glass-card hover:border-primary/50 transition-all flex items-center justify-between">
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
                  {formatActorLabel(inv) && (
                    <p className="text-[10px] text-primary/80 mt-0.5">{formatActorLabel(inv)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-left">
                  <span className="font-black text-lg text-primary">{inv.total.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground mr-1">{currency}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleExpandInvoice(inv.id)} title="عرض البنود">
                    {expandedInvoiceId === inv.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
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
            {expandedInvoiceId === inv.id && (
              <Card className="p-4 mt-2 bg-primary/5">
                <div className="space-y-2">
                  <h4 className="font-bold text-sm mb-2">بنود الفاتورة:</h4>
                  {expandedInvoiceItems.length === 0 ? (
                    <p className="text-muted-foreground text-sm">لا توجد بنود</p>
                  ) : (
                    expandedInvoiceItems.map((item, idx) => (
                      <div key={item.id || idx} className="flex flex-col gap-1 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{item.menu_item_name || 'صنف'}</span>
                          <span className="text-muted-foreground">{item.quantity} × {Number(item.price || 0).toFixed(2)} {currency}</span>
                        </div>
                        {item.variables && Array.isArray(item.variables) && item.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1 mr-2">
                            {item.variables.map((v: any, i: number) => (
                              <span key={i} className="text-xs bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                                <span className="font-bold">{v.label}:</span> {v.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>
        ))}
        {filteredInvoices.length === 0 && !loading && (
          <div className="text-center py-20 text-muted-foreground italic">لا توجد فواتير مطابقة للبحث</div>
        )}
      </div>

      {/* Manual Invoice Modal */}
      <AnimatePresence>
        {showManualForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
              <button onClick={() => { setShowManualForm(false); setEditingInvoice(null); }} className="absolute left-4 top-4 text-muted-foreground hover:text-foreground z-10">
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

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>المبلغ الإجمالي</Label>
                    <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                  </div>
                  <div>
                    <Label>المدفوع</Label>
                    <Input type="number" placeholder="0.00" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>المتبقي</Label>
                    <Input type="number" placeholder="0.00" value={Math.max(0, Number(form.amount) - Number(form.paid_amount)).toFixed(2)} readOnly className="bg-secondary/50" />
                  </div>
                </div>

                {editingInvoice && editItems.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                    <Label>بنود الفاتورة</Label>
                    {editItems.map((item, idx) => (
                      <div key={item.id || idx} className="grid grid-cols-5 gap-2 text-sm">
                        <Input 
                          value={item.menu_item_name || ''} 
                          onChange={e => {
                            const next = [...editItems];
                            next[idx] = { ...item, menu_item_name: e.target.value };
                            setEditItems(next);
                          }} 
                          placeholder="اسم الصنف"
                        />
                        <Input 
                          type="number" 
                          value={item.quantity || 0} 
                          onChange={e => {
                            const newQuantity = Number(e.target.value) || 0;
                            const next = [...editItems];
                            next[idx] = { ...item, quantity: newQuantity };
                            setEditItems(next);
                            const newTotal = next.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
                            setForm(f => ({ ...f, amount: String(newTotal) }));
                          }} 
                          placeholder="الكمية"
                        />
                        <Input
                          type="number"
                          value={item.price || 0}
                          onChange={e => {
                            const newPrice = Number(e.target.value) || 0;
                            const next = [...editItems];
                            next[idx] = { ...item, price: newPrice };
                            setEditItems(next);
                            const newTotal = next.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
                            setForm(f => ({ ...f, amount: String(newTotal) }));
                          }}
                          placeholder="السعر"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const next = [...editItems];
                            const currentVars = next[idx].variables || [];
                            const newVars = prompt('أدخل المتغيرات بصيغة JSON (مثال: [{"label":"الحجم","value":"كبير"}]):', JSON.stringify(currentVars));
                            if (newVars) {
                              try {
                                next[idx] = { ...next[idx], variables: JSON.parse(newVars) };
                                setEditItems(next);
                              } catch (e) {
                                alert('صيغة JSON غير صحيحة');
                              }
                            }
                          }}
                          className="h-8 w-full"
                        >
                          {item.variables && item.variables.length > 0 ? `${item.variables.length} متغير` : 'إضافة'}
                        </Button>
                        <div className="flex gap-1">
                          <Input 
                            type="number" 
                            value={(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)} 
                            onChange={e => {
                              const newTotal = Number(e.target.value) || 0;
                              const currentPrice = Number(item.price) || 0;
                              if (currentPrice > 0) {
                                const calculatedQuantity = newTotal / currentPrice;
                                const next = [...editItems];
                                next[idx] = { ...item, quantity: calculatedQuantity };
                                setEditItems(next);
                                const newFormTotal = next.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
                                setForm(f => ({ ...f, amount: String(newFormTotal) }));
                              }
                            }} 
                            placeholder="الإجمالي"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive" 
                            onClick={() => {
                              const next = editItems.filter((_, i) => i !== idx);
                              setEditItems(next);
                              const newTotal = next.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
                              setForm(f => ({ ...f, amount: String(newTotal) }));
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!editingInvoice && (
                  <div className="space-y-2">
                    <Label>إضافة بند للفاتورة</Label>
                    <div className="space-y-2">
                      <Input 
                        placeholder="ابحث عن صنف..." 
                        value={itemSearch}
                        onChange={e => setItemSearch(e.target.value)}
                        onFocus={() => setItemSearch('')}
                      />
                      {itemSearch !== null && (
                        <div className="max-h-40 overflow-y-auto border rounded-lg bg-secondary/50">
                          {menuItems.filter(item => !itemSearch || item.name.toLowerCase().includes(itemSearch.toLowerCase())).map(item => (
                            <div 
                              key={item.id}
                              className="p-2 hover:bg-secondary cursor-pointer text-sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setItemSearch(item.name);
                              }}
                            >
                              {item.name} - {item.price} {currency}
                            </div>
                          ))}
                          {products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase())).map(product => (
                            <div 
                              key={product.id}
                              className="p-2 hover:bg-secondary cursor-pointer text-sm"
                              onClick={() => {
                                setSelectedItem(product);
                                setItemSearch(product.name);
                              }}
                            >
                              {product.name} - {product.cost_price} {currency}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">الكمية</Label>
                          <Input 
                            type="number" 
                            value={newItemQty}
                            onChange={e => setNewItemQty(Number(e.target.value) || 1)}
                            min="1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">السعر</Label>
                          <Input 
                            type="number" 
                            value={newItemPrice}
                            onChange={e => setNewItemPrice(Number(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              if (selectedItem && newItemQty > 0) {
                                const newItem = {
                                  menu_item_name: selectedItem.name,
                                  quantity: newItemQty,
                                  price: newItemPrice
                                };
                                setEditItems([...editItems, newItem]);
                                const newTotal = [...editItems, newItem].reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
                                setForm(f => ({ ...f, amount: String(newTotal) }));
                                setItemSearch('');
                                setSelectedItem(null);
                                setNewItemQty(1);
                                setNewItemPrice(0);
                              }
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {editItems.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto border rounded-lg p-2">
                        {editItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm p-1 bg-secondary/50 rounded">
                            <span>{item.menu_item_name} × {item.quantity}</span>
                            <div className="flex items-center gap-2">
                              <span>{(Number(item.price) * Number(item.quantity)).toFixed(2)} {currency}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 text-destructive" 
                                onClick={() => {
                                  const next = editItems.filter((_, i) => i !== idx);
                                  setEditItems(next);
                                  const newTotal = next.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
                                  setForm(f => ({ ...f, amount: String(newTotal) }));
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {editingInvoice && (
                  <div>
                    <Label>ملاحظات</Label>
                    <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                )}

                <div>
                  <Label>تاريخ التسليم</Label>
                  <Input 
                    type="date" 
                    value={form.delivery_date} 
                    onChange={e => setForm({ ...form, delivery_date: e.target.value })} 
                  />
                </div>

                <div>
                  <Label>طريقة الدفع</Label>
                  <select className="w-full bg-secondary p-2 rounded-lg" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                    <option value="cash">نقدي</option>
                    <option value="credit">آجل (ذمم مدينة)</option>
                    <option value="bank">تحويل بنكي</option>
                  </select>
                </div>

                {editingInvoice ? (
                  <div className="flex gap-2">
                    <Button className="flex-1 h-12 gradient-bg border-0 text-white font-bold text-lg mt-4" onClick={handleUpdateInvoice}>
                      تحديث الفاتورة
                    </Button>
                    <Button className="h-12 border-0 text-white font-bold text-lg mt-4 bg-destructive hover:bg-destructive/90" onClick={handleDeleteAndRecreateInvoice}>
                      حذف وإعادة إنشاء
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full h-12 gradient-bg border-0 text-white font-bold text-lg mt-4" onClick={handleCreateManual}>
                    حفظ وترحيل الفاتورة
                  </Button>
                )}
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
          restaurantName={restaurant?.name}
          restaurantLogo={restaurant?.logo_url || restaurant?.logo}
        />
      )}
    </div>
  );
}
