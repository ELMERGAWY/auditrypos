// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, CheckSquare, Plus, Calendar, DollarSign, AlertCircle, 
  Trash2, Edit2, User, Folder, Play, CheckCircle2, Clock, Users, 
  RefreshCw, TrendingUp, BarChart3, ShieldCheck, HeartHandshake,
  Check, X, Link as LinkIcon, AlertTriangle, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cacheData, getCachedData, queueTransaction } from '@/lib/offlineEngine';
import { journalService } from '@/lib/accounting/journalService';

interface Props {
  restaurantId: string;
  currency: string;
}

type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold';
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

interface MarketingProject {
  id: string;
  name: string;
  customer_id?: string;
  customer_name?: string;
  budget: number;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  notes?: string;
}

interface ProjectTask {
  id: string;
  project_id: string;
  project_name?: string;
  title: string;
  description?: string;
  client_approval: 'pending' | 'approved' | 'rejected';
  preview_url?: string;
  assigned_to?: string;
  assigned_name?: string;
  department_id?: string;
  department_name?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
}

interface AdCampaign {
  id: string;
  name: string;
  platform: 'facebook' | 'google' | 'tiktok' | 'snapchat' | 'other';
  budget: number;
  spent: number;
  clicks: number;
  leads: number;
  status: 'active' | 'paused' | 'completed';
  start_date: string;
}

interface RetainerContract {
  id: string;
  customer_id: string;
  customer_name: string;
  monthly_fee: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'suspended';
  limit_designs: number;
  limit_videos: number;
  limit_posts: number;
  consumed_designs: number;
  consumed_videos: number;
  consumed_posts: number;
}

interface InfluencerBooking {
  id: string;
  influencer_name: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'other';
  cost: number;
  status: 'drafting' | 'shooting' | 'editing' | 'posted';
  publish_date: string;
}

// Special tag parsers to store metadata in description without DB schema changes
const parseTaskDescription = (desc: string | null) => {
  if (!desc) return { cleaned: '', client_approval: 'pending', preview_url: '' };
  
  const approvalMatch = desc.match(/\[Approval:\s*(\w+)\]/);
  const previewMatch = desc.match(/\[Preview:\s*([^\s\]]+)\]/);
  
  const client_approval = approvalMatch ? approvalMatch[1] : 'pending';
  const preview_url = previewMatch ? previewMatch[1] : '';
  
  // Clean description of tags
  let cleaned = desc.replace(/\[Approval:\s*\w+\]/g, '').replace(/\[Preview:\s*[^\s\]]+\]/g, '').trim();
  
  return { cleaned, client_approval, preview_url };
};

const formatTaskDescription = (cleaned: string, approval: string, preview: string) => {
  let desc = cleaned || '';
  if (approval) desc += ` [Approval: ${approval}]`;
  if (preview) desc += ` [Preview: ${preview}]`;
  return desc;
};

