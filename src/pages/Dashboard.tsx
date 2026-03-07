import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, ShoppingCart, QrCode, Bell, Settings, LogOut, ChefHat,
  Plus, Minus, Trash2, Receipt, Wifi, WifiOff, X, Check,
  BarChart3, Pause, Play, Printer, Users, Hash, Percent,
  Clock, TrendingUp, UtensilsCrossed, AlertCircle, CheckCircle,
  Timer, StickyNote, DollarSign, Truck, CalendarClock, MapPin, Phone, Lock, CreditCard,
  Volume2, VolumeX, Package, Wallet, Store, UsersRound, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useDashboardData } from './dashboard/useDashboardData';
import { ReceiptModalWrapper } from './dashboard/ReceiptModal';
import { DeliveryTab } from './dashboard/DeliveryTab';
import { ShiftsTab } from './dashboard/ShiftsTab';
import { MenuTab } from './dashboard/MenuTab';
import { TableGrid } from './dashboard/TableGrid';
import { InventoryTab } from './dashboard/InventoryTab';
import { CustomersTab } from './dashboard/CustomersTab';
import { SuppliersTab } from './dashboard/SuppliersTab';
import { ExpensesTab } from './dashboard/ExpensesTab';
import { StaffTab } from './dashboard/StaffTab';
import { BarcodeScanner } from './dashboard/BarcodeScanner';
import { BUSINESS_TYPES, BUSINESS_TABS, getBusinessLabel, type BusinessType } from '@/lib/businessTypes';
import type {
  DashboardTab, OrderStatus, OrderType, MenuItem, Order, OrderItem, HeldInvoice
} from './dashboard/types';
import { STATUS_CONFIG, ORDER_TYPE_CONFIG } from './dashboard/types';

