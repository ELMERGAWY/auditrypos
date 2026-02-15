import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, ShoppingCart, QrCode, Bell, Settings, LogOut, ChefHat,
  Plus, Minus, Trash2, Receipt, Wifi, WifiOff, X, Check, Volume2,
  BarChart3, Edit, ToggleLeft, ToggleRight, Save, Pause, Play,
  Printer, Users, Hash, Percent, DollarSign, Clock, TrendingUp,
  UtensilsCrossed, AlertCircle, CheckCircle, Timer, StickyNote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { useDarkMode } from '@/lib/useDarkMode';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

type Tab = 'pos' | 'orders' | 'menu' | 'qr' | 'waiter' | 'stats' | 'settings';
type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

interface MenuItem { id: string; name: string; price: number; category: string; image: string; available: boolean; restaurant_id: string; }
interface OrderItem { menu_item_name: string; menu_item_image: string; quantity: number; price: number; }
interface Order { id: string; order_number: string; total: number; status: string; created_at: string; synced: boolean; items: OrderItem[]; table_number: number | null; discount: number; notes: string; customer_name: string; }
interface WaiterCall { id: string; table_info: string; acknowledged: boolean; created_at: string; }
interface Restaurant { id: string; name: string; status: string; subscription_end: string | null; }
interface HeldOrder { cart: { item: MenuItem; qty: number }[]; tableNumber: string; customerName: string; notes: string; discount: string; discountType: 'percent' | 'fixed'; timestamp: number; }

