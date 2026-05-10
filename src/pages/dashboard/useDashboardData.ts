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
import { journalService } from '@/lib/accounting/journalService';

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  type: string;
  is_included_in_price: boolean;
  is_active: boolean;
}

const CACHE_KEY_PREFIX = 'dashboard_';

export function useDashboardData() {
  useDarkMode();
  const navigate = useNavigate();
  const { user: supabaseUser, lastKnownUser, signOut, loading: authLoading } = useAuth();
  const user = supabaseUser || lastKnownUser;
  const { isOnline, wasOffline, justBack } = useOnlineStatus();
  const playOrderSound = useOrderNotificationSound();
  const playWaiterSound = useWaiterCallSound();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
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
      if (cached.restaurant) {
        setRestaurant(cached.restaurant);
        // Restore business_id to localStorage from cache
        localStorage.setItem('current_business_id', cached.restaurant.id);
        localStorage.setItem('current_business_name', cached.restaurant.name);
      }
      if (cached.menuItems?.length) setMenuItems(cached.menuItems);
      if (cached.orders?.length) setOrders(cached.orders);
      if (cached.waiterCalls?.length) setWaiterCalls(cached.waiterCalls);
      if (cached.agents?.length) setAgents(cached.agents);
      if ((cached as any).taxes?.length) setTaxes((cached as any).taxes);
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

    let rest = restsRes.data?.[0];

    // If no restaurant found as owner, try finding through company_users relationship
    if (!rest) {
      const { data: userCompanies } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (userCompanies && userCompanies.length > 0) {
        const companyId = userCompanies[0].company_id;
        const { data: companyRestaurants } = await supabase
          .from('restaurants')
          .select('*')
          .eq('company_id', companyId)
          .limit(1);

        if (companyRestaurants && companyRestaurants.length > 0) {
          rest = companyRestaurants[0];
        }
      }
    }

    if (!rest) {
      // CRITICAL: Do NOT wipe an already-loaded restaurant (from cache or previous load).
      // A transient RLS/network glitch on refresh must not throw the user back to the
      // "choose business" screen. Only set null if we have never successfully loaded one.
      setRestaurant(prev => {
        if (prev) {
          console.warn('[Dashboard] restaurants query returned empty but a restaurant is already loaded — keeping existing one to avoid logout-style redirect.');
          return prev;
        }
        return null;
      });
      setDataLoaded(true);
      return;
    }
    setRestaurant(rest as unknown as Restaurant);
    
    // Store business_id in localStorage for persistence across refreshes
    localStorage.setItem('current_business_id', rest.id);
    localStorage.setItem('current_business_name', rest.name);

    const suspended = rest.status === 'suspended' || (rest.subscription_end && new Date(rest.subscription_end) < new Date());

    const businessType = (rest.business_type || 'restaurant') as BusinessType;
    const usesProductsCatalog = isInventoryDrivenBusiness(businessType);

    // Ensure accounting is setup
    journalService.ensureAccountingSetup(rest.id, rest.currency || 'ج.م');

    const [itemsRes, ordersRes, callsRes, agentsRes, shiftRes, taxesRes] = await Promise.all([
      usesProductsCatalog
        ? supabase.from('products').select('*').eq('restaurant_id', rest.id).order('sort_order')
        : supabase.from('menu_items').select('*').eq('restaurant_id', rest.id).order('sort_order'),
      supabase.from('orders').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }).limit(200),
      supabase.from('waiter_calls').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }),
      supabase.from('delivery_agents').select('*').eq('restaurant_id', rest.id),
      supabase.from('shifts').select('*').eq('restaurant_id', rest.id).eq('status', 'open').maybeSingle(),
      supabase.from('tax_rates').select('*').eq('restaurant_id', rest.id).eq('is_active', true)
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
          stock_quantity: product.quantity || 0,
        })) as MenuItem[])
      : ((itemsRes.data || []) as MenuItem[]);
    const loadedAgents = (agentsRes.data || []) as DeliveryAgent[];
    const loadedTaxes = (taxesRes.data || []) as TaxRate[];
    const loadedShift = shiftRes.data as unknown as Shift | null;
    const loadedCalls = (callsRes.data || []) as WaiterCall[];

    setMenuItems(loadedMenuItems);
    setAgents(loadedAgents);
    setTaxes(loadedTaxes);
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
      taxes: loadedTaxes,
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
          // Remove offline orders from state before reloading
          setOrders(prev => prev.filter(o => !o.id.startsWith('offline-')));
          loadData(); // Reload fresh data
        }
        if (errors > 0) {
          toast.error(`⚠️ فشلت ${errors} عمليات في المزامنة`);
        }
      });
    }
  }, [isOnline, user, dataLoaded]);

  useEffect(() => {
    if (!authLoading && !user) { 
      // If we are offline, NEVER redirect to login. Stay in dashboard with cached data.
      if (!isOnline) {
        console.log("Offline mode: No active session but staying in dashboard due to offline-first policy.");
        return;
      }

      // If online, add a small grace period for auth to recover (e.g. during a token refresh)
      const timer = setTimeout(() => {
        if (!user && !authLoading && isOnline) {
          console.log("Auth session missing while online, redirecting after grace period...");
          navigate('/login');
        }
      }, 10000); // 10 seconds grace period
      return () => clearTimeout(timer);
    }
    
    if (user) {
      // Load cached data first for instant display
      loadCachedData(user.id).then(() => {
        // Then load fresh data from server
        if (isOnline) {
          loadData();
        }
      });
    }
  }, [user, authLoading, loadData, loadCachedData, navigate, isOnline]);

  // Realtime: waiter calls + agent locations + new orders + notifications
  useEffect(() => {
    if (!restaurant || !isOnline) return;
    
    const setupChannel = () => {
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
      return channel;
    };
    
    const channel = setupChannel();
    
    // Reconnect on network restore
    if (justBack) {
      toast.info('🔄 جاري إعادة الاتصال realtime...');
      supabase.removeChannel(channel);
      setupChannel();
    }
    
    return () => { supabase.removeChannel(channel); };
  }, [restaurant, isOnline, soundEnabled, playOrderSound, playWaiterSound, justBack]);

  const handleLogout = async () => { await signOut(); navigate('/'); };

  // Auto-sync and reconnect realtime when network is restored
  useEffect(() => {
    if (justBack && user) {
      toast.info('🔄 تم استعادة الاتصال - جاري المزامنة...');
      syncPendingData().then(({ synced, errors }) => {
        if (synced > 0) toast.success(`✅ تمت مزامنة ${synced} عمليات`);
        if (errors > 0) toast.error(`⚠️ فشلت ${errors} عمليات`);
      });
    }
  }, [justBack, user]);

  return {
    user, authLoading, isOnline, restaurant, menuItems, setMenuItems,
    orders, setOrders, waiterCalls, setWaiterCalls, agents, setAgents, taxes,
    currentShift, setCurrentShift, profileName, dataLoaded, loadData, handleLogout,
    soundEnabled, setSoundEnabled,
  };
}
