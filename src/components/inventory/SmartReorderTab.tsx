import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  min_quantity: number;
  price: number;
  category: string;
  unit: string;
}

interface SmartReorderTabProps {
  products: Product[];
  currency: string;
  restaurantId: string;
}

export function SmartReorderTab({ 
  products, 
  currency, 
  restaurantId 
}: SmartReorderTabProps) {
  const lowStockProducts = products.filter(p => p.quantity <= p.min_quantity && p.quantity > 0);
  const outOfStockProducts = products.filter(p => p.quantity === 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          إعادة الطلب الذكي
        </h2>
      </div>
      {lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            منتجات تحتاج إعادة طلب ({lowStockProducts.length}
          </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الباركود</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>الكمية الحالية</TableHead>
                <TableHead>الحد الأدنى</TableHead>
                <TableHead>السعر الشراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {p.name}
                  </TableCell>
                  <TableCell>{p.barcode}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-warning/20 text-warning">{p.quantity} {p.unit}</Badge></TableCell>
                  <TableCell>{p.min_quantity} {p.unit}</TableCell>
                  <TableCell>{Number(p.price).toLocaleString('ar-EG')} {currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}
      {outOfStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            منتجات نفذت ({outOfStockProducts.length}
          </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الباركود</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>الحد الأدنى</TableHead>
                <TableHead>سعر الشراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outOfStockProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {p.name}
                  </TableCell>
                  <TableCell>{p.barcode}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell><Badge variant="destructive">نفذت</Badge></TableCell>
                  <TableCell>{Number(p.price).toLocaleString('ar-EG')} {currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}
      {lowStockProducts.length === 0 && outOfStockProducts.length === 0 && (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            لا توجد منتجات تحتاج إعادة طلب! المخزون جيد!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
