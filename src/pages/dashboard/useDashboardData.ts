// @ts-nocheck
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

export interface WorkspaceSummary {
  id: string;
  name: string;
  code: string;
  type?: string | null;
  is_default?: boolean;
  restaurant_id: string;
}

export function useDashboardData() {
  useDarkMode();
  const navigate = useNavigate();
  const { user: supabaseUser, lastKnownUser, signOut, loading: authLoading, isSuperAdmin } = useAuth();
  const user = supabaseUser || lastKnownUser;
  const { isOnline, wasOffline, justBack } = useOnlineStatus();
  const playOrderSound = useOrderNotificationSound();
  const playWaiterSound = useWaiterCallSound();

  // Request browser notification permission on first load
  useEffect(() => { requestNotificationPermission(); }, []);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
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

  // Helper functions for user-specific localStorage keys
  const getUserKey = useCallback((baseKey: string, userId: string) => `${baseKey}_${userId}`, []);

  // Migration helper: move old non-user-specific keys to user-specific ones
  const migrateLocalStorageKeys = useCallback((userId: string) => {
    // Migrate current_business_id
    const oldBusinessId = localStorage.getItem('current_business_id');
    if (oldBusinessId && !localStorage.getItem(getUserKey('current_business_id', userId))) {
      localStorage.setItem(getUserKey('current_business_id', userId), oldBusinessId);
    }
    // Migrate current_business_name
    const oldBusinessName = localStorage.getItem('current_business_name');
    if (oldBusinessName && !localStorage.getItem(getUserKey('current_business_name', userId))) {
      localStorage.setItem(getUserKey('current_business_name', userId), oldBusinessName);
    }
    // Also check for any service_packages_<id> keys to migrate
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('service_packages_')) {
        if (!localStorage.getItem(getUserKey(key, userId))) {
          const value = localStorage.getItem(key);
          if (value) {
            localStorage.setItem(getUserKey(key, userId), value);
          }
        }
      }
    }
  }, [getUserKey]);

  // Load cached data first for instant display
  const loadCachedData = useCallback(async (userId: string) => {
    // Migrate old keys first
    migrateLocalStorageKeys(userId);

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
        // Restore business_id to localStorage from cache (user-specific)
        localStorage.setItem(getUserKey('current_business_id', userId), cached.restaurant.id);
        localStorage.setItem(getUserKey('current_business_name', userId), cached.restaurant.name);
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
  }, [getUserKey, migrateLocalStorageKeys]);

  const loadData = useCallback(async () => {
    if (!user) return;

    console.log('🔍 [loadData] Starting for user:', user.id, user.email);

    // Migrate old keys first
    migrateLocalStorageKeys(user.id);

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
    // Priority: 1) saved in localStorage (user-specific)  2) owner's most recent  3) employee company
    const savedBusinessId = localStorage.getItem(getUserKey('current_business_id', user.id));
    console.log('🔍 [loadData] Saved business ID from localStorage:', savedBusinessId);

    const profileRes = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
    const pName = profileRes.data?.full_name || '';
    if (pName) setProfileName(pName);

    let rest: any = null;

    // ─── Step 1: Try exact restaurant by savedBusinessId (RLS handles security!) ──
    if (savedBusinessId) {
      console.log('🔍 [loadData] Step 1: Trying saved business ID...');
      const { data: savedRest, error: savedRestError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', savedBusinessId)
        .maybeSingle();
      
      console.log('🔍 [loadData] Step 1 result:', { savedRest, savedRestError });
      if (savedRest) {
        rest = savedRest;
      } else {
        // Clear invalid saved ID
        console.warn('⚠️ [loadData] Clearing invalid saved business ID');
        localStorage.removeItem(getUserKey('current_business_id', user.id));
        localStorage.removeItem(getUserKey('current_business_name', user.id));
      }
    }

    // ─── Step 2: Owner's most recent restaurant ────────────────────────────────
    if (!rest) {
      console.log('🔍 [loadData] Step 2: Trying owner restaurants...');
      const { data: ownerRests, error: ownerRestError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('🔍 [loadData] Step 2 result:', { ownerRests, ownerRestError });
      rest = ownerRests?.[0] ?? null;
    }

    // ─── Step 3: Employee — check company membership ───────────────────────────
    // Only runs if Steps 1 & 2 found nothing (i.e. pure employee with no owned restaurant)
    if (!rest) {
      console.log('🔍 [loadData] Step 3: Checking employee companies...');
      const { data: userCompanies, error: userCompaniesError } = await supabase
        .from('company_users')
        .select('company_id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      console.log('🔍 [loadData] Step 3 userCompanies:', { userCompanies, userCompaniesError, userId: user.id });

      if (userCompanies && userCompanies.length > 0) {
        const companyId = userCompanies[0].company_id;
        console.log('🔍 [loadData] Step 3: Found company ID:', companyId);

        const { data: companyRestaurants, error: companyRestError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('🔍 [loadData] Step 3 companyRestaurants:', { companyRestaurants, companyRestError, companyId });

        if (companyRestaurants && companyRestaurants.length > 0) {
          rest = companyRestaurants[0];
          localStorage.setItem(getUserKey('current_business_id', user.id), rest.id);
          console.log('🔍 [loadData] Step 3: Employee restaurant set:', rest.id);
        } else {
          console.warn('⚠️ [loadData] Step 3: No restaurants found for company:', companyId);
        }
      } else {
        console.warn('⚠️ [loadData] Step 3: No active company membership found for user:', user.id);
      }
    }

    // ─── Step 4: Super Admin — fallback to any restaurant if no other access ─────────
    // Only runs if Steps 1-3 found nothing AND user is Super Admin
    if (!rest && isSuperAdmin) {
      console.log('🔍 [loadData] Step 4: Super Admin fallback - loading any restaurant...');
      const { data: anyRestaurant, error: anyRestError } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('🔍 [loadData] Step 4 Super Admin result:', { anyRestaurant, anyRestError });

      if (anyRestaurant && anyRestaurant.length > 0) {
        rest = anyRestaurant[0];
        localStorage.setItem(getUserKey('current_business_id', user.id), rest.id);
      }
    }

    console.log('🔍 [loadData] Final restaurant found:', rest);

    if (!rest) {
      console.warn('⚠️ [loadData] No restaurant found! Checking pending requests...');
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
    console.log('✅ [loadData] Setting restaurant:', rest.id, rest.name);
    setRestaurant(rest as unknown as Restaurant);
    localStorage.setItem(getUserKey('current_business_id', user.id), rest.id);
    localStorage.setItem(getUserKey('current_business_name', user.id), rest.name);

    const suspended = rest.status === 'suspended' || (rest.subscription_end && new Date(rest.subscription_end) < new Date());
    setIsSuspended(!!suspended);
    const businessType = (rest.business_type || 'restaurant') as BusinessType;
    const usesProductsCatalog = isInventoryDrivenBusiness(businessType);

    // Resolve the active branch before loading operational data. Existing restaurants
    // always have a default workspace after the additive repair migration.
    const { data: workspaceRows, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id,name,code,type,is_default,restaurant_id')
      .eq('restaurant_id', rest.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    if (workspaceError) {
      console.warn('[loadData] workspace scope unavailable; using legacy restaurant scope:', workspaceError.message);
    }
    const loadedWorkspaces = (workspaceRows || []) as WorkspaceSummary[];
    const storedWorkspaceId = localStorage.getItem(getUserKey(`current_workspace_id_${rest.id}`, user.id));
    const selectedWorkspace = loadedWorkspaces.find(w => w.id === storedWorkspaceId)
      || loadedWorkspaces.find(w => w.is_default)
      || loadedWorkspaces[0]
      || null;
    const selectedWorkspaceId = selectedWorkspace?.id || null;
    setWorkspaces(loadedWorkspaces);
    setActiveWorkspaceId(selectedWorkspaceId);
    if (selectedWorkspaceId) {
      localStorage.setItem(getUserKey(`current_workspace_id_${rest.id}`, user.id), selectedWorkspaceId);
    }

    // Parallel fetch all other resources with workspace-aware queries.
    const [itemsRes, ordersRes, callsRes, agentsRes, shiftRes, taxesRes, warehousesRes] = await Promise.all([
      usesProductsCatalog
        ? (() => {
            const query = supabase.from('products').select('id,name,price,category,image,available,restaurant_id,sort_order,barcode,sku,unit,quantity,warehouse_id,workspace_id').eq('restaurant_id', rest.id).order('sort_order').limit(500);
            return selectedWorkspaceId ? query.eq('workspace_id', selectedWorkspaceId) : query;
          })()
        : (() => {
            const query = supabase.from('menu_items').select('*').eq('restaurant_id', rest.id).order('sort_order').limit(500);
            return selectedWorkspaceId ? query.eq('workspace_id', selectedWorkspaceId) : query;
          })(),
      // Keep the bounded fetch for stability while ensuring all visible orders belong to the active workspace.
      (() => {
        const query = supabase.from('orders').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }).limit(500);
        return selectedWorkspaceId ? query.eq('workspace_id', selectedWorkspaceId) : query;
      })(),
      supabase.from('waiter_calls').select('*').eq('restaurant_id', rest.id).eq('acknowledged', false).order('created_at', { ascending: false }).limit(200),
      supabase.from('delivery_agents').select('*').eq('restaurant_id', rest.id).limit(200),
      supabase.from('shifts').select('*').eq('restaurant_id', rest.id).eq('status', 'open').maybeSingle(),
      supabase.from('tax_rates').select('*').eq('restaurant_id', rest.id).eq('is_active', true).limit(200),
      usesProductsCatalog
        ? (() => {
            const query = supabase.from('warehouses').select('id,name_ar,name,workspace_id').eq('restaurant_id', rest.id).limit(200);
            return selectedWorkspaceId ? query.eq('workspace_id', selectedWorkspaceId) : query;
          })()
        : Promise.resolve({ data: [] })
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
      const savedPackages = localStorage.getItem(getUserKey(`service_packages_${rest.id}`, user.id));
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

    // Do not replace a previously loaded order list with an empty array on a transient query error.
    // The user can retry through the existing refresh/sync flow without losing the visible state.
    if (ordersRes.error) {
      console.error('[loadData] Failed to load orders:', ordersRes.error);
      toast.error('تعذر تحميل الطلبات مؤقتاً؛ تم الاحتفاظ بالبيانات الحالية. حاول التحديث مرة أخرى.');
      setDataLoaded(true);
      return !!suspended;
    }

    // Load order items in parallel batches
    const ordersWithItems: Order[] = [];
    const ordersBatch = ordersRes.data || [];
    if (ordersBatch.length > 0) {
      const orderIds = ordersBatch.map(o => o.id);
      const { data: allItems } = await supabase.from('order_items').select('*').in('order_id', orderIds).limit(10000);
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
  }, [user, loadCachedData, getUserKey, migrateLocalStorageKeys]);

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
            const { data: items } = await supabase.from('order_items').select('*').eq('order_id', payload.new.id).limit(200);
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

  const selectWorkspace = useCallback(async (workspaceId: string) => {
    if (!restaurant || !user || !workspaces.some(w => w.id === workspaceId)) return;
    localStorage.setItem(getUserKey(`current_workspace_id_${restaurant.id}`, user.id), workspaceId);
    setActiveWorkspaceId(workspaceId);
    // Do not leave the previous branch's orders/products interactive while reloading.
    setDataLoaded(false);
    await loadData();
  }, [restaurant, user, workspaces, getUserKey, loadData]);

  const handleLogout = async () => { await signOut(); navigate('/'); };

  // Auto-sync and reconnect realtime when network is restored
  useEffect(() => {
    if (justBack && user) {
      toast.info('🔄 تم استعادة الاتصال - جاري المزامنة...');
      runPendingSync(false);
    }
  }, [justBack, user, runPendingSync]);

  return {
    user, authLoading, isOnline, restaurant, workspaces, activeWorkspaceId, selectWorkspace,
    menuItems, setMenuItems, servicePackages, setServicePackages,
    orders, setOrders, waiterCalls, setWaiterCalls, agents, setAgents, taxes,
    currentShift, setCurrentShift, profileName, dataLoaded, loadData, handleLogout,
    soundEnabled, setSoundEnabled, isSuspended
  };
}
