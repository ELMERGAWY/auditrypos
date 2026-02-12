import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, ShoppingCart, QrCode, Bell, Settings, LogOut, ChefHat,
  Plus, Minus, Trash2, Receipt, Wifi, WifiOff, X, Check, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getRestaurant, updateRestaurant, getCurrentRestaurantId, clearCurrentRestaurant,
  isSubscriptionActive, getWaiterCalls, acknowledgeWaiterCall,
  type Restaurant, type MenuItem, type CartItem, type Order
} from '@/lib/store';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

type Tab = 'pos' | 'orders' | 'menu' | 'qr' | 'waiter' | 'settings';

const Dashboard = () => {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('pos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [waiterCalls, setWaiterCalls] = useState<ReturnType<typeof getWaiterCalls>>([]);
  const [isSuspended, setIsSuspended] = useState(false);

  const loadData = useCallback(() => {
    const id = getCurrentRestaurantId();
    if (!id) { navigate('/login'); return; }
    const r = getRestaurant(id);
    if (!r) { navigate('/login'); return; }
    setRestaurant(r);
    setIsSuspended(!isSubscriptionActive(id));
    setWaiterCalls(getWaiterCalls(id));
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const interval = setInterval(() => {
      const id = getCurrentRestaurantId();
      if (id) {
        const calls = getWaiterCalls(id);
        const newUnack = calls.filter(c => !c.acknowledged);
        if (newUnack.length > waiterCalls.filter(c => !c.acknowledged).length) {
          try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Jn5+XkH17d3V5fYOGhYN9d3N0eH6EiIeEfnh0dHl/hYmIhYB7d3Z5foSIiIWBfHh2eX6EiIiFgXx4dnl+hIiIhYF8eHZ5foSIiIWBfHh2eX6EiIiFgQ==').play(); } catch {}
        }
        setWaiterCalls(calls);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [waiterCalls]);

  if (!restaurant) return null;

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const cartTotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);

  const checkout = () => {
    if (cart.length === 0) return;
    const order: Order = {
      id: `ORD-${Date.now()}`,
      items: [...cart],
      total: cartTotal,
      status: 'pending',
      createdAt: new Date().toISOString(),
      synced: isOnline,
    };
    const orders = [...restaurant.orders, order];
    updateRestaurant(restaurant.id, { orders });
    setRestaurant(r => r ? { ...r, orders } : r);
    setCart([]);
    toast.success(`تم إنشاء الطلب #${order.id.slice(-4)} — ${cartTotal} ج.م`);
  };

  const filteredItems = restaurant.menuItems.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return item.available;
  });

  const handleLogout = () => { clearCurrentRestaurant(); navigate('/'); };
  const unackCalls = waiterCalls.filter(c => !c.acknowledged);

  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { id: 'pos', label: 'نقطة البيع', icon: LayoutGrid },
    { id: 'orders', label: 'الطلبات', icon: Receipt, badge: restaurant.orders.filter(o => o.status === 'pending').length },
    { id: 'menu', label: 'القائمة', icon: ShoppingCart },
    { id: 'qr', label: 'QR Code', icon: QrCode },
    { id: 'waiter', label: 'استدعاء ويتر', icon: Bell, badge: unackCalls.length },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background dark flex" dir="rtl">
      {/* Suspension overlay */}
      <AnimatePresence>
        {isSuspended && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="glass-card p-8 max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">الحساب موقوف</h2>
              <p className="text-muted-foreground mb-6">انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للمتابعة.</p>
              <Button className="gradient-bg text-primary-foreground border-0" onClick={() => navigate('/payment')}>تجديد الاشتراك</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 bg-card border-l border-border flex flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm truncate">{restaurant.name}</p>
            <p className="text-xs text-muted-foreground">{restaurant.ownerName}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sidebar-nav-item w-full ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="flex-1 text-right">{tab.label}</span>
              {tab.badge ? (
                <span className="w-5 h-5 rounded-full gradient-bg text-primary-foreground text-xs flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Online status */}
        <div className="p-4 border-t border-border">
          <motion.div
            animate={{ backgroundColor: isOnline ? 'hsl(142 71% 45% / 0.1)' : 'hsl(0 84% 60% / 0.1)' }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          >
            {isOnline ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
            <span className={isOnline ? 'text-success' : 'text-destructive'}>{isOnline ? 'متصل' : 'غير متصل'}</span>
          </motion.div>
          <button onClick={handleLogout} className="sidebar-nav-item w-full mt-2">
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-2 p-3 border-b border-border overflow-x-auto bg-card">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge ? <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{tab.badge}</span> : null}
            </button>
          ))}
        </header>

        <main className="flex-1 overflow-auto">
          {/* POS Tab */}
          {activeTab === 'pos' && (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Menu Grid */}
              <div className="flex-1 p-4 overflow-auto">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                  >الكل</button>
                  {restaurant.categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === cat ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                    >{cat}</button>
                  ))}
                </div>
                <Input
                  placeholder="بحث في القائمة..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="mb-4"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredItems.map(item => (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addToCart(item)}
                      className="pos-grid-item text-right"
                    >
                      <div className="text-3xl mb-2">{item.image}</div>
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-primary font-bold text-sm">{item.price} ج.م</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cart */}
              <div className="w-full lg:w-80 bg-card border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                  <h3 className="font-display font-bold flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" /> السلة
                    {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
                  </h3>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {cart.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">السلة فارغة</p>}
                  {cart.map(c => (
                    <div key={c.menuItem.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                      <span className="text-xl">{c.menuItem.image}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.menuItem.name}</p>
                        <p className="text-xs text-primary">{c.menuItem.price * c.quantity} ج.م</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(c.menuItem.id, -1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-destructive/20 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{c.quantity}</span>
                        <button onClick={() => updateQty(c.menuItem.id, 1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border space-y-3">
                  <div className="flex justify-between font-display font-bold text-lg">
                    <span>الإجمالي</span>
                    <span className="text-primary">{cartTotal} ج.م</span>
                  </div>
                  <Button onClick={checkout} className="w-full gradient-bg text-primary-foreground border-0" disabled={cart.length === 0}>
                    <Receipt className="w-4 h-4 ml-2" /> إتمام الطلب
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="p-4 space-y-3">
              <h2 className="font-display text-xl font-bold mb-4">الطلبات ({restaurant.orders.length})</h2>
              {restaurant.orders.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد طلبات بعد</p>}
              {[...restaurant.orders].reverse().map(order => (
                <div key={order.id} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-bold text-sm">#{order.id.slice(-4)}</span>
                      <span className="text-xs text-muted-foreground mr-2">
                        {new Date(order.createdAt).toLocaleTimeString('ar-EG')}
                      </span>
                    </div>
                    <Badge className={
                      order.status === 'pending' ? 'status-pending' :
                      order.status === 'completed' ? 'status-active' : 'bg-secondary text-secondary-foreground'
                    }>
                      {order.status === 'pending' ? 'قيد الانتظار' : order.status === 'completed' ? 'مكتمل' : order.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    {order.items.map(item => (
                      <div key={item.menuItem.id} className="flex justify-between text-muted-foreground">
                        <span>{item.menuItem.name} × {item.quantity}</span>
                        <span>{item.menuItem.price * item.quantity} ج.م</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-border font-bold text-sm">
                    <span>الإجمالي</span>
                    <span className="text-primary">{order.total} ج.م</span>
                  </div>
                  {!order.synced && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-warning">
                      <WifiOff className="w-3 h-3" /> غير متزامن
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Menu Management Tab */}
          {activeTab === 'menu' && (
            <div className="p-4">
              <h2 className="font-display text-xl font-bold mb-4">إدارة القائمة</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {restaurant.menuItems.map(item => (
                  <div key={item.id} className="glass-card p-4 flex items-center gap-3">
                    <span className="text-2xl">{item.image}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                      <p className="text-sm text-primary font-bold">{item.price} ج.م</p>
                    </div>
                    <Badge className={item.available ? 'status-active' : 'status-suspended'}>
                      {item.available ? 'متاح' : 'غير متاح'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <div className="p-4 flex flex-col items-center">
              <h2 className="font-display text-xl font-bold mb-6">رمز QR لقائمة الطعام</h2>
              <div className="glass-card p-8 text-center">
                <QRCodeSVG
                  value={`${window.location.origin}/qr-menu/${restaurant.id}`}
                  size={220}
                  bgColor="transparent"
                  fgColor="hsl(25, 95%, 53%)"
                  level="H"
                />
                <p className="text-muted-foreground text-sm mt-4">امسح الكود لعرض القائمة</p>
                <p className="text-xs text-muted-foreground mt-1 break-all">{window.location.origin}/qr-menu/{restaurant.id}</p>
              </div>
            </div>
          )}

          {/* Waiter Calls Tab */}
          {activeTab === 'waiter' && (
            <div className="p-4">
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-primary" /> استدعاءات الويتر
              </h2>
              {waiterCalls.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد استدعاءات</p>}
              {[...waiterCalls].reverse().map(call => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`glass-card p-4 mb-3 ${!call.acknowledged ? 'border-primary/50 pulse-notification' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{call.tableInfo}</p>
                      <p className="text-xs text-muted-foreground">{new Date(call.timestamp).toLocaleTimeString('ar-EG')}</p>
                    </div>
                    {!call.acknowledged ? (
                      <Button
                        size="sm"
                        className="gradient-bg text-primary-foreground border-0"
                        onClick={() => {
                          acknowledgeWaiterCall(call.id);
                          setWaiterCalls(getWaiterCalls(restaurant.id));
                        }}
                      >
                        <Check className="w-4 h-4 ml-1" /> تم
                      </Button>
                    ) : (
                      <Badge className="status-active">تم الاستجابة</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="p-4 max-w-lg">
              <h2 className="font-display text-xl font-bold mb-4">الإعدادات</h2>
              <div className="glass-card p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">اسم المطعم</p>
                  <p className="font-medium">{restaurant.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المالك</p>
                  <p className="font-medium">{restaurant.ownerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">البريد</p>
                  <p className="font-medium">{restaurant.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">حالة الاشتراك</p>
                  <Badge className={isSuspended ? 'status-suspended' : 'status-active'}>
                    {isSuspended ? 'موقوف' : 'نشط'}
                  </Badge>
                </div>
                {restaurant.subscriptionEnd && (
                  <div>
                    <p className="text-sm text-muted-foreground">ينتهي في</p>
                    <p className="font-medium">{new Date(restaurant.subscriptionEnd).toLocaleDateString('ar-EG')}</p>
                  </div>
                )}
              </div>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/payment')}>تجديد الاشتراك</Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