export function MarketingProjects({ restaurantId, currency }: Props) {
  const [projects, setProjects] = useState<MarketingProject[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('board');

  // Ad Campaigns State
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: '', platform: 'facebook' as any, budget: '', spent: '', clicks: '', leads: '', status: 'active' as any, start_date: ''
  });

  // Retainers State
  const [retainers, setRetainers] = useState<RetainerContract[]>([]);
  const [showRetainerModal, setShowRetainerModal] = useState(false);
  const [editingRetainer, setEditingRetainer] = useState<RetainerContract | null>(null);
  const [retainerForm, setRetainerForm] = useState({
    customer_id: '', monthly_fee: '', start_date: '', end_date: '', status: 'active' as any,
    limit_designs: '10', limit_videos: '2', limit_posts: '10',
    consumed_designs: '0', consumed_videos: '0', consumed_posts: '0'
  });

  // Influencers State
  const [influencers, setInfluencers] = useState<InfluencerBooking[]>([]);
  const [showInfluencerModal, setShowInfluencerModal] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<InfluencerBooking | null>(null);
  const [influencerForm, setInfluencerForm] = useState({
    influencer_name: '', platform: 'instagram' as any, cost: '', status: 'drafting' as any, publish_date: ''
  });

  // Project / Task Modals
  const [showProjModal, setShowProjModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingProj, setEditingProj] = useState<MarketingProject | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  // Forms
  const [projForm, setProjForm] = useState({
    name: '', customer_id: '', budget: '', start_date: '', end_date: '', status: 'planning' as ProjectStatus, notes: ''
  });
  const [taskForm, setTaskForm] = useState({
    project_id: '', title: '', description: '', assigned_to: '', department_id: '', due_date: '', priority: 'medium' as 'low' | 'medium' | 'high', status: 'todo' as TaskStatus,
    client_approval: 'pending' as any, preview_url: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch CRM Leads/Projects and Team configurations
      const [leadsRes, tasksRes, staffRes, deptRes, custRes] = await Promise.all([
        supabase.from('crm_leads').select('*').eq('restaurant_id', restaurantId),
        supabase.from('crm_tasks').select('*').eq('restaurant_id', restaurantId),
        supabase.from('staff_profiles').select('id, full_name, position').eq('restaurant_id', restaurantId),
        supabase.from('staff_departments').select('id, name').eq('restaurant_id', restaurantId),
        supabase.from('customers').select('id, name').eq('restaurant_id', restaurantId)
      ]);

      // Filter out the system metadata row from normal projects
      const metadataRow = (leadsRes.data || []).find((l: any) => l.name === 'MARKETING_ERP_SYSTEM_METADATA');
      const filteredLeads = (leadsRes.data || []).filter((l: any) => l.name !== 'MARKETING_ERP_SYSTEM_METADATA');

      // Map crm_leads to Projects
      const mappedProj = filteredLeads.map((l: any) => ({
        id: l.id,
        name: l.name,
        customer_id: l.customer_id || '',
        customer_name: l.phone || 'عميل CRM',
        budget: Number(l.estimated_value) || 0,
        start_date: l.created_at?.split('T')[0],
        end_date: l.last_contact_date?.split('T')[0],
        status: l.stage === 'won' ? 'completed' : l.stage === 'lost' ? 'on_hold' : 'active',
        notes: l.notes || ''
      }));

      // Map crm_tasks to ProjectTasks (with custom Client Approval parsing)
      const mappedTasks = (tasksRes.data || []).map((t: any) => {
        const staffMember = (staffRes.data || []).find((s: any) => s.id === t.assigned_to);
        const dept = (deptRes.data || []).find((d: any) => d.id === t.department_id);
        const proj = mappedProj.find(p => p.id === t.lead_id);
        const { cleaned, client_approval, preview_url } = parseTaskDescription(t.description);
        return {
          id: t.id,
          project_id: t.lead_id || '',
          project_name: proj?.name || 'مستقل',
          title: t.title || t.subject || 'مهمة بدون عنوان',
          description: cleaned,
          client_approval: client_approval as any,
          preview_url: preview_url,
          assigned_to: t.assigned_to || '',
          assigned_name: staffMember?.full_name || 'غير معين',
          department_id: t.department_id || '',
          department_name: dept?.name || 'عام',
          due_date: t.due_date?.split('T')[0],
          priority: t.priority || 'medium',
          status: t.status || 'todo'
        };
      });

      setProjects(mappedProj);
      setTasks(mappedTasks);
      setStaff(staffRes.data || []);
      setDepartments(deptRes.data || []);
      setCustomers(custRes.data || []);

      // Load marketing metadata
      if (metadataRow && metadataRow.raw_social_data) {
        const meta = typeof metadataRow.raw_social_data === 'string' 
          ? JSON.parse(metadataRow.raw_social_data) 
          : metadataRow.raw_social_data;
          
        if (meta.adCampaigns) {
          setAdCampaigns(meta.adCampaigns);
          localStorage.setItem(`ad_campaigns_${restaurantId}`, JSON.stringify(meta.adCampaigns));
          cacheData(`ad_campaigns_${restaurantId}`, meta.adCampaigns);
        }
        if (meta.retainers) {
          setRetainers(meta.retainers);
          localStorage.setItem(`retainers_${restaurantId}`, JSON.stringify(meta.retainers));
          cacheData(`retainers_${restaurantId}`, meta.retainers);
        }
        if (meta.influencers) {
          setInfluencers(meta.influencers);
          localStorage.setItem(`influencers_${restaurantId}`, JSON.stringify(meta.influencers));
          cacheData(`influencers_${restaurantId}`, meta.influencers);
        }
      } else {
        // 2. Fetch Ad campaigns, Retainers, Influencers from LocalStorage/IndexedDB Offline Cache
        const localCampaigns = localStorage.getItem(`ad_campaigns_${restaurantId}`);
        if (localCampaigns) setAdCampaigns(JSON.parse(localCampaigns));
        else {
          const cached = await getCachedData<AdCampaign[]>(`ad_campaigns_${restaurantId}`);
          setAdCampaigns(cached || []);
        }

        const localRetainers = localStorage.getItem(`retainers_${restaurantId}`);
        if (localRetainers) setRetainers(JSON.parse(localRetainers));
        else {
          const cached = await getCachedData<RetainerContract[]>(`retainers_${restaurantId}`);
          setRetainers(cached || []);
        }

        const localInfluencers = localStorage.getItem(`influencers_${restaurantId}`);
        if (localInfluencers) setInfluencers(JSON.parse(localInfluencers));
        else {
          const cached = await getCachedData<InfluencerBooking[]>(`influencers_${restaurantId}`);
          setInfluencers(cached || []);
        }
      }
    } catch (e: any) {
      toast.error('خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [restaurantId]);

  const syncMarketingMetadata = async (
    updatedCampaigns: AdCampaign[],
    updatedRetainers: RetainerContract[],
    updatedInfluencers: InfluencerBooking[]
  ) => {
    const payload = {
      adCampaigns: updatedCampaigns,
      retainers: updatedRetainers,
      influencers: updatedInfluencers
    };

    if (navigator.onLine) {
      try {
        const { data: existing } = await supabase.from('crm_leads')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .eq('name', 'MARKETING_ERP_SYSTEM_METADATA')
          .limit(1);

        if (existing && existing.length > 0) {
          const { error } = await supabase.from('crm_leads')
            .update({ raw_social_data: payload as any })
            .eq('id', existing[0].id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('crm_leads')
            .insert({
              restaurant_id: restaurantId,
              name: 'MARKETING_ERP_SYSTEM_METADATA',
              raw_social_data: payload as any,
              stage: 'metadata'
            });
          if (error) throw error;
        }
      } catch (err: any) {
        console.warn("Direct online sync of marketing metadata failed. Queueing offline...", err);
        await queueTransaction({
          id: crypto.randomUUID(),
          type: 'marketing_metadata',
          payload: { restaurant_id: restaurantId, data: payload },
          timestamp: Date.now()
        });
      }
    } else {
      await queueTransaction({
        id: crypto.randomUUID(),
        type: 'marketing_metadata',
        payload: { restaurant_id: restaurantId, data: payload },
        timestamp: Date.now()
      });
      toast.info('تم حفظ التعديلات محلياً؛ سيتم المزامنة تلقائياً عند عودة الاتصال 📡');
    }
  };

  // Save/Delete Ad Campaigns
  const handleSaveCampaign = () => {
    if (!campaignForm.name.trim()) return toast.error('يرجى إدخال اسم الحملة الإعلانية');
    
    const newCamp: AdCampaign = {
      id: editingCampaign ? editingCampaign.id : crypto.randomUUID(),
      name: campaignForm.name,
      platform: campaignForm.platform,
      budget: Number(campaignForm.budget) || 0,
      spent: Number(campaignForm.spent) || 0,
      clicks: Number(campaignForm.clicks) || 0,
      leads: Number(campaignForm.leads) || 0,
      status: campaignForm.status,
      start_date: campaignForm.start_date || new Date().toISOString().split('T')[0]
    };

    const updated = editingCampaign 
      ? adCampaigns.map(c => c.id === editingCampaign.id ? newCamp : c)
      : [...adCampaigns, newCamp];

    setAdCampaigns(updated);
    localStorage.setItem(`ad_campaigns_${restaurantId}`, JSON.stringify(updated));
    cacheData(`ad_campaigns_${restaurantId}`, updated);
    syncMarketingMetadata(updated, retainers, influencers);
    
    toast.success(editingCampaign ? 'تم تحديث الحملة الإعلانية بنجاح' : 'تم إضافة الحملة الإعلانية بنجاح');
    setShowCampaignModal(false);
    setEditingCampaign(null);
    setCampaignForm({ name: '', platform: 'facebook', budget: '', spent: '', clicks: '', leads: '', status: 'active', start_date: '' });
  };

  const handleDeleteCampaign = (id: string) => {
    if (!confirm('هل تريد حذف هذه الحملة الإعلانية؟')) return;
    const updated = adCampaigns.filter(c => c.id !== id);
    setAdCampaigns(updated);
    localStorage.setItem(`ad_campaigns_${restaurantId}`, JSON.stringify(updated));
    cacheData(`ad_campaigns_${restaurantId}`, updated);
    syncMarketingMetadata(updated, retainers, influencers);
    toast.success('تم حذف الحملة الإعلانية');
  };

  // Save/Delete Retainer Contracts
  const handleSaveRetainer = async () => {
    if (!retainerForm.customer_id) return toast.error('يرجى اختيار العميل');
    
    const cust = customers.find(c => c.id === retainerForm.customer_id);
    const newRetainer: RetainerContract = {
      id: editingRetainer ? editingRetainer.id : crypto.randomUUID(),
      customer_id: retainerForm.customer_id,
      customer_name: cust?.name || 'عميل غير معروف',
      monthly_fee: Number(retainerForm.monthly_fee) || 0,
      start_date: retainerForm.start_date || new Date().toISOString().split('T')[0],
      end_date: retainerForm.end_date || '',
      status: retainerForm.status,
      limit_images: 0, // legacy
      limit_designs: Number(retainerForm.limit_designs) || 0,
      limit_videos: Number(retainerForm.limit_videos) || 0,
      limit_posts: Number(retainerForm.limit_posts) || 0,
      consumed_designs: Number(retainerForm.consumed_designs) || 0,
      consumed_videos: Number(retainerForm.consumed_videos) || 0,
      consumed_posts: Number(retainerForm.consumed_posts) || 0
    };

    const updated = editingRetainer
      ? retainers.map(r => r.id === editingRetainer.id ? newRetainer : r)
      : [...retainers, newRetainer];

    // Double-entry accounting link: Post a journal entry for a new active contract
    if (!editingRetainer && newRetainer.monthly_fee > 0) {
      try {
        await journalService.createSalesJournalEntry(
          restaurantId,
          {
            orderId: newRetainer.id,
            orderNumber: `RETAINER-${newRetainer.id.slice(0, 5).toUpperCase()}`,
            amount: newRetainer.monthly_fee,
            paymentMethod: 'credit',
            customerId: newRetainer.customer_id,
            taxAmount: 0
          },
          'retail'
        );
        toast.success('تم إنشاء وترحيل قيد اليومية للاشتراك بنجاح ✅');
      } catch (err) {
        console.error("Accounting automation error:", err);
      }
    }

    setRetainers(updated);
    localStorage.setItem(`retainers_${restaurantId}`, JSON.stringify(updated));
    cacheData(`retainers_${restaurantId}`, updated);
    syncMarketingMetadata(adCampaigns, updated, influencers);

    toast.success(editingRetainer ? 'تم تحديث العقد الشهري' : 'تم إضافة عقد العميل والترحيل المالي');
    setShowRetainerModal(false);
    setEditingRetainer(null);
    setRetainerForm({
      customer_id: '', monthly_fee: '', start_date: '', end_date: '', status: 'active',
      limit_designs: '10', limit_videos: '2', limit_posts: '10',
      consumed_designs: '0', consumed_videos: '0', consumed_posts: '0'
    });
  };

  const handleDeleteRetainer = (id: string) => {
    if (!confirm('هل تريد إلغاء هذا العقد؟')) return;
    const updated = retainers.filter(r => r.id !== id);
    setRetainers(updated);
    localStorage.setItem(`retainers_${restaurantId}`, JSON.stringify(updated));
    cacheData(`retainers_${restaurantId}`, updated);
    syncMarketingMetadata(adCampaigns, updated, influencers);
    toast.success('تم حذف العقد بنجاح');
  };

  // Save/Delete Influencer Bookings
  const handleSaveInfluencer = () => {
    if (!influencerForm.influencer_name.trim()) return toast.error('يرجى إدخال اسم المؤثر');
    
    const newBooking: InfluencerBooking = {
      id: editingInfluencer ? editingInfluencer.id : crypto.randomUUID(),
      influencer_name: influencerForm.influencer_name,
      platform: influencerForm.platform,
      cost: Number(influencerForm.cost) || 0,
      status: influencerForm.status,
      publish_date: influencerForm.publish_date || new Date().toISOString().split('T')[0]
    };

    const updated = editingInfluencer
      ? influencers.map(i => i.id === editingInfluencer.id ? newBooking : i)
      : [...influencers, newBooking];

    setInfluencers(updated);
    localStorage.setItem(`influencers_${restaurantId}`, JSON.stringify(updated));
    cacheData(`influencers_${restaurantId}`, updated);
    syncMarketingMetadata(adCampaigns, retainers, updated);

    toast.success(editingInfluencer ? 'تم تحديث حجز المؤثر' : 'تم تسجيل التعاقد والجدولة بنجاح');
    setShowInfluencerModal(false);
    setEditingInfluencer(null);
    setInfluencerForm({ influencer_name: '', platform: 'instagram', cost: '', status: 'drafting', publish_date: '' });
  };

  const handleDeleteInfluencer = (id: string) => {
    if (!confirm('هل تريد حذف هذا الحجز؟')) return;
    const updated = influencers.filter(i => i.id !== id);
    setInfluencers(updated);
    localStorage.setItem(`influencers_${restaurantId}`, JSON.stringify(updated));
    cacheData(`influencers_${restaurantId}`, updated);
    syncMarketingMetadata(adCampaigns, retainers, updated);
    toast.success('تم الحذف');
  };

  // Save Projects / Tasks
  const handleSaveProject = async () => {
    if (!projForm.name.trim()) return toast.error('أدخل اسم المشروع/الحملة');
    setLoading(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        name: projForm.name,
        estimated_value: Number(projForm.budget) || 0,
        stage: projForm.status === 'completed' ? 'won' : projForm.status === 'on_hold' ? 'lost' : 'negotiation',
        notes: projForm.notes
      };

      if (editingProj) {
        const { error } = await supabase.from('crm_leads').update(payload).eq('id', editingProj.id);
        if (error) throw error;
        toast.success('تم تحديث المشروع');
      } else {
        const { error } = await supabase.from('crm_leads').insert(payload as any);
        if (error) throw error;
        toast.success('تم إضافة المشروع بنجاح');
      }
      setShowProjModal(false);
      setEditingProj(null);
      loadData();
    } catch (e: any) {
      toast.error('حدث خطأ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) return toast.error('أدخل عنوان المهمة');
    setLoading(true);
    try {
      const formattedDesc = formatTaskDescription(
        taskForm.description, 
        taskForm.client_approval, 
        taskForm.preview_url
      );

      const payload = {
        restaurant_id: restaurantId,
        lead_id: taskForm.project_id || null,
        title: taskForm.title,
        description: formattedDesc,
        assigned_to: taskForm.assigned_to || null,
        department_id: taskForm.department_id || null,
        due_date: taskForm.due_date || null,
        priority: taskForm.priority,
        status: taskForm.status
      };

      if (editingTask) {
        const { error } = await supabase.from('crm_tasks').update(payload as any).eq('id', editingTask.id);
        if (error) throw error;
        toast.success('تم تحديث المهمة');
      } else {
        const { error } = await supabase.from('crm_tasks').insert(payload as any);
        if (error) throw error;
        toast.success('تم إضافة المهمة');
      }
      setShowTaskModal(false);
      setEditingTask(null);
      loadData();
    } catch (e: any) {
      toast.error('فشل حفظ المهمة: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProj = async (id: string) => {
    if (!confirm('هل تريد حذف هذا المشروع بالكامل؟')) return;
    await supabase.from('crm_leads').delete().eq('id', id);
    toast.success('تم الحذف');
    loadData();
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('هل تريد حذف هذه المهمة؟')) return;
    await supabase.from('crm_tasks').delete().eq('id', id);
    toast.success('تم حذف المهمة');
    loadData();
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const { error } = await supabase.from('crm_tasks').update({ status } as any).eq('id', taskId);
    if (error) {
      toast.error('خطأ في النقل: ' + error.message);
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    }
  };

  const updateTaskApproval = async (task: ProjectTask, approval: 'pending' | 'approved' | 'rejected') => {
    const formattedDesc = formatTaskDescription(task.description || '', approval, task.preview_url || '');
    const { error } = await supabase.from('crm_tasks').update({ description: formattedDesc } as any).eq('id', task.id);
    if (error) {
      toast.error('خطأ في تحديث الاعتماد: ' + error.message);
    } else {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, client_approval: approval } : t));
      toast.success('تم تحديث حالة اعتماد العميل ✅');
    }
  };

  const openProjEdit = (p: MarketingProject) => {
    setEditingProj(p);
    setProjForm({
      name: p.name, customer_id: p.customer_id || '', budget: String(p.budget), start_date: p.start_date || '', end_date: p.end_date || '', status: p.status, notes: p.notes || ''
    });
    setShowProjModal(true);
  };

  const openTaskEdit = (t: ProjectTask) => {
    setEditingTask(t);
    setTaskForm({
      project_id: t.project_id || '', title: t.title, description: t.description || '', assigned_to: t.assigned_to || '', department_id: t.department_id || '', due_date: t.due_date || '', priority: t.priority, status: t.status,
      client_approval: t.client_approval, preview_url: t.preview_url || ''
    });
    setShowTaskModal(true);
  };

  const statusMap: Record<TaskStatus, { label: string; color: string }> = {
    todo: { label: 'مستحقة', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    in_progress: { label: 'قيد العمل', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    review: { label: 'للمراجعة والاعتماد', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    done: { label: 'مكتملة', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
  };

  const platformColors: Record<string, string> = {
    facebook: 'bg-blue-600 text-white',
    google: 'bg-red-500 text-white',
    tiktok: 'bg-black text-white border-gray-700',
    snapchat: 'bg-yellow-400 text-black',
    instagram: 'bg-pink-600 text-white',
    youtube: 'bg-red-600 text-white',
    other: 'bg-secondary text-secondary-foreground'
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            منظومة إدارة ووكالات التسويق المكاملة (ERP)
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
          </h2>
          <p className="text-xs text-muted-foreground">التخطيط الإداري والمخزون، العقود والاشتراكات والميزانيات الترويجية والربط المحاسبي</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'projects' && (
            <Button variant="outline" size="sm" onClick={() => {
              setEditingProj(null);
              setProjForm({ name: '', customer_id: '', budget: '', start_date: '', end_date: '', status: 'planning', notes: '' });
              setShowProjModal(true);
            }}>
              <Plus className="w-4 h-4 ml-1" /> مشروع جديد
            </Button>
          )}
          {activeTab === 'ad_campaigns' && (
            <Button variant="outline" size="sm" onClick={() => {
              setEditingCampaign(null);
              setCampaignForm({ name: '', platform: 'facebook', budget: '', spent: '', clicks: '', leads: '', status: 'active', start_date: '' });
              setShowCampaignModal(true);
            }}>
              <Plus className="w-4 h-4 ml-1" /> حملة إعلانية جديدة
            </Button>
          )}
          {activeTab === 'retainers' && (
            <Button variant="outline" size="sm" onClick={() => {
              setEditingRetainer(null);
              setRetainerForm({
                customer_id: '', monthly_fee: '', start_date: '', end_date: '', status: 'active',
                limit_designs: '10', limit_videos: '2', limit_posts: '10',
                consumed_designs: '0', consumed_videos: '0', consumed_posts: '0'
              });
              setShowRetainerModal(true);
            }}>
              <Plus className="w-4 h-4 ml-1" /> عقد اشتراك جديد
            </Button>
          )}
          {activeTab === 'influencers' && (
            <Button variant="outline" size="sm" onClick={() => {
              setEditingInfluencer(null);
              setInfluencerForm({ influencer_name: '', platform: 'instagram', cost: '', status: 'drafting', publish_date: '' });
              setShowInfluencerModal(true);
            }}>
              <Plus className="w-4 h-4 ml-1" /> حجز مؤثر جديد
            </Button>
          )}
          <Button size="sm" onClick={() => {
            setEditingTask(null);
            setTaskForm({ project_id: '', title: '', description: '', assigned_to: '', department_id: '', due_date: '', priority: 'medium', status: 'todo', client_approval: 'pending', preview_url: '' });
            setShowTaskModal(true);
          }} className="gradient-bg text-white border-0">
            <CheckSquare className="w-4 h-4 ml-1" /> إضافة مهمة للفريق
          </Button>
        </div>
      </div>

      {/* Projects Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border border-primary/10 glass-card">
          <p className="text-xs text-muted-foreground">العقود المستمرة (Retainers)</p>
          <p className="text-2xl font-bold text-primary">{retainers.filter(r => r.status === 'active').length}</p>
        </Card>
        <Card className="p-4 border border-primary/10 glass-card">
          <p className="text-xs text-muted-foreground">إنفاق الميديا باي الكلي</p>
          <p className="text-2xl font-bold text-amber-600">
            {adCampaigns.reduce((sum, c) => sum + c.spent, 0).toLocaleString()} {currency}
          </p>
        </Card>
        <Card className="p-4 border border-primary/10 glass-card">
          <p className="text-xs text-muted-foreground">حجوزات المؤثرين المنشورة</p>
          <p className="text-2xl font-bold text-emerald-600">{influencers.filter(i => i.status === 'posted').length}</p>
        </Card>
        <Card className="p-4 border border-primary/10 glass-card">
          <p className="text-xs text-muted-foreground">العملاء المحتملين من الإعلانات</p>
          <p className="text-2xl font-bold">{adCampaigns.reduce((sum, c) => sum + c.leads, 0).toLocaleString()} عميل</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1 h-auto bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger value="board" className="text-xs py-2">لوحة المهام (Kanban)</TabsTrigger>
          <TabsTrigger value="projects" className="text-xs py-2">المشاريع والحملات</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs py-2">جدول المهام</TabsTrigger>
          <TabsTrigger value="ad_campaigns" className="text-xs py-2">الحملات الإعلانية</TabsTrigger>
          <TabsTrigger value="retainers" className="text-xs py-2">العقود والاشتراكات</TabsTrigger>
          <TabsTrigger value="influencers" className="text-xs py-2">حجوزات المؤثرين</TabsTrigger>
        </TabsList>

        {/* Board View */}
        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[500px]">
            {(['todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map(statusKey => {
              const columnTasks = tasks.filter(t => t.status === statusKey);
              const columnInfo = statusMap[statusKey];
              return (
                <div key={statusKey} className="bg-secondary/30 rounded-2xl p-4 flex flex-col gap-3 border border-border/50">
                  <div className={`px-3 py-2 rounded-xl text-xs font-bold border flex justify-between items-center ${columnInfo.color}`}>
                    <span>{columnInfo.label}</span>
                    <Badge variant="outline" className="border-0">{columnTasks.length}</Badge>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar">
                    {columnTasks.map(task => (
                      <Card key={task.id} className="p-4 hover:shadow-lg transition-all border-border/60 hover:border-primary/20 relative group">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="font-bold text-xs leading-snug">{task.title}</h4>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                            <Button size="xs" variant="ghost" className="h-6 w-6 p-0" onClick={() => openTaskEdit(task)}>
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                            <Button size="xs" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{task.description}</p>
                        )}

                        {/* Client Approval status inside card */}
                        {task.status === 'review' && (
                          <div className="bg-secondary/40 p-2 rounded-lg mb-2 text-[10px] flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> اعتماد العميل:</span>
                            <div className="flex items-center gap-1">
                              <select 
                                value={task.client_approval}
                                onChange={(e) => updateTaskApproval(task, e.target.value as any)}
                                className="bg-background border rounded px-1 text-[9px] h-5"
                              >
                                <option value="pending">قيد الانتظار</option>
                                <option value="approved">مقبول وعماد</option>
                                <option value="rejected">مرفوض/تعديل</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {task.preview_url && (
                          <a href={task.preview_url} target="_blank" rel="noopener noreferrer" 
                            className="text-[9px] text-primary hover:underline flex items-center gap-1 mb-2 font-bold">
                            <LinkIcon className="w-3 h-3" /> معاينة العمل الفني/المخرجات <ExternalLink className="w-2 h-2" />
                          </a>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap mb-3">
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/20 text-primary">
                            📁 {task.project_name}
                          </Badge>
                          {task.department_name && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-purple-200 text-purple-600 bg-purple-50">
                              ⚙️ {task.department_name}
                            </Badge>
                          )}
                          <Badge className={`text-[8px] py-0 px-1 ${task.priority === 'high' ? 'bg-red-500/10 text-red-600' : task.priority === 'medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                            {task.priority === 'high' ? 'عالي' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center border-t pt-2 mt-2">
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            <User className="w-3 h-3 text-primary" />
                            <span className="font-medium truncate max-w-[80px]">{task.assigned_name}</span>
                          </div>
                          {task.due_date && (
                            <div className="flex items-center gap-1 text-[9px] text-destructive/80 font-bold">
                              <Clock className="w-3 h-3" />
                              <span>{task.due_date}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons to move task */}
                        <div className="flex gap-1 mt-3 justify-end border-t pt-2">
                          {statusKey !== 'todo' && (
                            <Button size="xs" variant="ghost" className="text-[9px] h-6" onClick={() => {
                              const steps: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
                              const idx = steps.indexOf(statusKey);
                              updateTaskStatus(task.id, steps[idx - 1]);
                            }}>السابق</Button>
                          )}
                          {statusKey !== 'done' && (
                            <Button size="xs" variant="ghost" className="text-[9px] h-6 text-primary" onClick={() => {
                              const steps: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
                              const idx = steps.indexOf(statusKey);
                              updateTaskStatus(task.id, steps[idx + 1]);
                            }}>نقل للتالي</Button>
                          )}
                        </div>
                      </Card>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-12 text-xs text-muted-foreground border-2 border-dashed rounded-xl opacity-40">لا توجد مهام</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Projects View */}
        <TabsContent value="projects" className="mt-4">
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="p-3">اسم المشروع / الحملة</th>
                  <th className="p-3">الميزانية التقديرية</th>
                  <th className="p-3">تاريخ البدء</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">المهام</th>
                  <th className="p-3 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {projects.map(proj => (
                  <tr key={proj.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <p className="font-bold">{proj.name}</p>
                      {proj.notes && <p className="text-[10px] text-muted-foreground">{proj.notes}</p>}
                    </td>
                    <td className="p-3 font-bold text-primary">{proj.budget.toLocaleString()} {currency}</td>
                    <td className="p-3 text-xs text-muted-foreground">{proj.start_date || '-'}</td>
                    <td className="p-3">
                      <Badge className={proj.status === 'active' ? 'bg-emerald-500' : proj.status === 'completed' ? 'bg-blue-500' : 'bg-muted text-muted-foreground'}>
                        {proj.status === 'active' ? 'نشط' : proj.status === 'completed' ? 'مكتمل' : 'قيد التخطيط'}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs">
                      <span>{tasks.filter(t => t.project_id === proj.id && t.status === 'done').length} / {tasks.filter(t => t.project_id === proj.id).length} منجز</span>
                    </td>
                    <td className="p-3 text-left">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openProjEdit(proj)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteProj(proj.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد مشاريع مضافة حالياً</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tasks Table View */}
        <TabsContent value="tasks" className="mt-4">
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="p-3">المهمة</th>
                  <th className="p-3">المشروع</th>
                  <th className="p-3">القسم المسؤول</th>
                  <th className="p-3">الموظف المعين</th>
                  <th className="p-3">تاريخ الاستحقاق</th>
                  <th className="p-3">الأولوية</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <p className="font-bold">{task.title}</p>
                      {task.description && <p className="text-[10px] text-muted-foreground">{task.description}</p>}
                    </td>
                    <td className="p-3 text-xs text-primary font-medium">{task.project_name}</td>
                    <td className="p-3 text-xs">{task.department_name}</td>
                    <td className="p-3 text-xs font-medium">{task.assigned_name}</td>
                    <td className="p-3 text-xs text-destructive/80 font-bold">{task.due_date || '-'}</td>
                    <td className="p-3">
                      <Badge className={task.priority === 'high' ? 'bg-red-500/10 text-red-600' : task.priority === 'medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}>
                        {task.priority === 'high' ? 'عالي' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={statusMap[task.status]?.color}>
                        {statusMap[task.status]?.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-left">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openTaskEdit(task)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteTask(task.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد مهام حالياً</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Ad Campaigns Tracker View */}
        <TabsContent value="ad_campaigns" className="mt-4 space-y-4">
          {/* Custom spend visual chart */}
          <Card className="p-4 border border-primary/10 glass-card">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-primary" /> نسبة الإنفاق حسب المنصة الإعلانية</h3>
            <div className="space-y-3">
              {['facebook', 'google', 'tiktok', 'snapchat', 'other'].map(platformKey => {
                const platformCampaigns = adCampaigns.filter(c => c.platform === platformKey);
                const platformSpent = platformCampaigns.reduce((sum, c) => sum + c.spent, 0);
                const totalSpent = adCampaigns.reduce((sum, c) => sum + c.spent, 0) || 1;
                const percentage = Math.round((platformSpent / totalSpent) * 100);
                
                return (
                  <div key={platformKey} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="capitalize">{platformKey}</span>
                      <span>{platformSpent.toLocaleString()} {currency} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-secondary/80 h-3 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full ${platformColors[platformKey] || 'bg-slate-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Ad Campaigns Table */}
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="p-3">الحملة الإعلانية</th>
                  <th className="p-3">المنصة</th>
                  <th className="p-3">الميزانية</th>
                  <th className="p-3">المنصرف الفعلي</th>
                  <th className="p-3">النقرات</th>
                  <th className="p-3">العملاء (Leads)</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {adCampaigns.map(camp => {
                  const leadCost = camp.leads > 0 ? (camp.spent / camp.leads).toFixed(1) : '-';
                  return (
                    <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-bold">{camp.name}</td>
                      <td className="p-3">
                        <Badge className={`text-[10px] ${platformColors[camp.platform]}`}>
                          {camp.platform}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{camp.budget.toLocaleString()} {currency}</td>
                      <td className="p-3 font-bold text-amber-600">{camp.spent.toLocaleString()} {currency}</td>
                      <td className="p-3 text-xs">{camp.clicks.toLocaleString()}</td>
                      <td className="p-3 text-xs font-bold text-emerald-600">
                        {camp.leads.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">(كلفة العميل: {leadCost})</span>
                      </td>
                      <td className="p-3">
                        <Badge className={camp.status === 'active' ? 'bg-emerald-500' : 'bg-muted text-muted-foreground'}>
                          {camp.status === 'active' ? 'نشطة' : 'متوقفة'}
                        </Badge>
                      </td>
                      <td className="p-3 text-left">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setEditingCampaign(camp);
                            setCampaignForm({
                              name: camp.name, platform: camp.platform, budget: String(camp.budget), spent: String(camp.spent), clicks: String(camp.clicks), leads: String(camp.leads), status: camp.status
                            });
                            setShowCampaignModal(true);
                          }}><Edit2 className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteCampaign(camp.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {adCampaigns.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد حملات ترويجية مضافة حالياً</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Retainers Contracts View */}
        <TabsContent value="retainers" className="mt-4 space-y-4">
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="p-3">العميل</th>
                  <th className="p-3">الاشتراك الشهري</th>
                  <th className="p-3">الاستهلاك والحدود (تصاميم | فيديوهات | منشورات)</th>
                  <th className="p-3">تاريخ التجديد</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {retainers.map(ret => {
                  const designPercent = ret.limit_designs > 0 ? Math.round((ret.consumed_designs / ret.limit_designs) * 100) : 0;
                  const videoPercent = ret.limit_videos > 0 ? Math.round((ret.consumed_videos / ret.limit_videos) * 100) : 0;
                  const postPercent = ret.limit_posts > 0 ? Math.round((ret.consumed_posts / ret.limit_posts) * 100) : 0;
                  
                  return (
                    <tr key={ret.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <p className="font-bold">{ret.customer_name}</p>
                        <p className="text-[10px] text-muted-foreground">تاريخ البدء: {ret.start_date}</p>
                      </td>
                      <td className="p-3 font-black text-emerald-600">{ret.monthly_fee.toLocaleString()} {currency} /شهرياً</td>
                      <td className="p-3 space-y-2 max-w-xs">
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                            <span>تصاميم: {ret.consumed_designs} / {ret.limit_designs}</span>
                            <span>{designPercent}%</span>
                          </div>
                          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, designPercent)}%` }} />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                            <span>فيديوهات: {ret.consumed_videos} / {ret.limit_videos}</span>
                            <span>{videoPercent}%</span>
                          </div>
                          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                            <div className="bg-pink-500 h-full" style={{ width: `${Math.min(100, videoPercent)}%` }} />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                            <span>منشورات: {ret.consumed_posts} / {ret.limit_posts}</span>
                            <span>{postPercent}%</span>
                          </div>
                          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, postPercent)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs">{ret.end_date || '-'}</td>
                      <td className="p-3">
                        <Badge className={ret.status === 'active' ? 'bg-emerald-500' : 'bg-muted text-muted-foreground'}>
                          {ret.status === 'active' ? 'نشط' : 'ملغى'}
                        </Badge>
                      </td>
                      <td className="p-3 text-left">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setEditingRetainer(ret);
                            setRetainerForm({
                              customer_id: ret.customer_id,
                              monthly_fee: String(ret.monthly_fee),
                              start_date: ret.start_date,
                              end_date: ret.end_date,
                              status: ret.status,
                              limit_designs: String(ret.limit_designs),
                              limit_videos: String(ret.limit_videos),
                              limit_posts: String(ret.limit_posts),
                              consumed_designs: String(ret.consumed_designs),
                              consumed_videos: String(ret.consumed_videos),
                              consumed_posts: String(ret.consumed_posts)
                            });
                            setShowRetainerModal(true);
                          }}><Edit2 className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRetainer(ret.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {retainers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد عقود ريتينر نشطة حالياً</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Influencers Booking View */}
        <TabsContent value="influencers" className="mt-4">
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="p-3">اسم المؤثر</th>
                  <th className="p-3">المنصة</th>
                  <th className="p-3">كلفة الحجز</th>
                  <th className="p-3">تاريخ النشر المستهدف</th>
                  <th className="p-3">حالة المحتوى</th>
                  <th className="p-3 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {influencers.map(inf => (
                  <tr key={inf.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-bold">{inf.influencer_name}</td>
                    <td className="p-3">
                      <Badge className={`text-[10px] ${platformColors[inf.platform] || 'bg-slate-400'}`}>
                        {inf.platform}
                      </Badge>
                    </td>
                    <td className="p-3 font-black text-primary">{inf.cost.toLocaleString()} {currency}</td>
                    <td className="p-3 text-xs text-muted-foreground">{inf.publish_date || '-'}</td>
                    <td className="p-3">
                      <Badge className={
                        inf.status === 'posted' ? 'bg-emerald-500' :
                        inf.status === 'editing' ? 'bg-purple-500' :
                        inf.status === 'shooting' ? 'bg-amber-500' : 'bg-slate-400'
                      }>
                        {
                          inf.status === 'posted' ? 'تم النشر' :
                          inf.status === 'editing' ? 'قيد المونتاج' :
                          inf.status === 'shooting' ? 'قيد التصوير' : 'مسودة سيناريو'
                        }
                      </Badge>
                    </td>
                    <td className="p-3 text-left">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingInfluencer(inf);
                          setInfluencerForm({
                            influencer_name: inf.influencer_name, platform: inf.platform, cost: String(inf.cost), status: inf.status, publish_date: inf.publish_date
                          });
                          setShowInfluencerModal(true);
                        }}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteInfluencer(inf.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {influencers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد تعاقدات مع مؤثرين حالياً</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Campaign Modal */}
      <Dialog open={showCampaignModal} onOpenChange={setShowCampaignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingCampaign ? 'تعديل الحملة الإعلانية' : 'إضافة حملة ميديا باي جديدة'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>اسم الحملة الإعلانية *</Label>
              <Input value={campaignForm.name} onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="مثال: حملة الوعي بالخريف" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المنصة الإعلانية</Label>
                <select value={campaignForm.platform} onChange={e => setCampaignForm({ ...campaignForm, platform: e.target.value as any })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="facebook">Facebook / Instagram</option>
                  <option value="google">Google Ads</option>
                  <option value="tiktok">TikTok Ads</option>
                  <option value="snapchat">Snapchat Ads</option>
                  <option value="other">منصة أخرى</option>
                </select>
              </div>
              <div>
                <Label>الميزانية الكلية</Label>
                <Input type="number" value={campaignForm.budget} onChange={e => setCampaignForm({ ...campaignForm, budget: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>الإنفاق الفعلي</Label>
                <Input type="number" value={campaignForm.spent} onChange={e => setCampaignForm({ ...campaignForm, spent: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>النقرات</Label>
                <Input type="number" value={campaignForm.clicks} onChange={e => setCampaignForm({ ...campaignForm, clicks: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>العملاء (Leads)</Label>
                <Input type="number" value={campaignForm.leads} onChange={e => setCampaignForm({ ...campaignForm, leads: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ البدء</Label>
                <Input type="date" value={campaignForm.start_date} onChange={e => setCampaignForm({ ...campaignForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>الحالة</Label>
                <select value={campaignForm.status} onChange={e => setCampaignForm({ ...campaignForm, status: e.target.value as any })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="active">نشطة</option>
                  <option value="paused">متوقفة مؤقتاً</option>
                  <option value="completed">مكتملة</option>
                </select>
              </div>
            </div>
            <Button className="w-full gradient-bg text-white border-0 mt-2" onClick={handleSaveCampaign}>
              {editingCampaign ? 'حفظ التعديلات' : 'إضافة الحملة وتثبيتها'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Retainer Modal */}
      <Dialog open={showRetainerModal} onOpenChange={setShowRetainerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingRetainer ? 'تعديل عقد العميل' : 'تسجيل عقد اشتراك ريتينر شهري'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>اختر العميل *</Label>
              <select value={retainerForm.customer_id} onChange={e => setRetainerForm({ ...retainerForm, customer_id: e.target.value })}
                disabled={!!editingRetainer} className="w-full h-10 rounded-md border px-3 bg-background">
                <option value="">اختر من قائمة عملاء CRM...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الاشتراك الشهري (الفاتورة)</Label>
                <Input type="number" value={retainerForm.monthly_fee} onChange={e => setRetainerForm({ ...retainerForm, monthly_fee: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>الحالة</Label>
                <select value={retainerForm.status} onChange={e => setRetainerForm({ ...retainerForm, status: e.target.value as any })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="active">نشط</option>
                  <option value="expired">منتهي</option>
                  <option value="suspended">موقوف مؤقتاً</option>
                </select>
              </div>
            </div>
            <div className="border p-3 rounded-lg space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground border-b pb-1">الحدود الشهرية المتفق عليها:</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>عدد التصاميم</Label>
                  <Input type="number" value={retainerForm.limit_designs} onChange={e => setRetainerForm({ ...retainerForm, limit_designs: e.target.value })} />
                </div>
                <div>
                  <Label>عدد الفيديو</Label>
                  <Input type="number" value={retainerForm.limit_videos} onChange={e => setRetainerForm({ ...retainerForm, limit_videos: e.target.value })} />
                </div>
                <div>
                  <Label>عدد المنشورات</Label>
                  <Input type="number" value={retainerForm.limit_posts} onChange={e => setRetainerForm({ ...retainerForm, limit_posts: e.target.value })} />
                </div>
              </div>
            </div>
            {editingRetainer && (
              <div className="border p-3 rounded-lg space-y-2 bg-secondary/20">
                <h4 className="text-xs font-bold text-muted-foreground border-b pb-1">الخدمات المستهلكة هذا الشهر:</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>المستهلك تصاميم</Label>
                    <Input type="number" value={retainerForm.consumed_designs} onChange={e => setRetainerForm({ ...retainerForm, consumed_designs: e.target.value })} />
                  </div>
                  <div>
                    <Label>المستهلك فيديو</Label>
                    <Input type="number" value={retainerForm.consumed_videos} onChange={e => setRetainerForm({ ...retainerForm, consumed_videos: e.target.value })} />
                  </div>
                  <div>
                    <Label>المستهلك منشورات</Label>
                    <Input type="number" value={retainerForm.consumed_posts} onChange={e => setRetainerForm({ ...retainerForm, consumed_posts: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ البدء</Label>
                <Input type="date" value={retainerForm.start_date} onChange={e => setRetainerForm({ ...retainerForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>تاريخ التجديد/الانتهاء</Label>
                <Input type="date" value={retainerForm.end_date} onChange={e => setRetainerForm({ ...retainerForm, end_date: e.target.value })} />
              </div>
            </div>
            <Button className="w-full gradient-bg text-white border-0 mt-2" onClick={handleSaveRetainer}>
              {editingRetainer ? 'تحديث العقد ومتابعة الفواتير' : 'حفظ العقد والترحيل المحاسبي'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Influencer Modal */}
      <Dialog open={showInfluencerModal} onOpenChange={setShowInfluencerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingInfluencer ? 'تعديل تعاقد المؤثر' : 'حجز مؤثر جديد وجدولة النشر'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>اسم المؤثر / صانع المحتوى *</Label>
              <Input value={influencerForm.influencer_name} onChange={e => setInfluencerForm({ ...influencerForm, influencer_name: e.target.value })} placeholder="مثال: أحمد عبد الله" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>منصة النشر الأساسية</Label>
                <select value={influencerForm.platform} onChange={e => setInfluencerForm({ ...influencerForm, platform: e.target.value as any })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="instagram">Instagram Reels</option>
                  <option value="tiktok">TikTok Video</option>
                  <option value="youtube">YouTube Video</option>
                  <option value="other">منصة أخرى</option>
                </select>
              </div>
              <div>
                <Label>كلفة الحجز الفعلي</Label>
                <Input type="number" value={influencerForm.cost} onChange={e => setInfluencerForm({ ...influencerForm, cost: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ النشر المستهدف</Label>
                <Input type="date" value={influencerForm.publish_date} onChange={e => setInfluencerForm({ ...influencerForm, publish_date: e.target.value })} />
              </div>
              <div>
                <Label>حالة إنتاج المحتوى</Label>
                <select value={influencerForm.status} onChange={e => setInfluencerForm({ ...influencerForm, status: e.target.value as any })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="drafting">مسودة سيناريو</option>
                  <option value="shooting">قيد التصوير</option>
                  <option value="editing">قيد المونتاج والتعديل</option>
                  <option value="posted">تم النشر والمشاركة</option>
                </select>
              </div>
            </div>
            <Button className="w-full gradient-bg text-white border-0 mt-2" onClick={handleSaveInfluencer}>
              {editingInfluencer ? 'تعديل الجدول' : 'جدولة وتثبيت التعاقد'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Modal */}
      <Dialog open={showProjModal} onOpenChange={setShowProjModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingProj ? 'تعديل المشروع/الحملة' : 'مشروع تسويقي جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>اسم المشروع/الحملة *</Label>
              <Input value={projForm.name} onChange={e => setProjForm({ ...projForm, name: e.target.value })} placeholder="مثال: حملة رمضان الإعلانية" />
            </div>
            <div>
              <Label>الميزانية المقدرة</Label>
              <Input type="number" value={projForm.budget} onChange={e => setProjForm({ ...projForm, budget: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>حالة المشروع</Label>
              <select value={projForm.status} onChange={e => setProjForm({ ...projForm, status: e.target.value as ProjectStatus })}
                className="w-full h-10 rounded-md border px-3 bg-background">
                <option value="planning">قيد التخطيط</option>
                <option value="active">نشط</option>
                <option value="completed">مكتمل</option>
                <option value="on_hold">متوقف</option>
              </select>
            </div>
            <div>
              <Label>ملاحظات وتفاصيل</Label>
              <textarea value={projForm.notes} onChange={e => setProjForm({ ...projForm, notes: e.target.value })}
                className="w-full min-h-[80px] rounded-md border p-3 bg-background text-sm" placeholder="أهداف المشروع أو المخرجات المطلوبة..." />
            </div>
            <Button className="w-full gradient-bg text-white border-0" onClick={handleSaveProject}>
              {editingProj ? 'تحديث المشروع' : 'حفظ المشروع الجديد'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة للفريق'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المشروع / الحملة</Label>
                <select value={taskForm.project_id} onChange={e => setTaskForm({ ...taskForm, project_id: e.target.value })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="">بدون مشروع (مهمة عامة)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label>القسم المسؤول</Label>
                <select value={taskForm.department_id} onChange={e => setTaskForm({ ...taskForm, department_id: e.target.value })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="">عام / إداري</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <Label>عنوان المهمة *</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="مثال: تصميم الهوية البصرية" />
            </div>

            <div>
              <Label>الوصف والتفاصيل</Label>
              <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                className="w-full min-h-[80px] rounded-md border p-3 bg-background text-sm" placeholder="اكتب المخرجات والخطوات المطلوبة بالتفصيل..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الموظف المسؤول</Label>
                <select value={taskForm.assigned_to} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="">غير معين</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-secondary/10 p-3 rounded-lg border border-border/50">
              <div>
                <Label>طلب اعتماد العميل</Label>
                <select value={taskForm.client_approval} onChange={e => setTaskForm({ ...taskForm, client_approval: e.target.value as any })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="pending">قيد الانتظار</option>
                  <option value="approved">مقبول ومعتمد</option>
                  <option value="rejected">مرفوض/يطلب تعديل</option>
                </select>
              </div>
              <div>
                <Label>رابط معاينة العمل الفني</Label>
                <Input value={taskForm.preview_url} onChange={e => setTaskForm({ ...taskForm, preview_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الأولوية</Label>
                <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                </select>
              </div>
              <div>
                <Label>حالة المهمة</Label>
                <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
                  className="w-full h-10 rounded-md border px-3 bg-background">
                  <option value="todo">مستحقة</option>
                  <option value="in_progress">قيد العمل</option>
                  <option value="review">للمراجعة والاعتماد</option>
                  <option value="done">مكتملة</option>
                </select>
              </div>
            </div>

            <Button className="w-full gradient-bg text-white border-0" onClick={handleSaveTask}>
              {editingTask ? 'تحديث المهمة' : 'حفظ وإرسال المهمة للفريق'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
