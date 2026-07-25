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
import { extractCustomerRef } from '@/pages/dashboard/types';

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

// Align with PrintSettingsManager / ReceiptModal so checked fields actually render
interface PrintElementSettings {
  logo: boolean;
  restaurantName: boolean;
  invoiceNumber: boolean;
  dateTime: boolean;
  itemCount: boolean;
  customerName: boolean;
  customerPhone: boolean;
  customerRef: boolean;
  deliveryAddress: boolean;
  paymentMethod: boolean;
  status: boolean;
  items: boolean;
  variables: boolean;
  totalQty: boolean;
  subtotal: boolean;
  discount: boolean;
  tax: boolean;
  total: boolean;
  paidAmount: boolean;
  remaining: boolean;
  change: boolean;
  directPayment: boolean;
  notes: boolean;
  thankYou: boolean;
  poweredBy: boolean;
}

const DEFAULT_INVOICE_PRINT_SETTINGS: PrintElementSettings = {
  logo: true,
  restaurantName: true,
  invoiceNumber: true,
  dateTime: true,
  itemCount: true,
  customerName: true,
  customerPhone: true,
  customerRef: true,
  deliveryAddress: true,
  paymentMethod: true,
  status: true,
  items: true,
  variables: true,
  totalQty: true,
  subtotal: true,
  discount: true,
  tax: true,
  total: true,
  paidAmount: true,
  remaining: true,
  change: true,
  directPayment: true,
  notes: true,
  thankYou: true,
  poweredBy: true,
};

function mergeInvoicePrintSettings(saved: Partial<PrintElementSettings> | null | undefined): PrintElementSettings {
  return { ...DEFAULT_INVOICE_PRINT_SETTINGS, ...(saved || {}) };
}

