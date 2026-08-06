import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, TrendingUp, ArrowDownCircle, Percent } from 'lucide-react';

interface Props {
  restaurantId: string;
  currency: string;
}

export function TradingAccount({ restaurantId, currency }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // 1. Load Sales from Orders and Sales Invoices
      const { data: orders } = await supabase.from('orders')
        .select('id, total, status')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'cancelled');

      const { data: salesInvoices } = await (supabase as any).from('sales_invoices')
        .select('total_amount, total, status')
        .or(`restaurant_id.eq.${restaurantId},company_id.eq.${restaurantId}`)
        .neq('status', 'cancelled');

      const ordersTotal = (orders || []).reduce((s, o) => s + Number(o.total || 0), 0);
      const invoicesTotal = ((salesInvoices || []) as any[]).reduce((s, si) => s + Number(si.total_amount || si.total || 0), 0);

      const sales = ordersTotal + invoicesTotal;

      // 2. Load COGS from Order Items
      const orderIds = (orders || []).map(o => o.id);
      let cogs = 0;

      if (orderIds.length > 0) {
        const { data: items } = await supabase.from('order_items')
          .select('quantity, price, cost_price_snapshot, unit_factor')
          .in('order_id', orderIds.slice(0, 500));

        cogs = (items || []).reduce((s, i) => {
          const qty = Number(i.quantity || 0);
          const factor = Number(i.unit_factor || 1);
          const cost = Number(i.cost_price_snapshot || 0);
          return s + (cost * qty * factor);
        }, 0);
      }

      setData({ sales, cogs, grossProfit: sales - cogs });
      setLoading(false);
    };
    load();
  }, [restaurantId]);

  if (loading) return <div className="p-10 text-center">جاري استخراج نتائج المتاجرة...</div>;

  const grossMargin = data.sales > 0 ? (data.grossProfit / data.sales) * 100 : 0;

  return (
    <div className="space-y-6 fade-in-up">
      <h3 className="text-xl font-bold font-display flex items-center gap-2">
        <ShoppingBag className="w-6 h-6 text-primary" /> حساب المتاجرة وتكلفة المبيعات
      </h3>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-2 bg-muted/50 border-b">
          <div className="p-4 border-l font-bold text-center">منـه (Debit)</div>
          <div className="p-4 font-bold text-center">لـه (Credit)</div>
        </div>

        <div className="grid grid-cols-2 min-h-[200px]">
          {/* Debit Side (Costs) */}
          <div className="p-4 border-l space-y-4 bg-destructive/5">
            <div className="flex justify-between items-center text-sm">
              <span>تكلفة البضاعة المباعة (COGS)</span>
              <span className="font-bold">{data.cogs.toLocaleString()} {currency}</span>
            </div>
            {/* We can add Opening Stock here if tracked in inventory logs */}
            <div className="pt-20 flex justify-between items-center font-bold text-success border-t border-success/30">
              <span>مجمل الربح (رصيد دائن)</span>
              <span>{data.grossProfit.toLocaleString()} {currency}</span>
            </div>
          </div>

          {/* Credit Side (Revenue) */}
          <div className="p-4 space-y-4 bg-success/5">
            <div className="flex justify-between items-center text-sm">
              <span>المبيعات (إجمالي الإيرادات)</span>
              <span className="font-bold">{data.sales.toLocaleString()} {currency}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 bg-primary/10 border-t font-bold">
          <div className="p-4 border-l text-left">{data.sales.toLocaleString()} {currency}</div>
          <div className="p-4 text-left">{data.sales.toLocaleString()} {currency}</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 border-b-4 border-b-primary">
          <p className="text-xs text-muted-foreground">هامش الربح الإجمالي</p>
          <div className="flex items-center gap-2 mt-1">
            <Percent className="w-4 h-4 text-primary" />
            <span className="text-2xl font-bold">{grossMargin.toFixed(1)}%</span>
          </div>
        </div>
        <div className="glass-card p-4 border-b-4 border-b-success">
          <p className="text-xs text-muted-foreground">عائد الاستثمار في المخزون</p>
          <div className="flex items-center gap-2 mt-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-2xl font-bold">{(data.sales / (data.cogs || 1)).toFixed(2)}x</span>
          </div>
        </div>
        <div className="glass-card p-4 border-b-4 border-b-orange-500">
          <p className="text-xs text-muted-foreground">تكلفة المبيعات / المبيعات</p>
          <div className="flex items-center gap-2 mt-1">
            <ArrowDownCircle className="w-4 h-4 text-orange-500" />
            <span className="text-2xl font-bold">{(100 - grossMargin).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
