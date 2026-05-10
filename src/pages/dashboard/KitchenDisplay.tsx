import { useState, useEffect, useRef } from 'react';
import { useDashboardData } from './useDashboardData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ChefHat, Clock, Check, X, AlertCircle, RefreshCw, 
  Utensils, Timer, Bell, Volume2, VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OrderItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  notes?: string;
  status: string;
}

interface KitchenOrder {
  id: string;
  order_number: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  created_at: string;
  items: OrderItem[];
  customer_name?: string;
  table_number?: number;
  notes?: string;
  order_type: string;
}

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
  preparing: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  ready: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
  completed: 'bg-gray-500/20 border-gray-500/50 text-gray-400'
};

const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  preparing: 'قيد التحضير',
  ready: 'جاهز للتقديم',
  completed: 'مكتمل'
};

export default function KitchenDisplay() {
  const { restaurant, user, isOnline, soundEnabled, setSoundEnabled } = useDashboardData();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [filter, setFilter] = useState<'pending' | 'preparing' | 'ready'>('pending');
  const [sound, setSound] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!restaurant?.id) return;
    
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurant.id)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        const formatted = data.map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          created_at: o.created_at,
          customer_name: o.customer_name,
          table_number: o.table_number,
          notes: o.notes,
          order_type: o.order_type,
          items: (o.order_items || []).map((item: any) => ({
            id: item.id,
            menu_item_name: item.menu_item_name,
            quantity: item.quantity,
            notes: item.notes || '',
            status: item.status || 'pending'
          }))
        })) as KitchenOrder[];
        setOrders(formatted);
      }
    };

    fetchOrders();
    
    const channel = supabase
      .channel('kds-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders', 
        filter: `restaurant_id=eq.${restaurant.id}` 
      }, (payload) => {
        if (['pending', 'preparing', 'ready'].includes(payload.new.status)) {
          if (sound && soundEnabled) playNotificationSound();
          fetchOrders();
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders', 
        filter: `restaurant_id=eq.${restaurant.id}` 
      }, (payload) => {
        fetchOrders();
      })
      .subscribe();

    const interval = setInterval(fetchOrders, 10000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, sound, soundEnabled]);

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRon', +'AAAAAAAAAAAA');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!isOnline) {
      toast.error('لا يوجد اتصال بالإنترنت');
      return;
    }
    
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    
    if (error) {
      toast.error('فشل في تحديث الحالة');
    } else {
      toast.success(`تم تحديث الحالة إلى: ${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}`);
      if (sound) playNotificationSound();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredOrders = orders.filter(o => o.status === filter || filter === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-xl">
            <ChefHat className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">عرض المطبخ (KDS)</h1>
            <p className="text-slate-400 text-sm">{restaurant?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={sound ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSound(!sound)}
            className={sound ? 'bg-emerald-600' : 'bg-slate-700'}
          >
            {sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="bg-slate-700"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(['pending', 'preparing', 'ready'] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'ghost'}
            onClick={() => setFilter(s)}
            className={`${
              filter === s 
                ? s === 'pending' ? 'bg-amber-600' 
                : s === 'preparing' ? 'bg-blue-600' 
                : 'bg-emerald-600'
                : 'bg-slate-700'
            }`}
          >
            {STATUS_LABELS[s]}
            <Badge className="ml-2 bg-white/20">
              {orders.filter(o => o.status === s).length}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className={`p-4 rounded-xl border-2 transition-all ${
              STATUS_COLORS[order.status]
            } ${order.status === 'pending' ? 'animate-pulse' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">#{order.order_number?.slice(-4)}</span>
                {order.table_number && (
                  <Badge className="bg-slate-600">طاولة {order.table_number}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span>{getTimeAgo(order.created_at)}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-black/20 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-amber-400">{item.quantity}x</span>
                    <span className="font-medium">{item.menu_item_name}</span>
                  </div>
                  {item.notes && (
                    <div className="text-xs text-slate-400 italic truncate max-w-[100px]">
                      {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="mb-3 p-2 bg-slate-800/50 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 inline ml-1 text-amber-400" />
                {order.notes}
              </div>
            )}

            <div className="flex gap-2">
              {order.status === 'pending' && (
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                >
                  <Utensils className="w-4 h-4 ml-1" />
                  بدء التحضير
                </Button>
              )}
              {order.status === 'preparing' && (
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => updateOrderStatus(order.id, 'ready')}
                >
                  <Check className="w-4 h-4 ml-1" />
                  جاهز
                </Button>
              )}
              {order.status === 'ready' && (
                <Button
                  size="sm"
                  className="flex-1 bg-slate-600 hover:bg-slate-700"
                  onClick={() => updateOrderStatus(order.id, 'completed')}
                >
                  <X className="w-4 h-4 ml-1" />
                  إغلاق
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <ChefHat className="w-20 h-20 mx-auto mb-4 opacity-50" />
          <p className="text-xl">لا توجد طلبات في الطلبية</p>
        </div>
      )}
    </div>
  );
}