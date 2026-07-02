// @ts-nocheck
import { useRef, useState, useEffect } from 'react';
import { Printer, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order, Restaurant } from './types';
import { ORDER_TYPE_CONFIG, extractCustomerRef } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReceiptVoucher {
  id: string;
  amount: number;
  voucher_date: string;
  payment_method: string;
}

interface ReceiptProps {
  order: Order;
  restaurant: Restaurant;
  onClose: () => void;
  onComplete?: () => void;
  isOpen?: boolean;
  autoPrint?: boolean;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقدي',
  instapay: 'إنستاباي',
  vodafone_cash: 'فودافون كاش',
  bank: 'تحويل بنكي',
};

const THERMAL_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { 
    font-family: 'Segoe UI', 'Arial', 'Tahoma', sans-serif; 
    font-size: 11px; 
    line-height: 1.2;
    padding: 0; 
    max-width: 48mm; 
    margin: 0 auto; 
    color: #000; 
    background: #fff; 
  }
  .receipt { padding: 2px; width: 100%; }
  .center { text-align: center; }
  .bold { font-weight: 800; }
  .logo-name { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 2px; }
  .subtitle { font-size: 10px; font-weight: 700; color: #000; margin-bottom: 2px; }
  .divider { border: none; border-top: 2px solid #000; margin: 4px 0; }
  .divider-thin { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 10px; font-weight: 600; }
  .total-row { font-size: 12px; font-weight: 900; padding: 4px 0; border-top: 1.5px solid #000; }
  .info-label { color: #000; font-size: 10px; }
  .footer { font-size: 9px; color: #000; margin-top: 6px; font-weight: 700; }
  .items-section { margin: 6px 0; width: 100%; }
  .item-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #000; font-size: 10px; font-weight: 700; }
  .item-name { flex: 1; text-align: right; padding-left: 3px; overflow: hidden; line-height: 1.1; }
  .item-qty { width: 22px; text-align: center; font-weight: 900; }
  .item-price { width: 38px; text-align: left; }
  .item-total { width: 45px; text-align: left; font-weight: 900; }
  .items-header { display: flex; justify-content: space-between; padding: 3px 0; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; }
  .summary-table { width: 100%; border-collapse: collapse; margin: 6px 0; table-layout: fixed; }
  .summary-table td { padding: 3px 2px; font-size: 11px; border-bottom: 1px dashed #000; font-weight: 700; }
  .summary-table td:last-child { text-align: left; font-weight: 900; }
  .summary-table tr:last-child td { border-bottom: 2px solid #000; }
  @media print { 
    body { margin: 0 auto; padding: 0; width: 48mm; } 
    .receipt { width: 48mm; padding: 0; }
    @page { margin: 0; size: 58mm auto; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: #000 !important; }
  }
`;

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
  items: boolean;
  totalQty: boolean;
  subtotal: boolean;
  discount: boolean;
  total: boolean;
  paymentMethod: boolean;
  paidAmount: boolean;
  remaining: boolean;
  change: boolean;
  notes: boolean;
  thankYou: boolean;
  poweredBy: boolean;
}

function ReceiptContent({ 
  order, 
  restaurant, 
  printSettings,
  receiptVouchers = []
}: { 
  order: Order; 
  restaurant: Restaurant; 
  printSettings: PrintElementSettings;
  receiptVouchers?: ReceiptVoucher[];
}) {
  const currency = restaurant.currency || 'ج.م';
  const orderTypeInfo = ORDER_TYPE_CONFIG[order.order_type as keyof typeof ORDER_TYPE_CONFIG];
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const itemCount = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const paidAmount = Number((order as any).paid_amount) || 0;
  const paymentMethod = (order as any).payment_method || 'cash';
  const remaining = Math.max(0, Number(order.total) - paidAmount);
  const change = paidAmount > Number(order.total) ? paidAmount - Number(order.total) : 0;

  return (
    <div className="receipt">
      {/* Header */}
      <div className="center">
        {printSettings.logo && restaurant.logo_url && (
          <img src={restaurant.logo_url} alt="" style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 4px' }} />
        )}
        {printSettings.restaurantName && (
          <div className="logo-name">{restaurant.name}</div>
        )}
      </div>

      <hr className="divider" />

      {/* Order Info */}
      {printSettings.dateTime && (
        <div className="row"><span className="info-label">التاريخ / {new Date(order.created_at).toLocaleDateString('ar-EG')}</span><span>م {new Date(order.created_at).toLocaleTimeString('ar-EG')}</span></div>
      )}
      <div className="row">
        {printSettings.invoiceNumber && (
          <span className="info-label">الفاتورة / <span className="bold">{order.order_number.slice(-4)}</span></span>
        )}
        {printSettings.itemCount && (
          <span className="info-label">عدد الأصناف / <span className="bold">{order.items.length}</span></span>
        )}
      </div>
      {printSettings.customerName && order.customer_name && (
        <div className="row"><span className="info-label">إسم العميل / <span className="bold">{order.customer_name}</span></span></div>
      )}
      {printSettings.customerPhone && order.customer_phone && (
        <div className="row">
          <span className="info-label">التليفون / <span dir="ltr">{order.customer_phone}</span></span>
        </div>
      )}
      {printSettings.customerRef && extractCustomerRef(order) && (
        <div className="row">
          <span className="info-label">مرجع العميل / <span className="bold">{extractCustomerRef(order)}</span></span>
        </div>
      )}
      {printSettings.deliveryAddress && order.delivery_address && (
        <div className="row"><span className="info-label">العنوان / {order.delivery_address}</span></div>
      )}

      {/* Items Section - Using divs instead of table for better thermal printer support */}
      {printSettings.items && (
        <div className="items-section">
          <div className="items-header">
            <span className="item-name">الصنف</span>
            <span className="item-qty">كمية</span>
            <span className="item-price">السعر</span>
            <span className="item-total">الإجمالي</span>
          </div>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <div key={idx}>
                <div className="item-row">
                  <span className="item-name">{item.menu_item_name || 'صنف'}</span>
                  <span className="item-qty">{item.quantity}</span>
                  <span className="item-price">{Number(item.price).toFixed(2)}</span>
                  <span className="item-total">{(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
                </div>
                {(item as any).service_details && (
                  <div style={{ fontSize: '9px', padding: '2px 0', color: '#555' }}>
                    📝 {(item as any).service_details}
                  </div>
                )}
                {Array.isArray((item as any).variables) && (item as any).variables.length > 0 && (
                  <div style={{ fontSize: '9px', padding: '2px 4px', color: '#000', borderBottom: '1px dotted #000' }}>
                    {(item as any).variables.map((v: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                        <span style={{ fontWeight: 700 }}>• {v.label}:</span>
                        <span>{v.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="item-row" style={{ textAlign: 'center', color: '#000' }}>
              لا توجد أصناف
            </div>
          )}
        </div>
      )}

      {/* Summary Table */}
      <table className="summary-table">
        <tbody>
          {printSettings.totalQty && (
            <tr>
              <td>إجمالي الكمية</td>
              <td>{itemCount.toFixed(2)}</td>
            </tr>
          )}
          {printSettings.subtotal && (
            <tr>
              <td>الإجمالي</td>
              <td>{subtotal.toFixed(2)}</td>
            </tr>
          )}
          {printSettings.discount && Number(order.discount) > 0 && (
            <tr>
              <td>الخصم</td>
              <td>{Number(order.discount).toFixed(2)}</td>
            </tr>
          )}
          {printSettings.total && (
            <tr>
              <td className="bold">صافى الفاتورة</td>
              <td className="bold" style={{ fontSize: 14 }}>{Number(order.total).toFixed(2)}</td>
            </tr>
          )}
          {printSettings.paymentMethod && (
            <tr>
              <td>طريقة الدفع</td>
              <td>{PAYMENT_LABELS[paymentMethod] || 'نقدي'}</td>
            </tr>
          )}
          {printSettings.paidAmount && (
            <tr>
              <td>المدفوع</td>
              <td className="text-green">{paidAmount.toFixed(2)}</td>
            </tr>
          )}
          {printSettings.remaining && remaining > 0 && (
            <tr>
              <td>المتبقي</td>
              <td className="text-red">{remaining.toFixed(2)}</td>
            </tr>
          )}
          {printSettings.change && change > 0 && (
            <tr>
              <td>الباقي للعميل</td>
              <td className="text-green">{change.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Receipt Vouchers */}
      {receiptVouchers.length > 0 && (
        <>
          <hr className="divider" />
          <div style={{ fontSize: 10, padding: '3px 0' }}>
            <div className="row">
              <span className="info-label">سندات القبض ({receiptVouchers.length})</span>
              <span className="bold">{receiptVouchers.reduce((sum, v) => sum + (v.amount || 0), 0).toFixed(2)}</span>
            </div>
            {receiptVouchers.map((voucher, idx) => (
              <div key={voucher.id} className="row" style={{ fontSize: 9 }}>
                <span className="info-label">سند {idx + 1}</span>
                <span>{voucher.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <hr className="divider" />

      {/* Notes */}
      {printSettings.notes && order.notes && (
        <div style={{ fontSize: 11, padding: '3px 0' }}>📝 {order.notes}</div>
      )}

      {/* Footer */}
      <div className="center footer">
        {printSettings.thankYou && (
          <p style={{ fontSize: 12, margin: '6px 0' }}>شكراً لزيارتكم ❤️</p>
        )}
        {printSettings.poweredBy && (
          <p style={{ marginTop: 4, fontSize: 9, color: '#999' }}>Powered by AuditryPOS</p>
        )}
      </div>
    </div>
  );
}

export { ReceiptContent, THERMAL_STYLES };

// Extend PrintElementSettings with copy options
type CombinedPrintSettings = PrintElementSettings & {
  customerCopy: boolean;
  businessCopy: boolean;
  kitchenCopy: boolean;
};

export function ReceiptModalWrapper({ order, restaurant, onClose, onComplete, isOpen = true, autoPrint = false }: ReceiptProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [receiptVouchers, setReceiptVouchers] = useState<ReceiptVoucher[]>([]);
  const [printSettings, setPrintSettings] = useState<CombinedPrintSettings>({
    // Element settings
    logo: true,
    restaurantName: true,
    invoiceNumber: true,
    dateTime: true,
    itemCount: true,
    customerName: true,
    customerPhone: true,
    customerRef: true,
    deliveryAddress: true,
    items: true,
    totalQty: true,
    subtotal: true,
    discount: true,
    total: true,
    paymentMethod: true,
    paidAmount: true,
    remaining: true,
    change: true,
    notes: true,
    thankYou: true,
    poweredBy: true,
    // Copy settings
    customerCopy: true,
    businessCopy: true,
    kitchenCopy: true,
  });

  // Load receipt vouchers for this customer
  useEffect(() => {
    if (isOpen && (order as any).customer_id && restaurant.id) {
      supabase
        .from('receipt_vouchers')
        .select('*')
        .eq('customer_id', (order as any).customer_id)
        .eq('restaurant_id', restaurant.id)
        .order('voucher_date', { ascending: true })
        .then(({ data }) => {
          setReceiptVouchers(data || []);
        });
    }
  }, [isOpen, order, restaurant.id]);

  // Load print settings from database on mount
  useEffect(() => {
    const loadPrintSettings = async () => {
      if (!restaurant?.id) return;
      try {
        const { data, error } = await supabase
          .from('print_settings')
          .select('settings')
          .eq('restaurant_id', restaurant.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is expected for new restaurants
          throw error;
        }
        
        if (data?.settings) {
          setPrintSettings(data.settings as CombinedPrintSettings);
        }
      } catch (error) {
        console.error('Failed to load print settings:', error);
        // Keep default settings if load fails
      }
    };
    loadPrintSettings();
  }, [restaurant?.id]);

  // Save print settings to database when changed
  const savePrintSettings = async (newSettings: CombinedPrintSettings) => {
    if (!restaurant?.id) return;
    try {
      const { error } = await supabase
        .from('print_settings')
        .upsert({
          restaurant_id: restaurant.id,
          settings: newSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'restaurant_id'
        });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to save print settings:', error);
      return false;
    }
  };

  const printReceipt = () => {
    const isFood = restaurant.business_type === 'restaurant' || restaurant.business_type === 'cafe';
    const isWholesale = restaurant.business_type === 'wholesale';
    const kitchenTitle = isFood ? 'طلب تحضير (مطبخ)' : (isWholesale ? 'طلب تجهيز (مخزن)' : 'نسخة تحضير');

    const printWindow = window.open('', '_blank', 'width=400,height=800,scrollbars=yes');
    if (!printWindow) { 
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); 
      return; 
    }

    // Generate receipt content with current print settings
    const generateReceiptContent = () => {
      const currency = restaurant.currency || 'ج.م';
      const items = Array.isArray(order.items) ? order.items : [];
      const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
      const itemCount = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const paidAmount = Number((order as any).paid_amount) || 0;
      const paymentMethod = (order as any).payment_method || 'cash';
      const remaining = Math.max(0, Number(order.total) - paidAmount);
      const change = paidAmount > Number(order.total) ? paidAmount - Number(order.total) : 0;
      const voucherTotal = receiptVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);

      let content = '';
      
      // Header
      content += '<div class="center">';
      if (printSettings.logo && restaurant.logo_url) {
        content += `<img src="${restaurant.logo_url}" alt="" style="width: 64; height: 64; object-fit: contain; margin: 0 auto 4px" />`;
      }
      if (printSettings.restaurantName) {
        content += `<div class="logo-name">${restaurant.name}</div>`;
      }
      content += '</div>';
      content += '<hr class="divider" />';

      // Order Info
      if (printSettings.dateTime) {
        content += `<div class="row"><span class="info-label">التاريخ / ${new Date(order.created_at).toLocaleDateString('ar-EG')}</span><span>م ${new Date(order.created_at).toLocaleTimeString('ar-EG')}</span></div>`;
      }
      content += '<div class="row">';
      if (printSettings.invoiceNumber) {
        content += `<span class="info-label">الفاتورة / <span class="bold">${order.order_number.slice(-4)}</span></span>`;
      }
      if (printSettings.itemCount) {
        content += `<span class="info-label">عدد الأصناف / <span class="bold">${order.items.length}</span></span>`;
      }
      content += '</div>';
      if (printSettings.customerName && order.customer_name) {
        content += `<div class="row"><span class="info-label">إسم العميل / <span class="bold">${order.customer_name}</span></span></div>`;
      }
      if (printSettings.customerPhone && order.customer_phone) {
        content += `<div class="row"><span class="info-label">التليفون / <span dir="ltr">${order.customer_phone}</span></span></div>`;
      }
      if (printSettings.customerRef && extractCustomerRef(order)) {
        content += `<div class="row"><span class="info-label">مرجع العميل / <span class="bold">${extractCustomerRef(order)}</span></span></div>`;
      }
      if (printSettings.deliveryAddress && order.delivery_address) {
        content += `<div class="row"><span class="info-label">العنوان / ${order.delivery_address}</span></div>`;
      }

      // Items Section
      if (printSettings.items) {
        content += '<div class="items-section">';
        content += '<div class="items-header">';
        content += '<span class="item-name">الصنف</span>';
        content += '<span class="item-qty">كمية</span>';
        content += '<span class="item-price">السعر</span>';
        content += '<span class="item-total">الإجمالي</span>';
        content += '</div>';
        if (order.items && order.items.length > 0) {
          order.items.forEach((item) => {
            content += `<div>`;
            content += `<div class="item-row">`;
            content += `<span class="item-name">${item.menu_item_name || 'صنف'}</span>`;
            content += `<span class="item-qty">${item.quantity}</span>`;
            content += `<span class="item-price">${Number(item.price).toFixed(2)}</span>`;
            content += `<span class="item-total">${(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>`;
            content += '</div>';
            if ((item as any).service_details) {
              content += `<div style="font-size: 9px; padding: 2px 0; color: #555;">📝 ${(item as any).service_details}</div>`;
            }
            if (Array.isArray((item as any).variables) && (item as any).variables.length > 0) {
              content += `<div style="font-size: 9px; padding: 2px 4px; color: #000; border-bottom: 1px dotted #000;">`;
              (item as any).variables.forEach((v: any) => {
                content += `<div style="display:flex; justify-content:space-between; gap:4px;"><span style="font-weight:700;">• ${v.label}:</span><span>${v.value}</span></div>`;
              });
              content += `</div>`;
            }
            content += '</div>';
          });
        } else {
          content += '<div class="item-row" style="text-align: center; color: #000">لا توجد أصناف</div>';
        }
        content += '</div>';
      }

      // Summary Table
      content += '<table class="summary-table"><tbody>';
      if (printSettings.totalQty) {
        content += `<tr><td>إجمالي الكمية</td><td>${itemCount.toFixed(2)}</td></tr>`;
      }
      if (printSettings.subtotal) {
        content += `<tr><td>الإجمالي</td><td>${subtotal.toFixed(2)}</td></tr>`;
      }
      if (printSettings.discount && Number(order.discount) > 0) {
        content += `<tr><td>الخصم</td><td>${Number(order.discount).toFixed(2)}</td></tr>`;
      }
      if (printSettings.total) {
        content += `<tr><td>المجموع النهائي</td><td>${Number(order.total).toFixed(2)} ${currency}</td></tr>`;
      }
      if (printSettings.paymentMethod) {
        content += `<tr><td>طريقة الدفع</td><td>${PAYMENT_LABELS[paymentMethod] || paymentMethod}</td></tr>`;
      }
      if (printSettings.paidAmount) {
        content += `<tr><td>المدفوع</td><td>${paidAmount.toFixed(2)} ${currency}</td></tr>`;
      }
      if (printSettings.remaining && remaining > 0) {
        content += `<tr><td>المتبقي</td><td>${remaining.toFixed(2)} ${currency}</td></tr>`;
      }
      if (printSettings.change && change > 0) {
        content += `<tr><td>الباقي للعميل</td><td>${change.toFixed(2)} ${currency}</td></tr>`;
      }
      content += '</tbody></table>';

      // Receipt Vouchers
      if (receiptVouchers.length > 0) {
        const voucherTotal = receiptVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
        content += '<div style="margin-top: 8px; border-top: 1px dashed #000; padding-top: 4px;">';
        content += `<div class="row"><span class="info-label">سندات القبض (${receiptVouchers.length})</span><span>${voucherTotal.toFixed(2)} ${currency}</span></div>`;
        receiptVouchers.forEach((voucher, idx) => {
          content += `<div class="row" style="font-size: 9px;"><span class="info-label">سند ${idx + 1}</span><span>${voucher.amount.toFixed(2)} ${currency}</span></div>`;
        });
        content += '</div>';
      }

      // Notes
      if (printSettings.notes && order.notes) {
        content += `<div class="row" style="margin-top: 8px; border-top: 1px dashed #000; padding-top: 4px;">`;
        content += `<span class="info-label">ملاحظات: ${order.notes}</span>`;
        content += '</div>';
      }

      // Footer
      if (printSettings.thankYou) {
        content += '<div class="center footer" style="margin-top: 8px;">';
        content += '<p>شكراً لزيارتكم</p>';
        content += '</div>';
      }
      if (printSettings.poweredBy) {
        content += '<div class="center footer" style="margin-top: 4px;">';
        content += '<p>Powered by Auditry</p>';
        content += '</div>';
      }

      return content;
    };

    // Kitchen/Warehouse Copy (Items only)
    const kitchenItems = Array.isArray(order.items) ? order.items : [];
    const kitchenCopy = `
      <div class="receipt">
        <div class="center">
          <div class="logo-name">${kitchenTitle}</div>
          <div class="subtitle">رقم الطلب: ${order.order_number.slice(-4)}</div>
          <div class="subtitle">التاريخ: ${new Date(order.created_at).toLocaleString('ar-EG')}</div>
        </div>
        <hr class="divider" />
        <div class="items-section">
          ${kitchenItems.map(item => `
            <div class="item-row">
              <span class="item-name" style="font-size: 16px; font-weight: bold;">${item.menu_item_name}</span>
              <span class="item-qty" style="font-size: 16px; font-weight: bold;">x ${item.quantity}</span>
            </div>
          `).join('')}
        </div>
        ${order.notes ? `<div style="font-size: 14px; font-weight: bold; border: 1px solid #000; padding: 4px; margin-top: 8px;">ملاحظات: ${order.notes}</div>` : ''}
        <div class="center footer" style="margin-top: 20px;">
          <p>----------------------------</p>
        </div>
      </div>
    `;

    let printContent = '';
    
    if (printSettings.customerCopy) {
      printContent += `
        <div class="receipt page-break">
          <div class="center bold" style="margin-bottom: 5px;">نسخة العميل</div>
          ${generateReceiptContent()}
        </div>
      `;
    }
    
    if (printSettings.businessCopy) {
      printContent += `
        <div class="receipt page-break">
          <div class="center bold" style="margin-bottom: 5px;">نسخة المؤسسة</div>
          ${generateReceiptContent()}
        </div>
      `;
    }
    
    if (printSettings.kitchenCopy && (isFood || isWholesale)) {
      printContent += kitchenCopy;
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>طباعة الفاتورة</title>
  <style>${THERMAL_STYLES} @media print { .page-break { page-break-after: always; } }</style>
</head>
<body>
  ${printContent}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
        setTimeout(function() { window.close(); }, 500);
      }, 250);
    };
  </script>
</body></html>`);
    printWindow.document.close();
  };

  useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        printReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }} 
            className="glass-card p-6 w-full max-w-[380px] flex flex-col relative max-h-[90vh] bg-card text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute left-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black mb-4 text-center">تفاصيل الفاتورة</h3>

            <div className="flex-1 overflow-y-auto max-h-[60vh] bg-white border border-border/50 rounded-2xl shadow-inner flex justify-center py-4 text-black custom-scrollbar">
              <div 
                className="w-[48mm] bg-white text-black p-1 text-xs"
                style={{ 
                  fontFamily: "'Segoe UI', 'Arial', 'Tahoma', sans-serif",
                  lineHeight: '1.2'
                }}
              >
                <style dangerouslySetInnerHTML={{ __html: `
                  .receipt { width: 100%; padding: 0; color: #000; background: #fff; }
                  .center { text-align: center; }
                  .bold { font-weight: 800; }
                  .logo-name { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
                  .subtitle { font-size: 10px; font-weight: 700; margin-bottom: 2px; }
                  .divider { border: none; border-top: 2px solid #000; margin: 4px 0; }
                  .divider-thin { border: none; border-top: 1px dashed #000; margin: 4px 0; }
                  .row { display: flex; justify-content: space-between; align-items: center; padding: 1px 0; font-size: 10px; font-weight: 600; }
                  .total-row { font-size: 13px; font-weight: 900; padding: 4px 0; border-top: 1.5px solid #000; }
                  .info-label { color: #000; font-size: 10px; }
                  .footer { font-size: 9px; color: #666; margin-top: 6px; font-weight: 700; }
                  .items-section { margin: 6px 0; width: 100%; }
                  .item-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed #ccc; font-size: 10px; font-weight: 700; color: #000; }
                  .item-name { flex: 1; text-align: right; padding-left: 2px; overflow: hidden; }
                  .item-qty { width: 20px; text-align: center; font-weight: 900; }
                  .item-price { width: 35px; text-align: left; }
                  .item-total { width: 40px; text-align: left; font-weight: 900; }
                  .items-header { display: flex; justify-content: space-between; padding: 3px 0; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; font-size: 9px; font-weight: 900; }
                  .summary-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
                  .summary-table td { padding: 3px 1px; font-size: 11px; border-bottom: 1px dashed #000; font-weight: 700; color: #000; }
                  .summary-table td:last-child { text-align: left; font-weight: 900; }
                  .summary-table tr:last-child td { border-bottom: 2px solid #000; }
                `}} />
                <div ref={ref}>
                  <ReceiptContent order={order} restaurant={restaurant} printSettings={printSettings} receiptVouchers={receiptVouchers} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button onClick={printReceipt} className="gradient-bg text-primary-foreground border-0 gap-1 flex items-center justify-center">
                <Printer className="w-4 h-4" /> طباعة حرارية
              </Button>
              <Button variant="outline" onClick={() => setShowPrintSettings(true)} className="gap-1 flex items-center justify-center">
                <Settings className="w-4 h-4" /> الإعدادات
              </Button>
              <Button variant="outline" onClick={onClose} className="col-span-2">إغلاق</Button>
              {onComplete && (
                <Button onClick={onComplete} className="col-span-2 gradient-bg text-primary-foreground border-0">إتمام الطلب</Button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Print Settings Modal */}
      <AnimatePresence>
        {showPrintSettings && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPrintSettings(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card p-6 max-w-md w-full space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">إعدادات الطباعة</h3>
                <button onClick={() => setShowPrintSettings(false)}><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-4">
                {/* Copy Settings */}
                <div className="border border-border rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-3 text-primary">النسخ</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={printSettings.customerCopy} onChange={(e) => setPrintSettings({ ...printSettings, customerCopy: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">نسخة العميل</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={printSettings.businessCopy} onChange={(e) => setPrintSettings({ ...printSettings, businessCopy: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">نسخة المؤسسة</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={printSettings.kitchenCopy} onChange={(e) => setPrintSettings({ ...printSettings, kitchenCopy: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">نسخة المطبخ/المخزن</span>
                    </label>
                  </div>
                </div>

                {/* Element Settings */}
                <div className="border border-border rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-3 text-primary">عناصر الفاتورة</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.logo} onChange={(e) => setPrintSettings({ ...printSettings, logo: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">الشعار</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.restaurantName} onChange={(e) => setPrintSettings({ ...printSettings, restaurantName: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">اسم المطعم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.invoiceNumber} onChange={(e) => setPrintSettings({ ...printSettings, invoiceNumber: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">رقم الفاتورة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.dateTime} onChange={(e) => setPrintSettings({ ...printSettings, dateTime: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">التاريخ والوقت</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.itemCount} onChange={(e) => setPrintSettings({ ...printSettings, itemCount: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">عدد الأصناف</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.customerName} onChange={(e) => setPrintSettings({ ...printSettings, customerName: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">اسم العميل</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.customerPhone} onChange={(e) => setPrintSettings({ ...printSettings, customerPhone: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">هاتف العميل</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.customerRef} onChange={(e) => setPrintSettings({ ...printSettings, customerRef: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">مرجع العميل</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.deliveryAddress} onChange={(e) => setPrintSettings({ ...printSettings, deliveryAddress: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">العنوان</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.items} onChange={(e) => setPrintSettings({ ...printSettings, items: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">الأصناف</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.totalQty} onChange={(e) => setPrintSettings({ ...printSettings, totalQty: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">إجمالي الكمية</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.subtotal} onChange={(e) => setPrintSettings({ ...printSettings, subtotal: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">المجموع الفرعي</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.discount} onChange={(e) => setPrintSettings({ ...printSettings, discount: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">الخصم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.total} onChange={(e) => setPrintSettings({ ...printSettings, total: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">الإجمالي</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.paymentMethod} onChange={(e) => setPrintSettings({ ...printSettings, paymentMethod: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">طريقة الدفع</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.paidAmount} onChange={(e) => setPrintSettings({ ...printSettings, paidAmount: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">المدفوع</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.remaining} onChange={(e) => setPrintSettings({ ...printSettings, remaining: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">المتبقي</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.change} onChange={(e) => setPrintSettings({ ...printSettings, change: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">الباقي للعميل</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.notes} onChange={(e) => setPrintSettings({ ...printSettings, notes: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">الملاحظات</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.thankYou} onChange={(e) => setPrintSettings({ ...printSettings, thankYou: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">شكراً لزيارتكم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={printSettings.poweredBy} onChange={(e) => setPrintSettings({ ...printSettings, poweredBy: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">Powered by Auditry</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <Button onClick={async () => {
                const success = await savePrintSettings(printSettings);
                if (success) {
                  setShowPrintSettings(false);
                  toast.success('تم حفظ إعدادات الطباعة');
                } else {
                  toast.error('فشل حفظ إعدادات الطباعة');
                }
              }} className="w-full gradient-bg text-primary-foreground border-0">حفظ</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

export function ReceiptModal({ order, restaurant, onClose, onComplete }: ReceiptProps) {
  return <ReceiptModalWrapper isOpen={true} order={order} restaurant={restaurant} onClose={onClose} onComplete={onComplete} />;
}
