// @ts-nocheck
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
  id: string; name: string; price: number; category: string; image: string; icon_url?: string; in_stock?: boolean; quantity?: number; source?: 'menu' | 'product'; variables?: { label: string; value: string }[];
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
  const [trackingPixels, setTrackingPixels] = useState<any[]>([]);

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      // Use public view for restaurant info (now includes business_type)
      const { data: rest, error: restErr } = await supabase
        .from('restaurants_public')
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle();

      if (restErr) console.error('restaurants_public error:', restErr);
      if (!rest) {
        toast.error('المتجر غير متاح حالياً أو غير موجود');
        return;
      }

      setRestaurantName(rest.name || '');
      setRestaurantLogo(rest.logo_url || '');
      setCurrency(rest.currency || 'ج.م');

      const bizType = (rest as any).business_type || 'restaurant';
      const isFoodType = bizType === 'restaurant' || bizType === 'cafe';

      if (isFoodType) {
        const { data: menuData, error: mErr } = await supabase.from('public_menu_items' as any).select('*').eq('restaurant_id', restaurantId).order('sort_order');
        if (mErr) console.error('public_menu_items error:', mErr);
        const menuItems = (menuData || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          price: m.price,
          category: m.category,
          image: m.image,
          icon_url: m.icon_url,
          in_stock: m.in_stock,
          quantity: m.quantity,
          source: 'menu',
          variables: m.variables || []
        })) as MenuItem[];
        setItems(menuItems);
        setCategories([...new Set(menuItems.map(i => i.category).filter(Boolean))]);
      } else {
        const { data: prodData, error: pErr } = await supabase.from('public_products' as any).select('*').eq('restaurant_id', restaurantId).order('sort_order');
        if (pErr) console.error('public_products error:', pErr);
        const prods = (prodData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          category: p.category,
          image: p.image,
          icon_url: p.icon_url,
          in_stock: p.in_stock,
          quantity: p.quantity,
          source: 'product',
          variables: p.variables || []
        })) as MenuItem[];
        setItems(prods);
        setCategories([...new Set(prods.map(i => i.category).filter(Boolean))]);
      }

      // Load tracking pixels
      const { data: pixelsData, error: pixelsError } = await supabase.rpc('get_tracking_pixels', {
        p_restaurant_id: restaurantId,
        p_placement: 'storefront'
      });
      if (pixelsError) console.error('get_tracking_pixels error:', pixelsError);
      else setTrackingPixels(pixelsData || []);
    };
    load();
  }, [restaurantId]);

  // Inject tracking pixels into DOM
  useEffect(() => {
    trackingPixels.forEach(pixel => {
      if (pixel.platform === 'facebook' && pixel.pixel_id) {
        const script = document.createElement('script');
        script.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixel.pixel_id}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(script);
      } else if (pixel.platform === 'google_analytics' && pixel.pixel_id) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${pixel.pixel_id}`;
        document.head.appendChild(script);

        const script2 = document.createElement('script');
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${pixel.pixel_id}');
        `;
        document.head.appendChild(script2);
      } else if (pixel.platform === 'tiktok' && pixel.pixel_id) {
        const script = document.createElement('script');
        script.innerHTML = `
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify"],ttq.setAndDefer=function(t,e){t[e]=function(){this.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var s=0;s<ttq.methods.length;s++)ttq.setAndDefer(ttq,ttq.methods[s]);ttq.instance=function(t){for(var e=ttq._i[t]||[],o=0;o<ttq.methods.length;o++)ttq.setAndDefer(e,ttq.methods[o]);return ttq._i[t]=e},ttq.load=function(e,o){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=o||{};var n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a)};
          ttq.load('${pixel.pixel_id}', 'Tiktok');
          ttq.page();
        }(window, document, 'ttq');
        `;
        document.head.appendChild(script);
      }
    });
  }, [trackingPixels]);

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
      const { data, error } = await supabase.rpc('create_storefront_order', {
        p_restaurant_id: restaurantId,
          p_items: cart.map(c => ({
            menu_item_id: c.item.source === 'menu' ? c.item.id : null,
            product_id: c.item.source === 'product' ? c.item.id : null,
            name: c.item.name,
            image: c.item.image,
            price: c.item.price,
            quantity: c.qty,
            variables: c.item.variables || []
          })),
        p_customer_name: customerForm.name,
        p_customer_phone: customerForm.phone,
        p_delivery_address: customerForm.address || null,
        p_notes: customerForm.notes || null,
        p_order_type: customerForm.address ? 'delivery' : 'takeaway',
      });

      if (error) throw new Error(error.message);
      if (!data || !data.success) throw new Error('فشل إنشاء الطلب');

      setOrderPlaced(data.order_number);
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);
      toast.success('تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً');
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
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24" dir="rtl">
      {/* Header */}
      <div className="gradient-bg p-6 pb-10 rounded-b-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {restaurantLogo ? (
            <img src={restaurantLogo} alt="logo" className="w-14 h-14 rounded-xl object-contain bg-white/20 shadow-lg" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center shadow-lg">
              <Store className="w-7 h-7 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-primary-foreground">{restaurantName || 'المتجر'}</h1>
            <p className="text-sm text-primary-foreground/70">🛒 تصفّح واطلب مباشرة</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 bg-background/90 border-0 shadow-lg" />
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
            className="glass-card p-3 flex flex-col hover:shadow-lg transition-shadow cursor-pointer">
            {item.icon_url ? (
              <img src={item.icon_url} alt={item.name} className="w-full h-24 object-contain rounded-lg bg-secondary mb-2" />
            ) : (
              <div className="text-5xl w-full h-24 flex items-center justify-center rounded-lg bg-secondary mb-2">{item.image}</div>
            )}
            <h3 className="font-medium text-sm truncate">{item.name}</h3>
            <p className="text-xs text-muted-foreground">{item.category}</p>
            {item.in_stock === false && (
              <span className="text-xs text-destructive mt-1">غير متوفر</span>
            )}
            {item.quantity !== undefined && item.quantity > 0 && (
              <p className="text-xs text-muted-foreground mt-1">متوفر: {item.quantity}</p>
            )}
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
