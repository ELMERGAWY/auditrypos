import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Target, Heart, MessageSquare, 
  TrendingUp, Star, Phone, Mail, MapPin, 
  Search, Filter, MoreVertical,
  Award, Zap, History,
  Columns, Plus, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  restaurantId: string;
  currency: string;
}

type TabType = 'overview' | 'leads' | 'customers' | 'loyalty' | 'communications';
type LeadStage = 'new' | 'contacted' | 'negotiation' | 'won' | 'lost';

export function VentroCRM({ restaurantId, currency }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [customers, setCustomers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New lead form state
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', estimated_value: '' });

  useEffect(() => {
    loadCRMData();
  }, [restaurantId]);

  const loadCRMData = async () => {
    setLoading(true);
    const [customersRes, leadsRes, logsRes] = await Promise.all([
      supabase.from('customers').select('*').eq('restaurant_id', restaurantId).order('total_spent', { ascending: false }),
      supabase.from('crm_leads').select('*').eq('restaurant_id', restaurantId),
      supabase.from('crm_communication_logs').select('*').eq('restaurant_id', restaurantId).order('contact_date', { ascending: false }).limit(20)
    ]);
    
    if (customersRes.data) setCustomers(customersRes.data);
    if (leadsRes.data) setLeads(leadsRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    setLoading(false);
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
      { id: 'won', label: 'تم الإغلاق بنجاح', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
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
         <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-3 mb-4">Ventro CRM Pro</h3>
         {[
           { id: 'overview', label: 'لوحة التحكم الشاملة', icon: Target },
           { id: 'leads', label: 'مسار المبيعات (Pipeline)', icon: Columns },
           { id: 'customers', label: 'العملاء (Customer 360)', icon: Users },
           { id: 'communications', label: 'سجلات التواصل', icon: MessageSquare },
           { id: 'loyalty', label: 'برامج الولاء الذكية', icon: Heart },
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

      {/* Main CRM Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
        {activeTab === 'overview' && (
          <div className="space-y-8 fade-in">
            <header>
               <h2 className="text-3xl font-black tracking-tight">نظرة عامة على النمو والعملاء</h2>
               <p className="text-muted-foreground">احصل على رؤية 360 درجة لمسار مبيعاتك ونشاط عملائك.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="glass-card p-6 border-primary/20">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-4"><Users className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">إجمالي العملاء</p>
                  <h3 className="text-3xl font-black mt-1">{customers.length}</h3>
               </div>
               <div className="glass-card p-6 border-emerald-500/20">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit mb-4"><TrendingUp className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">قيمة مسار المبيعات</p>
                  <h3 className="text-3xl font-black mt-1">{leads.filter(l=>l.stage !== 'lost' && l.stage !== 'won').reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
               </div>
               <div className="glass-card p-6 border-amber-500/20">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit mb-4"><Star className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">العملاء النشطون (VIP)</p>
                  <h3 className="text-3xl font-black mt-1">{customers.filter(c => (c.total_spent || 0) > 1000).length}</h3>
               </div>
               <div className="glass-card p-6 border-purple-500/20">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 w-fit mb-4"><MessageSquare className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">تفاعلات هذا الشهر</p>
                  <h3 className="text-3xl font-black mt-1">{logs.length}</h3>
               </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                              <p className="text-[10px] text-muted-foreground">منذ بضع ساعات • بواسطة المستخدم النظام</p>
                           </div>
                        </div>
                     ))}
                     {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد سجلات تواصل حديثة</p>}
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
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="h-full flex flex-col space-y-6 fade-in">
            <div className="flex items-center justify-between shrink-0">
               <div>
                  <h2 className="text-2xl font-black flex items-center gap-2"><Columns className="w-6 h-6 text-primary" /> إدارة مسار المبيعات (Pipeline)</h2>
                  <p className="text-sm text-muted-foreground">تتبع العملاء المحتملين من أول اتصال حتى إغلاق الصفقة.</p>
               </div>
               <Button onClick={() => setShowAddLead(true)} className="gradient-bg text-primary-foreground border-0 gap-2"><Plus className="w-4 h-4" /> فرصة جديدة</Button>
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
               {renderKanbanBoard()}
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
                        <th className="p-4">نقاط الولاء</th>
                        <th className="p-4">آخر حركة</th>
                        <th className="p-4">إجراءات</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                     {customers.map(c => (
                        <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                           <td className="p-4">
                              <div className="font-bold flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{c.name?.[0] || 'C'}</div>
                                 <div>
                                    {c.name}
                                    <div className="text-[10px] text-muted-foreground">{c.phone || c.email}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="p-4">
                              <Badge className={`border-0 ${c.loyalty_tier === 'platinum' ? 'bg-purple-500/10 text-purple-600' : c.loyalty_tier === 'gold' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-500/10 text-slate-600'}`}>
                                 {c.loyalty_tier === 'platinum' ? 'بلاتيني' : c.loyalty_tier === 'gold' ? 'ذهبي' : 'برونزي'}
                              </Badge>
                           </td>
                           <td className="p-4 font-bold text-emerald-500">{(c.total_spent || 0).toLocaleString()} {currency}</td>
                           <td className="p-4"><div className="flex items-center gap-1 font-bold text-amber-500"><Star className="w-3 h-3 fill-current" /> {c.loyalty_points || 0}</div></td>
                           <td className="p-4 text-xs text-muted-foreground">نشط</td>
                           <td className="p-4">
                              <Button variant="outline" size="sm" className="h-8">الملف الشامل</Button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* ... (Other tabs like loyalty and communications can be expanded similarly) */}
        {activeTab === 'loyalty' && (
           <div className="flex flex-col items-center justify-center h-full text-center space-y-4 fade-in">
              <Award className="w-24 h-24 text-amber-500 opacity-50" />
              <h2 className="text-3xl font-black">نظام الولاء الآلي قيد التطوير</h2>
              <p className="text-muted-foreground max-w-md">سيتم ترقية العملاء تلقائياً بناءً على إنفاقهم، مع إرسال مكافآت ونقاط ديناميكية لزيادة نسبة العودة.</p>
           </div>
        )}

        {activeTab === 'communications' && (
           <div className="space-y-6 fade-in">
              <h2 className="text-2xl font-black">سجل التواصل الموحد</h2>
              <div className="glass-card divide-y divide-border/30">
                 {logs.map(log => (
                    <div key={log.id} className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0">
                          {log.type === 'call' ? <Phone className="w-5 h-5"/> : log.type === 'email' ? <Mail className="w-5 h-5"/> : <MessageSquare className="w-5 h-5"/>}
                       </div>
                       <div>
                          <p className="font-bold">{log.summary}</p>
                          <p className="text-sm text-muted-foreground mt-1">{log.details || 'لا توجد تفاصيل إضافية'}</p>
                          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                             <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.contact_date).toLocaleString('ar-EG')}</span>
                          </div>
                       </div>
                    </div>
                 ))}
                 {logs.length === 0 && <div className="p-8 text-center text-muted-foreground">لا توجد سجلات تواصل.</div>}
              </div>
           </div>
        )}

      </div>
    </div>
  );
}
