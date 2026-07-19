import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useDarkMode } from '@/lib/useDarkMode';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cacheData, getCachedData, syncPendingData } from '@/lib/offlineEngine';
import type { MenuItem, Order, OrderItem, WaiterCall, Restaurant, DeliveryAgent, Shift } from './types';
import { useOrderNotificationSound, useWaiterCallSound, showBrowserNotification, requestNotificationPermission } from './SoundNotifications';
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

  // Request browser notification permission on first load
  useEffect(() => { requestNotificationPermission(); }, []);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [servicePackages, setServicePackages] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [profileName, setProfileName] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const lastSyncRunAtRef = useRef(0);

  // Load cached data first for instant display
  const loadCachedData = useCallback(async (userId: string) => {
    const cached = await getCachedData<{
      restaurant: Restaurant | null;
      menuItems: MenuItem[];
      servicePackages: any[];
      orders: Order[];
      waiterCalls: WaiterCall[];
      agents: DeliveryAgent[];
      currentShift: Shift | null;
      profileName: string;
      isSuspended: boolean;
    }>(CACHE_KEY_PREFIX + userId);

    if (cached) {
      if (cached.restaurant) {
        setRestaurant(cached.restaurant);
        // Restore business_id to localStorage from cache
        localStorage.setItem('current_business_id', cached.restaurant.id);
        localStorage.setItem('current_business_name', cached.restaurant.name);
      }
      if ('menuItems' in cached) setMenuItems(cached.menuItems || []);
      if ('servicePackages' in cached) setServicePackages(cached.servicePackages || []);
      if ('orders' in cached) setOrders(cached.orders || []);
      if ('waiterCalls' in cached) setWaiterCalls(cached.waiterCalls || []);
      if ('agents' in cached) setAgents(cached.agents || []);
      if ('taxes' in (cached as any)) setTaxes((cached as any).taxes || []);
      if (cached.currentShift) setCurrentShift(cached.currentShift);
      if (cached.profileName) setProfileName(cached.profileName);
      if (cached.isSuspended !== undefined) setIsSuspended(cached.isSuspended);
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

    // ─── Determine target restaurant ID ───────────────────────────────────────
    // Priority: 1) saved in localStorage  2) most recently created by this owner
    //           3) company the user is an approved member of (employee flow)
    const savedBusinessId = localStorage.getItem('current_business_id');

    const profileRes = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();

    const pName = profileRes.data?.full_name || '';
    if (pName) setProfileName(pName);

    let rest: any = null;

    // Step 1: Try the exact restaurant by savedBusinessId (no owner filter — employees need this too)
    if (savedBusinessId) {
      const { data: savedRest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', savedBusinessId)
        .maybeSingle();
      rest = savedRest ?? null;
    }

    // Step 2: If no result yet (or savedBusinessId was stale), look for owner's most recent restaurant
    if (!rest) {
      const { data: ownerRests } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      rest = ownerRests?.[0] ?? null;
    }

    // Step 3: If still not found, check if user is an approved company member (employee)
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
          .order('created_at', { ascending: false })
          .limit(1);

        if (companyRestaurants && companyRestaurants.length > 0) {
          rest = companyRestaurants[0];
          // Persist so next login goes straight to this restaurant
          localStorage.setItem('current_business_id', rest.id);
        }
      }
    }

    if (!rest) {
      const { data: pendingReq } = await supabase
        .from('staff_access_requests')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (pendingReq && pendingReq.length > 0) {
        const req = pendingReq[0];
        if (req.status === 'pending') {
          toast.info('حسابك بانتظار موافقة أدمن الشركة. سيتم توجيهك لصفحة دخول الموظفين.');
          await signOut();
          navigate('/staff-login');
          return;
        } else if (req.status === 'rejected') {
          toast.error('تم رفض طلب انضمامك من قبل الإدارة.');
          await signOut();
          navigate('/staff-login');
          return;
        }
      }

      setRestaurant(prev => {
        if (prev) return prev;
        return null;
      });
      setDataLoaded(true);
      return;
    }
    
    // Set restaurant immediately to unlock UI
    setRestaurant(rest as unknown as Restaurant);
    localStorage.setItem('current_business_id', rest.id);
    localStorage.setItem('current_business_name', rest.name);

    const suspended = rest.status === 'suspended' || (rest.subscription_end && new Date(rest.subscription_end) < new Date());
    setIsSuspended(!!suspended);
    const businessType = (rest.business_type || 'restaurant') as BusinessType;
    const usesProductsCatalog = isInventoryDrivenBusiness(businessType);

    // Parallel fetch all other resources with optimized queries
    const [itemsRes, ordersRes, callsRes, agentsRes, shiftRes, taxesRes, warehousesRes] = await Promise.all([
      usesProductsCatalog
        ? supabase.from('products').select('id,name,price,category,image,available,restaurant_id,sort_order,barcode,sku,unit,quantity,warehouse_id').eq('restaurant_id', rest.id).order('sort_order')
        : supabase.from('menu_items').select('*').eq('restaurant_id', rest.id).order('sort_order'),
      supabase.from('orders').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('waiter_calls').select('*').eq('restaurant_id', rest.id).eq('acknowledged', false).order('created_at', { ascending: false }),
      supabase.from('delivery_agents').select('*').eq('restaurant_id', rest.id),
      supabase.from('shifts').select('*').eq('restaurant_id', rest.id).eq('status', 'open').maybeSingle(),
      supabase.from('tax_rates').select('*').eq('restaurant_id', rest.id).eq('is_active', true),
      usesProductsCatalog ? supabase.from('warehouses').select('id,name_ar,name').eq('restaurant_id', rest.id) : Promise.resolve({ data: [] })
    ]);

    const warehousesMap = new Map((warehousesRes.data || []).map((w: any) => [w.id, w.name || w.name_ar]));

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
          product_type: (product as any).product_type || 'inventory',
          warehouse_name: product.warehouse_id ? warehousesMap.get(product.warehouse_id) || null : null,
        })) as MenuItem[])
      : ((itemsRes.data || []) as MenuItem[]);
    const loadedAgents = (agentsRes.data || []) as DeliveryAgent[];
    const loadedTaxes = (taxesRes.data || []) as TaxRate[];
    const loadedShift = shiftRes.data as unknown as Shift | null;
    const loadedCalls = (callsRes.data || []) as WaiterCall[];

    // Load service packages from localStorage
    let loadedServicePackages: any[] = [];
    try {
      const savedPackages = localStorage.getItem(`service_packages_${rest.id}`);
      loadedServicePackages = savedPackages ? JSON.parse(savedPackages) : [];
    } catch {
      loadedServicePackages = [];
    }

    setMenuItems(loadedMenuItems);
    setServicePackages(loadedServicePackages);
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
      const itemsByOrderId = new Map<string, OrderItem[]>();

      for (const item of allItems || []) {
        const list = itemsByOrderId.get(item.order_id) || [];
        list.push(item as OrderItem);
        itemsByOrderId.set(item.order_id, list);
      }

      for (const o of ordersBatch) {
        ordersWithItems.push({
          ...o,
          items: itemsByOrderId.get(o.id) || []
        } as unknown as Order);
      }
    }

    // Attach display_paid_amount including unallocated manual receipt vouchers
    const customerIds = [
      ...new Set(
        ordersWithItems
          .map((o: any) => o.customer_id)
          .filter(Boolean)
      ),
    ] as string[];
    let enrichedOrders = ordersWithItems as any[];
    if (customerIds.length > 0) {
      const { data: vouchers } = await supabase
        .from('receipt_vouchers')
        .select('customer_id, amount, notes')
        .eq('restaurant_id', rest.id)
        .in('customer_id', customerIds);
      const { enrichOrdersDisplayPaid } = await import(
        '@/lib/accounting/receiptVoucherAllocation'
      );
      enrichedOrders = enrichOrdersDisplayPaid(ordersWithItems as any[], vouchers || []);
    } else {
      enrichedOrders = ordersWithItems.map((o: any) => ({
        ...o,
        display_paid_amount: Number(o.paid_amount || 0),
      }));
    }

    setOrders(enrichedOrders as Order[]);
    setDataLoaded(true);

    // Cache everything for offline use
    await cacheData(CACHE_KEY_PREFIX + user.id, {
      restaurant: rest,
      menuItems: loadedMenuItems,
      servicePackages: loadedServicePackages,
      orders: enrichedOrders,
      waiterCalls: loadedCalls,
      agents: loadedAgents,
      taxes: loadedTaxes,
      currentShift: loadedShift,
      profileName: pName,
      isSuspended: !!suspended,
    });

    return !!suspended;
  }, [user, loadCachedData]);

  const runPendingSync = useCallback(async (shouldReload: boolean) => {
    if (!user) return;

    const now = Date.now();
    if (now - lastSyncRunAtRef.current < 3000) {
      return;
    }
    lastSyncRunAtRef.current = now;

    const { synced, errors } = await syncPendingData();
    if (synced > 0) {
      toast.success(`✅ تمت مزامنة ${synced} عملية معلقة`);
      if (shouldReload) {
        setOrders(prev => prev.filter(o => !o.id.startsWith('offline-')));
        loadData();
      }
    }
    if (errors > 0) {
      toast.error(`⚠️ فشلت ${errors} عمليات في المزامنة`);
    }
  }, [user, loadData]);

  // Sync pending data when coming back online
  useEffect(() => {
    if (isOnline && user && dataLoaded) {
      runPendingSync(true);
    }
  }, [isOnline, user, dataLoaded, runPendingSync]);

  // Reload orders after manual receipt vouchers / payments
  useEffect(() => {
    const onReload = () => {
      if (user) loadData();
    };
    window.addEventListener('auditry:orders-reload', onReload);
    return () => window.removeEventListener('auditry:orders-reload', onReload);
  }, [user, loadData]);

  useEffect(() => {
    if (!authLoading && !user) { 
      // If we are offline, NEVER redirect to login. Stay in dashboard with cached data.
      if (!isOnline) {
        console.log("Offline mode: No active session but staying in dashboard due to offline-first policy.");
        setDataLoaded(true);
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
    if (!restaurant?.id || !isOnline) return;
    
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
            setOrders(prev => {
              if (prev.some(order => order.id === newOrder.id)) {
                // لا تستبدل مدفوعاً أعلى بقيمة أقل قادمة من الـ realtime (قد تكون قديمة قبل تثبيت المدفوع)
                return prev.map(order => {
                  if (order.id !== newOrder.id) return order;
                  const merged = { ...order, ...newOrder } as Order;
                  const localPaid = Number((order as any).paid_amount || 0);
                  const remotePaid = Number((newOrder as any).paid_amount || 0);
                  if (localPaid > remotePaid) {
                    (merged as any).paid_amount = localPaid;
                    (merged as any).direct_paid_amount = Math.max(
                      Number((order as any).direct_paid_amount || 0),
                      Number((newOrder as any).direct_paid_amount || 0),
                      localPaid
                    );
                  }
                  return merged;
                });
              }
              const cid = (payload.new as any).client_order_id;
              if (cid && prev.some(order => (order as any).client_order_id === cid)) {
                return prev;
              }
              return [newOrder, ...prev];
            });
            if (soundEnabled) playOrderSound();
            // Show a persistent browser notification (works even if tab is in background)
            const orderNum = (payload.new as any).order_number?.slice(-4) || '????';
            const customerName = (payload.new as any).customer_name || 'عميل';
            showBrowserNotification(
              `🛒 طلب جديد #${orderNum}`,
              `من: ${customerName} – المجموع: ${(payload.new as any).total || 0} ج.م`
            );
            toast.success(`🛒 طلب جديد #${orderNum} من المتجر`, { duration: 8000 });
          }
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
          (payload) => {
            setOrders(prev => prev.map(order => {
              if (order.id !== payload.new.id) return order;
              const merged = { ...order, ...payload.new } as Order;
              const localPaid = Number((order as any).paid_amount || 0);
              const remotePaid = Number((payload.new as any).paid_amount || 0);
              // احتفظ بالمدفوع الأعلى حتى لا يمسح الـ trigger قيمة صحيحة من الواجهة
              if (localPaid > remotePaid && remotePaid === 0) {
                (merged as any).paid_amount = localPaid;
              }
              const paid = Number((merged as any).paid_amount || 0);
              (merged as any).display_paid_amount = Math.max(
                paid,
                Number((order as any).display_paid_amount || 0),
                Number((payload.new as any).display_paid_amount || 0)
              );
              return merged;
            }));
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
      runPendingSync(false);
    }
  }, [justBack, user, runPendingSync]);

  return {
    user, authLoading, isOnline, restaurant, menuItems, setMenuItems,
    servicePackages, setServicePackages,
    orders, setOrders, waiterCalls, setWaiterCalls, agents, setAgents, taxes,
    currentShift, setCurrentShift, profileName, dataLoaded, loadData, handleLogout,
    soundEnabled, setSoundEnabled, isSuspended
  };
}
