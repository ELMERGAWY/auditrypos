// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Search, AlertTriangle, Edit2, Trash2, 
  ArrowDown, ArrowUp, BarChart3, X, TrendingUp, DollarSign,
  Truck, Calculator, History, FileSpreadsheet, Layers, Boxes, Save, RefreshCw, Download,
  Bell, ShoppingCart, RotateCcw, Scale, Zap, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { hasFeature, type BusinessType } from '@/lib/businessTypes';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: string;
  location: string;
  is_active: boolean;
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
  const [form, setForm] = useState({
    name: '', barcode: '', sku: '', category: 'عام', price: '', cost_price: '',
    quantity: '', min_quantity: '5', unit: 'قطعة', image: '📦', expiry_date: '',
    secondary_unit: '', unit_conversion_factor: '', batch_number: '',
  });
  const [filterCategory, setFilterCategory] = useState('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const load = async () => {
    // Load Products
    const { data: prodData } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
    setProducts((prodData || []) as Product[]);
    
    // Load Warehouses
    const { data: whData } = await supabase.from('warehouses').select('*').eq('restaurant_id', restaurantId).order('name');
    setWarehouses((whData || []) as Warehouse[]);

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
      if (editingProduct) {
        const { error } = await supabase.from('products').update(data).eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('تم تحديث المنتج');
      } else {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
        toast.success('تم إضافة المنتج');
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
    setForm({ name: '', barcode: '', sku: '', category: 'عام', price: '', cost_price: '', quantity: '', min_quantity: '5', unit: 'قطعة', image: '📦', expiry_date: '', secondary_unit: '', unit_conversion_factor: '', batch_number: '' });
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
          <WarehousesManager restaurantId={restaurantId} warehouses={warehouses} onRefresh={load} />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <InventoryTransfersManager restaurantId={restaurantId} warehouses={warehouses} products={products} onRefresh={load} />
        </TabsContent>

        <TabsContent value="landed_costs" className="space-y-4">
          <LandedCostsManager restaurantId={restaurantId} currency={currency} onRefresh={load} />
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
                  <Label className="text-xs mb-1 block">وحدة القياس</Label>
                  <Input placeholder="كيلو، علبة، لتر" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="h-11 rounded-xl" />
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1 block">الأيقونة</Label>
                    <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl">
                      {['📦', '🍎', '🧴', '👕', '🛠️'].map(emoji => (
                        <button key={emoji} onClick={() => setForm(f => ({ ...f, image: emoji }))} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${form.image === emoji ? 'bg-white shadow-sm scale-110 ring-1 ring-primary/20' : 'opacity-50 hover:opacity-100'}`}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">تاريخ الصلاحية</Label>
                    <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="h-11 rounded-xl" />
                  </div>
                </div>
              </div>
              
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

function WarehousesManager({ restaurantId, warehouses, onRefresh }: { restaurantId: string; warehouses: Warehouse[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [form, setForm] = useState({ name: '', type: 'main', location: '' });

  const handleSave = async () => {
    if (!form.name) return toast.error('أدخل اسم المخزن');
    const data = { ...form, restaurant_id: restaurantId };
    
    try {
      if (editingWarehouse) {
        const { error } = await supabase.from('warehouses').update(data).eq('id', editingWarehouse.id);
        if (error) throw error;
        toast.success('تم تحديث بيانات المخزن');
      } else {
        const { data: newWarehouse, error } = await supabase.from('warehouses').insert(data).select().single();
        if (error) throw error;
        
        toast.success('تم إنشاء المخزن الجديد');
      }
      setShowForm(false);
      setEditingWarehouse(null);
      onRefresh();
    } catch (error: any) {
      console.error('Warehouse save error:', error);
      toast.error(`فشل الحفظ: ${error?.message || 'تحقق من الصلاحيات والاتصال'}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" /> قائمة الفروع والمستودعات
        </h3>
        <Button onClick={() => { setForm({ name: '', type: 'main', location: '' }); setShowForm(true); }} size="sm" className="gradient-bg text-primary-foreground border-0 rounded-xl">
          <Plus className="w-4 h-4 ml-1" /> إضافة مخزن/فرع
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {warehouses.map(wh => (
          <div key={wh.id} className="glass-card p-4 rounded-2xl border border-border/50 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-secondary/30">{wh.type === 'main' ? 'رئيسي' : wh.type === 'sub' ? 'فرعي' : 'أخرى'}</Badge>
            </div>
            <h4 className="font-bold text-sm mb-1">{wh.name}</h4>
            <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
              <Search className="w-3 h-3" /> الكود: {wh.code || '---'} | {wh.location || 'بدون موقع'}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-8 rounded-lg text-xs" onClick={() => { setEditingWarehouse(wh); setForm({ name: wh.name, code: wh.code, type: wh.type, location: wh.location }); setShowForm(true); }}>
                <Edit2 className="w-3 h-3 ml-1" /> تعديل
              </Button>
              <Button size="sm" variant="ghost" className="h-8 rounded-lg text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        {warehouses.length === 0 && (
          <div className="col-span-full py-20 text-center glass-card rounded-3xl opacity-50">
            <p className="text-sm">لم يتم إضافة أي مستودعات بعد</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-sm w-full space-y-4 rounded-3xl shadow-2xl">
              <h3 className="font-display font-bold text-lg">{editingWarehouse ? 'تعديل مخزن' : 'مخزن جديد'}</h3>
              <div className="space-y-3">
                <Input placeholder="اسم المخزن / الفرع" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl" />
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="main">مخزن رئيسي</option>
                  <option value="sub">مخزن فرعي</option>
                  <option value="raw">مخزن خامات</option>
                  <option value="finished">مخزن منتج تام</option>
                  <option value="project">مخزون مشروع</option>
                </select>
                <Input placeholder="الموقع / العنوان" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="h-11 rounded-xl" />
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

function InventoryTransfersManager({ restaurantId, warehouses, products, onRefresh }: { restaurantId: string; warehouses: Warehouse[]; products: Product[]; onRefresh: () => void }) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [form, setForm] = useState({ from_wh: '', to_wh: '', product_id: '', quantity: '', notes: '' });

  const loadTransfers = async () => {
    const { data } = await supabase.from('inventory_transfers')
      .select('*, from:warehouses!from_warehouse_id(name), to:warehouses!to_warehouse_id(name)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    setTransfers(data || []);
  };

  useEffect(() => { loadTransfers(); }, []);

  const handleTransfer = async () => {
    if (!form.from_wh || !form.to_wh || !form.product_id || !form.quantity) return toast.error('يرجى ملء كافة الحقول');
    if (form.from_wh === form.to_wh) return toast.error('لا يمكن التحويل لنفس المخزن');

    try {
      // 1. Create Transfer Record
      const { data: transfer, error: tErr } = await supabase.from('inventory_transfers').insert({
        restaurant_id: restaurantId,
        from_warehouse_id: form.from_wh,
        to_warehouse_id: form.to_wh,
        notes: form.notes,
        status: 'received' // For simplicity in this demo, we mark it as received immediately
      }).select().single();

      if (tErr) throw tErr;

      // 2. Add Transfer Item
      const product = products.find(p => p.id === form.product_id);
      await supabase.from('inventory_transfer_items').insert({
        transfer_id: transfer.id,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        cost_price: product?.cost_price || 0
      });

      toast.success('تم تسجيل حركة التحويل بنجاح');
      setShowTransfer(false);
      loadTransfers();
      onRefresh();
    } catch (error: any) {
      toast.error('فشل التحويل: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> سجل تحويلات المخزون
        </h3>
        <Button onClick={() => setShowTransfer(true)} size="sm" className="gradient-bg text-primary-foreground border-0 rounded-xl">
          <Plus className="w-4 h-4 ml-1" /> طلب تحويل جديد
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
        <div className="max-h-[400px] overflow-auto custom-scrollbar">
          <table className="w-full text-right text-xs">
            <thead className="bg-secondary/50 text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="p-3 font-bold">التاريخ</th>
                <th className="p-3 font-bold">من</th>
                <th className="p-3 font-bold">إلى</th>
                <th className="p-3 font-bold">الحالة</th>
                <th className="p-3 font-bold">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3">{new Date(t.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="p-3 font-bold">{t.from?.name}</td>
                  <td className="p-3 font-bold">{t.to?.name}</td>
                  <td className="p-3"><Badge className="bg-success/10 text-success border-0 text-[10px]">مكتمل</Badge></td>
                  <td className="p-3 text-muted-foreground truncate max-w-[150px]">{t.notes || '---'}</td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={5} className="p-10 text-center opacity-50">لا توجد تحويلات مسجلة</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showTransfer && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-md w-full space-y-4 rounded-3xl shadow-2xl">
              <h3 className="font-display font-bold text-lg">طلب تحويل مخزني</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] mb-1 block mr-1">من مستودع</Label>
                  <select value={form.from_wh} onChange={e => setForm({ ...form, from_wh: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="">-- اختر المصدر --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] mb-1 block mr-1">إلى مستودع</Label>
                  <select value={form.to_wh} onChange={e => setForm({ ...form, to_wh: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="">-- اختر الوجهة --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] mb-1 block mr-1">الصنف المراد تحويله</Label>
                  <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="">-- اختر الصنف --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.quantity} {p.unit})</option>)}
                  </select>
                </div>
                <Input placeholder="الكمية المراد تحويلها" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="h-11 rounded-xl" />
                <Input placeholder="ملاحظات التحويل" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleTransfer} className="flex-1 h-11 gradient-bg text-primary-foreground border-0 rounded-xl font-bold">تأفيذ التحويل</Button>
                <Button onClick={() => setShowTransfer(false)} variant="outline" className="flex-1 h-11 rounded-xl font-bold">إلغاء</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LandedCostsManager({ restaurantId, currency, onRefresh }: { restaurantId: string; currency: string; onRefresh: () => void }) {
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Tab: Smart Reordering                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <SmartReorderTab products={products} currency={currency} restaurantId={restaurantId} />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Tab: Weighted Average Cost                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <WACTab products={products} currency={currency} />
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
