import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Order, Restaurant } from './types';
import { ORDER_TYPE_CONFIG } from './types';

interface ReceiptProps {
  order: Order;
  restaurant: Restaurant;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقدي',
  instapay: 'إنستاباي',
  vodafone_cash: 'فودافون كاش',
  bank: 'تحويل بنكي',
};

const THERMAL_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Arial', 'Tahoma', sans-serif; font-size: 13px; padding: 4px; max-width: 80mm; margin: 0 auto; color: #000; background: #fff; }
  .receipt { padding: 4px 0; width: 100%; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .logo-name { font-size: 18px; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
  .subtitle { font-size: 11px; color: #000; margin-bottom: 2px; }
  .divider { border: none; border-top: 2px solid #000; margin: 6px 0; }
  .divider-thin { border: none; border-top: 1px solid #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 12px; }
  .total-row { font-size: 14px; font-weight: bold; padding: 4px 0; }
  .info-label { color: #000; font-size: 12px; }
  .footer { font-size: 10px; color: #000; margin-top: 6px; }
  .items-section { margin: 8px 0; }
  .item-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #000; font-size: 12px; }
  .item-name { flex: 1; text-align: right; padding-left: 4px; }
  .item-qty { width: 40px; text-align: center; }
  .item-price { width: 60px; text-align: left; }
  .item-total { width: 60px; text-align: left; font-weight: bold; }
  .items-header { display: flex; justify-content: space-between; padding: 4px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; font-size: 11px; font-weight: bold; }
  .summary-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  .summary-table td { padding: 3px 4px; font-size: 12px; border-bottom: 1px solid #000; }
  .summary-table td:last-child { text-align: left; font-weight: bold; }
  .summary-table tr:last-child td { border-bottom: 2px solid #000; }
  .text-green { font-weight: bold; }
  .text-red { font-weight: bold; }
  @media print { 
    body { margin: 0; padding: 2px; width: 80mm; } 
    @page { margin: 0; size: 80mm auto; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: #000 !important; }
  }
`;

function ReceiptContent({ order, restaurant }: { order: Order; restaurant: Restaurant }) {
  const currency = restaurant.currency || 'ج.م';
  const orderTypeInfo = ORDER_TYPE_CONFIG[order.order_type as keyof typeof ORDER_TYPE_CONFIG];
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const paidAmount = Number((order as any).paid_amount) || 0;
  const paymentMethod = (order as any).payment_method || 'cash';
  const remaining = Math.max(0, Number(order.total) - paidAmount);
  const change = paidAmount > Number(order.total) ? paidAmount - Number(order.total) : 0;

  return (
    <div className="receipt">
      {/* Header */}
      <div className="center">
        {restaurant.logo_url && (
          <img src={restaurant.logo_url} alt="" style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 4px' }} />
        )}
        <div className="logo-name">{restaurant.name}</div>
      </div>

      <hr className="divider" />

      {/* Order Info */}
      <div className="row"><span className="info-label">التاريخ / {new Date(order.created_at).toLocaleDateString('ar-EG')}</span><span>م {new Date(order.created_at).toLocaleTimeString('ar-EG')}</span></div>
      <div className="row">
        <span className="info-label">الفاتورة / <span className="bold">{order.order_number.slice(-4)}</span></span>
        <span className="info-label">عدد الأصناف / <span className="bold">{order.items.length}</span></span>
      </div>
      {order.customer_name && (
        <div className="row"><span className="info-label">إسم العميل / <span className="bold">{order.customer_name}</span></span></div>
      )}
      {order.customer_phone && (
        <div className="row"><span className="info-label">التليفون / <span dir="ltr">{order.customer_phone}</span></span></div>
      )}
      {order.delivery_address && (
        <div className="row"><span className="info-label">العنوان / {order.delivery_address}</span></div>
      )}

      {/* Items Section - Using divs instead of table for better thermal printer support */}
      <div className="items-section">
        <div className="items-header">
          <span className="item-name">الصنف</span>
          <span className="item-qty">كمية</span>
          <span className="item-price">السعر</span>
          <span className="item-total">الإجمالي</span>
        </div>
        {order.items && order.items.length > 0 ? (
          order.items.map((item, idx) => (
            <div key={idx} className="item-row">
              <span className="item-name">{item.menu_item_name || 'صنف'}</span>
              <span className="item-qty">{item.quantity}</span>
              <span className="item-price">{Number(item.price).toFixed(2)}</span>
              <span className="item-total">{(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
            </div>
          ))
        ) : (
          <div className="item-row" style={{ textAlign: 'center', color: '#000' }}>
            لا توجد أصناف
          </div>
        )}
      </div>

      {/* Summary Table */}
      <table className="summary-table">
        <tbody>
          <tr>
            <td>إجمالي الكمية</td>
            <td>{itemCount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>الإجمالي</td>
            <td>{subtotal.toFixed(2)}</td>
          </tr>
          {Number(order.discount) > 0 && (
            <tr>
              <td>الخصم</td>
              <td>{Number(order.discount).toFixed(2)}</td>
            </tr>
          )}
          <tr>
            <td className="bold">صافى الفاتورة</td>
            <td className="bold" style={{ fontSize: 14 }}>{Number(order.total).toFixed(2)}</td>
          </tr>
          <tr>
            <td>طريقة الدفع</td>
            <td>{PAYMENT_LABELS[paymentMethod] || 'نقدي'}</td>
          </tr>
          <tr>
            <td>المدفوع</td>
            <td className="text-green">{paidAmount.toFixed(2)}</td>
          </tr>
          {remaining > 0 && (
            <tr>
              <td>المتبقي</td>
              <td className="text-red">{remaining.toFixed(2)}</td>
            </tr>
          )}
          {change > 0 && (
            <tr>
              <td>الباقي للعميل</td>
              <td className="text-green">{change.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <hr className="divider" />

      {/* Notes */}
      {order.notes && (
        <div style={{ fontSize: 11, padding: '3px 0' }}>📝 {order.notes}</div>
      )}

      {/* Footer */}
      <div className="center footer">
        <p style={{ fontSize: 12, margin: '6px 0' }}>شكراً لزيارتكم ❤️</p>
        <p style={{ marginTop: 4, fontSize: 9, color: '#999' }}>Powered by AuditryPOS</p>
      </div>
    </div>
  );
}

export function ReceiptModalWrapper({ order, restaurant, onClose }: ReceiptProps) {
  const ref = useRef<HTMLDivElement>(null);

  const printReceipt = () => {
    if (!ref.current) return;
    
    const content = ref.current.innerHTML;
    const isFood = restaurant.business_type === 'restaurant' || restaurant.business_type === 'cafe';
    const isWholesale = restaurant.business_type === 'wholesale';
    const kitchenTitle = isFood ? 'طلب تحضير (مطبخ)' : (isWholesale ? 'طلب تجهيز (مخزن)' : 'نسخة تحضير');

    const printWindow = window.open('', '_blank', 'width=400,height=800,scrollbars=yes');
    if (!printWindow) { 
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); 
      return; 
    }

    // Kitchen/Warehouse Copy (Items only)
    const kitchenCopy = `
      <div class="receipt">
        <div class="center">
          <div class="logo-name">${kitchenTitle}</div>
          <div class="subtitle">رقم الطلب: ${order.order_number.slice(-4)}</div>
          <div class="subtitle">التاريخ: ${new Date(order.created_at).toLocaleString('ar-EG')}</div>
        </div>
        <hr class="divider" />
        <div class="items-section">
          ${order.items.map(item => `
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

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>طباعة الفاتورة</title>
  <style>${THERMAL_STYLES} @media print { .page-break { page-break-after: always; } }</style>
</head>
<body>
  <!-- Customer Copy -->
  <div class="receipt page-break">
    <div class="center bold" style="margin-bottom: 5px;">نسخة العميل</div>
    ${content}
  </div>

  <!-- Kitchen/Warehouse Copy -->
  ${(isFood || isWholesale) ? kitchenCopy : ''}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
        setTimeout(function() { window.close(); }, 500);
      }, 250);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div>
      <div ref={ref} className="space-y-2 text-xs bg-card rounded-lg p-4 max-h-[60vh] overflow-auto" dir="rtl"
        style={{ fontFamily: "'Arial', 'Tahoma', sans-serif" }}>
        <ReceiptContent order={order} restaurant={restaurant} />
      </div>

      <div className="flex gap-2 mt-4">
        <Button onClick={printReceipt} className="flex-1 gradient-bg text-primary-foreground border-0">
          <Printer className="w-4 h-4 ml-1" /> طباعة حرارية
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">إغلاق</Button>
      </div>
    </div>
  );
}

export function ReceiptModal({ order, restaurant, onClose }: ReceiptProps) {
  return <ReceiptModalWrapper order={order} restaurant={restaurant} onClose={onClose} />;
}
