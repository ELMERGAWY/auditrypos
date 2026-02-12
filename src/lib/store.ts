// SmartResto POS - LocalStorage Store & Offline Engine

export interface Restaurant {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended' | 'pending';
  subscriptionEnd: string;
  licenseKey?: string;
  createdAt: string;
  menuItems: MenuItem[];
  categories: string[];
  orders: Order[];
  paymentReceipts: PaymentReceipt[];
}

export interface MenuItem {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  createdAt: string;
  synced: boolean;
  tableNumber?: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface LicenseKey {
  key: string;
  duration: number; // days
  used: boolean;
  usedBy?: string;
  createdAt: string;
  usedAt?: string;
}

export interface PaymentReceipt {
  id: string;
  restaurantId: string;
  restaurantName: string;
  imageUrl: string;
  method: string;
  amount?: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

export interface WaiterCall {
  id: string;
  restaurantId: string;
  tableInfo: string;
  timestamp: string;
  acknowledged: boolean;
}

const KEYS = {
  restaurants: 'smartresto_restaurants',
  licenses: 'smartresto_licenses',
  waiterCalls: 'smartresto_waiter_calls',
  currentRestaurant: 'smartresto_current_restaurant',
  offlineQueue: 'smartresto_offline_queue',
};

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch { return fallback; }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Restaurant CRUD
export function getRestaurants(): Restaurant[] { return get(KEYS.restaurants, []); }
export function saveRestaurants(r: Restaurant[]) { set(KEYS.restaurants, r); }

export function getRestaurant(id: string): Restaurant | undefined {
  return getRestaurants().find(r => r.id === id);
}

export function updateRestaurant(id: string, updates: Partial<Restaurant>) {
  const all = getRestaurants();
  const idx = all.findIndex(r => r.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], ...updates }; saveRestaurants(all); }
}

export function addRestaurant(r: Restaurant) {
  const all = getRestaurants();
  all.push(r);
  saveRestaurants(all);
}

export function deleteRestaurant(id: string) {
  saveRestaurants(getRestaurants().filter(r => r.id !== id));
}

// License Keys
export function getLicenseKeys(): LicenseKey[] { return get(KEYS.licenses, []); }
export function saveLicenseKeys(keys: LicenseKey[]) { set(KEYS.licenses, keys); }

export function generateLicenseKey(duration: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const key = `SR-${seg()}-${seg()}`;
  const keys = getLicenseKeys();
  keys.push({ key, duration, used: false, createdAt: new Date().toISOString() });
  saveLicenseKeys(keys);
  return key;
}

export function activateLicense(licenseKey: string, restaurantId: string): { success: boolean; message: string } {
  const keys = getLicenseKeys();
  const keyObj = keys.find(k => k.key === licenseKey && !k.used);
  if (!keyObj) return { success: false, message: 'مفتاح غير صالح أو مستخدم بالفعل' };
  
  keyObj.used = true;
  keyObj.usedBy = restaurantId;
  keyObj.usedAt = new Date().toISOString();
  saveLicenseKeys(keys);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + keyObj.duration);
  updateRestaurant(restaurantId, { 
    status: 'active', 
    subscriptionEnd: endDate.toISOString(),
    licenseKey 
  });

  return { success: true, message: `تم التفعيل بنجاح لمدة ${keyObj.duration} يوم` };
}

// Current restaurant session
export function getCurrentRestaurantId(): string | null { return localStorage.getItem(KEYS.currentRestaurant); }
export function setCurrentRestaurantId(id: string) { localStorage.setItem(KEYS.currentRestaurant, id); }
export function clearCurrentRestaurant() { localStorage.removeItem(KEYS.currentRestaurant); }

// Waiter calls
export function getWaiterCalls(restaurantId: string): WaiterCall[] {
  return get<WaiterCall[]>(KEYS.waiterCalls, []).filter(c => c.restaurantId === restaurantId);
}

export function addWaiterCall(call: WaiterCall) {
  const all = get<WaiterCall[]>(KEYS.waiterCalls, []);
  all.push(call);
  set(KEYS.waiterCalls, all);
}

export function acknowledgeWaiterCall(id: string) {
  const all = get<WaiterCall[]>(KEYS.waiterCalls, []);
  const idx = all.findIndex(c => c.id === id);
  if (idx >= 0) { all[idx].acknowledged = true; set(KEYS.waiterCalls, all); }
}

// Offline queue
export function getOfflineQueue(): Order[] { return get(KEYS.offlineQueue, []); }
export function addToOfflineQueue(order: Order) {
  const q = getOfflineQueue();
  q.push(order);
  set(KEYS.offlineQueue, q);
}
export function clearOfflineQueue() { set(KEYS.offlineQueue, []); }

// Subscription check
export function isSubscriptionActive(restaurantId: string): boolean {
  const r = getRestaurant(restaurantId);
  if (!r) return false;
  if (r.status === 'suspended') return false;
  if (!r.subscriptionEnd) return false;
  return new Date(r.subscriptionEnd) > new Date();
}

// Export full DB
export function exportDatabase(): string {
  const data = {
    restaurants: getRestaurants(),
    licenseKeys: getLicenseKeys(),
    waiterCalls: get(KEYS.waiterCalls, []),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// Seed demo data
export function seedDemoData() {
  if (getRestaurants().length > 0) return;
  
  const demoMenuItems: MenuItem[] = [
    { id: '1', name: 'Classic Burger', price: 89, category: 'Burgers', image: '🍔', available: true },
    { id: '2', name: 'Cheese Pizza', price: 120, category: 'Pizza', image: '🍕', available: true },
    { id: '3', name: 'Caesar Salad', price: 65, category: 'Salads', image: '🥗', available: true },
    { id: '4', name: 'Grilled Chicken', price: 110, category: 'Main Course', image: '🍗', available: true },
    { id: '5', name: 'French Fries', price: 35, category: 'Sides', image: '🍟', available: true },
    { id: '6', name: 'Pasta Carbonara', price: 95, category: 'Pasta', image: '🍝', available: true },
    { id: '7', name: 'Fresh Juice', price: 30, category: 'Drinks', image: '🧃', available: true },
    { id: '8', name: 'Chocolate Cake', price: 55, category: 'Desserts', image: '🍰', available: true },
    { id: '9', name: 'Steak', price: 180, category: 'Main Course', image: '🥩', available: true },
    { id: '10', name: 'Shawarma', price: 50, category: 'Sandwiches', image: '🌯', available: true },
    { id: '11', name: 'Cappuccino', price: 40, category: 'Drinks', image: '☕', available: true },
    { id: '12', name: 'Ice Cream', price: 35, category: 'Desserts', image: '🍦', available: true },
  ];

  const demo: Restaurant = {
    id: 'demo-1',
    name: 'مطعم النجمة الذهبية',
    ownerName: 'أحمد محمد',
    email: 'demo@smartresto.com',
    phone: '01012345678',
    status: 'active',
    subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    menuItems: demoMenuItems,
    categories: ['Burgers', 'Pizza', 'Salads', 'Main Course', 'Sides', 'Pasta', 'Drinks', 'Desserts', 'Sandwiches'],
    orders: [],
    paymentReceipts: [],
  };

  addRestaurant(demo);
  setCurrentRestaurantId(demo.id);
}
