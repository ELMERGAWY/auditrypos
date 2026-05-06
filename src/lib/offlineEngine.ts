// Offline-First Engine: Cache data locally & sync when online

const DB_NAME = 'smartpos_offline';
const DB_VERSION = 2;
const STORES = ['pendingOrders', 'pendingStatusUpdates', 'pendingTransactions', 'cachedData'] as const;

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
}

// ─── Pending Transactions Queue (General ERP) ───
export interface PendingTransaction {
  id: string;
  type: 'expense' | 'sales_order' | 'crm_log' | 'return' | 'stock_adjustment';
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
    return await new Promise((res) => { req.onsuccess = () => res(req.result); req.onerror = () => res([]); });
  } catch { return []; }
}

export async function removePendingTransaction(id: string) {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingTransactions', 'readwrite');
    tx.objectStore('pendingTransactions').delete(id);
  } catch {}
}

// ─── Cache Dashboard Data ───
export async function cacheData(key: string, data: any) {
  try {
    const db = await openDB();
    const tx = db.transaction('cachedData', 'readwrite');
    tx.objectStore('cachedData').put({ id: key, data, cachedAt: Date.now() });
  } catch { /* silently fail */ }
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('cachedData', 'readonly');
    const req = tx.objectStore('cachedData').get(key);
    return new Promise((res) => {
      req.onsuccess = () => res(req.result?.data ?? null);
      req.onerror = () => res(null);
    });
  } catch { return null; }
}

// ─── Sync Engine ───
import { supabase } from '@/integrations/supabase/client';
import { journalService } from './accounting/journalService';
import type { Order, OrderItem } from '@/pages/dashboard/types';
import type { BusinessType } from './businessTypes';

export async function syncPendingData(): Promise<{ synced: number; errors: number }> {
  let synced = 0, errors = 0;

  // Sync pending orders
  const pendingOrders = await getPendingOrders();
  for (const po of pendingOrders) {
    try {
      // Use client_order_id for deduplication
      const clientOrderId = po.orderData.client_order_id || po.id;
      const orderPayload = { ...po.orderData, client_order_id: clientOrderId };

      // Check if already synced (dedup)
      const { data: existing } = await supabase.from('orders')
        .select('id')
        .eq('client_order_id', clientOrderId)
        .limit(1);

      if (existing && existing.length > 0) {
        // Already synced, just remove local copy
        await removePendingOrder(po.id);
        synced++;
        continue;
      }

      const { data: order, error } = await supabase.from('orders').insert(orderPayload as any).select().single();
      if (error || !order) { errors++; continue; }
      
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
      const { data: items } = await supabase.from('order_items').insert(itemsWithOrderId).select();
      
      // CREATE ACCOUNTING JOURNAL ENTRY FOR SYNCED ORDER
      try {
        // Fetch restaurant to get business type
        const { data: rest } = await supabase.from('restaurants').select('business_type').eq('id', order.restaurant_id).single();
        const businessType = (rest?.business_type || 'restaurant') as BusinessType;
        
        await journalService.createSaleJournalEntry(
          order.restaurant_id,
          { ...order, items: (items || []) as OrderItem[] } as Order,
          businessType,
          0, // COGS can be calculated if needed, using 0 for simple sync
          0  // Tax can be extracted if needed
        );
      } catch (accErr) {
        console.error("Accounting sync error:", accErr);
      }

      await removePendingOrder(po.id);
      synced++;
    } catch { errors++; }
  }

  // Sync pending status updates
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

  // Sync pending ERP transactions
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
      }
      if (success) {
        await removePendingTransaction(ptx.id);
        synced++;
      } else { errors++; }
    } catch { errors++; }
  }

  return { synced, errors };
}
