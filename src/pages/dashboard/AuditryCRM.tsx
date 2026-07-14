// @ts-nocheck
// TIMESTAMP: 2026-05-10 23:48:30
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, UserPlus, Target, Heart, MessageSquare, 
  TrendingUp, Star, Phone, Mail, MapPin, 
  Search, Filter, MoreVertical,
  Award, Zap, History,
  Columns, Plus, Clock, CheckCircle, List,
  Truck, Activity, CheckCircle2, Eye, Calendar,
  BarChart3, Package, ShoppingCart, ArrowRight,
  Facebook, Instagram, MessageCircle, Send,
  UserCheck, BrainCircuit, Share2, Sparkles,
  AlertCircle, ThumbsUp, ThumbsDown, Smile, Frown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { 
  FileText, Wallet, Receipt, CreditCard, 
  ArrowUpRight, ArrowDownRight, Download,
  Settings, Bell, ShieldCheck, ShieldAlert, AlertTriangle
} from 'lucide-react';

interface Props {
  restaurantId: string;
  currency: string;
  businessType: string;
}

type TabType = 'overview' | 'leads' | 'social' | 'customers' | 'suppliers' | 'loyalty' | 'communications' | 'insights' | 'tasks' | 'settings';
type LeadStage = 'new' | 'contacted' | 'negotiation' | 'won' | 'lost';

