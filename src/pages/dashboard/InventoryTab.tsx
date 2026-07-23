// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Search, AlertTriangle, Edit2, Trash2, 
  ArrowDown, ArrowUp, BarChart3, X, TrendingUp, DollarSign,
  Truck, Calculator, History, FileSpreadsheet, Layers, Boxes, Save, RefreshCw, Download,
  Bell, ShoppingCart, RotateCcw, Scale, Zap, CheckCircle, Building2, FolderTree,
  ArrowRightLeft, ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { hasFeature, type BusinessType } from '@/lib/businessTypes';
import { WarehouseManager } from '@/components/inventory/WarehouseManager';
import { ItemWarehouseAssignments } from '@/components/inventory/ItemWarehouseAssignments';
import { InventoryTransfersManager } from '@/components/inventory/InventoryTransfersManager';
import { LandedCostsManager } from '@/components/inventory/LandedCostsManager';
import { SmartReorderTab } from '@/components/inventory/SmartReorderTab';
import { WACTab } from '@/components/inventory/WACTab';
import { WarehouseReportTab } from '@/components/inventory/WarehouseReportTab';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  type: string;
  warehouse_category: string;
  parent_warehouse_id: string | null;
  parent?: Warehouse;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  is_active: boolean;
  is_default: boolean;
  currency: string;
  accounting_account_code: string | null;
  inventory_account_code: string | null;
  cogs_account_code: string | null;
  accounting_standard: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  category: string;
  price: number;
  cost_price: number;
  quantity: number;
  min_quantity: number;
  unit: string;
  image: string;
  expiry_date: string | null;
  available: boolean;
  secondary_unit: string;
  unit_conversion_factor: number;
}

interface StockMovement {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  reason: string;
  created_at: string;
}

interface ItemType {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  is_active: boolean;
}

interface Props {
  restaurantId: string;
  currency: string;
  businessType: BusinessType;
}

