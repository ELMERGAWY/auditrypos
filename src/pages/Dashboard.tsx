// @ts-nocheck
// Final Force Sync for Lovable - 2026-06-06 19:15
import { useState, useRef, useEffect, useCallback, Suspense, lazy, useMemo, memo } from 'react';
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
  Scale, Shield, Building2, RefreshCw, Calendar, Layout, Store as StoreIcon, Wallet2, History, ChevronRight, User, Search, Map, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardData } from './dashboard/useDashboardData';
import { ReceiptModalWrapper } from './dashboard/ReceiptModal';
import { InvoiceViewer } from '@/components/InvoiceViewer';
import { ProfessionalSidebar, type SidebarTab } from '@/components/professional/ProfessionalSidebar';
import { ModuleErrorBoundary } from '@/components/professional/ModuleErrorBoundary';
import { DashboardErrorBoundary } from '@/components/professional/DashboardErrorBoundary';
import { updateService } from '@/lib/updateService';

// Lazy loaded components for performance
const DeliveryTab = lazy(() => import('./dashboard/DeliveryTab').then(m => ({ default: m.DeliveryTab })));
const DeliveryHub = lazy(() => import('./dashboard/DeliveryHub').then(m => ({ default: m.DeliveryHub })));
const MarketingHub = lazy(() => import('./dashboard/MarketingHub').then(m => ({ default: m.MarketingHub })));
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
const PayrollTab = lazy(() => import('./dashboard/PayrollTab').then(m => ({ default: m.PayrollTab })));
const EmployeesTab = lazy(() => import('./dashboard/EmployeesTab').then(m => ({ default: m.EmployeesTab })));
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
const SuperAdmin = lazy(() => import('./SuperAdmin').then(m => ({ default: m.SuperAdmin })));
const PurchaseInvoices = lazy(() => import('./dashboard/PurchaseInvoices').then(m => ({ default: m.PurchaseInvoices })));
const SalesInvoices = lazy(() => import('./dashboard/SalesInvoices').then(m => ({ default: m.SalesInvoices })));
const FixedAssetsTab = lazy(() => import('./dashboard/FixedAssetsTab').then(m => ({ default: m.FixedAssetsTab })));
const KitchenDisplay = lazy(() => import('./dashboard/KitchenDisplay').then(m => ({ default: m.default || m.KitchenDisplay })));
const LoyaltyPoints = lazy(() => import('./dashboard/LoyaltyPoints').then(m => ({ default: m.default || m.LoyaltyPoints })));
const GiftCards = lazy(() => import('./dashboard/GiftCards').then(m => ({ default: m.default || m.GiftCards })));
const BranchManager = lazy(() => import('./dashboard/BranchManager').then(m => ({ default: m.default || m.BranchManager })));
const ServicePackages = lazy(() => import('./dashboard/ServicePackages').then(m => ({ default: m.ServicePackages })));
const MarketingProjects = lazy(() => import('./dashboard/MarketingProjects').then(m => ({ default: m.MarketingProjects })));
const EmployeeChat = lazy(() => import('./dashboard/EmployeeChat').then(m => ({ default: m.EmployeeChat })));
const SupplierContracts = lazy(() => import('./dashboard/SupplierContracts').then(m => ({ default: m.SupplierContracts })));
const MarketingServices = lazy(() => import('./dashboard/MarketingServices').then(m => ({ default: m.MarketingServices })));
const MarketingQuotes = lazy(() => import('./dashboard/MarketingQuotes').then(m => ({ default: m.MarketingQuotes })));
const MarketingContracts = lazy(() => import('./dashboard/MarketingContracts').then(m => ({ default: m.MarketingContracts })));
const MarketingWorkflow = lazy(() => import('./dashboard/MarketingWorkflow').then(m => ({ default: m.MarketingWorkflow })));
const MarketingAccounting = lazy(() => import('./dashboard/MarketingAccounting'));
const ServiceDeliverables = lazy(() => import('./dashboard/ServiceDeliverables').then(m => ({ default: m.ServiceDeliverables })));
const ContractorsTab = lazy(() => import('./dashboard/ContractorsTab').then(m => ({ default: m.ContractorsTab })));

