import { useRef } from 'react';
import { Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Order, Restaurant } from './types';
import { ORDER_TYPE_CONFIG } from './types';

interface ReceiptProps {
  order: Order;
  restaurant: Restaurant;
  onClose: () => void;
}

const THERMAL_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', 'Lucida Console', monospace; font-size: 12px; padding: 8px; max-width: 300px; margin: 0 auto; color: #000; background: #fff; }
  .receipt { padding: 4px 0; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .logo-name { font-size: 20px; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
  .divider { border: none; border-top: 1px dashed #333; margin: 8px 0; }
  .divider-double { border: none; border-top: 2px solid #333; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; }
  .row-item { padding: 3px 0; }
  .item-name { font-weight: bold; }
  .item-details { color: #555; font-size: 11px; padding-right: 12px; }
  .total-row { font-size: 16px; font-weight: bold; padding: 4px 0; }
  .info-label { color: #666; font-size: 11px; }
  .footer { font-size: 10px; color: #666; margin-top: 4px; }
  .order-type { display: inline-block; border: 1px solid #333; border-radius: 4px; padding: 2px 8px; font-size: 11px; margin: 4px 0; }
  .barcode { font-family: 'Libre Barcode 39', monospace; font-size: 36px; letter-spacing: 2px; }
  @media print { body { margin: 0; padding: 4px; } @page { margin: 0; } }
`;

function ReceiptContent({ order, restaurant }: { order: Order; restaurant: Restaurant }) {
  const currency = restaurant.currency || 'ج.م';
  const orderTypeInfo = ORDER_TYPE_CONFIG[order.order_type as keyof typeof ORDER_TYPE_CONFIG];
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="receipt">
      {/* Header */}
      <div className="center">
        {restaurant.logo_url && (
          <img src={restaurant.logo_url} alt="" style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 6px' }} />
        )}
        <div className="logo-name">{restaurant.name}</div>
        <div style={{ fontSize: 11, color: '#666' }}>فاتورة ضريبية مبسطة</div>
      </div>

      <hr className="divider-double" />

      {/* Order Info */}
      <div className="row"><span className="info-label">رقم الطلب</span><span className="bold">#{order.order_number.slice(-4)}</span></div>
      <div className="row"><span className="info-label">التاريخ</span><span>{new Date(order.created_at).toLocaleDateString('ar-EG')}</span></div>
      <div className="row"><span className="info-label">الوقت</span><span>{new Date(order.created_at).toLocaleTimeString('ar-EG')}</span></div>
      
      <div className="center" style={{ margin: '4px 0' }}>
        <span className="order-type">{orderTypeInfo?.icon} {orderTypeInfo?.label}</span>
      </div>

      {order.table_number && (
        <div className="row"><span className="info-label">رقم الطاولة</span><span className="bold">🪑 {order.table_number}</span></div>
      )}
      {order.customer_name && (
        <div className="row"><span className="info-label">العميل</span><span>{order.customer_name}</span></div>
      )}
      {order.customer_phone && (
        <div className="row"><span className="info-label">الهاتف</span><span dir="ltr">{order.customer_phone}</span></div>
      )}
      {order.delivery_address && (
        <div className="row"><span className="info-label">عنوان التوصيل</span><span style={{ maxWidth: 150, textAlign: 'left' }}>{order.delivery_address}</span></div>
      )}

      <hr className="divider" />

      {/* Items Header */}
      <div className="row bold" style={{ fontSize: 11, borderBottom: '1px solid #ccc', paddingBottom: 3, marginBottom: 3 }}>
        <span>الصنف</span>
        <span>المبلغ</span>
      </div>

      {/* Items */}
      {order.items.map((item, idx) => (
        <div key={idx} className="row-item">
          <div className="row">
            <span className="item-name">{item.menu_item_image} {item.menu_item_name}</span>
            <span className="bold">{(item.price * item.quantity).toFixed(2)}</span>
          </div>
          <div className="item-details">{item.quantity} × {item.price.toFixed(2)} {currency}</div>
        </div>
      ))}

      <hr className="divider" />

      {/* Totals */}
      <div className="row"><span>عدد الأصناف</span><span>{itemCount}</span></div>
      <div className="row"><span>المجموع الفرعي</span><span>{subtotal.toFixed(2)} {currency}</span></div>
      {Number(order.discount) > 0 && (
        <div className="row" style={{ color: '#16a34a' }}><span>الخصم</span><span>-{Number(order.discount).toFixed(2)} {currency}</span></div>
      )}

      <hr className="divider-double" />

      <div className="row total-row">
        <span>الإجمالي</span>
        <span>{Number(order.total).toFixed(2)} {currency}</span>
      </div>

      <hr className="divider-double" />

      {/* Notes */}
      {order.notes && (
        <>
          <div style={{ fontSize: 11, padding: '3px 0' }}>📝 {order.notes}</div>
          <hr className="divider" />
        </>
      )}

      {/* Footer */}
      <div className="center footer">
        <p style={{ fontSize: 13, margin: '6px 0' }}>شكراً لزيارتكم ❤️</p>
        <p>نتمنى لكم تجربة ممتعة</p>
        <p style={{ marginTop: 6, fontSize: 9, color: '#999' }}>Powered by AuditryPOS</p>
      </div>
    </div>
  );
}

export function ReceiptModalWrapper({ order, restaurant, onClose }: ReceiptProps) {
  const ref = useRef<HTMLDivElement>(null);
  const currency = restaurant.currency || 'ج.م';

  const printReceipt = () => {
    if (!ref.current) return;
    const content = ref.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=320,height=800');
    if (!printWindow) { alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>إيصال #${order.order_number.slice(-4)}</title>
  <style>${THERMAL_STYLES}</style>
</head>
<body>${content}</body>
</html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  };

  const orderTypeInfo = ORDER_TYPE_CONFIG[order.order_type as keyof typeof ORDER_TYPE_CONFIG];

  return (
    <div>
      {/* Preview in dashboard */}
      <div ref={ref} className="space-y-2 text-xs font-mono bg-card rounded-lg p-4 max-h-[60vh] overflow-auto" dir="rtl"
        style={{ fontFamily: "'Courier New', monospace" }}>
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

// Keep the standalone ReceiptModal export for backward compatibility
export function ReceiptModal({ order, restaurant, onClose }: ReceiptProps) {
  return <ReceiptModalWrapper order={order} restaurant={restaurant} onClose={onClose} />;
}
