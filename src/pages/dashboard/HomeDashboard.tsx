// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, Store, DollarSign,
  ShoppingCart, Package, Receipt, ArrowUpRight, ArrowDownRight,
  Calendar, Clock, Target, BarChart3, PieChart, Activity,
  ArrowRight, Sparkles, Wallet, CreditCard, Truck,
  AlertCircle, CheckCircle2, Clock4, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { createFinancialReporting } from '@/erp/reporting_engine/financialReports';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RePieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { toast } from 'sonner';

interface HomeDashboardProps {
  restaurantId: string;
  currency: string;
  onNavigate: (tab: string) => void;
  userId: string;
}

interface DashboardStats {
  // Sales
  todaySales: number;
  todayOrders: number;
  monthSales: number;
  monthOrders: number;
  salesChange: number;
  
  // Financial
  todayProfit: number;
  monthProfit: number;
  profitMargin: number;
  profitChange: number;
  
  // Customers
  totalCustomers: number;
  newCustomersToday: number;
  activeCustomers: number;
  
  // Suppliers
  totalSuppliers: number;
  pendingPayables: number;
  
  // Inventory
  lowStockItems: number;
  totalProducts: number;
  inventoryValue: number;
  
  // Orders
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  
  // AI
  pendingAISuggestions: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

const cardHoverVariants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.2, ease: "easeInOut" }
  }
};

