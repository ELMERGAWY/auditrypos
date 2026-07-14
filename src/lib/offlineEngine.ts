// Offline-First Engine: Cache data locally & sync when online

const DB_NAME = 'smartpos_offline';
const DB_VERSION = 3;
const STORES = ['pendingOrders', 'pendingStatusUpdates', 'pendingTransactions', 'cachedData', 'syncMeta'] as const;
const CACHE_VERSION = 2; // Increment this when breaking changes are made to cached data structure

function isIndexedDbAvailable() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Sync Metadata ───
export interface SyncMeta {
  id: string;
  retryCount: number;
  lastAttempt: number;
  lastError?: string;
}

export interface SyncStatus {
  pendingOrders: number;
  pendingUpdates: number;
  pendingTransactions: number;
  lastSync: number | null;
  isSyncing: boolean;
}

async function getSyncMeta(id: string): Promise<SyncMeta | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('syncMeta', 'readonly');
    const req = tx.objectStore('syncMeta').get(id);
    return new Promise(res => { req.onsuccess = () => res(req.result ?? null); req.onerror = () => res(null); });
  } catch { return null; }
}

async function updateSyncMeta(id: string, meta: Partial<SyncMeta> & { id: string }) {
  try {
    const db = await openDB();
    const tx = db.transaction('syncMeta', 'readwrite');
    const store = tx.objectStore('syncMeta');
    const existing = await new Promise<SyncMeta | null>(res => {
      const req = store.get(id);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror = () => res(null);
    });
    store.put({ ...existing, ...meta });
  } catch {}
}

async function removeSyncMeta(id: string) {
  try {
    const db = await openDB();
    const tx = db.transaction('syncMeta', 'readwrite');
    tx.objectStore('syncMeta').delete(id);
  } catch {}
}

// Exponential backoff calculator
function getBackoffDelay(retryCount: number): number {
  const baseDelay = 1000;
  const maxDelay = 60000;
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  return delay + Math.random() * 1000;
}

// Check if should retry based on backoff
function shouldRetry(meta: SyncMeta | null): boolean {
  if (!meta) return true;
  const delay = getBackoffDelay(meta.retryCount);
  return Date.now() - meta.lastAttempt >= delay;
}

// ─── Pending Orders Queue ───
export interface PendingOrder {
  id: string;
  restaurantId: string;
  orderData: Record<string, any>;
  items: Record<string, any>[];
  timestamp: number;
}

export async function queueOfflineOrder(order: PendingOrder) {
  const db = await openDB();
  const tx = db.transaction('pendingOrders', 'readwrite');
  tx.objectStore('pendingOrders').put(order);
  return new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingOrders', 'readonly');
    const req = tx.objectStore('pendingOrders').getAll();
    return await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  } catch {
    return [];
  }
}

export async function removePendingOrder(id: string) {
  const db = await openDB();
  const tx = db.transaction('pendingOrders', 'readwrite');
  tx.objectStore('pendingOrders').delete(id);
  await removeSyncMeta(id);
}

// ─── Pending Status Updates Queue ───
export interface PendingStatusUpdate {
  id: string;
  orderId: string;
  status: string;
  timestamp: number;
}

export async function queueStatusUpdate(update: PendingStatusUpdate) {
  const db = await openDB();
  const tx = db.transaction('pendingStatusUpdates', 'readwrite');
  tx.objectStore('pendingStatusUpdates').put(update);
}

export async function getPendingStatusUpdates(): Promise<PendingStatusUpdate[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingStatusUpdates', 'readonly');
    const req = tx.objectStore('pendingStatusUpdates').getAll();
    return await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  } catch {
    return [];
  }
}

export async function removePendingStatusUpdate(id: string) {
  const db = await openDB();
  const tx = db.transaction('pendingStatusUpdates', 'readwrite');
  tx.objectStore('pendingStatusUpdates').delete(id);
  await removeSyncMeta(id);
}

// ─── Pending Transactions Queue (General ERP) ───
export interface PendingTransaction {
  id: string;
  type: 'expense' | 'sales_order' | 'crm_log' | 'return' | 'stock_adjustment' | 'marketing_metadata';
  payload: any;
  timestamp: number;
}

export async function queueTransaction(txData: PendingTransaction) {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingTransactions', 'readwrite');
    tx.objectStore('pendingTransactions').put(txData);
  } catch (err) {
    console.error('Failed to queue offline transaction:', err);
  }
}

