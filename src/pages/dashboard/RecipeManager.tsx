import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calculator, Package, ChefHat, TrendingUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  unit: string;
  cost_price: number;
}

interface RecipeComponent {
  id?: string;
  product_id: string;
  quantity_required: number;
  unit_label: string;
  product?: Product;
}

interface Props {
  menuItemId: string;
  menuItemName: string;
  sellingPrice: number;
  restaurantId: string;
  currency: string;
  onClose: () => void;
}

export function RecipeManager({ menuItemId, menuItemName, sellingPrice, restaurantId, currency, onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [components, setComponents] = useState<RecipeComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load products and existing components
  useEffect(() => {
    loadData();
  }, [menuItemId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load products from inventory
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit, cost_price')
        .eq('restaurant_id', restaurantId)
        .eq('available', true)
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Load existing components
      const { data: componentsData, error: componentsError } = await supabase
        .from('menu_item_components')
        .select('*, product:products(id, name, unit, cost_price)')
        .eq('menu_item_id', menuItemId);

      if (componentsError) throw componentsError;
      
      if (componentsData) {
        setComponents(componentsData.map(c => ({
          id: c.id,
          product_id: c.product_id,
          quantity_required: c.quantity_required,
          unit_label: c.unit_label,
          product: c.product
        })));
      }
    } catch (error: any) {
      toast.error('فشل تحميل البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addComponent = () => {
    setComponents(prev => [...prev, { product_id: '', quantity_required: 1, unit_label: '' }]);
  };

  const removeComponent = (index: number) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof RecipeComponent, value: any) => {
    setComponents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-set unit label when product changes
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated[index].unit_label = product.unit;
          updated[index].product = product;
        }
      }
      
      return updated;
    });
  };

  const calculateTotalCost = () => {
    return components.reduce((sum, comp) => {
      const cost = (comp.product?.cost_price || 0) * comp.quantity_required;
      return sum + cost;
    }, 0);
  };

  const calculateProfit = () => {
    const totalCost = calculateTotalCost();
    return sellingPrice - totalCost;
  };

  const calculateProfitMargin = () => {
    const totalCost = calculateTotalCost();
    if (totalCost === 0) return 0;
    return ((sellingPrice - totalCost) / sellingPrice) * 100;
  };

  const saveRecipe = async () => {
    try {
      setSaving(true);

      // Validate components
      const validComponents = components.filter(c => c.product_id && c.quantity_required > 0);
      if (validComponents.length === 0) {
        toast.error('يرجى إضافة مكون واحد على الأقل');
        return;
      }

      // Delete existing components
      await supabase
        .from('menu_item_components')
        .delete()
        .eq('menu_item_id', menuItemId);

      // Insert new components
      const componentsToInsert = validComponents.map(comp => ({
        menu_item_id: menuItemId,
        product_id: comp.product_id,
        quantity_required: comp.quantity_required,
        unit_label: comp.unit_label || comp.product?.unit || 'unit'
      }));

      const { error } = await supabase
        .from('menu_item_components')
        .insert(componentsToInsert);

      if (error) throw error;

      toast.success('✅ تم حفظ تكلفة الوصفة بنجاح');
      onClose();
    } catch (error: any) {
      toast.error('فشل حفظ الوصفة: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const totalCost = calculateTotalCost();
  const profit = calculateProfit();
  const profitMargin = calculateProfitMargin();

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
        <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center">
          <ChefHat className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold">تكلفة الوصفة</h2>
          <p className="text-sm text-muted-foreground">{menuItemName}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-primary/5 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">تكلفة التصنيع</p>
          <p className="text-lg font-bold text-primary">{totalCost.toFixed(2)} {currency}</p>
        </div>
        <div className="bg-green-500/10 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">الربح المتوقع</p>
          <p className="text-lg font-bold text-green-600">{profit.toFixed(2)} {currency}</p>
        </div>
        <div className={`rounded-lg p-3 ${profitMargin >= 30 ? 'bg-green-500/10' : profitMargin >= 15 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
          <p className="text-xs text-muted-foreground mb-1">هامش الربح</p>
          <p className={`text-lg font-bold ${profitMargin >= 30 ? 'text-green-600' : profitMargin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
            {profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Components List */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            مكونات الوصفة
          </Label>
          <Button type="button" size="sm" variant="outline" onClick={addComponent}>
            <Plus className="w-4 h-4 ml-1" />
            إضافة مكون
          </Button>
        </div>

        <AnimatePresence>
          {components.map((comp, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-2 items-start bg-background/50 rounded-lg p-3"
            >
              {/* Product Select */}
              <div className="flex-1">
                <select
                  value={comp.product_id}
                  onChange={(e) => updateComponent(index, 'product_id', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">اختر المنتج...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.cost_price.toFixed(2)} {currency}/{product.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="w-28">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={comp.quantity_required}
                  onChange={(e) => updateComponent(index, 'quantity_required', parseFloat(e.target.value) || 0)}
                  placeholder="الكمية"
                  className="h-9"
                />
              </div>

              {/* Unit */}
              <div className="w-20 text-sm text-muted-foreground pt-2">
                {comp.unit_label || comp.product?.unit || '-'}
              </div>

              {/* Cost */}
              <div className="w-24 text-sm font-medium pt-2">
                {((comp.product?.cost_price || 0) * comp.quantity_required).toFixed(2)} {currency}
              </div>

              {/* Remove */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive h-9 w-9"
                onClick={() => removeComponent(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {components.length === 0 && (
          <div className="text-center py-8 text-muted-foreground bg-background/50 rounded-lg border border-dashed">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لم تتم إضافة مكونات بعد</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addComponent}>
              <Plus className="w-4 h-4 ml-1" />
              إضافة مكون
            </Button>
          </div>
        )}
      </div>

      {/* Pricing Analysis */}
      {components.length > 0 && (
        <div className="bg-primary/5 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-medium">تحليل التسعير</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">سعر البيع:</span>
              <span className="font-medium">{sellingPrice.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">تكلفة المواد:</span>
              <span className="font-medium text-primary">{totalCost.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">الربح الصافي:</span>
              <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profit.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">نسبة الربح:</span>
              <Badge className={profitMargin >= 30 ? 'bg-green-500' : profitMargin >= 15 ? 'bg-yellow-500' : 'bg-red-500'}>
                {profitMargin.toFixed(1)}%
              </Badge>
            </div>
            {profitMargin < 20 && (
              <p className="text-xs text-yellow-600 mt-2">
                ⚠️ هامش الربح منخفض. يُنصح بزيادة السعر أو تقليل التكلفة.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button 
          type="button" 
          onClick={saveRecipe}
          disabled={saving || components.length === 0}
          className="gradient-bg"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 ml-2" />
              حفظ الوصفة
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