const EMOJI_OPTIONS = ['🍔', '🍕', '🥗', '🍗', '🍟', '🍝', '🧃', '🍰', '🥩', '🌯', '☕', '🍦', '🥤', '🌮', '🍣', '🥘', '🧁', '🍩'];

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: typeof Clock; className: string; next?: OrderStatus }> = {
  pending: { label: 'قيد الانتظار', icon: Clock, className: 'status-pending', next: 'preparing' },
  preparing: { label: 'قيد التحضير', icon: UtensilsCrossed, className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', next: 'ready' },
  ready: { label: 'جاهز', icon: CheckCircle, className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', next: 'completed' },
  completed: { label: 'مكتمل', icon: Check, className: 'status-active' },
  cancelled: { label: 'ملغي', icon: X, className: 'status-suspended' },
};

const Dashboard = () => {
  useDarkMode();
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const isOnline = useOnlineStatus();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pos');
  const [cart, setCart] = useState<{ item: MenuItem; qty: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuspended, setIsSuspended] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  // POS enhancements
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');

  // Menu form
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: '', image: '🍔' });

  const loadData = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
    if (profile) setProfileName(profile.full_name);

    const { data: rests } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).limit(1);
    const rest = rests?.[0];
    if (!rest) { setRestaurant(null); setDataLoaded(true); return; }
    setRestaurant(rest as Restaurant);

    const suspended = rest.status === 'suspended' || (rest.subscription_end && new Date(rest.subscription_end) < new Date());
    setIsSuspended(!!suspended);

    const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', rest.id).order('sort_order');
    setMenuItems((items || []) as MenuItem[]);

    const { data: ordersData } = await supabase.from('orders').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false });
    const ordersWithItems: Order[] = [];
    for (const o of ordersData || []) {
      const { data: oItems } = await supabase.from('order_items').select('*').eq('order_id', o.id);
      ordersWithItems.push({ ...o, items: (oItems || []) as OrderItem[] } as Order);
    }
    setOrders(ordersWithItems);

    const { data: calls } = await supabase.from('waiter_calls').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false });
    setWaiterCalls((calls || []) as WaiterCall[]);
    setDataLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    loadData();
  }, [user, authLoading, loadData, navigate]);

  // Realtime waiter calls & orders
  useEffect(() => {
    if (!restaurant) return;
    const channel = supabase
      .channel('realtime-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waiter_calls', filter: `restaurant_id=eq.${restaurant.id}` },
        (payload) => {
          setWaiterCalls(prev => [payload.new as WaiterCall, ...prev]);
          try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Jn5+XkH17d3V5fYOGhYN9d3N0eH6EiIeEfnh0dHl/hYmIhYB7d3Z5foSIiIWBfHh2eX6EiIiFgXx4dnl+hIiIhYF8eHZ5foSIiIWBfHh2eX6EiIiFgQ==').play(); } catch {}
          toast.info('🔔 استدعاء ويتر جديد!');
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurant]);

  if (authLoading || (!dataLoaded && user)) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4 animate-pulse">
          <ChefHat className="w-6 h-6 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );

  if (!restaurant) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md text-center">
        <ChefHat className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold mb-2">لا يوجد مطعم مسجّل</h2>
        <p className="text-muted-foreground mb-4">أنشئ مطعمك الأول للبدء</p>
        <CreateRestaurantForm userId={user!.id} onCreated={loadData} />
      </div>
    </div>
  );

  const categories = [...new Set(menuItems.map(i => i.category))];
  const filteredItems = menuItems.filter(i => {
    if (selectedCategory !== 'all' && i.category !== selectedCategory) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return i.available;
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { item, qty: 1 }];
    });
  };
  const updateQty = (id: string, d: number) => setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: Math.max(0, c.qty + d) } : c).filter(c => c.qty > 0));
  
  const cartSubtotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const discountAmount = discountType === 'percent' 
    ? cartSubtotal * (Number(discount) || 0) / 100 
    : Number(discount) || 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  // Hold / Park order
  const holdOrder = () => {
    if (cart.length === 0) { toast.error('السلة فارغة'); return; }
    setHeldOrders(prev => [...prev, { cart, tableNumber, customerName, notes: orderNotes, discount, discountType, timestamp: Date.now() }]);
    clearCart();
    toast.success('تم تعليق الطلب');
  };

  const recallOrder = (index: number) => {
    const held = heldOrders[index];
    setCart(held.cart);
    setTableNumber(held.tableNumber);
    setCustomerName(held.customerName);
    setOrderNotes(held.notes);
    setDiscount(held.discount);
    setDiscountType(held.discountType);
    setHeldOrders(prev => prev.filter((_, i) => i !== index));
    setShowHeldOrders(false);
    toast.success('تم استعادة الطلب');
  };

  const clearCart = () => {
    setCart([]); setTableNumber(''); setCustomerName(''); setOrderNotes(''); setDiscount('');
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
    const { data: order, error } = await supabase.from('orders').insert({
      restaurant_id: restaurant.id,
      order_number: orderNum,
      total: cartTotal,
      status: 'pending',
      synced: isOnline,
      table_number: tableNumber ? Number(tableNumber) : null,
      discount: discountAmount,
      notes: orderNotes,
      customer_name: customerName,
    }).select().single();
    if (error || !order) { toast.error('خطأ في إنشاء الطلب'); return; }

    await supabase.from('order_items').insert(
      cart.map(c => ({
        order_id: order.id,
        menu_item_name: c.item.name,
        menu_item_image: c.item.image,
        quantity: c.qty,
        price: c.item.price,
      }))
    );

    const newOrder = { ...order, items: cart.map(c => ({ menu_item_name: c.item.name, menu_item_image: c.item.image, quantity: c.qty, price: c.item.price })) } as Order;
    setOrders(prev => [newOrder, ...prev]);
    setLastReceipt(newOrder);
    setShowReceipt(true);
    clearCart();
    toast.success(`تم إنشاء الطلب #${orderNum.slice(-4)} — ${cartTotal} ج.م`);
  };

  // Order status management
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) { toast.error('خطأ في تحديث الحالة'); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    const statusLabel = STATUS_CONFIG[newStatus].label;
    toast.success(`تم تحديث الطلب إلى: ${statusLabel}`);
  };

  // Print receipt
  const printReceipt = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl"><head><title>إيصال</title>
      <style>body{font-family:monospace;font-size:12px;padding:10px;max-width:280px;margin:0 auto}
      .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}
      .row{display:flex;justify-content:space-between}.total{font-size:16px}</style></head>
      <body>${receiptRef.current.innerHTML}
      <script>window.print();window.close();</script></body></html>
    `);
    printWindow.document.close();
  };

  // Menu CRUD
  const resetMenuForm = () => { setMenuForm({ name: '', price: '', category: '', image: '🍔' }); setShowAddItem(false); setEditingItem(null); };

  const handleSaveItem = async () => {
    if (!menuForm.name || !menuForm.price || !menuForm.category) { toast.error('يرجى ملء جميع الحقول'); return; }
    if (editingItem) {
      const { error } = await supabase.from('menu_items').update({ name: menuForm.name, price: Number(menuForm.price), category: menuForm.category, image: menuForm.image }).eq('id', editingItem.id);
      if (error) { toast.error('خطأ في التحديث'); return; }
      toast.success('تم تحديث العنصر');
    } else {
      const { error } = await supabase.from('menu_items').insert({ restaurant_id: restaurant.id, name: menuForm.name, price: Number(menuForm.price), category: menuForm.category, image: menuForm.image });
      if (error) { toast.error('خطأ في الإضافة'); return; }
      toast.success('تم إضافة العنصر');
    }
    resetMenuForm();
    loadData();
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id);
    setMenuItems(prev => prev.filter(i => i.id !== id));
    toast.success('تم حذف العنصر');
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    await supabase.from('menu_items').update({ available: !item.available }).eq('id', item.id);
    setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setMenuForm({ name: item.name, price: String(item.price), category: item.category, image: item.image });
    setShowAddItem(true);
  };

  const handleAcknowledge = async (id: string) => {
    await supabase.from('waiter_calls').update({ acknowledged: true }).eq('id', id);
    setWaiterCalls(prev => prev.map(c => c.id === id ? { ...c, acknowledged: true } : c));
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };
  const unackCalls = waiterCalls.filter(c => !c.acknowledged);

  // Stats
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const avgOrderValue = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  
  const categoryData = categories.map(cat => {
    const val = orders.filter(o => o.status !== 'cancelled').flatMap(o => o.items.filter(i => menuItems.find(m => m.name === i.menu_item_name)?.category === cat)).reduce((s, i) => s + i.price * i.quantity, 0);
    return { name: cat, value: val };
  }).filter(d => d.value > 0);
  
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - i));
    const dayOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === date.toDateString());
    return { day: date.toLocaleDateString('ar-EG', { weekday: 'short' }), revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0), orders: dayOrders.length };
  });

  // Top selling items
  const itemSales = new Map<string, number>();
  orders.filter(o => o.status !== 'cancelled').forEach(o => o.items.forEach(i => itemSales.set(i.menu_item_name, (itemSales.get(i.menu_item_name) || 0) + i.quantity)));
  const topItems = [...itemSales.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const CHART_COLORS = ['hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(200, 80%, 50%)', 'hsl(280, 70%, 55%)', 'hsl(0, 84%, 60%)'];

  // Filtered orders
  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);

  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { id: 'pos', label: 'نقطة البيع', icon: LayoutGrid },
    { id: 'orders', label: 'الطلبات', icon: Receipt, badge: pendingOrders.length },
    { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
    { id: 'menu', label: 'القائمة', icon: ShoppingCart },
    { id: 'qr', label: 'QR Code', icon: QrCode },
    { id: 'waiter', label: 'استدعاء ويتر', icon: Bell, badge: unackCalls.length },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      <AnimatePresence>
        {isSuspended && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card p-8 max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4"><X className="w-8 h-8 text-destructive" /></div>
              <h2 className="font-display text-2xl font-bold mb-2">الحساب موقوف</h2>
              <p className="text-muted-foreground mb-6">انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للمتابعة.</p>
              <Button className="gradient-bg text-primary-foreground border-0" onClick={() => navigate('/payment')}>تجديد الاشتراك</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && lastReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReceipt(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div ref={receiptRef} className="space-y-3">
                <div className="text-center">
                  <p className="font-display font-bold text-lg">{restaurant.name}</p>
                  <p className="text-xs text-muted-foreground">إيصال طلب</p>
                </div>
                <div className="border-t border-dashed border-border pt-3">
                  <div className="flex justify-between text-sm"><span>رقم الطلب</span><span className="font-bold">#{lastReceipt.order_number.slice(-4)}</span></div>
                  {lastReceipt.table_number && <div className="flex justify-between text-sm"><span>رقم الطاولة</span><span>{lastReceipt.table_number}</span></div>}
                  {lastReceipt.customer_name && <div className="flex justify-between text-sm"><span>العميل</span><span>{lastReceipt.customer_name}</span></div>}
                  <div className="flex justify-between text-sm"><span>التاريخ</span><span>{new Date(lastReceipt.created_at).toLocaleString('ar-EG')}</span></div>
                </div>
                <div className="border-t border-dashed border-border pt-3 space-y-1">
                  {lastReceipt.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.menu_item_image} {item.menu_item_name} × {item.quantity}</span>
                      <span>{item.price * item.quantity} ج.م</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-border pt-3">
                  {Number(lastReceipt.discount) > 0 && (
                    <div className="flex justify-between text-sm text-success"><span>الخصم</span><span>-{lastReceipt.discount} ج.م</span></div>
                  )}
                  <div className="flex justify-between font-display font-bold text-lg"><span>الإجمالي</span><span className="text-primary">{lastReceipt.total} ج.م</span></div>
                </div>
                {lastReceipt.notes && (
                  <div className="border-t border-dashed border-border pt-3">
                    <p className="text-xs text-muted-foreground">ملاحظات: {lastReceipt.notes}</p>
                  </div>
                )}
                <p className="text-center text-xs text-muted-foreground mt-2">شكراً لزيارتكم ❤️</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={printReceipt} className="flex-1 gradient-bg text-primary-foreground border-0"><Printer className="w-4 h-4 ml-1" /> طباعة</Button>
                <Button variant="outline" onClick={() => setShowReceipt(false)} className="flex-1">إغلاق</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Held Orders Modal */}
      <AnimatePresence>
        {showHeldOrders && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHeldOrders(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2"><Pause className="w-5 h-5 text-primary" /> الطلبات المعلّقة ({heldOrders.length})</h3>
              {heldOrders.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد طلبات معلّقة</p>}
              {heldOrders.map((held, idx) => (
                <div key={idx} className="glass-card p-4 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      {held.tableNumber && <Badge variant="outline" className="ml-2">طاولة {held.tableNumber}</Badge>}
                      {held.customerName && <span className="text-sm text-muted-foreground">{held.customerName}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(held.timestamp).toLocaleTimeString('ar-EG')}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{held.cart.map(c => `${c.item.name} × ${c.qty}`).join('، ')}</div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">{held.cart.reduce((s, c) => s + c.item.price * c.qty, 0)} ج.م</span>
                    <div className="flex gap-2">
                      <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => recallOrder(idx)}><Play className="w-3 h-3 ml-1" /> استعادة</Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setHeldOrders(prev => prev.filter((_, i) => i !== idx)); toast.success('تم حذف الطلب المعلّق'); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 bg-card border-l border-border flex flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center"><ChefHat className="w-6 h-6 text-primary-foreground" /></div>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm truncate">{restaurant.name}</p>
            <p className="text-xs text-muted-foreground">{profileName}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`sidebar-nav-item w-full ${activeTab === tab.id ? 'active' : ''}`}>
              <tab.icon className="w-5 h-5" /><span className="flex-1 text-right">{tab.label}</span>
              {tab.badge ? <span className="w-5 h-5 rounded-full gradient-bg text-primary-foreground text-xs flex items-center justify-center">{tab.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <motion.div animate={{ backgroundColor: isOnline ? 'hsl(142 71% 45% / 0.1)' : 'hsl(0 84% 60% / 0.1)' }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm">
            {isOnline ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
            <span className={isOnline ? 'text-success' : 'text-destructive'}>{isOnline ? 'متصل' : 'غير متصل'}</span>
          </motion.div>
          <button onClick={handleLogout} className="sidebar-nav-item w-full mt-2"><LogOut className="w-5 h-5" /><span>تسجيل الخروج</span></button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-2 p-3 border-b border-border overflow-x-auto bg-card">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${activeTab === tab.id ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
              {tab.badge ? <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{tab.badge}</span> : null}
            </button>
          ))}
        </header>

        <main className="flex-1 overflow-auto">
          {/* POS */}
          {activeTab === 'pos' && (
            <div className="flex flex-col lg:flex-row h-full">
              <div className="flex-1 p-4 overflow-auto">
                {/* Quick Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-primary" /></div>
                    <div><p className="text-[10px] text-muted-foreground">إيرادات اليوم</p><p className="font-display font-bold text-primary">{todayRevenue} ج.م</p></div>
                  </div>
                  <div className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><Receipt className="w-5 h-5 text-accent" /></div>
                    <div><p className="text-[10px] text-muted-foreground">طلبات اليوم</p><p className="font-display font-bold">{todayOrders.length}</p></div>
                  </div>
                  <div className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-success" /></div>
                    <div><p className="text-[10px] text-muted-foreground">متوسط الطلب</p><p className="font-display font-bold">{avgOrderValue} ج.م</p></div>
                  </div>
                  <div className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Timer className="w-5 h-5 text-warning" /></div>
                    <div><p className="text-[10px] text-muted-foreground">طلبات نشطة</p><p className="font-display font-bold">{pendingOrders.length}</p></div>
                  </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>الكل</button>
                  {categories.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === cat ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{cat}</button>)}
                </div>
                <Input placeholder="🔍 بحث في القائمة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="mb-4" />
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredItems.map(item => (
                    <motion.button key={item.id} whileTap={{ scale: 0.95 }} onClick={() => addToCart(item)} className="pos-grid-item text-right">
                      <div className="text-3xl mb-2">{item.image}</div>
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-primary font-bold text-sm">{item.price} ج.م</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cart Panel */}
              <div className="w-full lg:w-96 bg-card border-r border-border flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-display font-bold flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" /> السلة {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
                  </h3>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={holdOrder} title="تعليق الطلب" disabled={cart.length === 0}>
                      <Pause className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowHeldOrders(true)} className="relative" title="الطلبات المعلّقة">
                      <Play className="w-4 h-4" />
                      {heldOrders.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-bg text-primary-foreground text-[10px] flex items-center justify-center">{heldOrders.length}</span>}
                    </Button>
                    {cart.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={clearCart} className="text-destructive" title="مسح السلة">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Order details inputs */}
                <div className="p-3 space-y-2 border-b border-border bg-secondary/30">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="رقم الطاولة" className="pr-8 h-9 text-xs" type="number" />
                    </div>
                    <div className="relative">
                      <Users className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل" className="pr-8 h-9 text-xs" />
                    </div>
                  </div>
                  <div className="relative">
                    <StickyNote className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
                    <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="ملاحظات (بدون ملح، إضافي صوص...)" className="pr-8 h-9 text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Percent className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={discount} onChange={e => setDiscount(e.target.value)} placeholder="خصم" className="pr-8 h-9 text-xs" type="number" />
                    </div>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button onClick={() => setDiscountType('percent')} className={`px-2 text-xs transition-colors ${discountType === 'percent' ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>%</button>
                      <button onClick={() => setDiscountType('fixed')} className={`px-2 text-xs transition-colors ${discountType === 'fixed' ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>ج.م</button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {cart.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">السلة فارغة</p>}
                  {cart.map(c => (
                    <motion.div key={c.item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                      <span className="text-xl">{c.item.image}</span>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.item.name}</p><p className="text-xs text-primary">{c.item.price * c.qty} ج.م</p></div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(c.item.id, -1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-destructive/20 transition-colors"><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center text-sm font-medium">{c.qty}</span>
                        <button onClick={() => updateQty(c.item.id, 1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="p-4 border-t border-border space-y-2">
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>المجموع الفرعي</span><span>{cartSubtotal} ج.م</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>الخصم</span><span>-{discountAmount.toFixed(1)} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-display font-bold text-lg"><span>الإجمالي</span><span className="text-primary">{cartTotal.toFixed(1)} ج.م</span></div>
                  <Button onClick={checkout} className="w-full gradient-bg text-primary-foreground border-0 h-12 text-base" disabled={cart.length === 0}>
                    <Receipt className="w-5 h-5 ml-2" /> إتمام الطلب
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Orders */}
          {activeTab === 'orders' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">الطلبات ({filteredOrders.length})</h2>
              </div>
              {/* Status filter tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'] as const).map(status => (
                  <button key={status} onClick={() => setOrderFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${orderFilter === status ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                    {status === 'all' ? `الكل (${orders.length})` : `${STATUS_CONFIG[status].label} (${orders.filter(o => o.status === status).length})`}
                  </button>
                ))}
              </div>
              {filteredOrders.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد طلبات</p>}
              {filteredOrders.map(order => {
                const statusCfg = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;
                return (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">#{order.order_number.slice(-4)}</span>
                        {order.table_number && <Badge variant="outline" className="text-xs"><Hash className="w-3 h-3 ml-0.5" />{order.table_number}</Badge>}
                        {order.customer_name && <span className="text-xs text-muted-foreground">{order.customer_name}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString('ar-EG')}</span>
                      </div>
                      <Badge className={statusCfg.className}><StatusIcon className="w-3 h-3 ml-1" />{statusCfg.label}</Badge>
                    </div>
                    {order.notes && <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5 mb-3 flex items-center gap-1"><StickyNote className="w-3 h-3" />{order.notes}</p>}
                    <div className="space-y-1 text-sm">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-muted-foreground"><span>{item.menu_item_image} {item.menu_item_name} × {item.quantity}</span><span>{item.price * item.quantity} ج.م</span></div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div>
                        {Number(order.discount) > 0 && <span className="text-xs text-success ml-2">خصم: -{order.discount} ج.م</span>}
                        <span className="font-bold text-primary">{order.total} ج.م</span>
                      </div>
                      <div className="flex gap-2">
                        {statusCfg.next && order.status !== 'cancelled' && (
                          <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => updateOrderStatus(order.id, statusCfg.next!)}>
                            {statusCfg.next === 'preparing' && <><UtensilsCrossed className="w-3 h-3 ml-1" /> بدء التحضير</>}
                            {statusCfg.next === 'ready' && <><CheckCircle className="w-3 h-3 ml-1" /> جاهز</>}
                            {statusCfg.next === 'completed' && <><Check className="w-3 h-3 ml-1" /> مكتمل</>}
                          </Button>
                        )}
                        {(order.status === 'pending' || order.status === 'preparing') && (
                          <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                            <X className="w-3 h-3 ml-1" /> إلغاء
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { setLastReceipt(order); setShowReceipt(true); }}>
                          <Printer className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Stats */}
          {activeTab === 'stats' && (
            <div className="p-4 space-y-6">
              <h2 className="font-display text-xl font-bold">الإحصائيات</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">إجمالي الإيرادات</p><p className="font-display text-2xl font-bold text-primary">{totalRevenue} ج.م</p></div>
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">إجمالي الطلبات</p><p className="font-display text-2xl font-bold">{orders.length}</p></div>
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">إيرادات اليوم</p><p className="font-display text-2xl font-bold text-success">{todayRevenue} ج.م</p></div>
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">متوسط قيمة الطلب</p><p className="font-display text-2xl font-bold">{avgOrderValue} ج.م</p></div>
              </div>

              {/* Top Selling Items */}
              {topItems.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="font-display font-bold mb-4">🏆 الأكثر مبيعاً</h3>
                  <div className="space-y-3">
                    {topItems.map(([name, qty], idx) => {
                      const menuItem = menuItems.find(m => m.name === name);
                      const maxQty = topItems[0][1];
                      return (
                        <div key={name} className="flex items-center gap-3">
                          <span className="w-6 text-center font-bold text-muted-foreground">{idx + 1}</span>
                          <span className="text-xl">{menuItem?.image || '🍽️'}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{name}</span>
                              <span className="text-sm text-primary font-bold">{qty} مبيعات</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${(qty / maxQty) * 100}%` }} transition={{ duration: 0.8, delay: idx * 0.1 }}
                                className="h-full rounded-full gradient-bg" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="glass-card p-6">
                <h3 className="font-display font-bold mb-4">الإيرادات - آخر 7 أيام</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last7Days}><CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 18%, 18%)" /><XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={12} /><YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: 'hsl(224, 24%, 12%)', border: '1px solid hsl(224, 18%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' }} formatter={(value: number) => [`${value} ج.م`, 'الإيرادات']} /><Bar dataKey="revenue" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} /></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {categoryData.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-display font-bold mb-4">التوزيع حسب الفئة</h3>
                    <div className="flex flex-col items-center gap-6">
                      <div className="h-52 w-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>{categoryData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 w-full">{categoryData.map((d, idx) => <div key={d.name} className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} /><span className="text-sm flex-1">{d.name}</span><span className="text-sm font-bold text-primary">{d.value} ج.م</span></div>)}</div>
                    </div>
                  </div>
                )}
                <div className="glass-card p-6">
                  <h3 className="font-display font-bold mb-4">عدد الطلبات - آخر 7 أيام</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={last7Days}><CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 18%, 18%)" /><XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={12} /><YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: 'hsl(224, 24%, 12%)', border: '1px solid hsl(224, 18%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' }} /><Line type="monotone" dataKey="orders" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={{ fill: 'hsl(25, 95%, 53%)' }} name="الطلبات" /></LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Menu */}
          {activeTab === 'menu' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">إدارة القائمة ({menuItems.length} عنصر)</h2>
                <Button onClick={() => { resetMenuForm(); setShowAddItem(true); }} className="gradient-bg text-primary-foreground border-0"><Plus className="w-4 h-4 ml-1" /> إضافة عنصر</Button>
              </div>
              <AnimatePresence>
                {showAddItem && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="glass-card p-4 mb-4 space-y-3">
                      <h3 className="font-display font-bold">{editingItem ? 'تعديل العنصر' : 'إضافة عنصر جديد'}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><Label>اسم العنصر</Label><Input value={menuForm.name} onChange={e => setMenuForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: برجر كلاسيك" /></div>
                        <div><Label>السعر (ج.م)</Label><Input type="number" value={menuForm.price} onChange={e => setMenuForm(f => ({ ...f, price: e.target.value }))} placeholder="0" /></div>
                        <div><Label>الفئة</Label><Input value={menuForm.category} onChange={e => setMenuForm(f => ({ ...f, category: e.target.value }))} placeholder="مثال: Burgers" list="categories" /><datalist id="categories">{categories.map(c => <option key={c} value={c} />)}</datalist></div>
                        <div><Label>الأيقونة</Label><div className="flex gap-1 flex-wrap mt-1">{EMOJI_OPTIONS.map(e => <button key={e} onClick={() => setMenuForm(f => ({ ...f, image: e }))} className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${menuForm.image === e ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary'}`}>{e}</button>)}</div></div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveItem} className="gradient-bg text-primary-foreground border-0"><Save className="w-4 h-4 ml-1" /> {editingItem ? 'حفظ التعديلات' : 'إضافة'}</Button>
                        <Button variant="outline" onClick={resetMenuForm}>إلغاء</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {menuItems.map(item => (
                  <div key={item.id} className="glass-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{item.image}</span>
                      <div className="flex-1 min-w-0"><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-muted-foreground">{item.category}</p><p className="text-sm text-primary font-bold">{item.price} ج.م</p></div>
                      <Badge className={item.available ? 'status-active' : 'status-suspended'}>{item.available ? 'متاح' : 'غير متاح'}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(item)}><Edit className="w-3 h-3 ml-1" /> تعديل</Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggleAvailability(item)}>{item.available ? <ToggleRight className="w-3 h-3 ml-1" /> : <ToggleLeft className="w-3 h-3 ml-1" />}{item.available ? 'إخفاء' : 'إظهار'}</Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR */}
          {activeTab === 'qr' && (
            <div className="p-4 flex flex-col items-center">
              <h2 className="font-display text-xl font-bold mb-6">رمز QR لقائمة الطعام</h2>
              <div className="glass-card p-8 text-center">
                <QRCodeSVG value={`${window.location.origin}/qr-menu/${restaurant.id}`} size={220} bgColor="transparent" fgColor="hsl(25, 95%, 53%)" level="H" />
                <p className="text-muted-foreground text-sm mt-4">امسح الكود لعرض القائمة</p>
                <p className="text-xs text-muted-foreground mt-1 break-all">{window.location.origin}/qr-menu/{restaurant.id}</p>
              </div>
            </div>
          )}

          {/* Waiter */}
          {activeTab === 'waiter' && (
            <div className="p-4">
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><Volume2 className="w-5 h-5 text-primary" /> استدعاءات الويتر</h2>
              {waiterCalls.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد استدعاءات</p>}
              {waiterCalls.map(call => (
                <motion.div key={call.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`glass-card p-4 mb-3 ${!call.acknowledged ? 'border-primary/50 pulse-notification' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div><p className="font-bold text-sm">{call.table_info}</p><p className="text-xs text-muted-foreground">{new Date(call.created_at).toLocaleTimeString('ar-EG')}</p></div>
                    {!call.acknowledged ? (
                      <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => handleAcknowledge(call.id)}><Check className="w-4 h-4 ml-1" /> تم</Button>
                    ) : <Badge className="status-active">تم الاستجابة</Badge>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="p-4 max-w-lg">
              <h2 className="font-display text-xl font-bold mb-4">الإعدادات</h2>
              <div className="glass-card p-4 space-y-3">
                <div><p className="text-sm text-muted-foreground">اسم المطعم</p><p className="font-medium">{restaurant.name}</p></div>
                <div><p className="text-sm text-muted-foreground">المالك</p><p className="font-medium">{profileName}</p></div>
                <div><p className="text-sm text-muted-foreground">البريد</p><p className="font-medium">{user?.email}</p></div>
                <div><p className="text-sm text-muted-foreground">حالة الاشتراك</p><Badge className={isSuspended ? 'status-suspended' : 'status-active'}>{isSuspended ? 'موقوف' : 'نشط'}</Badge></div>
                {restaurant.subscription_end && <div><p className="text-sm text-muted-foreground">ينتهي في</p><p className="font-medium">{new Date(restaurant.subscription_end).toLocaleDateString('ar-EG')}</p></div>}
              </div>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/payment')}>تجديد الاشتراك</Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Mini component for creating restaurant
function CreateRestaurantForm({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('أدخل اسم المطعم'); return; }
    setLoading(true);
    const { error } = await supabase.from('restaurants').insert({ owner_id: userId, name: name.trim(), status: 'pending' });
    setLoading(false);
    if (error) { toast.error('خطأ في إنشاء المطعم'); return; }
    toast.success('تم إنشاء المطعم بنجاح!');
    onCreated();
  };

  return (
    <div className="space-y-3 text-right" dir="rtl">
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="اسم المطعم" />
      <Button onClick={handleCreate} className="w-full gradient-bg text-primary-foreground border-0" disabled={loading}>
        {loading ? 'جاري الإنشاء...' : 'إنشاء مطعم'}
      </Button>
    </div>
  );
}

export default Dashboard;
