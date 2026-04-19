import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, ShoppingCart, QrCode, Bell, Settings, LogOut, ChefHat,
  Plus, Minus, Trash2, Receipt, Wifi, WifiOff, X, Check,
  BarChart3, Pause, Play, Printer, Users, Hash, Percent,
  Clock, TrendingUp, UtensilsCrossed, AlertCircle, CheckCircle,
  Timer, StickyNote, DollarSign, Truck, CalendarClock, MapPin, Phone, Lock, CreditCard,
  Volume2, VolumeX, Package, Wallet, Store, UsersRound, Camera, Sun, Moon, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useDashboardData } from './dashboard/useDashboardData';
import { ReceiptModalWrapper } from './dashboard/ReceiptModal';
import { ProfessionalSidebar, type SidebarTab } from '@/components/professional/ProfessionalSidebar';
import { DeliveryTab } from './dashboard/DeliveryTab';
import { ShiftsTab } from './dashboard/ShiftsTab';
import { MenuTab } from './dashboard/MenuTab';
import { TableGrid } from './dashboard/TableGrid';
import { InventoryTab } from './dashboard/InventoryTab';
import { CustomersTab } from './dashboard/CustomersTab';
import { SuppliersTab } from './dashboard/SuppliersTab';
import { ExpensesTab } from './dashboard/ExpensesTab';
import { StaffTab } from './dashboard/StaffTab';
import { NotificationsTab } from './dashboard/NotificationsTab';
import { FinancialsTab } from './dashboard/FinancialsTab';
import { BarcodeScanner } from './dashboard/BarcodeScanner';
import { BUSINESS_TYPES, BUSINESS_TABS, getAddressPlaceholder, getCheckoutButtonLabel, getCustomerPlaceholder, getDefaultOrderType, getNotesPlaceholder, getPosSearchPlaceholder, isFoodSector, isInventoryDrivenBusiness, type BusinessType } from '@/lib/businessTypes';
import { useAuth } from '@/lib/AuthContext';
import { useDarkMode } from '@/lib/useDarkMode';
import { CustomerSearch } from './dashboard/CustomerSearch';
import { checkoutIntegration } from '@/lib/accounting';
import type {
  DashboardTab, OrderStatus, OrderType, MenuItem, Order, OrderItem, HeldInvoice
} from './dashboard/types';
import { STATUS_CONFIG, ORDER_TYPE_CONFIG } from './dashboard/types';

