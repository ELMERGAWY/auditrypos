import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Package, ShoppingCart, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  min_quantity: number;
  price: number;
  cost_price?: number;
  category: string;
  unit: string;
  image?: string;
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
  const [ordering, setOrdering] = useState<string | null>(null);

  const lowStockProducts = products.filter(p => p.quantity <= p.min_quantity && p.quantity > 0);
  const outOfStockProducts = products.filter(p => p.quantity === 0);

  const createPurchaseOrder = async (product: Product) => {
    setOrdering(product.id);
    try {
      // Calculate suggested reorder quantity (e.g., 2× minimum or at least 10 units)
      const reorderQty = Math.max(product.min_quantity * 2, 10);

      // Insert a purchase order draft
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          restaurant_id: restaurantId,
          status: 'draft',
          notes: `أمر شراء تلقائي - مخزون منخفض للصنف: ${product.name}`,
          total_amount: reorderQty * Number(product.cost_price || product.price),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert line item
      await supabase.from('purchase_order_items').insert({
        purchase_order_id: poData.id,
        product_id: product.id,
        quantity: reorderQty,
        unit_price: Number(product.cost_price || product.price),
        total_price: reorderQty * Number(product.cost_price || product.price),
      });

      toast.success(`✅ تم إنشاء أمر شراء مسودة لـ ${product.name} (${reorderQty} ${product.unit})`);
    } catch (e: any) {
      // Fallback: if purchase_orders table doesn't exist, show actionable toast
      toast.info(`💡 صنف يحتاج إعادة طلب: ${product.name} — الكمية الحالية: ${product.quantity} ${product.unit}`, {
        description: `الحد الأدنى: ${product.min_quantity} ${product.unit}. يُقترح طلب ${Math.max(product.min_quantity * 2, 10)} ${product.unit}`,
        duration: 8000,
      });
    } finally {
      setOrdering(null);
    }
  };

  const orderAll = async () => {
    const allNeedOrder = [...lowStockProducts, ...outOfStockProducts];
    for (const p of allNeedOrder) {
      await createPurchaseOrder(p);
    }
    toast.success(`تم إنشاء ${allNeedOrder.length} أمر شراء`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          إعادة الطلب الذكي
        </h2>
        {(lowStockProducts.length + outOfStockProducts.length) > 0 && (
          <Button className="rounded-xl gap-2 gradient-bg text-white border-0" size="sm" onClick={orderAll}>
            <ShoppingCart className="w-4 h-4" />
            طلب الكل ({lowStockProducts.length + outOfStockProducts.length})
          </Button>
        )}
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span className="font-bold text-warning">{lowStockProducts.length}</span>
          <span className="text-muted-foreground">صنف مخزونه منخفض</span>
        </div>
        <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-destructive" />
          <span className="font-bold text-destructive">{outOfStockProducts.length}</span>
          <span className="text-muted-foreground">صنف نفذ من المخزن</span>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="rounded-2xl border-warning/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-warning">
              <AlertTriangle className="h-4 w-4" />
              منتجات تحتاج إعادة طلب ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-warning/5">
                    <TableHead className="text-right font-bold">الصنف</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">الكمية الحالية</TableHead>
                    <TableHead className="text-right">الحد الأدنى</TableHead>
                    <TableHead className="text-right">العجز</TableHead>
                    <TableHead className="text-right">سعر الشراء</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((p) => {
                    const deficit = p.min_quantity - p.quantity;
                    const suggestedQty = Math.max(p.min_quantity * 2, 10);
                    return (
                      <TableRow key={p.id} className="hover:bg-warning/5 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{p.image || '📦'}</span>
                            <div>
                              <p className="font-bold text-sm">{p.name}</p>
                              {p.barcode && <code className="text-[10px] text-muted-foreground">{p.barcode}</code>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                            {p.quantity} {p.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.min_quantity} {p.unit}</TableCell>
                        <TableCell className="text-destructive font-bold text-sm">- {deficit} {p.unit}</TableCell>
                        <TableCell className="text-sm">{Number(p.cost_price || p.price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="rounded-lg gap-1 text-xs h-7"
                            variant="outline"
                            onClick={() => createPurchaseOrder(p)}
                            disabled={ordering === p.id}
                          >
                            {ordering === p.id ? (
                              <span className="animate-spin">⟳</span>
                            ) : (
                              <ShoppingCart className="w-3 h-3" />
                            )}
                            طلب {suggestedQty} {p.unit}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {outOfStockProducts.length > 0 && (
        <Card className="rounded-2xl border-destructive/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              منتجات نفذت ({outOfStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-destructive/5">
                    <TableHead className="text-right font-bold">الصنف</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الحد الأدنى</TableHead>
                    <TableHead className="text-right">سعر الشراء</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outOfStockProducts.map((p) => {
                    const suggestedQty = Math.max(p.min_quantity * 2, 10);
                    return (
                      <TableRow key={p.id} className="hover:bg-destructive/5 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{p.image || '📦'}</span>
                            <div>
                              <p className="font-bold text-sm">{p.name}</p>
                              {p.barcode && <code className="text-[10px] text-muted-foreground">{p.barcode}</code>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                        <TableCell><Badge variant="destructive" className="text-xs">نفذت</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.min_quantity} {p.unit}</TableCell>
                        <TableCell className="text-sm">{Number(p.cost_price || p.price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="rounded-lg gap-1 text-xs h-7 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20"
                            variant="ghost"
                            onClick={() => createPurchaseOrder(p)}
                            disabled={ordering === p.id}
                          >
                            {ordering === p.id ? (
                              <span className="animate-spin">⟳</span>
                            ) : (
                              <ShoppingCart className="w-3 h-3" />
                            )}
                            طلب عاجل {suggestedQty} {p.unit}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {lowStockProducts.length === 0 && outOfStockProducts.length === 0 && (
        <Alert className="rounded-2xl border-success/30 bg-success/5">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success font-medium">
            مخزونك ممتاز! جميع الأصناف فوق الحد الأدنى المطلوب.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
