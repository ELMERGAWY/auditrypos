import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Plus, Minus, Trash2, Send, CheckCircle, Phone, MapPin, User, StickyNote, X, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MenuItem {
  id: string; name: string; price: number; category: string; image: string;
}

interface CartItem { item: MenuItem; qty: number; }

const StoreFront = () => {
  const { restaurantId } = useParams();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantLogo, setRestaurantLogo] = useState('');
  const [currency, setCurrency] = useState('ج.م');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '', notes: '' });

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      // Use public view for restaurant info
      const { data: rest } = await supabase.from('restaurants_public').select('*').eq('id', restaurantId).maybeSingle();
      if (rest) {
        setRestaurantName(rest.name || '');
        setRestaurantLogo(rest.logo_url || '');
        setCurrency(rest.currency || 'ج.م');
      }
      const { data: menuData } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).eq('available', true).order('sort_order');
      const menuItems = (menuData || []) as MenuItem[];
      setItems(menuItems);
      setCategories([...new Set(menuItems.map(i => i.category))]);
    };
    load();
  }, [restaurantId]);

  const filtered = items.filter(i => {
    if (selectedCat !== 'all' && i.category !== selectedCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { item, qty: 1 }];
    });
    toast.success(`تمت الإضافة: ${item.name}`);
  };

  const updateQty = (id: string, d: number) =>
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: Math.max(0, c.qty + d) } : c).filter(c => c.qty > 0));

  const cartTotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const handleCheckout = async () => {
    if (!customerForm.name || !customerForm.phone) {
      toast.error('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'nmkjyweoagbblkbqavdz';
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/storefront-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            items: cart.map(c => ({ name: c.item.name, image: c.item.image, price: c.item.price, quantity: c.qty })),
            customer_name: customerForm.name,
            customer_phone: customerForm.phone,
            delivery_address: customerForm.address,
            notes: customerForm.notes,
            order_type: customerForm.address ? 'delivery' : 'takeaway',
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOrderPlaced(data.order_number);
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="font-display text-2xl font-bold">تم إرسال طلبك! 🎉</h2>
          <p className="text-muted-foreground">رقم الطلب</p>
          <p className="font-display text-3xl font-bold text-primary">#{orderPlaced.slice(-4)}</p>
          <p className="text-sm text-muted-foreground">سيتم مراجعة طلبك والتواصل معك قريباً</p>
          <Button onClick={() => { setOrderPlaced(null); setCustomerForm({ name: '', phone: '', address: '', notes: '' }); }}
            className="gradient-bg text-primary-foreground border-0 w-full">
            طلب جديد
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Header */}
      <div className="gradient-bg p-6 pb-10 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          {restaurantLogo ? (
            <img src={restaurantLogo} alt="logo" className="w-12 h-12 rounded-xl object-contain bg-white/20" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="font-display text-xl font-bold text-primary-foreground">{restaurantName || 'المتجر'}</h1>
            <p className="text-sm text-primary-foreground/70">تصفّح واطلب مباشرة</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 bg-background/90 border-0" />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-4 -mt-4 overflow-x-auto pb-2">
        <button onClick={() => setSelectedCat('all')}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-sm transition-colors ${selectedCat === 'all' ? 'gradient-bg text-primary-foreground' : 'bg-card text-card-foreground border border-border'}`}>
          الكل
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCat(cat)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-sm transition-colors ${selectedCat === cat ? 'gradient-bg text-primary-foreground' : 'bg-card text-card-foreground border border-border'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="glass-card p-3 flex flex-col">
            <div className="text-4xl w-full h-20 flex items-center justify-center rounded-lg bg-secondary mb-2">{item.image}</div>
            <h3 className="font-medium text-sm truncate">{item.name}</h3>
            <p className="text-xs text-muted-foreground">{item.category}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="font-display font-bold text-primary">{item.price} {currency}</p>
              <Button size="sm" className="gradient-bg text-primary-foreground border-0 h-8 w-8 p-0" onClick={() => addToCart(item)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">لا توجد نتائج</p>}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 gradient-bg text-primary-foreground rounded-full px-6 py-4 shadow-2xl flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <span className="font-bold">{cartCount}</span>
          <span className="text-sm">|</span>
          <span className="font-bold">{cartTotal} {currency}</span>
        </motion.button>
      )}

      {/* Cart Sheet */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setShowCart(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[80vh] overflow-auto p-6 space-y-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" /> سلة المشتريات ({cartCount})
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setShowCart(false)}><X className="w-5 h-5" /></Button>
              </div>

              {cart.map(c => (
                <div key={c.item.id} className="flex items-center gap-3 py-2 border-b border-border">
                  <span className="text-2xl">{c.item.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.item.name}</p>
                    <p className="text-xs text-primary font-bold">{c.item.price} {currency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(c.item.id, -1)}>
                      {c.qty === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                    </Button>
                    <span className="font-bold text-sm w-6 text-center">{c.qty}</span>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(c.item.id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="font-bold text-sm w-16 text-left">{(c.item.price * c.qty).toFixed(0)} {currency}</p>
                </div>
              ))}

              <div className="flex justify-between font-display font-bold text-lg pt-2">
                <span>الإجمالي</span>
                <span className="text-primary">{cartTotal} {currency}</span>
              </div>

              <Button onClick={() => { setShowCart(false); setShowCheckout(true); }}
                className="w-full gradient-bg text-primary-foreground border-0 h-12 text-base">
                <Send className="w-5 h-5 ml-2" /> متابعة الطلب
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCheckout(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg">تأكيد الطلب</h3>

              <div className="space-y-3">
                <div className="relative">
                  <User className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="الاسم *" value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} className="pr-10" />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="رقم الهاتف *" value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} className="pr-10" />
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="عنوان التوصيل (اختياري)" value={customerForm.address} onChange={e => setCustomerForm(f => ({ ...f, address: e.target.value }))} className="pr-10" />
                </div>
                <div className="relative">
                  <StickyNote className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
                  <Input placeholder="ملاحظات (اختياري)" value={customerForm.notes} onChange={e => setCustomerForm(f => ({ ...f, notes: e.target.value }))} className="pr-10" />
                </div>
              </div>

              <div className="glass-card p-3 space-y-1">
                {cart.map(c => (
                  <div key={c.item.id} className="flex justify-between text-sm">
                    <span>{c.item.image} {c.item.name} × {c.qty}</span>
                    <span>{(c.item.price * c.qty).toFixed(0)} {currency}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t border-border">
                  <span>الإجمالي</span>
                  <span className="text-primary">{cartTotal} {currency}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCheckout} disabled={loading}
                  className="flex-1 gradient-bg text-primary-foreground border-0 h-12">
                  {loading ? 'جاري الإرسال...' : '✅ تأكيد الطلب'}
                </Button>
                <Button variant="outline" onClick={() => setShowCheckout(false)} className="flex-1">إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreFront;