export function HomeDashboard({ restaurantId, currency, onNavigate, userId }: HomeDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    monthSales: 0,
    monthOrders: 0,
    salesChange: 0,
    todayProfit: 0,
    monthProfit: 0,
    profitMargin: 0,
    profitChange: 0,
    totalCustomers: 0,
    newCustomersToday: 0,
    activeCustomers: 0,
    totalSuppliers: 0,
    pendingPayables: 0,
    lowStockItems: 0,
    totalProducts: 0,
    inventoryValue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    pendingAISuggestions: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    loadDashboardData();
  }, [restaurantId]);

  const loadDashboardData = async () => {
    try {
      if (!hasLoadedOnce.current) setLoading(true);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayStart.getTime() - 1);
      const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStartDate = new Date(todayStart);
      weekStartDate.setDate(weekStartDate.getDate() - 6);
      const today = todayStart.toISOString();
      const todayTo = todayEnd.toISOString();
      const yesterday = yesterdayStart.toISOString();
      const yesterdayTo = yesterdayEnd.toISOString();
      const monthStart = monthStartDate.toISOString();
      const weekStart = weekStartDate.toISOString();
      
      // Parallel data fetching
      const [
        todayOrdersRes,
        monthOrdersRes,
        yesterdayOrdersRes,
        customersRes,
        newCustomersRes,
        suppliersRes,
        payablesRes,
        productsRes,
        lowStockRes,
        inventoryValueRes,
        pendingOrdersRes,
        aiSuggestionsRes,
        topProductsRes
      ] = await Promise.all([
        // Today's orders
        supabase.from('orders').select('total, total_cost, status, created_at').eq('restaurant_id', restaurantId).gte('created_at', today).lte('created_at', todayTo).neq('status', 'cancelled'),
        // Month orders
        supabase.from('orders').select('total, total_cost, status, created_at').eq('restaurant_id', restaurantId).gte('created_at', monthStart).lte('created_at', todayTo).neq('status', 'cancelled'),
        // Yesterday for comparison
        supabase.from('orders').select('total, total_cost, status, created_at').eq('restaurant_id', restaurantId).gte('created_at', yesterday).lte('created_at', yesterdayTo).neq('status', 'cancelled'),
        // Total customers
        supabase.from('customers').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId),
        // New customers today
        supabase.from('customers').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId).gte('created_at', today),
        // Total suppliers
        supabase.from('suppliers').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId),
        // Pending payables
        supabase.from('suppliers').select('balance').eq('restaurant_id', restaurantId).gt('balance', 0),
        // Total products
        supabase.from('products').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId),
        // Low stock
        supabase.from('products').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId).lt('quantity', 10),
        // Inventory value
        supabase.from('products').select('quantity, price').eq('restaurant_id', restaurantId),
        // Pending/processing orders
        supabase.from('orders').select('status').eq('restaurant_id', restaurantId).in('status', ['pending', 'preparing', 'processing', 'ready']),
        // AI suggestions
        supabase.from('ai_journal_suggestions').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId).eq('status', 'pending'),
        // Top products this week
        supabase.from('order_items').select('menu_item_name, quantity, price, orders!inner(created_at, restaurant_id, status)').eq('orders.restaurant_id', restaurantId).neq('orders.status', 'cancelled').gte('orders.created_at', weekStart).limit(100)
      ]);

      // Accounting reports are useful for profit/balance sheet, but POS sales must
      // come from operational orders because journal posting can be deferred.
      const engine = createFinancialReporting(restaurantId);

      const [plToday, plYest, plMonth, bs] = await Promise.all([
        engine.generateProfitLoss(todayStart.toISOString().split('T')[0], todayStart.toISOString().split('T')[0]),
        engine.generateProfitLoss(yesterdayStart.toISOString().split('T')[0], yesterdayStart.toISOString().split('T')[0]),
        engine.generateProfitLoss(monthStartDate.toISOString().split('T')[0], todayStart.toISOString().split('T')[0]),
        engine.generateBalanceSheet(todayStart.toISOString().split('T')[0]),
      ]);

      const sumOrders = (rows: any[] = []) => rows.reduce((s, o) => s + Number(o.total || 0), 0);
      const sumCost = (rows: any[] = []) => rows.reduce((s, o) => s + Number(o.total_cost || 0), 0);
      const todaySales = sumOrders(todayOrdersRes.data || []);
      const todayOrdersCount = todayOrdersRes.data?.length || 0;
      const monthSales = sumOrders(monthOrdersRes.data || []);
      const yesterdaySales = sumOrders(yesterdayOrdersRes.data || []);
      const salesChange = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;

      const todayProfit = plToday.net_profit || (todaySales - sumCost(todayOrdersRes.data || []));
      const monthProfit = plMonth.net_profit || (monthSales - sumCost(monthOrdersRes.data || []));
      const profitMargin = monthSales > 0 ? (monthProfit / monthSales) * 100 : 0;
      const yProfit = plYest.net_profit;
      const profitChange = yProfit !== 0 ? ((todayProfit - yProfit) / Math.abs(yProfit)) * 100 : 0;

      // Inventory value from balance sheet
      const inventoryValue = bs.assets.current.inventory || (inventoryValueRes.data?.reduce((s, p) => s + ((p.quantity || 0) * (p.price || 0)), 0) || 0);
      
      // Order statuses
      const orderStatuses = pendingOrdersRes.data || [];
      const pendingCount = orderStatuses.filter((o: any) => o.status === 'pending').length;
      const processingCount = orderStatuses.filter((o: any) => o.status === 'processing' || o.status === 'preparing' || o.status === 'ready').length;
      
      // Payables
      const pendingPayables = bs.liabilities.current.payables || (payablesRes.data?.reduce((sum, s) => sum + (s.balance || 0), 0) || 0);

      setStats({
        todaySales,
        todayOrders: todayOrdersCount,
        monthSales,
        monthOrders: monthOrdersRes.data?.length || 0,
        salesChange,
        todayProfit,
        monthProfit,
        profitMargin,
        profitChange,
        totalCustomers: customersRes.count || 0,
        newCustomersToday: newCustomersRes.count || 0,
        activeCustomers: customersRes.count || 0,
        totalSuppliers: suppliersRes.count || 0,
        pendingPayables,
        lowStockItems: lowStockRes.count || 0,
        totalProducts: productsRes.count || 0,
        inventoryValue,
        pendingOrders: pendingCount,
        processingOrders: processingCount,
        completedOrders: todayOrdersCount - pendingCount - processingCount,
        pendingAISuggestions: aiSuggestionsRes.count || 0
      });

      // Real per-day chart from operational orders.
      const chartData: any[] = [];
      const weeklyOrders = monthOrdersRes.data?.filter((order: any) => new Date(order.created_at) >= weekStartDate) || [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        const dayOrders = weeklyOrders.filter((order: any) => {
          const created = new Date(order.created_at);
          return created >= dayStart && created <= dayEnd;
        });
        const sales = sumOrders(dayOrders);
        chartData.push({
          name: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
          sales: Math.round(sales),
          profit: Math.round(sales - sumCost(dayOrders)),
        });
      }
      setSalesChartData(chartData);

      // Category split from real P&L
      setCategoryData([
        { name: 'الإيرادات', value: monthSales, color: '#10b981' },
        { name: 'تكلفة المبيعات', value: sumCost(monthOrdersRes.data || []) || plMonth.cogs.total, color: '#f59e0b' },
        { name: 'المصروفات', value: plMonth.operating_expenses.total, color: '#ef4444' },
        { name: 'صافي الربح', value: Math.max(0, plMonth.net_profit), color: '#3b82f6' }
      ]);

      // Recent activity from journal entries
      const { data: recentJE } = await supabase
        .from('journal_entries')
        .select('entry_number, description, total_debit, entry_date, source, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('is_posted', true)
        .order('created_at', { ascending: false })
        .limit(6);
      setRecentActivity((recentJE || []).map((j: any) => ({
        type: 'journal',
        title: `${j.entry_number} - ${j.description || 'قيد محاسبي'}`,
        time: new Date(j.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
        amount: Number(j.total_debit) || 0,
        status: 'success'
      })));

    } catch (error) {
      console.error('Dashboard load error:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      hasLoadedOnce.current = true;
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-EG') + ' ' + currency;
  };

  const QuickActionCard = ({ 
    icon: Icon, 
    title, 
    description, 
    color, 
    onClick,
    badge 
  }: { 
    icon: any, 
    title: string, 
    description: string, 
    color: string, 
    onClick: () => void,
    badge?: number 
  }) => (
    <motion.div
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
    >
      <Card 
        className="cursor-pointer border-2 hover:border-primary/50 transition-all overflow-hidden group"
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            {badge !== undefined && badge > 0 && (
              <Badge className="bg-primary text-white">{badge}</Badge>
            )}
          </div>
          <h3 className="font-bold text-lg mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color,
    subtitle
  }: { 
    title: string, 
    value: string | number, 
    change?: number, 
    icon: any, 
    color: string,
    subtitle?: string
  }) => (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-10 rounded-bl-full`} />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="text-sm font-medium">{title}</CardDescription>
            <div className={`w-8 h-8 rounded-lg ${color} bg-opacity-20 flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black mb-1">{value}</div>
          {change !== undefined && (
            <div className={`flex items-center text-sm ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {change >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              {Math.abs(change).toFixed(1)}% عن الأمس
            </div>
          )}
          {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6 h-full overflow-y-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1">
            نظرة شاملة على أداء نشاطك التجاري
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadDashboardData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </Button>
          <Button size="sm" onClick={() => onNavigate('pos')}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            نقطة البيع
          </Button>
        </div>
      </motion.div>

      {/* AI Alert Banner */}
      {stats.pendingAISuggestions > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold">لديك {stats.pendingAISuggestions} اقتراح محاسبي من AI</h3>
                  <p className="text-sm text-muted-foreground">المحاسب الذكي اقترح قيود جديدة للمراجعة</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onNavigate('ai_assistant')}>
                مراجعة الاقتراحات
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="مبيعات اليوم"
          value={formatCurrency(stats.todaySales)}
          change={stats.salesChange}
          icon={DollarSign}
          color="bg-emerald-500"
          subtitle={`${stats.todayOrders} طلب`}
        />
        <StatCard
          title="صافي الربح"
          value={formatCurrency(stats.todayProfit)}
          change={stats.profitChange}
          icon={TrendingUp}
          color="bg-blue-500"
          subtitle={`هامش ${stats.profitMargin.toFixed(1)}%`}
        />
        <StatCard
          title="العملاء النشطين"
          value={stats.totalCustomers}
          icon={Users}
          color="bg-violet-500"
          subtitle={`+${stats.newCustomersToday} جديد اليوم`}
        />
        <StatCard
          title="الطلبات المعلقة"
          value={stats.pendingOrders}
          icon={Clock}
          color="bg-amber-500"
          subtitle={`${stats.processingOrders} قيد التنفيذ`}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">مؤشر المبيعات والأرباح</CardTitle>
                <CardDescription>آخر 7 أيام</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />
                  المبيعات
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                  الربح
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#10b981" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" stroke="#3b82f6" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Categories Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">توزيع اليوم</CardTitle>
            <CardDescription>إيرادات vs مصروفات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {categoryData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions & Inventory Alert */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            الوصول السريع
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <QuickActionCard
              icon={ShoppingCart}
              title="طلب بيع"
              description="إنشاء فاتورة مبيعات جديدة"
              color="bg-emerald-500"
              onClick={() => onNavigate('pos')}
            />
            <QuickActionCard
              icon={Package}
              title="استلام مخزون"
              description="تسجيل واردات جديدة"
              color="bg-blue-500"
              onClick={() => onNavigate('inventory_receipts')}
            />
            <QuickActionCard
              icon={Receipt}
              title="مصروف جديد"
              description="تسجيل مصروف يومي"
              color="bg-amber-500"
              onClick={() => onNavigate('expenses')}
            />
            <QuickActionCard
              icon={Users}
              title="عميل جديد"
              description="إضافة عميل للنظام"
              color="bg-violet-500"
              onClick={() => onNavigate('customers')}
            />
            <QuickActionCard
              icon={Sparkles}
              title="AI مساعد"
              description="اقتراح قيد محاسبي"
              color="bg-purple-500"
              onClick={() => onNavigate('ai_assistant')}
              badge={stats.pendingAISuggestions}
            />
            <QuickActionCard
              icon={BarChart3}
              title="التقارير"
              description="عرض التحليلات المالية"
              color="bg-cyan-500"
              onClick={() => onNavigate('stats')}
            />
          </div>
        </div>

        {/* Alerts & Activity */}
        <div className="space-y-4">
          {/* Low Stock Alert */}
          {stats.lowStockItems > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-700">تنبيه المخزون</h4>
                    <p className="text-sm text-amber-600 mt-1">
                      {stats.lowStockItems} منتجات تحتاج إعادة توريد
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full border-amber-500/30 hover:bg-amber-500/10"
                      onClick={() => onNavigate('inventory')}
                    >
                      مراجعة المخزون
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                النشاط الأخير
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    activity.status === 'success' ? 'bg-emerald-500/20' :
                    activity.status === 'warning' ? 'bg-amber-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    {activity.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                     activity.status === 'warning' ? <AlertCircle className="w-4 h-4 text-amber-600" /> :
                     <Sparkles className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  {activity.amount && (
                    <span className="text-sm font-bold text-emerald-600">
                      +{formatCurrency(activity.amount)}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Monthly Overview */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">ملخص الشهر الحالي</CardTitle>
            <CardDescription>{new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">إجمالي المبيعات</span>
                  <span className="font-bold">{formatCurrency(stats.monthSales)}</span>
                </div>
                <Progress value={75} className="h-2" />
                <p className="text-xs text-muted-foreground">75% من الهدف الشهري</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">صافي الربح</span>
                  <span className="font-bold">{formatCurrency(stats.monthProfit)}</span>
                </div>
                <Progress value={60} className="h-2" />
                <p className="text-xs text-muted-foreground">هامش ربح {stats.profitMargin.toFixed(0)}%</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">المدفوعات المعلقة</span>
                  <span className="font-bold text-amber-600">{formatCurrency(stats.pendingPayables)}</span>
                </div>
                <Progress value={40} className="h-2 bg-amber-100" />
                <p className="text-xs text-muted-foreground">{stats.totalSuppliers} مورد</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">قيمة المخزون</span>
                  <span className="font-bold">{formatCurrency(stats.inventoryValue)}</span>
                </div>
                <Progress value={85} className="h-2 bg-blue-100" />
                <p className="text-xs text-muted-foreground">{stats.totalProducts} منتج</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