function CreateRestaurantForm({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('restaurant');
  const [loading, setLoading] = useState(false);

  // Check localStorage for pending business from registration
  useState(() => {
    const pending = localStorage.getItem('pending_business');
    if (pending) {
      try {
        const { name: bName, type } = JSON.parse(pending);
        if (bName) setName(bName);
        if (type) setBizType(type as BusinessType);
        localStorage.removeItem('pending_business');
      } catch {}
    }
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    await supabase.from('restaurants').insert({
      owner_id: userId,
      name,
      status: 'active',
      subscription_end: trialEnd.toISOString(),
      business_type: bizType,
    });
    setLoading(false);
    onCreated();
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {(Object.entries(BUSINESS_TYPES) as [BusinessType, typeof BUSINESS_TYPES[BusinessType]][]).slice(0, 8).map(([key, bt]) => (
          <button key={key} onClick={() => setBizType(key)}
            className={`p-2 rounded-lg text-center transition-all text-xs ${bizType === key ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>
            <span className="text-lg block">{bt.icon}</span>
            {bt.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="اسم النشاط" />
        <Button onClick={handleCreate} disabled={loading} className="gradient-bg text-primary-foreground border-0">
          {loading ? '...' : 'إنشاء'}
        </Button>
      </div>
    </div>
  );
}

const CHART_COLORS = [
  'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)',
  'hsl(200, 80%, 50%)', 'hsl(280, 70%, 55%)', 'hsl(0, 84%, 60%)'
];

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    user, authLoading, isOnline, restaurant, menuItems, setMenuItems,
    orders, setOrders, waiterCalls, setWaiterCalls, agents, setAgents,
    currentShift, setCurrentShift, profileName, dataLoaded, loadData, handleLogout,
    soundEnabled, setSoundEnabled,
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState<DashboardTab>('pos');

  // POS State
  const [cart, setCart] = useState<{ item: MenuItem; qty: number }[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedDeliveryAgent, setSelectedDeliveryAgent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Invoices (multiple held tabs)
  const [invoiceTabs, setInvoiceTabs] = useState<HeldInvoice[]>([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [showInvoiceTabs, setShowInvoiceTabs] = useState(false);

  // Receipt
  const [lastReceipt, setLastReceipt] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Orders filter
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');

  // Menu form
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: '', image: '🍔' });

  const isSuspended = restaurant
    ? restaurant.status === 'suspended' || (restaurant.subscription_end && new Date(restaurant.subscription_end) < new Date())
    : false;

  // Trial detection
  const isTrial = restaurant
    ? restaurant.status === 'active' && restaurant.subscription_end && new Date(restaurant.subscription_end) >= new Date()
      && (new Date(restaurant.subscription_end).getTime() - new Date(restaurant.created_at || '').getTime()) <= 15 * 86400000
    : false;

  const trialDaysLeft = restaurant?.subscription_end
    ? Math.max(0, Math.ceil((new Date(restaurant.subscription_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Barcode scanner state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Features locked during trial
  const lockedTabs: DashboardTab[] = isTrial ? ['orders', 'delivery', 'shifts', 'stats'] : [];

  // Computed — safe with optional chaining
  const currency = restaurant?.currency || 'ج.م';
  const categories = [...new Set(menuItems.map(i => i.category))];
  const filteredItems = menuItems.filter(i => {
    if (selectedCategory !== 'all' && i.category !== selectedCategory) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return i.available;
  });

  const cartSubtotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const discountAmount = discountType === 'percent'
    ? cartSubtotal * (Number(discount) || 0) / 100
    : Number(discount) || 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const unackCalls = waiterCalls.filter(c => !c.acknowledged);
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const avgOrderValue = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const deliveryOrders = orders.filter(o => o.order_type === 'delivery' && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'));

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - i));
    const dayOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === date.toDateString());
    return { day: date.toLocaleDateString('ar-EG', { weekday: 'short' }), revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0), orders: dayOrders.length };
  });

  const categoryData = categories.map(cat => {
    const val = orders.filter(o => o.status !== 'cancelled').flatMap(o => o.items.filter(i => menuItems.find(m => m.name === i.menu_item_name)?.category === cat)).reduce((s, i) => s + i.price * i.quantity, 0);
    return { name: cat, value: val };
  }).filter(d => d.value > 0);

  const itemSales = new Map<string, number>();
  orders.filter(o => o.status !== 'cancelled').forEach(o => o.items.forEach(i => itemSales.set(i.menu_item_name, (itemSales.get(i.menu_item_name) || 0) + i.quantity)));
  const topItems = [...itemSales.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);

  // Cart actions
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (id: string, d: number) =>
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: Math.max(0, c.qty + d) } : c).filter(c => c.qty > 0));

  const clearCart = () => {
    setCart([]); setTableNumber(''); setCustomerName(''); setCustomerPhone('');
    setOrderNotes(''); setDiscount(''); setDeliveryAddress(''); setSelectedDeliveryAgent('');
    setOrderType('dine_in'); setActiveInvoiceId(null);
  };

  // Save current state as an invoice tab / hold
  const holdCurrentInvoice = () => {
    if (cart.length === 0) { toast.error('السلة فارغة'); return; }
    const newTab: HeldInvoice = {
      id: crypto.randomUUID(),
      label: activeInvoiceId
        ? (invoiceTabs.find(t => t.id === activeInvoiceId)?.label || `فاتورة ${invoiceTabs.length + 1}`)
        : `فاتورة ${invoiceTabs.length + 1}`,
      cart, tableNumber, customerName, notes: orderNotes,
      discount, discountType, orderType, deliveryAddress, customerPhone,
      deliveryAgentId: selectedDeliveryAgent,
      timestamp: Date.now(),
    };

    if (activeInvoiceId) {
      setInvoiceTabs(prev => prev.map(t => t.id === activeInvoiceId ? newTab : t));
    } else {
      setInvoiceTabs(prev => [...prev, newTab]);
    }
    clearCart();
    toast.success('تم تعليق الفاتورة');
  };

  const recallInvoice = (tab: HeldInvoice) => {
    // Save current cart as another tab if not empty
    if (cart.length > 0) holdCurrentInvoice();
    setCart(tab.cart);
    setTableNumber(tab.tableNumber);
    setCustomerName(tab.customerName);
    setCustomerPhone(tab.customerPhone || '');
    setOrderNotes(tab.notes);
    setDiscount(tab.discount);
    setDiscountType(tab.discountType);
    setOrderType(tab.orderType || 'dine_in');
    setDeliveryAddress(tab.deliveryAddress || '');
    setSelectedDeliveryAgent(tab.deliveryAgentId || '');
    setActiveInvoiceId(tab.id);
    setShowInvoiceTabs(false);
    toast.success(`تم استعادة ${tab.label}`);
  };

  const deleteInvoiceTab = (id: string) => {
    setInvoiceTabs(prev => prev.filter(t => t.id !== id));
    if (activeInvoiceId === id) clearCart();
    toast.success('تم حذف الفاتورة المعلّقة');
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
    const { data: order, error } = await supabase.from('orders').insert({
      restaurant_id: restaurant!.id,
      order_number: orderNum,
      total: cartTotal,
      status: 'pending',
      synced: isOnline,
      table_number: tableNumber ? Number(tableNumber) : null,
      discount: discountAmount,
      notes: orderNotes,
      customer_name: customerName,
      customer_phone: customerPhone,
      order_type: orderType,
      delivery_address: deliveryAddress,
      delivery_agent_id: selectedDeliveryAgent || null,
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

    // Update agent status if delivery
    if (orderType === 'delivery' && selectedDeliveryAgent) {
      await supabase.from('delivery_agents').update({ status: 'busy' }).eq('id', selectedDeliveryAgent);
      setAgents(agents.map(a => a.id === selectedDeliveryAgent ? { ...a, status: 'busy' } : a));
    }

    // Remove from held tabs if was held
    if (activeInvoiceId) setInvoiceTabs(prev => prev.filter(t => t.id !== activeInvoiceId));

    const newOrder = {
      ...order,
      items: cart.map(c => ({ menu_item_name: c.item.name, menu_item_image: c.item.image, quantity: c.qty, price: c.item.price }))
    } as unknown as Order;

    setOrders(prev => [newOrder, ...prev]);
    setLastReceipt(newOrder);
    setShowReceipt(true);
    clearCart();
    toast.success(`✅ تم إنشاء الطلب #${orderNum.slice(-4)} — ${cartTotal.toFixed(2)} ${currency}`);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) { toast.error('خطأ في تحديث الحالة'); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast.success(`تم تحديث الطلب إلى: ${STATUS_CONFIG[newStatus].label}`);
  };

  const handleAssignAgent = async (orderId: string, agentId: string) => {
    await supabase.from('orders').update({ delivery_agent_id: agentId }).eq('id', orderId);
    await supabase.from('delivery_agents').update({ status: 'busy' }).eq('id', agentId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_agent_id: agentId } : o));
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'busy' } : a));
    toast.success('تم تعيين المندوب');
  };

  const handleAcknowledge = async (id: string) => {
    await supabase.from('waiter_calls').update({ acknowledged: true }).eq('id', id);
    setWaiterCalls(prev => prev.map(c => c.id === id ? { ...c, acknowledged: true } : c));
  };

  const businessType = (restaurant?.business_type || 'restaurant') as BusinessType;
  const allowedTabs = BUSINESS_TABS[businessType] || BUSINESS_TABS.restaurant;

  const allTabs: { id: DashboardTab; label: string; icon: typeof LayoutGrid; badge?: number; locked?: boolean }[] = [
    { id: 'pos', label: 'نقطة البيع', icon: LayoutGrid },
    { id: 'orders', label: 'الطلبات', icon: Receipt, badge: pendingOrders.length, locked: lockedTabs.includes('orders') },
    { id: 'inventory', label: 'المخزون', icon: Package },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'suppliers', label: 'الموردين', icon: Store },
    { id: 'expenses', label: 'المصروفات', icon: Wallet },
    { id: 'delivery', label: 'المناديب', icon: Truck, badge: deliveryOrders.length, locked: lockedTabs.includes('delivery') },
    { id: 'shifts', label: 'الشفتات', icon: CalendarClock, locked: lockedTabs.includes('shifts') },
    { id: 'stats', label: 'الإحصائيات', icon: BarChart3, locked: lockedTabs.includes('stats') },
    { id: 'menu', label: 'القائمة', icon: ShoppingCart },
    { id: 'qr', label: 'رابط المتجر', icon: QrCode },
    { id: 'waiter', label: 'ويتر', icon: Bell, badge: unackCalls.length },
    { id: 'staff', label: 'الموظفين', icon: UsersRound },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const tabs = allTabs.filter(t => allowedTabs.includes(t.id));

  const handleTabClick = (tabId: DashboardTab) => {
    const t = tabs.find(x => x.id === tabId);
    if (t?.locked) {
      toast.error('هذه الميزة متاحة بعد الترقية للنسخة المدفوعة');
      return;
    }
    setActiveTab(tabId);
  };

  if (authLoading || !user || !dataLoaded) return (
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
        <CreateRestaurantForm userId={user.id} onCreated={loadData} />
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-background flex theme-${businessType}`} dir="rtl">
      {/* Suspended Overlay */}
      <AnimatePresence>
        {isSuspended && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card p-8 max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">الحساب موقوف</h2>
              <p className="text-muted-foreground mb-6">انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للمتابعة.</p>
              <Button onClick={() => navigate('/payment')} className="gradient-bg text-primary-foreground border-0">
                <CreditCard className="w-4 h-4 ml-2" /> تجديد الاشتراك
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && lastReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReceipt(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold mb-4 flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> إيصال الطلب</h3>
              <ReceiptModalWrapper order={lastReceipt} restaurant={restaurant} onClose={() => setShowReceipt(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Tabs Modal */}
      <AnimatePresence>
        {showInvoiceTabs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowInvoiceTabs(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Pause className="w-5 h-5 text-primary" /> الفواتير المعلّقة ({invoiceTabs.length})
              </h3>
              {invoiceTabs.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد فواتير معلّقة</p>}
              {invoiceTabs.map(tab => (
                <div key={tab.id} className={`glass-card p-4 mb-3 ${activeInvoiceId === tab.id ? 'border-primary/50' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{tab.label}</span>
                      {activeInvoiceId === tab.id && <Badge className="status-active text-xs">نشط</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(tab.timestamp).toLocaleTimeString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{ORDER_TYPE_CONFIG[tab.orderType]?.icon} {ORDER_TYPE_CONFIG[tab.orderType]?.label}</Badge>
                    {tab.tableNumber && <Badge variant="outline" className="text-xs">طاولة {tab.tableNumber}</Badge>}
                    {tab.customerName && <span className="text-xs text-muted-foreground">{tab.customerName}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{tab.cart.map(c => `${c.item.name} × ${c.qty}`).join('، ')}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">{tab.cart.reduce((s, c) => s + c.item.price * c.qty, 0)} {currency}</span>
                    <div className="flex gap-2">
                      <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => recallInvoice(tab)}>
                        <Play className="w-3 h-3 ml-1" /> استعادة
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteInvoiceTab(tab.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2" onClick={() => { clearCart(); setShowInvoiceTabs(false); }}>
                <Plus className="w-4 h-4 ml-1" /> فاتورة جديدة فارغة
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 bg-card border-l border-border flex flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-border flex items-center gap-3">
          {restaurant.logo_url ? (
            <img src={restaurant.logo_url} alt="logo" className="w-10 h-10 rounded-xl object-contain bg-secondary/50" />
          ) : (
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-lg">
              {BUSINESS_TYPES[businessType]?.icon || '🏢'}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display font-bold text-sm truncate">{restaurant.name}</p>
            <p className="text-xs text-muted-foreground truncate">{BUSINESS_TYPES[businessType]?.label} — {profileName}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {isTrial && (
            <div className="mb-3 p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-center">
              <p className="font-bold text-warning">🎁 فترة تجريبية</p>
              <p className="text-muted-foreground">متبقي {trialDaysLeft} يوم</p>
              <button onClick={() => navigate('/payment')} className="text-primary underline text-xs mt-1">ترقية الآن</button>
            </div>
          )}
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabClick(tab.id)}
              className={`sidebar-nav-item w-full ${activeTab === tab.id ? 'active' : ''} ${tab.locked ? 'opacity-50' : ''}`}>
              <tab.icon className="w-5 h-5" />
              <span className="flex-1 text-right">{tab.label}</span>
              {tab.locked ? <Lock className="w-3 h-3 text-muted-foreground" /> : null}
              {tab.badge && !tab.locked ? <span className="w-5 h-5 rounded-full gradient-bg text-primary-foreground text-xs flex items-center justify-center">{tab.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          {currentShift && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-xs text-success">
              <CalendarClock className="w-3 h-3" /> شفت مفتوح
            </div>
          )}
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className="sidebar-nav-item w-full">
            {soundEnabled ? <Volume2 className="w-5 h-5 text-success" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
            <span>{soundEnabled ? 'الصوت مفعّل' : 'الصوت مغلق'}</span>
          </button>
          <motion.div animate={{ backgroundColor: isOnline ? 'hsl(142 71% 45% / 0.1)' : 'hsl(0 84% 60% / 0.1)' }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm">
            {isOnline ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
            <span className={isOnline ? 'text-success' : 'text-destructive'}>{isOnline ? 'متصل' : 'غير متصل'}</span>
          </motion.div>
          <button onClick={handleLogout} className="sidebar-nav-item w-full">
            <LogOut className="w-5 h-5" /><span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-2 p-3 border-b border-border overflow-x-auto bg-card shrink-0">
          {restaurant.logo_url && <img src={restaurant.logo_url} alt="logo" className="w-8 h-8 rounded-lg object-contain bg-secondary/50 shrink-0" />}
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${activeTab === tab.id ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'} ${tab.locked ? 'opacity-50' : ''}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
              {tab.locked ? <Lock className="w-3 h-3" /> : null}
              {tab.badge && !tab.locked ? <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{tab.badge}</span> : null}
            </button>
          ))}
        </header>

        <main className="flex-1 overflow-auto">

          {/* ===================== POS TAB ===================== */}
          {activeTab === 'pos' && (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Items Grid */}
              <div className="flex-1 p-4 overflow-auto">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'إيرادات اليوم', value: `${todayRevenue} ${currency}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
                    { label: 'طلبات اليوم', value: String(todayOrders.length), icon: Receipt, color: 'text-accent', bg: 'bg-accent/10' },
                    { label: 'متوسط الطلب', value: `${avgOrderValue} ${currency}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
                    { label: 'طلبات نشطة', value: String(pendingOrders.length), icon: Timer, color: 'text-warning', bg: 'bg-warning/10' },
                  ].map(s => (
                    <div key={s.label} className="glass-card p-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        <p className={`font-display font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table Grid - only for dine-in */}
                {orderType === 'dine_in' && (
                  <div className="glass-card p-4 mb-4">
                    <TableGrid
                      orders={orders}
                      onSelectTable={(num) => setTableNumber(String(num))}
                      selectedTable={tableNumber}
                      currency={currency}
                    />
                  </div>
                )}

                {/* Categories */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>الكل</button>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === cat ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{cat}</button>
                  ))}
                </div>
                <Input placeholder="🔍 بحث في القائمة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="mb-4" />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredItems.map(item => (
                    <motion.button key={item.id} whileTap={{ scale: 0.95 }} onClick={() => addToCart(item)} className="pos-grid-item text-right">
                      <div className="text-3xl mb-2">{item.image}</div>
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-primary font-bold text-sm">{item.price} {currency}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cart Panel */}
              <div className="w-full lg:w-96 bg-card border-r border-border flex flex-col">
                {/* Cart Header with tabs indicator */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-bold flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      {activeInvoiceId ? invoiceTabs.find(t => t.id === activeInvoiceId)?.label || 'فاتورة' : 'فاتورة جديدة'}
                      {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
                    </h3>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={holdCurrentInvoice} title="تعليق الفاتورة" disabled={cart.length === 0}>
                        <Pause className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowInvoiceTabs(true)} className="relative" title="الفواتير المعلّقة">
                        <Play className="w-4 h-4" />
                        {invoiceTabs.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-bg text-primary-foreground text-[10px] flex items-center justify-center">{invoiceTabs.length}</span>
                        )}
                      </Button>
                      {cart.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={clearCart} className="text-destructive" title="مسح السلة">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Order Type selector */}
                  <div className="flex gap-1 rounded-lg bg-secondary p-1">
                    {(['dine_in', 'takeaway', 'delivery'] as OrderType[]).map(t => (
                      <button key={t} onClick={() => setOrderType(t)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition-all ${orderType === t ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground'}`}>
                        <span>{ORDER_TYPE_CONFIG[t].icon}</span>
                        <span>{ORDER_TYPE_CONFIG[t].label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-3 space-y-2 border-b border-border bg-secondary/30">
                  <div className="grid grid-cols-2 gap-2">
                    {orderType === 'dine_in' && (
                      <div className="relative col-span-1">
                        <Hash className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="رقم الطاولة" className="pr-8 h-9 text-xs" type="number" />
                      </div>
                    )}
                    <div className="relative">
                      <Users className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسم العميل" className="pr-8 h-9 text-xs" />
                    </div>
                    {(orderType === 'delivery' || orderType === 'takeaway') && (
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="رقم الهاتف" className="pr-8 h-9 text-xs" />
                      </div>
                    )}
                  </div>
                  {orderType === 'delivery' && (
                    <>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
                        <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="عنوان التوصيل" className="pr-8 h-9 text-xs" />
                      </div>
                      {agents.filter(a => a.status === 'available').length > 0 && (
                        <select value={selectedDeliveryAgent} onChange={e => setSelectedDeliveryAgent(e.target.value)}
                          className="w-full h-9 text-xs bg-background border border-input rounded-md px-2">
                          <option value="">اختر مندوب التوصيل...</option>
                          {agents.filter(a => a.status === 'available').map(a => (
                            <option key={a.id} value={a.id}>🛵 {a.name}</option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                  <div className="relative">
                    <StickyNote className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
                    <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="ملاحظات الطلب..." className="pr-8 h-9 text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Percent className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={discount} onChange={e => setDiscount(e.target.value)} placeholder="خصم" className="pr-8 h-9 text-xs" type="number" />
                    </div>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button onClick={() => setDiscountType('percent')} className={`px-2 text-xs transition-colors ${discountType === 'percent' ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>%</button>
                      <button onClick={() => setDiscountType('fixed')} className={`px-2 text-xs transition-colors ${discountType === 'fixed' ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>{currency}</button>
                    </div>
                  </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {cart.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">السلة فارغة</p>}
                  {cart.map(c => (
                    <motion.div key={c.item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                      <span className="text-xl">{c.item.image}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.item.name}</p>
                        <p className="text-xs text-primary">{(c.item.price * c.qty).toFixed(2)} {currency}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(c.item.id, -1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-destructive/20 transition-colors"><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center text-sm font-medium">{c.qty}</span>
                        <button onClick={() => updateQty(c.item.id, 1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Totals & Checkout */}
                <div className="p-4 border-t border-border space-y-2">
                  {discountAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground"><span>المجموع الفرعي</span><span>{cartSubtotal.toFixed(2)} {currency}</span></div>
                      <div className="flex justify-between text-sm text-success"><span>الخصم</span><span>-{discountAmount.toFixed(2)} {currency}</span></div>
                    </>
                  )}
                  <div className="flex justify-between font-display font-bold text-lg">
                    <span>الإجمالي</span><span className="text-primary">{cartTotal.toFixed(2)} {currency}</span>
                  </div>
                  <Button onClick={checkout} className="w-full gradient-bg text-primary-foreground border-0 h-12 text-base" disabled={cart.length === 0}>
                    <Receipt className="w-5 h-5 ml-2" />
                    {orderType === 'delivery' ? '🛵 إرسال للتوصيل' : orderType === 'takeaway' ? '🛍️ تيك أواي' : 'إتمام الطلب'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== ORDERS TAB ===================== */}
          {activeTab === 'orders' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-xl font-bold">الطلبات ({filteredOrders.length})</h2>
              </div>
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
                const assignedAgent = agents.find(a => a.id === order.delivery_agent_id);
                return (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">#{order.order_number.slice(-4)}</span>
                        <Badge variant="outline" className="text-xs">{ORDER_TYPE_CONFIG[order.order_type as OrderType]?.icon} {ORDER_TYPE_CONFIG[order.order_type as OrderType]?.label}</Badge>
                        {order.table_number && <Badge variant="outline" className="text-xs"><Hash className="w-3 h-3 ml-0.5" />{order.table_number}</Badge>}
                        {order.customer_name && <span className="text-xs text-muted-foreground">{order.customer_name}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString('ar-EG')}</span>
                      </div>
                      <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                    </div>
                    {order.delivery_address && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{order.delivery_address}</p>}
                    {assignedAgent && <p className="text-xs text-warning mb-2 flex items-center gap-1">🛵 {assignedAgent.name}</p>}
                    {order.notes && <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5 mb-3 flex items-center gap-1"><StickyNote className="w-3 h-3" />{order.notes}</p>}
                    <div className="space-y-1 text-sm">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-muted-foreground">
                          <span>{item.menu_item_image} {item.menu_item_name} × {item.quantity}</span>
                          <span>{(item.price * item.quantity).toFixed(2)} {currency}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div>
                        {Number(order.discount) > 0 && <span className="text-xs text-success ml-2">خصم: -{order.discount} {currency}</span>}
                        <span className="font-bold text-primary">{order.total} {currency}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
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

          {/* ===================== DELIVERY TAB ===================== */}
          {activeTab === 'delivery' && (
            <DeliveryTab
              restaurantId={restaurant.id}
              agents={agents}
              setAgents={setAgents}
              deliveryOrders={deliveryOrders}
              onAssignAgent={handleAssignAgent}
            />
          )}

          {/* ===================== SHIFTS TAB ===================== */}
          {activeTab === 'shifts' && (
            <ShiftsTab
              restaurant={restaurant}
              currentShift={currentShift}
              setCurrentShift={setCurrentShift}
              profileName={profileName}
              userId={user!.id}
              todayRevenue={todayRevenue}
              todayOrdersCount={todayOrders.length}
            />
          )}

          {/* ===================== STATS TAB ===================== */}
          {activeTab === 'stats' && (
            <div className="p-4 space-y-6">
              <h2 className="font-display text-xl font-bold">الإحصائيات</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'إجمالي الإيرادات', value: `${totalRevenue} ${currency}`, color: 'text-primary' },
                  { label: 'إجمالي الطلبات', value: String(orders.length), color: 'text-foreground' },
                  { label: 'إيرادات اليوم', value: `${todayRevenue} ${currency}`, color: 'text-success' },
                  { label: 'متوسط قيمة الطلب', value: `${avgOrderValue} ${currency}`, color: 'text-accent' },
                ].map(s => (
                  <div key={s.label} className="glass-card p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

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
                              <motion.div initial={{ width: 0 }} animate={{ width: `${(qty / maxQty) * 100}%` }}
                                transition={{ duration: 0.8, delay: idx * 0.1 }} className="h-full rounded-full gradient-bg" />
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
                    <BarChart data={last7Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 18%, 18%)" />
                      <XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={12} />
                      <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(224, 24%, 12%)', border: '1px solid hsl(224, 18%, 18%)', borderRadius: '8px' }} formatter={(v: number) => [`${v} ${currency}`, 'الإيرادات']} />
                      <Bar dataKey="revenue" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {categoryData.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-display font-bold mb-4">التوزيع حسب الفئة</h3>
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>{categoryData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 w-full">{categoryData.map((d, idx) => <div key={d.name} className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} /><span className="text-sm flex-1">{d.name}</span><span className="text-sm font-bold text-primary">{d.value} {currency}</span></div>)}</div>
                    </div>
                  </div>
                )}
                <div className="glass-card p-6">
                  <h3 className="font-display font-bold mb-4">عدد الطلبات - آخر 7 أيام</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={last7Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 18%, 18%)" />
                        <XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={12} />
                        <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(224, 24%, 12%)', border: '1px solid hsl(224, 18%, 18%)', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="orders" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={{ fill: 'hsl(25, 95%, 53%)' }} name="الطلبات" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== MENU TAB ===================== */}
          {activeTab === 'menu' && (
            <MenuTab
              restaurant={restaurant}
              menuItems={menuItems}
              setMenuItems={setMenuItems}
              menuForm={menuForm}
              setMenuForm={setMenuForm}
              showAddItem={showAddItem}
              setShowAddItem={setShowAddItem}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              loadData={loadData}
            />
          )}

          {/* ===================== QR TAB ===================== */}
          {activeTab === 'qr' && (
            <div className="p-4 flex flex-col items-center">
              <h2 className="font-display text-xl font-bold mb-6">رابط المتجر الإلكتروني</h2>
              {restaurant.logo_url && (
                <img src={restaurant.logo_url} alt="logo" className="w-24 h-24 object-contain rounded-2xl mb-4 border border-border" />
              )}
              <div className="glass-card p-8 text-center">
                <QRCodeSVG value={`${window.location.origin}/store/${restaurant.id}`} size={220} bgColor="transparent" fgColor="hsl(25, 95%, 53%)" level="H" />
                <p className="text-muted-foreground text-sm mt-4">{restaurant.name}</p>
                <p className="text-xs text-muted-foreground mt-2">رابط المتجر — شاركه مع عملائك للطلب مباشرة</p>
                <p className="text-xs text-primary mt-1 break-all font-mono">{window.location.origin}/store/{restaurant.id}</p>
                <div className="flex gap-2 mt-4 justify-center">
                  <Button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/store/${restaurant.id}`).then(() => toast.success('تم نسخ الرابط'))} variant="outline">
                    نسخ الرابط
                  </Button>
                  <Button onClick={() => window.open(`${window.location.origin}/store/${restaurant.id}`, '_blank')} className="gradient-bg text-primary-foreground border-0">
                    معاينة المتجر
                  </Button>
                </div>
              </div>
              {/* QR Menu link (legacy) */}
              <div className="glass-card p-4 mt-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">رابط قائمة QR (للعرض فقط)</p>
                <QRCodeSVG value={`${window.location.origin}/qr-menu/${restaurant.id}`} size={120} bgColor="transparent" fgColor="hsl(var(--muted-foreground))" level="H" />
                <p className="text-[10px] text-muted-foreground mt-2 break-all">{window.location.origin}/qr-menu/{restaurant.id}</p>
              </div>
            </div>
          )}

          {/* ===================== WAITER TAB ===================== */}
          {activeTab === 'waiter' && (
            <div className="p-4">
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> استدعاءات الويتر
              </h2>
              {waiterCalls.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد استدعاءات</p>}
              {waiterCalls.map(call => (
                <motion.div key={call.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className={`glass-card p-4 mb-3 ${!call.acknowledged ? 'border-primary/50 pulse-notification' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{call.table_info}</p>
                      <p className="text-xs text-muted-foreground">{new Date(call.created_at).toLocaleTimeString('ar-EG')}</p>
                    </div>
                    {!call.acknowledged ? (
                      <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => handleAcknowledge(call.id)}>
                        <Check className="w-4 h-4 ml-1" /> تم
                      </Button>
                    ) : <Badge className="status-active">تم الاستجابة</Badge>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ===================== INVENTORY TAB ===================== */}
          {activeTab === 'inventory' && (
            <InventoryTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== CUSTOMERS TAB ===================== */}
          {activeTab === 'customers' && (
            <CustomersTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== SUPPLIERS TAB ===================== */}
          {activeTab === 'suppliers' && (
            <SuppliersTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== EXPENSES TAB ===================== */}
          {activeTab === 'expenses' && (
            <ExpensesTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== SETTINGS TAB ===================== */}
          {activeTab === 'settings' && (
            <div className="p-4 max-w-lg space-y-4">
              <h2 className="font-display text-xl font-bold">الإعدادات</h2>
              <div className="glass-card p-4 space-y-3">
                {restaurant.logo_url && (
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <img src={restaurant.logo_url} alt="logo" className="w-16 h-16 object-contain rounded-xl border border-border" />
                    <div>
                      <p className="font-bold">{restaurant.name}</p>
                      <p className="text-xs text-muted-foreground">يمكنك تغيير الشعار من تبويب القائمة</p>
                    </div>
                  </div>
                )}
                <div><p className="text-sm text-muted-foreground">نوع النشاط</p>
                  <p className="font-medium">{BUSINESS_TYPES[businessType]?.icon} {BUSINESS_TYPES[businessType]?.label}</p>
                </div>
                <div><p className="text-sm text-muted-foreground">اسم النشاط</p><p className="font-medium">{restaurant.name}</p></div>
                <div><p className="text-sm text-muted-foreground">المالك</p><p className="font-medium">{profileName}</p></div>
                <div><p className="text-sm text-muted-foreground">البريد</p><p className="font-medium">{user?.email}</p></div>
                <div><p className="text-sm text-muted-foreground">العملة</p><p className="font-medium">{restaurant.currency || 'ج.م'}</p></div>
                <div><p className="text-sm text-muted-foreground">حالة الاشتراك</p>
                  <Badge className={isSuspended ? 'status-suspended' : 'status-active'}>{isSuspended ? 'موقوف' : 'نشط'}</Badge>
                </div>
                {restaurant.subscription_end && (
                  <div><p className="text-sm text-muted-foreground">ينتهي في</p><p className="font-medium">{new Date(restaurant.subscription_end).toLocaleDateString('ar-EG')}</p></div>
                )}
                <div><p className="text-sm text-muted-foreground">المناديب المسجلون</p><p className="font-medium">{agents.length} مندوب</p></div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
