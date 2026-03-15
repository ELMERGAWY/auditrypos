import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, MapPin, Navigation, LogOut, Phone, Package,
  CheckCircle, Clock, ChefHat, RefreshCw, Wifi, WifiOff,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDarkMode } from '@/lib/useDarkMode';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

interface DriverOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_agent_id: string | null;
  created_at: string;
  items: { menu_item_name: string; menu_item_image: string; quantity: number; price: number }[];
  isMyOrder: boolean;
}

interface DriverAgent {
  id: string;
  name: string;
  phone: string;
  status: string;
  restaurant_id: string;
  restaurants?: { name: string; logo_url: string | null; currency: string };
}

interface DriverNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
}

export default function DriverDashboard() {
  useDarkMode();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [agent, setAgent] = useState<DriverAgent | null>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackingLocation, setTrackingLocation] = useState(false);
  const [tab, setTab] = useState<'available' | 'my' | 'notifications'>('available');

  useEffect(() => {
    const stored = localStorage.getItem('driver_session');
    if (!stored) { navigate('/driver-login'); return; }
    setAgent(JSON.parse(stored));
  }, [navigate]);

  const loadOrders = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('driver-api', {
        body: { action: 'get-orders', agent_id: agent.id },
      });
      if (data?.orders) setOrders(data.orders);
      if (data?.notifications) setNotifications(data.notifications);
    } catch { /* offline */ }
    setLoading(false);
  }, [agent]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!agent) return;
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [agent, loadOrders]);

  // Play notification sound when new orders arrive
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587, ctx.currentTime);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(988, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  // Realtime: listen for new delivery orders
  useEffect(() => {
    if (!agent) return;
    const channel = supabase
      .channel('driver-orders-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${agent.restaurant_id}`,
      }, (payload) => {
        const newOrder = payload.new as any;
        if (newOrder.order_type === 'delivery') {
          playNotificationSound();
          toast.success(`🆕 طلب توصيل جديد #${newOrder.order_number?.slice(-4)}`, { duration: 8000 });
          loadOrders();
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `restaurant_id=eq.${agent.restaurant_id}`,
      }, (payload) => {
        const n = payload.new as any;
        if (n.target_type === 'agent' && n.target_id === agent.id) {
          playNotificationSound();
          toast.info(n.title, { description: n.body, duration: 8000 });
          setNotifications(prev => [n, ...prev]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agent, playNotificationSound, loadOrders]);

  const startLocationTracking = () => {
    if (!navigator.geolocation) { toast.error('المتصفح لا يدعم تحديد الموقع'); return; }
    setTrackingLocation(true);
    
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        if (!agent) return;
        try {
          await supabase.functions.invoke('driver-api', {
            body: { action: 'update-location', agent_id: agent.id, lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
        } catch { /* offline - ignore */ }
      },
      () => {
        toast.error('خطأ في تحديد الموقع');
        setTrackingLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    (window as any).__driverWatchId = watchId;
    toast.success('تم تفعيل تتبع الموقع');
  };

  const stopLocationTracking = () => {
    if ((window as any).__driverWatchId != null) {
      navigator.geolocation.clearWatch((window as any).__driverWatchId);
    }
    setTrackingLocation(false);
    toast.info('تم إيقاف تتبع الموقع');
  };

  const acceptOrder = async (orderId: string) => {
    if (!agent) return;
    try {
      await supabase.functions.invoke('driver-api', {
        body: { action: 'accept-order', order_id: orderId, agent_id: agent.id },
      });
      setAgent(prev => prev ? { ...prev, status: 'busy' } : null);
      toast.success('تم قبول الطلب');
      loadOrders();
    } catch { toast.error('خطأ'); }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!agent) return;
    try {
      await supabase.functions.invoke('driver-api', {
        body: { action: 'update-order-status', order_id: orderId, status, agent_id: agent.id },
      });
      if (status === 'completed') {
        setAgent(prev => prev ? { ...prev, status: 'available' } : null);
      }
      toast.success(status === 'completed' ? 'تم تسليم الطلب ✅' : 'تم تحديث الحالة');
      loadOrders();
    } catch { toast.error('خطأ'); }
  };

  const handleLogout = async () => {
    if (agent) {
      try {
        await supabase.functions.invoke('driver-api', {
          body: { action: 'go-offline', agent_id: agent.id },
        });
      } catch { /* ignore */ }
    }
    stopLocationTracking();
    localStorage.removeItem('driver_session');
    navigate('/driver-login');
  };

  if (!agent) return null;

  const myOrders = orders.filter(o => o.isMyOrder);
  const availableOrders = orders.filter(o => !o.delivery_agent_id);
  const currency = agent.restaurants?.currency || 'ج.م';

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {agent.restaurants?.logo_url ? (
              <img src={agent.restaurants.logo_url} alt="" className="w-10 h-10 rounded-xl object-contain bg-secondary/50" />
            ) : (
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <p className="font-display font-bold text-sm">{agent.name}</p>
              <p className="text-xs text-muted-foreground">{agent.restaurants?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={agent.status === 'available' ? 'status-active' : agent.status === 'busy' ? 'status-pending' : 'bg-secondary text-muted-foreground'}>
              {agent.status === 'available' ? 'متاح' : agent.status === 'busy' ? 'مشغول' : 'غير متصل'}
            </Badge>
            {isOnline ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
          </div>
        </div>

        {/* Location & Actions */}
        <div className="flex gap-2 mt-3">
          {trackingLocation ? (
            <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={stopLocationTracking}>
              <Navigation className="w-4 h-4 ml-1 animate-pulse" /> إيقاف التتبع
            </Button>
          ) : (
            <Button size="sm" className="flex-1 gradient-bg text-primary-foreground border-0" onClick={startLocationTracking}>
              <Navigation className="w-4 h-4 ml-1" /> تفعيل الموقع
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={loadOrders} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        <button onClick={() => setTab('available')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === 'available' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          طلبات متاحة ({availableOrders.length})
        </button>
        <button onClick={() => setTab('my')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === 'my' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          طلباتي ({myOrders.length})
        </button>
        <button onClick={() => setTab('notifications')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors relative ${tab === 'notifications' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          <Bell className="w-4 h-4 inline ml-1" />
          إشعارات
          {notifications.length > 0 && (
            <span className="absolute top-1 left-1/2 w-4 h-4 rounded-full gradient-bg text-primary-foreground text-[10px] flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4 space-y-3">
        {loading && orders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        )}

        {/* Notifications Tab */}
        {tab === 'notifications' && (
          <>
            {notifications.length === 0 && (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد إشعارات</p>
              </div>
            )}
            {notifications.map(n => (
              <div key={n.id} className="glass-card p-4">
                <p className="font-bold text-sm">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(n.created_at).toLocaleTimeString('ar-EG')}
                </p>
              </div>
            ))}
          </>
        )}

        {/* Available Orders */}
        {tab === 'available' && availableOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد طلبات متاحة الآن</p>
          </div>
        )}

        {tab === 'my' && myOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد طلبات مخصصة لك</p>
          </div>
        )}

        <AnimatePresence>
          {tab !== 'notifications' && (tab === 'available' ? availableOrders : myOrders).map(order => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">#{order.order_number.slice(-4)}</span>
                  <Badge className={
                    order.status === 'pending' ? 'status-pending' :
                    order.status === 'preparing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'status-active'
                  }>
                    {order.status === 'pending' ? 'قيد الانتظار' : order.status === 'preparing' ? 'قيد التحضير' : 'جاهز'}
                  </Badge>
                </div>
                <span className="font-bold text-primary">{order.total} {currency}</span>
              </div>

              {order.customer_name && (
                <p className="text-sm mb-1">👤 {order.customer_name}</p>
              )}
              {order.customer_phone && (
                <a href={`tel:${order.customer_phone}`} className="text-sm text-primary flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3" /> {order.customer_phone}
                </a>
              )}
              {order.delivery_address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3 shrink-0" /> {order.delivery_address}
                </p>
              )}

              <div className="text-xs text-muted-foreground space-y-0.5 mb-3 bg-secondary/30 rounded-lg p-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.menu_item_image} {item.menu_item_name} × {item.quantity}</span>
                    <span>{(item.price * item.quantity).toFixed(0)} {currency}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString('ar-EG')}
                </span>
                <div className="flex gap-2">
                  {tab === 'available' && !order.delivery_agent_id && (
                    <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => acceptOrder(order.id)}>
                      <CheckCircle className="w-4 h-4 ml-1" /> قبول
                    </Button>
                  )}
                  {tab === 'my' && order.status === 'ready' && (
                    <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => updateOrderStatus(order.id, 'completed')}>
                      <CheckCircle className="w-4 h-4 ml-1" /> تم التسليم
                    </Button>
                  )}
                  {tab === 'my' && order.customer_phone && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${order.customer_phone}`}><Phone className="w-4 h-4" /></a>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>
    </div>
  );
}
