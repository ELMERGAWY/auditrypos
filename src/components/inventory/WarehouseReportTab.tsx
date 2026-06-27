import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Warehouse, FileSpreadsheet, DollarSign, TrendingUp, Filter, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Warehouse {
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

interface WarehouseReportTabProps {
  products: Product[];
  warehouses: Warehouse[];
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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);

  // Filter products based on selected warehouse
  useEffect(() => {
    const filterProducts = async () => {
      if (selectedWarehouseId === 'all') {
        setFilteredProducts(products);
        return;
      }

      try {
        // Get sub-warehouses for the selected warehouse
        const { data: subWarehouses } = await supabase
          .from('sub_warehouses')
          .select('id')
          .eq('warehouse_id', selectedWarehouseId);

        if (!subWarehouses || subWarehouses.length === 0) {
          setFilteredProducts([]);
          return;
        }

        const subWarehouseIds = subWarehouses.map(sw => sw.id);

        // Get item assignments for these sub-warehouses
        const { data: assignments } = await supabase
          .from('item_warehouse_assignments')
          .select('item_id')
          .in('sub_warehouse_id', subWarehouseIds);

        if (!assignments || assignments.length === 0) {
          setFilteredProducts([]);
          return;
        }

        const itemIds = assignments.map(a => a.item_id);
        const filtered = products.filter(p => itemIds.includes(p.id));
        setFilteredProducts(filtered);
      } catch (error) {
        console.error('Error filtering products:', error);
        setFilteredProducts(products);
      }
    };

    filterProducts();
  }, [selectedWarehouseId, products, restaurantId]);

  // For now, we'll show all products in a per-warehouse report (since we don't have per-warehouse quantities yet)
  const chartData = warehouses.map((w) => {
    // For now, just use total quantity/value for each warehouse
    const totalQuantity = filteredProducts.reduce((sum, p) => sum + p.quantity, 0);
    const totalCostValue = filteredProducts.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);
    const totalSaleValue = filteredProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    return {
      name: w.name_ar || w.name,
      quantity: totalQuantity / warehouses.length,
      cost: totalCostValue / warehouses.length,
      sale: totalSaleValue / warehouses.length,
      profit: (totalSaleValue - totalCostValue) / warehouses.length
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Warehouse className="h-6 w-6" />
          تقارير المخازن
        </h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger className="w-[200px]">
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
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-[180px]"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              عدد المخازن
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              إجمالي الكمية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredProducts.reduce((sum, p) => sum + p.quantity, 0).toLocaleString('ar-EG')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              قيمة المخزون (تكلفة)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {filteredProducts.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0).toLocaleString('ar-EG')} {currency}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ربح المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {filteredProducts.reduce((sum, p) => sum + (p.quantity * (p.price - p.cost_price)), 0).toLocaleString('ar-EG')} {currency}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>الكمية لكل مخزن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="الكمية" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>القيمة والربح لكل مخزن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} name="التكلفة" />
                  <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="الربح" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products per Warehouse Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            تفاصيل الأصناف في المخزن
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الباركود</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>الوحدة</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>تكلفة الشراء</TableHead>
                <TableHead>سعر البيع</TableHead>
                <TableHead>قيمة التكلفة</TableHead>
                <TableHead>قيمة البيع</TableHead>
                <TableHead>الربح</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => {
                const costValue = p.quantity * p.cost_price;
                const saleValue = p.quantity * p.price;
                const profit = saleValue - costValue;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.barcode}</TableCell>
                    <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>{p.quantity.toLocaleString('ar-EG')}</TableCell>
                    <TableCell>{Number(p.cost_price).toLocaleString('ar-EG')} {currency}</TableCell>
                    <TableCell>{Number(p.price).toLocaleString('ar-EG')} {currency}</TableCell>
                    <TableCell>{costValue.toLocaleString('ar-EG')} {currency}</TableCell>
                    <TableCell>{saleValue.toLocaleString('ar-EG')} {currency}</TableCell>
                    <TableCell className={profit >= 0 ? 'text-success' : 'text-destructive'}>
                      {profit.toLocaleString('ar-EG')} {currency}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
