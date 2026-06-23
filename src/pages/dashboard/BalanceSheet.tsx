import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Scale, Building2, Wallet, Users, Package } from 'lucide-react';

interface Props {
  restaurantId: string;
  currency: string;
}

export function BalanceSheet({ restaurantId, currency }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [productsRes, customersRes, suppliersRes, journalRes] = await Promise.all([
        supabase.from('products').select('cost_price, quantity').eq('restaurant_id', restaurantId),
        supabase.from('customers').select('balance').eq('restaurant_id', restaurantId),
        supabase.from('suppliers').select('balance').eq('restaurant_id', restaurantId),
        supabase.from('journal_entry_lines').select('debit, credit, account_code')
          .eq('journal_entries.restaurant_id', restaurantId)
      ]);

      const stockValue = (productsRes.data || []).reduce((s, p) => s + (Number(p.cost_price) * Number(p.quantity)), 0);
      const accountsReceivable = (customersRes.data || []).reduce((s, c) => s + Math.max(0, Number(c.balance)), 0);
      const accountsPayable = (suppliersRes.data || []).reduce((s, sup) => s + Math.max(0, Number(sup.balance)), 0);

      // Cash & Bank (Simplified from journal lines)
      let cash = 0;
      let bank = 0;
      ((journalRes.data || []) as any[]).forEach((line: any) => {
        if (line.account_code?.startsWith('1100')) cash += (Number(line.debit) - Number(line.credit));
        if (line.account_code?.startsWith('1200')) bank += (Number(line.debit) - Number(line.credit));
      });

      setData({
        assets: { cash, bank, stockValue, accountsReceivable },
        liabilities: { accountsPayable },
        equity: { capital: (cash + bank + stockValue + accountsReceivable) - accountsPayable }
      });
      setLoading(false);
    };
    load();
  }, [restaurantId]);

  if (loading) return <div className="p-10 text-center">جاري إعداد المركز المالي...</div>;

  const totalAssets = Object.values(data.assets).reduce((s: any, v: any) => s + v, 0);
  const totalLiabilities = Object.values(data.liabilities).reduce((s: any, v: any) => s + v, 0);

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold font-display flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" /> قائمة المركز المالي (الميزانية)
        </h3>
        <p className="text-sm text-muted-foreground">كما في {new Date().toLocaleDateString('ar-EG')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Assets Section */}
        <div className="space-y-4">
          <h4 className="font-bold text-lg border-b pb-2 flex items-center gap-2 text-success">
            <Building2 className="w-5 h-5" /> الأصول (Assets)
          </h4>
          <div className="space-y-2">
            {[
              { label: 'النقدية بالصندوق', val: data.assets.cash, icon: Wallet },
              { label: 'النقدية بالبنك', val: data.assets.bank, icon: Building2 },
              { label: 'مخزون بضاعة (بالتكلفة)', val: data.assets.stockValue, icon: Package },
              { label: 'المدينون (حسابات العملاء)', val: data.assets.accountsReceivable, icon: Users },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center p-3 glass-card">
                <span className="flex items-center gap-2 text-sm"><item.icon className="w-4 h-4 text-muted-foreground" /> {item.label}</span>
                <span className="font-bold">{item.val.toLocaleString()} {currency}</span>
              </div>
            ))}
            <div className="flex justify-between items-center p-4 bg-success/10 border border-success/30 rounded-xl mt-4">
              <span className="font-bold">إجمالي الأصول</span>
              <span className="font-display font-bold text-xl text-success">{totalAssets.toLocaleString()} {currency}</span>
            </div>
          </div>
        </div>

        {/* Liabilities & Equity Section */}
        <div className="space-y-4">
          <h4 className="font-bold text-lg border-b pb-2 flex items-center gap-2 text-destructive">
            <Users className="w-5 h-5" /> الخصوم وحقوق الملكية
          </h4>
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground px-2 uppercase">الخصوم المتداولة</p>
            <div className="flex justify-between items-center p-3 glass-card">
              <span className="text-sm">الدائنون (حسابات الموردين)</span>
              <span className="font-bold">{data.liabilities.accountsPayable.toLocaleString()} {currency}</span>
            </div>

            <p className="text-xs font-bold text-muted-foreground px-2 uppercase mt-6">حقوق الملكية</p>
            <div className="flex justify-between items-center p-3 glass-card">
              <span className="text-sm">رأس المال / الأرباح المحتجزة</span>
              <span className="font-bold">{data.equity.capital.toLocaleString()} {currency}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-primary/10 border border-primary/30 rounded-xl mt-8">
              <span className="font-bold">إجمالي الخصوم وحقوق الملكية</span>
              <span className="font-display font-bold text-xl text-primary">{(totalLiabilities + data.equity.capital).toLocaleString()} {currency}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted rounded-xl text-center text-xs text-muted-foreground">
        * يتم تحديث هذه البيانات لحظياً بناءً على العمليات المسجلة في النظام.
      </div>
    </div>
  );
}
