import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Order, Restaurant } from './types';

interface ReceiptProps {
  order: Order;
  restaurant: Restaurant;
  onClose: () => void;
}

export function ReceiptModal({ order, restaurant, onClose }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const printReceipt = () => {
    if (!receiptRef.current) return;
    const content = receiptRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) { alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }

    const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>إيصال #${order.order_number.slice(-4)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 280px; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .total { font-size: 16px; font-weight: bold; }
    .logo { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>${content}</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      // Don't close - let user close after printing
    };
  };

  const currency = restaurant.currency || 'ج.م';

  return (
    <div ref={receiptRef} className="space-y-2 text-xs font-mono" dir="rtl">
      <div className="center">
        {restaurant.logo_url && (
          <img src={restaurant.logo_url} alt="logo" style={{ width: 60, height: 60, objectFit: 'contain', margin: '0 auto 4px' }} />
        )}
        <div className="bold" style={{ fontSize: 14 }}>{restaurant.name}</div>
        <div>إيصال طلب</div>
      </div>
      <div className="line" />
      <div className="row"><span>رقم الطلب</span><span className="bold">#{order.order_number.slice(-4)}</span></div>
      {order.table_number && <div className="row"><span>الطاولة</span><span>{order.table_number}</span></div>}
      {order.customer_name && <div className="row"><span>العميل</span><span>{order.customer_name}</span></div>}
      {order.customer_phone && <div className="row"><span>الهاتف</span><span>{order.customer_phone}</span></div>}
      <div className="row"><span>التاريخ</span><span>{new Date(order.created_at).toLocaleString('ar-EG')}</span></div>
      <div className="line" />
      {order.items.map((item, idx) => (
        <div key={idx} className="row">
          <span>{item.menu_item_name} × {item.quantity}</span>
          <span>{(item.price * item.quantity).toFixed(2)} {currency}</span>
        </div>
      ))}
      <div className="line" />
      {Number(order.discount) > 0 && (
        <div className="row"><span>الخصم</span><span>-{order.discount} {currency}</span></div>
      )}
      <div className="row total"><span>الإجمالي</span><span>{order.total} {currency}</span></div>
      {order.notes && (
        <>
          <div className="line" />
          <div>ملاحظات: {order.notes}</div>
        </>
      )}
      <div className="line" />
      <div className="center">شكراً لزيارتكم ❤️</div>
    </div>
  );
}

interface ReceiptModalWrapperProps extends ReceiptProps {
  onPrint?: () => void;
}

export function ReceiptModalWrapper({ order, restaurant, onClose }: ReceiptModalWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const currency = restaurant.currency || 'ج.م';

  const printReceipt = () => {
    if (!ref.current) return;
    const content = ref.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=320,height=700');
    if (!printWindow) { alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>إيصال</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 12px; max-width: 280px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .total { font-size: 15px; font-weight: bold; }
  </style>
</head>
<body>${content}</body>
</html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  };

  return (
    <div>
      <div ref={ref} className="space-y-2 text-xs font-mono" dir="rtl">
        <div className="text-center">
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt="" style={{ width: 60, height: 60, objectFit: 'contain', margin: '0 auto 4px' }} />
          )}
          <p className="font-bold text-sm">{restaurant.name}</p>
          <p>إيصال طلب</p>
        </div>
        <div className="border-t border-dashed border-foreground/30" />
        <div className="flex justify-between"><span>رقم الطلب</span><span className="font-bold">#{order.order_number.slice(-4)}</span></div>
        {order.table_number && <div className="flex justify-between"><span>الطاولة</span><span>{order.table_number}</span></div>}
        {order.customer_name && <div className="flex justify-between"><span>العميل</span><span>{order.customer_name}</span></div>}
        {order.customer_phone && <div className="flex justify-between"><span>الهاتف</span><span>{order.customer_phone}</span></div>}
        <div className="flex justify-between"><span>التاريخ</span><span>{new Date(order.created_at).toLocaleString('ar-EG')}</span></div>
        <div className="border-t border-dashed border-foreground/30" />
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{item.menu_item_name} × {item.quantity}</span>
            <span>{(item.price * item.quantity).toFixed(2)} {currency}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-foreground/30" />
        {Number(order.discount) > 0 && <div className="flex justify-between text-success"><span>الخصم</span><span>-{order.discount} {currency}</span></div>}
        <div className="flex justify-between font-bold text-base"><span>الإجمالي</span><span>{order.total} {currency}</span></div>
        {order.notes && <><div className="border-t border-dashed border-foreground/30" /><p>ملاحظات: {order.notes}</p></>}
        <div className="border-t border-dashed border-foreground/30" />
        <p className="text-center">شكراً لزيارتكم ❤️</p>
      </div>
      <div className="flex gap-2 mt-4">
        <Button onClick={printReceipt} className="flex-1 gradient-bg text-primary-foreground border-0">
          <Printer className="w-4 h-4 ml-1" /> طباعة
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">إغلاق</Button>
      </div>
    </div>
  );
}
