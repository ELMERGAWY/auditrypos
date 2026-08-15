import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Search, Filter, DollarSign, Calendar,
  TrendingUp, Edit2, Trash2, MoreVertical, Phone, Mail,
  Building2, CheckCircle, XCircle, Clock, AlertTriangle,
  ArrowRight, ArrowLeft, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Lead {
  id: string;
  lead_code: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  lead_source: string;
  lead_status: string;
  pipeline_stage: string;
  opportunity_value: number;
  probability: number;
  expected_close_date?: string;
  sales_rep_id?: string;
  sales_rep_name?: string;
  notes?: string;
  next_follow_up?: string;
}

interface PipelineStage {
  id: string;
  stage_name: string;
  stage_name_ar?: string;
  stage_order: number;
  probability_percentage: number;
}

interface FollowUp {
  id: string;
  lead_id?: string | null;
  title: string;
  due_at: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string | null;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const LEAD_SOURCES = [
  { id: 'website', label: 'الموقع الإلكتروني' },
  { id: 'referral', label: 'إحالة' },
  { id: 'social_media', label: 'وسائل التواصل' },
  { id: 'cold_call', label: 'اتصال بارد' },
  { id: 'email', label: 'بريد إلكتروني' },
  { id: 'event', label: 'فعالية' },
  { id: 'other', label: 'أخرى' }
];

const LEAD_STATUS = [
  { id: 'new', label: 'جديد', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'contacted', label: 'تم التواصل', color: 'bg-amber-500/20 text-amber-400' },
  { id: 'qualified', label: 'مؤهل', color: 'bg-green-500/20 text-green-400' },
  { id: 'proposal', label: 'عرض سعر', color: 'bg-purple-500/20 text-purple-400' },
  { id: 'negotiation', label: 'تفاوض', color: 'bg-orange-500/20 text-orange-400' },
  { id: 'won', label: 'مغلق', color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'lost', label: 'خاسر', color: 'bg-red-500/20 text-red-400' }
];

export function CRMManager({ restaurantId, currency }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showStageForm, setShowStageForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [automationLoading, setAutomationLoading] = useState(false);

  const [leadForm, setLeadForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    lead_source: 'other',
    lead_status: 'new',
    pipeline_stage: '',
    opportunity_value: '',
    probability: '',
    expected_close_date: '',
    sales_rep_id: '',
    notes: '',
    next_follow_up: ''
  });

