import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useDarkMode } from '@/lib/useDarkMode';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MenuItem, Order, OrderItem, WaiterCall, Restaurant, DeliveryAgent, Shift } from './types';
import { useOrderNotificationSound, useWaiterCallSound } from './SoundNotifications';

export function useDashboardData() {
  useDarkMode();
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const isOnline = useOnlineStatus();
  const playOrderSound = useOrderNotificationSound();
  const playWaiterSound = useWaiterCallSound();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [profileName, setProfileName] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    const [profileRes, restsRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
      supabase.from('restaurants').select('*').eq('owner_id', user.id).limit(1),
    ]);

    if (profileRes.data) setProfileName(profileRes.data.full_name);

    const rest = restsRes.data?.[0];
    if (!rest) { setRestaurant(null); setDataLoaded(true); return; }
    setRestaurant(rest as unknown as Restaurant);

    const suspended = rest.status === 'suspended' || (rest.subscription_end && new Date(rest.subscription_end) < new Date());

    const [itemsRes, ordersRes, callsRes, agentsRes, shiftRes] = await Promise.all([
      supabase.from('menu_items').select('*').eq('restaurant_id', rest.id).order('sort_order'),
      supabase.from('orders').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }).limit(200),
      supabase.from('waiter_calls').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }),
      supabase.from('delivery_agents').select('*').eq('restaurant_id', rest.id),
      supabase.from('shifts').select('*').eq('restaurant_id', rest.id).eq('status', 'open').maybeSingle(),
    ]);

    setMenuItems((itemsRes.data || []) as MenuItem[]);
    setAgents((agentsRes.data || []) as DeliveryAgent[]);
    setCurrentShift(shiftRes.data as unknown as Shift | null);
    setWaiterCalls((callsRes.data || []) as WaiterCall[]);

    // Load order items in parallel batches
    const ordersWithItems: Order[] = [];
    const ordersBatch = ordersRes.data || [];
    if (ordersBatch.length > 0) {
      const orderIds = ordersBatch.map(o => o.id);
      const { data: allItems } = await supabase.from('order_items').select('*').in('order_id', orderIds);
      for (const o of ordersBatch) {
        const oItems = (allItems || []).filter(i => i.order_id === o.id);
        ordersWithItems.push({ ...o, items: oItems as OrderItem[] } as unknown as Order);
      }
    }
    setOrders(ordersWithItems);
    setDataLoaded(true);

    return !!suspended;
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    loadData();
  }, [user, authLoading, loadData, navigate]);

  // Realtime: waiter calls + agent locations + new orders
  useEffect(() => {
    if (!restaurant) return;
    const channel = supabase
      .channel('realtime-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waiter_calls', filter: `restaurant_id=eq.${restaurant.id}` },
        (payload) => {
          setWaiterCalls(prev => [payload.new as WaiterCall, ...prev]);
          if (soundEnabled) playWaiterSound();
          toast.info('🔔 استدعاء ويتر جديد!', { duration: 5000 });
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        async (payload) => {
          // Load order items for the new order
          const { data: items } = await supabase.from('order_items').select('*').eq('order_id', payload.new.id);
          const newOrder = { ...payload.new, items: (items || []) as OrderItem[] } as unknown as Order;
          setOrders(prev => [newOrder, ...prev]);
          if (soundEnabled) playOrderSound();
          toast.success(`🆕 طلب جديد #${(payload.new as any).order_number?.slice(-4)}`, { duration: 5000 });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_agents', filter: `restaurant_id=eq.${restaurant.id}` },
        (payload) => {
          setAgents(prev => prev.map(a => a.id === payload.new.id ? payload.new as DeliveryAgent : a));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurant, soundEnabled, playOrderSound, playWaiterSound]);

  const handleLogout = async () => { await signOut(); navigate('/'); };

  return {
    user, authLoading, isOnline, restaurant, menuItems, setMenuItems,
    orders, setOrders, waiterCalls, setWaiterCalls, agents, setAgents,
    currentShift, setCurrentShift, profileName, dataLoaded, loadData, handleLogout,
    soundEnabled, setSoundEnabled,
  };
}
