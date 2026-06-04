// @ts-nocheck
import { useState, useRef, useEffect, useCallback, Suspense, lazy, useMemo } from 'react';
import { format, startOfMonth, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, ShoppingCart, QrCode, Bell, Settings, LogOut, ChefHat,
  Plus, Minus, Trash2, Receipt, Wifi, WifiOff, X, Check,
  BarChart3, Pause, Play, Printer, Users, Hash, Percent,
  Clock, TrendingUp, UtensilsCrossed, AlertCircle, CheckCircle,
  Timer, StickyNote, DollarSign, Truck, CalendarClock, MapPin, Phone, Lock, CreditCard,
  Volume2, VolumeX, Package, Wallet, Store, UsersRound, Camera, Sun, Moon, Send,
  FileText, RotateCcw, Heart, Landmark, RefreshCcw, Filter, Construction, ArrowRightLeft, Network, Settings2,
  Scale, Shield, Building2, RefreshCw, Calendar, Layout, Store as StoreIcon, Wallet2, History, ChevronRight, User, Search, Map
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardData } from './dashboard/useDashboardData';
import { ReceiptModalWrapper } from './dashboard/ReceiptModal';
import { ProfessionalSidebar, type SidebarTab } from '@/components/professional/ProfessionalSidebar';
import { ModuleErrorBoundary } from '@/components/professional/ModuleErrorBoundary';
import { DashboardErrorBoundary } from '@/components/professional/DashboardErrorBoundary';

// Lazy loaded components for performance
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
const AdvancedReportsHub = lazy(() => import('./dashboard/AuditryIntelligenceV3').then(m => ({ default: m.default })));
const AIAccountantUnified = lazy(() => import('./dashboard/AIAccountantUnified').then(m => ({ default: m.default })));
const TreasuryTab = lazy(() => import('./dashboard/TreasuryTab').then(m => ({ default: m.TreasuryTab })));
const ChartOfAccountsTab = lazy(() => import('./dashboard/ChartOfAccountsTab').then(m => ({ default: m.ChartOfAccountsTab })));
const AccountingMappingTab = lazy(() => import('./dashboard/AccountingMappingTab').then(m => ({ default: m.AccountingMappingTab })));
const ManualJournalTab = lazy(() => import('./dashboard/ManualJournalTab').then(m => ({ default: m.ManualJournalTab })));
const ContractingDashboard = lazy(() => import('./dashboard/ContractingDashboard').then(m => ({ default: m.ContractingDashboard })));
const HomeDashboard = lazy(() => import('./dashboard/HomeDashboard').then(m => ({ default: m.HomeDashboard })));
const CreateRestaurantForm = lazy(() => import('@/components/dashboard/CreateRestaurantForm').then(m => ({ default: m.CreateRestaurantForm })));
const POSGrid = lazy(() => import('./dashboard/pos/POSGrid').then(m => ({ default: m.POSGrid })));
const POSCart = lazy(() => import('./dashboard/pos/POSCart').then(m => ({ default: m.POSCart })));
const AuditryCRM = lazy(() => import('./dashboard/AuditryCRM').then(m => ({ default: m.AuditryCRM })));
const BOMManager = lazy(() => import('./dashboard/BOMManager').then(m => ({ default: m.BOMManager })));
const SettingsTab = lazy(() => import('./dashboard/SettingsTab').then(m => ({ default: m.SettingsTab })));
const InvoiceTabs = lazy(() => import('./dashboard/pos/InvoiceTabs').then(m => ({ default: m.InvoiceTabs })));
const SalesOrders = lazy(() => import('./dashboard/SalesOrders').then(m => ({ default: m.SalesOrders })));
const PurchaseOrders = lazy(() => import('./dashboard/PurchaseOrders').then(m => ({ default: m.PurchaseOrders })));
const PurchaseInvoices = lazy(() => import('./dashboard/PurchaseInvoices').then(m => ({ default: m.PurchaseInvoices })));
const SalesInvoices = lazy(() => import('./dashboard/SalesInvoices').then(m => ({ default: m.SalesInvoices })));
const FixedAssetsTab = lazy(() => import('./dashboard/FixedAssetsTab').then(m => ({ default: m.FixedAssetsTab })));
const KitchenDisplay = lazy(() => import('./dashboard/KitchenDisplay').then(m => ({ default: m.default || m.KitchenDisplay })));
const LoyaltyPoints = lazy(() => import('./dashboard/LoyaltyPoints').then(m => ({ default: m.default || m.LoyaltyPoints })));
const GiftCards = lazy(() => import('./dashboard/GiftCards').then(m => ({ default: m.default || m.GiftCards })));
const BranchManager = lazy(() => import('./dashboard/BranchManager').then(m => ({ default: m.default || m.BranchManager })));

