// TIMESTAMP: 2026-05-10 23:48:30
import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Target, Heart, MessageSquare, 
  TrendingUp, Star, Phone, Mail, MapPin, 
  Search, Filter, MoreVertical,
  Award, Zap, History,
  Columns, Plus, Clock, CheckCircle, List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  FileText, Wallet, Receipt, CreditCard, 
  ArrowUpRight, ArrowDownRight, Download, Eye,
  Settings, Bell, ShieldCheck
} from 'lucide-react';

interface Props {
  restaurantId: string;
  currency: string;
}

type TabType = 'overview' | 'leads' | 'customers' | 'suppliers' | 'loyalty' | 'communications' | 'insights' | 'tasks';
type LeadStage = 'new' | 'contacted' | 'negotiation' | 'won' | 'lost';

export function AuditryCRM({ restaurantId, currency }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([]);

  // New lead form state
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', estimated_value: '' });

  useEffect(() => {
    loadCRMData();
  }, [restaurantId]);

  const loadCRMData = async () => {
    try {
      setLoading(true);
      const [customersRes, suppliersRes, leadsRes, logsRes, tasksRes] = await Promise.all([
        supabase.from('customers').select('*').eq('restaurant_id', restaurantId).order('total_spent', { ascending: false }),
        supabase.from('suppliers').select('*').eq('restaurant_id', restaurantId).order('total_purchases', { ascending: false }),
        supabase.from('crm_leads').select('*').eq('restaurant_id', restaurantId),
        supabase.from('crm_communication_logs').select('*').eq('restaurant_id', restaurantId).order('contact_date', { ascending: false }).limit(20),
        supabase.from('crm_tasks').select('*').eq('restaurant_id', restaurantId).order('due_date', { ascending: true })
      ]);
      
      if (customersRes.data) setCustomers(customersRes.data);
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerFinancials = async (customer: any) => {
    try {
      const { data: transactions } = await supabase
        .from('customer_transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setCustomerTransactions(transactions || []);
      setSelectedCustomer(customer);
      setShowCustomerDetails(true);
    } catch (err) {
      toast.error('فشل تحميل البيانات المالية');
    }
  };

  const handleAddLead = async () => {
    if (!newLead.name) return toast.error('الرجاء إدخال اسم العميل');
    const { error } = await supabase.from('crm_leads').insert({
      restaurant_id: restaurantId,
      name: newLead.name,
      phone: newLead.phone,
      estimated_value: Number(newLead.estimated_value) || 0,
      stage: 'new'
    });
    if (error) { toast.error('حدث خطأ'); return; }
    toast.success('تم إضافة العميل المحتمل بنجاح');
    setNewLead({ name: '', phone: '', estimated_value: '' });
    setShowAddLead(false);
    loadCRMData();
  };

  const updateLeadStage = async (id: string, stage: LeadStage) => {
    const { error } = await supabase.from('crm_leads').update({ stage }).eq('id', id);
    if (!error) {
      setLeads(leads.map(l => l.id === id ? { ...l, stage } : l));
      toast.success('تم تحديث مرحلة العميل');
    }
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
          <div key={stage.id} className="flex-1 min-w-[280px] bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3">
            <div className={`px-3 py-2 rounded-xl text-sm font-bold border ${stage.color} flex justify-between items-center`}>
              <span>{stage.label}</span>
              <Badge variant="outline">{leads.filter(l => l.stage === stage.id).length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {leads.filter(l => l.stage === stage.id).map(lead => (
                <div key={lead.id} className="glass-card p-4 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing border-l-4" style={{borderLeftColor: 'currentColor'}}>
                  <h4 className="font-bold text-sm mb-1">{lead.name}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3"><Phone className="w-3 h-3" /> {lead.phone || 'لا يوجد'}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-500 text-sm">{(lead.estimated_value || 0).toLocaleString()} {currency}</span>
                    {stage.id !== 'won' && (
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] bg-primary/10 text-primary" onClick={() => {
                        const nextIndex = stages.findIndex(s => s.id === stage.id) + 1;
                        if (nextIndex < stages.length) updateLeadStage(lead.id, stages[nextIndex].id);
                      }}>نقل للمرحلة التالية</Button>
                    )}
                  </div>
                </div>
              ))}
              {leads.filter(l => l.stage === stage.id).length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl opacity-50">اسحب العملاء هنا</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-background overflow-hidden" dir="rtl">
      {/* CRM Sidebar Navigation */}
      <div className="w-64 border-l bg-card/30 backdrop-blur-md p-4 flex flex-col shrink-0 gap-2">
         <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] px-3 mb-4">Auditry CRM Pro</h3>
         {[
           { id: 'overview', label: 'لوحة التحكم الشاملة', icon: Target },
           { id: 'leads', label: 'مسار المبيعات (Leads)', icon: Columns },
           { id: 'customers', label: 'العملاء (Customer 360)', icon: Users },
           { id: 'suppliers', label: 'الموردين (Partner Network)', icon: Truck },
           { id: 'loyalty', label: 'برامج الولاء والمكافآت', icon: Heart },
           { id: 'communications', label: 'سجل التواصل', icon: MessageSquare },
           { id: 'insights', label: 'الذكاء الاصطناعي', icon: TrendingUp },
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

      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
        {activeTab === 'overview' && (
          <div className="space-y-8 fade-in">
            <header>
               <h2 className="text-3xl font-black tracking-tight">Auditry CRM: النمو والعملاء</h2>
               <p className="text-muted-foreground">احصل على رؤية 360 درجة لمسار مبيعاتك ونشاط عملائك.</p>
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
                <div className="glass-card p-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><Truck className="w-5 h-5" /></div>
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/20">Partners</Badge>
                   </div>
                   <p className="text-xs font-bold text-muted-foreground uppercase">قيمة التوريدات (YTD)</p>
                   <h3 className="text-3xl font-black mt-1">{suppliers.reduce((sum, s) => sum + (Number(s.total_purchases) || 0), 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
                </div>
             </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="glass-card p-6 space-y-4 lg:col-span-2">
                  <h3 className="font-bold text-xl flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> تحليل تدفق العملاء المحتملين (Leads Performance)</h3>
                  <div className="h-64 mt-4">
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
                  <Target className="w-16 h-16 text-primary/50" />
                  <div>
                     <h3 className="text-xl font-bold mb-2">هل تريد إضافة عميل محتمل جديد؟</h3>
                     <p className="text-sm text-muted-foreground max-w-sm mx-auto">ابدأ بإدخال بيانات العميل في مسار المبيعات لتتبعه وتحويله إلى عميل دائم.</p>
                  </div>
                  <Button onClick={() => { setActiveTab('leads'); setShowAddLead(true); }} className="gradient-bg border-0 text-white gap-2 h-12 px-8 text-lg font-bold">
                     <Plus className="w-5 h-5" /> إضافة Lead
                  </Button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
               <div className="glass-card p-6 space-y-4">
                  <h3 className="font-bold text-xl flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> أحدث التفاعلات</h3>
                  <div className="space-y-3">
                     {logs.slice(0, 5).map(log => (
                        <div key={log.id} className="flex gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30">
                           <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              {log.type === 'call' ? <Phone className="w-4 h-4"/> : log.type === 'email' ? <Mail className="w-4 h-4"/> : <MessageSquare className="w-4 h-4"/>}
                           </div>
                           <div>
                              <p className="font-bold text-sm">{log.summary}</p>
                              <p className="text-[10px] text-muted-foreground">بواسطة المستخدم النظام • {new Date(log.contact_date).toLocaleDateString('ar-EG')}</p>
                           </div>
                        </div>
                     ))}
                     {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد سجلات تواصل حديثة</p>}
                  </div>
               </div>
               
               <div className="glass-card p-6 space-y-4">
                  <h3 className="font-bold text-xl flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> المهام المعلقة</h3>
                  <div className="space-y-3">
                     {tasks.filter(t => t.status !== 'completed').slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30 group">
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                              <div>
                                 <p className="font-bold text-sm">{task.title}</p>
                                 <p className="text-[10px] text-muted-foreground">موعد الاستحقاق: {new Date(task.due_date).toLocaleDateString('ar-EG')}</p>
                              </div>
                           </div>
                           <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-[10px]">إتمام</Button>
                        </div>
                     ))}
                     {tasks.filter(t => t.status !== 'completed').length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد مهام معلقة</p>}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="h-full flex flex-col space-y-6 fade-in">
            <div className="flex items-center justify-between shrink-0">
               <div>
                  <h2 className="text-2xl font-black flex items-center gap-2"><Columns className="w-6 h-6 text-primary" /> إدارة مسار المبيعات (Leads)</h2>
                  <p className="text-sm text-muted-foreground">تتبع العملاء المحتملين من أول اتصال حتى إغلاق الصفقة.</p>
               </div>
               <div className="flex gap-2">
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
                     <Input placeholder="القيمة المتوقعة (اختياري)" type="number" value={newLead.estimated_value} onChange={e=>setNewLead({...newLead, estimated_value: e.target.value})} />
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
                         <th className="p-4">القيمة المتوقعة</th>
                         <th className="p-4">تاريخ الإضافة</th>
                         <th className="p-4">إجراءات</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border/30">
                       {leads.map(lead => (
                         <tr key={lead.id} className="hover:bg-muted/40 transition-colors">
                           <td className="p-4">
                             <div className="font-bold">{lead.name}</div>
                             <div className="text-[10px] text-muted-foreground">{lead.phone || 'بدون هاتف'}</div>
                           </td>
                           <td className="p-4">
                             <Badge variant="outline" className="text-[10px]">
                               {lead.stage === 'new' ? 'جديد' : lead.stage === 'contacted' ? 'تم التواصل' : lead.stage === 'negotiation' ? 'تفاوض' : 'مكتمل'}
                             </Badge>
                           </td>
                           <td className="p-4 font-bold text-primary">{(lead.estimated_value || 0).toLocaleString()} {currency}</td>
                           <td className="p-4 text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString('ar-EG')}</td>
                           <td className="p-4">
                             <Button variant="ghost" size="sm" className="h-8">تعديل</Button>
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
                  <Input className="pr-10 bg-card border-border/50" placeholder="بحث بالاسم، الهاتف، أو البريد..." />
               </div>
               <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" /> فلترة</Button>
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
                      {customers.map(c => (
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
                               <Badge className={`border-0 rounded-full px-3 ${c.loyalty_tier === 'platinum' ? 'bg-purple-500/10 text-purple-600' : c.loyalty_tier === 'gold' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-500/10 text-slate-600'}`}>
                                  {c.loyalty_tier === 'platinum' ? 'بلاتيني' : c.loyalty_tier === 'gold' ? 'ذهبي' : 'برونزي'}
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
           <div className="flex flex-col items-center justify-center h-full text-center space-y-4 fade-in">
              <Award className="w-24 h-24 text-amber-500 opacity-50" />
              <h2 className="text-3xl font-black">نظام الولاء الآلي</h2>
              <p className="text-muted-foreground max-w-md">يتم ترقية العملاء تلقائياً بناءً على إنفاقهم، مع إرسال مكافآت ونقاط ديناميكية لزيادة نسبة العودة.</p>
           </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-8 fade-in">
             <header className="flex justify-between items-end">
               <div>
                 <h2 className="text-3xl font-black">مدير المهام والمتابعة</h2>
                 <p className="text-muted-foreground">قم بجدولة المتابعات مع العملاء المحتملين لضمان عدم ضياع أي فرصة.</p>
               </div>
               <Button className="gradient-bg border-0 text-white gap-2"><Plus className="w-4 h-4" /> مهمة متابعة جديدة</Button>
             </header>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="glass-card p-6 border-amber-500/20">
                 <h3 className="font-bold mb-4 text-amber-600">مهام اليوم</h3>
                 <div className="space-y-3">
                   <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm">اتصال متابعة: أحمد علي</span>
                        <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px]">عاجل</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">مناقشة عرض السعر المرسل بالأمس.</p>
                   </div>
                 </div>
               </div>

               <div className="glass-card p-6 border-blue-500/20">
                 <h3 className="font-bold mb-4 text-blue-600">القادم</h3>
                 <p className="text-center py-8 text-muted-foreground text-sm italic">لا توجد مهام مجدولة لاحقاً</p>
               </div>

               <div className="glass-card p-6 border-emerald-500/20">
                 <h3 className="font-bold mb-4 text-emerald-600">مكتمل</h3>
                 <div className="space-y-3 opacity-60">
                   <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"><CheckCircle className="w-3 h-3" /></div>
                      <span className="text-sm line-through">إرسال البروفايل لشركة التقدم</span>
                   </div>
                 </div>
               </div>
             </div>
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

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-primary/10 bg-secondary/20">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي المشتريات</p>
                  <p className="text-xl font-black">{(selectedCustomer.total_spent || 0).toLocaleString()} {currency}</p>
                </Card>
                <Card className="p-4 border-primary/10 bg-secondary/20">
                  <p className="text-xs text-muted-foreground mb-1">نقاط الولاء</p>
                  <p className="text-xl font-black text-amber-500">{selectedCustomer.loyalty_points || 0} نقطة</p>
                </Card>
                <Card className="p-4 border-primary/10 bg-secondary/20">
                  <p className="text-xs text-muted-foreground mb-1">حد الائتمان</p>
                  <p className="text-xl font-black">{(selectedCustomer.credit_limit || 0).toLocaleString()} {currency}</p>
                </Card>
              </div>

              <div>
                <h3 className="font-bold mb-4 flex items-center gap-2"><History className="w-5 h-5 text-primary" /> السجل المالي الأخير</h3>
                <div className="glass-card overflow-hidden">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">النوع</th>
                        <th className="p-3">المبلغ</th>
                        <th className="p-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {customerTransactions.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-3 text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString('ar-EG')}</td>
                          <td className="p-3 font-medium">{tx.type === 'payment' ? 'سداد' : 'فاتورة'}</td>
                          <td className={`p-3 font-bold ${tx.type === 'payment' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {tx.amount.toLocaleString()} {currency}
                          </td>
                          <td className="p-3"><Badge variant="outline" className="text-[10px]">مكتمل</Badge></td>
                        </tr>
                      ))}
                      {customerTransactions.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد حركات مالية حديثة</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-secondary/30 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCustomerDetails(false)}>إغلاق</Button>
              <Button className="gradient-bg text-white border-0 gap-2"><Download className="w-4 h-4" /> تحميل كشف الحساب</Button>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 gap-2"><Plus className="w-4 h-4" /> تسجيل سداد</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