export function InvoiceViewer({
  open, onClose, source, recordId, currency = 'ج.م',
  restaurantName, restaurantLogo, restaurantId
}: InvoiceViewerProps) {
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintElementSettings>(DEFAULT_INVOICE_PRINT_SETTINGS);

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
      setPrintSettings(mergeInvoicePrintSettings(data?.settings as any));
    } catch (e) {
      console.error('Failed to load print settings:', e);
      setPrintSettings(DEFAULT_INVOICE_PRINT_SETTINGS);
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
      const merged = mergeInvoicePrintSettings({ ...(existing?.settings as any || {}), ...newSettings });
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
        let lineItems = data?.order_items || [];
        if ((!lineItems || lineItems.length === 0) && data?.id) {
          const { data: fallbackItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', data.id);
          lineItems = fallbackItems || [];
        }
        setItems(lineItems);

        // Load receipt vouchers created AFTER this invoice only (to avoid auto-attaching old payments)
        if (data?.customer_id && restaurantId && data?.created_at) {
          const { data: vouchers } = await supabase
            .from('receipt_vouchers')
            .select('*')
            .eq('customer_id', data.customer_id)
            .eq('restaurant_id', restaurantId)
            .gt('created_at', data.created_at) // Only vouchers created AFTER this invoice
            .order('voucher_date', { ascending: true });

          const voucherTotal = vouchers?.reduce((sum, v) => sum + (v.amount || 0), 0) || 0;
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

        // Load receipt vouchers created AFTER this invoice only (to avoid auto-attaching old payments)
        if (orderData?.customer_id && restaurantId && orderData?.created_at) {
          const { data: vouchers } = await supabase
            .from('receipt_vouchers')
            .select('*')
            .eq('customer_id', orderData.customer_id)
            .eq('restaurant_id', restaurantId)
            .gt('created_at', orderData.created_at) // Only vouchers created AFTER this invoice
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
  const itemCount = items.reduce((s, it) => s + (Number(it.quantity || 0)), 0);
  const total = Number(record?.total || record?.total_amount || subtotal);
  const tax = Number(record?.tax_amount || record?.tax || 0);
  // orders table uses `discount`; sales_orders may use `discount_amount`
  const discount = Number(record?.discount_amount ?? record?.discount ?? 0);
  // paid_amount represents direct payments only (at order creation)
  // We do NOT include receipt_voucher_total to avoid auto-attaching old payments
  const directPaidAmount = Number(record?.paid_amount || 0);
  const receiptVoucherTotal = Number(record?.receipt_voucher_total || 0);
  const totalPaid = directPaidAmount;
  const remaining = total - totalPaid;
  const change = totalPaid > total ? totalPaid - total : 0;
  const customerRef = extractCustomerRef(record) || record?.customer_ref || '';

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
                    <div className="flex items-center gap-1 text-xs font-bold text-primary mt-2">
                      <Calendar className="w-4 h-4" />
                      تاريخ الفاتورة:
                      {record?.created_at
                        ? new Date(record.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })
                        : '—'}
                    </div>
                  )}
                  {(record?.created_by_name || record?.updated_by_name) && (
                    <p className="text-[10px] opacity-90 mt-1">
                      {record.updated_by_name && record.created_by_name && record.updated_by_name !== record.created_by_name
                        ? `أنشأه: ${record.created_by_name} · عدّله: ${record.updated_by_name}`
                        : `بواسطة: ${record.updated_by_name || record.created_by_name}`}
                    </p>
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
                  {printSettings.customerName && (
                    <p className="font-bold truncate">{record?.customer_name || 'عميل نقدي'}</p>
                  )}
                  {printSettings.customerPhone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {record?.customer_phone || '—'}
                    </p>
                  )}
                  {printSettings.customerRef && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      مرجع العميل: <span className="font-bold text-foreground">{customerRef || '—'}</span>
                    </p>
                  )}
                  {printSettings.itemCount && (
                    <p className="text-xs text-muted-foreground mt-0.5">عدد الأصناف: {items.length}</p>
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

              {printSettings.deliveryAddress && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">العنوان</p>
                    <p className="text-sm truncate">{record?.delivery_address || '—'}</p>
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
                                    {printSettings.variables && it.variables && (
                                      <div className="mt-1 grid grid-cols-2 gap-1">
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
                {printSettings.totalQty && <Row label="إجمالي الكمية" value={itemCount} currency="" />}
                {printSettings.subtotal && <Row label="المجموع الفرعي" value={subtotal} currency={currency} />}
                {printSettings.discount && <Row label="الخصم" value={-discount} currency={currency} className="text-amber-500" />}
                {printSettings.tax && <Row label="الضريبة" value={tax} currency={currency} />}
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
                    {printSettings.directPayment && (
                      <Row label="المدفوع مباشرة" value={directPaidAmount} currency={currency} className="text-emerald-500" />
                    )}
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
                {printSettings.change && change > 0 && (
                  <Row label="الباقي للعميل" value={change} currency={currency} className="text-emerald-500 font-black" />
                )}
              </div>
            </div>

            {/* Notes */}
            {printSettings.notes && record?.notes && (
              <div className="relative px-6 pb-4">
                <p className="text-sm text-muted-foreground">ملاحظات: {record.notes}</p>
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
                    {[
                      { key: 'logo', label: 'الشعار' },
                      { key: 'restaurantName', label: 'اسم المطعم' },
                      { key: 'invoiceNumber', label: 'رقم الفاتورة' },
                      { key: 'dateTime', label: 'التاريخ والوقت' },
                      { key: 'itemCount', label: 'عدد الأصناف' },
                      { key: 'customerName', label: 'اسم العميل' },
                      { key: 'customerPhone', label: 'هاتف العميل' },
                      { key: 'customerRef', label: 'مرجع العميل' },
                      { key: 'deliveryAddress', label: 'العنوان' },
                      { key: 'paymentMethod', label: 'طريقة الدفع' },
                      { key: 'status', label: 'الحالة' },
                      { key: 'items', label: 'الأصناف' },
                      { key: 'variables', label: 'متغيرات الخدمة' },
                      { key: 'totalQty', label: 'إجمالي الكمية' },
                      { key: 'subtotal', label: 'المجموع الفرعي' },
                      { key: 'discount', label: 'الخصم' },
                      { key: 'tax', label: 'الضريبة' },
                      { key: 'total', label: 'الإجمالي' },
                      { key: 'paidAmount', label: 'إجمالي المدفوع' },
                      { key: 'directPayment', label: 'المدفوع مباشرة' },
                      { key: 'remaining', label: 'المتبقي' },
                      { key: 'change', label: 'الباقي للعميل' },
                      { key: 'notes', label: 'الملاحظات' },
                      { key: 'thankYou', label: 'شكراً لتعاملكم' },
                      { key: 'poweredBy', label: 'Powered by Auditry' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!printSettings[key as keyof PrintElementSettings]}
                          onChange={(e) => handlePrintSettingChange(key as keyof PrintElementSettings, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
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