export async function getPendingTransactions(): Promise<PendingTransaction[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingTransactions', 'readonly');
    const req = tx.objectStore('pendingTransactions').getAll();
    return new Promise((res) => { req.onsuccess = () => res(req.result); req.onerror = () => res([]); });
  } catch { return []; }
}

export async function removePendingTransaction(id: string) {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingTransactions', 'readwrite');
    tx.objectStore('pendingTransactions').delete(id);
    await removeSyncMeta(id);
  } catch {}
}

// ─── Cache Dashboard Data ───
export async function cacheData(key: string, data: any) {
  try {
    const db = await openDB();
    const tx = db.transaction('cachedData', 'readwrite');
    tx.objectStore('cachedData').put({ id: key, data, cachedAt: Date.now(), version: CACHE_VERSION });
  } catch { /* silently fail */ }
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('cachedData', 'readonly');
    const req = tx.objectStore('cachedData').get(key);
    return new Promise((res) => {
      req.onsuccess = () => {
        const result = req.result;
        // Only return data if version matches current CACHE_VERSION
        if (result?.version === CACHE_VERSION) {
          res(result.data ?? null);
        } else {
          res(null);
        }
      };
      req.onerror = () => res(null);
    });
  } catch { return null; }
}

export async function clearCachedData() {
  try {
    const db = await openDB();
    const tx = db.transaction('cachedData', 'readwrite');
    tx.objectStore('cachedData').clear();
    return new Promise<void>((res) => {
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch { /* silently fail */ }
}

// Get current sync status
export async function getSyncStatus(): Promise<SyncStatus> {
  const [orders, updates, transactions] = await Promise.all([
    getPendingOrders(),
    getPendingStatusUpdates(),
    getPendingTransactions()
  ]);
  
  const lastSync = await getCachedData<number>('lastSyncTime');
  
  return {
    pendingOrders: orders.length,
    pendingUpdates: updates.length,
    pendingTransactions: transactions.length,
    lastSync: lastSync,
    isSyncing: false
  };
}

// ─── Sync Engine ───
import { supabase } from '@/integrations/supabase/client';
import { journalService } from './accounting/journalService';
import type { Order, OrderItem } from '@/pages/dashboard/types';
import type { BusinessType } from './businessTypes';

// Add network listener for automatic sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('System back online. Triggering background sync...');
    syncPendingData();
  });
}

