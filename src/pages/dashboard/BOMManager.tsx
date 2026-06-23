import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Calculator, Package, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  restaurantId: string;
  currency: string;
}

export function BOMManager({ restaurantId, currency }: Props) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [recipe, setRecipe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [itemsRes, prodsRes] = await Promise.all([
      supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId),
      supabase.from('products').select('*').eq('restaurant_id', restaurantId)
    ]);
    setMenuItems(itemsRes.data || []);
    setProducts(prodsRes.data || []);
    setLoading(false);
  };

  const loadRecipe = async (itemId: string) => {
    const { data } = await supabase.from('recipes').select('*, products(*)').eq('menu_item_id', itemId);
    setRecipe(data || []);
  };

  useEffect(() => { loadData(); }, [restaurantId]);

  const addIngredient = async (prodId: string) => {
    if (!selectedItem) return;
    const { error } = await supabase.from('recipes').insert({
      restaurant_id: restaurantId,
      menu_item_id: selectedItem.id,
      ingredient_id: prodId,
      quantity: 1,
      unit: products.find(p => p.id === prodId)?.unit || 'جرام'
    });
    if (error) toast.error('موجود بالفعل أو حدث خطأ');
    else {
      toast.success('تمت الإضافة');
      loadRecipe(selectedItem.id);
    }
  };

  const updateIngredient = async (id: string, qty: number) => {
    await supabase.from('recipes').update({ quantity: qty }).eq('id', id);
    loadRecipe(selectedItem!.id);
  };

  const removeIngredient = async (id: string) => {
    await supabase.from('recipes').delete().eq('id', id);
    loadRecipe(selectedItem!.id);
  };

  const totalCost = recipe.reduce((s, r) => s + (Number(r.products?.cost_price || 0) * Number(r.quantity)), 0);

  if (loading) return <div className="p-10 text-center">جاري تحميل البيانات...</div>;

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">هندسة التكاليف والمكونات (BOM)</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Select Finished Product */}
        <div className="glass-card p-4 space-y-4">
          <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
            <Package className="w-4 h-4" /> 1. اختر المنتج النهائي
          </label>
          <div className="space-y-1 max-h-[400px] overflow-auto">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => { setSelectedItem(item); loadRecipe(item.id); }}
                className={`w-full p-3 rounded-xl text-right transition-all flex items-center gap-3 border-2 ${selectedItem?.id === item.id ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary/30 hover:bg-secondary/50'}`}>
                <span className="text-xl">{item.image}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.price} {currency}</p>
                </div>
                {selectedItem?.id === item.id && <ArrowRight className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Recipe Editor */}
        <div className="lg:col-span-2 space-y-4">
          {selectedItem ? (
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedItem.image}</span>
                  <div>
                    <h4 className="font-bold text-lg">{selectedItem.name}</h4>
                    <p className="text-sm text-muted-foreground">تحديد المكونات والتكاليف</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">التكلفة الإجمالية للمكونات</p>
                  <p className="text-2xl font-bold text-primary">{totalCost.toLocaleString()} {currency}</p>
                  <p className="text-[10px] text-success font-bold">صافي الربح المتوقع: {(selectedItem.price - totalCost).toLocaleString()} {currency}</p>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-3">
                {recipe.map(r => (
                  <div key={r.id} className="flex items-center gap-4 p-3 bg-secondary/20 rounded-xl">
                    <span className="text-xl">{r.products?.image}</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{r.products?.name}</p>
                      <p className="text-[10px] text-muted-foreground">تكلفة الوحدة: {r.products?.cost_price} {currency}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="number" step="0.001" value={r.quantity} onChange={e => updateIngredient(r.id, Number(e.target.value))} className="w-24 h-9 text-center font-bold" />
                      <span className="text-xs font-medium text-muted-foreground w-12">{r.unit || r.products?.unit}</span>
                    </div>
                    <div className="text-left w-24">
                      <p className="text-xs font-bold">{(r.quantity * (r.products?.cost_price || 0)).toFixed(2)}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeIngredient(r.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                {recipe.length === 0 && (
                  <div className="p-10 text-center border-2 border-dashed rounded-2xl text-muted-foreground">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    لم يتم إضافة مكونات لهذا الصنف بعد
                  </div>
                )}
              </div>

              {/* Add New Ingredient Selection */}
              <div className="pt-6 border-t">
                <label className="text-xs font-bold text-muted-foreground block mb-3">إضافة مادة خام (مكون)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {products.filter(p => !recipe.find(r => r.ingredient_id === p.id)).slice(0, 8).map(p => (
                    <button key={p.id} onClick={() => addIngredient(p.id)}
                      className="p-2 text-right bg-secondary/50 hover:bg-primary/10 border border-transparent hover:border-primary/30 rounded-lg transition-all">
                      <p className="text-[10px] font-bold truncate">{p.image} {p.name}</p>
                      <p className="text-[9px] text-muted-foreground">التكلفة: {p.cost_price}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-20 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Calculator className="w-16 h-16 mb-4 opacity-10" />
              <p>برجاء اختيار منتج من القائمة الجانبية لبدء هندسة التكاليف</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
