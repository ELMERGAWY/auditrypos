// @ts-nocheck
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Warehouse, FileSpreadsheet, DollarSign, TrendingUp, Filter, Package, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WarehouseType {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  cost_price: number;
  price: number;
  category: string;
  unit: string;
}

interface WarehouseStock {
  warehouse_id: string;
  product_id: string;
  quantity: number;
}

interface WarehouseReportTabProps {
  products: Product[];
  warehouses: WarehouseType[];
  currency: string;
  restaurantId: string;
}

export function WarehouseReportTab({
  products,
  warehouses,
  currency,
  restaurantId
}: WarehouseReportTabProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWarehouseStocks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_stock')
        .select('warehouse_id, product_id, quantity')
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
      setWarehouseStocks(data || []);
    } catch (e: any) {
      toast.error('فشل تحميل بيانات المخازن: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouseStocks();
  }, [restaurantId]);

  // Build per-warehouse product list based on real warehouse_stock records
  const getWarehouseProducts = (warehouseId: string) => {
    if (warehouseId === 'all') {
      // Show all products with their total quantities
      return products.map(p => {
        const stocks = warehouseStocks.filter(s => s.product_id === p.id);
        const qty = stocks.length > 0
          ? stocks.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
          : p.quantity;
        return { ...p, quantity: qty };
      });
    }
    // Filter only products that have stock in the selected warehouse
    const stocksForWh = warehouseStocks.filter(s => s.warehouse_id === warehouseId);
    return stocksForWh.map(s => {
      const product = products.find(p => p.id === s.product_id);
      if (!product) return null;
      return { ...product, quantity: Number(s.quantity || 0) };
    }).filter(Boolean);
  };

  const filteredProducts = getWarehouseProducts(selectedWarehouseId);

  // Per-warehouse chart data — use real warehouse_stock
  const chartData = warehouses.map(w => {
    const stocks = warehouseStocks.filter(s => s.warehouse_id === w.id);
    const totalQty = stocks.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    let totalCost = 0;
    let totalSale = 0;
    stocks.forEach(s => {
      const p = products.find(pr => pr.id === s.product_id);
      if (p) {
        const qty = Number(s.quantity || 0);
        totalCost += qty * Number(p.cost_price || 0);
        totalSale += qty * Number(p.price || 0);
      }
    });
    return {
      name: w.name_ar || w.name,
      quantity: totalQty,
      cost: totalCost,
      sale: totalSale,
      profit: totalSale - totalCost,
    };
  });

  const totalQty = filteredProducts.reduce((s, p) => s + p.quantity, 0);
  const totalCostVal = filteredProducts.reduce((s, p) => s + p.quantity * p.cost_price, 0);
  const totalSaleVal = filteredProducts.reduce((s, p) => s + p.quantity * p.price, 0);
  const totalProfit = totalSaleVal - totalCostVal;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-primary" />
          تقارير المخازن
        </h2>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger className="w-[200px] rounded-xl">
                <SelectValue placeholder="اختر المخزن" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المخازن</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name_ar || w.name} ({w.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-[180px] rounded-xl"
            />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={loadWarehouseStocks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'عدد المخازن', value: warehouses.length, icon: Warehouse, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'إجمالي الكميات', value: totalQty.toLocaleString('ar-EG'), icon: Package, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'قيمة المخزون (تكلفة)', value: `${totalCostVal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${currency}`, icon: DollarSign, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'ربح المخزون المتوقع', value: `${totalProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${currency}`, icon: TrendingUp, color: totalProfit >= 0 ? 'text-success' : 'text-destructive', bg: totalProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10' },
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

      {/* Charts — only shown when multiple warehouses exist */}
      {warehouses.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm font-bold">الكمية الفعلية لكل مخزن</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="الكمية" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm font-bold">التكلفة والربح لكل مخزن</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} name="التكلفة" />
                    <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="الربح" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Table */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            تفاصيل الأصناف
            {selectedWarehouseId !== 'all' && (
              <Badge variant="outline" className="text-xs mr-2">
                {warehouses.find(w => w.id === selectedWarehouseId)?.name_ar || warehouses.find(w => w.id === selectedWarehouseId)?.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className="text-right font-bold">الصنف</TableHead>
                  <TableHead className="text-right">الباركود</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">الوحدة</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">تكلفة/وحدة</TableHead>
                  <TableHead className="text-right">سعر البيع</TableHead>
                  <TableHead className="text-right">قيمة التكلفة</TableHead>
                  <TableHead className="text-right">قيمة البيع</TableHead>
                  <TableHead className="text-right">الربح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const costValue = p.quantity * p.cost_price;
                  const saleValue = p.quantity * p.price;
                  const profit = saleValue - costValue;
                  return (
                    <TableRow key={p.id} className="hover:bg-secondary/20 transition-colors">
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><code className="text-xs text-muted-foreground">{p.barcode || '—'}</code></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                      <TableCell>{p.unit}</TableCell>
                      <TableCell className="font-bold">{p.quantity.toLocaleString('ar-EG')}</TableCell>
                      <TableCell>{Number(p.cost_price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</TableCell>
                      <TableCell className="text-primary">{Number(p.price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</TableCell>
                      <TableCell className="text-accent">{costValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</TableCell>
                      <TableCell>{saleValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</TableCell>
                      <TableCell className={profit >= 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
                        {profit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      لا توجد أصناف في هذا المخزن
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
