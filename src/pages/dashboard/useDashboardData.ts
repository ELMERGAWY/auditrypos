import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useDarkMode } from '@/lib/useDarkMode';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cacheData, getCachedData, syncPendingData } from '@/lib/offlineEngine';
import type { MenuItem, Order, OrderItem, WaiterCall, Restaurant, DeliveryAgent, Shift } from './types';
import { useOrderNotificationSound, useWaiterCallSound } from './SoundNotifications';
import { getDefaultItemIcon, isInventoryDrivenBusiness, type BusinessType } from '@/lib/businessTypes';

const CACHE_KEY_PREFIX = 'dashboard_';

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

  // Load cached data first for instant display
  const loadCachedData = useCallback(async (userId: string) => {
    const cached = await getCachedData<{
      restaurant: Restaurant | null;
      menuItems: MenuItem[];
      orders: Order[];
      waiterCalls: WaiterCall[];
      agents: DeliveryAgent[];
      currentShift: Shift | null;
      profileName: string;
    }>(CACHE_KEY_PREFIX + userId);

    if (cached) {
      if (cached.restaurant) setRestaurant(cached.restaurant);
      if (cached.menuItems?.length) setMenuItems(cached.menuItems);
      if (cached.orders?.length) setOrders(cached.orders);
      if (cached.waiterCalls?.length) setWaiterCalls(cached.waiterCalls);
      if (cached.agents?.length) setAgents(cached.agents);
      if (cached.currentShift) setCurrentShift(cached.currentShift);
      if (cached.profileName) setProfileName(cached.profileName);
      setDataLoaded(true);
      return true;
    }
    return false;
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;

    // If offline, try cached data
    if (!navigator.onLine) {
      const hasCached = await loadCachedData(user.id);
      if (hasCached) {
        toast.info('📴 وضع أوفلاين — البيانات محملة من الذاكرة المحلية');
        return;
      }
      toast.error('لا توجد بيانات مخزنة أوفلاين');
      setDataLoaded(true);
      return;
    }

    const [profileRes, restsRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
      supabase.from('restaurants').select('*').eq('owner_id', user.id).limit(1),
    ]);

    const pName = profileRes.data?.full_name || '';
    if (pName) setProfileName(pName);

    const rest = restsRes.data?.[0];
    if (!rest) { setRestaurant(null); setDataLoaded(true); return; }
    setRestaurant(rest as unknown as Restaurant);

    const suspended = rest.status === 'suspended' || (rest.subscription_end && new Date(rest.subscription_end) < new Date());

    const businessType = (rest.business_type || 'restaurant') as BusinessType;
    const usesProductsCatalog = isInventoryDrivenBusiness(businessType);

    const [itemsRes, ordersRes, callsRes, agentsRes, shiftRes] = await Promise.all([
      usesProductsCatalog
        ? supabase.from('products').select('*').eq('restaurant_id', rest.id).order('sort_order')
        : supabase.from('menu_items').select('*').eq('restaurant_id', rest.id).order('sort_order'),
      supabase.from('orders').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }).limit(200),
      supabase.from('waiter_calls').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }),
      supabase.from('delivery_agents').select('*').eq('restaurant_id', rest.id),
      supabase.from('shifts').select('*').eq('restaurant_id', rest.id).eq('status', 'open').maybeSingle(),
    ]);

    const loadedMenuItems = usesProductsCatalog
      ? ((itemsRes.data || []).map((product: any) => ({
          id: product.id,
          name: product.name,
          price: Number(product.price || 0),
          category: product.category || 'عام',
          image: product.image || getDefaultItemIcon(businessType),
          available: product.available,
          restaurant_id: product.restaurant_id,
          sort_order: product.sort_order || 0,
          product_id: product.id,
          inventory_mode: 'direct',
          barcode: product.barcode || '',
          sku: product.sku || '',
          unit: product.unit || 'قطعة',
        })) as MenuItem[])
      : ((itemsRes.data || []) as MenuItem[]);
    const loadedAgents = (agentsRes.data || []) as DeliveryAgent[];
    const loadedShift = shiftRes.data as unknown as Shift | null;
    const loadedCalls = (callsRes.data || []) as WaiterCall[];

    setMenuItems(loadedMenuItems);
    setAgents(loadedAgents);
    setCurrentShift(loadedShift);
    setWaiterCalls(loadedCalls);

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

    // Cache everything for offline use
    await cacheData(CACHE_KEY_PREFIX + user.id, {
      restaurant: rest,
      menuItems: loadedMenuItems,
      orders: ordersWithItems,
      waiterCalls: loadedCalls,
      agents: loadedAgents,
      currentShift: loadedShift,
      profileName: pName,
    });

    return !!suspended;
  }, [user, loadCachedData]);

  // Sync pending data when coming back online
  useEffect(() => {
    if (isOnline && user && dataLoaded) {
      syncPendingData().then(({ synced, errors }) => {
        if (synced > 0) {
          toast.success(`✅ تمت مزامنة ${synced} عملية معلقة`);
          loadData(); // Reload fresh data
        }
        if (errors > 0) {
          toast.error(`⚠️ فشلت ${errors} عمليات في المزامنة`);
        }
      });
    }
  }, [isOnline, user, dataLoaded]);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    if (user) {
      // Load cached data first for instant display
      loadCachedData(user.id).then(() => {
        // Then load fresh data from server
        loadData();
      });
    }
  }, [user, authLoading, loadData, loadCachedData, navigate]);

  // Realtime: waiter calls + agent locations + new orders + notifications
  useEffect(() => {
    if (!restaurant || !isOnline) return;
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `restaurant_id=eq.${restaurant.id}` },
        (payload) => {
          const n = payload.new as any;
          if (n.target_type === 'owner') {
            if (soundEnabled) playOrderSound();
            toast.info(n.title, { description: n.body, duration: 6000 });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurant, isOnline, soundEnabled, playOrderSound, playWaiterSound]);

  const handleLogout = async () => { await signOut(); navigate('/'); };

  return {
    user, authLoading, isOnline, restaurant, menuItems, setMenuItems,
    orders, setOrders, waiterCalls, setWaiterCalls, agents, setAgents,
    currentShift, setCurrentShift, profileName, dataLoaded, loadData, handleLogout,
    soundEnabled, setSoundEnabled,
  };
}