import { BUSINESS_TYPES, BUSINESS_TABS, getDefaultOrderType, isFoodSector, isInventoryDrivenBusiness, type BusinessType } from '@/lib/businessTypes';
import { useAuth } from '@/lib/AuthContext';
import { useDarkMode } from '@/lib/useDarkMode';
import { checkoutIntegration } from '@/lib/accounting';
import { auditLogService } from '@/lib/auditLog';
import type {
  DashboardTab, OrderStatus, OrderType, MenuItem, Order, OrderItem, HeldInvoice, ChartOfAccount
} from './dashboard/types';
import { STATUS_CONFIG } from './dashboard/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode(true);
  const {
    user, authLoading, isOnline, restaurant, menuItems, setMenuItems,
    orders, setOrders, waiterCalls, setWaiterCalls, agents, setAgents,
    currentShift, setCurrentShift, profileName, dataLoaded, loadData, handleLogout,
    soundEnabled, setSoundEnabled, taxes, isSuspended
  } = useDashboardData();

  // Basic State
  const [activeTab, setActiveTab] = useState<SidebarTab>('home');
  const [activeSubView, setActiveSubView] = useState<'stock' | 'bom'>('stock');
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [dateRange, setDateRange] = useState({ from: startOfMonth(new Date()), to: endOfDay(new Date()) });
  const [counts, setCounts] = useState({ orders: 0, salesInvoices: 0, purchaseInvoices: 0, expenses: 0, returns: 0, inventoryReceipts: 0, customers: 0, suppliers: 0, totalSales: 0, totalProfit: 0 });

  // POS State
  const [cart, setCart] = useState<{ item: MenuItem; qty: number; qtyText: string; unitMode: string }[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedDeliveryAgent, setSelectedDeliveryAgent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountingAccounts, setAccountingAccounts] = useState<ChartOfAccount[]>([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [invoiceTabs, setInvoiceTabs] = useState<HeldInvoice[]>([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [showInvoiceTabs, setShowInvoiceTabs] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Derived
  const businessType = (restaurant?.business_type || 'restaurant') as BusinessType;
  const currency = restaurant?.currency || 'ج.م';
  const config = BUSINESS_TYPES[businessType] || BUSINESS_TYPES.other;

  const getUnitOptions = useCallback((item: MenuItem) => {
    const product = (item as any);
    const baseUnit = product.unit || 'قطعة';
    const options = [{ label: baseUnit, factor: 1 }];
    if (product.secondary_unit && product.unit_conversion_factor && Number(product.unit_conversion_factor) > 1) {
      options.push({ label: product.secondary_unit, factor: Number(product.unit_conversion_factor) });
    }
    return options;
  }, []);

  const cartSubtotal = useMemo(() => (cart || []).reduce((s, c) => {
    if (!c || !c.item) return s;
    const units = getUnitOptions(c.item);
    const unitFactor = units.find(u => u && u.label === c.unitMode)?.factor || 1;
    return s + ((Number(c.item.price) || 0) * unitFactor * (Number(c.qty) || 0));
  }, 0), [cart, getUnitOptions]);
  
  const discountAmount = useMemo(() => discountType === 'percent' ? (cartSubtotal * Number(discount || 0)) / 100 : Number(discount || 0), [cartSubtotal, discount, discountType]);
  const taxableAmount = useMemo(() => Math.max(0, cartSubtotal - discountAmount), [cartSubtotal, discountAmount]);
  const totalTax = useMemo(() => (taxes || []).reduce((sum, tax) => (tax && !tax.is_included_in_price ? sum + (taxableAmount * (Number(tax.rate || 0) / 100)) : sum), 0), [taxes, taxableAmount]);
  const cartTotal = useMemo(() => taxableAmount + totalTax, [taxableAmount, totalTax]);
  const paidNum = useMemo(() => Number(paidAmount || 0), [paidAmount]);
  const remaining = useMemo(() => Math.max(0, cartTotal - paidNum), [cartTotal, paidNum]);

  const pendingOrders = (orders || []).filter(o => o && (o.status === 'pending' || o.status === 'preparing'));
  const deliveryOrders = (orders || []).filter(o => o && (o.order_type === 'delivery' || o.delivery_agent_id) && o.status !== 'completed' && o.status !== 'cancelled');
  const filteredOrders = useMemo(() => orderFilter === 'all' ? (orders || []).filter(o => !!o) : (orders || []).filter(o => o && o.status === orderFilter), [orders, orderFilter]);
  const categories = useMemo(() => ['all', ...new Set((menuItems || []).filter(i => i && i.category).map(item => item.category))], [menuItems]);
  const filteredItems = useMemo(() => (menuItems || []).filter(item => {
    if (!item) return false;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || (item.barcode && item.barcode.includes(searchQuery));
    // Treat available as true unless explicitly false (legacy data may have null/undefined)
    const isAvailable = item.available !== false;
    return matchesCategory && matchesSearch && isAvailable;
  }), [menuItems, selectedCategory, searchQuery]);

  const todayOrdersList = useMemo(() => Array.isArray(orders) ? orders.filter(o => o && o.created_at && new Date(o.created_at).toDateString() === new Date().toDateString()) : [], [orders]);
  const todayRevenue = useMemo(() => todayOrdersList.length > 0 ? todayOrdersList.filter(o => o && o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total || 0), 0) : 0, [todayOrdersList]);
  const avgOrderValue = useMemo(() => todayOrdersList.length > 0 ? Number((todayRevenue / todayOrdersList.length).toFixed(2)) : 0, [todayRevenue, todayOrdersList.length]);

  // Handlers
  const selectCustomerFromSearch = useCallback((name: string, phone?: string, address?: string) => {
    setCustomerName(name);
    if (phone) setCustomerPhone(phone);
    if (address) setDeliveryAddress(address);
    if (!customerRef) setCustomerRef(String(Date.now().toString().slice(-6)));
  }, [customerRef]);

  const clearCart = useCallback(() => {
    setCart([]); setTableNumber(''); setCustomerName(''); setCustomerPhone('');
    setOrderNotes(''); setDiscount(''); setDeliveryAddress(''); setSelectedDeliveryAgent('');
    setPaymentMethod('cash'); setPaidAmount(''); setCustomerRef('');
    setOrderType(getDefaultOrderType(businessType) as OrderType); setActiveInvoiceId(null);
  }, [businessType]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1, qtyText: String(c.qty + 1) } : c);
      return [...prev, { item, qty: 1, qtyText: '1', unitMode: getUnitOptions(item)[0]?.label || 'قطعة' }];
    });
  }, [getUnitOptions]);

  const updateQty = useCallback((id: string, d: number) => setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: Math.max(0, Math.round((c.qty + d) * 100) / 100), qtyText: String(Math.max(0, Math.round((c.qty + d) * 100) / 100)) } : c).filter(c => c.qty > 0)), []);

  const setCartItemQty = useCallback((id: string, text: string) => {
    setCart(prev => prev.map(c => {
      if (c.item.id !== id) return c;
      const cleaned = text.replace(/[^0-9.]/g, '');
      const n = parseFloat(cleaned);
      return { ...c, qtyText: cleaned, qty: isNaN(n) ? c.qty : Math.max(0, n) };
    }));
  }, []);

  const setCartItemUnit = useCallback((id: string, label: string) => {
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, unitMode: label } : c));
  }, []);

  // Bidirectional: editing the value (amount) field recomputes qty = value / unitPrice
  const updateValue = useCallback((id: string, value: number) => {
    if (isNaN(value) || value < 0) return;
    setCart(prev => prev.map(c => {
      if (c.item.id !== id) return c;
      const price = Number(c.item.price) || 0;
      if (price <= 0) return c;
      const newQty = Math.round((value / price) * 1000) / 1000;
      return { ...c, qty: newQty, qtyText: String(newQty) };
    }).filter(c => c.qty > 0));
  }, []);

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      setOrders(prev => (prev || []).filter(o => o.id !== id));
      toast.success('تم حذف الطلب بنجاح');
    } catch (e) {
      toast.error('فشل حذف الطلب');
    }
  };

  const performCheckout = async (sendToPrep: boolean = false) => {
    if (cart.length === 0) return;
    setIsProcessingCheckout(true);
    try {
      const result = await checkoutIntegration.processCheckout(
        { restaurantId: restaurant!.id, businessType: businessType as any, currency, isOnline, userId: user?.id, skipPreparation: !sendToPrep },
        { cart: cart.map(c => ({ ...c.item, quantity: c.qty, unitMode: c.unitMode, unitFactor: getUnitOptions(c.item).find(u => u.label === c.unitMode)?.factor || 1 })), customerName, customerPhone, customerRef, orderType: orderType as any, deliveryAddress, deliveryAgentId: selectedDeliveryAgent, paymentMethod: paymentMethod as any, paidAmount: paidNum, discount: discountAmount, discountType: discountType === 'percent' ? 'percentage' : 'fixed', notes: orderNotes, destinationAccountId: selectedAccountId }
      );
      if (result.success && result.order) {
        const completeOrder = {
          ...result.order,
          items: cart.map(c => {
            const units = getUnitOptions(c.item);
            const factor = units.find(u => u.label === c.unitMode)?.factor || 1;
            return {
              menu_item_name: c.item.name,
              quantity: c.qty,
              price: Number(c.item.price) * factor
            };
          })
        };
        setOrders(prev => [completeOrder as Order, ...(Array.isArray(prev) ? prev : [])]);
        setLastReceipt(completeOrder as Order);
        setShowReceipt(true);
        toast.success(`✅ تم إنشاء الطلب #${result.order.order_number?.slice(-4)}`);
        clearCart();
      } else { throw new Error(result.error); }
    } catch (e) { toast.error(e.message || 'فشل في إتمام الطلب'); }
    finally { setIsProcessingCheckout(false); }
  };

  const holdCurrentInvoice = useCallback(() => {
    if (cart.length === 0) { toast.error('السلة فارغة'); return; }
    const newTab: HeldInvoice = {
      id: activeInvoiceId || crypto.randomUUID(),
      label: activeInvoiceId ? (invoiceTabs.find(t => t.id === activeInvoiceId)?.label || `فاتورة ${invoiceTabs.length + 1}`) : `فاتورة ${invoiceTabs.length + 1}`,
      cart, tableNumber, customerName, notes: orderNotes, discount, discountType, orderType, deliveryAddress, customerPhone, deliveryAgentId: selectedDeliveryAgent, timestamp: Date.now(), paymentMethod, selectedAccountId: selectedAccountId || undefined
    };
    if (activeInvoiceId) setInvoiceTabs(prev => prev.map(t => t.id === activeInvoiceId ? newTab : t));
    else setInvoiceTabs(prev => [...prev, newTab]);
    clearCart();
    toast.success('تم تعليق الفاتورة');
  }, [cart, activeInvoiceId, invoiceTabs, tableNumber, customerName, orderNotes, discount, discountType, orderType, deliveryAddress, customerPhone, selectedDeliveryAgent, paymentMethod, selectedAccountId, clearCart]);

  // Performance Optimization: Memoize the active tab content
  const activeTabContent = useMemo(() => {
    if (!restaurant) return null;
    const commonProps = { restaurantId: restaurant.id, currency };

    return (
      <Suspense fallback={
        <div className="h-full flex flex-col items-center justify-center p-20 space-y-4">
          <RefreshCcw className="w-12 h-12 animate-spin text-primary opacity-20" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse">جاري تحميل الوحدة...</p>
        </div>
      }>
        {activeTab === 'home' && <HomeDashboard {...commonProps} userId={user?.id || ''} onNavigate={setActiveTab} />}
        {activeTab === 'pos' && (
          <div className="flex flex-col lg:flex-row h-full gap-4 overflow-hidden">
            <POSGrid restaurant={restaurant} currency={currency} categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredItems={filteredItems} addToCart={addToCart} businessType={businessType} todayRevenue={todayRevenue} todayOrders={todayOrdersList} avgOrderValue={avgOrderValue} pendingOrders={pendingOrders} orderType={orderType} orders={orders} tableNumber={tableNumber} setTableNumber={setTableNumber} />
            <POSCart activeInvoiceId={activeInvoiceId} invoiceTabs={invoiceTabs} cart={cart} holdCurrentInvoice={holdCurrentInvoice} setShowInvoiceTabs={setShowInvoiceTabs} clearCart={clearCart} businessType={businessType} orderType={orderType} setOrderType={setOrderType} tableNumber={tableNumber} setTableNumber={setTableNumber} restaurant={restaurant} customerName={customerName} setCustomerName={selectCustomerFromSearch} customerPhone={customerPhone} setCustomerPhone={setCustomerPhone} customerRef={customerRef} setCustomerRef={setCustomerRef} deliveryAddress={deliveryAddress} setDeliveryAddress={setDeliveryAddress} agents={agents} selectedDeliveryAgent={selectedDeliveryAgent} setSelectedDeliveryAgent={setSelectedDeliveryAgent} orderNotes={orderNotes} setOrderNotes={setOrderNotes} discount={discount} setDiscount={setDiscount} discountType={discountType} setDiscountType={setDiscountType} currency={currency} getUnitOptions={getUnitOptions} updateQty={updateQty} discountAmount={discountAmount} taxAmount={totalTax} cartSubtotal={cartSubtotal} cartTotal={cartTotal} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} paidAmount={paidAmount} setPaidAmount={setPaidAmount} remaining={remaining} checkout={performCheckout} previewInvoice={() => { setLastReceipt({ total: cartTotal, items: cart.map(c => ({ menu_item_name: c.item.name, quantity: c.qty, price: c.item.price })) } as any); setShowReceipt(true); }} removeFromCart={(id) => setCart(prev => prev.filter(c => c.item.id !== id))} accountingAccounts={accountingAccounts} selectedAccountId={selectedAccountId} setSelectedAccountId={setSelectedAccountId} isProcessing={isProcessingCheckout} />
          </div>
        )}
        {activeTab === 'orders' && (
          <div className="p-4 space-y-4 h-full overflow-auto">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black">{config.labels.orders}</h2><div className="flex gap-2">{(['all', 'pending', 'completed', 'cancelled'] as const).map(s => <Button key={s} size="sm" variant={orderFilter === s ? 'default' : 'outline'} onClick={() => setOrderFilter(s)}>{s === 'all' ? 'الكل' : STATUS_CONFIG[s]?.label || s}</Button>)}</div></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{filteredOrders.map(o => (
              <Card key={o.id} className="p-4">
                <div className="flex justify-between font-bold mb-2">
                  <span>#{o.order_number.slice(-4)}</span>
                  <Badge>{o.status}</Badge>
                </div>
                <div className="text-xl font-black text-primary">{o.total} {currency}</div>
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1" variant="outline" size="sm" onClick={() => { setLastReceipt(o); setShowReceipt(true); }}>تفاصيل</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteOrder(o.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}</div>
          </div>
        )}
        
        {/* Management Tabs */}
        {activeTab === 'menu' && <MenuTab restaurant={restaurant} menuItems={menuItems} setMenuItems={setMenuItems} loadData={loadData} />}
        {activeTab === 'inventory' && <InventoryTab {...commonProps} businessType={businessType} />}
        {activeTab === 'inventory_receipts' && <InventoryReceiptsManager {...commonProps} />}
        {activeTab === 'bom' && <BOMManager {...commonProps} />}
        {activeTab === 'customers' && <CustomerManager {...commonProps} />}
        {activeTab === 'suppliers' && <SupplierManager {...commonProps} />}
        {activeTab === 'sales_orders' && <SalesOrders {...commonProps} />}
        {activeTab === 'sales_invoices' && <SalesInvoices {...commonProps} />}
        {activeTab === 'sales_returns' && <SalesReturnsManager {...commonProps} />}
        {activeTab === 'purchase_orders' && <PurchaseOrders {...commonProps} />}
        {activeTab === 'purchase_invoices' && <PurchaseInvoices {...commonProps} />}
        {activeTab === 'contracting' && <ContractingDashboard {...commonProps} />}
         {activeTab === 'projects' && <ContractingDashboard {...commonProps} />}
         {activeTab === 'expenses' && <ExpensesTab {...commonProps} />}
        {activeTab === 'overheads' && <OverheadManager {...commonProps} />}
        {activeTab === 'delivery' && <DeliveryTab {...commonProps} agents={agents} setAgents={setAgents} deliveryOrders={deliveryOrders} onAssignAgent={(oid, aid) => supabase.from('orders').update({ delivery_agent_id: aid }).eq('id', oid).then(loadData)} />}
        {activeTab === 'shifts' && <ShiftsTab restaurant={restaurant} currentShift={currentShift} setCurrentShift={setCurrentShift} profileName={profileName} userId={user!.id} />}
        
        {/* Accounting Tabs */}
        {activeTab === 'treasury' && <TreasuryTab {...commonProps} />}
        {activeTab === 'financials' && <FinancialsTab {...commonProps} businessType={businessType} />}
        {activeTab === 'chart_of_accounts' && <ChartOfAccountsTab {...commonProps} />}
        {activeTab === 'accounting_mapping' && <AccountingMappingTab {...commonProps} />}
        {activeTab === 'manual_journal' && <ManualJournalTab {...commonProps} />}
        {activeTab === 'customer_accounts' && <CustomersTab {...commonProps} />}
        {activeTab === 'supplier_accounts' && <SuppliersTab {...commonProps} />}
        {activeTab === 'fixed_assets' && <FixedAssetsTab {...commonProps} />}
        
        {/* Advanced Tabs */}
        {activeTab === 'crm' && <AuditryCRM {...commonProps} businessType={businessType} />}
        {activeTab === 'analytics' && <AdvancedReportsHub {...commonProps} onNavigate={setActiveTab} />}
        {activeTab === 'ai_assistant' && <AIAccountantUnified {...commonProps} />}
        {activeTab === 'loyalty' && <LoyaltyPoints {...commonProps} />}
        {activeTab === 'gift_cards' && <GiftCards {...commonProps} />}
        {activeTab === 'branches' && <BranchManager {...commonProps} />}
        
        {/* System Tabs */}
        {activeTab === 'staff' && <StaffTab {...commonProps} />}
        {activeTab === 'settings' && <SettingsTab restaurant={restaurant} businessType={businessType} profileName={profileName} user={user} agents={agents} isSuspended={isSuspended} isSuperAdmin={isSuperAdmin} loadData={loadData} />}
        {activeTab === 'notifications' && <NotificationsTab {...commonProps} />}
        {activeTab === 'qr' && (
          <div className="p-10 flex flex-col items-center justify-center space-y-8 h-full">
            <div className="p-8 bg-white rounded-3xl shadow-2xl scale-110">
              <QRCodeSVG value={`${window.location.origin}/menu/${restaurant.id}`} size={250} level="H" />
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-3xl font-black">كود المنيو الذكي (QR Menu)</h3>
              <p className="text-muted-foreground max-w-md">وجه الكاميرا لمسح الكود واستعراض المنيو.</p>
              <Button className="gradient-bg border-0 text-white rounded-xl px-8" onClick={() => window.open(`${window.location.origin}/menu/${restaurant.id}`, '_blank')}>معاينة القائمة</Button>
            </div>
          </div>
        )}
      </Suspense>
    );
  }, [activeTab, restaurant, currency, businessType, cart, orders, orderFilter, agents, currentShift, menuItems, taxes, selectedAccountId, customerName, customerPhone, customerRef, deliveryAddress, selectedDeliveryAgent, orderNotes, discount, discountType, paidAmount, isProcessingCheckout, categories, filteredItems, accountingAccounts, cartSubtotal, cartTotal, remaining, filteredOrders, holdCurrentInvoice, clearCart, selectCustomerFromSearch, updateQty, getUnitOptions, todayRevenue, todayOrdersList, avgOrderValue, pendingOrders, deliveryOrders]);

  // Effects
  useEffect(() => {
    if (!restaurant?.id) return;
    const fetchAccountingAccounts = async () => {
      const { data } = await supabase.from('chart_of_accounts').select('*').eq('restaurant_id', restaurant.id).or('is_cash_account.eq.true,is_bank_account.eq.true').eq('is_active', true);
      setAccountingAccounts(data || []);
      if (data?.length) setSelectedAccountId(data.find(a => a.is_cash_account && a.code === '1100')?.id || data[0].id);
    };
    fetchAccountingAccounts();
  }, [restaurant?.id]);

  if (authLoading || !user || !dataLoaded) return <div className="min-h-screen flex items-center justify-center"><RefreshCcw className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center p-4"><Suspense fallback={null}><CreateRestaurantForm userId={user.id} onCreated={loadData} /></Suspense></div>;

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <ProfessionalSidebar 
          businessType={businessType} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          restaurant={restaurant} 
          user={{ email: user?.email, full_name: profileName }} 
          stats={{ pendingOrders: pendingOrders.length, deliveryOrders: deliveryOrders.length, todayRevenue, isOnline, currency }} 
          onLogout={handleLogout}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          isDark={isDark}
          onToggleDark={toggleDarkMode}
        />
        <main className="flex-1 pt-16 h-[100dvh] overflow-hidden">
          <div className="h-full overflow-auto custom-scrollbar p-2 sm:p-4">
            {activeTabContent}
          </div>
        </main>
        {showReceipt && lastReceipt && <ReceiptModalWrapper isOpen={showReceipt} onClose={() => setShowReceipt(false)} order={lastReceipt} restaurant={restaurant} />}
      </div>
    </DashboardErrorBoundary>
  );
}
