// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Receipt, AlertCircle } from 'lucide-react';

export interface Allocation {
  order_id: string;
  order_number: string;
  amount: number;
  previous_paid: number;
  order_total: number;
}

interface Props {
  restaurantId: string;
  customerId: string;
  totalAmount: number;
  currency?: string;
  onChange: (allocations: Allocation[], totalAllocated: number) => void;
}

/**
 * Multi-invoice/order payment allocation selector.
 * Lists unpaid or partially-paid orders for the customer and lets the user
 * split the received amount across one or more of them.
 * Auto-fills remaining amount across selected orders on first load.
 */
export function PaymentAllocations({ restaurantId, customerId, totalAmount, currency = 'ج.م', onChange }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!customerId || !restaurantId) { setOrders([]); return; }
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, total, paid_amount, created_at, status')
          .eq('restaurant_id', restaurantId)
          .eq('customer_id', customerId)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: true });
        const unpaid = (data || []).filter((o: any) => Number(o.total || 0) - Number(o.paid_amount || 0) > 0.01);
        setOrders(unpaid);
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId, restaurantId]);

  // Notify parent on any change
  useEffect(() => {
    const allocs: Allocation[] = orders
      .map((o) => {
        const amt = Number(amounts[o.id] || 0);
        if (!amt || amt <= 0) return null;
        return {
          order_id: o.id,
          order_number: o.order_number,
          amount: amt,
          previous_paid: Number(o.paid_amount || 0),
          order_total: Number(o.total || 0),
        };
      })
      .filter(Boolean) as Allocation[];
    const total = allocs.reduce((s, a) => s + a.amount, 0);
    onChange(allocs, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amounts, orders]);

  const autoFill = () => {
    let remaining = Number(totalAmount || 0);
    const next: Record<string, string> = {};
    for (const o of orders) {
      if (remaining <= 0) break;
      const due = Number(o.total || 0) - Number(o.paid_amount || 0);
      const take = Math.min(due, remaining);
      next[o.id] = take.toFixed(2);
      remaining -= take;
    }
    setAmounts(next);
  };

  if (!customerId) return null;

  const totalAllocated = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const remainingUnallocated = Number(totalAmount || 0) - totalAllocated;

  return (
    <div className="border border-border rounded-xl p-3 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm">
          <Receipt className="w-4 h-4 text-primary" />
          تخصيص المبلغ على الفواتير / الطلبات
        </Label>
        {orders.length > 0 && (
          <button type="button" onClick={autoFill} className="text-[11px] px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-bold">
            توزيع تلقائي
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">جاري التحميل...</p>
      ) : orders.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">لا توجد فواتير/طلبات غير مسددة لهذا العميل — سيتم تسجيل السند على الرصيد فقط.</p>
      ) : (
        <>
          <div className="max-h-52 overflow-y-auto space-y-1.5">
            {orders.map((o) => {
              const due = Number(o.total || 0) - Number(o.paid_amount || 0);
              return (
                <div key={o.id} className="flex items-center gap-2 bg-background rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold">#{o.order_number || o.id.slice(0, 6)}</span>
                      <Badge variant="outline" className="text-[9px]">
                        متبقي {due.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      إجمالي {Number(o.total).toFixed(2)} • مدفوع {Number(o.paid_amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={due}
                    value={amounts[o.id] || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAmounts((prev) => ({ ...prev, [o.id]: v }));
                    }}
                    placeholder="0.00"
                    className="w-24 h-8 text-sm"
                  />
                </div>
              );
            })}
          </div>
          <div className={`flex items-center justify-between text-xs px-2 py-1 rounded ${Math.abs(remainingUnallocated) < 0.01 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> المخصص: {totalAllocated.toFixed(2)} {currency}</span>
            <span>غير مخصص: {remainingUnallocated.toFixed(2)} {currency}</span>
          </div>
        </>
      )}
    </div>
  );
}