function CreateRestaurantForm({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('restaurant');
  const [loading, setLoading] = useState(false);

  // Check localStorage for pending business from registration
  useState(() => {
    const pending = localStorage.getItem('pending_business');
    if (pending) {
      try {
        const { name: bName, type } = JSON.parse(pending);
        if (bName) setName(bName);
        if (type) setBizType(type as BusinessType);
        localStorage.removeItem('pending_business');
      } catch {}
    }
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    await supabase.from('restaurants').insert({
      owner_id: userId,
      name,
      status: 'active',
      subscription_end: trialEnd.toISOString(),
      business_type: bizType,
    });
    setLoading(false);
    onCreated();
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {(Object.entries(BUSINESS_TYPES) as [BusinessType, typeof BUSINESS_TYPES[BusinessType]][]).slice(0, 8).map(([key, bt]) => (
          <button key={key} onClick={() => setBizType(key)}
            className={`p-2 rounded-lg text-center transition-all text-xs ${bizType === key ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>
            <span className="text-lg block">{bt.icon}</span>
            {bt.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="اسم النشاط" />
        <Button onClick={handleCreate} disabled={loading} className="gradient-bg text-primary-foreground border-0">
          {loading ? '...' : 'إنشاء'}
        </Button>
      </div>
    </div>
  );
}

const CHART_COLORS = [
  'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)',
  'hsl(200, 80%, 50%)', 'hsl(280, 70%, 55%)', 'hsl(0, 84%, 60%)'
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode(true);
  const {
    user, authLoading, isOnline, restaurant, menuItems, setMenuItems,
    orders, setOrders, waiterCalls, setWaiterCalls, agents, setAgents,
    currentShift, setCurrentShift, profileName, dataLoaded, loadData, handleLogout,
    soundEnabled, setSoundEnabled,
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState<SidebarTab>('pos');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // POS State
  const [cart, setCart] = useState<{ item: MenuItem; qty: number; qtyText: string; unitMode: string }[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedDeliveryAgent, setSelectedDeliveryAgent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');

  // Invoices (multiple held tabs)
  const [invoiceTabs, setInvoiceTabs] = useState<HeldInvoice[]>([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [showInvoiceTabs, setShowInvoiceTabs] = useState(false);

  // Receipt
  const [lastReceipt, setLastReceipt] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Orders filter
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');

  // Menu form
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: '', image: '🍔' });

  const isSuspended = restaurant
    ? restaurant.status === 'suspended' || (restaurant.subscription_end && new Date(restaurant.subscription_end) < new Date())
    : false;

  // Trial detection
  const isTrial = restaurant
    ? restaurant.status === 'active' && restaurant.subscription_end && new Date(restaurant.subscription_end) >= new Date()
      && (new Date(restaurant.subscription_end).getTime() - new Date().getTime()) <= 15 * 86400000
    : false;

  const trialDaysLeft = restaurant?.subscription_end
    ? Math.max(0, Math.ceil((new Date(restaurant.subscription_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Barcode scanner state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Features locked during trial
  const lockedTabs: DashboardTab[] = isTrial ? ['orders', 'delivery', 'shifts', 'stats'] : [];

  // Computed — safe with optional chaining
  const currency = restaurant?.currency || 'ج.م';
  const categories = [...new Set(menuItems.map(i => i.category))];
  const filteredItems = menuItems.filter(i => {
    if (selectedCategory !== 'all' && i.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = i.name.toLowerCase().includes(q);
      const matchBarcode = (i as any).barcode && (i as any).barcode.includes(q);
      const matchSku = (i as any).sku && (i as any).sku.includes(q);
      if (!matchName && !matchBarcode && !matchSku) return false;
    }
    return i.available;
  });

  const cartSubtotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const discountAmount = discountType === 'percent'
    ? cartSubtotal * (Number(discount) || 0) / 100
    : Number(discount) || 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);
  const paidNum = Number(paidAmount) || 0;
  const remaining = Math.max(0, cartTotal - paidNum);

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const unackCalls = waiterCalls.filter(c => !c.acknowledged);
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const avgOrderValue = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const deliveryOrders = orders.filter(o => o.order_type === 'delivery' && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'));

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - i));
    const dayOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === date.toDateString());
    return { day: date.toLocaleDateString('ar-EG', { weekday: 'short' }), revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0), orders: dayOrders.length };
  });

  const categoryData = categories.map(cat => {
    const val = orders.filter(o => o.status !== 'cancelled').flatMap(o => o.items.filter(i => menuItems.find(m => m.name === i.menu_item_name)?.category === cat)).reduce((s, i) => s + i.price * i.quantity, 0);
    return { name: cat, value: val };
  }).filter(d => d.value > 0);

  const itemSales = new Map<string, number>();
  orders.filter(o => o.status !== 'cancelled').forEach(o => o.items.forEach(i => itemSales.set(i.menu_item_name, (itemSales.get(i.menu_item_name) || 0) + i.quantity)));
  const topItems = [...itemSales.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);

  // Unit conversion helpers - uses product's own secondary_unit & conversion_factor
  const getUnitOptions = (item: MenuItem) => {
    const product = (item as any);
    const baseUnit = product.unit || 'قطعة';
    const options = [{ label: baseUnit, factor: 1 }];
    
    // If product has a secondary unit defined, use it
    if (product.secondary_unit && product.unit_conversion_factor && Number(product.unit_conversion_factor) > 1) {
      options.push({
        label: product.secondary_unit,
        factor: 1 / Number(product.unit_conversion_factor),
      });
    }
    return options;
  };

  // Cart actions
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1, qtyText: String(c.qty + 1) } : c);
      const defaultUnit = getUnitOptions(item)[0]?.label || 'قطعة';
      return [...prev, { item, qty: 1, qtyText: '1', unitMode: defaultUnit }];
    });
  };

  const updateQty = (id: string, d: number) =>
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: Math.max(0, Math.round((c.qty + d) * 100) / 100), qtyText: String(Math.max(0, Math.round((c.qty + d) * 100) / 100)) } : c).filter(c => c.qty > 0));

  const setCartItemQty = (id: string, text: string) => {
    setCart(prev => prev.map(c => {
      if (c.item.id !== id) return c;
      // Allow typing "0." or "1." etc
      if (text === '' || text === '0' || /^\d*\.?\d*$/.test(text)) {
        const num = parseFloat(text);
        return { ...c, qtyText: text, qty: isNaN(num) ? 0 : num };
      }
      return c;
    }));
  };

  const setCartItemUnit = (id: string, unitLabel: string) => {
    setCart(prev => prev.map(c => {
      if (c.item.id !== id) return c;
      const units = getUnitOptions(c.item);
      const oldUnit = units.find(u => u.label === c.unitMode);
      const newUnit = units.find(u => u.label === unitLabel);
      if (!oldUnit || !newUnit) return { ...c, unitMode: unitLabel };
      // Convert qty: e.g. 1 kg → 1000 grams
      const baseQty = c.qty * oldUnit.factor;
      const newQty = Math.round((baseQty / newUnit.factor) * 100) / 100;
      return { ...c, unitMode: unitLabel, qty: newQty, qtyText: String(newQty) };
    }));
  };

  const clearCart = () => {
    setCart([]); setTableNumber(''); setCustomerName(''); setCustomerPhone('');
    setOrderNotes(''); setDiscount(''); setDeliveryAddress(''); setSelectedDeliveryAgent('');
    setPaymentMethod('cash'); setPaidAmount('');
    setOrderType(getDefaultOrderType(businessType) as OrderType); setActiveInvoiceId(null);
  };

  const queueOrderOffline = async (orderData: typeof restaurant extends never ? never : Record<string, any>, cartItems: Record<string, any>[], orderNum: string) => {
    const { queueOfflineOrder } = await import('@/lib/offlineEngine');
    await queueOfflineOrder({
      id: crypto.randomUUID(),
      restaurantId: restaurant!.id,
      orderData,
      items: cartItems,
      timestamp: Date.now(),
    });

    const offlineOrder = {
      id: `offline-${Date.now()}`,
      ...orderData,
      synced: false,
      created_at: new Date().toISOString(),
      items: cartItems,
    } as unknown as Order;

    setOrders(prev => [offlineOrder, ...prev]);
    setLastReceipt(offlineOrder);
    setShowReceipt(true);
    if (activeInvoiceId) setInvoiceTabs(prev => prev.filter(t => t.id !== activeInvoiceId));
    clearCart();
    toast.success(`📴 تم حفظ الطلب محلياً #${orderNum.slice(-4)} وسيتم رفعه تلقائياً عند عودة الإنترنت`);
  };

  // Save current state as an invoice tab / hold
  const holdCurrentInvoice = () => {
    if (cart.length === 0) { toast.error('السلة فارغة'); return; }
    const newTab: HeldInvoice = {
      id: crypto.randomUUID(),
      label: activeInvoiceId
        ? (invoiceTabs.find(t => t.id === activeInvoiceId)?.label || `فاتورة ${invoiceTabs.length + 1}`)
        : `فاتورة ${invoiceTabs.length + 1}`,
      cart, tableNumber, customerName, notes: orderNotes,
      discount, discountType, orderType, deliveryAddress, customerPhone,
      deliveryAgentId: selectedDeliveryAgent,
      timestamp: Date.now(),
    };

    if (activeInvoiceId) {
      setInvoiceTabs(prev => prev.map(t => t.id === activeInvoiceId ? newTab : t));
    } else {
      setInvoiceTabs(prev => [...prev, newTab]);
    }
    clearCart();
    toast.success('تم تعليق الفاتورة');
  };

  const recallInvoice = (tab: HeldInvoice) => {
    // Save current cart as another tab if not empty
    if (cart.length > 0) holdCurrentInvoice();
    setCart(tab.cart.map(c => ({ ...c, qtyText: c.qtyText || String(c.qty), unitMode: c.unitMode || 'قطعة' })));
    setTableNumber(tab.tableNumber);
    setCustomerName(tab.customerName);
    setCustomerPhone(tab.customerPhone || '');
    setOrderNotes(tab.notes);
    setDiscount(tab.discount);
    setDiscountType(tab.discountType);
    setOrderType(tab.orderType || 'dine_in');
    setDeliveryAddress(tab.deliveryAddress || '');
    setSelectedDeliveryAgent(tab.deliveryAgentId || '');
    setActiveInvoiceId(tab.id);
    setShowInvoiceTabs(false);
    toast.success(`تم استعادة ${tab.label}`);
  };

  const deleteInvoiceTab = (id: string) => {
    setInvoiceTabs(prev => prev.filter(t => t.id !== id));
    if (activeInvoiceId === id) clearCart();
    toast.success('تم حذف الفاتورة المعلّقة');
  };

  const checkout = async (sendToPrep: boolean = false) => {
    if (cart.length === 0) return;

    // Handle offline mode with legacy system
    if (!isOnline) {
      const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
      const clientOrderId = `${restaurant!.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      const cartItems = cart.map(c => {
        const units = getUnitOptions(c.item);
        const selectedUnit = units.find(u => u.label === c.unitMode);
        const unitFactor = selectedUnit?.factor || 1;
        return {
          menu_item_id: isInventoryDrivenBusiness(businessType) ? null : c.item.id,
          product_id: isInventoryDrivenBusiness(businessType) ? (c.item.product_id || c.item.id) : null,
          menu_item_name: c.item.name,
          menu_item_image: c.item.image,
          quantity: c.qty,
          price: c.item.price * unitFactor,
          sold_unit: c.unitMode || '',
          unit_factor: unitFactor,
          cost_price_snapshot: (c.item as any).cost_price || 0,
        };
      });

      const orderData = {
        restaurant_id: restaurant!.id,
        order_number: orderNum,
        total: cartTotal,
        status: sendToPrep ? 'pending' : 'completed',
        synced: false,
        table_number: tableNumber ? Number(tableNumber) : null,
        discount: discountAmount,
        notes: orderNotes,
        customer_name: customerName,
        customer_phone: customerPhone,
        order_type: orderType,
        delivery_address: deliveryAddress,
        delivery_agent_id: selectedDeliveryAgent || null,
        payment_method: paymentMethod,
        paid_amount: paidNum,
        client_order_id: clientOrderId,
        customer_id: null,
      };

      await queueOrderOffline(orderData as any, cartItems, orderNum);
      return;
    }

    // Use new accounting-integrated checkout
    try {
      const result = await checkoutIntegration.processCheckout(
        {
          restaurantId: restaurant!.id,
          businessType: businessType as any,
          currency: currency,
          isOnline: true,
          userId: user?.id,
        },
        {
          cart: cart.map(c => ({
            ...c.item,
            quantity: c.qty,
            unitMode: c.unitMode,
            unitFactor: getUnitOptions(c.item).find(u => u.label === c.unitMode)?.factor || 1,
          })),
          customerName,
          customerPhone,
          tableNumber: tableNumber ? Number(tableNumber) : undefined,
          orderType: orderType as any,
          deliveryAddress,
          deliveryAgentId: selectedDeliveryAgent,
          paymentMethod: paymentMethod as any,
          paidAmount: paidNum,
          discount: discountAmount,
          discountType: discountType === 'percent' ? 'percentage' : 'fixed',
          notes: orderNotes,
        }
      );

      if (result.success && result.order) {
        // Update local state
        const newOrder = {
          ...result.order,
          items: result.order.items || [],
          paid_amount: paidNum,
          payment_method: paymentMethod,
        } as Order;

        setOrders(prev => [newOrder, ...prev]);
        setLastReceipt(newOrder);
        setShowReceipt(true);

        // Handle delivery agent
        if (orderType === 'delivery' && selectedDeliveryAgent) {
          setAgents(agents.map(a => a.id === selectedDeliveryAgent ? { ...a, status: 'busy' } : a));
          await supabase.from('notifications').insert({
            restaurant_id: restaurant!.id,
            title: `🆕 طلب توصيل جديد #${result.order.order_number?.slice(-4)}`,
            body: `${customerName || 'عميل'} — ${deliveryAddress || ''} — ${result.order.total?.toFixed(2)} ${currency}`,
            type: 'order',
            target_type: 'agent',
            target_id: selectedDeliveryAgent,
          } as any);
        }

        // Clear invoice tab if used
        if (activeInvoiceId) setInvoiceTabs(prev => prev.filter(t => t.id !== activeInvoiceId));

        // Show success message with accounting details
        let successMsg = `✅ تم إنشاء الطلب #${result.order.order_number?.slice(-4)} — ${result.order.total?.toFixed(2)} ${currency}`;
        if (result.journalEntryId) {
          successMsg += ` 📊 (قيد محاسبي: ${result.journalEntryId.slice(-4)})`;
        }
        toast.success(successMsg);

        clearCart();
      } else {
        toast.error(result.error || 'فشل في إتمام الطلب');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(`خطأ في إتمام الطلب: ${error.message}`);
      
      // Fallback to offline queue on error
      const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
      const clientOrderId = `${restaurant!.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      const cartItems = cart.map(c => ({
        menu_item_id: c.item.id,
        menu_item_name: c.item.name,
        menu_item_image: c.item.image,
        quantity: c.qty,
        price: c.item.price,
        sold_unit: c.unitMode || '',
        unit_factor: 1,
        cost_price_snapshot: (c.item as any).cost_price || 0,
      }));

      await queueOrderOffline(
        {
          restaurant_id: restaurant!.id,
          order_number: orderNum,
          total: cartTotal,
          status: sendToPrep ? 'pending' : 'completed',
          client_order_id: clientOrderId,
        } as any,
        cartItems,
        orderNum
      );
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!isOnline) {
      const { queueStatusUpdate } = await import('@/lib/offlineEngine');
      await queueStatusUpdate({ id: crypto.randomUUID(), orderId, status: newStatus, timestamp: Date.now() });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`📴 تم تحديث الحالة أوفلاين — سيتم المزامنة لاحقاً`);
      return;
    }
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) { toast.error('خطأ في تحديث الحالة'); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast.success(`تم تحديث الطلب إلى: ${STATUS_CONFIG[newStatus].label}`);
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('هل تريد حذف هذا الطلب؟ سيتم إرجاع الكميات للمخزون.')) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // First cancel it (triggers stock restore) if not already cancelled
    if (order.status !== 'cancelled') {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    }
    // Delete items then order
    await supabase.from('order_items').delete().eq('order_id', orderId);
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) { toast.error('خطأ في حذف الطلب'); return; }
    setOrders(prev => prev.filter(o => o.id !== orderId));
    toast.success('تم حذف الطلب وإرجاع الكميات للمخزون');
  };

  const handleAssignAgent = async (orderId: string, agentId: string) => {
    await supabase.from('orders').update({ delivery_agent_id: agentId }).eq('id', orderId);
    await supabase.from('delivery_agents').update({ status: 'busy' }).eq('id', agentId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_agent_id: agentId } : o));
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'busy' } : a));
    toast.success('تم تعيين المندوب');
  };

  const handleAcknowledge = async (id: string) => {
    await supabase.from('waiter_calls').update({ acknowledged: true }).eq('id', id);
    setWaiterCalls(prev => prev.map(c => c.id === id ? { ...c, acknowledged: true } : c));
  };

  const businessType = (restaurant?.business_type || 'restaurant') as BusinessType;
  const allowedTabs = BUSINESS_TABS[businessType] || BUSINESS_TABS.restaurant;
  const btConfig = BUSINESS_TYPES[businessType];

  // Reset orderType when restaurant loads to match sector
  useEffect(() => {
    if (restaurant) {
      const bt = (restaurant.business_type || 'restaurant') as BusinessType;
      setOrderType(getDefaultOrderType(bt) as OrderType);
    }
  }, [restaurant?.id]);
  const allTabs: { id: DashboardTab; label: string; icon: typeof LayoutGrid; badge?: number; locked?: boolean }[] = [
    { id: 'pos', label: 'نقطة البيع', icon: LayoutGrid },
    { id: 'orders', label: 'الطلبات', icon: Receipt, badge: pendingOrders.length, locked: lockedTabs.includes('orders') },
    { id: 'inventory', label: 'المخزون', icon: Package },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'suppliers', label: 'الموردين', icon: Store },
    { id: 'expenses', label: 'المصروفات', icon: Wallet },
    { id: 'delivery', label: 'المناديب', icon: Truck, badge: deliveryOrders.length, locked: lockedTabs.includes('delivery') },
    { id: 'shifts', label: 'الشفتات', icon: CalendarClock, locked: lockedTabs.includes('shifts') },
    { id: 'stats', label: 'الإحصائيات', icon: BarChart3, locked: lockedTabs.includes('stats') },
    { id: 'menu', label: btConfig?.labels?.menu || 'القائمة', icon: ShoppingCart },
    { id: 'qr', label: 'رابط المتجر', icon: QrCode },
    { id: 'waiter', label: 'ويتر', icon: Bell, badge: unackCalls.length },
    { id: 'staff', label: 'الموظفين', icon: UsersRound },
    { id: 'financials', label: 'القوائم المالية', icon: DollarSign },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const tabs = allTabs.filter(t => allowedTabs.includes(t.id));

  const handleTabClick = (tabId: DashboardTab) => {
    const t = tabs.find(x => x.id === tabId);
    if (t?.locked) {
      toast.error('هذه الميزة متاحة بعد الترقية للنسخة المدفوعة');
      return;
    }
    setActiveTab(tabId);
  };

  if (authLoading || !user || !dataLoaded) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4 animate-pulse">
          <ChefHat className="w-6 h-6 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );

  if (!restaurant) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md text-center">
        <ChefHat className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold mb-2">لا يوجد مطعم مسجّل</h2>
        <p className="text-muted-foreground mb-4">أنشئ مطعمك الأول للبدء</p>
        <CreateRestaurantForm userId={user.id} onCreated={loadData} />
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-background flex theme-${businessType}`} dir="rtl">
      {/* Suspended Overlay */}
      <AnimatePresence>
        {isSuspended && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card p-8 max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">الحساب موقوف</h2>
              <p className="text-muted-foreground mb-6">انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للمتابعة.</p>
              <Button onClick={() => navigate('/payment')} className="gradient-bg text-primary-foreground border-0">
                <CreditCard className="w-4 h-4 ml-2" /> تجديد الاشتراك
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && lastReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReceipt(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold mb-4 flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> إيصال الطلب</h3>
              <ReceiptModalWrapper order={lastReceipt} restaurant={restaurant} onClose={() => setShowReceipt(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Tabs Modal */}
      <AnimatePresence>
        {showInvoiceTabs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowInvoiceTabs(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Pause className="w-5 h-5 text-primary" /> الفواتير المعلّقة ({invoiceTabs.length})
              </h3>
              {invoiceTabs.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد فواتير معلّقة</p>}
              {invoiceTabs.map(tab => (
                <div key={tab.id} className={`glass-card p-4 mb-3 ${activeInvoiceId === tab.id ? 'border-primary/50' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{tab.label}</span>
                      {activeInvoiceId === tab.id && <Badge className="status-active text-xs">نشط</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(tab.timestamp).toLocaleTimeString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{ORDER_TYPE_CONFIG[tab.orderType]?.icon} {ORDER_TYPE_CONFIG[tab.orderType]?.label}</Badge>
                    {tab.tableNumber && <Badge variant="outline" className="text-xs">طاولة {tab.tableNumber}</Badge>}
                    {tab.customerName && <span className="text-xs text-muted-foreground">{tab.customerName}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{tab.cart.map(c => `${c.item.name} × ${c.qty}`).join('، ')}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">{tab.cart.reduce((s, c) => s + c.item.price * c.qty, 0)} {currency}</span>
                    <div className="flex gap-2">
                      <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => recallInvoice(tab)}>
                        <Play className="w-3 h-3 ml-1" /> استعادة
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteInvoiceTab(tab.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2" onClick={() => { clearCart(); setShowInvoiceTabs(false); }}>
                <Plus className="w-4 h-4 ml-1" /> فاتورة جديدة فارغة
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Sidebar */}
      <ProfessionalSidebar
        businessType={businessType}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        restaurant={restaurant}
        user={{ email: user?.email, full_name: profileName }}
        stats={{
          pendingOrders: pendingOrders.length,
          deliveryOrders: deliveryOrders.length,
          unackCalls: unackCalls.length,
          todayRevenue,
          isOnline
        }}
        isTrial={isTrial}
        trialDaysLeft={trialDaysLeft}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        isDark={isDark}
        onToggleDark={toggleDarkMode}
        onLogout={handleLogout}
        onUpgrade={() => navigate('/payment')}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-2 p-3 border-b border-border overflow-x-auto bg-card shrink-0">
          {restaurant.logo_url && <img src={restaurant.logo_url} alt="logo" className="w-8 h-8 rounded-lg object-contain bg-secondary/50 shrink-0" />}
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${activeTab === tab.id ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'} ${tab.locked ? 'opacity-50' : ''}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
              {tab.locked ? <Lock className="w-3 h-3" /> : null}
              {tab.badge && !tab.locked ? <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">{tab.badge}</span> : null}
            </button>
          ))}
        </header>

        <main className="flex-1 overflow-auto">

          {/* ===================== POS TAB ===================== */}
          {activeTab === 'pos' && (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Items Grid */}
              <div className="flex-1 p-4 overflow-auto">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'إيرادات اليوم', value: `${todayRevenue} ${currency}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
                    { label: 'طلبات اليوم', value: String(todayOrders.length), icon: Receipt, color: 'text-accent', bg: 'bg-accent/10' },
                    { label: 'متوسط الطلب', value: `${avgOrderValue} ${currency}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
                    { label: 'طلبات نشطة', value: String(pendingOrders.length), icon: Timer, color: 'text-warning', bg: 'bg-warning/10' },
                  ].map(s => (
                    <div key={s.label} className="glass-card p-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        <p className={`font-display font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table Grid - only for food sectors with dine_in */}
                {isFoodSector(businessType) && orderType === 'dine_in' && (
                  <div className="glass-card p-4 mb-4">
                    <TableGrid
                      orders={orders}
                      onSelectTable={(num) => setTableNumber(String(num))}
                      selectedTable={tableNumber}
                      currency={currency}
                    />
                  </div>
                )}

                {/* Categories */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>الكل</button>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === cat ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{cat}</button>
                  ))}
                </div>
                <Input placeholder={getPosSearchPlaceholder(businessType)} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="mb-4" />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredItems.map(item => (
                    <motion.button key={item.id} whileTap={{ scale: 0.95 }} onClick={() => addToCart(item)} className="pos-grid-item text-right">
                      <div className="text-3xl mb-2">{item.image}</div>
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-primary font-bold text-sm">{item.price} {currency}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cart Panel */}
              <div className="w-full lg:w-96 bg-card border-r border-border flex flex-col">
                {/* Cart Header with tabs indicator */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-bold flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      {activeInvoiceId ? invoiceTabs.find(t => t.id === activeInvoiceId)?.label || 'فاتورة' : 'فاتورة جديدة'}
                      {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
                    </h3>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={holdCurrentInvoice} title="تعليق الفاتورة" disabled={cart.length === 0}>
                        <Pause className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowInvoiceTabs(true)} className="relative" title="الفواتير المعلّقة">
                        <Play className="w-4 h-4" />
                        {invoiceTabs.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-bg text-primary-foreground text-[10px] flex items-center justify-center">{invoiceTabs.length}</span>
                        )}
                      </Button>
                      {cart.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={clearCart} className="text-destructive" title="مسح السلة">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Order Type selector - sector specific */}
                  <div className="flex gap-1 rounded-lg bg-secondary p-1">
                    {(BUSINESS_TYPES[businessType]?.orderTypes || ['pickup', 'delivery']).map(t => {
                      const label = t === 'dine_in' ? 'داخلي' : t === 'takeaway' ? 'تيك أواي' : t === 'delivery' ? 'توصيل' : 'استلام';
                      const icon = t === 'dine_in' ? '🍽️' : t === 'takeaway' ? '🛍️' : t === 'delivery' ? '🛵' : '🏬';
                      return (
                        <button key={t} onClick={() => setOrderType(t as OrderType)}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition-all ${orderType === t ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground'}`}>
                          <span>{icon}</span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-3 space-y-2 border-b border-border bg-secondary/30">
                  <div className="grid grid-cols-2 gap-2">
                    {orderType === 'dine_in' && (
                      <div className="relative col-span-1">
                        <Hash className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="رقم الطاولة" className="pr-8 h-9 text-xs" type="number" />
                      </div>
                    )}
                    <CustomerSearch
                      restaurantId={restaurant.id}
                      value={customerName}
                      onChange={setCustomerName}
                      placeholder={getCustomerPlaceholder(businessType)}
                    />
                    {(orderType === 'delivery' || orderType === 'takeaway') && (
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="رقم الهاتف" className="pr-8 h-9 text-xs" />
                      </div>
                    )}
                  </div>
                  {orderType === 'delivery' && (
                    <>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
                        <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder={getAddressPlaceholder(businessType)} className="pr-8 h-9 text-xs" />
                      </div>
                      {agents.filter(a => a.status === 'available').length > 0 && (
                        <select value={selectedDeliveryAgent} onChange={e => setSelectedDeliveryAgent(e.target.value)}
                          className="w-full h-9 text-xs bg-background border border-input rounded-md px-2">
                          <option value="">اختر مندوب التوصيل...</option>
                          {agents.filter(a => a.status === 'available').map(a => (
                            <option key={a.id} value={a.id}>🛵 {a.name}</option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                  <div className="relative">
                    <StickyNote className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
                    <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder={getNotesPlaceholder(businessType)} className="pr-8 h-9 text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Percent className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={discount} onChange={e => setDiscount(e.target.value)} placeholder="خصم" className="pr-8 h-9 text-xs" type="number" />
                    </div>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button onClick={() => setDiscountType('percent')} className={`px-2 text-xs transition-colors ${discountType === 'percent' ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>%</button>
                      <button onClick={() => setDiscountType('fixed')} className={`px-2 text-xs transition-colors ${discountType === 'fixed' ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>{currency}</button>
                    </div>
                  </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {cart.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">السلة فارغة</p>}
                  {cart.map(c => (
                    <motion.div key={c.item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                      <span className="text-xl">{c.item.image}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.item.name}</p>
                        <p className="text-xs text-primary">{(c.item.price * c.qty).toFixed(2)} {currency}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {getUnitOptions(c.item).length > 1 && (
                          <select value={c.unitMode} onChange={e => setCartItemUnit(c.item.id, e.target.value)}
                            className="h-7 text-[10px] bg-secondary border border-border rounded-md px-1">
                            {getUnitOptions(c.item).map(u => <option key={u.label} value={u.label}>{u.label}</option>)}
                          </select>
                        )}
                        <button onClick={() => updateQty(c.item.id, -0.5)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-destructive/20 transition-colors text-[10px] font-bold">-½</button>
                        <button onClick={() => updateQty(c.item.id, -1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-destructive/20 transition-colors"><Minus className="w-3 h-3" /></button>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={c.qtyText}
                          onChange={e => setCartItemQty(c.item.id, e.target.value)}
                          onBlur={() => { if (!c.qty || c.qty <= 0) updateQty(c.item.id, 0); }}
                          className="w-12 text-center text-sm font-medium bg-transparent border border-border rounded-md h-7"
                        />
                        <button onClick={() => updateQty(c.item.id, 1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"><Plus className="w-3 h-3" /></button>
                        <button onClick={() => updateQty(c.item.id, 0.5)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors text-[10px] font-bold">+½</button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Totals & Checkout */}
                <div className="p-4 border-t border-border space-y-2">
                  {discountAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground"><span>المجموع الفرعي</span><span>{cartSubtotal.toFixed(2)} {currency}</span></div>
                      <div className="flex justify-between text-sm text-success"><span>الخصم</span><span>-{discountAmount.toFixed(2)} {currency}</span></div>
                    </>
                  )}
                  <div className="flex justify-between font-display font-bold text-lg">
                    <span>الإجمالي</span><span className="text-primary">{cartTotal.toFixed(2)} {currency}</span>
                  </div>

                  {/* Payment Method */}
                  <div className="flex gap-1 rounded-lg bg-secondary p-1">
                    {[
                      { key: 'cash', label: '💵 نقدي' },
                      { key: 'instapay', label: '📱 إنستاباي' },
                      { key: 'vodafone_cash', label: '📲 فودافون كاش' },
                      { key: 'bank', label: '🏦 تحويل بنكي' },
                    ].map(m => (
                      <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                        className={`flex-1 py-1.5 rounded-md text-[10px] transition-all ${paymentMethod === m.key ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Paid & Remaining */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="المبلغ المدفوع" className="pr-7 h-8 text-xs" type="number" />
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/50 text-xs">
                      <span className="text-muted-foreground">الباقي:</span>
                      <span className={`font-bold ${remaining > 0 ? 'text-destructive' : 'text-success'}`}>{remaining.toFixed(2)} {currency}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => checkout(true)} className="gradient-bg text-primary-foreground border-0 h-10 text-xs" disabled={cart.length === 0}>
                      <Send className="w-4 h-4 ml-1" /> إرسال للتحضير
                    </Button>
                    <Button onClick={() => checkout(false)} className="bg-success text-success-foreground hover:bg-success/90 border-0 h-10 text-xs" disabled={cart.length === 0}>
                      <Receipt className="w-4 h-4 ml-1" /> بيع مباشر
                    </Button>
                    <Button onClick={holdCurrentInvoice} variant="outline" className="h-10 text-xs" disabled={cart.length === 0}>
                      <Pause className="w-4 h-4 ml-1" /> تعليق
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== ORDERS TAB ===================== */}
          {activeTab === 'orders' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-xl font-bold">الطلبات ({filteredOrders.length})</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'] as const).map(status => (
                  <button key={status} onClick={() => setOrderFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${orderFilter === status ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                    {status === 'all' ? `الكل (${orders.length})` : `${STATUS_CONFIG[status].label} (${orders.filter(o => o.status === status).length})`}
                  </button>
                ))}
              </div>
              {filteredOrders.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد طلبات</p>}
              {filteredOrders.map(order => {
                const statusCfg = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.pending;
                const assignedAgent = agents.find(a => a.id === order.delivery_agent_id);
                return (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">#{order.order_number.slice(-4)}</span>
                        <Badge variant="outline" className="text-xs">{ORDER_TYPE_CONFIG[order.order_type as OrderType]?.icon} {ORDER_TYPE_CONFIG[order.order_type as OrderType]?.label}</Badge>
                        {order.table_number && <Badge variant="outline" className="text-xs"><Hash className="w-3 h-3 ml-0.5" />{order.table_number}</Badge>}
                        {order.customer_name && <span className="text-xs text-muted-foreground">{order.customer_name}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString('ar-EG')}</span>
                      </div>
                      <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                    </div>
                    {order.delivery_address && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{order.delivery_address}</p>}
                    {assignedAgent && <p className="text-xs text-warning mb-2 flex items-center gap-1">🛵 {assignedAgent.name}</p>}
                    {order.notes && <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5 mb-3 flex items-center gap-1"><StickyNote className="w-3 h-3" />{order.notes}</p>}
                    <div className="space-y-1 text-sm">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-muted-foreground">
                          <span>{item.menu_item_image} {item.menu_item_name} × {item.quantity}</span>
                          <span>{(item.price * item.quantity).toFixed(2)} {currency}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div>
                        {Number(order.discount) > 0 && <span className="text-xs text-success ml-2">خصم: -{order.discount} {currency}</span>}
                        <span className="font-bold text-primary">{order.total} {currency}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {statusCfg.next && order.status !== 'cancelled' && (
                          <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => updateOrderStatus(order.id, statusCfg.next!)}>
                            {statusCfg.next === 'preparing' && <><UtensilsCrossed className="w-3 h-3 ml-1" /> بدء التحضير</>}
                            {statusCfg.next === 'ready' && <><CheckCircle className="w-3 h-3 ml-1" /> جاهز</>}
                            {statusCfg.next === 'completed' && <><Check className="w-3 h-3 ml-1" /> مكتمل</>}
                          </Button>
                        )}
                        {(order.status === 'pending' || order.status === 'preparing') && (
                          <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                            <X className="w-3 h-3 ml-1" /> إلغاء
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { setLastReceipt(order); setShowReceipt(true); }}>
                          <Printer className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => deleteOrder(order.id)} title="حذف الطلب">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ===================== DELIVERY TAB ===================== */}
          {activeTab === 'delivery' && (
            <DeliveryTab
              restaurantId={restaurant.id}
              agents={agents}
              setAgents={setAgents}
              deliveryOrders={deliveryOrders}
              onAssignAgent={handleAssignAgent}
            />
          )}

          {/* ===================== SHIFTS TAB ===================== */}
          {activeTab === 'shifts' && (
            <ShiftsTab
              restaurant={restaurant}
              currentShift={currentShift}
              setCurrentShift={setCurrentShift}
              profileName={profileName}
              userId={user!.id}
              todayRevenue={todayRevenue}
              todayOrdersCount={todayOrders.length}
            />
          )}

          {/* ===================== STATS TAB ===================== */}
          {activeTab === 'stats' && (
            <div className="p-4 space-y-6">
              <h2 className="font-display text-xl font-bold">الإحصائيات</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'إجمالي الإيرادات', value: `${totalRevenue} ${currency}`, color: 'text-primary' },
                  { label: 'إجمالي الطلبات', value: String(orders.length), color: 'text-foreground' },
                  { label: 'إيرادات اليوم', value: `${todayRevenue} ${currency}`, color: 'text-success' },
                  { label: 'متوسط قيمة الطلب', value: `${avgOrderValue} ${currency}`, color: 'text-accent' },
                ].map(s => (
                  <div key={s.label} className="glass-card p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {topItems.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="font-display font-bold mb-4">🏆 الأكثر مبيعاً</h3>
                  <div className="space-y-3">
                    {topItems.map(([name, qty], idx) => {
                      const menuItem = menuItems.find(m => m.name === name);
                      const maxQty = topItems[0][1];
                      return (
                        <div key={name} className="flex items-center gap-3">
                          <span className="w-6 text-center font-bold text-muted-foreground">{idx + 1}</span>
                          <span className="text-xl">{menuItem?.image || '🍽️'}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{name}</span>
                              <span className="text-sm text-primary font-bold">{qty} مبيعات</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${(qty / maxQty) * 100}%` }}
                                transition={{ duration: 0.8, delay: idx * 0.1 }} className="h-full rounded-full gradient-bg" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="glass-card p-6">
                <h3 className="font-display font-bold mb-4">الإيرادات - آخر 7 أيام</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last7Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 18%, 18%)" />
                      <XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={12} />
                      <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(224, 24%, 12%)', border: '1px solid hsl(224, 18%, 18%)', borderRadius: '8px' }} formatter={(v: number) => [`${v} ${currency}`, 'الإيرادات']} />
                      <Bar dataKey="revenue" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {categoryData.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="font-display font-bold mb-4">التوزيع حسب الفئة</h3>
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>{categoryData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 w-full">{categoryData.map((d, idx) => <div key={d.name} className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} /><span className="text-sm flex-1">{d.name}</span><span className="text-sm font-bold text-primary">{d.value} {currency}</span></div>)}</div>
                    </div>
                  </div>
                )}
                <div className="glass-card p-6">
                  <h3 className="font-display font-bold mb-4">عدد الطلبات - آخر 7 أيام</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={last7Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 18%, 18%)" />
                        <XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={12} />
                        <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(224, 24%, 12%)', border: '1px solid hsl(224, 18%, 18%)', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="orders" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={{ fill: 'hsl(25, 95%, 53%)' }} name="الطلبات" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== MENU TAB ===================== */}
          {activeTab === 'menu' && (
            <MenuTab
              restaurant={restaurant}
              menuItems={menuItems}
              setMenuItems={setMenuItems}
              menuForm={menuForm}
              setMenuForm={setMenuForm}
              showAddItem={showAddItem}
              setShowAddItem={setShowAddItem}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              loadData={loadData}
            />
          )}

          {/* ===================== QR TAB ===================== */}
          {activeTab === 'qr' && (
            <div className="p-4 flex flex-col items-center">
              <h2 className="font-display text-xl font-bold mb-6">رابط المتجر الإلكتروني</h2>
              {restaurant.logo_url && (
                <img src={restaurant.logo_url} alt="logo" className="w-24 h-24 object-contain rounded-2xl mb-4 border border-border" />
              )}
              <div className="glass-card p-8 text-center">
                <QRCodeSVG value={`${window.location.origin}/store/${restaurant.id}`} size={220} bgColor="transparent" fgColor="hsl(25, 95%, 53%)" level="H" />
                <p className="text-muted-foreground text-sm mt-4">{restaurant.name}</p>
                <p className="text-xs text-muted-foreground mt-2">رابط المتجر — شاركه مع عملائك للطلب مباشرة</p>
                <p className="text-xs text-primary mt-1 break-all font-mono">{window.location.origin}/store/{restaurant.id}</p>
                <div className="flex gap-2 mt-4 justify-center">
                  <Button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/store/${restaurant.id}`).then(() => toast.success('تم نسخ الرابط'))} variant="outline">
                    نسخ الرابط
                  </Button>
                  <Button onClick={() => window.open(`${window.location.origin}/store/${restaurant.id}`, '_blank')} className="gradient-bg text-primary-foreground border-0">
                    معاينة المتجر
                  </Button>
                </div>
              </div>
              {/* QR Menu link (legacy) */}
              <div className="glass-card p-4 mt-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">رابط قائمة QR (للعرض فقط)</p>
                <QRCodeSVG value={`${window.location.origin}/qr-menu/${restaurant.id}`} size={120} bgColor="transparent" fgColor="hsl(var(--muted-foreground))" level="H" />
                <p className="text-[10px] text-muted-foreground mt-2 break-all">{window.location.origin}/qr-menu/{restaurant.id}</p>
              </div>
            </div>
          )}

          {/* ===================== WAITER TAB ===================== */}
          {activeTab === 'waiter' && (
            <div className="p-4">
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> استدعاءات الويتر
              </h2>
              {waiterCalls.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد استدعاءات</p>}
              {waiterCalls.map(call => (
                <motion.div key={call.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className={`glass-card p-4 mb-3 ${!call.acknowledged ? 'border-primary/50 pulse-notification' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{call.table_info}</p>
                      <p className="text-xs text-muted-foreground">{new Date(call.created_at).toLocaleTimeString('ar-EG')}</p>
                    </div>
                    {!call.acknowledged ? (
                      <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => handleAcknowledge(call.id)}>
                        <Check className="w-4 h-4 ml-1" /> تم
                      </Button>
                    ) : <Badge className="status-active">تم الاستجابة</Badge>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ===================== INVENTORY TAB ===================== */}
          {activeTab === 'inventory' && (
            <InventoryTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== CUSTOMERS TAB ===================== */}
          {activeTab === 'customers' && (
            <CustomersTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== SUPPLIERS TAB ===================== */}
          {activeTab === 'suppliers' && (
            <SuppliersTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== EXPENSES TAB ===================== */}
          {activeTab === 'expenses' && (
            <ExpensesTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== STAFF TAB ===================== */}
          {activeTab === 'staff' && (
            <StaffTab restaurantId={restaurant.id} />
          )}

          {/* ===================== NOTIFICATIONS TAB ===================== */}
          {activeTab === 'notifications' && (
            <NotificationsTab restaurantId={restaurant.id} />
          )}

          {/* ===================== FINANCIALS TAB ===================== */}
          {activeTab === 'financials' && (
            <FinancialsTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== SETTINGS TAB ===================== */}
          {activeTab === 'settings' && (
            <div className="p-4 max-w-lg space-y-4">
              <h2 className="font-display text-xl font-bold">الإعدادات</h2>
              <div className="glass-card p-4 space-y-3">
                {/* Logo Upload */}
                <div className="flex items-center gap-4 pb-3 border-b border-border">
                  {restaurant.logo_url ? (
                    <img src={restaurant.logo_url} alt="logo" className="w-20 h-20 object-contain rounded-xl border border-border" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center text-3xl">
                      {BUSINESS_TYPES[businessType]?.icon || '🏢'}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold mb-1">{restaurant.name}</p>
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const ext = file.name.split('.').pop();
                        const path = `logos/${restaurant.id}.${ext}`;
                        const { error: upErr } = await supabase.storage.from('restaurant-assets').upload(path, file, { upsert: true });
                        if (upErr) { toast.error('خطأ في رفع الشعار'); return; }
                        const { data: urlData } = supabase.storage.from('restaurant-assets').getPublicUrl(path);
                        await supabase.from('restaurants').update({ logo_url: urlData.publicUrl }).eq('id', restaurant.id);
                        toast.success('تم تحديث الشعار');
                        loadData();
                      }} />
                      <span className="text-sm text-primary hover:underline cursor-pointer">
                        {restaurant.logo_url ? 'تغيير الشعار' : 'رفع شعار'}
                      </span>
                    </label>
                  </div>
                </div>
                <div><p className="text-sm text-muted-foreground">نوع النشاط</p>
                  <p className="font-medium">{BUSINESS_TYPES[businessType]?.icon} {BUSINESS_TYPES[businessType]?.label}</p>
                </div>
                <div><p className="text-sm text-muted-foreground">اسم النشاط</p><p className="font-medium">{restaurant.name}</p></div>
                <div><p className="text-sm text-muted-foreground">المالك</p><p className="font-medium">{profileName}</p></div>
                <div><p className="text-sm text-muted-foreground">البريد</p><p className="font-medium">{user?.email}</p></div>
                <div><p className="text-sm text-muted-foreground">العملة</p><p className="font-medium">{restaurant.currency || 'ج.م'}</p></div>
                <div><p className="text-sm text-muted-foreground">حالة الاشتراك</p>
                  <Badge className={isSuspended ? 'status-suspended' : 'status-active'}>{isSuspended ? 'موقوف' : 'نشط'}</Badge>
                </div>
                {restaurant.subscription_end && (
                  <div><p className="text-sm text-muted-foreground">ينتهي في</p><p className="font-medium">{new Date(restaurant.subscription_end).toLocaleDateString('ar-EG')}</p></div>
                )}
                <div><p className="text-sm text-muted-foreground">المناديب المسجلون</p><p className="font-medium">{agents.length} مندوب</p></div>
                {/* Store Link */}
                <div className="pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">رابط المتجر الإلكتروني</p>
                  <div className="flex gap-2">
                    <code className="text-xs bg-secondary px-2 py-1 rounded flex-1 truncate">{window.location.origin}/store/{restaurant.id}</code>
                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/store/${restaurant.id}`).then(() => toast.success('تم نسخ الرابط'))}>
                      نسخ
                    </Button>
                  </div>
                </div>

                {/* Super Admin Portal Link */}
                {isSuperAdmin && (
                  <div className="pt-3 border-t border-border">
                    <Button onClick={() => navigate('/super-admin-portal')} className="w-full gradient-bg text-primary-foreground border-0 gap-2">
                      <Lock className="w-4 h-4" />
                      لوحة تحكم السوبر أدمن
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1 text-center">إدارة جميع الأنشطة والاشتراكات</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