import { BUSINESS_TYPES, BUSINESS_TABS, getBusinessConfig, getDefaultOrderType, isFoodSector, isInventoryDrivenBusiness, type BusinessType } from '@/lib/businessTypes';
import { useAuth } from '@/lib/AuthContext';
import { useDarkMode } from '@/lib/useDarkMode';
import { checkoutIntegration } from '@/lib/accounting';
import { auditLogService } from '@/lib/auditLog';
import type {
  DashboardTab, OrderStatus, OrderType, MenuItem, Order, OrderItem, HeldInvoice, ChartOfAccount
} from './dashboard/types';
import { STATUS_CONFIG, extractCustomerRef } from './dashboard/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode(true);
  const {
    user, authLoading, isOnline, restaurant, menuItems, setMenuItems,
    servicePackages,
    orders, setOrders, waiterCalls, setWaiterCalls, agents, setAgents,
    currentShift, setCurrentShift, profileName, dataLoaded, loadData, handleLogout,
    soundEnabled, setSoundEnabled, taxes, isSuspended
  } = useDashboardData();

  // Conceptually, `restaurant` acts as the active Branch (branch_id = restaurant.id).
  // The root tenant is the Company (company_id = restaurant.company_id),
  // which is automatically populated in the database via triggers.
  const branchId = restaurant?.id;
  const companyId = restaurant?.company_id;

  // Basic State
  const [activeTab, setActiveTab] = useState<SidebarTab>('home');
  const [activeSubView, setActiveSubView] = useState<'stock' | 'bom'>('stock');
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: startOfMonth(new Date()), to: endOfDay(new Date()) });
  const [counts, setCounts] = useState({ orders: 0, salesInvoices: 0, purchaseInvoices: 0, expenses: 0, returns: 0, inventoryReceipts: 0, customers: 0, suppliers: 0, totalSales: 0, totalProfit: 0 });
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editOrderItems, setEditOrderItems] = useState<any[]>([]);
  const [receiptVouchersByCustomer, setReceiptVouchersByCustomer] = useState<Record<string, number>>({});
  const [editOrderForm, setEditOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_ref: '',
    total: '',
    paid_amount: '',
    status: '' as OrderStatus,
    payment_method: 'cash',
    notes: ''
  });

  // POS State
  const [cart, setCart] = useState<{ item: MenuItem; qty: number; qtyText: string; unitMode: string; unitFactor: number; price: number; service_details?: string; service_color?: string; service_type?: string; variables?: { label: string; value: string }[] }[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [customOrderNumber, setCustomOrderNumber] = useState(''); // New state for manual invoice number
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [orderType, setOrderType] = useState<OrderType>('pickup');
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
  const [autoPrint, setAutoPrint] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  // Service item customization modal state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedServiceItem, setSelectedServiceItem] = useState<MenuItem | null>(null);
  const [serviceColor, setServiceColor] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  // Reset modals on tab change
  useEffect(() => {
    setShowReceipt(false);
    setShowInvoiceTabs(false);
    setAutoPrint(false);
  }, [activeTab]);

  // Load receipt vouchers for all customers
  useEffect(() => {
    if (restaurant?.id) {
      supabase
        .from('receipt_vouchers')
        .select('customer_id, amount')
        .eq('restaurant_id', restaurant.id)
        .then(({ data }) => {
          const voucherObj: Record<string, number> = {};
          (data || []).forEach(v => {
            const customerId = v.customer_id || '';
            voucherObj[customerId] = (voucherObj[customerId] || 0) + (v.amount || 0);
          });
          setReceiptVouchersByCustomer(voucherObj);
        });
    }
  }, [restaurant?.id]);

  // Derived
  const businessType = (restaurant?.business_type || 'restaurant') as BusinessType;
  const currency = restaurant?.currency || 'ج.م';
  const config = getBusinessConfig(businessType);
  
  console.log('🔍 Debug:', { businessType, configTabs: config.tabs, hasServicePackages: config.tabs.includes('service_packages') });

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
    return s + (Number(c.price || 0) * (Number(c.qty) || 0));
  }, 0), [cart]);
  
  const discountAmount = useMemo(() => discountType === 'percent' ? (cartSubtotal * Number(discount || 0)) / 100 : Number(discount || 0), [cartSubtotal, discount, discountType]);
  const taxableAmount = useMemo(() => Math.max(0, cartSubtotal - discountAmount), [cartSubtotal, discountAmount]);
  const totalTax = useMemo(() => (taxes || []).reduce((sum, tax) => (tax && !tax.is_included_in_price ? sum + (taxableAmount * (Number(tax.rate || 0) / 100)) : sum), 0), [taxes, taxableAmount]);
  const cartTotal = useMemo(() => taxableAmount + totalTax, [taxableAmount, totalTax]);
  const paidNum = useMemo(() => Number(paidAmount || 0), [paidAmount]);
  const remaining = useMemo(() => Math.max(0, cartTotal - paidNum), [cartTotal, paidNum]);

  const pendingOrders = (orders || []).filter(o => o && (o.status === 'pending' || o.status === 'preparing'));
  const deliveryOrders = (orders || []).filter(o => o && (o.order_type === 'delivery' || o.delivery_agent_id) && o.status !== 'completed' && o.status !== 'cancelled');
  const filteredOrders = useMemo(() => {
    let result = (orders || []).filter(o => !!o);
    if (orderFilter !== 'all') {
      result = result.filter(o => o && o.status === orderFilter);
    }
    if (orderSearchQuery) {
      const q = orderSearchQuery.toLowerCase();
      result = result.filter(o =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.toLowerCase().includes(q) ||
        o.customer_ref?.toLowerCase().includes(q) ||
        extractCustomerRef(o).toLowerCase().includes(q) ||
        o.notes?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, orderFilter, orderSearchQuery]);
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
    // Check if it's a service item
    if ((item as any).product_type === 'service') {
      setSelectedServiceItem(item);
      setServiceColor('');
      setServiceType('');
      setServiceNotes('');
      setShowServiceModal(true);
      return;
    }
    setCart(prev => {
      const defaultUnit = getUnitOptions(item)[0] || { label: 'قطعة', factor: 1 };
      return [...prev, {
        lineId: crypto.randomUUID(),
        item,
        qty: 1,
        qtyText: '1',
        unitMode: defaultUnit.label,
        unitFactor: defaultUnit.factor,
        price: (Number(item.price) || 0) * defaultUnit.factor
      }];
    });

  }, [getUnitOptions]);

  // Function to add service item with customization
  const addServiceToCart = useCallback(() => {
    if (!selectedServiceItem) return;
    setCart(prev => {
      const defaultUnit = getUnitOptions(selectedServiceItem)[0] || { label: 'قطعة', factor: 1 };
      // Combine all service details into one string for service_details
      const details = [
        serviceColor ? `اللون: ${serviceColor}` : '',
        serviceType ? `النوع: ${serviceType}` : '',
        serviceNotes ? `ملاحظات: ${serviceNotes}` : ''
      ].filter(Boolean).join(' | ');
      return [...prev, {
        lineId: crypto.randomUUID(),
        item: selectedServiceItem,
        qty: 1,
        qtyText: '1',
        unitMode: defaultUnit.label,
        unitFactor: defaultUnit.factor,
        price: (Number(selectedServiceItem.price) || 0) * defaultUnit.factor,
        service_details: details,
        service_color: serviceColor,
        service_type: serviceType
      }];

    });
    setShowServiceModal(false);
    setSelectedServiceItem(null);
  }, [selectedServiceItem, serviceColor, serviceType, serviceNotes, getUnitOptions]);

  const addPackageToCart = useCallback((pkg: any) => {
    setCart(prev => {
      let newCart = [...prev];
      // Always add each package item as a new line (no merging)
      for (const pkgItem of pkg.items) {
        const menuItem = menuItems.find(i => i.id === pkgItem.id);
        if (menuItem) {
          const defaultUnit = getUnitOptions(menuItem)[0] || { label: 'قطعة', factor: 1 };
          newCart.push({
            lineId: crypto.randomUUID(),
            item: menuItem,
            qty: pkgItem.quantity,
            qtyText: String(pkgItem.quantity),
            unitMode: defaultUnit.label,
            unitFactor: defaultUnit.factor,
            price: (Number(menuItem.price) || 0) * defaultUnit.factor
          });
        }
      }

      // Now adjust the total price to match the package price
      // Calculate the current total of the package items
      const packageItemsTotal = pkg.items.reduce((sum: number, pkgItem: any) => {
        const menuItem = menuItems.find(i => i.id === pkgItem.id);
        return sum + (menuItem ? Number(menuItem.price) * pkgItem.quantity : 0);
      }, 0);
      const discount = packageItemsTotal - Number(pkg.price);
      if (discount > 0) {
        // Apply a fixed discount
        setDiscount(String(discount));
        setDiscountType('fixed');
      }
      return newCart;
    });
  }, [menuItems, getUnitOptions]);

  const updateQty = useCallback((id: string, d: number) => setCart(prev => prev.map(c => c.lineId === id ? { ...c, qty: Math.max(0, Math.round((c.qty + d) * 100) / 100), qtyText: String(Math.max(0, Math.round((c.qty + d) * 100) / 100)) } : c).filter(c => c.qty > 0)), []);

  const setCartItemQty = useCallback((id: string, text: string) => {
    setCart(prev => prev.map(c => {
      if (c.lineId !== id) return c;
      // Allow only one decimal point
      let cleaned = text.replace(/[^0-9.]/g, '');
      const decimalPoints = cleaned.split('.');
      if (decimalPoints.length > 2) {
        cleaned = decimalPoints[0] + '.' + decimalPoints.slice(1).join('');
      }
      const n = parseFloat(cleaned);
      return { ...c, qtyText: cleaned, qty: isNaN(n) ? c.qty : Math.max(0, n) };
    }));
  }, []);

  const setCartItemUnit = useCallback((id: string, label: string) => {
    setCart(prev => prev.map(c => {
      if (c.lineId !== id) return c;
      const nextUnit = getUnitOptions(c.item).find(u => u.label === label) || { label, factor: 1 };
      return {
        ...c,
        unitMode: nextUnit.label,
        unitFactor: nextUnit.factor,
        price: (Number(c.item.price) || 0) * nextUnit.factor
      };
    }));
  }, [getUnitOptions]);

  // Bidirectional: editing the value (amount) field recomputes qty = value / unitPrice.
  // If price is 0, treat the entered value as the new unit price (qty stays 1).
  const updateValue = useCallback((id: string, value: number) => {
    if (isNaN(value) || value < 0) return;
    setCart(prev => prev.map(c => {
      if (c.lineId !== id) return c;
      const price = Number(c.price) || 0;
      const isService = c.item.product_type === 'service';
      if (price <= 0 || isService) {
        // No unit price yet OR it's a service — set value as price, keep qty = 1
        return { ...c, price: value, qty: 1, qtyText: '1' };
      }
      // Use fixed-point arithmetic to avoid floating-point errors
      const newQty = Math.round((value * 1000) / price) / 1000;
      if (newQty <= 0) return c; // don't remove — just keep as is
      return { ...c, qty: newQty, qtyText: String(newQty) };
    }));
  }, []);

  const updatePrice = useCallback((id: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setCart(prev => prev.map(c => {
      if (c.lineId !== id) return c;
      return { ...c, price: newPrice };
    }));
  }, []);

  const updateServiceDetails = useCallback((id: string, details: string) => {
    setCart(prev => prev.map(c => {
      if (c.lineId !== id) return c;
      return { ...c, service_details: details };
    }));
  }, []);

  const updateServiceVariables = useCallback((id: string, variables: { label: string; value: string }[]) => {
    setCart(prev => prev.map(c => {
      if (c.lineId !== id) return c;
      return { ...c, variables };
    }));
  }, []);

  const handleDeleteOrder = useCallback(async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      setOrders(prev => (prev || []).filter(o => o.id !== id));
      toast.success('تم حذف الطلب بنجاح');
    } catch (e: any) {
      toast.error('فشل حذف الطلب: ' + (e?.message || ''));
    }
  }, []);

  const handleEditOrder = useCallback(async (order: any) => {
    setEditingOrder(order);
    setEditOrderForm({
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      customer_ref: extractCustomerRef(order),
      total: String(order.total || ''),
      paid_amount: String(order.paid_amount || ''),
      status: order.status as OrderStatus,
      payment_method: order.payment_method || 'cash',
      notes: order.notes || ''
    });
    // Fetch order items for editing
    try {
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      setEditOrderItems(items || []);
    } catch {
      setEditOrderItems([]);
    }
    setShowEditOrderModal(true);
  }, []);

  const handleUpdateOrder = useCallback(async () => {
    if (!editingOrder) return;
    try {
      const ref = editOrderForm.customer_ref?.trim();
      let notes = editOrderForm.notes || '';
      if (ref && !notes.includes('المرجع:')) {
        notes = notes ? `${notes} | المرجع: ${ref}` : `المرجع: ${ref}`;
      }

      const payload: Record<string, unknown> = {
        customer_name: editOrderForm.customer_name,
        customer_phone: editOrderForm.customer_phone,
        total: parseFloat(editOrderForm.total) || 0,
        paid_amount: parseFloat(editOrderForm.paid_amount) || 0,
        status: editOrderForm.status,
        payment_method: editOrderForm.payment_method,
        notes
      };
      if (ref) payload.customer_ref = ref;

      let { error } = await supabase.from('orders').update(payload as any).eq('id', editingOrder.id);

      // Fallback if customer_ref column not migrated yet
      if (error?.message?.includes('customer_ref')) {
        const { customer_ref: _ref, ...fallback } = payload;
        ({ error } = await supabase.from('orders').update(fallback as any).eq('id', editingOrder.id));
      }
      if (error) throw error;

      // Update / insert / delete order items
      const originalIds = new Set((editingOrder as any).__originalItemIds || []);
      const currentIds = new Set(editOrderItems.filter(i => i.id).map(i => i.id));
      // Delete removed
      for (const oid of originalIds) {
        if (!currentIds.has(oid)) {
          await supabase.from('order_items').delete().eq('id', oid);
        }
      }
      for (const item of editOrderItems) {
        const payloadItem: any = {
          menu_item_name: item.menu_item_name,
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0,
          sold_unit: item.sold_unit || 'قطعة',
          unit_factor: Number(item.unit_factor) || 1,
        };
        if (item.id) {
          await supabase.from('order_items').update(payloadItem).eq('id', item.id);
        } else {
          await supabase.from('order_items').insert({
            ...payloadItem,
            order_id: editingOrder.id,
            menu_item_id: item.menu_item_id || null,
            product_id: item.product_id || null,
          });
        }
      }


      setOrders(prev => (prev || []).map(o => o.id === editingOrder.id ? { ...o, ...payload } as Order : o));
      toast.success('تم تحديث الطلب بنجاح ✅');
      setShowEditOrderModal(false);
      setEditingOrder(null);
      setEditOrderItems([]);
      loadData();
    } catch (e: any) {
      toast.error('فشل تحديث الطلب: ' + (e?.message || 'خطأ غير معروف'));
    }
  }, [editingOrder, editOrderForm, editOrderItems, loadData]);

  const handleDeleteAndRecreateOrder = useCallback(async () => {
    if (!editingOrder) return;
    if (!restaurant?.id) {
      toast.error('خطأ: بيانات المطعم غير متاحة');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا الطلب وإعادة إنشائه؟ سيتم حذف جميع القيود المحاسبية المرتبطة به.')) return;

    try {
      // Delete order items first
      await supabase.from('order_items').delete().eq('order_id', editingOrder.id);

      // Delete the order
      const { error: deleteError } = await supabase.from('orders').delete().eq('id', editingOrder.id);
      if (deleteError) throw deleteError;

      // Create new order with updated data
      const ref = editOrderForm.customer_ref?.trim();
      let notes = editOrderForm.notes || '';
      if (ref && !notes.includes('المرجع:')) {
        notes = notes ? `${notes} | المرجع: ${ref}` : `المرجع: ${ref}`;
      }

      const payload: Record<string, unknown> = {
        restaurant_id: restaurant.id,
        customer_name: editOrderForm.customer_name,
        customer_phone: editOrderForm.customer_phone,
        total: parseFloat(editOrderForm.total) || 0,
        paid_amount: parseFloat(editOrderForm.paid_amount) || 0,
        status: editOrderForm.status,
        payment_method: editOrderForm.payment_method,
        notes,
        order_number: editingOrder.order_number // Keep same order number
      };
      if (ref) payload.customer_ref = ref;

      const { data: newOrder, error: insertError } = await supabase.from('orders').insert(payload as any).select().single();
      if (insertError) throw insertError;

      // Create order items
      for (const item of editOrderItems) {
        await supabase.from('order_items').insert({
          order_id: newOrder.id,
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item_name,
          quantity: item.quantity,
          price: item.price
        });
      }

      toast.success('تم إعادة إنشاء الطلب بنجاح ✅');
      setShowEditOrderModal(false);
      setEditingOrder(null);
      setEditOrderItems([]);
      loadData();
    } catch (e: any) {
      toast.error('فشل إعادة إنشاء الطلب: ' + (e?.message || 'خطأ غير معروف'));
    }
  }, [editingOrder, editOrderForm, editOrderItems, loadData, restaurant?.id]);

  const performCheckout = async (sendToPrep: boolean = false) => {
    if (cart.length === 0) return;
    if (!restaurant?.id) {
      toast.error('خطأ: بيانات المطعم غير متاحة');
      setIsProcessingCheckout(false);
      return;
    }
    setIsProcessingCheckout(true);
    try {
      const result = await checkoutIntegration.processCheckout(
        { restaurantId: restaurant.id, businessType: businessType as any, currency, isOnline, userId: user?.id, skipPreparation: !sendToPrep },
        { cart: cart.map(c => ({
            ...c.item,
            price: Number(c.price),
            quantity: c.qty,
            unitMode: c.unitMode,
            unitFactor: c.unitFactor || 1,
            service_details: c.service_details,
            variables: c.variables || null
          })),
          customerName, customerPhone, customerRef, orderType: orderType as any, deliveryAddress, deliveryDate, deliveryAgentId: selectedDeliveryAgent, paymentMethod: paymentMethod as any, paidAmount: paidNum, discount: discountAmount, discountType: discountType === 'percent' ? 'percentage' : 'fixed', notes: orderNotes, destinationAccountId: selectedAccountId, customOrderNumber: customOrderNumber || undefined }
      );
      if (result.success && result.order) {
        const completeOrder = {
          ...result.order,
          items: cart.map(c => ({
            menu_item_name: c.item.name,
            quantity: c.qty,
            price: Number(c.price)
          }))
        };
        setOrders(prev => [completeOrder as Order, ...(Array.isArray(prev) ? prev : [])]);
        setLastReceipt(completeOrder as Order);
        setAutoPrint(false);
        setShowReceipt(true);
        toast.success(`✅ تم إنشاء الطلب #${result.order.order_number?.slice(-4)}`);
        clearCart();
        // Reset all form state for next order!
        setCustomerName('');
        setCustomerPhone('');
        setCustomerRef('');
        setTableNumber('');
        setCustomOrderNumber('');
        setOrderNotes('');
        setDeliveryDate('');
        setDiscount('');
        setDiscountType('percent');
        setSelectedDeliveryAgent('');
        setDeliveryAddress('');
        setPaymentMethod('cash');
        setPaidAmount('');
        setSelectedAccountId(null);
        setActiveInvoiceId(null); // Reset to "فاتورة جديدة"!
      } else { throw new Error(result.error); }
    } catch (e) { toast.error(e.message || 'فشل في إتمام الطلب'); }
    finally { setIsProcessingCheckout(false); }
  };

  const holdCurrentInvoice = useCallback(() => {
    if (cart.length === 0) { toast.error('السلة فارغة'); return; }
    const newTab: HeldInvoice = {
      id: activeInvoiceId || crypto.randomUUID(),
      label: activeInvoiceId ? (invoiceTabs.find(t => t.id === activeInvoiceId)?.label || `فاتورة ${invoiceTabs.length + 1}`) : `فاتورة ${invoiceTabs.length + 1}`,
      cart, tableNumber, customerName, notes: orderNotes, discount, discountType, orderType, deliveryAddress, deliveryDate, customerPhone, deliveryAgentId: selectedDeliveryAgent, timestamp: Date.now(), paymentMethod, selectedAccountId: selectedAccountId || undefined, customOrderNumber
    };
    if (activeInvoiceId) setInvoiceTabs(prev => prev.map(t => t.id === activeInvoiceId ? newTab : t));
    else setInvoiceTabs(prev => [...prev, newTab]);
    clearCart();
    toast.success('تم تعليق الفاتورة');
  }, [cart, activeInvoiceId, invoiceTabs, tableNumber, customerName, orderNotes, discount, discountType, orderType, deliveryAddress, deliveryDate, customerPhone, selectedDeliveryAgent, paymentMethod, selectedAccountId, clearCart, customOrderNumber]);

  // Performance Optimization: Memoize the active tab content
  const activeTabContent = useMemo(() => {
    if (!restaurant?.id) return null;
    const commonProps = { restaurantId: restaurant.id, currency, restaurant, isSuperAdmin, isOwner: profileName === restaurant.owner_name };

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
            <POSGrid restaurant={restaurant} currency={currency} categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredItems={filteredItems} addToCart={addToCart} servicePackages={servicePackages} addPackageToCart={addPackageToCart} businessType={businessType} todayRevenue={todayRevenue} todayOrders={todayOrdersList} avgOrderValue={avgOrderValue} pendingOrders={pendingOrders} orderType={orderType} orders={orders} tableNumber={tableNumber} setTableNumber={setTableNumber} />
            <POSCart activeInvoiceId={activeInvoiceId} invoiceTabs={invoiceTabs} cart={cart} holdCurrentInvoice={holdCurrentInvoice} setShowInvoiceTabs={setShowInvoiceTabs} clearCart={clearCart} businessType={businessType} orderType={orderType} setOrderType={setOrderType} tableNumber={tableNumber} setTableNumber={setTableNumber} customOrderNumber={customOrderNumber} setCustomOrderNumber={setCustomOrderNumber} restaurant={restaurant} customerName={customerName} setCustomerName={selectCustomerFromSearch} customerPhone={customerPhone} setCustomerPhone={setCustomerPhone} customerRef={customerRef} setCustomerRef={setCustomerRef} deliveryAddress={deliveryAddress} setDeliveryAddress={setDeliveryAddress} deliveryDate={deliveryDate} setDeliveryDate={setDeliveryDate} agents={agents} selectedDeliveryAgent={selectedDeliveryAgent} setSelectedDeliveryAgent={setSelectedDeliveryAgent} orderNotes={orderNotes} setOrderNotes={setOrderNotes} discount={discount} setDiscount={setDiscount} discountType={discountType} setDiscountType={setDiscountType} currency={currency} getUnitOptions={getUnitOptions} updateQty={updateQty} setCartItemQty={setCartItemQty} setCartItemUnit={setCartItemUnit} updateValue={updateValue} updatePrice={updatePrice} updateServiceDetails={updateServiceDetails} updateServiceVariables={updateServiceVariables} discountAmount={discountAmount} taxAmount={totalTax} cartSubtotal={cartSubtotal} cartTotal={cartTotal} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} paidAmount={paidAmount} setPaidAmount={setPaidAmount} remaining={remaining} checkout={performCheckout} previewInvoice={() => { setLastReceipt({ total: cartTotal, items: cart.map(c => ({ menu_item_name: c.item.name, quantity: c.qty, price: Number(c.price) })) } as any); setAutoPrint(false); setShowReceipt(true); }} removeFromCart={(id) => setCart(prev => prev.filter(c => c.lineId !== id))} accountingAccounts={accountingAccounts} selectedAccountId={selectedAccountId} setSelectedAccountId={setSelectedAccountId} isProcessing={isProcessingCheckout} />
          </div>
        )}
        {activeTab === 'orders' && (
          <div className="p-4 space-y-4 h-full overflow-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-2xl font-black">{config.labels.orders}</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="بحث برقم الطلب أو اسم العميل أو الرقم المرجعي..." 
                    className="pr-10 h-10 w-full sm:w-80"
                    value={orderSearchQuery}
                    onChange={e => setOrderSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'pending', 'completed', 'cancelled'] as const).map(s => 
                    <Button key={s} size="sm" variant={orderFilter === s ? 'default' : 'outline'} onClick={() => setOrderFilter(s)}>
                      {s === 'all' ? 'الكل' : STATUS_CONFIG[s]?.label || s}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{filteredOrders.map(o => (
              <Card key={o.id} className="p-4 hover:shadow-md transition-shadow border-primary/10 cursor-pointer" onClick={() => { setLastReceipt(o); setAutoPrint(false); setShowReceipt(true); }}>
                <div className="flex justify-between items-start font-bold mb-3">
                  <div className="flex flex-col">
                    <span className="text-primary font-black">#{o.order_number.slice(-4)}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString('ar-EG')}</span>
                  </div>
                  <Badge variant={o.status === 'completed' ? 'default' : 'outline'} className={o.status === 'completed' ? 'bg-emerald-500' : ''}>
                    {STATUS_CONFIG[o.status as OrderStatus]?.label || o.status}
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">العميل:</span>
                      {(() => {
                        try {
                          if (!o) return null;
                          const ref = extractCustomerRef(o) || o.customer_phone;
                          return ref ? (
                            <span className="text-primary font-black">
                              ({ref})
                            </span>
                          ) : null;
                        } catch (e) {
                          console.error("Error rendering customer ref:", e);
                          return null;
                        }
                      })()}
                    </div>
                    <span className="font-bold">{o?.customer_name || 'عميل نقدي'}</span>
                  </div>
                  <div className="h-px bg-border/50 my-1" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الإجمالي:</span>
                    <span className="font-black text-primary">{Number(o.total).toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">إجمالي المدفوع:</span>
                    <span className="text-emerald-600 font-bold">{((Number(o.paid_amount || 0) + (receiptVouchersByCustomer[o.customer_id] || 0))).toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">المتبقي:</span>
                    <span className="text-destructive font-bold">{Math.max(0, Number(o.total) - (Number(o.paid_amount || 0) + (receiptVouchersByCustomer[o.customer_id] || 0))).toLocaleString()} {currency}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                <Button className="flex-1 gradient-bg border-0 text-white" size="sm" onClick={(e) => { e.stopPropagation(); setLastReceipt(o); setAutoPrint(false); setShowReceipt(true); }}>
                  <FileText className="w-4 h-4 ml-1" /> تفاصيل
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-0 text-white" size="sm" onClick={(e) => { e.stopPropagation(); setLastReceipt(o); setAutoPrint(true); setShowReceipt(true); }}>
                  <Printer className="w-4 h-4 ml-1" /> طباعة
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditOrder(o); }}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              </Card>
            ))}</div>
          </div>
        )}
        
        {/* Management Tabs */}
        {activeTab === 'menu' && <MenuTab restaurant={restaurant} menuItems={menuItems} setMenuItems={setMenuItems} loadData={loadData} />}
        {activeTab === 'employees' && <EmployeesTab {...commonProps} businessType={businessType} />}
        {activeTab === 'inventory' && <InventoryTab {...commonProps} businessType={businessType} />}
        {activeTab === 'inventory_receipts' && <InventoryReceiptsManager {...commonProps} />}
        {activeTab === 'bom' && <BOMManager {...commonProps} />}
        {activeTab === 'service_packages' && <ServicePackages />}
        {activeTab === 'customers' && <CustomerManager {...commonProps} />}
        {activeTab === 'suppliers' && <SupplierManager {...commonProps} />}
        {activeTab === 'sales_orders' && <SalesOrders {...commonProps} />}
        {activeTab === 'sales_invoices' && <SalesInvoices {...commonProps} />}
        {activeTab === 'sales_returns' && <SalesReturnsManager {...commonProps} />}
        {activeTab === 'purchase_orders' && <PurchaseOrders {...commonProps} />}
        {activeTab === 'purchase_invoices' && <PurchaseInvoices {...commonProps} />}
        {activeTab === 'supplier_contracts' && <SupplierContracts {...commonProps} />}
        {activeTab === 'marketing_services' && <MarketingServices {...commonProps} />}
        {activeTab === 'marketing_quotes' && <MarketingQuotes {...commonProps} />}
        {activeTab === 'marketing_contracts' && <MarketingContracts {...commonProps} />}
        {activeTab === 'marketing_workflow' && <MarketingWorkflow {...commonProps} />}
        {activeTab === 'marketing_accounting' && (
          <ModuleErrorBoundary moduleName="المحاسبة التسويقية">
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <MarketingAccounting {...commonProps} />
            </Suspense>
          </ModuleErrorBoundary>
        )}
        {activeTab === 'service_deliverables' && <ServiceDeliverables {...commonProps} />}
        {activeTab === 'super_admin' && <SuperAdmin />}
        {activeTab === 'contracting' && <ContractingDashboard {...commonProps} />}
        {activeTab === 'contractors' && <ContractorsTab {...commonProps} />}
         {activeTab === 'projects' && (businessType === 'marketing_agency' ? <MarketingProjects {...commonProps} /> : <ContractingDashboard {...commonProps} />)}
         {activeTab === 'expenses' && <ExpensesTab {...commonProps} />}
        {activeTab === 'overheads' && <OverheadManager {...commonProps} />}
        {activeTab === 'delivery' && <DeliveryHub {...commonProps} agents={agents} setAgents={setAgents} deliveryOrders={deliveryOrders} restaurantId={restaurant?.id} currency={currency} onAssignAgent={(oid, aid) => supabase.from('orders').update({ delivery_agent_id: aid }).eq('id', oid).then(loadData)} />}
        {activeTab === 'marketing_hub' && <MarketingHub {...commonProps} />}
        {activeTab === 'shifts' && <ShiftsTab restaurant={restaurant} currentShift={currentShift} setCurrentShift={setCurrentShift} profileName={profileName} userId={user!.id} />}
        
        {/* Accounting Tabs */}
        {activeTab === 'treasury' && <TreasuryTab {...commonProps} />}
        {activeTab === 'financials' && <FinancialsTab {...commonProps} businessType={businessType} />}
        {activeTab === 'chart_of_accounts' && <ChartOfAccountsTab {...commonProps} />}
        {activeTab === 'accounting_mapping' && <AccountingMappingTab {...commonProps} />}
        {activeTab === 'manual_journal' && <ManualJournalTab {...commonProps} />}
        {/* Customer/Supplier accounts merged with management — same unified component */}
        {activeTab === 'customer_accounts' && <CustomerManager {...commonProps} />}
        {activeTab === 'supplier_accounts' && <SupplierManager {...commonProps} />}
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
        {activeTab === 'payroll' && <PayrollTab {...commonProps} businessType={businessType} />}
        {activeTab === 'chat' && restaurant?.id && <EmployeeChat restaurantId={restaurant.id} />}
        {activeTab === 'settings' && <SettingsTab restaurant={restaurant} businessType={businessType} profileName={profileName} user={user} agents={agents} isSuspended={isSuspended} isSuperAdmin={isSuperAdmin} loadData={loadData} />}
        {activeTab === 'notifications' && <NotificationsTab {...commonProps} />}
        {activeTab === 'qr' && restaurant?.id && (
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
  }, [activeTab, restaurant, currency, businessType, cart, orders, orderFilter, orderSearchQuery, agents, currentShift, menuItems, taxes, selectedAccountId, customerName, customerPhone, customerRef, deliveryAddress, selectedDeliveryAgent, orderNotes, discount, discountType, paidAmount, isProcessingCheckout, categories, filteredItems, accountingAccounts, cartSubtotal, cartTotal, remaining, filteredOrders, holdCurrentInvoice, clearCart, selectCustomerFromSearch, updateQty, getUnitOptions, todayRevenue, todayOrdersList, avgOrderValue, pendingOrders, deliveryOrders, handleEditOrder, handleDeleteOrder, user?.id, config]);

  // Effects
  useEffect(() => {
    if (!restaurant?.id) return;
    const fetchAccountingAccounts = async () => {
      const { data } = await supabase.from('chart_of_accounts').select('*').eq('restaurant_id', restaurant.id).or('is_cash_account.eq.true,is_bank_account.eq.true').eq('is_active', true);
      setAccountingAccounts(data || []);
      if (data?.length) setSelectedAccountId(data.find(a => a.is_cash_account && a.code === '1100')?.id || data[0].id);
    };
    fetchAccountingAccounts();

    // Start update checking service
    try {
      updateService.startPeriodicCheck(restaurant.id);
    } catch (error) {
      console.error('Failed to start update service:', error);
    }
  }, [restaurant?.id]);

  const sidebarTabs = useMemo(() => {
    if (!restaurant) return [];
    const baseTabs = config?.tabs || [];
    const customTabs = Array.isArray(restaurant.custom_tabs) && restaurant.custom_tabs.length > 0
      ? restaurant.custom_tabs
      : null;
    // If super admin has configured custom tabs → use them as the FULL list (complete override)
    // If no custom tabs configured → fall back to the module's default tabs
    return (customTabs ?? baseTabs) as SidebarTab[];
  }, [restaurant, config?.tabs]);

  if (authLoading || !user || !dataLoaded) return <div className="min-h-screen flex items-center justify-center"><RefreshCcw className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center p-4"><Suspense fallback={null}><CreateRestaurantForm userId={user.id} onCreated={loadData} /></Suspense></div>;

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <ProfessionalSidebar 
          businessType={businessType} 
          activeTab={activeTab} 
          onTabChange={(tab) => {
            setActiveTab(tab);
            setShowReceipt(false);
            setShowInvoiceTabs(false);
          }} 
          restaurant={restaurant} 
          user={{ email: user?.email, full_name: profileName }} 
          stats={{ pendingOrders: pendingOrders.length, deliveryOrders: deliveryOrders.length, todayRevenue, isOnline, currency }} 
          onLogout={handleLogout}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          isDark={isDark}
          onToggleDark={toggleDarkMode}
          isSuperAdmin={isSuperAdmin}
          tabs={sidebarTabs}
        />
        <main className="flex-1 pt-16 h-[100dvh] overflow-hidden">
          <div className="h-full overflow-auto custom-scrollbar p-2 sm:p-4">
            {activeTabContent}
          </div>
        </main>
        {showReceipt && lastReceipt && <ReceiptModalWrapper isOpen={showReceipt} onClose={() => setShowReceipt(false)} order={lastReceipt} restaurant={restaurant} autoPrint={autoPrint} />}

        {/* Service Item Customization Modal */}
        {showServiceModal && selectedServiceItem && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card p-6 max-w-lg w-full relative shadow-2xl rounded-3xl">
              <button onClick={() => { setShowServiceModal(false); setSelectedServiceItem(null); }} className="absolute left-4 top-4 text-muted-foreground hover:text-foreground hover:bg-secondary/50 w-9 h-9 rounded-full flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">{selectedServiceItem.image}</div>
                <h3 className="text-2xl font-black mb-2">تخصيص الخدمة</h3>
                <p className="text-xl font-bold text-primary">{selectedServiceItem.name}</p>
                <p className="text-xs text-muted-foreground mt-1">أضف التفاصيل المطلوبة قبل الإضافة إلى السلة</p>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <Label className="text-sm font-bold mb-2 block text-primary">🎨 اللون</Label>
                  <Input 
                    value={serviceColor} 
                    onChange={e => setServiceColor(e.target.value)} 
                    placeholder="مثال: أحمر، أزرق، أبيض، أسود" 
                    className="h-11 rounded-xl border-primary/20 focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="p-4 bg-secondary/30 rounded-2xl border border-border">
                  <Label className="text-sm font-bold mb-2 block text-foreground">🛠️ نوع الخدمة</Label>
                  <Input 
                    value={serviceType} 
                    onChange={e => setServiceType(e.target.value)} 
                    placeholder="مثال: تنظيف، صيانة، تركيب، إصلاح" 
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="p-4 bg-accent/10 rounded-2xl border border-accent/20">
                  <Label className="text-sm font-bold mb-2 block text-accent-foreground">📝 ملاحظات إضافية</Label>
                  <textarea 
                    value={serviceNotes} 
                    onChange={e => setServiceNotes(e.target.value)} 
                    placeholder="أي تفاصيل إضافية تريد إضافتها..." 
                    className="w-full h-24 p-3 rounded-xl border border-accent/20 bg-background focus:ring-2 focus:ring-accent/30 outline-none resize-none text-sm"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={() => { setShowServiceModal(false); setSelectedServiceItem(null); }} 
                    variant="outline" 
                    className="flex-1 h-11 rounded-xl text-sm font-bold border-2 border-border hover:border-foreground/20"
                  >
                    إلغاء
                  </Button>
                  <Button 
                    onClick={addServiceToCart} 
                    className="flex-1 h-11 rounded-xl text-sm font-bold gradient-bg text-primary-foreground border-0 shadow-lg shadow-primary/20"
                  >
                    ✅ إضافة إلى السلة
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewingOrderId && (
          <InvoiceViewer
            open={!!viewingOrderId}
            onClose={() => setViewingOrderId(null)}
            source="order"
            recordId={viewingOrderId}
            currency={currency}
            restaurantName={restaurant?.name}
            restaurantLogo={restaurant?.logo}
            restaurantId={restaurant?.id}
          />
        )}
        
        {/* Edit Order Modal */}
        {showEditOrderModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => { setShowEditOrderModal(false); setEditingOrder(null); }} className="absolute left-4 top-4 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-2xl font-black mb-6">تعديل الطلب</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>اسم العميل</Label>
                  <Input value={editOrderForm.customer_name} onChange={e => setEditOrderForm({...editOrderForm, customer_name: e.target.value})} />
                </div>
                <div>
                  <Label>رقم هاتف العميل</Label>
                  <Input value={editOrderForm.customer_phone} onChange={e => setEditOrderForm({...editOrderForm, customer_phone: e.target.value})} />
                </div>
                <div>
                  <Label>الرقم المرجعي للعميل</Label>
                  <Input value={editOrderForm.customer_ref} onChange={e => setEditOrderForm({...editOrderForm, customer_ref: e.target.value})} />
                </div>
                <div>
                  <Label>الإجمالي</Label>
                  <Input type="number" value={editOrderForm.total} onChange={e => setEditOrderForm({...editOrderForm, total: e.target.value})} />
                </div>
                <div>
                  <Label>إجمالي المدفوع</Label>
                  <Input type="number" value={editOrderForm.paid_amount} onChange={e => setEditOrderForm({...editOrderForm, paid_amount: e.target.value})} />
                </div>
                <div>
                  <Label>حالة الطلب</Label>
                  <select className="w-full bg-secondary p-2 rounded-lg" value={editOrderForm.status} onChange={e => setEditOrderForm({...editOrderForm, status: e.target.value as OrderStatus})}>
                    <option value="pending">قيد الانتظار</option>
                    <option value="preparing">قيد التحضير</option>
                    <option value="ready">جاهز</option>
                    <option value="delivering">قيد التوصيل</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغى</option>
                  </select>
                </div>
                <div>
                  <Label>طريقة الدفع</Label>
                  <select className="w-full bg-secondary p-2 rounded-lg" value={editOrderForm.payment_method} onChange={e => setEditOrderForm({...editOrderForm, payment_method: e.target.value})}>
                    <option value="cash">نقدي</option>
                    <option value="card">بطاقة</option>
                    <option value="credit">آجل</option>
                    <option value="bank">تحويل بنكي</option>
                  </select>
                </div>
                <div>
                  <Label>ملاحظات</Label>
                  <Input value={editOrderForm.notes} onChange={e => setEditOrderForm({...editOrderForm, notes: e.target.value})} />
                </div>

                {/* Editable Order Items */}
                {editOrderItems.length > 0 && (
                  <div>
                    <Label className="text-base font-bold mb-2 block">بنود الطلب</Label>
                    <div className="rounded-xl overflow-hidden border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary">
                          <tr>
                            <th className="p-2 text-right">الصنف</th>
                            <th className="p-2 text-center w-20">الكمية</th>
                            <th className="p-2 text-center w-24">السعر</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editOrderItems.map((item, idx) => (
                            <tr key={item.id || idx} className="border-t border-border">
                              <td className="p-2">
                                <Input
                                  className="h-8 text-sm"
                                  value={item.menu_item_name || ''}
                                  onChange={e => {
                                    const updated = [...editOrderItems];
                                    updated[idx] = { ...updated[idx], menu_item_name: e.target.value };
                                    setEditOrderItems(updated);
                                  }}
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  className="h-8 text-sm text-center"
                                  type="number"
                                  min="1"
                                  value={item.quantity || 1}
                                  onChange={e => {
                                    const updated = [...editOrderItems];
                                    updated[idx] = { ...updated[idx], quantity: Number(e.target.value) };
                                    setEditOrderItems(updated);
                                  }}
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  className="h-8 text-sm text-center"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.price || 0}
                                  onChange={e => {
                                    const updated = [...editOrderItems];
                                    updated[idx] = { ...updated[idx], price: parseFloat(e.target.value) || 0 };
                                    setEditOrderItems(updated);
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button className="flex-1 h-12 gradient-bg border-0 text-white font-bold text-lg mt-4" onClick={handleUpdateOrder}>
                    تحديث الطلب
                  </Button>
                  <Button className="h-12 border-0 text-white font-bold text-lg mt-4 bg-destructive hover:bg-destructive/90" onClick={handleDeleteAndRecreateOrder}>
                    حذف وإعادة إنشاء
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardErrorBoundary>
  );
}
