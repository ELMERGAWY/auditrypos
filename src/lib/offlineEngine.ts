// Offline-First Engine: Cache data locally & sync when online

const DB_NAME = 'smartpos_offline';
const DB_VERSION = 1;
const STORES = ['pendingOrders', 'pendingStatusUpdates', 'cachedData'] as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
  const db = await openDB();
  const tx = db.transaction('pendingOrders', 'readonly');
  const req = tx.objectStore('pendingOrders').getAll();
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
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
  const db = await openDB();
  const tx = db.transaction('pendingStatusUpdates', 'readonly');
  const req = tx.objectStore('pendingStatusUpdates').getAll();
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

export async function removePendingStatusUpdate(id: string) {
  const db = await openDB();
  const tx = db.transaction('pendingStatusUpdates', 'readwrite');
  tx.objectStore('pendingStatusUpdates').delete(id);
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

export async function syncPendingData(): Promise<{ synced: number; errors: number }> {
  let synced = 0, errors = 0;

  // Sync pending orders
  const pendingOrders = await getPendingOrders();
  for (const po of pendingOrders) {
    try {
      const { data: order, error } = await supabase.from('orders').insert(po.orderData as any).select().single();
      if (error || !order) { errors++; continue; }
      
      const itemsWithOrderId = po.items.map(item => ({
        order_id: order.id,
        menu_item_name: item.menu_item_name as string,
        menu_item_image: item.menu_item_image as string,
        quantity: item.quantity as number,
        price: item.price as number,
      }));
      await supabase.from('order_items').insert(itemsWithOrderId);
      
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

  return { synced, errors };
}
