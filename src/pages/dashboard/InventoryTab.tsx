import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Search, AlertTriangle, Edit2, Trash2, ArrowDown, ArrowUp, BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function InventoryTab({ restaurantId, currency }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showMovement, setShowMovement] = useState<Product | null>(null);
  const [movementQty, setMovementQty] = useState('');
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementReason, setMovementReason] = useState('');
  const [form, setForm] = useState({
    name: '', barcode: '', sku: '', category: 'عام', price: '', cost_price: '',
    quantity: '', min_quantity: '5', unit: 'قطعة', image: '📦', expiry_date: '',
  });
  const [filterCategory, setFilterCategory] = useState('all');

  const load = async () => {
    const { data } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
    setProducts((data || []) as Product[]);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const categories = [...new Set(products.map(p => p.category))];
  const lowStock = products.filter(p => p.quantity <= p.min_quantity && p.quantity > 0);
  const outOfStock = products.filter(p => p.quantity === 0);
  const totalValue = products.reduce((s, p) => s + p.price * p.quantity, 0);
  const totalCost = products.reduce((s, p) => s + p.cost_price * p.quantity, 0);

  const filtered = products.filter(p => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.barcode.includes(search)) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.name) { toast.error('أدخل اسم المنتج'); return; }
    const data = {
      restaurant_id: restaurantId,
      name: form.name, barcode: form.barcode, sku: form.sku, category: form.category,
      price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0,
      quantity: Number(form.quantity) || 0, min_quantity: Number(form.min_quantity) || 5,
      unit: form.unit, image: form.image,
      expiry_date: form.expiry_date || null,
    };
    if (editingProduct) {
      await supabase.from('products').update(data).eq('id', editingProduct.id);
      toast.success('تم تحديث المنتج');
    } else {
      await supabase.from('products').insert(data);
      toast.success('تم إضافة المنتج');
    }
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا المنتج?')) return;
    await supabase.from('products').delete().eq('id', id);
    toast.success('تم الحذف');
    load();
  };

  const handleMovement = async () => {
    if (!showMovement || !movementQty) return;
    const qty = Number(movementQty);
    const newQty = movementType === 'in' ? showMovement.quantity + qty : Math.max(0, showMovement.quantity - qty);
    await supabase.from('products').update({ quantity: newQty }).eq('id', showMovement.id);
    await supabase.from('stock_movements').insert({
      product_id: showMovement.id, restaurant_id: restaurantId,
      type: movementType, quantity: qty, reason: movementReason,
    });
    toast.success(movementType === 'in' ? 'تم إضافة الكمية' : 'تم صرف الكمية');
    setShowMovement(null); setMovementQty(''); setMovementReason('');
    load();
  };

  const resetForm = () => {
    setShowForm(false); setEditingProduct(null);
    setForm({ name: '', barcode: '', sku: '', category: 'عام', price: '', cost_price: '', quantity: '', min_quantity: '5', unit: 'قطعة', image: '📦', expiry_date: '' });
  };

  const startEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name, barcode: p.barcode, sku: p.sku, category: p.category,
      price: String(p.price), cost_price: String(p.cost_price), quantity: String(p.quantity),
      min_quantity: String(p.min_quantity), unit: p.unit, image: p.image,
      expiry_date: p.expiry_date ? p.expiry_date.split('T')[0] : '',
    });
    setShowForm(true);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي المنتجات', value: products.length, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'قيمة المخزون (بيع)', value: `${totalValue.toLocaleString()} ${currency}`, icon: BarChart3, color: 'text-success', bg: 'bg-success/10' },
          { label: 'تكلفة المخزون', value: `${totalCost.toLocaleString()} ${currency}`, icon: BarChart3, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'مخزون منخفض', value: lowStock.length, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'نفد المخزون', value: outOfStock.length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
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
        <div className="glass-card p-3 border-warning/30 bg-warning/5">
          <p className="text-xs font-bold text-warning mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> تنبيه: منتجات مخزونها منخفض</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(p => (
              <Badge key={p.id} variant="outline" className="text-xs text-warning border-warning/30">
                {p.image} {p.name} ({p.quantity} {p.unit})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilterCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${filterCategory === 'all' ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>الكل ({products.length})</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${filterCategory === cat ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
              {cat} ({products.filter(p => p.category === cat).length})
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو باركود..." className="pr-10 h-9 text-xs" />
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gradient-bg text-primary-foreground border-0" size="sm">
            <Plus className="w-4 h-4 ml-1" /> إضافة
          </Button>
        </div>
      </div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => resetForm()}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-auto space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg">{editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Input placeholder="اسم المنتج *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <Input placeholder="باركود" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
                <Input placeholder="SKU" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                <Input placeholder="سعر البيع" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                <Input placeholder="سعر التكلفة" type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} />
                <Input placeholder="الكمية" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                <Input placeholder="الحد الأدنى" type="number" value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))} />
                <Input placeholder="الفئة" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                <Input placeholder="الوحدة" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">تاريخ الصلاحية (اختياري)</label>
                  <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 gradient-bg text-primary-foreground border-0">{editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}</Button>
                <Button variant="outline" onClick={resetForm} className="flex-1">إلغاء</Button>
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
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold">حركة مخزون — {showMovement.name}</h3>
              <p className="text-sm text-muted-foreground">الكمية الحالية: <span className="font-bold text-foreground">{showMovement.quantity} {showMovement.unit}</span></p>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button onClick={() => setMovementType('in')} className={`flex-1 py-2 text-sm transition-colors ${movementType === 'in' ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>
                  <ArrowDown className="w-4 h-4 inline ml-1" /> إضافة (وارد)
                </button>
                <button onClick={() => setMovementType('out')} className={`flex-1 py-2 text-sm transition-colors ${movementType === 'out' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary'}`}>
                  <ArrowUp className="w-4 h-4 inline ml-1" /> صرف (صادر)
                </button>
              </div>
              <Input placeholder="الكمية" type="number" value={movementQty} onChange={e => setMovementQty(e.target.value)} />
              <Input placeholder="السبب (اختياري)" value={movementReason} onChange={e => setMovementReason(e.target.value)} />
              <Button onClick={handleMovement} className="w-full gradient-bg text-primary-foreground border-0">تأكيد الحركة</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Grid */}
      <div className="space-y-2">
        {filtered.map(p => {
          const isLow = p.quantity <= p.min_quantity && p.quantity > 0;
          const isOut = p.quantity === 0;
          const isExpired = p.expiry_date && new Date(p.expiry_date) < new Date();
          const profit = p.price - p.cost_price;
          return (
            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`glass-card p-3 flex items-center gap-3 ${isOut ? 'opacity-60' : ''} ${isExpired ? 'border-destructive/30' : isLow ? 'border-warning/30' : ''}`}>
              <span className="text-2xl">{p.image}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm truncate">{p.name}</p>
                  {p.barcode && <code className="text-[10px] text-muted-foreground">{p.barcode}</code>}
                  {isOut && <Badge className="text-[10px] status-suspended">نفد</Badge>}
                  {isLow && !isOut && <Badge className="text-[10px] status-pending">منخفض</Badge>}
                  {isExpired && <Badge className="text-[10px] status-suspended">منتهي الصلاحية</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{p.category}</span>
                  <span className="text-primary font-bold">{p.price} {currency}</span>
                  <span>تكلفة: {p.cost_price} {currency}</span>
                  <span className={profit >= 0 ? 'text-success' : 'text-destructive'}>ربح: {profit} {currency}</span>
                  <span>الكمية: <strong className={isLow ? 'text-warning' : ''}>{p.quantity}</strong> {p.unit}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setShowMovement(p)} title="حركة مخزون"><Package className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(p)}><Edit2 className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد منتجات</p>}
      </div>
    </div>
  );
}