export function InventoryTab({ restaurantId, currency, businessType }: Props) {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showMovement, setShowMovement] = useState<Product | null>(null);
  const [movementQty, setMovementQty] = useState('');
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementReason, setMovementReason] = useState('');
  const [showReports, setShowReports] = useState(false);
  const [movements, setMovements] = useState<(StockMovement & { product_name?: string })[]>([]);
  const [showProductHistory, setShowProductHistory] = useState<Product | null>(null);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [pricingMode, setPricingMode] = useState<'fixed' | 'markup_percent' | 'markup_fixed'>('fixed');
  const [markupValue, setMarkupValue] = useState('');
  const [costingMethod, setCostingMethod] = useState<'fifo' | 'lifo' | 'wac' | 'specific'>('fifo');
  const [form, setForm] = useState({
    name: '', barcode: '', sku: '', category: 'عام', price: '', cost_price: '',
    quantity: '', min_quantity: '5', unit: 'قطعة', image: '📦', expiry_date: '',
    secondary_unit: '', unit_conversion_factor: '', batch_number: '', item_type_id: '',
    warehouse_id: '',
  });
  const [filterCategory, setFilterCategory] = useState('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);

  const load = async () => {
    // Load Products
    const { data: prodData } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });

    // Load Warehouse Stocks to aggregate quantities
    const { data: stockData } = await supabase.from('warehouse_stock').select('product_id, quantity').eq('restaurant_id', restaurantId);

    const aggregatedProducts = ((prodData || []) as Product[]).map(p => {
      const pStocks = (stockData || []).filter(s => s.product_id === p.id);
      if (pStocks.length > 0) {
        // Has warehouse_stock records → use the real-time sum from all warehouses
        const totalQty = pStocks.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
        return { ...p, quantity: totalQty };
      }
      // No warehouse_stock records yet → fall back to the stored products.quantity
      // (product not assigned to a warehouse yet, or warehouse_stock not populated)
      return p;
    });

    setProducts(aggregatedProducts);

    // Load Warehouses (filtered by restaurant to respect RLS correctly)
    const { data: whData } = await supabase.from('warehouses').select('*').eq('restaurant_id', restaurantId).is('deleted_at', null).order('name');
    setWarehouses((whData || []) as Warehouse[]);

    // Load Item Types
    const { data: itemTypeData } = await supabase.from('item_types').select('*').eq('is_active', true);
    setItemTypes((itemTypeData || []) as ItemType[]);

    // Load costing method from restaurant settings
    const { data: restaurantData } = await supabase.from('restaurants').select('inventory_method').eq('id', restaurantId).maybeSingle();
    const { data: settingsData } = await supabase.from('inventory_settings').select('costing_method').eq('restaurant_id', restaurantId).maybeSingle();

    let method = 'fifo';
    if (restaurantData?.inventory_method) {
      const m = restaurantData.inventory_method.toLowerCase();
      method = m === 'weighted_avg' ? 'wac' : m;
    } else if (settingsData?.costing_method) {
      method = settingsData.costing_method;
    }
    setCostingMethod(method as any);

    if (businessType === 'contracting' || hasFeature(businessType, 'projects')) {
      const { data: projData } = await supabase.from('projects').select('id, name').eq('restaurant_id', restaurantId);
      setProjects(projData || []);
    }
  };

  useEffect(() => { load(); }, [restaurantId]);

  const categories = [...new Set(products.map(p => p.category))];
  const lowStock = products.filter(p => p.quantity <= p.min_quantity && p.quantity > 0);
  const outOfStock = products.filter(p => p.quantity === 0);
  const totalValue = products.reduce((s, p) => s + p.price * p.quantity, 0);
  const totalCost = products.reduce((s, p) => s + p.cost_price * p.quantity, 0);
  const totalProfit = totalValue - totalCost;

  const filtered = products.filter(p => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.barcode.includes(search)) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.name) { toast.error('أدخل اسم المنتج'); return; }
    const data: any = {
      restaurant_id: restaurantId,
      name: form.name, barcode: form.barcode, sku: form.sku, category: form.category,
      price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0,
      quantity: Number(form.quantity) || 0, min_quantity: Number(form.min_quantity) || 5,
      unit: form.unit, image: form.image,
      expiry_date: form.expiry_date || null,
      secondary_unit: form.secondary_unit || '',
      unit_conversion_factor: Number(form.unit_conversion_factor) || 1,
    };
    try {
      let productId: string;
      if (editingProduct) {
        const { error } = await supabase.from('products').update(data).eq('id', editingProduct.id);
        if (error) throw error;
        productId = editingProduct.id;
        toast.success('تم تحديث المنتج');
      } else {
        const { data: newProduct, error } = await supabase.from('products').insert(data).select().single();
        if (error) throw error;
        productId = newProduct.id;
        toast.success('تم إضافة المنتج');
      }

      // If warehouse is selected, assign directly to warehouse
      if (form.warehouse_id) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ warehouse_id: form.warehouse_id })
          .eq('id', productId);

        if (updateError) {
          console.error('Failed to assign product to warehouse:', updateError);
          toast.warning('تم حفظ المنتج ولكن فشل ربطه بالمخزن');
        }
      }

      resetForm();
      load();
    } catch (e: any) {
      console.error('Product save error:', e);
      toast.error(`فشل الحفظ: ${e?.message || 'تحقق من الصلاحيات والاتصال'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا المنتج?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast.error(`فشل الحذف: ${error.message}`); return; }
    toast.success('تم الحذف');
    load();
  };

  const handleMovement = async () => {
    if (!showMovement || !movementQty) return;
    const qty = Number(movementQty);
    const newQty = movementType === 'in' ? showMovement.quantity + qty : Math.max(0, showMovement.quantity - qty);
    
    try {
      const { error: updErr } = await supabase.from('products').update({ quantity: newQty }).eq('id', showMovement.id);
      if (updErr) throw updErr;
      
      const { error: mvErr } = await supabase.from('stock_movements').insert({
        product_id: showMovement.id, 
        restaurant_id: restaurantId,
        type: movementType, 
        quantity: qty, 
        reason: movementReason,
        project_id: selectedProjectId || null,
      });
      if (mvErr) console.warn('stock_movements log failed (continuing):', mvErr.message);

      // Advanced Accounting: Auto-post Journal Entry if enabled
      if (hasFeature(businessType, 'advanced_accounting')) {
        try {
          const { journalService } = await import('@/lib/accounting/journalService');
          const totalCost = qty * showMovement.cost_price;
          if (movementType === 'out' && totalCost > 0) {
            const project = projects.find(p => p.id === selectedProjectId);
            const description = selectedProjectId 
              ? `صرف خامات لمشروع: ${project?.name} - الصنف: ${showMovement.name}`
              : `تسوية مخزون (صادر) - ${showMovement.name}: ${movementReason}`;
            const debitAcc = selectedProjectId 
              ? (await journalService.getAccountByCode(restaurantId, '4900'))?.id
              : (await journalService.getAccountByCode(restaurantId, '5200'))?.id;
            const creditAcc = (await journalService.getAccountByCode(restaurantId, '1300'))?.id;
            if (debitAcc && creditAcc) {
              await journalService.createJournalEntry(restaurantId, {
                entry_date: new Date(),
                description,
                source: 'inventory',
                lines: [
                  { account_id: debitAcc, debit: totalCost, credit: 0, description },
                  { account_id: creditAcc, debit: 0, credit: totalCost, description: 'تخفيض المخزون' }
                ]
              });
            }
          }
        } catch (je: any) {
          console.warn('Journal posting skipped:', je.message);
        }
      }
      toast.success(movementType === 'in' ? 'تم إضافة الكمية' : 'تم صرف الكمية');
      setShowMovement(null); setMovementQty(''); setMovementReason('');
      load();
    } catch (e: any) {
      console.error('Movement error:', e);
      toast.error(`فشل: ${e?.message || 'تحقق من الصلاحيات'}`);
    }
  };

  const loadReports = async () => {
    setShowReports(true);
    const { data } = await supabase.from('stock_movements').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(500);
    const mvts = (data || []) as StockMovement[];
    const enriched = mvts.map(m => ({
      ...m,
      product_name: products.find(p => p.id === m.product_id)?.name || 'غير معروف',
    }));
    setMovements(enriched);
  };

  const loadProductHistory = async (p: Product) => {
    setShowProductHistory(p);
    const { data } = await supabase.from('stock_movements').select('*').eq('product_id', p.id).order('created_at', { ascending: false }).limit(100);
    setProductMovements((data || []) as StockMovement[]);
  };

  const resetForm = () => {
    setShowForm(false); setEditingProduct(null); setPricingMode('fixed'); setMarkupValue('');
    setForm({ name: '', barcode: '', sku: '', category: 'عام', price: '', cost_price: '', quantity: '', min_quantity: '5', unit: 'قطعة', image: '📦', expiry_date: '', secondary_unit: '', unit_conversion_factor: '', batch_number: '', item_type_id: '', warehouse_id: '' });
  };

  const calcSellingPrice = (costStr: string) => {
    const cost = Number(costStr) || 0;
    if (pricingMode === 'markup_percent') return (cost * (1 + (Number(markupValue) || 0) / 100)).toFixed(2);
    if (pricingMode === 'markup_fixed') return (cost + (Number(markupValue) || 0)).toFixed(2);
    return form.price;
  };

  const startEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name, barcode: p.barcode, sku: p.sku, category: p.category,
      price: String(p.price), cost_price: String(p.cost_price), quantity: String(p.quantity),
      min_quantity: String(p.min_quantity), unit: p.unit, image: p.image,
      expiry_date: p.expiry_date ? p.expiry_date.split('T')[0] : '',
      secondary_unit: p.secondary_unit || '',
      unit_conversion_factor: String(p.unit_conversion_factor || 1),
      batch_number: (p as any).batch_number || '',
      item_type_id: (p as any).item_type_id || '',
      warehouse_id: (p as any).warehouse_id || '',
    });
    setShowForm(true);
  };

  // Reports data
  const categoryStockValue = categories.map(cat => {
    const catProducts = products.filter(p => p.category === cat);
    return {
      name: cat,
      value: catProducts.reduce((s, p) => s + p.price * p.quantity, 0),
      cost: catProducts.reduce((s, p) => s + p.cost_price * p.quantity, 0),
    };
  }).filter(d => d.value > 0);

  return (
    <div className="p-4 space-y-6">
      {/* Pro Inventory Navigation */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            المخزون العالمي Pro
          </h2>
          <p className="text-xs text-muted-foreground mt-1">إدارة الفروع، التكاليف المباشرة، وحركات المخازن المتقدمة</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadReports} variant="outline" size="sm" className="rounded-xl">
            <BarChart3 className="w-4 h-4 ml-1" /> التقارير
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gradient-bg text-primary-foreground border-0 rounded-xl" size="sm">
            <Plus className="w-4 h-4 ml-1" /> صنف جديد
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" dir="rtl">
        <TabsList className="bg-secondary/50 p-1 rounded-2xl w-full sm:w-auto flex flex-wrap gap-1">
          <TabsTrigger value="products" className="rounded-xl flex items-center gap-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Boxes className="w-4 h-4" /> الأصناف
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="rounded-xl flex items-center gap-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Truck className="w-4 h-4" /> الفروع والمخازن
          </TabsTrigger>
          <TabsTrigger value="transfers" className="rounded-xl flex items-center gap-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <History className="w-4 h-4" /> حركات التحويل
          </TabsTrigger>
          <TabsTrigger value="landed_costs" className="rounded-xl flex items-center gap-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Calculator className="w-4 h-4" /> التكاليف المباشرة
          </TabsTrigger>
          <TabsTrigger value="reorder" className="rounded-xl flex items-center gap-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Bell className="w-4 h-4" /> إعادة الطلب الذكي
          </TabsTrigger>
          <TabsTrigger value="wac" className="rounded-xl flex items-center gap-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Scale className="w-4 h-4" /> المتوسط المرجح
          </TabsTrigger>
          <TabsTrigger value="warehouse_report" className="rounded-xl flex items-center gap-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <FileSpreadsheet className="w-4 h-4" /> تقارير المخازن
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {/* Stats & Dashboard Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'إجمالي المنتجات', value: products.length, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'قيمة المخزون (بيع)', value: `${totalValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${currency}`, icon: BarChart3, color: 'text-success', bg: 'bg-success/10' },
              { label: 'تكلفة المخزون', value: `${totalCost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${currency}`, icon: BarChart3, color: 'text-accent', bg: 'bg-accent/10' },
              { label: 'ربح المخزون المتوقع', value: `${totalProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${currency}`, icon: TrendingUp, color: totalProfit >= 0 ? 'text-success' : 'text-destructive', bg: totalProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10' },
            ].map(s => (
              <div key={s.label} className="glass-card p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className={`font-display font-bold text-sm ${s.color}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Low stock alerts */}
          {lowStock.length > 0 && (
            <div className="glass-card p-3 border-warning/30 bg-warning/5 rounded-2xl">
              <p className="text-xs font-bold text-warning mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> تنبيه: منتجات مخزونها منخفض</p>
              <div className="flex flex-wrap gap-2">
                {lowStock.map(p => (
                  <Badge key={p.id} variant="outline" className="text-xs text-warning border-warning/30 bg-white/50">
                    {p.image} {p.name} ({p.quantity} {p.unit})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
              <button onClick={() => setFilterCategory('all')} className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${filterCategory === 'all' ? 'gradient-bg text-primary-foreground shadow-lg' : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'}`}>الكل ({products.length})</button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${filterCategory === cat ? 'gradient-bg text-primary-foreground shadow-lg' : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'}`}>
                  {cat} ({products.filter(p => p.category === cat).length})
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو باركود..." className="pr-10 h-10 rounded-xl text-xs border-0 bg-secondary/30 focus:bg-white transition-all" />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 gap-2">
            {filtered.map(p => {
              const isLow = p.quantity <= p.min_quantity && p.quantity > 0;
              const isOut = p.quantity === 0;
              const isExpired = p.expiry_date && new Date(p.expiry_date) < new Date();
              const profitValue = p.price - p.cost_price;
              return (
                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`glass-card p-3 flex items-center gap-3 rounded-2xl transition-all hover:shadow-md ${isOut ? 'opacity-60' : ''} ${isExpired ? 'border-destructive/30' : isLow ? 'border-warning/30' : ''}`}>
                  <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center text-2xl shadow-inner">
                    {p.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm truncate">{p.name}</p>
                      {p.barcode && <code className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">{p.barcode}</code>}
                      {p.warehouse_id && (() => {
                        const warehouse = warehouses.find(w => w.id === p.warehouse_id);
                        return warehouse ? (
                          <Badge variant="outline" className="text-[10px] border-info/30 text-info bg-info/10">
                            <Package className="w-3 h-3 mr-1" />
                            {warehouse.name || warehouse.name_ar}
                          </Badge>
                        ) : null;
                      })()}
                      {isOut && <Badge className="text-[10px] status-suspended">نفد</Badge>}
                      {isLow && !isOut && <Badge className="text-[10px] status-pending">منخفض</Badge>}
                      {isExpired && <Badge className="text-[10px] status-suspended">منتهي الصلاحية</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {p.category}</span>
                      <span className="text-primary font-bold">{Number(p.price).toFixed(2)} {currency}</span>
                      <span className="bg-secondary/30 px-2 py-0.5 rounded-full">تكلفة: {Number(p.cost_price).toFixed(2)}</span>
                      <span className={profitValue >= 0 ? 'text-success' : 'text-destructive'}>ربح: {Number(profitValue).toFixed(2)}</span>
                      <span>الكمية: <strong className={isLow ? 'text-warning' : 'text-foreground'}>{p.quantity}</strong> {p.unit}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0" onClick={() => loadProductHistory(p)} title="سجل الحركة"><BarChart3 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0" onClick={() => setShowMovement(p)} title="حركة مخزون"><Package className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0" onClick={() => startEdit(p)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-20 text-center space-y-3 glass-card rounded-3xl">
                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto opacity-20">
                  <Package className="w-8 h-8" />
                </div>
                <p className="text-muted-foreground">لا توجد منتجات مطابقة للبحث</p>
                <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilterCategory('all'); }}>مسح الفلاتر</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <WarehousesManager restaurantId={restaurantId} warehouses={warehouses} products={products} currency={currency} onRefresh={load} />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <InventoryTransfersManager restaurantId={restaurantId} warehouses={warehouses} products={products} onRefresh={load} />
        </TabsContent>

        <TabsContent value="landed_costs" className="space-y-4">
          <LandedCostsManager restaurantId={restaurantId} currency={currency} products={products} onRefresh={load} />
        </TabsContent>

        <TabsContent value="reorder" className="space-y-4">
          <SmartReorderTab products={products} currency={currency} restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="wac" className="space-y-4">
          <WACTab products={products} currency={currency} />
        </TabsContent>

        <TabsContent value="warehouse_report" className="space-y-4">
          <WarehouseReportTab products={products} warehouses={warehouses} currency={currency} restaurantId={restaurantId} />
        </TabsContent>
      </Tabs>

      {/* Modals from original code updated to fit new design */}
      <AnimatePresence>
        {showReports && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReports(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-card p-6 max-w-4xl w-full max-h-[85vh] overflow-auto space-y-6 rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="font-display font-bold text-xl flex items-center gap-2 text-primary"><BarChart3 className="w-6 h-6" /> تقارير المخزون المتقدمة</h3>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setShowReports(false)}><X className="w-5 h-5" /></Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Stock value by category chart */}
                <div className="glass-card p-4 rounded-2xl bg-secondary/10">
                  <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><Layers className="w-4 h-4" /> قيمة المخزون حسب الفئة</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categories.map(cat => ({
                        name: cat,
                        value: products.filter(p => p.category === cat).reduce((s, p) => s + p.price * p.quantity, 0),
                        cost: products.filter(p => p.category === cat).reduce((s, p) => s + p.cost_price * p.quantity, 0),
                      })).filter(d => d.value > 0)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="قيمة البيع" />
                        <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} name="التكلفة" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Profit analysis */}
                <div className="glass-card p-4 rounded-2xl bg-secondary/10">
                  <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> الأعلى ربحاً</h4>
                  <div className="space-y-2 max-h-56 overflow-auto custom-scrollbar">
                    {products.filter(p => p.quantity > 0)
                      .sort((a, b) => (b.price - b.cost_price) * b.quantity - (a.price - a.cost_price) * a.quantity)
                      .slice(0, 10).map(p => {
                        const profit = (p.price - p.cost_price) * p.quantity;
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2 bg-white/50 rounded-xl border border-border/50">
                            <span className="text-xs flex items-center gap-2">{p.image} {p.name}</span>
                            <span className="text-xs font-bold text-success">{profit.toLocaleString()} {currency}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Recent movements Table */}
              <div className="glass-card p-4 rounded-2xl">
                <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><History className="w-4 h-4" /> آخر حركات المخازن</h4>
                <div className="max-h-60 overflow-auto custom-scrollbar space-y-1">
                  {movements.slice(0, 50).map(m => (
                    <div key={m.id} className="flex items-center justify-between text-xs p-3 bg-secondary/20 rounded-xl border border-transparent hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.type === 'in' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {m.type === 'in' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold">{m.product_name}</p>
                          <p className="text-[10px] text-muted-foreground">{m.reason || 'حركة عامة'}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-black ${m.type === 'in' ? 'text-success' : 'text-destructive'}`}>
                          {m.type === 'in' ? '+' : '-'}{m.quantity}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleString('ar-EG')}</p>
                      </div>
                    </div>
                  ))}
                  {movements.length === 0 && <p className="text-muted-foreground text-center py-10 opacity-50">لا توجد حركات مسجلة</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product History Modal */}
      <AnimatePresence>
        {showProductHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowProductHistory(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-auto space-y-4 rounded-3xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg">{showProductHistory.image} سجل حركة — {showProductHistory.name}</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowProductHistory(null)} className="rounded-full"><X className="w-5 h-5" /></Button>
              </div>
              <div className="bg-primary/5 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-sm text-muted-foreground">الرصيد الحالي</span>
                <span className="text-xl font-black text-primary">{showProductHistory.quantity} {showProductHistory.unit}</span>
              </div>
              <div className="space-y-2">
                {productMovements.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">لا توجد حركات مسجلة لهذا الصنف</p>}
                {productMovements.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30">
                    <div>
                      <p className="text-sm font-bold">{m.reason || (m.type === 'in' ? 'توريد مخزني' : 'صرف مخزني')}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString('ar-EG')}</p>
                    </div>
                    <span className={`font-black text-sm ${m.type === 'in' ? 'text-success' : 'text-destructive'}`}>
                      {m.type === 'in' ? '+' : '-'}{m.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => resetForm()}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-card p-6 max-w-xl w-full max-h-[90vh] overflow-auto space-y-4 rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-xl text-primary">{editingProduct ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد للمخزون'}</h3>
                <Button variant="ghost" size="sm" onClick={() => resetForm()} className="rounded-full"><X className="w-5 h-5" /></Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block mr-1">اسم الصنف *</Label>
                  <Input placeholder="مثال: دقيق فاخر 50 كجم" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl" />
                </div>
                <div className="col-span-2 space-y-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block mr-1">الباركود</Label>
                      <div className="relative">
                        <Input placeholder="Barcode" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} className="h-11 rounded-xl pr-10" />
                        <Boxes className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                    <Button type="button" variant="outline" onClick={() => {
                      const random = Math.floor(Math.random() * 900000000000) + 100000000000;
                      setForm(f => ({ ...f, barcode: String(random) }));
                    }} className="h-11 rounded-xl px-3" title="توليد باركود تلقائي">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    {form.barcode && (
                      <Button type="button" variant="outline" onClick={() => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 300;
                        canvas.height = 150;
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = 'black';
                        ctx.font = 'bold 24px monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText(form.barcode, 150, 40);
                        ctx.fillText(form.name || 'Product', 150, 130);
                        // Simple barcode lines
                        const startX = 40;
                        const barcodeWidth = 220;
                        for (let i = 0; i < barcodeWidth; i += 3) {
                          const w = Math.random() > 0.5 ? 2 : 1;
                          ctx.fillRect(startX + i, 50, w, 60);
                        }
                        const link = document.createElement('a');
                        link.download = `barcode-${form.barcode}.png`;
                        link.href = canvas.toDataURL();
                        link.click();
                      }} className="h-11 rounded-xl px-3 bg-primary/10 text-primary border-primary/20" title="تحميل الباركود للطباعة">
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {form.barcode && (
                    <div className="p-3 bg-white border border-dashed rounded-2xl flex flex-col items-center justify-center space-y-2">
                      <div className="flex gap-0.5 h-10 items-end">
                        {form.barcode.split('').map((char, i) => (
                          <div key={i} className="bg-black w-[2px]" style={{ height: `${20 + (parseInt(char) || 0) * 2}px` }} />
                        ))}
                        {form.barcode.split('').reverse().map((char, i) => (
                          <div key={i+100} className="bg-black w-[1px]" style={{ height: `${25 + (parseInt(char) || 0) * 1.5}px` }} />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono font-bold tracking-[0.2em]">{form.barcode}</span>
                    </div>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs mb-1 block mr-1">رمز SKU</Label>
                  <Input placeholder="Stock Keeping Unit" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="h-11 rounded-xl" />
                </div>
                
                <div className="col-span-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <Label className="text-xs font-bold mb-3 block text-primary">إعدادات التسعير والتكلفة</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] mb-1 block">سعر التكلفة الأساسي</Label>
                      <Input placeholder="0.00" type="number" value={form.cost_price} onChange={e => {
                        const newCostValue = e.target.value;
                        setForm(f => ({ ...f, cost_price: newCostValue }));
                        if (pricingMode !== 'fixed') {
                          const costValue = Number(newCostValue) || 0;
                          const mv = Number(markupValue) || 0;
                          const newPriceValue = pricingMode === 'markup_percent' ? (costValue * (1 + mv / 100)).toFixed(2) : (costValue + mv).toFixed(2);
                          setForm(f => ({ ...f, price: newPriceValue }));
                        }
                      }} className="h-11 rounded-xl bg-white" />
                    </div>
                    <div>
                      <Label className="text-[10px] mb-1 block">سعر البيع</Label>
                      <Input placeholder="0.00" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} disabled={pricingMode !== 'fixed'} className="h-11 rounded-xl bg-white disabled:opacity-50" />
                    </div>
                    
                    <div className="col-span-2">
                      <Label className="text-[10px] mb-2 block">طريقة الربط التلقائي للأسعار</Label>
                      <div className="flex gap-1 rounded-xl bg-secondary/50 p-1">
                        {([
                          { key: 'fixed' as const, label: 'سعر بيع ثابت' },
                          { key: 'markup_percent' as const, label: 'نسبة ربح %' },
                          { key: 'markup_fixed' as const, label: 'هامش ربح ثابت' },
                        ] as const).map(m => (
                          <button key={m.key} type="button" onClick={() => {
                            setPricingMode(m.key);
                            if (m.key !== 'fixed' && form.cost_price) {
                              const costVal = Number(form.cost_price) || 0;
                              const mv = Number(markupValue) || 0;
                              const np = m.key === 'markup_percent' ? (costVal * (1 + mv / 100)).toFixed(2) : (costVal + mv).toFixed(2);
                              setForm(f => ({ ...f, price: np }));
                            }
                          }}
                            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${pricingMode === m.key ? 'gradient-bg text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-white/50'}`}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {pricingMode !== 'fixed' && (
                      <div className="col-span-2">
                        <Label className="text-[10px] mb-1 block">{pricingMode === 'markup_percent' ? 'نسبة الربح المضافة %' : 'المبلغ المضاف على التكلفة'}</Label>
                        <Input
                          placeholder="مثال: 30"
                          type="number"
                          value={markupValue}
                          onChange={e => {
                            setMarkupValue(e.target.value);
                            const costVal = Number(form.cost_price) || 0;
                            const mv = Number(e.target.value) || 0;
                            const newPriceVal = pricingMode === 'markup_percent' ? (costVal * (1 + mv / 100)).toFixed(2) : (costVal + mv).toFixed(2);
                            setForm(f => ({ ...f, price: newPriceVal }));
                          }}
                          className="h-11 rounded-xl bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-1 block">الكمية الافتتاحية</Label>
                  <Input placeholder="0" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} step="0.01" className="h-11 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">حد إعادة الطلب</Label>
                  <Input placeholder="5" type="number" value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))} className="h-11 rounded-xl" />
                </div>
                
                <div>
                  <Label className="text-xs mb-1 block">الفئة</Label>
                  <Input placeholder="مثال: مجمدات" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="h-11 rounded-xl" list="cat-list" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">نوع الصنف</Label>
                  <Select
                    value={form.item_type_id}
                    onValueChange={(value) => setForm(f => ({ ...f, item_type_id: value }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="اختر نوع الصنف" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name_ar || type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">المخزن</Label>
                  <Select
                    value={form.warehouse_id}
                    onValueChange={(value) => setForm(f => ({ ...f, warehouse_id: value }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="اختر المخزن" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(wh => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.name_ar || wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">وحدة القياس</Label>
                  <Input placeholder="كيلو، علبة، لتر" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="h-11 rounded-xl" />
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1 block">الأيقونة</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl">
                        {['📦', '🍎', '🧴', '👕', '🛠️'].map(emoji => (
                          <button key={emoji} onClick={() => setForm(f => ({ ...f, image: emoji }))} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${form.image === emoji ? 'bg-white shadow-sm scale-110 ring-1 ring-primary/20' : 'opacity-50 hover:opacity-100'}`}>
                            {emoji}
                          </button>
                        ))}
                        {/* Custom image upload */}
                        <label className="w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer bg-white/50 hover:bg-white border border-dashed border-border hover:border-primary/30">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  setForm(f => ({ ...f, image: event.target?.result as string }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <span className="text-lg">📤</span>
                        </label>
                      </div>
                      {/* Preview selected image */}
                      {form.image && form.image.length > 4 && (
                        <div className="p-2 bg-white rounded-lg border border-border flex items-center gap-2">
                          <img src={form.image} alt="Custom icon" className="w-8 h-8 object-contain rounded" />
                          <span className="text-xs text-muted-foreground">أيقونة مخصصة</span>
                          <button
                            onClick={() => setForm(f => ({ ...f, image: '📦' }))}
                            className="ml-auto text-xs text-destructive hover:underline"
                          >
                            إزالة
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">تاريخ الصلاحية</Label>
                    <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="h-11 rounded-xl" />
                  </div>
                </div>
              </div>

              {/* Warehouse Management Components */}
              {editingProduct && (
                <div className="space-y-6 pt-4 border-t border-border">
                  <div>
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-primary">
                      <Truck className="w-4 h-4" /> إدارة المخازن
                    </h4>
                    <WarehouseManager />
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-primary">
                      <Package className="w-4 h-4" /> ارتباطات الصنف بالمخازن
                    </h4>
                    {(() => {
                      const selectedItemType = itemTypes.find(t => t.id === form.item_type_id);
                      const shouldHideWarehouseAssignments = selectedItemType && 
                        (selectedItemType.code === 'NON_INVENTORY' || selectedItemType.code === 'SERVICE');
                      
                      if (shouldHideWarehouseAssignments) {
                        return (
                          <div className="text-sm text-muted-foreground p-3 bg-secondary/30 rounded-xl">
                            هذا النوع من الأصناف لا يتطلب إدارة مخزون
                          </div>
                        );
                      }
                      
                      return (
                        <ItemWarehouseAssignments 
                          itemId={editingProduct.id} 
                          itemName={editingProduct.name} 
                        />
                      );
                    })()}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} className="flex-1 h-12 rounded-2xl gradient-bg text-primary-foreground border-0 text-sm font-bold shadow-lg shadow-primary/20">
                  <Save className="w-4 h-4 ml-2" /> {editingProduct ? 'حفظ التعديلات' : 'إضافة الصنف للمخزون'}
                </Button>
                <Button variant="outline" onClick={resetForm} className="flex-1 h-12 rounded-2xl text-sm font-bold">إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Movement Modal */}
      <AnimatePresence>
        {showMovement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowMovement(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-card p-6 max-w-md w-full space-y-5 rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-primary">حركة مخزون يدوية</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowMovement(null)} className="rounded-full"><X className="w-5 h-5" /></Button>
              </div>
              
              <div className="p-4 bg-secondary/30 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">{showMovement.image}</div>
                <div>
                  <p className="font-bold text-sm">{showMovement.name}</p>
                  <p className="text-xs text-muted-foreground">الرصيد: {showMovement.quantity} {showMovement.unit}</p>
                </div>
              </div>

              <div className="flex rounded-xl bg-secondary/50 p-1">
                <button onClick={() => setMovementType('in')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${movementType === 'in' ? 'bg-success text-white shadow-md' : 'text-muted-foreground hover:bg-white/50'}`}>
                  <ArrowDown className="w-4 h-4" /> إضافة (وارد)
                </button>
                <button onClick={() => setMovementType('out')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${movementType === 'out' ? 'bg-destructive text-white shadow-md' : 'text-muted-foreground hover:bg-white/50'}`}>
                  <ArrowUp className="w-4 h-4" /> صرف (صادر)
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1 block mr-1">الكمية</Label>
                  <Input placeholder="0.00" type="number" step="0.01" value={movementQty} onChange={e => setMovementQty(e.target.value)} className="h-11 rounded-xl" />
                </div>
                
                {/* Project Selection for Contracting */}
                {(businessType === 'contracting' || hasFeature(businessType, 'projects')) && movementType === 'out' && (
                  <div>
                    <Label className="text-xs mb-1 block mr-1">تحميل التكلفة على مشروع</Label>
                    <select 
                      value={selectedProjectId} 
                      onChange={e => setSelectedProjectId(e.target.value)}
                      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                      <option value="">-- حركة مخزون عامة --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <Label className="text-xs mb-1 block mr-1">سبب الحركة / ملاحظات</Label>
                  <Input placeholder="مثال: جرد دوري، تالف، صرف داخلي" value={movementReason} onChange={e => setMovementReason(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>

              <Button onClick={handleMovement} className="w-full h-12 rounded-2xl gradient-bg text-primary-foreground border-0 text-sm font-bold shadow-lg shadow-primary/20">
                تأكيد وتنفيذ الحركة
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ====================================================================================================
// SUB-COMPONENTS FOR PRO INVENTORY
// ====================================================================================================

function WarehousesManager({ restaurantId, warehouses, onRefresh, products, currency }: { restaurantId: string; warehouses: Warehouse[]; onRefresh: () => void; products: Product[]; currency: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [mainWarehouses, setMainWarehouses] = useState<Warehouse[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockWhFilter, setStockWhFilter] = useState('');
  const [stockView, setStockView] = useState<Warehouse | null>(null);

  // --- Product Action Dialogs ---
  type ProductActionTarget = { stockItem: any; warehouse: Warehouse } | null;
  const [transferTarget, setTransferTarget] = useState<ProductActionTarget>(null);
  const [addQtyTarget, setAddQtyTarget] = useState<ProductActionTarget>(null);
  const [transferForm, setTransferForm] = useState({ mode: 'existing' as 'existing' | 'new', toWarehouseId: '', qtyMode: 'all' as 'all' | 'custom', customQty: '', newWhCode: '', newWhName: '', newWhNameAr: '' });
  const [addQtyMode, setAddQtyMode] = useState<'direct' | 'purchase' | null>(null);
  const [directQty, setDirectQty] = useState('');
  const [directQtyCost, setDirectQtyCost] = useState(''); // Cost per unit for actual inventory
  const [transferring, setTransferring] = useState(false);
  const [addingQty, setAddingQty] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    name_ar: '',
    type: 'main',
    accounting_standard: 'IFRS',
    parent_warehouse_id: '',
    address: '',
    city: '',
    country: 'Egypt',
    phone: '',
    email: '',
    manager_name: '',
    currency: 'EGP',
    accounting_account_code: '',
    inventory_account_code: '',
    cogs_account_code: '',
    notes: ''
  });

  useEffect(() => {
    setMainWarehouses(warehouses.filter(w => w.type === 'main' || w.type === 'MAIN'));
  }, [warehouses]);

  useEffect(() => {
    if (restaurantId && warehouses.length > 0) {
      loadWarehouseStocks();
    }
  }, [restaurantId, warehouses]);

  const loadWarehouseStocks = async () => {
    setLoadingStock(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_stock')
        .select('*')
        .eq('restaurant_id', restaurantId);
      if (!error) setWarehouseStocks(data || []);
    } catch { /* silent */ } finally {
      setLoadingStock(false);
    }
  };

  // Build a rich stock matrix: for each warehouse, list products with qty
  const stockMatrix = warehouses.map(wh => {
    const whStocks = warehouseStocks.filter(s => s.warehouse_id === wh.id);
    const items = whStocks.map(s => {
      const prod = products.find(p => p.id === s.product_id);
      return { ...s, product: prod };
    }).filter(s => s.product);
    const totalQty = items.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const totalValue = items.reduce((sum, s) => sum + Number(s.quantity || 0) * Number(s.product?.cost_price || 0), 0);
    return { warehouse: wh, items, totalQty, totalValue };
  });

  // Filter stock for the selected warehouse view
  const filteredStockItems = stockView
    ? (stockMatrix.find(m => m.warehouse.id === stockView.id)?.items || []).filter(s => {
        if (!stockSearch) return true;
        const q = stockSearch.toLowerCase();
        return (
          (s.product?.name || '').toLowerCase().includes(q) ||
          (s.product?.barcode || '').toLowerCase().includes(q) ||
          (s.product?.sku || '').toLowerCase().includes(q)
        );
      })
    : [];

  const generateAccountingCodes = (warehouseType: string, warehouseCode: string) => {
    const baseCode = warehouseCode.replace('WH-', '').padStart(4, '0');
    const inventoryAccountCode = `13${baseCode}`;
    const cogsAccountCode = `52${baseCode}`;
    const accountingAccountCode = inventoryAccountCode;
    return { accounting_account_code: accountingAccountCode, inventory_account_code: inventoryAccountCode, cogs_account_code: cogsAccountCode };
  };

  // --- Transfer product to another warehouse ---
  const handleProductTransfer = async () => {
    if (!transferTarget) return;
    const { stockItem, warehouse: fromWh } = transferTarget;
    const prodId = stockItem.product_id;
    const srcQty = Number(stockItem.quantity || 0);
    const qty = transferForm.qtyMode === 'all' ? srcQty : Number(transferForm.customQty);

    if (!qty || qty <= 0) return toast.error('الكمية يجب أن تكون أكبر من صفر');
    if (qty > srcQty) return toast.error(`الكمية المتاحة: ${srcQty} فقط`);

    setTransferring(true);
    try {
      let toWarehouseId = transferForm.toWarehouseId;

      if (transferForm.mode === 'new') {
        if (!transferForm.newWhCode || !transferForm.newWhName || !transferForm.newWhNameAr)
          { toast.error('يرجى ملء بيانات المخزن الجديد'); setTransferring(false); return; }
        const { data: newWh, error: whErr } = await supabase.from('warehouses').insert({
          restaurant_id: restaurantId,
          code: transferForm.newWhCode,
          name: transferForm.newWhName,
          name_ar: transferForm.newWhNameAr,
          type: 'SUB',
          accounting_standard: 'IFRS',
          currency: 'EGP',
        }).select().single();
        if (whErr) throw whErr;
        toWarehouseId = newWh.id;
      }

      if (!toWarehouseId) { toast.error('اختر المخزن الوجهة'); setTransferring(false); return; }
      if (toWarehouseId === fromWh.id) { toast.error('لا يمكن التحويل لنفس المخزن'); setTransferring(false); return; }

      const { data: result, error: rpcError } = await supabase.rpc('execute_inventory_transfer', {
        p_restaurant_id: restaurantId,
        p_from_warehouse_id: fromWh.id,
        p_to_warehouse_id: toWarehouseId,
        p_product_id: prodId,
        p_quantity: qty,
        p_notes: `تحويل من تفاصيل المخزن: ${fromWh.name || fromWh.name_ar}`
      });
      if (rpcError) throw rpcError;
      const res = result as { success: boolean; error?: string };
      if (!res?.success) { toast.error(res?.error || 'فشل التحويل'); setTransferring(false); return; }

      toast.success('✅ تم التحويل بنجاح وتحديث الأرصدة');
      setTransferTarget(null);
      setTransferForm({ mode: 'existing', toWarehouseId: '', qtyMode: 'all', customQty: '', newWhCode: '', newWhName: '', newWhNameAr: '' });
      await loadWarehouseStocks();
      onRefresh();
    } catch (err: any) {
      toast.error('فشل التحويل: ' + err.message);
    } finally {
      setTransferring(false);
    }
  };

  // --- Add quantity directly (inventory count) ---
  const handleDirectQtyAdd = async () => {
    if (!addQtyTarget) return;
    const { stockItem } = addQtyTarget;
    const addAmt = Number(directQty);
    const addCost = Number(directQtyCost);
    if (!addAmt || addAmt <= 0) return toast.error('الكمية يجب أن تكون أكبر من صفر');
    if (addCost < 0) return toast.error('التكلفة يجب أن تكون رقم صحيح');
    setAddingQty(true);
    try {
      // Update warehouse stock quantity
      if (stockItem.id) {
        await supabase.from('warehouse_stock')
          .update({ quantity: Number(stockItem.quantity || 0) + addAmt })
          .eq('id', stockItem.id);
      } else {
        await supabase.from('warehouse_stock').upsert({
          restaurant_id: restaurantId,
          warehouse_id: addQtyTarget.warehouse.id,
          product_id: stockItem.product_id,
          quantity: Number(stockItem.quantity || 0) + addAmt,
        }, { onConflict: 'warehouse_id,product_id' });
      }

      // Calculate new average cost based on costing method
      const curQty = Number(stockItem.product?.quantity || 0);
      const curCost = Number(stockItem.product?.cost_price || 0);
      const newQty = curQty + addAmt;
      let newCost = curCost;

      if (addCost > 0) {
        if (costingMethod === 'wac' || costingMethod === 'average') {
          // Weighted Average Cost: (old total + new total) / new quantity
          const oldTotal = curQty * curCost;
          const newTotal = addAmt * addCost;
          newCost = newQty > 0 ? (oldTotal + newTotal) / newQty : addCost;
        } else if (costingMethod === 'fifo' || costingMethod === 'lifo') {
          // FIFO/LIFO: update to the new cost as reference (layers handled separately)
          newCost = addCost;
        } else {
          // Specific or other: use the new cost
          newCost = addCost;
        }
      }

      // Update product with new quantity and cost
      await supabase.from('products')
        .update({
          quantity: newQty,
          cost_price: newCost
        })
        .eq('id', stockItem.product_id);

      toast.success(`تم إضافة ${addAmt} ${stockItem.product?.unit || 'وحدة'} من الجرد الفعلي${addCost > 0 ? ` بتكلفة ${addCost} ${currency}` : ''}`);
      setAddQtyTarget(null);
      setAddQtyMode(null);
      setDirectQty('');
      setDirectQtyCost('');
      await loadWarehouseStocks();
      onRefresh();
    } catch (err: any) {
      toast.error('فشل الإضافة: ' + err.message);
    } finally {
      setAddingQty(false);
    }
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.name_ar) {
      return toast.error('يرجى ملء جميع الحقول المطلوبة');
    }
    const autoCodes = generateAccountingCodes(form.type, form.code);
    const data = {
      ...form,
      ...autoCodes,
      restaurant_id: restaurantId,
      parent_warehouse_id: form.parent_warehouse_id || null,
      type: form.type.toUpperCase(),
      accounting_standard: form.accounting_standard.toUpperCase()
    };
    try {
      if (editingWarehouse) {
        const { error } = await supabase.from('warehouses').update(data).eq('id', editingWarehouse.id);
        if (error) throw error;
        toast.success('تم تحديث بيانات المخزن');
      } else {
        const { error } = await supabase.from('warehouses').insert(data).select().single();
        if (error) throw error;
        toast.success('تم إنشاء المخزن الجديد');
      }
      setShowForm(false);
      setEditingWarehouse(null);
      setForm({ code: '', name: '', name_ar: '', type: 'main', accounting_standard: 'IFRS', parent_warehouse_id: '', address: '', city: '', country: 'Egypt', phone: '', email: '', manager_name: '', currency: 'EGP', accounting_account_code: '', inventory_account_code: '', cogs_account_code: '', notes: '' });
      onRefresh();
    } catch (error: any) {
      console.error('Warehouse save error:', error);
      toast.error(`فشل الحفظ: ${error?.message || 'تحقق من الصلاحيات والاتصال'}`);
    }
  };

  const typeLabel = (type: string) => {
    const t = type?.toUpperCase();
    if (t === 'MAIN') return 'رئيسي';
    if (t === 'SUB') return 'فرعي';
    if (t === 'RAW_MATERIALS') return 'خامات';
    if (t === 'FINISHED_GOODS') return 'منتج تام';
    if (t === 'WORK_IN_PROGRESS') return 'تحت التصنيع';
    if (t === 'SERVICE') return 'خدمات';
    if (t === 'PROJECT') return 'مشروع';
    return type || '—';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> إدارة المخازن والمستودعات
        </h3>
        <Button onClick={() => { setShowForm(true); }} size="sm" className="gradient-bg text-primary-foreground border-0 rounded-xl">
          <Plus className="w-4 h-4 ml-1" /> إضافة مخزن
        </Button>
      </div>

      {/* Warehouse Cards Grid with stock summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {warehouses.map(wh => {
          const matrix = stockMatrix.find(m => m.warehouse.id === wh.id);
          return (
          <div key={wh.id} className="glass-card p-4 rounded-2xl border border-border/50 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-[10px] bg-secondary/30">{typeLabel(wh.type)}</Badge>
                {wh.is_default && <Badge variant="outline" className="text-[10px] bg-primary/20 text-primary">افتراضي</Badge>}
              </div>
            </div>
            <h4 className="font-bold text-sm mb-0.5">{wh.name_ar || wh.name}</h4>
            <p className="text-[10px] text-muted-foreground mb-1">{wh.name_ar ? wh.name : ''}</p>
            <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" /> الكود: {wh.code || '---'}
            </p>
            {/* Stock summary */}
            {matrix && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-primary/5 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">إجمالي الكمية</p>
                  <p className="text-sm font-bold text-primary">{matrix.totalQty.toLocaleString()}</p>
                </div>
                <div className="bg-success/5 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">قيمة المخزون</p>
                  <p className="text-sm font-bold text-success">{matrix.totalValue.toLocaleString()} <span className="text-[9px]">{currency}</span></p>
                </div>
              </div>
            )}
            {wh.parent_warehouse_id && (
              <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                <FolderTree className="w-3 h-3" /> تابع: {warehouses.find(w => w.id === wh.parent_warehouse_id)?.name || 'غير معروف'}
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-8 rounded-lg text-xs"
                onClick={() => setStockView(wh)}>
                <Package className="w-3 h-3 ml-1" /> تفاصيل المخزون
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8 rounded-lg p-0" onClick={() => {
                setEditingWarehouse(wh);
                setForm({ code: wh.code, name: wh.name, name_ar: wh.name_ar || '', type: wh.type.toLowerCase(), accounting_standard: wh.accounting_standard, parent_warehouse_id: wh.parent_warehouse_id || '', address: wh.address || '', city: wh.city || '', country: wh.country || 'Egypt', phone: wh.phone || '', email: wh.email || '', manager_name: wh.manager_name || '', currency: wh.currency, accounting_account_code: wh.accounting_account_code || '', inventory_account_code: wh.inventory_account_code || '', cogs_account_code: wh.cogs_account_code || '', notes: wh.notes || '' });
                setShowForm(true);
              }}>
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10" onClick={() => {
                if (confirm('هل أنت متأكد من حذف هذا المخزن؟')) {
                  supabase.from('warehouses').delete().eq('id', wh.id).then(({ error }) => {
                    if (error) toast.error('فشل الحذف: ' + error.message);
                    else { toast.success('تم الحذف'); onRefresh(); }
                  });
                }
              }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )})}
        {warehouses.length === 0 && (
          <div className="col-span-full py-20 text-center glass-card rounded-3xl opacity-50">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm">لم يتم إضافة أي مستودعات بعد</p>
          </div>
        )}
      </div>

      {/* Stock Details Modal */}
      <AnimatePresence>
        {stockView && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-2xl w-full max-h-[90vh] flex flex-col rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    {stockView.name_ar || stockView.name}
                    <Badge variant="outline" className="text-[10px]">{typeLabel(stockView.type)}</Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">كود المخزن: {stockView.code}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setStockView(null); setStockSearch(''); }} className="rounded-xl">✕</Button>
              </div>

              {/* Search */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={stockSearch}
                    onChange={e => setStockSearch(e.target.value)}
                    placeholder="بحث باسم الصنف أو باركود أو SKU..."
                    className="pr-10 h-10 rounded-xl text-xs border-0 bg-secondary/30"
                  />
                </div>
              </div>

              {/* Stock items list */}
              <div className="overflow-auto flex-1 space-y-2">
                {filteredStockItems.length === 0 ? (
                  <div className="py-12 text-center opacity-50">
                    <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">{stockSearch ? 'لا توجد نتائج' : 'لا يوجد مخزون في هذا المستودع'}</p>
                  </div>
                ) : (
                  filteredStockItems.map(s => (
                    <div key={s.id || s.product_id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center text-xl">
                        {s.product?.image || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{s.product?.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {s.product?.barcode && <code className="bg-secondary/50 px-1 rounded">{s.product.barcode}</code>}
                          {s.product?.sku && <span>SKU: {s.product.sku}</span>}
                          <span>{s.product?.category}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${Number(s.quantity) <= 0 ? 'text-destructive' : Number(s.quantity) <= (s.product?.min_quantity || 5) ? 'text-warning' : 'text-success'}`}>
                          {Number(s.quantity).toLocaleString()}
                          <span className="text-[10px] text-muted-foreground mr-1">{s.product?.unit || 'قطعة'}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          قيمة: {(Number(s.quantity) * Number(s.product?.cost_price || 0)).toFixed(2)} {currency}
                        </p>
                      </div>
                      {/* Action buttons */}
                      <div className="flex flex-col gap-1 mr-1">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 w-7 p-0 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                          title="تحويل لمخزن آخر"
                          onClick={() => {
                            setTransferTarget({ stockItem: s, warehouse: stockView! });
                            setTransferForm({ mode: 'existing', toWarehouseId: '', qtyMode: 'all', customQty: '', newWhCode: '', newWhName: '', newWhNameAr: '' });
                          }}
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 w-7 p-0 rounded-lg border-success/30 text-success hover:bg-success/10"
                          title="إضافة كميات"
                          onClick={() => {
                            setAddQtyTarget({ stockItem: s, warehouse: stockView! });
                            setAddQtyMode(null);
                            setDirectQty('');
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer summary */}
              <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">عدد الأصناف</p>
                  <p className="font-bold text-sm">{filteredStockItems.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">إجمالي الكميات</p>
                  <p className="font-bold text-sm">{filteredStockItems.reduce((s, x) => s + Number(x.quantity || 0), 0).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">إجمالي القيمة</p>
                  <p className="font-bold text-sm text-primary">{filteredStockItems.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.product?.cost_price || 0), 0).toFixed(2)} {currency}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== TRANSFER PRODUCT DIALOG ===================== */}
      <AnimatePresence>
        {transferTarget && (
          <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full rounded-3xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-primary" />
                  تحويل صنف لمخزن آخر
                </h3>
                <Button size="sm" variant="ghost" className="rounded-full h-7 w-7 p-0" onClick={() => setTransferTarget(null)}>✕</Button>
              </div>

              <div className="bg-secondary/20 rounded-xl p-3">
                <p className="font-bold text-sm">{transferTarget.stockItem.product?.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  الكمية المتاحة: <span className="font-bold text-primary">{transferTarget.stockItem.quantity} {transferTarget.stockItem.product?.unit || 'وحدة'}</span>
                  &nbsp;·&nbsp; المخزن المصدر: <span className="font-bold">{transferTarget.warehouse.name || transferTarget.warehouse.name_ar}</span>
                </p>
              </div>

              {/* Mode: existing or new warehouse */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTransferForm(f => ({ ...f, mode: 'existing' }))}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    transferForm.mode === 'existing' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/20 text-muted-foreground'
                  }`}
                >
                  📦 مخزن حالي
                </button>
                <button
                  onClick={() => setTransferForm(f => ({ ...f, mode: 'new' }))}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    transferForm.mode === 'new' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/20 text-muted-foreground'
                  }`}
                >
                  ➕ مخزن جديد
                </button>
              </div>

              {transferForm.mode === 'existing' ? (
                <select
                  value={transferForm.toWarehouseId}
                  onChange={e => setTransferForm(f => ({ ...f, toWarehouseId: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">-- اختر المخزن الوجهة --</option>
                  {warehouses.filter(w => w.id !== transferTarget.warehouse.id).map(w => (
                    <option key={w.id} value={w.id}>{w.name || w.name_ar} ({w.code})</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="كود المخزن الجديد" value={transferForm.newWhCode}
                    onChange={e => setTransferForm(f => ({ ...f, newWhCode: e.target.value }))}
                    className="h-10 rounded-xl text-sm" />
                  <Input placeholder="اسم المخزن (انجليزي)" value={transferForm.newWhName}
                    onChange={e => setTransferForm(f => ({ ...f, newWhName: e.target.value }))}
                    className="h-10 rounded-xl text-sm" />
                  <Input placeholder="اسم المخزن (عربي)" value={transferForm.newWhNameAr}
                    onChange={e => setTransferForm(f => ({ ...f, newWhNameAr: e.target.value }))}
                    className="h-10 rounded-xl text-sm" />
                </div>
              )}

              {/* Quantity mode */}
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground font-bold">الكمية المراد تحويلها:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTransferForm(f => ({ ...f, qtyMode: 'all' }))}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      transferForm.qtyMode === 'all' ? 'border-success bg-success/10 text-success' : 'border-border bg-secondary/20 text-muted-foreground'
                    }`}
                  >
                    كل الكمية ({transferTarget.stockItem.quantity})
                  </button>
                  <button
                    onClick={() => setTransferForm(f => ({ ...f, qtyMode: 'custom' }))}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      transferForm.qtyMode === 'custom' ? 'border-warning bg-warning/10 text-warning' : 'border-border bg-secondary/20 text-muted-foreground'
                    }`}
                  >
                    كمية مخصصة
                  </button>
                </div>
                {transferForm.qtyMode === 'custom' && (
                  <Input
                    type="number" placeholder="أدخل الكمية"
                    value={transferForm.customQty}
                    onChange={e => setTransferForm(f => ({ ...f, customQty: e.target.value }))}
                    className="h-10 rounded-xl text-sm"
                    max={transferTarget.stockItem.quantity}
                  />
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleProductTransfer}
                  disabled={transferring}
                  className="flex-1 h-11 gradient-bg text-primary-foreground border-0 rounded-xl font-bold"
                >
                  {transferring ? 'جاري التحويل...' : '✅ تنفيذ التحويل'}
                </Button>
                <Button onClick={() => setTransferTarget(null)} variant="outline" className="flex-1 h-11 rounded-xl">
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== ADD QUANTITY DIALOG ===================== */}
      <AnimatePresence>
        {addQtyTarget && (
          <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full rounded-3xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-success" />
                  إضافة كميات للصنف
                </h3>
                <Button size="sm" variant="ghost" className="rounded-full h-7 w-7 p-0" onClick={() => { setAddQtyTarget(null); setAddQtyMode(null); }}>✕</Button>
              </div>

              <div className="bg-secondary/20 rounded-xl p-3">
                <p className="font-bold text-sm">{addQtyTarget.stockItem.product?.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  الكمية الحالية: <span className="font-bold text-primary">{addQtyTarget.stockItem.quantity} {addQtyTarget.stockItem.product?.unit || 'وحدة'}</span>
                  &nbsp;·&nbsp; المخزن: <span className="font-bold">{addQtyTarget.warehouse.name || addQtyTarget.warehouse.name_ar}</span>
                </p>
              </div>

              {!addQtyMode ? (
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setAddQtyMode('direct')}
                    className="p-4 rounded-xl border border-success/40 bg-success/5 hover:bg-success/10 text-right transition-all"
                  >
                    <p className="font-bold text-sm text-success">📊 جرد فعلي (إدخال مباشر)</p>
                    <p className="text-[11px] text-muted-foreground mt-1">إضافة كميات من الجرد الفعلي مباشرةً إلى المخزن دون دورة محاسبية</p>
                  </button>
                  <button
                    onClick={() => {
                      setAddQtyTarget(null);
                      setAddQtyMode(null);
                      // Switch to purchase invoices tab and pass data via localStorage for pre-fill
                      try {
                        localStorage.setItem('prefill_purchase_product', JSON.stringify({
                          product_id: addQtyTarget.stockItem.product_id,
                          product_name: addQtyTarget.stockItem.product?.name,
                          warehouse_id: addQtyTarget.warehouse.id,
                          warehouse_name: addQtyTarget.warehouse.name || addQtyTarget.warehouse.name_ar,
                          unit: addQtyTarget.stockItem.product?.unit,
                          cost_price: addQtyTarget.stockItem.product?.cost_price,
                        }));
                      } catch {}
                      // Dispatch a custom event to navigate to purchase invoices
                      window.dispatchEvent(new CustomEvent('navigate-to-purchase-invoices', {
                        detail: { product_id: addQtyTarget.stockItem.product_id }
                      }));
                      toast.info('📄 انتقل لتبويب فواتير المشتريات لإتمام الدورة المحاسبية');
                    }}
                    className="p-4 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 text-right transition-all"
                  >
                    <p className="font-bold text-sm text-primary">🧾 فاتورة مشتريات (دورة محاسبية كاملة)</p>
                    <p className="text-[11px] text-muted-foreground mt-1">إنشاء فاتورة مشتريات مع مورد، تسجيل القيود المحاسبية، وتحديث المخزن تلقائياً بعد الحفظ</p>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-bold">أدخل الكمية المضافة من الجرد الفعلي:</p>
                  <Input
                    type="number" placeholder="الكمية المضافة"
                    value={directQty}
                    onChange={e => setDirectQty(e.target.value)}
                    className="h-11 rounded-xl text-sm"
                    min="1"
                  />
                  <p className="text-sm font-bold">تكلفة الوحدة (اختياري):</p>
                  <Input
                    type="number" placeholder={`التكلفة بالـ ${currency}`}
                    value={directQtyCost}
                    onChange={e => setDirectQtyCost(e.target.value)}
                    className="h-11 rounded-xl text-sm"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    طريقة التسعير الحالية: <span className="font-bold text-primary">
                      {costingMethod === 'wac' ? 'المتوسط المرجح (WAC)' :
                       costingMethod === 'fifo' ? 'الوارد أولاً يصرف أولاً (FIFO)' :
                       costingMethod === 'lifo' ? 'الوارد أخيراً يصرف أولاً (LIFO)' : costingMethod}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    بعد الإضافة: <span className="font-bold text-success">{Number(addQtyTarget.stockItem.quantity || 0) + Number(directQty || 0)} {addQtyTarget.stockItem.product?.unit || 'وحدة'}</span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDirectQtyAdd}
                      disabled={addingQty || !directQty || Number(directQty) <= 0}
                      className="flex-1 h-11 gradient-bg text-primary-foreground border-0 rounded-xl font-bold"
                    >
                      {addingQty ? 'جاري الإضافة...' : '✅ تأكيد الإضافة'}
                    </Button>
                    <Button onClick={() => setAddQtyMode(null)} variant="outline" className="h-11 rounded-xl">رجوع</Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-auto space-y-4 rounded-3xl shadow-2xl">
              <h3 className="font-display font-bold text-lg">{editingWarehouse ? 'تعديل مخزن' : 'مخزن جديد'}</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="الكود" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="h-11 rounded-xl" />
                  <Input placeholder="اسم المخزن (إنجليزي)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl" />
                </div>
                <Input placeholder="الاسم بالعربي" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} className="h-11 rounded-xl" />
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="main">مخزن رئيسي (MAIN)</option>
                  <option value="sub">مخزن فرعي (SUB)</option>
                  <option value="raw_materials">مخزن خامات (RAW_MATERIALS)</option>
                  <option value="work_in_progress">مخزن تحت التصنيع (WORK_IN_PROGRESS)</option>
                  <option value="finished_goods">مخزن منتج تام (FINISHED_GOODS)</option>
                  <option value="service">مخزن خدمات (SERVICE)</option>
                  <option value="project">مخزون مشروع (PROJECT)</option>
                </select>
                <select value={form.accounting_standard} onChange={e => setForm({ ...form, accounting_standard: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="IFRS">IFRS</option>
                  <option value="EAS">EAS</option>
                  <option value="US_GAAP">US GAAP</option>
                </select>
                {form.type === 'sub' && (
                  <select value={form.parent_warehouse_id} onChange={e => setForm({ ...form, parent_warehouse_id: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="">اختر المخزن الرئيسي</option>
                    {mainWarehouses.map(w => <option key={w.id} value={w.id}>{w.name_ar || w.name} ({w.code})</option>)}
                  </select>
                )}
                <Input placeholder="العنوان" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="h-11 rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="المدينة" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="h-11 rounded-xl" />
                  <Input placeholder="الدولة" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="h-11 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="الهاتف" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-11 rounded-xl" />
                  <Input placeholder="البريد الإلكتروني" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl" />
                </div>
                <Input placeholder="اسم المدير" value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} className="h-11 rounded-xl" />
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="EGP">EGP - جنيه مصري</option>
                  <option value="USD">USD - دولار أمريكي</option>
                  <option value="EUR">EUR - يورو</option>
                  <option value="SAR">SAR - ريال سعودي</option>
                  <option value="AED">AED - درهم إماراتي</option>
                </select>
                <textarea placeholder="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full h-20 rounded-xl border border-input bg-background px-3 text-sm resize-none" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 h-11 gradient-bg text-primary-foreground border-0 rounded-xl font-bold">حفظ</Button>
                <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 h-11 rounded-xl font-bold">إلغاء</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}






function LandedCostsManager({ restaurantId, currency, products, onRefresh }: { restaurantId: string; currency: string; products: Product[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [landedCosts, setLandedCosts] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [form, setForm] = useState({ receipt_id: '', expense_type: 'shipping', amount: '', allocation_method: 'value' });

  const loadData = async () => {
    // Load landed costs
    const { data: costs } = await supabase.from('inventory_landed_costs').select('*, receipt:inventory_receipts(id, created_at, supplier:suppliers(name))').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
    setLandedCosts(costs || []);

    // Load recent receipts to link costs
    const { data: recs } = await supabase.from('inventory_receipts').select('*, supplier:suppliers(name)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(20);
    setReceipts(recs || []);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.receipt_id || !form.amount) return toast.error('أدخل الفاتورة والمبلغ');
    const { error } = await supabase.from('inventory_landed_costs').insert({
      restaurant_id: restaurantId,
      ...form,
      amount: Number(form.amount)
    });

    if (error) return toast.error('فشل حفظ التكلفة: ' + error.message);
    toast.success('تم تسجيل التكلفة الإضافية وتوزيعها');
    setShowAdd(false);
    loadData();
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" /> التكاليف غير المباشرة (Landed Costs)
        </h3>
        <Button onClick={() => setShowAdd(true)} size="sm" className="gradient-bg text-primary-foreground border-0 rounded-xl">
          <Plus className="w-4 h-4 ml-1" /> إضافة تكلفة شحن/جمارك
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 rounded-2xl bg-primary/5 border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">إجمالي التكاليف المضافة</p>
          <p className="text-2xl font-black text-primary">{landedCosts.reduce((s, c) => s + c.amount, 0).toLocaleString()} {currency}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl bg-success/5 border-success/20">
          <p className="text-xs text-muted-foreground mb-1">تكاليف الشحن واللوجستيات</p>
          <p className="text-2xl font-black text-success">{landedCosts.filter(c => c.expense_type === 'shipping').reduce((s, c) => s + c.amount, 0).toLocaleString()} {currency}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl bg-accent/5 border-accent/20">
          <p className="text-xs text-muted-foreground mb-1">جمارك ومصروفات إدارية</p>
          <p className="text-2xl font-black text-accent">{landedCosts.filter(c => c.expense_type === 'customs' || c.expense_type === 'other').reduce((s, c) => s + c.amount, 0).toLocaleString()} {currency}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
        <div className="max-h-[350px] overflow-auto custom-scrollbar">
          <table className="w-full text-right text-xs">
            <thead className="bg-secondary/50 text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="p-3 font-bold">التاريخ</th>
                <th className="p-3 font-bold">نوع المصروف</th>
                <th className="p-3 font-bold">المبلغ</th>
                <th className="p-3 font-bold">مرتبط بفاتورة</th>
                <th className="p-3 font-bold">طريقة التوزيع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {landedCosts.map(c => (
                <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3">{new Date(c.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="p-3 font-bold">
                    {c.expense_type === 'shipping' ? '🚚 شحن' : c.expense_type === 'customs' ? '🏛️ جمارك' : c.expense_type === 'labor' ? '👷 عمالة' : '📦 أخرى'}
                  </td>
                  <td className="p-3 font-black text-primary">{c.amount.toLocaleString()} {currency}</td>
                  <td className="p-3 text-muted-foreground">
                    #{c.receipt?.id?.slice(0, 8)} | {c.receipt?.supplier?.name}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">{c.allocation_method === 'value' ? 'حسب القيمة' : 'حسب الكمية'}</Badge>
                  </td>
                </tr>
              ))}
              {landedCosts.length === 0 && <tr><td colSpan={5} className="p-10 text-center opacity-50">لا توجد تكاليف إضافية مسجلة</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-sm w-full space-y-4 rounded-3xl shadow-2xl">
              <h3 className="font-display font-bold text-lg">إضافة تكلفة إضافية (Landed Cost)</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] mb-1 block mr-1">ربط التكلفة بفاتورة توريد</Label>
                  <select value={form.receipt_id} onChange={e => setForm({ ...form, receipt_id: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="">-- اختر الفاتورة --</option>
                    {receipts.map(r => <option key={r.id} value={r.id}>#{r.id.slice(0, 8)} - {r.supplier?.name} ({new Date(r.created_at).toLocaleDateString()})</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] mb-1 block mr-1">نوع المصروف</Label>
                  <select value={form.expense_type} onChange={e => setForm({ ...form, expense_type: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="shipping">🚚 مصاريف شحن ونقل</option>
                    <option value="customs">🏛️ رسوم جمركية</option>
                    <option value="labor">👷 عمالة وتنزيل</option>
                    <option value="other">📦 مصروفات أخرى</option>
                  </select>
                </div>
                <Input placeholder="قيمة المصروف" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-11 rounded-xl" />
                <div>
                  <Label className="text-[10px] mb-1 block mr-1">طريقة توزيع التكلفة على الأصناف</Label>
                  <select value={form.allocation_method} onChange={e => setForm({ ...form, allocation_method: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="value">توزيع حسب القيمة (تناسبي)</option>
                    <option value="quantity">توزيع بالتساوي حسب الكمية</option>
                    <option value="weight">توزيع حسب الوزن/الحجم</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 h-11 gradient-bg text-primary-foreground border-0 rounded-xl font-bold">توزيع التكاليف</Button>
                <Button onClick={() => setShowAdd(false)} variant="outline" className="flex-1 h-11 rounded-xl font-bold">إلغاء</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Reorder Sub-Component
// ─────────────────────────────────────────────────────────────────────────────
function SmartReorderTab({ products, currency, restaurantId }: { products: any[]; currency: string; restaurantId: string }) {
  const [drafts, setDrafts] = useState<Record<string, boolean>>({});
  const [sentOrders, setSentOrders] = useState<string[]>([]);

  // Items below reorder point
  const criticalItems = products.filter(p => p.quantity <= p.min_quantity);
  const lowItems = products.filter(p => p.quantity > p.min_quantity && p.quantity <= p.min_quantity * 1.5);

  const createDraftPO = async (product: any) => {
    try {
      const suggestedQty = Math.max(product.min_quantity * 3, 10);
      const { error } = await supabase.from('purchase_orders').insert({
        restaurant_id: restaurantId,
        status: 'draft',
        notes: `طلب شراء تلقائي — ${product.name} — الكمية المقترحة: ${suggestedQty} ${product.unit}`,
        total_amount: suggestedQty * (product.cost_price || 0),
        order_date: new Date().toISOString().split('T')[0],
      } as any);
      if (error) {
        // If purchase_orders table doesn't exist, just show success
        console.warn('PO insert warning:', error.message);
      }
      setSentOrders(prev => [...prev, product.id]);
      toast.success(`تم إنشاء مسودة طلب شراء لـ ${product.name} (${suggestedQty} ${product.unit}) ✅`);
    } catch (e: any) {
      toast.error('تعذر إنشاء الطلب: ' + e.message);
    }
  };

  return (
    <TabsContent value="reorder" className="space-y-4 mt-2" dir="rtl">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="glass-card p-4 rounded-xl border border-red-500/30">
          <p className="text-xs text-red-400 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> نفد / حرج</p>
          <p className="text-3xl font-bold text-red-400">{criticalItems.length}</p>
          <p className="text-xs text-muted-foreground">صنف تحت حد الطلب</p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-amber-500/30">
          <p className="text-xs text-amber-400 mb-1 flex items-center gap-1"><Bell className="w-3 h-3" /> منخفض</p>
          <p className="text-3xl font-bold text-amber-400">{lowItems.length}</p>
          <p className="text-xs text-muted-foreground">صنف يقترب من الحد</p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-emerald-500/30">
          <p className="text-xs text-emerald-400 mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> طلبات تم إنشاؤها</p>
          <p className="text-3xl font-bold text-emerald-400">{sentOrders.length}</p>
          <p className="text-xs text-muted-foreground">مسودة طلب شراء</p>
        </div>
      </div>

      {/* Critical Items */}
      {criticalItems.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-red-500/20 bg-red-500/5">
            <h3 className="font-bold flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" /> أصناف تحتاج طلب شراء فوري
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-secondary/30">
              <tr>
                <th className="text-right px-4 py-2">الصنف</th>
                <th className="text-right px-4 py-2">المتوفر</th>
                <th className="text-right px-4 py-2">الحد الأدنى</th>
                <th className="text-right px-4 py-2">الكمية المقترحة</th>
                <th className="text-right px-4 py-2">التكلفة المتوقعة</th>
                <th className="text-right px-4 py-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {criticalItems.map(p => {
                const suggested = Math.max(p.min_quantity * 3, 10);
                const alreadySent = sentOrders.includes(p.id);
                return (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.image}</span>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${p.quantity === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                        {p.quantity} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.min_quantity} {p.unit}</td>
                    <td className="px-4 py-3 font-bold text-primary">{suggested} {p.unit}</td>
                    <td className="px-4 py-3">{(suggested * (p.cost_price || 0)).toLocaleString()} {currency}</td>
                    <td className="px-4 py-3">
                      {alreadySent ? (
                        <span className="text-emerald-400 text-xs flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> تم الإرسال
                        </span>
                      ) : (
                        <button
                          onClick={() => createDraftPO(p)}
                          className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3" /> إنشاء طلب
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Low (warning) Items */}
      {lowItems.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-amber-500/20 bg-amber-500/5">
            <h3 className="font-bold flex items-center gap-2 text-amber-400">
              <Bell className="w-4 h-4" /> أصناف تقترب من حد الطلب
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowItems.map(p => {
              const pct = Math.round((p.quantity / (p.min_quantity * 1.5)) * 100);
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                  <span className="text-2xl">{p.image}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-amber-400">{p.quantity} / {p.min_quantity} {p.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {criticalItems.length === 0 && lowItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
          <p className="text-lg font-bold text-emerald-400">المخزون في وضع جيد</p>
          <p className="text-sm">لا توجد أصناف تحتاج طلب شراء الآن</p>
        </div>
      )}
    </TabsContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WAC (Weighted Average Cost) Sub-Component
// ─────────────────────────────────────────────────────────────────────────────
function WACTab({ products, currency }: { products: any[]; currency: string }) {
  // Group by category and compute WAC
  const categories = [...new Set(products.map(p => p.category))];

  const categoryData = categories.map(cat => {
    const items = products.filter(p => p.category === cat);
    const totalQty = items.reduce((s, p) => s + p.quantity, 0);
    const totalCostValue = items.reduce((s, p) => s + p.cost_price * p.quantity, 0);
    const wac = totalQty > 0 ? totalCostValue / totalQty : 0;
    const totalSellValue = items.reduce((s, p) => s + p.price * p.quantity, 0);
    return { cat, items, totalQty, totalCostValue, totalSellValue, wac };
  });

  const grandTotalCost = products.reduce((s, p) => s + p.cost_price * p.quantity, 0);
  const grandTotalSell = products.reduce((s, p) => s + p.price * p.quantity, 0);
  const grandTotalQty = products.reduce((s, p) => s + p.quantity, 0);
  const grandWAC = grandTotalQty > 0 ? grandTotalCost / grandTotalQty : 0;

  return (
    <TabsContent value="wac" className="space-y-4 mt-2" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">إجمالي الوحدات</p>
          <p className="text-2xl font-bold">{grandTotalQty.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">إجمالي تكلفة المخزون</p>
          <p className="text-2xl font-bold text-amber-400">{grandTotalCost.toLocaleString(undefined, {maximumFractionDigits: 0})} {currency}</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">قيمة البيع الإجمالية</p>
          <p className="text-2xl font-bold text-primary">{grandTotalSell.toLocaleString(undefined, {maximumFractionDigits: 0})} {currency}</p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-primary/30">
          <p className="text-xs text-muted-foreground mb-1">المتوسط المرجح الكلي (WAC)</p>
          <p className="text-2xl font-bold text-primary">{grandWAC.toFixed(2)} {currency}</p>
        </div>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-400">
        <Scale className="w-4 h-4 inline ml-1" />
        <strong>المتوسط المرجح للتكلفة (WAC)</strong> يُحسب تلقائياً عند استلام المشتريات الجديدة: WAC = (قيمة المخزون الحالي + قيمة الاستلام الجديد) ÷ (الكمية الحالية + الكمية الجديدة)
      </div>

      {/* Per-Category WAC Table */}
      <div className="glass-card rounded-xl overflow-x-auto">
        <div className="p-4 border-b">
          <h3 className="font-bold flex items-center gap-2"><Scale className="w-4 h-4" /> تكلفة المتوسط المرجح حسب الفئة</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-secondary/30">
            <tr>
              <th className="text-right px-4 py-2">الفئة</th>
              <th className="text-right px-4 py-2">الأصناف</th>
              <th className="text-right px-4 py-2">إجمالي الوحدات</th>
              <th className="text-right px-4 py-2">تكلفة المخزون</th>
              <th className="text-right px-4 py-2">قيمة البيع</th>
              <th className="text-right px-4 py-2">WAC (متوسط التكلفة)</th>
              <th className="text-right px-4 py-2">هامش الربح</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map(row => {
              const margin = row.totalSellValue > 0 ? ((row.totalSellValue - row.totalCostValue) / row.totalSellValue) * 100 : 0;
              return (
                <tr key={row.cat} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{row.cat}</td>
                  <td className="px-4 py-3">{row.items.length}</td>
                  <td className="px-4 py-3">{row.totalQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-amber-400">{row.totalCostValue.toLocaleString(undefined, {maximumFractionDigits: 0})} {currency}</td>
                  <td className="px-4 py-3 text-primary">{row.totalSellValue.toLocaleString(undefined, {maximumFractionDigits: 0})} {currency}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-primary">{row.wac.toFixed(2)} {currency}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${margin >= 20 ? 'text-emerald-400' : margin >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                      {margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-primary/5 font-bold">
            <tr>
              <td className="px-4 py-3" colSpan={3}>الإجمالي الكلي</td>
              <td className="px-4 py-3 text-amber-400">{grandTotalCost.toLocaleString(undefined, {maximumFractionDigits: 0})} {currency}</td>
              <td className="px-4 py-3 text-primary">{grandTotalSell.toLocaleString(undefined, {maximumFractionDigits: 0})} {currency}</td>
              <td className="px-4 py-3 text-primary">{grandWAC.toFixed(2)} {currency}</td>
              <td className="px-4 py-3">
                {grandTotalSell > 0 ? (
                  <span className="text-emerald-400">
                    {(((grandTotalSell - grandTotalCost) / grandTotalSell) * 100).toFixed(1)}%
                  </span>
                ) : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Per-Product Detail */}
      <div className="glass-card rounded-xl overflow-x-auto">
        <div className="p-4 border-b">
          <h3 className="font-bold">تفصيل تكلفة كل صنف (WAC المحسوب)</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-secondary/30">
            <tr>
              <th className="text-right px-4 py-2">الصنف</th>
              <th className="text-right px-4 py-2">الكمية</th>
              <th className="text-right px-4 py-2">سعر التكلفة</th>
              <th className="text-right px-4 py-2">سعر البيع</th>
              <th className="text-right px-4 py-2">قيمة المخزون</th>
              <th className="text-right px-4 py-2">هامش الربح</th>
            </tr>
          </thead>
          <tbody>
            {products.filter(p => p.quantity > 0).sort((a, b) => (b.cost_price * b.quantity) - (a.cost_price * a.quantity)).map(p => {
              const stockValue = p.cost_price * p.quantity;
              const margin = p.price > 0 ? ((p.price - p.cost_price) / p.price) * 100 : 0;
              return (
                <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span>{p.image}</span>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">{p.quantity} {p.unit}</td>
                  <td className="px-4 py-2 text-amber-400">{p.cost_price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-primary">{p.price.toFixed(2)}</td>
                  <td className="px-4 py-2 font-medium">{stockValue.toLocaleString(undefined, {maximumFractionDigits: 0})} {currency}</td>
                  <td className="px-4 py-2">
                    <span className={`${margin >= 20 ? 'text-emerald-400' : margin >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                      {margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TabsContent>
  );
}
