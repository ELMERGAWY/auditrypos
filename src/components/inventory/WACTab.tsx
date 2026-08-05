import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale, Calculator, RefreshCw, TrendingUp, DollarSign, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  cost_price: number;
  price: number;
  category: string;
  unit: string;
  image?: string;
}

interface WACData {
  product_id: string;
  product_name: string;
  barcode: string;
  category: string;
  unit: string;
  image: string;
  current_qty: number;
  selling_price: number;
  wac_cost: number; // Weighted Average Cost from movements
  total_cost_value: number;
  total_sell_value: number;
  profit_per_unit: number;
  margin_pct: number;
}

interface WACTabProps {
  products: Product[];
  currency: string;
  restaurantId?: string;
}

export function WACTab({ products, currency, restaurantId }: WACTabProps) {
  const [wacData, setWacData] = useState<WACData[]>([]);
  const [loading, setLoading] = useState(false);

  const computeWAC = async () => {
    setLoading(true);
    try {
      // Fetch all IN movements (type='in') with unit cost to compute WAC per product
      let movementsQuery = supabase
        .from('stock_movements')
        .select('product_id, quantity, unit_cost, type')
        .eq('type', 'in');

      if (restaurantId) {
        movementsQuery = movementsQuery.eq('restaurant_id', restaurantId);
      }

      const { data: movements } = await movementsQuery;

      const data: WACData[] = products.map(p => {
        // Only look at receipt (in) movements with a unit_cost
        const inMoves = (movements || []).filter(
          m => m.product_id === p.id && Number(m.quantity) > 0
        );

        let wac_cost = p.cost_price; // fallback to stored cost
        if (inMoves.length > 0) {
          const totalValue = inMoves.reduce(
            (sum, m) => sum + Number(m.quantity) * Number(m.unit_cost || p.cost_price),
            0
          );
          const totalQty = inMoves.reduce((sum, m) => sum + Number(m.quantity), 0);
          if (totalQty > 0) wac_cost = totalValue / totalQty;
        }

        const total_cost_value = wac_cost * p.quantity;
        const total_sell_value = p.price * p.quantity;
        const profit_per_unit = p.price - wac_cost;
        const margin_pct = p.price > 0 ? (profit_per_unit / p.price) * 100 : 0;

        return {
          product_id: p.id,
          product_name: p.name,
          barcode: p.barcode,
          category: p.category,
          unit: p.unit,
          image: p.image || '📦',
          current_qty: p.quantity,
          selling_price: p.price,
          wac_cost,
          total_cost_value,
          total_sell_value,
          profit_per_unit,
          margin_pct,
        };
      });

      setWacData(data);
    } catch (e: any) {
      toast.error('فشل حساب المتوسط المرجح: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    computeWAC();
  }, [products]);

  const totalInventoryCost = wacData.reduce((s, d) => s + d.total_cost_value, 0);
  const totalSellingValue = wacData.reduce((s, d) => s + d.total_sell_value, 0);
  const totalProfit = totalSellingValue - totalInventoryCost;
  const avgMargin = wacData.length > 0
    ? wacData.reduce((s, d) => s + d.margin_pct, 0) / wacData.length
    : 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          حساب المتوسط المرجح WAC
        </h2>
        <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={computeWAC} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'جاري الحساب...' : 'إعادة الحساب'}
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'عدد الأصناف', value: wacData.length, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'تكلفة المخزون (WAC)', value: `${totalInventoryCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${currency}`, icon: Calculator, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'قيمة البيع المتوقعة', value: `${totalSellingValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${currency}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
          { label: 'هامش الربح الإجمالي', value: `${avgMargin.toFixed(1)}%`, icon: TrendingUp, color: totalProfit >= 0 ? 'text-success' : 'text-destructive', bg: totalProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3 rounded-2xl">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* WAC Table */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 font-bold">
            <Calculator className="h-4 w-4 text-primary" />
            جدول المتوسط المرجح لكل صنف
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className="text-right font-bold">الصنف</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">تكلفة WAC</TableHead>
                  <TableHead className="text-right">سعر البيع</TableHead>
                  <TableHead className="text-right">تكلفة المخزون</TableHead>
                  <TableHead className="text-right">ربح/وحدة</TableHead>
                  <TableHead className="text-right">هامش %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wacData.map((d) => (
                  <TableRow key={d.product_id} className="hover:bg-secondary/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{d.image}</span>
                        <div>
                          <p className="font-medium text-sm">{d.product_name}</p>
                          {d.barcode && <code className="text-[10px] text-muted-foreground">{d.barcode}</code>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{d.category}</Badge></TableCell>
                    <TableCell className="font-bold">{d.current_qty} {d.unit}</TableCell>
                    <TableCell className="text-accent font-bold">{Number(d.wac_cost).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</TableCell>
                    <TableCell className="text-primary font-bold">{Number(d.selling_price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</TableCell>
                    <TableCell>{Number(d.total_cost_value).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</TableCell>
                    <TableCell className={d.profit_per_unit >= 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
                      {Number(d.profit_per_unit).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${d.margin_pct >= 20 ? 'bg-success/20 text-success' : d.margin_pct >= 10 ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'}`}>
                        {d.margin_pct.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {wacData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      لا توجد بيانات أصناف لعرضها
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
