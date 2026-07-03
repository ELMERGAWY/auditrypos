// @ts-nocheck
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, Printer, Download, FileText, User, Calendar, CreditCard,
  Package, Hash, Receipt, Building2, Phone, MapPin, RefreshCcw, Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceViewerProps {
  open: boolean;
  onClose: () => void;
  /** 'order' = look up in orders table (POS/sales invoices). 'sales_order' = sales_orders table */
  source: 'order' | 'sales_order';
  recordId: string;
  currency?: string;
  restaurantName?: string;
  restaurantLogo?: string | null;
  restaurantId?: string;
}

// Reuse or redefine PrintElementSettings here for InvoiceViewer
interface PrintElementSettings {
  logo: boolean;
  restaurantName: boolean;
  invoiceNumber: boolean;
  dateTime: boolean;
  customerName: boolean;
  customerPhone: boolean;
  deliveryAddress: boolean;
  paymentMethod: boolean;
  status: boolean;
  items: boolean;
  variables: boolean;
  subtotal: boolean;
  discount: boolean;
  tax: boolean;
  total: boolean;
  paidAmount: boolean;
  remaining: boolean;
  notes: boolean;
  thankYou: boolean;
  poweredBy: boolean;
}

export function InvoiceViewer({
  open, onClose, source, recordId, currency = 'ج.م',
  restaurantName, restaurantLogo, restaurantId
}: InvoiceViewerProps) {
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintElementSettings>({
    logo: true,
    restaurantName: true,
    invoiceNumber: true,
    dateTime: true,
    customerName: true,
    customerPhone: true,
    deliveryAddress: true,
    paymentMethod: true,
    status: true,
    items: true,
    variables: true,
    subtotal: true,
    discount: true,
    tax: true,
    total: true,
    paidAmount: true,
    remaining: true,
    notes: true,
    thankYou: true,
    poweredBy: true,
  });

  // Load print settings from database
  useEffect(() => {
    if (!restaurantId) return;
    loadPrintSettings();
  }, [restaurantId]);

  const loadPrintSettings = async () => {
    try {
      // Source of truth: `print_settings` table (same table used by PrintSettingsManager & ReceiptModal)
      const { data, error } = await supabase
        .from('print_settings')
        .select('settings')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      const saved: any = data?.settings || {};
      setPrintSettings(prev => ({
        logo: saved.logo ?? prev.logo,
        restaurantName: saved.restaurantName ?? prev.restaurantName,
        invoiceNumber: saved.invoiceNumber ?? prev.invoiceNumber,
        dateTime: saved.dateTime ?? prev.dateTime,
        customerName: saved.customerName ?? prev.customerName,
        customerPhone: saved.customerPhone ?? prev.customerPhone,
        deliveryAddress: saved.deliveryAddress ?? prev.deliveryAddress,
        paymentMethod: saved.paymentMethod ?? prev.paymentMethod,
        status: saved.status ?? prev.status,
        items: saved.items ?? prev.items,
        variables: saved.variables ?? prev.variables,
        subtotal: saved.subtotal ?? prev.subtotal,
        discount: saved.discount ?? prev.discount,
        tax: saved.tax ?? prev.tax,
        total: saved.total ?? prev.total,
        paidAmount: saved.paidAmount ?? prev.paidAmount,
        remaining: saved.remaining ?? prev.remaining,
        notes: saved.notes ?? prev.notes,
        thankYou: saved.thankYou ?? prev.thankYou,
        poweredBy: saved.poweredBy ?? prev.poweredBy,
      }));
    } catch (e) {
      console.error('Failed to load print settings:', e);
    }
  };

  const savePrintSettings = async (newSettings: PrintElementSettings) => {
    if (!restaurantId) return;
    try {
      // Merge with any existing (copy) settings to avoid losing them
      const { data: existing } = await supabase
        .from('print_settings')
        .select('settings')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      const merged = { ...(existing?.settings as any || {}), ...newSettings };
      const { error } = await supabase
        .from('print_settings')
        .upsert({
          restaurant_id: restaurantId,
          settings: merged,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'restaurant_id' });
      if (error) throw error;
      toast.success('تم حفظ إعدادات الطباعة');
    } catch (e: any) {
      toast.error('فشل حفظ الإعدادات: ' + e.message);
    }
  };

  const handlePrintSettingChange = (key: keyof PrintElementSettings, value: boolean) => {
    const newSettings = { ...printSettings, [key]: value };
    setPrintSettings(newSettings);
    savePrintSettings(newSettings);
  };


  useEffect(() => {
    if (!open || !recordId) return;
    loadData();
  }, [open, recordId, source]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (source === 'order') {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', recordId)
          .maybeSingle();
        if (error) throw error;

        setRecord(data);
        setItems(data?.order_items || []);

        // Load receipt vouchers for this customer (all vouchers, not date-restricted)
        if (!data?.customer_id) {
          toast.error('الطلب لا يحتوي على عميل');
        } else if (!restaurantId) {
          toast.error('restaurantId غير موجود');
        } else {
          const { data: vouchers } = await supabase
            .from('receipt_vouchers')
            .select('*')
            .eq('customer_id', data.customer_id)
            .eq('restaurant_id', restaurantId)
            .order('voucher_date', { ascending: true });
          
          toast.info(`تم تحميل ${vouchers?.length || 0} سند قبض`);
          
          // Calculate total from receipt vouchers
          const voucherTotal = vouchers?.reduce((sum, v) => sum + (v.amount || 0), 0) || 0;
          
          // Store vouchers for display
          setRecord(prev => ({
            ...prev,
            receipt_vouchers: vouchers || [],
            receipt_voucher_total: voucherTotal
          }));
        }

      } else if (source === 'sales_invoice') {
        // Load from sales_invoices table and get linked order data
        const { data: invoice, error: invoiceError } = await supabase
          .from('sales_invoices')
          .select('*, orders(*)')
          .eq('id', recordId)
          .maybeSingle();
        if (invoiceError) throw invoiceError;
        
        // Use the linked order data if available
        const orderData = invoice?.orders || invoice;
        setRecord(orderData);
        
        // Load items from order or sales_invoice_items
        if (orderData?.order_items) {
          setItems(orderData.order_items);
        } else {
          // Try to load from order_items using the order_id
          if (invoice?.order_id) {
            const { data: orderItems } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', invoice.order_id);
            setItems(orderItems || []);
          }
        }

        // Load receipt vouchers for this customer (all vouchers, not date-restricted)
        if (orderData?.customer_id && restaurantId) {
          const { data: vouchers } = await supabase
            .from('receipt_vouchers')
            .select('*')
            .eq('customer_id', orderData.customer_id)
            .eq('restaurant_id', restaurantId)
            .order('voucher_date', { ascending: true });
          
          const voucherTotal = vouchers?.reduce((sum, v) => sum + (v.amount || 0), 0) || 0;
          
          setRecord(prev => ({
            ...prev,
            receipt_vouchers: vouchers || [],
            receipt_voucher_total: voucherTotal
          }));
        }

      } else {
        const { data, error } = await supabase
          .from('sales_orders')
          .select('*')
          .eq('id', recordId)
          .maybeSingle();
        if (error) throw error;
        setRecord(data);
        // Try to fetch sales_order_items if exists
        const { data: lineItems } = await supabase
          .from('sales_order_items')
          .select('*')
          .eq('sales_order_id', recordId);
        setItems(lineItems || []);
      }
    } catch (e: any) {
      toast.error('فشل تحميل الفاتورة: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  const subtotal = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
  const total = Number(record?.total || record?.total_amount || subtotal);
  const tax = Number(record?.tax_amount || 0);
  const discount = Number(record?.discount_amount || 0);
  // paid_amount represents direct payments only (at order creation)
  // receipt vouchers are tracked separately in receipt_voucher_ids array
  const directPaidAmount = Number(record?.paid_amount || 0);
  const receiptVoucherTotal = Number(record?.receipt_voucher_total || 0);
  const totalPaid = directPaidAmount + receiptVoucherTotal;
  const remaining = total - totalPaid;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0 print:relative print:overflow-visible"
        onClick={onClose}
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="relative w-full max-w-3xl my-auto print:max-w-full print:my-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-3 print:hidden">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" /> طباعة
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowPrintSettings(true)} className="gap-2">
                <Settings className="w-4 h-4" /> إعدادات
              </Button>
              <Button size="sm" variant="secondary" className="gap-2">
                <Download className="w-4 h-4" /> PDF
              </Button>
            </div>
            <Button size="icon" variant="secondary" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Invoice Body */}
          <div className="invoice-print-body relative bg-card text-foreground rounded-3xl overflow-hidden shadow-2xl border border-border print:rounded-none print:shadow-none print:border-0">
            {/* Watermark */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.035] flex items-center justify-center select-none">
              <Receipt className="w-[500px] h-[500px]" />
            </div>

            {/* Header gradient */}
            <div className="relative bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

              <div className="relative flex justify-between items-start gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  {printSettings.logo && (
                    <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-xl">
                      {restaurantLogo ? (
                        <img src={restaurantLogo} alt="" className="w-12 h-12 object-contain" />
                      ) : (
                        <Building2 className="w-8 h-8" />
                      )}
                    </div>
                  )}
                  {printSettings.restaurantName && (
                    <div>
                      <h1 className="text-2xl font-black mb-1">{restaurantName || 'الفاتورة'}</h1>
                      <p className="text-xs opacity-90">{source === 'order' ? 'فاتورة مبيعات' : 'أمر بيع'}</p>
                    </div>
                  )}
                </div>

                <div className="text-left bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                  {printSettings.invoiceNumber && (
                    <>
                      <p className="text-[10px] uppercase tracking-widest opacity-80 mb-1">رقم</p>
                      <p className="font-mono font-black text-2xl">
                        {record?.order_number || '—'}
                      </p>
                    </>
                  )}
                  {printSettings.dateTime && (
                    <div className="flex items-center gap-1 text-[10px] opacity-90 mt-2">
                      <Calendar className="w-3 h-3" />
                      {record?.created_at
                        ? new Date(record.created_at).toLocaleString('ar-EG', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })
                        : '—'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Customer & Meta */}
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-muted/30 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">العميل</p>
                  {printSettings.customerName && <p className="font-bold truncate">{record?.customer_name || 'عميل نقدي'}</p>}
                  {printSettings.customerPhone && record?.customer_phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {record.customer_phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">طريقة الدفع</p>
                  {printSettings.paymentMethod && (
                    <p className="font-bold">
                      {record?.payment_method === 'cash' ? 'نقدي' :
                       record?.payment_method === 'credit' ? 'آجل' :
                       record?.payment_method === 'bank' ? 'بنكي' : (record?.payment_method || '—')}
                    </p>
                  )}
                  {printSettings.status && (
                    <Badge
                      variant={record?.status === 'completed' ? 'default' : 'secondary'}
                      className="mt-1 text-[10px]"
                    >
                      {record?.status === 'completed' ? 'مكتملة' :
                       record?.status === 'pending' ? 'معلقة' :
                       record?.status === 'cancelled' ? 'ملغاة' : record?.status || '—'}
                    </Badge>
                  )}
                </div>
              </div>

              {printSettings.deliveryAddress && record?.delivery_address && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">العنوان</p>
                    <p className="text-sm truncate">{record.delivery_address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            {printSettings.items && (
              <div className="relative p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-primary" />
                  <h3 className="font-black text-sm">الأصناف</h3>
                  <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCcw className="w-8 h-8 animate-spin mx-auto text-primary opacity-30" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground italic text-sm border-2 border-dashed rounded-xl">
                    لا توجد أصناف مسجلة على هذه الفاتورة
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/60 text-xs">
                          <th className="px-4 py-3 text-right font-bold">#</th>
                          <th className="px-4 py-3 text-right font-bold">الصنف</th>
                          <th className="px-4 py-3 text-center font-bold">الكمية</th>
                          <th className="px-4 py-3 text-center font-bold">السعر</th>
                          <th className="px-4 py-3 text-left font-bold">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => {
                          const qty = Number(it.quantity || 0);
                          const price = Number(it.price || 0);
                          return (
                            <tr key={it.id || idx} className="border-t border-border hover:bg-primary/5 transition-colors">
                              <td className="px-4 py-3 text-muted-foreground font-mono">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {it.menu_item_image && (
                                    <span className="text-lg">{it.menu_item_image}</span>
                                  )}
                                  <div>
                                    <p className="font-bold">{it.menu_item_name || it.name || 'صنف'}</p>
                                    {it.sold_unit && (
                                      <p className="text-[10px] text-muted-foreground">{it.sold_unit}</p>
                                    )}
                                    {it.variables && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {Array.isArray(it.variables) ? it.variables.map((v: any, i: number) => (
                                          <span key={i} className="text-[10px] bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5">
                                            <span className="font-bold">{v.label}:</span> {v.value}
                                          </span>
                                        )) : (
                                          <span className="text-[10px] bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5">
                                            {String(it.variables)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-bold">{qty}</td>
                              <td className="px-4 py-3 text-center">{price.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-left font-black text-primary">
                                {(qty * price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="relative px-6 pb-6">
              <div className="ml-auto md:max-w-sm space-y-2 bg-muted/40 rounded-2xl p-5 border border-border">
                {printSettings.subtotal && <Row label="المجموع الفرعي" value={subtotal} currency={currency} />}
                {printSettings.discount && discount > 0 && <Row label="الخصم" value={-discount} currency={currency} className="text-amber-500" />}
                {printSettings.tax && tax > 0 && <Row label="الضريبة" value={tax} currency={currency} />}
                <div className="h-px bg-border my-2" />
                {printSettings.total && (
                  <div className="flex justify-between items-center">
                    <span className="font-black text-base">الإجمالي</span>
                    <span className="font-black text-2xl text-primary">
                      {total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      <span className="text-xs text-muted-foreground mr-1">{currency}</span>
                    </span>
                  </div>
                )}
                {printSettings.paidAmount && (
                  <>
                    <Row label="المدفوع مباشرة" value={directPaidAmount} currency={currency} className="text-emerald-500" />
                    {receiptVoucherTotal > 0 && (
                      <Row label="سندات القبض" value={receiptVoucherTotal} currency={currency} className="text-emerald-500" />
                    )}
                    <div className="h-px bg-border my-2" />
                    <Row label="إجمالي المدفوع" value={totalPaid} currency={currency} className="text-emerald-600 font-black" />
                  </>
                )}
                {printSettings.remaining && (
                  <Row label="المتبقي" value={remaining} currency={currency} className={remaining > 0 ? "text-destructive font-black" : "text-emerald-500 font-black"} />
                )}
              </div>
            </div>

            {/* Notes */}
            {printSettings.notes && record?.notes && (
              <div className="relative px-6 pb-4">
                <p className="text-sm text-muted-foreground">{record.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="relative bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 border-t border-border px-6 py-4 text-center">
              {printSettings.thankYou && (
                <p className="text-xs text-muted-foreground mb-2">شكراً لتعاملكم معنا</p>
              )}
              {printSettings.poweredBy && (
                <p className="text-xs text-muted-foreground">هذه الفاتورة مُصدّرة إلكترونياً عبر Auditry POS</p>
              )}
            </div>
          </div>

          {/* Print Settings Modal */}
          {showPrintSettings && (
            <div className="fixed inset-0 z-[101] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPrintSettings(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card p-6 max-w-md w-full space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">إعدادات الطباعة</h3>
                  <button onClick={() => setShowPrintSettings(false)}><X className="w-5 h-5" /></button>
                </div>
                
                <div className="border border-border rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-3 text-primary">عناصر الفاتورة</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.logo} onChange={(e) => handlePrintSettingChange('logo', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">الشعار</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.restaurantName} onChange={(e) => handlePrintSettingChange('restaurantName', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">اسم المطعم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.invoiceNumber} onChange={(e) => handlePrintSettingChange('invoiceNumber', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">رقم الفاتورة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.dateTime} onChange={(e) => handlePrintSettingChange('dateTime', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">التاريخ والوقت</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.customerName} onChange={(e) => handlePrintSettingChange('customerName', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">اسم العميل</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.customerPhone} onChange={(e) => handlePrintSettingChange('customerPhone', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">هاتف العميل</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.deliveryAddress} onChange={(e) => handlePrintSettingChange('deliveryAddress', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">العنوان</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.paymentMethod} onChange={(e) => handlePrintSettingChange('paymentMethod', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">طريقة الدفع</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.status} onChange={(e) => handlePrintSettingChange('status', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">الحالة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.items} onChange={(e) => handlePrintSettingChange('items', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">الأصناف</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.variables} onChange={(e) => handlePrintSettingChange('variables', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">متغيرات الخدمة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.subtotal} onChange={(e) => handlePrintSettingChange('subtotal', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">المجموع الفرعي</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.discount} onChange={(e) => handlePrintSettingChange('discount', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">الخصم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.tax} onChange={(e) => handlePrintSettingChange('tax', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">الضريبة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.total} onChange={(e) => handlePrintSettingChange('total', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">الإجمالي</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.paidAmount} onChange={(e) => handlePrintSettingChange('paidAmount', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">المدفوع</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.remaining} onChange={(e) => handlePrintSettingChange('remaining', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">المتبقي</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.notes} onChange={(e) => handlePrintSettingChange('notes', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">الملاحظات</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.thankYou} onChange={(e) => handlePrintSettingChange('thankYou', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">شكراً لتعاملكم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.poweredBy} onChange={(e) => handlePrintSettingChange('poweredBy', e.target.checked)} className="w-4 h-4" />
                      <span className="text-sm">Powered by Auditry</span>
                    </label>
                  </div>
                </div>

                <Button onClick={() => setShowPrintSettings(false)} className="w-full gradient-bg text-primary-foreground border-0">إغلاق</Button>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, value, currency, className = '' }: { label: string; value: number; currency: string; className?: string }) {
  return (
    <div className={`flex justify-between items-center text-sm ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">
        {value.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
        <span className="text-[10px] text-muted-foreground mr-1">{currency}</span>
      </span>
    </div>
  );
}
