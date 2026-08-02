import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, Plus, Search, AlertTriangle, 
  Package, Truck, TrendingUp, Settings, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReorderingRule {
  id: string;
  product_id: string;
  product_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  min_quantity: number;
  max_quantity: number;
  quantity_multiple: number;
  supplier_id?: string;
  supplier_name?: string;
  lead_time_days: number;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  current_qty?: number;
}

interface Warehouse {
  id: string;
  name: string;
}

interface StockLocation {
  id: string;
  name: string;
  location_type: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function ReorderingRulesManager({ restaurantId, currency }: Props) {
  const [rules, setRules] = useState<ReorderingRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ReorderingRule | null>(null);

  const [form, setForm] = useState({
    product_id: '',
    warehouse_id: '',
    location_id: '',
    min_quantity: '',
    max_quantity: '',
    quantity_multiple: '1',
    supplier_id: '',
    lead_time_days: '7',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [rulesRes, productsRes, warehousesRes, locationsRes, suppliersRes] = await Promise.all([
        supabase
          .from('stock_reordering_rules')
          .select(`
            *,
            products(name, sku),
            warehouses(name),
            stock_locations(name)
          `)
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false }),
        supabase.from('products').select('id, name, sku').eq('restaurant_id', restaurantId),
        supabase.from('warehouses').select('id, name').eq('restaurant_id', restaurantId),
        supabase.from('stock_locations').select('id, name, location_type').eq('restaurant_id', restaurantId),
        supabase.from('suppliers').select('id, name').eq('restaurant_id', restaurantId)
      ]);

      const mappedRules = (rulesRes.data || []).map((rule: any) => ({
        ...rule,
        product_name: rule.products?.name,
        warehouse_name: rule.warehouses?.name,
        location_name: rule.stock_locations?.name,
      }));

      setRules(mappedRules);
      setProducts(productsRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setLocations(locationsRes.data || []);
      setSuppliers(suppliersRes.data || []);

      // Check for low stock products
      const { data: lowStock } = await supabase.rpc('check_reordering_rules', {
        p_restaurant_id: restaurantId
      });
      setLowStockProducts(lowStock || []);

    } catch (error: any) {
      toast.error('فشل تحميل البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [restaurantId]);

  const handleSave = async () => {
    if (!form.product_id || !form.min_quantity || !form.max_quantity) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        product_id: form.product_id,
        warehouse_id: form.warehouse_id || null,
        location_id: form.location_id || null,
        min_quantity: parseFloat(form.min_quantity),
        max_quantity: parseFloat(form.max_quantity),
        quantity_multiple: parseFloat(form.quantity_multiple) || 1,
        supplier_id: form.supplier_id || null,
        lead_time_days: parseInt(form.lead_time_days) || 7,
      };

      if (editing) {
        const { error } = await supabase.from('stock_reordering_rules').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('تم تحديث القاعدة بنجاح');
      } else {
        const { error } = await supabase.from('stock_reordering_rules').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة القاعدة بنجاح');
      }

      setShowForm(false);
      setEditing(null);
      resetForm();
      load();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rule: ReorderingRule) => {
    if (!confirm(`هل أنت متأكد من حذف هذه القاعدة؟`)) return;
    
    try {
      const { error } = await supabase.from('stock_reordering_rules').delete().eq('id', rule.id);
      if (error) throw error;
      toast.success('تم حذف القاعدة');
      load();
    } catch (error: any) {
      toast.error('فشل الحذف: ' + error.message);
    }
  };

  const toggleActive = async (rule: ReorderingRule) => {
    try {
      const { error } = await supabase.from('stock_reordering_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);
      if (error) throw error;
      toast.success(rule.is_active ? 'تم إلغاء تفعيل القاعدة' : 'تم تفعيل القاعدة');
      load();
    } catch (error: any) {
      toast.error('فشل التحديث: ' + error.message);
    }
  };

  const resetForm = () => {
    setForm({
      product_id: '',
      warehouse_id: '',
      location_id: '',
      min_quantity: '',
      max_quantity: '',
      quantity_multiple: '1',
      supplier_id: '',
      lead_time_days: '7',
    });
  };

  const filteredRules = rules.filter(rule =>
    rule.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    rule.warehouse_name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    lowStock: lowStockProducts.length,
  };

  const internalLocations = locations.filter(l => l.location_type === 'internal');

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-xl">
            <RefreshCw className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">قواعد إعادة الطلب</h1>
            <p className="text-muted-foreground">إدارة قواعد إعادة الطلب التلقائية</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-bg">
          <Plus className="w-4 h-4 ml-2" />
          إضافة قاعدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي القواعد</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">نشطة</p>
              <p className="text-xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-rose-500/10 border-rose-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <p className="text-xs text-muted-foreground">منخفض المخزون</p>
              <p className="text-xl font-bold">{stats.lowStock}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="p-4 bg-rose-500/10 border-rose-500/20">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-rose-400">منتجات منخفضة المخزون تحتاج إعادة طلب</h3>
          </div>
          <div className="space-y-2">
            {lowStockProducts.slice(0, 5).map((product: any) => (
              <div key={product.product_id} className="flex items-center justify-between text-sm p-2 bg-white/5 rounded">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>{product.product_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">الحالي: {product.current_qty}</span>
                  <span className="text-rose-400">الحد الأدنى: {product.min_qty}</span>
                  <Badge variant="outline" className="text-xs">
                    اقتراح: {product.suggested_qty}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث في القواعد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Rules List */}
      <div className="space-y-2">
        {filteredRules.map((rule) => (
          <Card key={rule.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rule.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {rule.is_active ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold">{rule.product_name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {rule.warehouse_name && <span>{rule.warehouse_name}</span>}
                    {rule.location_name && <span>• {rule.location_name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm">
                    <span className="text-muted-foreground">الحد الأدنى:</span>{' '}
                    <span className="font-bold">{rule.min_quantity}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">الحد الأقصى:</span>{' '}
                    <span className="font-bold">{rule.max_quantity}</span>
                  </p>
                </div>
                <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-xs">
                  {rule.is_active ? 'نشط' : 'غير نشط'}
                </Badge>
                <Button size="icon" variant="ghost" onClick={() => toggleActive(rule)}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(rule); setShowForm(true); }}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(rule)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
              {rule.supplier_name && <span>المورد: {rule.supplier_name}</span>}
              <span>وقت التوريد: {rule.lead_time_days} يوم</span>
              <span>المضاعف: {rule.quantity_multiple}</span>
            </div>
          </Card>
        ))}

        {filteredRules.length === 0 && (
          <div className="py-20 text-center border-dashed border rounded-xl">
            <RefreshCw className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">لا توجد قواعد مسجلة</p>
            <Button variant="link" onClick={() => setShowForm(true)} className="text-indigo-500">
              أضف قاعدة جديدة
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل القاعدة' : 'إضافة قاعدة جديدة'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المنتج *</Label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
              >
                <option value="">اختر المنتج...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.sku ? `(${product.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المخزن</Label>
                <select
                  value={form.warehouse_id}
                  onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <option value="">جميع المخازن</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>الموقع</Label>
                <select
                  value={form.location_id}
                  onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <option value="">جميع المواقع</option>
                  {internalLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الحد الأدنى *</Label>
                <Input
                  type="number"
                  value={form.min_quantity}
                  onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                  placeholder="الحد الأدنى"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>الحد الأقصى *</Label>
                <Input
                  type="number"
                  value={form.max_quantity}
                  onChange={(e) => setForm({ ...form, max_quantity: e.target.value })}
                  placeholder="الحد الأقصى"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المضاعف</Label>
                <Input
                  type="number"
                  value={form.quantity_multiple}
                  onChange={(e) => setForm({ ...form, quantity_multiple: e.target.value })}
                  placeholder="مضاعف الكمية"
                  min="1"
                  step="1"
                />
              </div>
              <div className="space-y-2">
                <Label>وقت التوريد (أيام)</Label>
                <Input
                  type="number"
                  value={form.lead_time_days}
                  onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
                  placeholder="أيام التوريد"
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>المورد المفضل</Label>
              <select
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
              >
                <option value="">بدون</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
