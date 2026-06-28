// @ts-nocheck
import { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, Edit2, Trash2, Clock, CheckCircle, 
  ArrowRight, Play, Pause, ChevronRight, ChevronDown,
  FileText, MessageSquare, Upload, Download, Eye,
  Calendar, DollarSign, Users, BarChart3, Settings,
  RefreshCw, AlertCircle, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WorkflowStage {
  id: string;
  stage_key: string;
  stage_name_ar: string;
  stage_name_en: string;
  description: string;
  order_index: number;
  default_duration_hours: number;
  requires_approval: boolean;
  is_active: boolean;
}

interface WorkflowInstance {
  id: string;
  lead_id?: string;
  quote_id?: string;
  contract_id?: string;
  workflow_name: string;
  current_stage_id: string;
  status: string;
  priority: string;
  start_date: string;
  expected_end_date: string;
  actual_end_date?: string;
  total_budget: number;
  total_spent: number;
  progress_percentage: number;
  notes: string;
  current_stage?: WorkflowStage;
}

interface WorkflowTask {
  id: string;
  workflow_instance_id: string;
  stage_id: string;
  title: string;
  description: string;
  assigned_to?: string;
  assigned_name?: string;
  department_id?: string;
  department_name?: string;
  priority: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  estimated_hours: number;
  actual_hours: number;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function MarketingWorkflow({ restaurantId, currency }: Props) {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('instances');

  // Modals
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<WorkflowInstance | null>(null);
  const [editingTask, setEditingTask] = useState<WorkflowTask | null>(null);

  // Forms
  const [instanceForm, setInstanceForm] = useState({
    workflow_name: '',
    lead_id: '',
    quote_id: '',
    contract_id: '',
    priority: 'medium',
    expected_end_date: '',
    total_budget: '',
    notes: ''
  });

  const [taskForm, setTaskForm] = useState({
    workflow_instance_id: '',
    stage_id: '',
    title: '',
    description: '',
    assigned_to: '',
    department_id: '',
    priority: 'medium',
    due_date: '',
    estimated_hours: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [stagesRes, instancesRes, tasksRes, staffRes, deptRes] = await Promise.all([
        supabase.from('marketing_workflow_stages').select('*').eq('restaurant_id', restaurantId).order('order_index'),
        supabase.from('marketing_workflow_instances').select('*, marketing_workflow_stages(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('marketing_workflow_tasks').select('*').eq('workflow_instance_id', 'in', (instances.map(i => i.id).join(','))),
        supabase.from('staff_profiles').select('id, full_name, position').eq('restaurant_id', restaurantId),
        supabase.from('staff_departments').select('id, name').eq('restaurant_id', restaurantId)
      ]);

      setStages(stagesRes.data || []);
      
      // Map current stage from the nested data
      const mappedInstances = (instancesRes.data || []).map((inst: any) => ({
        ...inst,
        current_stage: inst.marketing_workflow_stages
      }));
      setInstances(mappedInstances);
      
      // Map tasks with staff and department names
      const mappedTasks = (tasksRes.data || []).map((task: any) => {
        const staffMember = (staffRes.data || []).find((s: any) => s.id === task.assigned_to);
        const dept = (deptRes.data || []).find((d: any) => d.id === task.department_id);
        return {
          ...task,
          assigned_name: staffMember?.full_name || 'غير معين',
          department_name: dept?.name || 'عام'
        };
      });
      setTasks(mappedTasks);
      
      setStaff(staffRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (e: any) {
      toast.error('خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const handleSaveInstance = async () => {
    if (!instanceForm.workflow_name.trim()) {
      toast.error('يرجى إدخال اسم سير العمل');
      return;
    }
    setLoading(true);
    try {
      const firstStage = stages.find(s => s.order_index === 1);
      
      const payload = {
        restaurant_id: restaurantId,
        workflow_name: instanceForm.workflow_name,
        lead_id: instanceForm.lead_id || null,
        quote_id: instanceForm.quote_id || null,
        contract_id: instanceForm.contract_id || null,
        current_stage_id: firstStage?.id || null,
        priority: instanceForm.priority,
        expected_end_date: instanceForm.expected_end_date || null,
        total_budget: Number(instanceForm.total_budget) || 0,
        notes: instanceForm.notes
      };

      if (editingInstance) {
        const { error } = await supabase.from('marketing_workflow_instances').update(payload).eq('id', editingInstance.id);
        if (error) throw error;
        toast.success('تم تحديث سير العمل');
      } else {
        const { error } = await supabase.from('marketing_workflow_instances').insert(payload as any);
        if (error) throw error;
        toast.success('تم إنشاء سير العمل الجديد');
      }
      
      setShowInstanceModal(false);
      setEditingInstance(null);
      resetInstanceForm();
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      toast.error('يرجى إدخال عنوان المهمة');
      return;
    }
    if (!taskForm.workflow_instance_id) {
      toast.error('يرجى اختيار سير العمل');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        workflow_instance_id: taskForm.workflow_instance_id,
        stage_id: taskForm.stage_id || null,
        title: taskForm.title,
        description: taskForm.description,
        assigned_to: taskForm.assigned_to || null,
        department_id: taskForm.department_id || null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        estimated_hours: Number(taskForm.estimated_hours) || 0
      };

      if (editingTask) {
        const { error } = await supabase.from('marketing_workflow_tasks').update(payload).eq('id', editingTask.id);
        if (error) throw error;
        toast.success('تم تحديث المهمة');
      } else {
        const { error } = await supabase.from('marketing_workflow_tasks').insert(payload as any);
        if (error) throw error;
        toast.success('تم إضافة المهمة');
      }
      
      setShowTaskModal(false);
      setEditingTask(null);
      resetTaskForm();
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionStage = async (instance: WorkflowInstance, direction: 'next' | 'previous') => {
    try {
      const currentStageIndex = stages.findIndex(s => s.id === instance.current_stage_id);
      let newStageIndex;
      
      if (direction === 'next') {
        newStageIndex = currentStageIndex + 1;
      } else {
        newStageIndex = currentStageIndex - 1;
      }
      
      if (newStageIndex < 0 || newStageIndex >= stages.length) {
        toast.error('لا يمكن الانتقال إلى هذه المرحلة');
        return;
      }
      
      const newStage = stages[newStageIndex];
      
      // Record stage history
      await supabase.from('marketing_workflow_stage_history').insert({
        workflow_instance_id: instance.id,
        from_stage_id: instance.current_stage_id,
        to_stage_id: newStage.id,
        transitioned_by: (await supabase.auth.getUser()).data.user?.id,
        notes: `انتقال من ${instance.current_stage?.stage_name_ar} إلى ${newStage.stage_name_ar}`
      } as any);
      
      // Update current stage
      const { error } = await supabase.from('marketing_workflow_instances').update({
        current_stage_id: newStage.id,
        progress_percentage: Math.round((newStageIndex / (stages.length - 1)) * 100)
      }).eq('id', instance.id);
      
      if (error) throw error;
      
      toast.success(`تم الانتقال إلى مرحلة ${newStage.stage_name_ar}`);
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الانتقال: ' + e.message);
    }
  };

  const resetInstanceForm = () => {
    setInstanceForm({
      workflow_name: '',
      lead_id: '',
      quote_id: '',
      contract_id: '',
      priority: 'medium',
      expected_end_date: '',
      total_budget: '',
      notes: ''
    });
  };

  const resetTaskForm = () => {
    setTaskForm({
      workflow_instance_id: '',
      stage_id: '',
      title: '',
      description: '',
      assigned_to: '',
      department_id: '',
      priority: 'medium',
      due_date: '',
      estimated_hours: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'on_hold': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-blue-100 text-blue-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            سيستم العمليات التسويقية
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة سير العمل التسويقي الكامل من الطلب إلى التسليم</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'instances' && (
            <Button variant="outline" size="sm" onClick={() => {
              setEditingInstance(null);
              resetInstanceForm();
              setShowInstanceModal(true);
            }}>
              <Plus className="w-4 h-4 ml-1" /> سير عمل جديد
            </Button>
          )}
          {activeTab === 'tasks' && (
            <Button variant="outline" size="sm" onClick={() => {
              setEditingTask(null);
              resetTaskForm();
              setShowTaskModal(true);
            }}>
              <Plus className="w-4 h-4 ml-1" /> مهمة جديدة
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">سير العمل النشط</p>
          <p className="text-2xl font-bold text-primary">{instances.filter(i => i.status === 'active').length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">المكتملة</p>
          <p className="text-2xl font-bold text-emerald-600">{instances.filter(i => i.status === 'completed').length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">المهام المفتوحة</p>
          <p className="text-2xl font-bold">{tasks.filter(t => t.status !== 'done').length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">إجمالي الميزانيات</p>
          <p className="text-2xl font-bold">{instances.reduce((sum, i) => sum + i.total_budget, 0).toLocaleString()} {currency}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 gap-1 h-auto bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger value="instances" className="text-xs py-2">سير العمل</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs py-2">المهام</TabsTrigger>
          <TabsTrigger value="stages" className="text-xs py-2">المراحل</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs py-2">الجدول الزمني</TabsTrigger>
        </TabsList>

        {/* Workflow Instances */}
        <TabsContent value="instances" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances.map(instance => (
              <Card key={instance.id} className="p-5 hover:shadow-lg transition-all border-border/60">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{instance.workflow_name}</h3>
                      <Badge className={getStatusColor(instance.status)}>
                        {instance.status === 'active' ? 'نشط' : instance.status === 'completed' ? 'مكتمل' : instance.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{instance.current_stage?.stage_name_ar || 'غير محدد'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingInstance(instance);
                      setInstanceForm({
                        workflow_name: instance.workflow_name,
                        lead_id: instance.lead_id || '',
                        quote_id: instance.quote_id || '',
                        contract_id: instance.contract_id || '',
                        priority: instance.priority,
                        expected_end_date: instance.expected_end_date || '',
                        total_budget: String(instance.total_budget),
                        notes: instance.notes || ''
                      });
                      setShowInstanceModal(true);
                    }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">التقدم</span>
                    <span className="font-bold">{instance.progress_percentage}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${instance.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Stage Navigation */}
                <div className="flex items-center gap-2 mb-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTransitionStage(instance, 'previous')}
                    disabled={!stages.find(s => s.id === instance.current_stage_id) || stages.findIndex(s => s.id === instance.current_stage_id) === 0}
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </Button>
                  <div className="flex-1">
                    <div className="flex gap-1 overflow-x-auto">
                      {stages.map(stage => (
                        <div 
                          key={stage.id}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            stage.id === instance.current_stage_id 
                              ? 'bg-primary text-white' 
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {stage.order_index}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTransitionStage(instance, 'next')}
                    disabled={!stages.find(s => s.id === instance.current_stage_id) || stages.findIndex(s => s.id === instance.current_stage_id) === stages.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border/40">
                  <div>
                    <p className="text-xs text-muted-foreground">الميزانية:</p>
                    <p className="font-bold">{instance.total_budget.toLocaleString()} {currency}</p>
                  </div>
                  <Badge className={getPriorityColor(instance.priority)}>
                    {instance.priority === 'urgent' ? 'عاجل' : instance.priority === 'high' ? 'عالي' : instance.priority === 'medium' ? 'متوسط' : 'منخفض'}
                  </Badge>
                </div>
              </Card>
            ))}
            {instances.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">لا يوجد سير عمل حتى الآن</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map(task => (
              <Card key={task.id} className="p-5 hover:shadow-lg transition-all border-border/60">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">{task.assigned_name || 'غير معين'}</p>
                  </div>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority === 'urgent' ? 'عاجل' : task.priority === 'high' ? 'عالي' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-border/40">
                  <div>
                    <p className="text-xs text-muted-foreground">الوقت المقدر:</p>
                    <p className="font-bold">{task.estimated_hours} ساعة</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الوقت الفعلي:</p>
                    <p className="font-bold">{task.actual_hours} ساعة</p>
                  </div>
                </div>
              </Card>
            ))}
            {tasks.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">لا توجد مهام حتى الآن</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Stages */}
        <TabsContent value="stages" className="mt-4">
          <div className="space-y-3">
            {stages.map(stage => (
              <Card key={stage.id} className="p-4 hover:shadow-lg transition-all border-border/60">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">{stage.order_index}</span>
                    </div>
                    <div>
                      <h3 className="font-bold">{stage.stage_name_ar}</h3>
                      <p className="text-sm text-muted-foreground">{stage.stage_name_en}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{stage.default_duration_hours} ساعة</Badge>
                    {stage.requires_approval && (
                      <Badge className="bg-amber-100 text-amber-700">يحتاج اعتماد</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <Card className="p-6">
            <div className="text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>الجدول الزمني قيد التطوير</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Instance Modal */}
      <Dialog open={showInstanceModal} onOpenChange={setShowInstanceModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingInstance ? 'تعديل سير العمل' : 'إنشاء سير عمل جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم سير العمل *</Label>
              <Input 
                value={instanceForm.workflow_name} 
                onChange={(e) => setInstanceForm({ ...instanceForm, workflow_name: e.target.value })}
                placeholder="مثال: حملة رمضان 2024"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الأولوية</Label>
                <Select value={instanceForm.priority} onValueChange={(v) => setInstanceForm({ ...instanceForm, priority: v })}>
                  <SelectTrigger><SelectValue placeholder="الأولوية" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الميزانية ({currency})</Label>
                <Input 
                  type="number" 
                  value={instanceForm.total_budget} 
                  onChange={(e) => setInstanceForm({ ...instanceForm, total_budget: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>تاريخ الانتهاء المتوقع</Label>
              <Input 
                type="date" 
                value={instanceForm.expected_end_date} 
                onChange={(e) => setInstanceForm({ ...instanceForm, expected_end_date: e.target.value })}
              />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea 
                value={instanceForm.notes} 
                onChange={(e) => setInstanceForm({ ...instanceForm, notes: e.target.value })}
                placeholder="ملاحظات إضافية"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstanceModal(false)}>إلغاء</Button>
            <Button onClick={handleSaveInstance}>{editingInstance ? 'تحديث' : 'حفظ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>سير العمل *</Label>
              <Select value={taskForm.workflow_instance_id} onValueChange={(v) => setTaskForm({ ...taskForm, workflow_instance_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر سير العمل" /></SelectTrigger>
                <SelectContent>
                  {instances.map(instance => (
                    <SelectItem key={instance.id} value={instance.id}>{instance.workflow_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>عنوان المهمة *</Label>
              <Input 
                value={taskForm.title} 
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="مثال: تصميم بوست انستغرام"
              />
            </div>
            <div>
              <Label>وصف المهمة</Label>
              <Textarea 
                value={taskForm.description} 
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="وصف تفصيلي للمهمة"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الموظف المسؤول</Label>
                <Select value={taskForm.assigned_to} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                  <SelectContent>
                    {staff.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>القسم</Label>
                <Select value={taskForm.department_id} onValueChange={(v) => setTaskForm({ ...taskForm, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>الأولوية</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger><SelectValue placeholder="الأولوية" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <Input 
                  type="date" 
                  value={taskForm.due_date} 
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label>الوقت المقدر (ساعات)</Label>
                <Input 
                  type="number" 
                  value={taskForm.estimated_hours} 
                  onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>إلغاء</Button>
            <Button onClick={handleSaveTask}>{editingTask ? 'تحديث' : 'حفظ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
