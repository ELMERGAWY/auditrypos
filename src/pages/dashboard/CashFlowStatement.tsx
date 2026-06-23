import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';

interface Props {
  restaurantId: string;
  currency: string;
}

export function CashFlowStatement({ restaurantId, currency }: Props) {
  const [loading, setLoading] = useState(true);
  const [cashFlow, setCashFlow] = useState({
    operating_in: 0,
    operating_out: 0,
    investing_in: 0,
    investing_out: 0,
    financing_in: 0,
    financing_out: 0,
    net_cash_flow: 0
  });

  useEffect(() => {
    loadCashFlow();
  }, [restaurantId]);

  const loadCashFlow = async () => {
    try {
      setLoading(true);
      // Get all journal entries for cash/bank accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .in('code', ['1100', '1200']); // Cash and Bank

      const accountIds = accounts?.map(a => a.id) || [];

      if (accountIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: lines } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit,
          credit,
          journal_entries!inner(reference_type)
        `)
        .in('account_id', accountIds);

      let op_in = 0, op_out = 0, inv_in = 0, inv_out = 0, fin_in = 0, fin_out = 0;

      lines?.forEach((line: any) => {
        const ref = line.journal_entries.reference_type;
        const net = (line.debit || 0) - (line.credit || 0);

        if (ref === 'sale' || ref === 'expense' || !ref) {
          if (net > 0) op_in += net; else op_out += Math.abs(net);
        } else if (ref === 'asset_purchase') {
          if (net > 0) inv_in += net; else inv_out += Math.abs(net);
        } else {
          if (net > 0) fin_in += net; else fin_out += Math.abs(net);
        }
      });

      setCashFlow({
        operating_in: op_in,
        operating_out: op_out,
        investing_in: inv_in,
        investing_out: inv_out,
        financing_in: fin_in,
        financing_out: fin_out,
        net_cash_flow: (op_in - op_out) + (inv_in - inv_out) + (fin_in - fin_out)
      });
    } catch (e) {
      console.error(e);
      toast.error('خطأ في تحميل تدفقات النقد');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">جاري حساب التدفقات النقدية...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-success/5 border-success/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">التدفقات التشغيلية (صافي)</p>
              <p className="text-xl font-bold">{(cashFlow.operating_in - cashFlow.operating_out).toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">التدفقات الاستثمارية (صافي)</p>
              <p className="text-xl font-bold">{(cashFlow.investing_in - cashFlow.investing_out).toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-destructive/5 border-destructive/20">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">صافي التدفق النقدي</p>
              <p className="text-xl font-bold">{cashFlow.net_cash_flow.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> تفاصيل التدفقات النقدية</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between p-2 border-b">
            <span>الأنشطة التشغيلية (مبيعات، مصروفات)</span>
            <span className="text-success">+{cashFlow.operating_in.toLocaleString()} / <span className="text-destructive">-{cashFlow.operating_out.toLocaleString()}</span></span>
          </div>
          <div className="flex justify-between p-2 border-b">
            <span>الأنشطة الاستثمارية (شراء أصول)</span>
            <span className="text-success">+{cashFlow.investing_in.toLocaleString()} / <span className="text-destructive">-{cashFlow.investing_out.toLocaleString()}</span></span>
          </div>
          <div className="flex justify-between p-2 border-b">
            <span>الأنشطة التمويلية (رأس مال، قروض)</span>
            <span className="text-success">+{cashFlow.financing_in.toLocaleString()} / <span className="text-destructive">-{cashFlow.financing_out.toLocaleString()}</span></span>
          </div>
          <div className="flex justify-between p-4 bg-primary/10 rounded-lg font-bold text-lg">
            <span>صافي التغير في النقدية</span>
            <span className={cashFlow.net_cash_flow >= 0 ? 'text-success' : 'text-destructive'}>
              {cashFlow.net_cash_flow.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