export function AuditryCRM({ restaurantId, currency, businessType }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [socialMessages, setSocialMessages] = useState<any[]>([]);
  const [platformConfigs, setPlatformConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerProducts, setCustomerProducts] = useState<any[]>([]);

  // Platform Setup Dialog
  const [showPlatformSetup, setShowPlatformSetup] = useState<string | null>(null);
  const [configData, setConfigData] = useState({ api_key: '', api_secret: '', webhook_verify_token: '' });

  // New lead form state
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', estimated_value: '', source: 'manual' });
  const [leadSearch, setLeadSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [loyaltyFilter, setLoyaltyFilter] = useState<'all' | 'bronze' | 'silver' | 'gold' | 'platinum'>('all');

  // Tasks
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', priority: 'medium', lead_id: '' });

  // Social message state
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');

  // Warning management state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [warningHistory, setWarningHistory] = useState<any[]>([]);

  useEffect(() => {
    loadCRMData();
  }, [restaurantId]);

  const loadCRMData = async () => {
    try {
      setLoading(true);
      
      const { data: customersData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (custError) throw custError;

      // Load order totals separately (customers select does not embed orders)
      const customerIds = (customersData || []).map((c: any) => c.id).filter(Boolean);
      let spentByCustomer = new Map<string, { total: number; lastDate: string | null; orderCount: number }>();
      if (customerIds.length > 0) {
        const { data: orderRows } = await supabase
          .from('orders')
          .select('customer_id, total, created_at, status')
          .eq('restaurant_id', restaurantId)
          .in('customer_id', customerIds)
          .neq('status', 'cancelled');
        for (const o of orderRows || []) {
          if (!o.customer_id) continue;
          const prev = spentByCustomer.get(o.customer_id) || { total: 0, lastDate: null, orderCount: 0 };
          const total = prev.total + (Number(o.total) || 0);
          const lastDate =
            !prev.lastDate || new Date(o.created_at) > new Date(prev.lastDate)
              ? o.created_at
              : prev.lastDate;
          spentByCustomer.set(o.customer_id, {
            total,
            lastDate,
            orderCount: prev.orderCount + 1,
          });
        }
      }

      const [suppliersRes, leadsRes, logsRes, tasksRes, staffRes, socialAccRes, socialMsgRes, platformCfgRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('restaurant_id', restaurantId).order('total_purchases', { ascending: false }),
        supabase.from('crm_leads').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('crm_communication_logs').select('*').eq('restaurant_id', restaurantId).order('contact_date', { ascending: false }).limit(50),
        supabase.from('crm_tasks').select('*').eq('restaurant_id', restaurantId).order('due_date', { ascending: true }),
        supabase.from('staff').select('id, name, role').eq('restaurant_id', restaurantId),
        supabase.from('crm_social_accounts').select('*').eq('restaurant_id', restaurantId),
        supabase.from('crm_social_messages').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('crm_platform_configs').select('*').eq('restaurant_id', restaurantId)
      ]);
      
      if (customersData) {
        const formatted = customersData.map((c: any) => {
          const agg = spentByCustomer.get(c.id) || { total: 0, lastDate: null, orderCount: 0 };
          const totalSpent = Number(c.total_spent) > 0 ? Number(c.total_spent) : agg.total;
          const points = Number(c.loyalty_points) || Math.floor(totalSpent / 10);
          const tier =
            c.loyalty_tier ||
            (totalSpent >= 50000 ? 'platinum' : totalSpent >= 20000 ? 'gold' : totalSpent >= 5000 ? 'silver' : 'bronze');
          return {
            ...c,
            total_spent: totalSpent,
            loyalty_points: points,
            loyalty_tier: tier,
            order_count: agg.orderCount,
            last_order_date: agg.lastDate,
          };
        });
        setCustomers(formatted.sort((a, b) => b.total_spent - a.total_spent));
      }
      
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (!leadsRes.error && leadsRes.data) setLeads(leadsRes.data);
      if (!logsRes.error && logsRes.data) setLogs(logsRes.data);
      if (!tasksRes.error && tasksRes.data) setTasks(tasksRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (socialAccRes.data) setSocialAccounts(socialAccRes.data);
      if (socialMsgRes.data) setSocialMessages(socialMsgRes.data);
      if (platformCfgRes.data) setPlatformConfigs(platformCfgRes.data);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحميل بيانات CRM');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!showPlatformSetup) return;
    const { error } = await supabase.from('crm_platform_configs').upsert({
      restaurant_id: restaurantId,
      platform: showPlatformSetup,
      ...configData,
      is_active: true
    });
    
    if (error) return toast.error('فشل حفظ الإعدادات');
    toast.success(`تم تفعيل ربط ${showPlatformSetup} بنجاح`);
    setShowPlatformSetup(null);
    loadCRMData();
  };

  const handleAssignLead = async (leadId: string, staffId: string) => {
    const { error } = await supabase
      .from('crm_leads')
      .update({ assigned_to: staffId })
      .eq('id', leadId);
    
    if (error) return toast.error('فشل تعيين الموظف');
    toast.success('تم تعيين الموظف للفرصة بنجاح');
    loadCRMData();
  };

  const handleAssignSocialMessage = async (messageId: string, staffId: string) => {
    const { error } = await supabase
      .from('crm_social_messages')
      .update({ assigned_to: staffId, status: 'assigned' })
      .eq('id', messageId);
    if (error) return toast.error('فشل توجيه الرسالة');
    toast.success('تم توجيه الرسالة للموظف');
    if (selectedMessage?.id === messageId) {
      setSelectedMessage({ ...selectedMessage, assigned_to: staffId, status: 'assigned' });
    }
    loadCRMData();
  };

  const handleConvertSocialToLead = async (msg?: any) => {
    const message = msg || selectedMessage;
    if (!message) return;
    const { data, error } = await supabase.from('crm_leads').insert({
      restaurant_id: restaurantId,
      name: message.sender_name || 'عميل من السوشيال',
      phone: null,
      source: message.platform || 'social',
      stage: 'new',
      notes: message.message_content || '',
      estimated_value: 0,
      source_details: {
        social_message_id: message.id,
        platform: message.platform,
        sender_external_id: message.sender_external_id,
      },
    }).select().single();
    if (error) return toast.error('فشل تحويل الرسالة لعميل محتمل: ' + error.message);
    await supabase.from('crm_social_messages').update({ status: 'converted' }).eq('id', message.id);
    toast.success('تم تحويل الرسالة إلى فرصة مبيعات');
    setSelectedMessage({ ...message, status: 'converted' });
    setActiveTab('leads');
    if (data) setLeads(prev => [data, ...prev]);
    loadCRMData();
  };

  const handleMarkMessageRead = async (messageId: string) => {
    await supabase.from('crm_social_messages').update({ status: 'read' }).eq('id', messageId).eq('status', 'unread');
  };

  const handleSocialReply = async () => {
    if (!selectedMessage) return;
    if (!replyText.trim()) return toast.error('اكتب الرد أولاً');
    await handleAddCommunicationLog({
      type: 'social',
      summary: `رد على ${selectedMessage.sender_name}: ${replyText.trim().slice(0, 120)}`,
      details: replyText.trim(),
      contact_date: new Date().toISOString(),
    });
    if (selectedMessage.status === 'unread') {
      await supabase.from('crm_social_messages').update({ status: 'read' }).eq('id', selectedMessage.id);
      setSelectedMessage({ ...selectedMessage, status: 'read' });
    }
    setReplyText('');
    toast.success('تم تسجيل الرد (أرسل الرد فعلياً من المنصة المرتبطة)');
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return toast.error('أدخل عنوان المهمة');
    const { error } = await supabase.from('crm_tasks').insert({
      restaurant_id: restaurantId,
      title: newTask.title.trim(),
      description: newTask.description || null,
      due_date: newTask.due_date || null,
      priority: newTask.priority || 'medium',
      status: 'pending',
      lead_id: newTask.lead_id || null,
    });
    if (error) return toast.error('فشل إضافة المهمة: ' + error.message);
    toast.success('تمت إضافة المهمة');
    setNewTask({ title: '', description: '', due_date: '', priority: 'medium', lead_id: '' });
    setShowAddTask(false);
    loadCRMData();
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    const { error } = await supabase.from('crm_tasks').update({ status }).eq('id', taskId);
    if (error) return toast.error('فشل تحديث المهمة');
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('crm_tasks').delete().eq('id', taskId);
    if (error) return toast.error('فشل حذف المهمة');
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success('تم حذف المهمة');
  };

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(l =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(q) ||
      (l.source || '').toLowerCase().includes(q)
    );
  }, [leads, leadSearch]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    let list = customers;
    if (q) {
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      );
    }
    if (loyaltyFilter !== 'all') {
      list = list.filter(c => (c.loyalty_tier || 'bronze') === loyaltyFilter);
    }
    return list;
  }, [customers, customerSearch, loyaltyFilter]);

  const loyaltyStats = useMemo(() => {
    const tiers = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    let totalPoints = 0;
    for (const c of customers) {
      const tier = (c.loyalty_tier || 'bronze') as keyof typeof tiers;
      if (tiers[tier] !== undefined) tiers[tier] += 1;
      totalPoints += Number(c.loyalty_points) || 0;
    }
    return { ...tiers, totalPoints, vip: tiers.gold + tiers.platinum };
  }, [customers]);

  const crmMetrics = useMemo(() => {
    const total = leads.length || 1;
    const won = leads.filter(l => l.stage === 'won').length;
    const lost = leads.filter(l => l.stage === 'lost').length;
    const pipeline = leads.filter(l => !['won', 'lost'].includes(l.stage)).length;
    const conversion = Math.round((won / total) * 100);
    const avgScore = Math.round(
      leads.reduce((s, l) => s + (Number(l.ai_score) || (l.stage === 'won' ? 90 : l.stage === 'negotiation' ? 70 : 45)), 0) / total
    );
    const inactive = customers.filter(c => {
      if (!c.last_order_date) return true;
      const days = (Date.now() - new Date(c.last_order_date).getTime()) / (1000 * 60 * 60 * 24);
      return days > 30;
    }).length;
    const churn = customers.length ? Math.round((inactive / customers.length) * 100) : 0;
    return { won, lost, pipeline, conversion, avgScore, churn, inactive };
  }, [leads, customers]);

  const handleSocialConnect = (platform: string) => {
    toast.info(`سيتم توجيهك الآن لربط حساب ${platform}`);
    // Mock integration
    setTimeout(async () => {
      const { error } = await supabase.from('crm_social_accounts').insert({
        restaurant_id: restaurantId,
        platform,
        account_name: `Auditry ${platform} Page`,
        is_active: true
      });
      if (!error) {
        toast.success(`تم ربط ${platform} بنجاح`);
        loadCRMData();
      }
    }, 1500);
  };

  const handleAddCommunicationLog = async (data: any) => {
    const { error } = await supabase.from('crm_communication_logs').insert({
      restaurant_id: restaurantId,
      ...data
    });
    if (error) return toast.error('فشل حفظ السجل');
    toast.success('تم تسجيل التواصل بنجاح');
    loadCRMData();
  };

  const loadCustomerFinancials = async (customer: any) => {
    try {
      setLoading(true);
      // 1. Fetch Transactions
      const transactionsPromise = supabase
        .from('customer_transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      // 2. Fetch Orders (Recent activity)
      const ordersPromise = supabase
        .from('orders')
        .select('id, order_number, total, created_at, status')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // 3. Fetch Purchased Items (Detailed report)
      const itemsPromise = supabase
        .from('order_items')
        .select(`
          id,
          menu_item_name,
          quantity,
          price,
          line_total,
          orders!inner(customer_id)
        `)
        .eq('orders.customer_id', customer.id)
        .limit(100);

      const [txRes, ordersRes, itemsRes] = await Promise.all([
        transactionsPromise,
        ordersPromise,
        itemsPromise
      ]);
      
      setCustomerTransactions(txRes.data || []);
      setCustomerOrders(ordersRes.data || []);
      
      // Group items to see purchase frequency per product
      const productMap = new Map();
      (itemsRes.data || []).forEach((item: any) => {
        const name = item.menu_item_name || 'صنف';
        const lineTotal = Number(item.line_total) || (Number(item.price) || 0) * (Number(item.quantity) || 0);
        const existing = productMap.get(name) || { name, qty: 0, total: 0, count: 0 };
        productMap.set(name, {
          name,
          qty: existing.qty + (item.quantity || 0),
          total: existing.total + lineTotal,
          count: existing.count + 1
        });
      });
      setCustomerProducts(Array.from(productMap.values()).sort((a, b) => b.qty - a.qty));

      setSelectedCustomer(customer);
      setShowCustomerDetails(true);
    } catch (err) {
      console.error(err);
      toast.error('فشل تحميل البيانات التفصيلية للعميل');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async () => {
    if (!newLead.name) return toast.error('الرجاء إدخال اسم العميل');
    const { error } = await supabase.from('crm_leads').insert({
      restaurant_id: restaurantId,
      name: newLead.name,
      phone: newLead.phone || null,
      estimated_value: Number(newLead.estimated_value) || 0,
      source: newLead.source || 'manual',
      stage: 'new'
    });
    if (error) { toast.error('حدث خطأ: ' + error.message); return; }
    toast.success('تم إضافة العميل المحتمل بنجاح');
    setNewLead({ name: '', phone: '', estimated_value: '', source: 'manual' });
    setShowAddLead(false);
    loadCRMData();
  };

  const handleAddWarning = async () => {
    if (!selectedCustomer || !warningReason.trim()) {
      toast.error('يرجى إدخال سبب التحذير');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('add_customer_warning', {
        p_customer_id: selectedCustomer.id,
        p_reason: warningReason,
        p_user_id: user?.id || null
      });

      if (error) throw error;

      toast.success('تم إضافة علامة تحذيرية');
      setWarningReason('');
      loadCRMData();
      
      // Update selected customer
      if (selectedCustomer) {
        selectedCustomer.warning_flags = (selectedCustomer.warning_flags || 0) + 1;
        selectedCustomer.risk_level = selectedCustomer.warning_flags >= 3 ? 'high' : selectedCustomer.warning_flags >= 2 ? 'medium' : 'normal';
      }
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    }
  };

  const handleRemoveWarning = async () => {
    if (!selectedCustomer) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('remove_customer_warning', {
        p_customer_id: selectedCustomer.id,
        p_reason: 'إزالة يدوية',
        p_user_id: user?.id || null
      });

      if (error) throw error;

      toast.success('تم إزالة علامة تحذيرية');
      loadCRMData();
      
      // Update selected customer
      if (selectedCustomer) {
        selectedCustomer.warning_flags = Math.max((selectedCustomer.warning_flags || 0) - 1, 0);
        selectedCustomer.risk_level = selectedCustomer.warning_flags >= 3 ? 'high' : selectedCustomer.warning_flags >= 2 ? 'medium' : 'normal';
      }
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    }
  };

  const loadWarningHistory = async (customerId: string) => {
    const { data } = await supabase
      .from('customer_warning_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setWarningHistory(data || []);
  };

  const updateLeadStage = async (id: string, stage: LeadStage) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('crm_leads').update({ 
      stage,
      last_contact_date: now,
      updated_at: now,
    }).eq('id', id);
    
    if (error) {
      toast.error('فشل تحديث المرحلة: ' + error.message);
      return;
    }
    setLeads(leads.map(l => l.id === id ? { ...l, stage, last_contact_date: now } : l));
    toast.success('تم تحديث مرحلة العميل');
    handleAddCommunicationLog({
      lead_id: id,
      type: 'status_update',
      summary: `تغيير مرحلة العميل إلى: ${stage}`,
      contact_date: now
    });
  };

  const renderKanbanBoard = () => {
    const stages: { id: LeadStage; label: string; color: string }[] = [
      { id: 'new', label: 'جديد', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      { id: 'contacted', label: 'تم التواصل', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      { id: 'negotiation', label: 'مرحلة التفاوض', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
      { id: 'won', label: 'تم الإغلاق بنجاح', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      { id: 'lost', label: 'خسارة الفرصة', color: 'bg-destructive/10 text-destructive border-destructive/20' }
    ];

    return (
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {stages.map(stage => (
          <div key={stage.id} className="flex-1 min-w-[300px] bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3">
            <div className={`px-3 py-2 rounded-xl text-sm font-bold border ${stage.color} flex justify-between items-center`}>
              <span>{stage.label}</span>
              <Badge variant="outline">{filteredLeads.filter(l => l.stage === stage.id).length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {filteredLeads.filter(l => l.stage === stage.id).map(lead => (
                <div key={lead.id} className="glass-card p-4 hover:shadow-lg transition-all border-l-4 relative group" style={{borderLeftColor: 'currentColor'}}>
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Select onValueChange={(val) => handleAssignLead(lead.id, val)}>
                      <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent">
                        <UserPlus className="w-3 h-3 text-muted-foreground" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <h4 className="font-bold text-sm mb-1">{lead.name}</h4>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone || 'لا يوجد'}</p>
                    {lead.last_contact_date ? (
                      <div className="flex items-center gap-1 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5" />
                        <span>تم التواصل</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>لم يتم التواصل</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {(lead.source || lead.platform) && (
                      <Badge className="text-[8px] h-3.5 bg-primary/10 text-primary border-0 capitalize">{lead.source || lead.platform}</Badge>
                    )}
                  </div>
                  
                  {lead.assigned_to && (
                    <div className="flex items-center gap-1 mb-3 text-[10px] text-primary bg-primary/5 p-1 rounded">
                      <UserCheck className="w-3 h-3" />
                      <span>مسؤول: {staff.find(s => s.id === lead.assigned_to)?.name || 'موظف'}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="font-bold text-emerald-500 text-sm">{(lead.estimated_value || 0).toLocaleString()} {currency}</span>
                    <div className="flex gap-1 items-center">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                        const summary = prompt('سجل تفاصيل التواصل:');
                        if (summary) handleAddCommunicationLog({ lead_id: lead.id, type: 'call', summary, contact_date: new Date().toISOString() });
                      }}>
                        <Phone className="w-3 h-3 text-primary" />
                      </Button>
                      <Select value={lead.stage} onValueChange={(val) => updateLeadStage(lead.id, val as LeadStage)}>
                        <SelectTrigger className="h-6 text-[10px] w-[88px] px-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              {filteredLeads.filter(l => l.stage === stage.id).length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl opacity-50">لا توجد فرص في هذه المرحلة</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSocialIntegration = () => {
    const platforms = [
      { id: 'meta', name: 'Meta (FB/IG)', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
      { id: 'google', name: 'Google Ads', icon: Search, color: 'text-red-600', bg: 'bg-red-50' },
      { id: 'tiktok', name: 'TikTok', icon: MessageCircle, color: 'text-black', bg: 'bg-slate-50' },
      { id: 'linkedin', name: 'LinkedIn', icon: Share2, color: 'text-blue-700', bg: 'bg-blue-50' },
      { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    ];

    return (
      <div className="space-y-8 fade-in">
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black">مركز الربط المباشر</h2>
            <p className="text-muted-foreground">استقبل الليدز الفعلية من جميع المنصات وقم بتوزيعها آلياً على فريقك.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {platforms.map(p => {
            const isConnected = platformConfigs.some(c => c.platform === p.id && c.is_active);
            return (
              <Card key={p.id} className={`p-6 border-2 transition-all ${isConnected ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border hover:border-primary/20'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${p.bg} ${p.color}`}>
                    <p.icon className="w-6 h-6" />
                  </div>
                  <Badge variant={isConnected ? 'default' : 'outline'} className={isConnected ? 'bg-emerald-500' : ''}>
                    {isConnected ? 'متصل' : 'غير نشط'}
                  </Badge>
                </div>
                <h3 className="font-bold mb-1">{p.name}</h3>
                <p className="text-[10px] text-muted-foreground mb-4">استقبال الليدز والرسائل المباشرة آلياً.</p>
                <Button 
                  onClick={() => setShowPlatformSetup(p.id)} 
                  variant={isConnected ? 'outline' : 'default'} 
                  className="w-full text-xs h-9"
                >
                  {isConnected ? 'تعديل الإعدادات' : 'ربط المنصة الآن'}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Unified Social Inbox */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[500px]">
           <div className="glass-card flex flex-col overflow-hidden">
             <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
               <h3 className="font-bold text-sm">صندوق الوارد (الرسائل والليدز)</h3>
               <Badge variant="secondary">{socialMessages.length}</Badge>
             </div>
             <div className="flex-1 overflow-y-auto divide-y divide-border/30">
               {socialMessages.map(msg => (
                 <div 
                   key={msg.id} 
                   onClick={() => {
                     setSelectedMessage(msg);
                     if (msg.status === 'unread') handleMarkMessageRead(msg.id);
                   }}
                   className={`p-4 cursor-pointer hover:bg-primary/5 transition-all ${selectedMessage?.id === msg.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}
                 >
                   <div className="flex justify-between items-start mb-1">
                     <span className="font-bold text-xs">{msg.sender_name}</span>
                     <span className="text-[9px] text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString('ar-EG')}</span>
                   </div>
                   <p className="text-[10px] text-muted-foreground truncate">{msg.message_content}</p>
                   <div className="flex gap-1 mt-2">
                     <Badge className="text-[8px] h-3.5 bg-primary/10 text-primary border-0 capitalize">{msg.platform}</Badge>
                     {msg.status === 'unread' && <Badge className="text-[8px] h-3.5 bg-red-500 text-white border-0">جديد</Badge>}
                   </div>
                 </div>
               ))}
               {socialMessages.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30 p-8 text-center">
                   <Share2 className="w-12 h-12" />
                   <p className="text-xs mt-2">لا توجد رسائل واردة حالياً</p>
                 </div>
               )}
             </div>
           </div>

           <div className="lg:col-span-2 glass-card flex flex-col overflow-hidden">
              {selectedMessage ? (
                <>
                  <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{selectedMessage.sender_name?.[0]}</div>
                      <div>
                        <h3 className="font-bold text-sm">{selectedMessage.sender_name}</h3>
                        <Badge variant="outline" className="text-[8px]">{selectedMessage.platform}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <Button
                         size="sm"
                         variant="outline"
                         className="h-8 text-[10px] gap-1"
                         disabled={selectedMessage.status === 'converted'}
                         onClick={() => handleConvertSocialToLead(selectedMessage)}
                       >
                         <UserPlus className="w-3 h-3" />
                         {selectedMessage.status === 'converted' ? 'تم التحويل' : 'تحويل لعميل محتمل'}
                       </Button>
                       <Select onValueChange={(val) => handleAssignSocialMessage(selectedMessage.id, val)}>
                          <SelectTrigger className="h-8 text-[10px] w-32">
                             <SelectValue placeholder="توجيه لموظف" />
                          </SelectTrigger>
                          <SelectContent>
                             {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                  </div>
                  <div className="flex-1 p-6 bg-secondary/5 overflow-y-auto">
                     <div className="bg-card p-4 rounded-2xl rounded-tr-none border shadow-sm max-w-[80%]">
                        <p className="text-sm">{selectedMessage.message_content}</p>
                        <span className="text-[9px] text-muted-foreground mt-2 block">{new Date(selectedMessage.created_at).toLocaleString('ar-EG')}</span>
                     </div>
                  </div>
                  <div className="p-4 border-t bg-card">
                     <div className="flex gap-2">
                        <Input
                          placeholder="رد سريع... (يُسجَّل في سجل التواصل)"
                          className="h-9 text-xs"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSocialReply(); }}
                        />
                        <Button className="h-9 text-xs gap-2" onClick={handleSocialReply}>
                          <Send className="w-3 h-3" /> إرسال
                        </Button>
                     </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-20">
                   <MessageSquare className="w-16 h-16" />
                   <p className="text-sm mt-4">اختر محادثة للبدء في المعالجة والتوجيه</p>
                </div>
              )}
           </div>
        </div>

        {/* Webhook Settings Dialog */}
        <Dialog open={!!showPlatformSetup} onOpenChange={() => setShowPlatformSetup(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                إعداد ربط {showPlatformSetup}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold">API Key / Access Token</label>
                <Input 
                  type="password" 
                  placeholder="أدخل مفتاح الربط..." 
                  value={configData.api_key} 
                  onChange={e => setConfigData({...configData, api_key: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold">Webhook Verify Token</label>
                <Input 
                  placeholder="token-for-verification" 
                  value={configData.webhook_verify_token} 
                  onChange={e => setConfigData({...configData, webhook_verify_token: e.target.value})} 
                />
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 space-y-2">
                <p className="text-[10px] text-blue-700 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> رابط Webhook الخاص بك:</p>
                <code className="text-[9px] block bg-white p-2 rounded border break-all">
                  {`https://lovable-auditry.supabase.co/functions/v1/crm-social-webhooks?platform=${showPlatformSetup}&restaurant_id=${restaurantId}`}
                </code>
                <p className="text-[9px] text-blue-600 italic">قم بنسخ هذا الرابط ووضعه في إعدادات المطورين بالمنصة (Meta/Google/TikTok).</p>
              </div>
              <Button onClick={handleSaveConfig} className="w-full gradient-bg border-0 text-white font-bold">تفعيل الربط المباشر</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderInsights = () => {
    const recommendations = [
      crmMetrics.inactive > 0
        ? { title: 'عملاء خاملون', desc: `هناك ${crmMetrics.inactive} عميل لم يطلب منذ أكثر من 30 يوماً. نوصي بحملة تفعيل.`, impact: 'High' }
        : { title: 'قاعدة العملاء نشطة', desc: 'معظم عملائك طلبوا خلال آخر 30 يوماً — حافظ على التواصل.', impact: 'Low' },
      crmMetrics.pipeline > 0
        ? { title: 'فرص في المسار', desc: `${crmMetrics.pipeline} فرصة مفتوحة بقيمة تقديرية تحتاج متابعة.`, impact: 'Medium' }
        : { title: 'أضف فرصاً جديدة', desc: 'لا توجد فرص مفتوحة حالياً. حوّل رسائل السوشيال أو أضف يدويات.', impact: 'Medium' },
      {
        title: 'معدل الإغلاق',
        desc: `نسبة الفوز الحالية ${crmMetrics.conversion}% (${crmMetrics.won} مغلقة / ${leads.length} إجمالي).`,
        impact: crmMetrics.conversion >= 30 ? 'Low' : 'High',
      },
    ];

    return (
      <div className="space-y-8 fade-in">
        <header>
          <h2 className="text-2xl font-black flex items-center gap-2"><BrainCircuit className="w-7 h-7 text-primary" /> مركز ذكاء Auditry</h2>
          <p className="text-muted-foreground">مؤشرات حقيقية من بيانات العملاء والفرص في نشاطك.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <Card className="p-6 border-primary/20 bg-primary/5">
              <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">جودة الفرص</h4>
              <div className="flex items-end gap-2">
                 <h3 className="text-3xl font-black">{crmMetrics.avgScore}%</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">متوسط تقييم الفرص حسب المرحلة والإنفاق المتوقع</p>
           </Card>
           <Card className="p-6 border-purple-500/20 bg-purple-500/5">
              <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">احتمال الخمول</h4>
              <div className="flex items-end gap-2">
                 <h3 className="text-3xl font-black text-purple-600">{crmMetrics.churn}%</h3>
                 <Badge className="bg-blue-500 text-white border-0 mb-1">{crmMetrics.churn < 20 ? 'منخفض' : 'مرتفع'}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{crmMetrics.inactive} عميل بدون طلب حديث</p>
           </Card>
           <Card className="p-6 border-amber-500/20 bg-amber-500/5">
              <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">معدل الفوز</h4>
              <h3 className="text-3xl font-black text-amber-600">{crmMetrics.conversion}%</h3>
              <p className="text-[10px] text-muted-foreground mt-2">{crmMetrics.won} صفقة مغلقة بنجاح من {leads.length}</p>
           </Card>
           <Card className="p-6 border-blue-500/20 bg-blue-500/5">
              <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">المسار المفتوح</h4>
              <div className="flex items-center gap-2">
                 <h3 className="text-3xl font-black">{crmMetrics.pipeline}</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">فرص قيد المتابعة الآن</p>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 glass-card p-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> توصيات لنشاطك ({businessType})</h3>
              <div className="space-y-4">
                 {recommendations.map((rec, i) => (
                   <div key={i} className="p-4 rounded-2xl bg-secondary/40 border border-border/50 flex justify-between items-center group hover:border-primary/30 transition-all">
                      <div className="flex gap-4">
                         <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5" />
                         </div>
                         <div>
                            <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{rec.title}</h4>
                            <p className="text-xs text-muted-foreground">{rec.desc}</p>
                         </div>
                      </div>
                      <Badge className={rec.impact === 'High' ? 'bg-red-500/10 text-red-600' : rec.impact === 'Medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}>{rec.impact}</Badge>
                   </div>
                 ))}
              </div>
           </div>

           <div className="glass-card p-6 space-y-4">
              <h3 className="font-bold">ملخص سريع</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">العملاء</span><span className="font-bold">{customers.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الفرص</span><span className="font-bold">{leads.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المهام المفتوحة</span><span className="font-bold">{tasks.filter(t => t.status !== 'completed' && t.status !== 'done').length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">رسائل غير مقروءة</span><span className="font-bold">{socialMessages.filter(m => m.status === 'unread').length}</span></div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => setActiveTab('tasks')}>افتح المهام</Button>
           </div>
        </div>
      </div>
    );
  };

  const renderCommunications = () => {
    return (
      <div className="space-y-6 fade-in">
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black">سجل التواصل الذكي</h2>
            <p className="text-muted-foreground">أرشفة كاملة لكل التفاعلات مع تحليل تلقائي للمشاعر (Sentiment Analysis).</p>
          </div>
          <Button onClick={() => loadCRMData()} variant="outline" className="gap-2"><History className="w-4 h-4" /> تحديث السجل</Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           <div className="lg:col-span-1 space-y-4">
              <Card className="p-4 border-primary/10 bg-primary/5">
                 <h4 className="text-xs font-bold uppercase mb-4 text-primary">تحليل المشاعر العام</h4>
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                       <span className="flex items-center gap-1"><Smile className="w-3 h-3 text-emerald-500" /> إيجابي</span>
                       <span className="font-bold">65%</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500" style={{width: '65%'}}></div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="flex items-center gap-1"><Frown className="w-3 h-3 text-red-500" /> سلبي</span>
                       <span className="font-bold">12%</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                       <div className="h-full bg-red-500" style={{width: '12%'}}></div>
                    </div>
                 </div>
              </Card>

              <div className="glass-card p-4 space-y-3">
                 <h4 className="text-xs font-bold uppercase mb-2">فلترة السجلات</h4>
                 <Button variant="ghost" className="w-full justify-start text-xs h-9 gap-2 bg-primary/5"><Phone className="w-3 h-3" /> مكالمات هاتفية</Button>
                 <Button variant="ghost" className="w-full justify-start text-xs h-9 gap-2"><Mail className="w-3 h-3" /> بريد إلكتروني</Button>
                 <Button variant="ghost" className="w-full justify-start text-xs h-9 gap-2"><MessageSquare className="w-3 h-3" /> رسائل اجتماعية</Button>
              </div>
           </div>

           <div className="lg:col-span-3 glass-card overflow-hidden">
              <table className="w-full text-right text-sm">
                 <thead className="bg-muted/50 border-b">
                    <tr>
                       <th className="p-4">التاريخ</th>
                       <th className="p-4">العميل / Lead</th>
                       <th className="p-4">البيان</th>
                       <th className="p-4">المشاعر (AI)</th>
                       <th className="p-4">إجراءات</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border/30">
                    {logs.map(log => (
                       <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-4 text-xs text-muted-foreground">{new Date(log.contact_date).toLocaleString('ar-EG')}</td>
                          <td className="p-4">
                             <div className="font-bold">
                               {log.lead_id
                                 ? (leads.find(l => l.id === log.lead_id)?.name || 'فرصة')
                                 : log.customer_id
                                   ? (customers.find(c => c.id === log.customer_id)?.name || 'عميل')
                                   : 'سجل عام'}
                             </div>
                             <div className="text-[10px] text-muted-foreground">{log.type}</div>
                          </td>
                          <td className="p-4">
                             <p className="font-medium line-clamp-1">{log.summary}</p>
                          </td>
                          <td className="p-4">
                             <div className="flex items-center gap-2">
                                {log.sentiment === 'positive' ? <Smile className="w-4 h-4 text-emerald-500" /> : log.sentiment === 'negative' ? <Frown className="w-4 h-4 text-red-500" /> : <Activity className="w-4 h-4 text-blue-500" />}
                                <span className="text-xs capitalize">{log.sentiment || 'Neutral'}</span>
                             </div>
                          </td>
                          <td className="p-4">
                             <Button variant="ghost" size="sm" className="h-8">عرض التفاصيل</Button>
                          </td>
                       </tr>
                    ))}
                    {logs.length === 0 && (
                       <tr>
                          <td colSpan={5} className="p-12 text-center text-muted-foreground italic">لا توجد سجلات تواصل حالياً</td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-background overflow-hidden" dir="rtl">
      {/* CRM Sidebar Navigation */}
      <div className="w-64 border-l bg-card/30 backdrop-blur-md p-4 flex flex-col shrink-0 gap-2">
         <div className="flex items-center gap-2 px-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
               <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-black text-primary tracking-tight">Auditry CRM Global</h3>
         </div>
         
         {[
           { id: 'overview', label: 'لوحة التحكم', icon: Target },
           { id: 'leads', label: 'مسار المبيعات', icon: Columns },
           { id: 'social', label: 'التواصل الاجتماعي', icon: Share2 },
           { id: 'customers', label: 'قاعدة العملاء', icon: Users },
           { id: 'suppliers', label: 'الموردين', icon: Truck },
           { id: 'loyalty', label: 'برامج الولاء', icon: Heart },
           { id: 'communications', label: 'سجل التواصل', icon: MessageSquare },
           { id: 'insights', label: 'مركز ذكاء AI', icon: Sparkles },
           { id: 'tasks', label: 'المهام والمتابعة', icon: Clock },
         ].map(item => (
           <button
             key={item.id}
             onClick={() => setActiveTab(item.id as TabType)}
             className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
               activeTab === item.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/5 text-muted-foreground'
             }`}
           >
             <item.icon className="w-4 h-4" /> {item.label}
           </button>
         ))}

         <div className="mt-auto p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
               <Sparkles className="w-4 h-4 text-primary" />
               <span className="text-[10px] font-bold text-primary uppercase">Business Mode</span>
            </div>
            <p className="text-xs font-bold capitalize">{businessType.replace('_', ' ')}</p>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
        {activeTab === 'overview' && (
          <div className="space-y-8 fade-in">
            <header className="flex justify-between items-start">
               <div>
                  <h2 className="text-3xl font-black tracking-tight">مرحباً بك في مركز النمو</h2>
                  <p className="text-muted-foreground">نظرة عامة على أداء مبيعاتك وعلاقاتك مع العملاء.</p>
               </div>
               <div className="flex gap-2">
                  <Button variant="outline" className="gap-2"><Calendar className="w-4 h-4" /> آخر 30 يوم</Button>
                  <Button className="gradient-bg border-0 text-white gap-2"><Download className="w-4 h-4" /> تقرير النمو</Button>
               </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary"><Users className="w-5 h-5" /></div>
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20">+12%</Badge>
                   </div>
                   <p className="text-xs font-bold text-muted-foreground uppercase">إجمالي العملاء</p>
                   <h3 className="text-3xl font-black mt-1">{customers.length}</h3>
                </div>
                <div className="glass-card p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp className="w-5 h-5" /></div>
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20">نشط</Badge>
                   </div>
                   <p className="text-xs font-bold text-muted-foreground uppercase">قيمة الـ Pipeline</p>
                   <h3 className="text-3xl font-black mt-1">{leads.filter(l=>l.stage !== 'lost' && l.stage !== 'won').reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
                </div>
                <div className="glass-card p-6 border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-2 rounded-lg bg-red-500/10 text-red-500"><Wallet className="w-5 h-5" /></div>
                      <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/20">ذمم مدينة</Badge>
                   </div>
                   <p className="text-xs font-bold text-muted-foreground uppercase">إجمالي المديونيات</p>
                   <h3 className="text-3xl font-black mt-1 text-red-500">{customers.reduce((sum, c) => sum + (c.balance || 0), 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
                </div>
                <div className="glass-card p-6 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500"><Star className="w-5 h-5" /></div>
                      <Badge variant="outline" className="text-[10px] text-purple-500 border-purple-500/20">Loyalty</Badge>
                   </div>
                   <p className="text-xs font-bold text-muted-foreground uppercase">نقاط الولاء النشطة</p>
                   <h3 className="text-3xl font-black mt-1">{customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0).toLocaleString()}</h3>
                </div>
             </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="glass-card p-6 space-y-4 lg:col-span-2">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> تحليل أداء المبيعات والعملاء</h3>
                    <Tabs defaultValue="leads" className="w-[300px]">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="leads">العملاء المحتملين</TabsTrigger>
                        <TabsTrigger value="sales">المبيعات الفعلية</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'يناير', leads: 40, won: 24 },
                        { name: 'فبراير', leads: 30, won: 13 },
                        { name: 'مارس', leads: 20, won: 98 },
                        { name: 'أبريل', leads: 27, won: 39 },
                        { name: 'مايو', leads: 18, won: 48 },
                        { name: 'يونيو', leads: 23, won: 38 },
                      ]}>
                        <defs>
                          <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                        <Area type="monotone" dataKey="leads" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="glass-card p-6 flex flex-col justify-center items-center text-center space-y-4 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Target className="w-10 h-10" />
                  </div>
                  <div>
                     <h3 className="text-xl font-bold mb-2">فرص مبيعات جديدة</h3>
                     <p className="text-sm text-muted-foreground max-w-sm mx-auto">هناك {leads.filter(l=>l.stage==='new').length} عملاء بانتظار التواصل الأول.</p>
                  </div>
                  <Button onClick={() => setActiveTab('leads')} className="gradient-bg border-0 text-white gap-2 w-full h-12 text-lg font-bold">
                     إدارة المسار <ArrowRight className="w-5 h-5" />
                  </Button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="glass-card p-6 space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Share2 className="w-5 h-5 text-blue-500" /> التواصل الاجتماعي</h3>
                  <div className="space-y-3">
                     {socialMessages.slice(0, 3).map(msg => (
                        <div key={msg.id} className="p-3 rounded-xl bg-secondary/30 border border-border/20 flex gap-3 items-center">
                           <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                              <Facebook className="w-4 h-4" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate">{msg.sender_name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{msg.message_content}</p>
                           </div>
                        </div>
                     ))}
                     {socialMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد رسائل اجتماعية حالياً</p>}
                     <Button variant="ghost" className="w-full text-xs h-8 text-primary" onClick={() => setActiveTab('social')}>عرض الكل</Button>
                  </div>
               </div>
               
               <div className="glass-card p-6 space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" /> متابعات معلقة</h3>
                  <div className="space-y-3">
                     {tasks.filter(t => t.status !== 'completed').slice(0, 3).map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/20 group">
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                              <div>
                                 <p className="font-bold text-xs">{task.title}</p>
                                 <p className="text-[10px] text-muted-foreground">{new Date(task.due_date).toLocaleDateString('ar-EG')}</p>
                              </div>
                           </div>
                        </div>
                     ))}
                     {tasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد مهام حالياً</p>}
                     <Button variant="ghost" className="w-full text-xs h-8 text-primary" onClick={() => setActiveTab('tasks')}>إدارة المهام</Button>
                  </div>
               </div>

               <div className="glass-card p-6 space-y-4 bg-primary/5 border-primary/10">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-primary"><Sparkles className="w-5 h-5" /> لمحة ذكية</h3>
                  <div className="space-y-3">
                     <div className="p-3 rounded-xl bg-white/50 border border-primary/10">
                        <p className="text-xs leading-relaxed text-primary">
                          <strong>لمحة:</strong> معدل إغلاق الفرص {crmMetrics.conversion}% · {crmMetrics.inactive} عميل خامل · {socialMessages.filter(m => m.status === 'unread').length} رسالة غير مقروءة.
                        </p>
                     </div>
                     <Button className="w-full text-xs h-8 bg-primary text-white" onClick={() => setActiveTab('insights')}>مركز الذكاء الكامل</Button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="h-full flex flex-col space-y-6 fade-in">
            <div className="flex items-center justify-between shrink-0">
               <div>
                  <h2 className="text-2xl font-black flex items-center gap-2"><Columns className="w-6 h-6 text-primary" /> إدارة مسار المبيعات</h2>
                  <p className="text-sm text-muted-foreground">تتبع العملاء المحتملين من أول اتصال حتى إغلاق الصفقة.</p>
               </div>
               <div className="flex gap-2 flex-wrap justify-end">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو الهاتف..."
                      className="h-9 w-48 pr-8 text-xs"
                      value={leadSearch}
                      onChange={e => setLeadSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
                    <Button 
                      variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      onClick={() => setViewMode('kanban')}
                      className="gap-2 h-8"
                    >
                      <Columns className="w-4 h-4" /> كانبان
                    </Button>
                    <Button 
                      variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      onClick={() => setViewMode('table')}
                      className="gap-2 h-8"
                    >
                      <List className="w-4 h-4" /> جدول
                    </Button>
                  </div>
                  <Button onClick={() => setShowAddLead(true)} className="gradient-bg text-primary-foreground border-0 gap-2"><Plus className="w-4 h-4" /> فرصة جديدة</Button>
               </div>
            </div>

            {showAddLead && (
               <div className="glass-card p-6 shrink-0 fade-in border-primary/30">
                  <h3 className="font-bold mb-4">إضافة فرصة مبيعات جديدة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <Input placeholder="اسم العميل المحتمل" value={newLead.name} onChange={e=>setNewLead({...newLead, name: e.target.value})} />
                     <Input placeholder="رقم الهاتف" value={newLead.phone} onChange={e=>setNewLead({...newLead, phone: e.target.value})} />
                     <Input placeholder="القيمة المتوقعة" type="number" value={newLead.estimated_value} onChange={e=>setNewLead({...newLead, estimated_value: e.target.value})} />
                     <div className="flex gap-2">
                        <Button onClick={handleAddLead} className="flex-1 bg-primary text-white border-0">حفظ</Button>
                        <Button variant="ghost" onClick={() => setShowAddLead(false)}>إلغاء</Button>
                     </div>
                  </div>
               </div>
            )}

            <div className="flex-1 min-h-[400px]">
               {viewMode === 'kanban' ? renderKanbanBoard() : (
                 <div className="glass-card overflow-hidden">
                   <table className="w-full text-right text-sm">
                     <thead className="bg-muted/50 border-b">
                       <tr>
                         <th className="p-4">العميل المحتمل</th>
                         <th className="p-4">المرحلة</th>
                         <th className="p-4">القيمة</th>
                         <th className="p-4">المسؤول</th>
                         <th className="p-4">إجراءات</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border/30">
                       {filteredLeads.map(lead => (
                         <tr key={lead.id} className="hover:bg-muted/40 transition-colors">
                           <td className="p-4">
                             <div className="font-bold">{lead.name}</div>
                             <div className="text-[10px] text-muted-foreground">{lead.phone || 'بدون هاتف'}</div>
                           </td>
                           <td className="p-4">
                             <Select value={lead.stage} onValueChange={(val) => updateLeadStage(lead.id, val as LeadStage)}>
                               <SelectTrigger className="h-8 text-xs w-36">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="new">جديد</SelectItem>
                                 <SelectItem value="contacted">تم التواصل</SelectItem>
                                 <SelectItem value="negotiation">تفاوض</SelectItem>
                                 <SelectItem value="won">مغلق</SelectItem>
                                 <SelectItem value="lost">خسارة</SelectItem>
                               </SelectContent>
                             </Select>
                           </td>
                           <td className="p-4 font-bold text-primary">{(lead.estimated_value || 0).toLocaleString()} {currency}</td>
                           <td className="p-4">
                             <Select onValueChange={(val) => handleAssignLead(lead.id, val)} defaultValue={lead.assigned_to}>
                               <SelectTrigger className="h-8 text-xs w-32">
                                 <SelectValue placeholder="تعيين موظف" />
                               </SelectTrigger>
                               <SelectContent>
                                 {staff.map(s => (
                                   <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                           </td>
                           <td className="p-4">
                             <Button variant="ghost" size="sm" className="h-8" onClick={() => {
                               const summary = prompt('سجل تفاصيل التواصل:');
                               if (summary) handleAddCommunicationLog({ lead_id: lead.id, type: 'note', summary, contact_date: new Date().toISOString() });
                             }}>تواصل</Button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'social' && renderSocialIntegration()}
        {activeTab === 'insights' && renderInsights()}
        {activeTab === 'communications' && renderCommunications()}

        {activeTab === 'customers' && (
          <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
               <div>
                  <h2 className="text-2xl font-black">قاعدة العملاء الشاملة (Customer 360)</h2>
                  <p className="text-sm text-muted-foreground">إدارة مركزية لجميع بيانات وعمليات العملاء الفعليين.</p>
               </div>
            </div>

            <div className="flex gap-4 mb-6">
               <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pr-10 bg-card border-border/50"
                    placeholder="بحث بالاسم أو الهاتف..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                  />
               </div>
               <Select value={loyaltyFilter} onValueChange={(v: any) => setLoyaltyFilter(v)}>
                 <SelectTrigger className="w-40">
                   <SelectValue placeholder="المستوى" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">كل المستويات</SelectItem>
                   <SelectItem value="bronze">برونزي</SelectItem>
                   <SelectItem value="silver">فضي</SelectItem>
                   <SelectItem value="gold">ذهبي</SelectItem>
                   <SelectItem value="platinum">بلاتيني</SelectItem>
                 </SelectContent>
               </Select>
            </div>

            <div className="glass-card overflow-hidden shadow-2xl">
               <table className="w-full text-right text-sm">
                  <thead className="bg-muted/50 border-b">
                     <tr>
                        <th className="p-4">العميل</th>
                        <th className="p-4">المستوى</th>
                        <th className="p-4">إجمالي المشتريات</th>
                        <th className="p-4">الرصيد المالي</th>
                        <th className="p-4">نقاط الولاء</th>
                        <th className="p-4">إجراءات</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                      {filteredCustomers.map(c => (
                         <tr key={c.id} className="hover:bg-muted/40 transition-colors group">
                            <td className="p-4">
                               <div className="font-bold flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-inner">{c.name?.[0] || 'C'}</div>
                                  <div>
                                     {c.name}
                                     <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone || 'بدون هاتف'}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="p-4">
                               <Badge className={`border-0 rounded-full px-3 ${
                                 c.loyalty_tier === 'platinum' ? 'bg-purple-500/10 text-purple-600' :
                                 c.loyalty_tier === 'gold' ? 'bg-amber-500/10 text-amber-600' :
                                 c.loyalty_tier === 'silver' ? 'bg-slate-400/10 text-slate-500' :
                                 'bg-orange-500/10 text-orange-700'
                               }`}>
                                  {c.loyalty_tier === 'platinum' ? 'بلاتيني' : c.loyalty_tier === 'gold' ? 'ذهبي' : c.loyalty_tier === 'silver' ? 'فضي' : 'برونزي'}
                               </Badge>
                            </td>
                            <td className="p-4 font-bold text-emerald-500">{(c.total_spent || 0).toLocaleString()} {currency}</td>
                            <td className="p-4">
                               <div className="flex flex-col gap-1">
                                  <div className={`font-bold text-sm ${(c.balance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                     {(c.balance || 0).toLocaleString()} {currency}
                                  </div>
                                  {c.credit_limit && (
                                     <div className="text-[10px] text-muted-foreground">حد: {c.credit_limit.toLocaleString()}</div>
                                  )}
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex items-center gap-1 font-bold text-amber-500"><Star className="w-3 h-3 fill-current" /> {c.loyalty_points || 0}</div>
                            </td>
                            <td className="p-4">
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => loadCustomerFinancials(c)}>
                                     <FileText className="w-3 h-3 ml-1" /> تفاصيل
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 rounded-lg text-primary">
                                     <Plus className="w-3 h-3 ml-1" /> فاتورة
                                  </Button>
                               </div>
                            </td>
                         </tr>
                      ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
               <div>
                  <h2 className="text-2xl font-black">شبكة الشركاء والموردين (Partner Network)</h2>
                  <p className="text-sm text-muted-foreground">تحليل أداء الموردين وإدارة العلاقات التجارية الإستراتيجية.</p>
               </div>
               <Button className="bg-amber-500 hover:bg-amber-600 text-white gap-2"><Plus className="w-4 h-4" /> مورد جديد</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-amber-500/20 bg-amber-500/5">
                   <p className="text-xs font-bold text-amber-600 uppercase">إجمالي الموردين</p>
                   <h3 className="text-3xl font-black mt-1">{suppliers.length}</h3>
                </Card>
                <Card className="p-6 border-blue-500/20 bg-blue-500/5">
                   <p className="text-xs font-bold text-blue-600 uppercase">إجمالي المشتريات</p>
                   <h3 className="text-3xl font-black mt-1">{suppliers.reduce((sum, s) => sum + (Number(s.total_purchases) || 0), 0).toLocaleString()} <span className="text-sm font-normal">{currency}</span></h3>
                </Card>
                <Card className="p-6 border-red-500/20 bg-red-500/5">
                   <p className="text-xs font-bold text-red-600 uppercase">مستحقات للموردين</p>
                   <h3 className="text-3xl font-black mt-1 text-red-600">{suppliers.reduce((sum, s) => sum + (Number(s.balance) || 0), 0).toLocaleString()} <span className="text-sm font-normal">{currency}</span></h3>
                </Card>
            </div>

            <div className="glass-card overflow-hidden shadow-2xl">
               <table className="w-full text-right text-sm">
                  <thead className="bg-muted/50 border-b">
                     <tr>
                        <th className="p-4">المورد</th>
                        <th className="p-4">إجمالي التوريدات</th>
                        <th className="p-4">الرصيد المستحق</th>
                        <th className="p-4">الحالة</th>
                        <th className="p-4">إجراءات</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                      {suppliers.map(s => (
                         <tr key={s.id} className="hover:bg-muted/40 transition-colors group">
                            <td className="p-4">
                               <div className="font-bold flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm shadow-inner">{s.name?.[0] || 'S'}</div>
                                  <div>
                                     {s.name}
                                     <div className="text-[10px] text-muted-foreground">{s.phone || 'بدون هاتف'}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="p-4 font-bold">{(s.total_purchases || 0).toLocaleString()} {currency}</td>
                            <td className="p-4">
                               <div className={`font-bold ${(s.balance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {(s.balance || 0).toLocaleString()} {currency}
                               </div>
                            </td>
                            <td className="p-4">
                               <Badge variant="outline" className={s.balance > 0 ? 'text-amber-600 border-amber-200' : 'text-emerald-600 border-emerald-200'}>
                                  {s.balance > 0 ? 'مستحق سداد' : 'منتظم'}
                               </Badge>
                            </td>
                            <td className="p-4">
                               <Button variant="ghost" size="sm" className="h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="w-3 h-3 ml-1" /> التحليل
                               </Button>
                            </td>
                         </tr>
                      ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'loyalty' && (
           <div className="space-y-6 fade-in">
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black flex items-center gap-2"><Award className="w-6 h-6 text-amber-500" /> برامج الولاء</h2>
                  <p className="text-sm text-muted-foreground">المستويات تُحسب تلقائياً من إجمالي الإنفاق: برونزي حتى 5 آلاف، فضي، ذهبي، وبلاتيني من 50 ألف.</p>
                </div>
              </header>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4 border-orange-500/20 bg-orange-500/5"><p className="text-xs text-muted-foreground">برونزي</p><h3 className="text-2xl font-black">{loyaltyStats.bronze}</h3></Card>
                <Card className="p-4 border-slate-400/20 bg-slate-400/5"><p className="text-xs text-muted-foreground">فضي</p><h3 className="text-2xl font-black">{loyaltyStats.silver}</h3></Card>
                <Card className="p-4 border-amber-500/20 bg-amber-500/5"><p className="text-xs text-muted-foreground">ذهبي</p><h3 className="text-2xl font-black">{loyaltyStats.gold}</h3></Card>
                <Card className="p-4 border-purple-500/20 bg-purple-500/5"><p className="text-xs text-muted-foreground">بلاتيني</p><h3 className="text-2xl font-black">{loyaltyStats.platinum}</h3></Card>
                <Card className="p-4 border-primary/20 bg-primary/5"><p className="text-xs text-muted-foreground">إجمالي النقاط</p><h3 className="text-2xl font-black">{loyaltyStats.totalPoints.toLocaleString()}</h3></Card>
              </div>
              <div className="glass-card overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4">العميل</th>
                      <th className="p-4">المستوى</th>
                      <th className="p-4">الإنفاق</th>
                      <th className="p-4">النقاط</th>
                      <th className="p-4">آخر طلب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {[...customers].sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0)).slice(0, 50).map(c => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="p-4 font-bold">{c.name}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-[10px]">
                            {c.loyalty_tier === 'platinum' ? 'بلاتيني' : c.loyalty_tier === 'gold' ? 'ذهبي' : c.loyalty_tier === 'silver' ? 'فضي' : 'برونزي'}
                          </Badge>
                        </td>
                        <td className="p-4">{(c.total_spent || 0).toLocaleString()} {currency}</td>
                        <td className="p-4 text-amber-600 font-bold flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {c.loyalty_points || 0}</td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('ar-EG') : '—'}
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا يوجد عملاء بعد</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6 fade-in">
             <header className="flex justify-between items-end">
               <div>
                 <h2 className="text-3xl font-black">مدير المهام والمتابعة</h2>
                 <p className="text-muted-foreground">جدولة المتابعات مع العملاء المحتملين لضمان عدم ضياع أي فرصة.</p>
               </div>
               <Button className="gradient-bg border-0 text-white gap-2" onClick={() => setShowAddTask(true)}>
                 <Plus className="w-4 h-4" /> مهمة متابعة جديدة
               </Button>
             </header>

             {showAddTask && (
               <div className="glass-card p-6 border-primary/20 space-y-4">
                 <h3 className="font-bold">إضافة مهمة</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <Input placeholder="عنوان المهمة *" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                   <Input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} />
                   <Select value={newTask.priority} onValueChange={v => setNewTask({ ...newTask, priority: v })}>
                     <SelectTrigger><SelectValue placeholder="الأولوية" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="low">منخفضة</SelectItem>
                       <SelectItem value="medium">متوسطة</SelectItem>
                       <SelectItem value="high">عاجلة</SelectItem>
                     </SelectContent>
                   </Select>
                   <Select value={newTask.lead_id || 'none'} onValueChange={v => setNewTask({ ...newTask, lead_id: v === 'none' ? '' : v })}>
                     <SelectTrigger><SelectValue placeholder="ربط بفرصة (اختياري)" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none">بدون فرصة</SelectItem>
                       {leads.slice(0, 40).map(l => (
                         <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   <Textarea
                     className="md:col-span-2"
                     placeholder="التفاصيل..."
                     value={newTask.description}
                     onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                   />
                 </div>
                 <div className="flex gap-2">
                   <Button onClick={handleAddTask}>حفظ</Button>
                   <Button variant="ghost" onClick={() => setShowAddTask(false)}>إلغاء</Button>
                 </div>
               </div>
             )}

             {(() => {
               const today = new Date();
               today.setHours(0, 0, 0, 0);
               const tomorrow = new Date(today);
               tomorrow.setDate(tomorrow.getDate() + 1);
               const isDone = (t: any) => t.status === 'completed' || t.status === 'done';
               const isToday = (t: any) => {
                 if (!t.due_date || isDone(t)) return false;
                 const d = new Date(t.due_date);
                 return d >= today && d < tomorrow;
               };
               const isUpcoming = (t: any) => {
                 if (!t.due_date || isDone(t)) return !t.due_date && !isDone(t);
                 return new Date(t.due_date) >= tomorrow;
               };
               const overdueOrOpen = (t: any) => !isDone(t) && (!t.due_date || new Date(t.due_date) < tomorrow);
               const todayTasks = tasks.filter(isToday);
               const openTasks = tasks.filter(t => overdueOrOpen(t) && !isToday(t));
               const upcoming = tasks.filter(isUpcoming);
               const done = tasks.filter(isDone);

               const TaskCard = ({ task }: { task: any }) => (
                 <div className="p-4 rounded-xl bg-secondary/40 border border-border/40 space-y-2">
                   <div className="flex justify-between items-start gap-2">
                     <span className="font-bold text-sm">{task.title}</span>
                     <Badge className={`border-0 text-[10px] ${
                       task.priority === 'high' ? 'bg-red-500/10 text-red-600' :
                       task.priority === 'low' ? 'bg-slate-500/10 text-slate-600' :
                       'bg-amber-500/10 text-amber-600'
                     }`}>
                       {task.priority === 'high' ? 'عاجل' : task.priority === 'low' ? 'منخفض' : 'عادي'}
                     </Badge>
                   </div>
                   {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                   {task.due_date && (
                     <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                       <Calendar className="w-3 h-3" />
                       {new Date(task.due_date).toLocaleDateString('ar-EG')}
                     </p>
                   )}
                   {task.lead_id && (
                     <p className="text-[10px] text-primary">فرصة: {leads.find(l => l.id === task.lead_id)?.name || '—'}</p>
                   )}
                   <div className="flex gap-1 pt-1">
                     {!isDone(task) && (
                       <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleUpdateTaskStatus(task.id, 'completed')}>
                         إكمال
                       </Button>
                     )}
                     {isDone(task) && (
                       <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleUpdateTaskStatus(task.id, 'pending')}>
                         إعادة فتح
                       </Button>
                     )}
                     <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => handleDeleteTask(task.id)}>
                       حذف
                     </Button>
                   </div>
                 </div>
               );

               return (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="glass-card p-6 border-amber-500/20">
                     <h3 className="font-bold mb-4 text-amber-600">اليوم والمفتوحة ({todayTasks.length + openTasks.length})</h3>
                     <div className="space-y-3 max-h-[480px] overflow-y-auto">
                       {[...todayTasks, ...openTasks].map(t => <TaskCard key={t.id} task={t} />)}
                       {todayTasks.length + openTasks.length === 0 && (
                         <p className="text-center py-8 text-muted-foreground text-sm">لا مهام مفتوحة</p>
                       )}
                     </div>
                   </div>
                   <div className="glass-card p-6 border-blue-500/20">
                     <h3 className="font-bold mb-4 text-blue-600">القادم ({upcoming.length})</h3>
                     <div className="space-y-3 max-h-[480px] overflow-y-auto">
                       {upcoming.map(t => <TaskCard key={t.id} task={t} />)}
                       {upcoming.length === 0 && (
                         <p className="text-center py-8 text-muted-foreground text-sm italic">لا توجد مهام مجدولة لاحقاً</p>
                       )}
                     </div>
                   </div>
                   <div className="glass-card p-6 border-emerald-500/20">
                     <h3 className="font-bold mb-4 text-emerald-600">مكتمل ({done.length})</h3>
                     <div className="space-y-3 max-h-[480px] overflow-y-auto opacity-80">
                       {done.map(t => <TaskCard key={t.id} task={t} />)}
                       {done.length === 0 && (
                         <p className="text-center py-8 text-muted-foreground text-sm">لا مهام مكتملة</p>
                       )}
                     </div>
                   </div>
                 </div>
               );
             })()}
          </div>
        )}
      </div>

      {/* Customer Details Dialog */}
      {selectedCustomer && (
        <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background/95 backdrop-blur-xl border-primary/20">
            <div className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-b">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-black shadow-2xl shadow-primary/30">
                    {selectedCustomer.name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">{selectedCustomer.name}</h2>
                    <p className="text-muted-foreground flex items-center gap-2"><Phone className="w-4 h-4" /> {selectedCustomer.phone}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20">{selectedCustomer.loyalty_tier || 'البرونزي'}</Badge>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">عميل نشط</Badge>
                      {selectedCustomer.vip_status && <Badge className="bg-yellow-500 text-white">VIP ⭐</Badge>}
                      {selectedCustomer.warning_flags > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                          <AlertTriangle className="w-2 h-2 mr-1" />
                          {selectedCustomer.warning_flags}
                        </Badge>
                      )}
                      {selectedCustomer.risk_level === 'high' && <Badge className="bg-red-500">خطر</Badge>}
                      {selectedCustomer.risk_level === 'blocked' && <Badge className="bg-red-700">محظور</Badge>}
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">الرصيد الحالي</p>
                  <h3 className={`text-3xl font-black ${(selectedCustomer.balance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {(selectedCustomer.balance || 0).toLocaleString()} <span className="text-sm font-normal">{currency}</span>
                  </h3>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-primary/10 bg-secondary/20 shadow-sm">
                  <p className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-tighter">إجمالي الإنفاق</p>
                  <p className="text-xl font-black text-primary">{(selectedCustomer.total_spent || 0).toLocaleString()} {currency}</p>
                </Card>
                <Card className="p-4 border-primary/10 bg-secondary/20 shadow-sm">
                  <p className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-tighter">عدد الطلبات</p>
                  <p className="text-xl font-black">{customerOrders.length} طلب</p>
                </Card>
                <Card className="p-4 border-primary/10 bg-secondary/20 shadow-sm">
                  <p className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-tighter">نقاط الولاء</p>
                  <p className="text-xl font-black text-amber-500">{selectedCustomer.loyalty_points || 0} نقطة</p>
                </Card>
                <Card className="p-4 border-primary/10 bg-secondary/20 shadow-sm">
                  <p className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-tighter">متوسط الفاتورة</p>
                  <p className="text-xl font-black">
                    {customerOrders.length > 0 
                      ? (selectedCustomer.total_spent / customerOrders.length).toFixed(0) 
                      : 0} {currency}
                  </p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Transaction History (Numerical Report) */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
                    <Receipt className="w-5 h-5" /> سجل المعاملات المالية
                  </h3>
                  <div className="glass-card overflow-hidden border-primary/5">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3">البيان</th>
                          <th className="p-3">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {customerTransactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-primary/5 transition-colors">
                            <td className="p-3 text-muted-foreground font-mono">{new Date(tx.created_at).toLocaleDateString('ar-EG')}</td>
                            <td className="p-3 font-medium">
                              {tx.type === 'payment' ? 'سداد نقدي' : `فاتورة رقم ${tx.order_id?.slice(-6) || ''}`}
                            </td>
                            <td className={`p-3 font-bold ${tx.type === 'payment' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {tx.type === 'payment' ? '+' : '-'}{tx.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Top Purchased Items (Inventory Report) */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-amber-600">
                    <Package className="w-5 h-5" /> الأصناف الأكثر شراءً
                  </h3>
                  <div className="glass-card overflow-hidden border-amber-500/5">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-amber-500/5 border-b border-amber-500/10">
                        <tr>
                          <th className="p-3 text-amber-700">الصنف</th>
                          <th className="p-3 text-amber-700">الكمية</th>
                          <th className="p-3 text-amber-700">القيمة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {customerProducts.slice(0, 6).map((item, idx) => (
                          <tr key={idx} className="hover:bg-amber-500/5 transition-colors">
                            <td className="p-3 font-bold">{item.name}</td>
                            <td className="p-3 font-mono">{item.qty} وحدة</td>
                            <td className="p-3 font-bold text-emerald-600">{item.total.toLocaleString()} {currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 3. Recent Orders Analysis */}
              <div className="space-y-4 pt-4">
                <h3 className="font-bold text-lg flex items-center gap-2 text-blue-600">
                  <ShoppingCart className="w-5 h-5" /> تحليل معدل الشراء الأخير
                </h3>
                <div className="glass-card p-6 border-blue-500/5">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={customerOrders.slice().reverse().map(o => ({
                        date: new Date(o.created_at).toLocaleDateString('ar-EG', {month: 'short', day: 'numeric'}),
                        amount: o.total
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <Tooltip />
                        <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground italic">
                      يظهر الرسم البياني تطور قيمة مشتريات العميل خلال آخر {customerOrders.length} فواتير.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-secondary/30 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowWarningModal(true); loadWarningHistory(selectedCustomer.id); }}>
                <ShieldAlert className="w-4 h-4 ml-2" />
                إدارة التحذيرات
              </Button>
              <Button variant="outline" onClick={() => setShowCustomerDetails(false)}>إغلاق</Button>
              <Button className="gradient-bg text-white border-0 gap-2"><Download className="w-4 h-4" /> تحميل كشف الحساب</Button>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 gap-2"><Plus className="w-4 h-4" /> تسجيل سداد</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Warning Management Modal */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              إدارة التحذيرات — {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current Status */}
            <div className="p-4 bg-secondary/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">العلامات التحذيرية الحالية:</span>
                <Badge className={selectedCustomer?.warning_flags >= 3 ? 'bg-red-500' : selectedCustomer?.warning_flags >= 2 ? 'bg-yellow-500' : 'bg-green-500'}>
                  {selectedCustomer?.warning_flags || 0} / 4
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>مستوى الخطورة:</span>
                <Badge variant="outline" className={
                  selectedCustomer?.risk_level === 'blocked' ? 'bg-red-100 text-red-700 border-red-300' :
                  selectedCustomer?.risk_level === 'high' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                  selectedCustomer?.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                  'bg-green-100 text-green-700 border-green-300'
                }>
                  {selectedCustomer?.risk_level === 'blocked' ? 'محظور' :
                   selectedCustomer?.risk_level === 'high' ? 'عالي' :
                   selectedCustomer?.risk_level === 'medium' ? 'متوسط' : 'عادي'}
                </Badge>
              </div>
            </div>

            {/* Add Warning */}
            <div className="space-y-2">
              <label className="text-sm font-medium">إضافة علامة تحذيرية</label>
              <Input
                placeholder="اكتب سبب التحذير..."
                value={warningReason}
                onChange={e => setWarningReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddWarning} className="flex-1" disabled={!warningReason.trim()}>
                  <AlertTriangle className="w-4 h-4 ml-2" />
                  إضافة علامة
                </Button>
                <Button onClick={handleRemoveWarning} variant="outline" disabled={selectedCustomer?.warning_flags === 0}>
                  <ShieldCheck className="w-4 h-4 ml-2" />
                  إزالة علامة
                </Button>
              </div>
            </div>

            {/* Warning History */}
            <div className="space-y-2">
              <label className="text-sm font-medium">سجل التحذيرات</label>
              <div className="max-h-40 overflow-auto space-y-2">
                {warningHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">لا يوجد سجل تحذيرات</p>
                ) : (
                  warningHistory.map(h => (
                    <div key={h.id} className="p-2 bg-secondary/20 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className={h.action === 'add' ? 'text-red-600' : 'text-green-600'}>
                          {h.action === 'add' ? 'إضافة' : 'إزالة'}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      {h.reason && <p className="mt-1 text-muted-foreground">{h.reason}</p>}
                      <div className="text-muted-foreground mt-1">
                        {h.warning_count_before} → {h.warning_count_after}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarningModal(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
