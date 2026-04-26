import { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, ShoppingCart, QrCode, Bell, Settings, LogOut, ChefHat,
  Plus, Minus, Trash2, Receipt, Wifi, WifiOff, X, Check,
  BarChart3, Pause, Play, Printer, Users, Hash, Percent,
  Clock, TrendingUp, UtensilsCrossed, AlertCircle, CheckCircle,
  Timer, StickyNote, DollarSign, Truck, CalendarClock, MapPin, Phone, Lock, CreditCard,
  Volume2, VolumeX, Package, Wallet, Store, UsersRound, Camera, Sun, Moon, Send,
  FileText, RotateCcw
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
const DeliveryTab = lazy(() => import('./dashboard/DeliveryTab').then(m => ({ default: m.DeliveryTab })));
const ShiftsTab = lazy(() => import('./dashboard/ShiftsTab').then(m => ({ default: m.ShiftsTab })));
const MenuTab = lazy(() => import('./dashboard/MenuTab').then(m => ({ default: m.MenuTab })));
const InventoryTab = lazy(() => import('./dashboard/InventoryTab').then(m => ({ default: m.InventoryTab })));
const CustomersTab = lazy(() => import('./dashboard/CustomersTab').then(m => ({ default: m.CustomersTab })));
const SuppliersTab = lazy(() => import('./dashboard/SuppliersTab').then(m => ({ default: m.SuppliersTab })));
const CustomerManager = lazy(() => import('./dashboard/CustomerManager').then(m => ({ default: m.CustomerManager })));
const SupplierManager = lazy(() => import('./dashboard/SupplierManager').then(m => ({ default: m.SupplierManager })));
const SalesReturnsManager = lazy(() => import('./dashboard/SalesReturns').then(m => ({ default: m.SalesReturnsManager })));
const InventoryReceiptsManager = lazy(() => import('./dashboard/InventoryReceipts').then(m => ({ default: m.InventoryReceiptsManager })));
const ExpensesTab = lazy(() => import('./dashboard/ExpensesTab').then(m => ({ default: m.ExpensesTab })));
const StaffTab = lazy(() => import('./dashboard/StaffTab').then(m => ({ default: m.StaffTab })));
const NotificationsTab = lazy(() => import('./dashboard/NotificationsTab').then(m => ({ default: m.NotificationsTab })));
const FinancialsTab = lazy(() => import('./dashboard/FinancialsTab').then(m => ({ default: m.FinancialsTab })));
const OverheadManager = lazy(() => import('./dashboard/OverheadManager').then(m => ({ default: m.OverheadManager })));
import { BarcodeScanner } from './dashboard/BarcodeScanner';
import { POSGrid } from './dashboard/pos/POSGrid';
import { POSCart } from './dashboard/pos/POSCart';
import { InvoiceTabs } from './dashboard/pos/InvoiceTabs';
import { TradingAccount } from './dashboard/TradingAccount';
import { BOMManager } from './dashboard/BOMManager';
import { AccountingMegaTab } from './dashboard/AccountingMegaTab';
import { CustomReportBuilder } from './dashboard/CustomReportBuilder';
import { SettingsTab } from './dashboard/SettingsTab';
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
  useEffect(() => {
    const pending = localStorage.getItem('pending_business');
    if (pending) {
      try {
        const { name: bName, type } = JSON.parse(pending);
        if (bName) setName(bName);
        if (type) setBizType(type as BusinessType);
        localStorage.removeItem('pending_business');
      } catch {}
    }
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      const { error } = await supabase.from('restaurants').insert({
        owner_id: userId,
        name,
        status: 'active',
        subscription_end: trialEnd.toISOString(),
        business_type: bizType,
      });
      
      if (error) {
        toast.error('حدث خطأ أثناء الإنشاء: ' + error.message);
        console.error('Create restaurant error:', error);
        return;
      }
      
      onCreated();
    } catch (err: any) {
      toast.error('خطأ غير متوقع: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    soundEnabled, setSoundEnabled, taxes
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState<SidebarTab>('pos');
  const [activeSubView, setActiveSubView] = useState<'stock' | 'bom'>('stock');
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
  const [menuForm, setMenuForm] = useState({ 
    name: '', 
    price: '', 
    category: '', 
    image: '🍔',
    product_type: 'inventory',
    pricing_method: 'fixed',
    profit_margin_percent: '30',
    product_id: ''
  });

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

  const taxableAmount = Math.max(0, cartSubtotal - discountAmount);
  let totalTax = 0;
  if (taxes) {
    taxes.forEach(tax => {
      if (!tax.is_included_in_price) {
        totalTax += taxableAmount * (tax.rate / 100);
      }
    });
  }

  const cartTotal = taxableAmount + totalTax;
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
      const baseQty = c.qty * oldUnit.factor;
      const newQty = Math.round((baseQty / newUnit.factor) * 100) / 100;
      return { ...c, unitMode: unitLabel, qty: newQty, qtyText: String(newQty) };
    }));
  };

  const updateValue = (id: string, value: number) => {
    if (isNaN(value)) return;
    setCart(prev => prev.map(c => {
      if (c.item.id !== id) return c;
      const units = getUnitOptions(c.item);
      const currentUnit = units.find(u => u.label === c.unitMode);
      const unitFactor = currentUnit?.factor || 1;
      const newQty = value / (c.item.price * unitFactor);
      const roundedQty = Math.round(newQty * 1000) / 1000;
      return { ...c, qty: roundedQty, qtyText: String(roundedQty) };
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.item.id !== id));
    toast.success('تم حذف الصنف من السلة');
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
          skipPreparation: !sendToPrep, // For direct sell (quick checkout)
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
    { id: 'inventory', label: 'المخزون والتكاليف', icon: Package },
    { id: 'accounting', label: 'المحاسبة والمالية', icon: Wallet } as any,
    { id: 'analytics', label: 'التقارير المخصصة', icon: BarChart3 } as any,
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
        <h2 className="font-display text-xl font-bold mb-2">لا يوجد نشاط مسجّل</h2>
        <p className="text-muted-foreground mb-4">أنشئ مشروعك الأول للبدء</p>
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
      <InvoiceTabs
        show={showInvoiceTabs}
        onClose={() => setShowInvoiceTabs(false)}
        invoiceTabs={invoiceTabs}
        activeInvoiceId={activeInvoiceId}
        recallInvoice={recallInvoice}
        deleteInvoiceTab={deleteInvoiceTab}
        clearCart={clearCart}
        currency={currency}
      />

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
          <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>

          {/* ===================== POS TAB ===================== */}
          {activeTab === 'pos' && (
            <div className="flex flex-col lg:flex-row h-full">
              <POSGrid
                currency={currency}
                todayRevenue={todayRevenue}
                todayOrders={todayOrders}
                avgOrderValue={avgOrderValue}
                pendingOrders={pendingOrders}
                businessType={businessType}
                orderType={orderType}
                orders={orders}
                tableNumber={tableNumber}
                setTableNumber={setTableNumber}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredItems={filteredItems}
                addToCart={addToCart}
              />
              <POSCart
                activeInvoiceId={activeInvoiceId}
                invoiceTabs={invoiceTabs}
                cart={cart}
                holdCurrentInvoice={holdCurrentInvoice}
                setShowInvoiceTabs={setShowInvoiceTabs}
                clearCart={clearCart}
                businessType={businessType}
                orderType={orderType}
                setOrderType={setOrderType}
                tableNumber={tableNumber}
                setTableNumber={setTableNumber}
                restaurant={restaurant}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                deliveryAddress={deliveryAddress}
                setDeliveryAddress={setDeliveryAddress}
                agents={agents}
                selectedDeliveryAgent={selectedDeliveryAgent}
                setSelectedDeliveryAgent={setSelectedDeliveryAgent}
                orderNotes={orderNotes}
                setOrderNotes={setOrderNotes}
                discount={discount}
                setDiscount={setDiscount}
                discountType={discountType}
                setDiscountType={setDiscountType}
                currency={currency}
                getUnitOptions={getUnitOptions}
                setCartItemUnit={setCartItemUnit}
                updateQty={updateQty}
                setCartItemQty={setCartItemQty}
                discountAmount={discountAmount}
                taxAmount={totalTax}
                cartSubtotal={cartSubtotal}
                cartTotal={cartTotal}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                paidAmount={paidAmount}
                setPaidAmount={setPaidAmount}
                remaining={remaining}
                checkout={checkout}
                updateValue={updateValue}
                removeFromCart={removeFromCart}
              />
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
                          <RePieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>{categoryData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}</Pie><Tooltip /></RePieChart>
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

          {/* ===================== ACCOUNTING MEGA TAB ===================== */}
          {activeTab === 'accounting' && (
            <AccountingMegaTab restaurantId={restaurant.id} currency={restaurant.currency || 'ج.م'} />
          )}

          {/* ===================== CUSTOM REPORTS TAB ===================== */}
          {activeTab === 'analytics' && (
            <CustomReportBuilder restaurantId={restaurant.id} currency={restaurant.currency || 'ج.م'} />
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
                <p className="text-[10px] text-muted-foreground mt-2 break-all">{window.location.origin}/qr-menu/${restaurant.id}</p>
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
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl w-fit mx-auto sm:mx-0">
                  <Button variant={activeSubView === 'stock' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveSubView('stock')} className={activeSubView === 'stock' ? 'gradient-bg' : ''}>المخزون</Button>
                  <Button variant={activeSubView === 'bom' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveSubView('bom')} className={activeSubView === 'bom' ? 'gradient-bg' : ''}>هندسة التكاليف (BOM)</Button>
                </div>
                {activeSubView === 'stock' ? <InventoryTab restaurantId={restaurant.id} currency={restaurant.currency || 'ج.م'} /> : <BOMManager restaurantId={restaurant.id} currency={restaurant.currency || 'ج.م'} />}
              </div>
            )}

          {/* ===================== CUSTOMERS TAB ===================== */}
          {activeTab === 'customers' && (
            <CustomersTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== SUPPLIERS TAB ===================== */}
          {activeTab === 'suppliers' && (
            <SuppliersTab restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== CUSTOMER ACCOUNTS TAB (Professional) ===================== */}
          {activeTab === 'customer_accounts' && (
            <CustomerManager restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== SALES RETURNS TAB ===================== */}
          {activeTab === 'sales_returns' && (
            <SalesReturnsManager restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== SUPPLIER ACCOUNTS TAB (Professional) ===================== */}
          {activeTab === 'supplier_accounts' && (
            <SupplierManager restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== INVENTORY RECEIPTS TAB ===================== */}
          {activeTab === 'inventory_receipts' && (
            <InventoryReceiptsManager restaurantId={restaurant.id} currency={currency} />
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
            <FinancialsTab restaurantId={restaurant.id} currency={restaurant.currency || 'ج.م'} />
          )}

          {/* ===================== OVERHEADS TAB ===================== */}
          {activeTab === 'overheads' && (
            <OverheadManager restaurantId={restaurant.id} currency={currency} />
          )}

          {/* ===================== SETTINGS TAB ===================== */}
          {activeTab === 'settings' && (
            <SettingsTab 
              restaurant={restaurant}
              businessType={businessType}
              profileName={profileName}
              user={user}
              agents={agents}
              isSuspended={isSuspended}
              isSuperAdmin={isSuperAdmin}
              loadData={loadData}
            />
          )}          </Suspense>
        </main>
      </div>
    </div>
  );
}
