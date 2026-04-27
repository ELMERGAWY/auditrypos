import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign } from 'lucide-react';

interface Props {
  restaurantId: string;
  currency: string;
}

export function EquityStatement({ restaurantId, currency }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    opening_capital: 0,
    net_income: 0,
    drawings: 0,
    closing_equity: 0
  });

  useEffect(() => {
    loadEquity();
  }, [restaurantId]);

  const loadEquity = async () => {
    try {
      setLoading(true);
      // 1. Get Capital Account (3100)
      const { data: capitalAcc } = await supabase
        .from('chart_of_accounts')
        .select('id, opening_balance')
        .eq('restaurant_id', restaurantId)
        .eq('code', '3100')
        .single();

      // 2. Get Net Income (Revenue - Expenses)
      // We'll approximate this from ledger for simplicity, or we can use a summary query
      const { data: revenueLines } = await supabase.from('journal_entry_lines').select('debit, credit').eq('journal_entries.restaurant_id', restaurantId).filter('chart_of_accounts.account_type', 'eq', 'revenue');
      const { data: expenseLines } = await supabase.from('journal_entry_lines').select('debit, credit').eq('journal_entries.restaurant_id', restaurantId).filter('chart_of_accounts.account_type', 'eq', 'expense');

      const revenue = (revenueLines || []).reduce((s, l) => s + (l.credit - l.debit), 0);
      const expenses = (expenseLines || []).reduce((s, l) => s + (l.debit - l.credit), 0);
      const netIncome = revenue - expenses;

      // 3. Get Drawings (3200)
      const { data: drawingAcc } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('code', '3200')
        .single();

      let drawings = 0;
      if (drawingAcc) {
        const { data: drawingLines } = await supabase.from('journal_entry_lines').select('debit, credit').eq('account_id', drawingAcc.id);
        drawings = (drawingLines || []).reduce((s, l) => s + (l.debit - l.credit), 0);
      }

      const openingCapital = capitalAcc?.opening_balance || 0;

      setData({
        opening_capital: openingCapital,
        net_income: netIncome,
        drawings: drawings,
        closing_equity: openingCapital + netIncome - drawings
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">جاري حساب حقوق الملكية...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-primary/20">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">رأس المال المستثمر</p>
              <p className="text-xl font-bold">{data.opening_capital.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-success/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">حقوق الملكية (الإجمالي)</p>
              <p className="text-xl font-bold">{data.closing_equity.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> قائمة التغير في حقوق الملكية</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between p-2 border-b">
            <span>رأس المال في بداية الفترة</span>
            <span className="font-bold">{data.opening_capital.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between p-2 border-b">
            <span>(+) صافي الربح للفترة</span>
            <span className="text-success font-bold">+{data.net_income.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between p-2 border-b">
            <span>(-) المسحوبات الشخصية</span>
            <span className="text-destructive font-bold">-{data.drawings.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between p-4 bg-primary/10 rounded-lg font-bold text-lg">
            <span>إجمالي حقوق الملكية في نهاية الفترة</span>
            <span className="text-primary">
              {data.closing_equity.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