export async function syncPendingData(): Promise<{ synced: number; errors: number }> {
  let synced = 0, errors = 0;

  // Session Validation: Prevent flood of RLS errors if token expired while offline
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn("Offline sync aborted: No active session. User must re-authenticate.");
    return { synced: 0, errors: 0 };
  }

  const orders = await getPendingOrders();
  for (const po of orders) {
    const meta = await getSyncMeta(po.id);
    
    if (!shouldRetry(meta)) {
      continue;
    }
    
    try {
      await updateSyncMeta(po.id, { id: po.id, retryCount: meta?.retryCount ?? 0, lastAttempt: Date.now() });
      
      const clientOrderId = po.orderData.client_order_id || po.id;
      const orderPayload = { ...po.orderData, client_order_id: clientOrderId };

      const { data: existing } = await supabase.from('orders')
        .select('id')
        .eq('client_order_id', clientOrderId)
        .limit(1);

      if (existing && existing.length > 0) {
        await removePendingOrder(po.id);
        synced++;
        continue;
      }

      const { data: order, error } = await supabase.from('orders').insert(orderPayload as any).select().single();
      if (error || !order) {
        // تعارض unique = الطلب موجود مسبقاً — اعتبرها مزامنة ناجحة ولا تعِد الإدراج
        if (error?.code === '23505' || String(error?.message || '').includes('duplicate')) {
          await removePendingOrder(po.id);
          synced++;
          continue;
        }
        await updateSyncMeta(po.id, { 
          id: po.id, 
          retryCount: (meta?.retryCount ?? 0) + 1, 
          lastAttempt: Date.now(),
          lastError: error?.message || 'Insert failed'
        });
        errors++; 
        continue; 
      }
      
      const itemsWithOrderId = po.items.map(item => ({
        order_id: order.id,
        menu_item_name: item.menu_item_name as string,
        menu_item_image: item.menu_item_image as string,
        quantity: item.quantity as number,
        price: item.price as number,
        menu_item_id: item.menu_item_id || null,
        product_id: item.product_id || null,
        sold_unit: item.sold_unit || '',
        unit_factor: item.unit_factor || 1,
        cost_price_snapshot: item.cost_price_snapshot || 0,
      }));
      const { data: items, error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId).select();
      
      if (itemsError) {
        // Rollback the order to prevent corrupted (empty) orders in the DB
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`فشل إدخال عناصر الطلب: ${itemsError.message}`);
      }
      
      try {
        const { data: rest } = await supabase.from('restaurants').select('business_type, currency').eq('id', order.restaurant_id).single();
        const businessType = (rest?.business_type || 'restaurant') as BusinessType;
        
        await journalService.ensureAccountingSetup(order.restaurant_id, rest?.currency || 'ج.م');
        await journalService.createSaleJournalEntry(
          order.restaurant_id,
          { ...order, items: (items || []) as OrderItem[] } as Order,
          businessType,
          0,
          0
        );
      } catch (accErr) {
        console.error("Accounting sync error:", accErr);
      }

      await removePendingOrder(po.id);
      synced++;
    } catch (e: any) {
      await updateSyncMeta(po.id, { 
        id: po.id, 
        retryCount: (meta?.retryCount ?? 0) + 1, 
        lastAttempt: Date.now(),
        lastError: e.message || 'Unknown error'
      });
      errors++;
    }
  }

  // Sync pending status updates
  const pendingUpdates = await getPendingStatusUpdates();
  for (const pu of pendingUpdates) {
    const meta = await getSyncMeta(pu.id);
    
    if (!shouldRetry(meta)) {
      continue;
    }
    
    try {
      await updateSyncMeta(pu.id, { id: pu.id, retryCount: meta?.retryCount ?? 0, lastAttempt: Date.now() });
      
      const { error } = await supabase.from('orders').update({ status: pu.status }).eq('id', pu.orderId);
      if (!error) {
        await removePendingStatusUpdate(pu.id);
        synced++;
      } else {
        await updateSyncMeta(pu.id, { 
          id: pu.id, 
          retryCount: (meta?.retryCount ?? 0) + 1, 
          lastAttempt: Date.now(),
          lastError: error.message
        });
        errors++;
      }
    } catch (e: any) {
      await updateSyncMeta(pu.id, { 
        id: pu.id, 
        retryCount: (meta?.retryCount ?? 0) + 1, 
        lastAttempt: Date.now(),
        lastError: e.message || 'Unknown error'
      });
      errors++;
    }
  }

  // Sync pending ERP transactions
  const pendingTxs = await getPendingTransactions();
  for (const ptx of pendingTxs) {
    const meta = await getSyncMeta(ptx.id);
    
    if (!shouldRetry(meta)) {
      continue;
    }
    
    try {
      await updateSyncMeta(ptx.id, { id: ptx.id, retryCount: meta?.retryCount ?? 0, lastAttempt: Date.now() });
      
      let success = false;
      switch (ptx.type) {
        case 'expense':
          const { error: expErr } = await supabase.from('expenses').insert(ptx.payload);
          if (!expErr) success = true;
          break;
        case 'crm_log':
          const { error: crmErr } = await supabase.from('crm_communication_logs').insert(ptx.payload);
          if (!crmErr) success = true;
          break;
        case 'sales_order':
          const { error: soErr } = await supabase.from('orders').insert(ptx.payload);
          if (!soErr) success = true;
          break;
        case 'marketing_metadata':
          const { data: existingLead } = await supabase.from('crm_leads')
            .select('id')
            .eq('restaurant_id', ptx.payload.restaurant_id)
            .eq('name', 'MARKETING_ERP_SYSTEM_METADATA')
            .limit(1);
          if (existingLead && existingLead.length > 0) {
            const { error: updErr } = await supabase.from('crm_leads')
              .update({ raw_social_data: ptx.payload.data })
              .eq('id', existingLead[0].id);
            if (!updErr) success = true;
          } else {
            const { error: insErr } = await supabase.from('crm_leads')
              .insert({
                restaurant_id: ptx.payload.restaurant_id,
                name: 'MARKETING_ERP_SYSTEM_METADATA',
                raw_social_data: ptx.payload.data,
                stage: 'metadata'
              });
            if (!insErr) success = true;
          }
          break;
      }
      if (success) {
        await removePendingTransaction(ptx.id);
        synced++;
      } else {
        await updateSyncMeta(ptx.id, { 
          id: ptx.id, 
          retryCount: (meta?.retryCount ?? 0) + 1, 
          lastAttempt: Date.now(),
          lastError: 'Insert failed'
        });
        errors++;
      }
    } catch (e: any) {
      await updateSyncMeta(ptx.id, { 
        id: ptx.id, 
        retryCount: (meta?.retryCount ?? 0) + 1, 
        lastAttempt: Date.now(),
        lastError: e.message || 'Unknown error'
      });
      errors++;
    }
  }

  if (synced > 0) {
    await cacheData('lastSyncTime', Date.now());
  }

  return { synced, errors };
}

