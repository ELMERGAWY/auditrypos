// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  // ── Anonymous visitor ID (for retargeting & cart persistence) ──────────────
  const CART_KEY = `sf_cart_${restaurantId}`;
  const VISITOR_KEY = 'sf_visitor_id';

  const getOrCreateVisitorId = (): string => {
    let vid = localStorage.getItem(VISITOR_KEY);
    if (!vid) {
      vid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, vid);
    }
    return vid;
  };

  const visitorId = useRef<string>(getOrCreateVisitorId());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic Google Font Load
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // ── Restore cart from localStorage on first mount ──────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed: CartItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
          toast.info(`🛝 تم استعادة سلتك (${parsed.length} صنف)`, { duration: 3000 });
        }
      }
    } catch {
      // Ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

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
      else {
        setTrackingPixels(pixelsData || []);
      }
      
      // Track PageView & ViewContent
      trackPixelEvent('PageView');
      trackPixelEvent('ViewContent', {
        content_name: rest?.name || 'المتجر',
        content_type: 'store',
        currency: rest?.currency || 'ج.م'
      });
    };
    load();
  }, [restaurantId]);

  // Event tracking helper across all active platforms
  const trackPixelEvent = (eventName: string, eventData: any = {}) => {
    try {
      trackingPixels.forEach(pixel => {
        if (!pixel.is_active || !pixel.pixel_id) return;
        const { platform } = pixel;

        if (platform === 'facebook' && typeof window.fbq === 'function') {
          window.fbq('track', eventName, eventData);
        }
        if (platform === 'google_analytics' && typeof window.gtag === 'function') {
          window.gtag('event', eventName, eventData);
        }
        if (platform === 'tiktok' && typeof window.ttq === 'object') {
          window.ttq.track(eventName, eventData);
        }
        if (platform === 'snapchat' && typeof window.snaptr === 'function') {
          let snapEvent = eventName;
          if (eventName === 'PageView') snapEvent = 'PAGE_VIEW';
          else if (eventName === 'AddToCart') snapEvent = 'ADD_CART';
          else if (eventName === 'InitiateCheckout') snapEvent = 'START_CHECKOUT';
          else if (eventName === 'Purchase') snapEvent = 'PURCHASE';
          window.snaptr('track', snapEvent, eventData);
        }
        if (platform === 'twitter' && typeof window.twq === 'function') {
          window.twq('track', eventName, eventData);
        }
        if (platform === 'pinterest' && typeof window.pintr === 'function') {
          window.pintr('track', eventName, eventData);
        }
      });
      console.log(`[Pixel Event] ${eventName}`, eventData);
    } catch (e) {
      console.error('[Pixel Event Error]', e);
    }
  };

  // Inject tracking pixels into DOM
  useEffect(() => {
    trackingPixels.forEach(pixel => {
      if (!pixel.is_active || !pixel.pixel_id) return;

      const { platform, pixel_id } = pixel;

      // Facebook
      if (platform === 'facebook') {
        if (!window.fbq) {
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
            fbq('init', '${pixel_id}');
            fbq('track', 'PageView');
          `;
          document.head.appendChild(script);
        } else {
          window.fbq('init', pixel_id);
          window.fbq('track', 'PageView');
        }
      } 
      // Google Analytics
      else if (platform === 'google_analytics') {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${pixel_id}`;
        document.head.appendChild(script);

        const script2 = document.createElement('script');
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${pixel_id}');
        `;
        document.head.appendChild(script2);
      } 
      // TikTok
      else if (platform === 'tiktok') {
        const script = document.createElement('script');
        script.innerHTML = `
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify"],ttq.setAndDefer=function(t,e){t[e]=function(){this.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var s=0;s<ttq.methods.length;s++)ttq.setAndDefer(ttq,ttq.methods[s]);ttq.instance=function(t){for(var e=ttq._i[t]||[],o=0;o<ttq.methods.length;o++)ttq.setAndDefer(e,ttq.methods[o]);return ttq._i[t]=e},ttq.load=function(e,o){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=o||{};var n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a)};
            ttq.load('${pixel_id}', 'Tiktok');
            ttq.page();
          }(window, document, 'ttq');
        `;
        document.head.appendChild(script);
      }
      // Twitter/X
      else if (platform === 'twitter') {
        const script = document.createElement('script');
        script.innerHTML = `
          !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)
          },s.version='1.1',a=t.createElement(n),a.async=!0,a.src='https://static.ads-twitter.com/uwt.js',
          u=t.getElementsByTagName(n)[0],u.parentNode.insertBefore(a,u))}(window,document,'script');
          twq('config','${pixel_id}');
        `;
        document.head.appendChild(script);
      }
      // LinkedIn
      else if (platform === 'linkedin') {
        const script = document.createElement('script');
        script.innerHTML = `
          _linkedin_partner_id = "${pixel_id}";
          window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
          window._linkedin_data_partner_ids.push(_linkedin_partner_id);
          (function(l) {
          if (!l.nodeType) {return;}
          var s = document.getElementsByTagName("script")[0];
          var b = document.createElement("script");
          b.type = "text/javascript";b.async = true;
          b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
          s.parentNode.insertBefore(b, s);})(window.lintrk || {});
        `;
        document.head.appendChild(script);
      }
      // Snapchat
      else if (platform === 'snapchat') {
        const script = document.createElement('script');
        script.innerHTML = `
          (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
          {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
          a.queue=[];var s=t.createElement(n);s.async=!0;
          s.src="https://sc-static.net/scevent.min.js";
          var r=t.getElementsByTagName(n)[0];r.parentNode.insertBefore(s,r)})(window,document,"script");
          snaptr('init', '${pixel_id}');
          snaptr('track', 'PAGE_VIEW');
        `;
        document.head.appendChild(script);
      }
      // Pinterest
      else if (platform === 'pinterest') {
        const script = document.createElement('script');
        script.innerHTML = `
          !function(e){if(!window.pintr){window.pintr=function(){window.pintr.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintr;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src="https://s.yjtag.jp/tag.js";var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}(window);
          pintr('load', '${pixel_id}');
          pintr('page');
        `;
        document.head.appendChild(script);
      }
      // Custom
      else if (platform === 'custom') {
        const div = document.createElement('div');
        div.innerHTML = pixel_id;
        document.body.appendChild(div);
      }
    });
  }, [trackingPixels]);

  // ── Persist cart to localStorage on every change ──────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    try {
      if (cart.length > 0) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
      } else {
        localStorage.removeItem(CART_KEY);
      }
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }, [cart, restaurantId]);

  // ── Debounced sync to Supabase abandoned_carts (fire-and-forget) ──────────
  const syncAbandonedCart = useCallback((currentCart: CartItem[]) => {
    if (!restaurantId) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        const total = currentCart.reduce((s, c) => s + c.item.price * c.qty, 0);
        const count = currentCart.reduce((s, c) => s + c.qty, 0);
        if (count === 0) return;
        await supabase.rpc('upsert_abandoned_cart', {
          p_restaurant_id: restaurantId,
          p_visitor_id:    visitorId.current,
          p_cart_items:    currentCart.map(c => ({
            item_id: c.item.id,
            name:    c.item.name,
            price:   c.item.price,
            qty:     c.qty,
            image:   c.item.image,
            category: c.item.category,
          })),
          p_cart_total:    total,
          p_item_count:    count,
        });
      } catch {
        // Non-critical – silent fail
      }
    }, 3000); // wait 3 s of inactivity before syncing
  }, [restaurantId]);

  const filtered = items.filter(i => {
    if (selectedCat !== 'all' && i.category !== selectedCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      const next = existing
        ? prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
        : [...prev, { item, qty: 1 }];
      syncAbandonedCart(next);
      return next;
    });
    
    // Track AddToCart event
    trackPixelEvent('AddToCart', {
      content_name: item.name,
      content_ids: [item.id],
      content_type: 'product',
      value: item.price,
      currency: currency
    });
    
    toast.success(`تمت الإضافة: ${item.name}`);
  };

  const updateQty = (id: string, d: number) => {
    setCart(prev => {
      const next = prev
        .map(c => c.item.id === id ? { ...c, qty: Math.max(0, c.qty + d) } : c)
        .filter(c => c.qty > 0);
      syncAbandonedCart(next);
      return next;
    });
  };

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
        p_delivery_address: customerForm.address || '',
        p_notes: customerForm.notes || '',
        p_order_type: customerForm.address && customerForm.address !== 'العنوان بالتفصيل' ? 'delivery' : 'takeaway',
      });

      if (error) throw new Error(error.message);
      if (!data || !data.success) throw new Error('فشل إنشاء الطلب');

      // Track Purchase event
      trackPixelEvent('Purchase', {
        value: cartTotal,
        currency: currency,
        content_type: 'product',
        num_items: cartCount,
        order_number: data.order_number
      });

      // Mark cart as converted in Supabase (no longer abandoned)
      try {
        await supabase.rpc('mark_cart_converted', {
          p_restaurant_id: restaurantId,
          p_visitor_id: visitorId.current,
        });
      } catch { /* non-critical */ }

      // Clear localStorage cart
      localStorage.removeItem(CART_KEY);

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

  // Wrap InitiateCheckout tracking
  const handleOpenCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
    trackPixelEvent('InitiateCheckout', {
      value: cartTotal,
      currency: currency,
      num_items: cartCount
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24 text-right" style={{ fontFamily: "'Cairo', sans-serif" }} dir="rtl">
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
      <div className="px-4 mt-4 grid grid-cols-2 gap-4">
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            onClick={() => setSelectedProduct(item)}
            className="glass-card p-3.5 flex flex-col hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer relative border border-white/10 rounded-2xl">
            
            {/* Stock status badge */}
            <div className="absolute top-2 right-2 z-10">
              {item.in_stock === false ? (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 font-bold">غير متوفر</Badge>
              ) : item.quantity !== undefined && item.quantity > 0 ? (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15">متوفر: {item.quantity}</Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15">متوفر</Badge>
              )}
            </div>

            {item.icon_url ? (
              <img src={item.icon_url} alt={item.name} className="w-full h-28 object-contain rounded-xl bg-white p-1 mb-3 transition-transform duration-300 hover:scale-105" />
            ) : (
              <div className="text-5xl w-full h-28 flex items-center justify-center rounded-xl bg-primary/5 text-primary mb-3">{item.image || '📦'}</div>
            )}
            <h3 className="font-bold text-sm text-foreground truncate mt-1">{item.name}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.category}</p>
            
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
              <p className="font-display font-black text-primary text-base">{item.price} {currency}</p>
              <Button size="sm" className="gradient-bg text-primary-foreground border-0 h-8 w-8 p-0 rounded-lg shadow-md hover:opacity-90" 
                onClick={(e) => { e.stopPropagation(); addToCart(item); }}>
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

              <Button onClick={handleOpenCheckout}
                className="w-full gradient-bg text-primary-foreground border-0 h-12 text-base font-bold shadow-lg">
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
              className="glass-card p-6 max-w-md w-full space-y-4 border border-white/10" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg text-primary">تأكيد الطلب 📝</h3>

              {/* Order Type Segment Controller */}
              <div className="flex p-1 bg-secondary rounded-xl gap-1">
                <button type="button" onClick={() => setCustomerForm(f => ({ ...f, address: '' }))}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!customerForm.address ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  🚶‍♂️ استلام من الفرع
                </button>
                <button type="button" onClick={() => setCustomerForm(f => ({ ...f, address: 'العنوان بالتفصيل' }))}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${customerForm.address ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  🚗 توصيل للمنزل
                </button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <User className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="الاسم *" value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} className="pr-10 h-11" />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="رقم الهاتف *" value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} className="pr-10 h-11" />
                </div>
                
                <AnimatePresence>
                  {customerForm.address !== '' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="relative overflow-hidden">
                      <MapPin className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="عنوان التوصيل بالتفصيل *" value={customerForm.address === 'العنوان بالتفصيل' ? '' : customerForm.address} onChange={e => setCustomerForm(f => ({ ...f, address: e.target.value }))} className="pr-10 h-11" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <StickyNote className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
                  <Input placeholder="ملاحظات إضافية (اختياري)" value={customerForm.notes} onChange={e => setCustomerForm(f => ({ ...f, notes: e.target.value }))} className="pr-10 h-11" />
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

      {/* Premium Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedProduct(null)}>
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}
              className="glass-card max-w-sm w-full overflow-hidden shadow-2xl relative border border-white/10 rounded-3xl"
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 left-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10">
                <X className="w-5 h-5" />
              </button>
              {selectedProduct.icon_url ? (
                <img src={selectedProduct.icon_url} alt={selectedProduct.name} className="w-full h-56 object-cover bg-white" />
              ) : (
                <div className="text-8xl w-full h-56 flex items-center justify-center bg-primary/5 text-primary">{selectedProduct.image || '📦'}</div>
              )}
              <div className="p-5 space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">{selectedProduct.category}</span>
                  <h3 className="text-xl font-bold mt-1 text-foreground">{selectedProduct.name}</h3>
                </div>
                
                {/* Stock status inside modal */}
                <div className="flex gap-2">
                  {selectedProduct.in_stock !== false ? (
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">متوفر</span>
                  ) : (
                    <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">غير متوفر</span>
                  )}
                  {selectedProduct.quantity !== undefined && selectedProduct.quantity > 0 && (
                    <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">المتاح: {selectedProduct.quantity}</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div>
                    <p className="text-xs text-muted-foreground">السعر</p>
                    <p className="text-2xl font-black text-primary">{selectedProduct.price} {currency}</p>
                  </div>
                  <Button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                    disabled={selectedProduct.in_stock === false}
                    className="gradient-bg text-primary-foreground border-0 h-12 px-6 rounded-xl font-bold shadow-lg flex items-center gap-2">
                    إضافة للسلة <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreFront;
