import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale, Calculator } from 'lucide-react';

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

interface WACTabProps {
  products: Product[];
  currency: string;
}

export function WACTab({ products, currency }: WACTabProps) {
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);
  const totalSellingValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  const totalProfit = totalSellingValue - totalInventoryValue;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-6 w-6" />
          المتوسط المرجح
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">عدد الأصناف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">تكلفة المخزون</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {totalInventoryValue.toLocaleString('ar-EG')} {currency}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">قيمة البيع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totalSellingValue.toLocaleString('ar-EG')} {currency}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الربح المتوقع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalProfit.toLocaleString('ar-EG')} {currency}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            قائمة الأصناف مع متوسط ​​التكلفة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الباركود</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>تكلفة الشراء</TableHead>
                <TableHead>سعر البيع</TableHead>
                <TableHead>التكلفة الكلية</TableHead>
                <TableHead>الربح للوحدة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.barcode}</TableCell>
                  <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                  <TableCell>{p.quantity} {p.unit}</TableCell>
                  <TableCell>{Number(p.cost_price).toLocaleString('ar-EG')} {currency}</TableCell>
                  <TableCell>{Number(p.price).toLocaleString('ar-EG')} {currency}</TableCell>
                  <TableCell>{(Number(p.quantity) * Number(p.cost_price)).toLocaleString('ar-EG')} {currency}</TableCell>
                  <TableCell className={Number(p.price) - Number(p.cost_price) >= 0 ? 'text-success' : 'text-destructive'}>
                    {(Number(p.price) - Number(p.cost_price)).toLocaleString('ar-EG')} {currency}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