// Force sync - ignore backoff and retry all pending
export async function forceSyncPendingData(): Promise<{ synced: number; errors: number }> {
  let synced = 0, errors = 0;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { synced: 0, errors: 0 };

  const orders = await getPendingOrders();
  for (const po of orders) {
    try {
      const clientOrderId = po.orderData.client_order_id || po.id;
      const orderPayload = { ...po.orderData, client_order_id: clientOrderId };

      const { data: existing } = await supabase.from('orders')
        .select('id')
        .eq('client_order_id', clientOrderId)
        .limit(1);

      if (existing && existing.length > 0) {
        await removePendingOrder(po.id);
        synced++;
        continue;
      }

      const { data: order, error } = await supabase.from('orders').insert(orderPayload as any).select().single();
      if (error || !order) {
        if (error?.code === '23505' || String(error?.message || '').includes('duplicate')) {
          await removePendingOrder(po.id);
          synced++;
          continue;
        }
        errors++;
        continue;
      }
      
      const itemsWithOrderId = po.items.map(item => ({
        order_id: order.id,
        menu_item_name: item.menu_item_name as string,
        menu_item_image: item.menu_item_image as string,
        quantity: item.quantity as number,
        price: item.price as number,
        menu_item_id: item.menu_item_id || null,
        product_id: item.product_id || null,
        sold_unit: item.sold_unit || '',
        unit_factor: item.unit_factor || 1,
        cost_price_snapshot: item.cost_price_snapshot || 0,
      }));
      const { data: items, error: itemsError } = await supabase.from('order_items').insert(itemsWithOrderId).select();
      
      if (itemsError) {
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`فشل إدخال عناصر الطلب: ${itemsError.message}`);
      }
      
      try {
        const { data: rest } = await supabase.from('restaurants').select('business_type, currency').eq('id', order.restaurant_id).single();
        const businessType = (rest?.business_type || 'restaurant') as BusinessType;
        await journalService.ensureAccountingSetup(order.restaurant_id, rest?.currency || 'ج.م');
        await journalService.createSaleJournalEntry(order.restaurant_id, { ...order, items: (items || []) as OrderItem[] } as Order, businessType, 0, 0);
      } catch (accErr) {
        console.error("Accounting sync error:", accErr);
      }

      await removePendingOrder(po.id);
      synced++;
    } catch { errors++; }
  }

  // Force sync status updates
  const pendingUpdates = await getPendingStatusUpdates();
  for (const pu of pendingUpdates) {
    try {
      const { error } = await supabase.from('orders').update({ status: pu.status }).eq('id', pu.orderId);
      if (!error) {
        await removePendingStatusUpdate(pu.id);
        synced++;
      } else { errors++; }
    } catch { errors++; }
  }

  // Force sync transactions
  const pendingTxs = await getPendingTransactions();
  for (const ptx of pendingTxs) {
    try {
      let success = false;
      switch (ptx.type) {
        case 'expense':
          const { error: expErr } = await supabase.from('expenses').insert(ptx.payload);
          if (!expErr) success = true;
          break;
        case 'crm_log':
          const { error: crmErr } = await supabase.from('crm_communication_logs').insert(ptx.payload);
          if (!crmErr) success = true;
          break;
        case 'sales_order':
          const { error: soErr } = await supabase.from('orders').insert(ptx.payload);
          if (!soErr) success = true;
          break;
        case 'marketing_metadata':
          const { data: existingLead } = await supabase.from('crm_leads')
            .select('id')
            .eq('restaurant_id', ptx.payload.restaurant_id)
            .eq('name', 'MARKETING_ERP_SYSTEM_METADATA')
            .limit(1);
          if (existingLead && existingLead.length > 0) {
            const { error: updErr } = await supabase.from('crm_leads')
              .update({ raw_social_data: ptx.payload.data })
              .eq('id', existingLead[0].id);
            if (!updErr) success = true;
          } else {
            const { error: insErr } = await supabase.from('crm_leads')
              .insert({
                restaurant_id: ptx.payload.restaurant_id,
                name: 'MARKETING_ERP_SYSTEM_METADATA',
                raw_social_data: ptx.payload.data,
                stage: 'metadata'
              });
            if (!insErr) success = true;
          }
          break;
      }
      if (success) {
        await removePendingTransaction(ptx.id);
        synced++;
      } else { errors++; }
    } catch { errors++; }
  }

  if (synced > 0) {
    await cacheData('lastSyncTime', Date.now());
  }

  return { synced, errors };
}