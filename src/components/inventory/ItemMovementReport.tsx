import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, Search, Calendar, ArrowUp, ArrowDown, 
  TrendingUp, TrendingDown, Filter, Download, Printer,
  User, Truck, FileText, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface MovementRecord {
  id: string;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reason: string;
  created_at: string;
  reference_type?: string;
  reference_number?: string;
  warehouse_name?: string;
  customer_name?: string;
  supplier_name?: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function ItemMovementReport({ restaurantId, currency }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'supplier'>('all');
  const [selectedActorId, setSelectedActorId] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadSuppliers();
  }, [restaurantId]);

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('id,name,unit').eq('restaurant_id', restaurantId);
    setProducts(data || []);
  };

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('id,name').eq('restaurant_id', restaurantId);
    setCustomers(data || []);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id,name').eq('restaurant_id', restaurantId);
    setSuppliers(data || []);
  };

  const loadMovements = async () => {
    if (!selectedProductId) {
      toast.error('اختر صنف أولاً');
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          warehouses!inner(name),
          customers!inner(name),
          suppliers!inner(name)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('product_id', selectedProductId)
        .order('created_at', { ascending: false });

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      const { data, error } = await query;

      if (error) throw error;

      const enrichedMovements = (data || []).map((m: any) => ({
        id: m.id,
        movement_type: m.type,
        quantity: m.quantity,
        unit_cost: 0, // Will be calculated if needed
        total_cost: 0,
        reason: m.reason,
        created_at: m.created_at,
        reference_type: m.reference_type,
        reference_number: m.reference_number,
        warehouse_name: m.warehouses?.name,
        customer_name: m.customers?.name,
        supplier_name: m.suppliers?.name,
      }));

      setMovements(enrichedMovements);
    } catch (e: any) {
      toast.error('فشل تحميل الحركات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'in': 'وارد',
      'out': 'صادر',
      'transfer_in': 'تحويل وارد',
      'transfer_out': 'تحويل صادر',
      'adjustment_in': 'تسوية زيادة',
      'adjustment_out': 'تسوية نقصان',
      'return_in': 'مرتج وارد',
      'return_out': 'مرتج صادر',
    };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type: string) => {
    if (type.includes('in') || type === 'in') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (type.includes('out') || type === 'out') return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  };

  const totalIn = movements.filter(m => m.movement_type === 'in' || m.movement_type.includes('in')).reduce((sum, m) => sum + m.quantity, 0);
  const totalOut = movements.filter(m => m.movement_type === 'out' || m.movement_type.includes('out')).reduce((sum, m) => sum + m.quantity, 0);
  const netMovement = totalIn - totalOut;

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            تقرير حركة صنف
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>اختر الصنف *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر صنف..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>من تاريخ</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>إلى تاريخ</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={loadMovements} className="w-full" disabled={loading}>
                {loading ? 'جاري التحميل...' : 'عرض التقرير'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProduct && movements.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الوارد</p>
                    <p className="text-2xl font-bold text-emerald-600">{totalIn.toLocaleString()} {selectedProduct.unit}</p>
                  </div>
                  <ArrowUp className="w-8 h-8 text-emerald-500/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الصادر</p>
                    <p className="text-2xl font-bold text-rose-600">{totalOut.toLocaleString()} {selectedProduct.unit}</p>
                  </div>
                  <ArrowDown className="w-8 h-8 text-rose-500/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">صافي الحركة</p>
                    <p className={`text-2xl font-bold ${netMovement >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {netMovement.toLocaleString()} {selectedProduct.unit}
                    </p>
                  </div>
                  {netMovement >= 0 ? <TrendingUp className="w-8 h-8 text-primary/20" /> : <TrendingDown className="w-8 h-8 text-destructive/20" />}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Movements Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">تفاصيل الحركات</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="w-4 h-4 ml-1" /> طباعة
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 ml-1" /> تصدير
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-right">التاريخ</th>
                      <th className="px-4 py-3 text-right">نوع الحركة</th>
                      <th className="px-4 py-3 text-right">الكمية</th>
                      <th className="px-4 py-3 text-right">السبب</th>
                      <th className="px-4 py-3 text-right">المخزن</th>
                      <th className="px-4 py-3 text-right">العميل/المورد</th>
                      <th className="px-4 py-3 text-right">المرجع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className="border-t">
                        <td className="px-4 py-3">
                          {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getMovementTypeColor(movement.movement_type)}>
                            {getMovementTypeLabel(movement.movement_type)}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 font-bold ${movement.movement_type.includes('in') ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {movement.quantity.toLocaleString()} {selectedProduct.unit}
                        </td>
                        <td className="px-4 py-3">{movement.reason || '-'}</td>
                        <td className="px-4 py-3">{movement.warehouse_name || '-'}</td>
                        <td className="px-4 py-3">
                          {movement.customer_name && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {movement.customer_name}
                            </div>
                          )}
                          {movement.supplier_name && (
                            <div className="flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              {movement.supplier_name}
                            </div>
                          )}
                          {!movement.customer_name && !movement.supplier_name && '-'}
                        </td>
                        <td className="px-4 py-3">
                          {movement.reference_number ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              {movement.reference_number}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedProduct && movements.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">لا توجد حركات مسجلة لهذا الصنف في الفترة المحددة</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