  const [stageForm, setStageForm] = useState({
    stage_name: '',
    stage_name_ar: '',
    stage_order: '',
    probability_percentage: ''
  });

  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_crm_leads')
        .select(`
          *,
          staff_profiles(full_name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedLeads = (data || []).map((lead: any) => ({
        ...lead,
        sales_rep_name: lead.staff_profiles?.full_name
      }));

      setLeads(mappedLeads);
    } catch (error: any) {
      toast.error('فشل تحميل العملاء المحتملين: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowUps = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('marketing_crm_followups')
        .select('id, lead_id, title, due_at, status, priority, assigned_to')
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'in_progress', 'overdue'])
        .order('due_at', { ascending: true })
        .limit(12);
      if (error) throw error;
      setFollowUps((data || []) as FollowUp[]);
    } catch (error) {
      // The CRM remains usable before the additive migration is applied.
      console.warn('CRM follow-ups are unavailable until migration 20260815060000 is applied.', error);
      setFollowUps([]);
    }
  };

  const runAutomation = async () => {
    setAutomationLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('run_marketing_crm_automation', {
        p_restaurant_id: restaurantId,
        p_limit: 100,
      });
      if (error) throw error;
      toast.success(`تمت معالجة ${Number(data || 0)} متابعة/تعيين`);
      await Promise.all([loadLeads(), loadFollowUps()]);
    } catch (error: any) {
      toast.error('تعذر تشغيل المتابعة التلقائية: ' + (error?.message || 'تحقق من تطبيق migration CRM'));
    } finally {
      setAutomationLoading(false);
    }
  };

  const completeFollowUp = async (followUpId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('marketing_crm_followups')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', followUpId)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
      setFollowUps((items) => items.filter((item) => item.id !== followUpId));
      toast.success('تم إغلاق المتابعة');
    } catch (error: any) {
      toast.error('تعذر إغلاق المتابعة: ' + error.message);
    }
  };

  const loadPipelineStages = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_pipeline_stages')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('stage_order', { ascending: true });

      if (error) throw error;

      // If no stages exist, create default ones
      if (!data || data.length === 0) {
        await createDefaultStages();
        loadPipelineStages();
      } else {
        setPipelineStages(data);
      }
    } catch (error: any) {
      toast.error('فشل تحميل مراحل الـ Pipeline: ' + error.message);
    }
  };

  const createDefaultStages = async () => {
    const defaultStages = [
      { stage_name: 'جديد', stage_order: 1, probability_percentage: 10 },
      { stage_name: 'مؤهل', stage_order: 2, probability_percentage: 30 },
      { stage_name: 'عرض سعر', stage_order: 3, probability_percentage: 50 },
      { stage_name: 'تفاوض', stage_order: 4, probability_percentage: 70 },
      { stage_name: 'مغلق', stage_order: 5, probability_percentage: 100 }
    ];

    for (const stage of defaultStages) {
      await supabase.from('marketing_pipeline_stages').insert({
        restaurant_id: restaurantId,
        ...stage
      });
    }
  };

  useEffect(() => {
    loadLeads();
    loadPipelineStages();
    loadFollowUps();
  }, [restaurantId]);

  const handleSaveLead = async () => {
    if (!leadForm.contact_name?.trim()) {
      toast.error('أدخل اسم جهة الاتصال');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const leadCode = `LEAD-${new Date().getFullYear()}-${(leads.length + 1).toString().padStart(4, '0')}`;

      const payload = {
        restaurant_id: restaurantId,
        lead_code: editingLead?.lead_code || leadCode,
        company_name: leadForm.company_name || null,
        contact_name: leadForm.contact_name,
        contact_email: leadForm.contact_email || null,
        contact_phone: leadForm.contact_phone || null,
        lead_source: leadForm.lead_source,
        lead_status: leadForm.lead_status,
        pipeline_stage: leadForm.pipeline_stage || pipelineStages[0]?.id,
        opportunity_value: parseFloat(leadForm.opportunity_value) || 0,
        probability: parseInt(leadForm.probability) || 0,
        expected_close_date: leadForm.expected_close_date || null,
        sales_rep_id: leadForm.sales_rep_id || null,
        notes: leadForm.notes || null,
        next_follow_up: leadForm.next_follow_up || null,
        created_by: user?.id
      };

      if (editingLead) {
        const { error } = await supabase.from('marketing_crm_leads').update(payload).eq('id', editingLead.id);
        if (error) throw error;
        toast.success('تم تحديث العميل المحتمل بنجاح');
      } else {
        const { error } = await supabase.from('marketing_crm_leads').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة العميل المحتمل بنجاح');
      }

      setShowLeadForm(false);
      setEditingLead(null);
      resetLeadForm();
      loadLeads();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStage = async () => {
    if (!stageForm.stage_name.trim()) {
      toast.error('أدخل اسم المرحلة');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        restaurant_id: restaurantId,
        stage_name: stageForm.stage_name,
        stage_name_ar: stageForm.stage_name_ar || null,
        stage_order: parseInt(stageForm.stage_order) || pipelineStages.length + 1,
        probability_percentage: parseInt(stageForm.probability_percentage) || 0,
        created_by: user?.id
      };

      const { error } = await supabase.from('marketing_pipeline_stages').insert(payload);
      if (error) throw error;

      toast.success('تم إضافة المرحلة بنجاح');
      setShowStageForm(false);
      resetStageForm();
      loadPipelineStages();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const moveLeadToStage = async (leadId: string, newStageId: string) => {
    try {
      const stage = pipelineStages.find(s => s.id === newStageId);
      if (!stage) return;

      const { error } = await supabase
        .from('marketing_crm_leads')
        .update({ 
          pipeline_stage: newStageId,
          probability: stage.probability_percentage
        })
        .eq('id', leadId);

      if (error) throw error;

      toast.success('تم تحديث المرحلة');
      loadLeads();
    } catch (error: any) {
      toast.error('فشل التحديث: ' + error.message);
    }
  };

  const resetLeadForm = () => {
    setLeadForm({
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      lead_source: 'other',
      lead_status: 'new',
      pipeline_stage: '',
      opportunity_value: '',
      probability: '',
      expected_close_date: '',
      sales_rep_id: '',
      notes: '',
      next_follow_up: ''
    });
  };

  const resetStageForm = () => {
    setStageForm({
      stage_name: '',
      stage_name_ar: '',
      stage_order: '',
      probability_percentage: ''
    });
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.lead_code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.lead_status === filterStatus;
    const matchesSource = filterSource === 'all' || lead.lead_source === filterSource;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.lead_status === 'new').length,
    qualified: leads.filter(l => l.lead_status === 'qualified').length,
    won: leads.filter(l => l.lead_status === 'won').length,
    totalValue: leads.reduce((sum, l) => sum + l.opportunity_value, 0),
    wonValue: leads.filter(l => l.lead_status === 'won').reduce((sum, l) => sum + l.opportunity_value, 0)
  };

  const getLeadStatusDisplay = (status: string) => {
    return LEAD_STATUS.find(s => s.id === status) || LEAD_STATUS[0];
  };

  const getLeadsByStage = (stageId: string) => {
    return leads.filter(l => l.pipeline_stage === stageId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <Users className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة العملاء المحتملين (CRM)</h1>
            <p className="text-muted-foreground">إدارة العملاء المحتملين وسطوح المبيعات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowStageForm(true)}>
            <Plus className="w-4 h-4 ml-2" />
            مرحلة جديدة
          </Button>
          <Button onClick={() => setShowLeadForm(true)} className="gradient-bg">
            <Plus className="w-4 h-4 ml-2" />
            عميل محتمل جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">جديد</p>
              <p className="text-xl font-bold">{stats.new}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">مؤهل</p>
              <p className="text-xl font-bold">{stats.qualified}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">مغلق</p>
              <p className="text-xl font-bold">{stats.won}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-purple-500/10 border-purple-500/20">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-xs text-muted-foreground">القيمة الكلية</p>
              <p className="text-xl font-bold">{stats.totalValue.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Automated follow-up workspace */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" /> المتابعات والتعيين التلقائي</h2>
            <p className="text-xs text-muted-foreground mt-1">يعيّن العملاء غير المملوكين للمندوب الأقل حملاً وينشئ متابعة idempotent دون تعديل الطلبات أو العملاء.</p>
          </div>
          <Button variant="outline" onClick={runAutomation} disabled={automationLoading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${automationLoading ? 'animate-spin' : ''}`} />
            {automationLoading ? 'جاري المعالجة...' : 'تشغيل المتابعة الآن'}
          </Button>
        </div>
        {followUps.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-4">
            {followUps.slice(0, 6).map((followUp) => (
              <div key={followUp.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{followUp.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(followUp.due_at).toLocaleString('ar-EG')} · {followUp.status === 'overdue' ? 'متأخرة' : 'مستحقة'}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => completeFollowUp(followUp.id)}>إتمام</Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-3">لا توجد متابعات مستحقة حالياً.</p>
        )}
      </Card>

      {/* View Toggle */}
      <div className="flex gap-4">
        <Button
          variant={viewMode === 'pipeline' ? 'default' : 'outline'}
          onClick={() => setViewMode('pipeline')}
          className="flex-1"
        >
          <TrendingUp className="w-4 h-4 ml-2" />
          Pipeline
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          onClick={() => setViewMode('list')}
          className="flex-1"
        >
          <Users className="w-4 h-4 ml-2" />
          قائمة
        </Button>
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineStages.map((stage) => {
            const stageLeads = getLeadsByStage(stage.id);
            return (
              <div key={stage.id} className="flex-shrink-0 w-80">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">{stage.stage_name}</h3>
                    <Badge variant="outline">{stageLeads.length}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {stageLeads.map((lead) => {
                      const statusDisplay = getLeadStatusDisplay(lead.lead_status);
                      return (
                        <Card key={lead.id} className="p-3 bg-white/5 hover:bg-white/10 cursor-pointer">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{lead.company_name || lead.contact_name}</p>
                              <p className="text-xs text-muted-foreground">{lead.lead_code}</p>
                            </div>
                            <Badge variant="outline" className={statusDisplay.color + ' text-xs'}>
                              {statusDisplay.label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{lead.opportunity_value.toLocaleString()} {currency}</span>
                            <span className="text-muted-foreground">{lead.probability}%</span>
                          </div>

                          <div className="flex gap-1 mt-2">
                            {pipelineStages.findIndex(s => s.id === stage.id) > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const prevStage = pipelineStages[pipelineStages.findIndex(s => s.id === stage.id) - 1];
                                  moveLeadToStage(lead.id, prevStage.id);
                                }}
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </Button>
                            )}
                            {pipelineStages.findIndex(s => s.id === stage.id) < pipelineStages.length - 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const nextStage = pipelineStages[pipelineStages.findIndex(s => s.id === stage.id) + 1];
                                  moveLeadToStage(lead.id, nextStage.id);
                                }}
                              >
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}

                    {stageLeads.length === 0 && (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        لا توجد عملاء
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث في العملاء..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white/5 border border-white/10"
            >
              <option value="all">جميع الحالات</option>
              {LEAD_STATUS.map(status => (
                <option key={status.id} value={status.id}>{status.label}</option>
              ))}
            </select>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white/5 border border-white/10"
            >
              <option value="all">جميع المصادر</option>
              {LEAD_SOURCES.map(source => (
                <option key={source.id} value={source.id}>{source.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {filteredLeads.map((lead) => {
              const statusDisplay = getLeadStatusDisplay(lead.lead_status);
              return (
                <Card key={lead.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusDisplay.color}`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold">{lead.company_name || lead.contact_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {lead.contact_email && <span>{lead.contact_email}</span>}
                          {lead.contact_phone && <span>• {lead.contact_phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{lead.opportunity_value.toLocaleString()} {currency}</p>
                        <p className="text-xs text-muted-foreground">{lead.probability}% احتمال</p>
                      </div>
                      <Badge variant="outline" className={statusDisplay.color}>
                        {statusDisplay.label}
                      </Badge>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingLead(lead); setShowLeadForm(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {lead.next_follow_up && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      متابعة: {new Date(lead.next_follow_up).toLocaleDateString('ar-EG')}
                    </div>
                  )}
                </Card>
              );
            })}

            {filteredLeads.length === 0 && (
              <div className="py-20 text-center border-dashed border rounded-xl">
                <Users className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">لا توجد عملاء محتملين</p>
                <Button variant="link" onClick={() => setShowLeadForm(true)} className="text-indigo-500">
                  أضف عميل محتمل جديد
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lead Form Modal */}
      <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'تعديل العميل المحتمل' : 'عميل محتمل جديد'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم الشركة</Label>
                <Input
                  value={leadForm.company_name}
                  onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })}
                  placeholder="اسم الشركة"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم جهة الاتصال *</Label>
                <Input
                  value={leadForm.contact_name}
                  onChange={(e) => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                  placeholder="اسم جهة الاتصال"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={leadForm.contact_email}
                  onChange={(e) => setLeadForm({ ...leadForm, contact_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={leadForm.contact_phone}
                  onChange={(e) => setLeadForm({ ...leadForm, contact_phone: e.target.value })}
                  placeholder="رقم الهاتف"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المصدر</Label>
                <select
                  value={leadForm.lead_source}
                  onChange={(e) => setLeadForm({ ...leadForm, lead_source: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {LEAD_SOURCES.map(source => (
                    <option key={source.id} value={source.id}>{source.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <select
                  value={leadForm.lead_status}
                  onChange={(e) => setLeadForm({ ...leadForm, lead_status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {LEAD_STATUS.map(status => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>قيمة الفرصة</Label>
                <Input
                  type="number"
                  value={leadForm.opportunity_value}
                  onChange={(e) => setLeadForm({ ...leadForm, opportunity_value: e.target.value })}
                  placeholder="القيمة"
                />
              </div>
              <div className="space-y-2">
                <Label>نسبة الاحتمال (%)</Label>
                <Input
                  type="number"
                  value={leadForm.probability}
                  onChange={(e) => setLeadForm({ ...leadForm, probability: e.target.value })}
                  placeholder="0-100"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ الإغلاق المتوقع</Label>
                <Input
                  type="date"
                  value={leadForm.expected_close_date}
                  onChange={(e) => setLeadForm({ ...leadForm, expected_close_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ المتابعة القادم</Label>
                <Input
                  type="date"
                  value={leadForm.next_follow_up}
                  onChange={(e) => setLeadForm({ ...leadForm, next_follow_up: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input
                value={leadForm.notes}
                onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                placeholder="ملاحظات إضافية"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowLeadForm(false)}>إلغاء</Button>
              <Button onClick={handleSaveLead} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stage Form Modal */}
      <Dialog open={showStageForm} onOpenChange={setShowStageForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مرحلة جديدة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المرحلة *</Label>
              <Input
                value={stageForm.stage_name}
                onChange={(e) => setStageForm({ ...stageForm, stage_name: e.target.value })}
                placeholder="اسم المرحلة"
              />
            </div>

            <div className="space-y-2">
              <Label>الاسم بالعربية</Label>
              <Input
                value={stageForm.stage_name_ar}
                onChange={(e) => setStageForm({ ...stageForm, stage_name_ar: e.target.value })}
                placeholder="الاسم بالعربية"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الترتيب</Label>
                <Input
                  type="number"
                  value={stageForm.stage_order}
                  onChange={(e) => setStageForm({ ...stageForm, stage_order: e.target.value })}
                  placeholder="الترتيب"
                />
              </div>
              <div className="space-y-2">
                <Label>نسبة الاحتمال (%)</Label>
                <Input
                  type="number"
                  value={stageForm.probability_percentage}
                  onChange={(e) => setStageForm({ ...stageForm, probability_percentage: e.target.value })}
                  placeholder="0-100"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowStageForm(false)}>إلغاء</Button>
              <Button onClick={handleSaveStage} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
