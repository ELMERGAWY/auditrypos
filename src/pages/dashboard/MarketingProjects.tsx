// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, CheckSquare, Plus, Calendar, DollarSign, AlertCircle, Trash2, Edit2, User, Folder, Play, CheckCircle2, Clock, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  assigned_to?: string;
  assigned_name?: string;
  department_id?: string;
  department_name?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
}

export function MarketingProjects({ restaurantId, currency }: Props) {
  const [projects, setProjects] = useState<MarketingProject[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('board');

  // Modal State
  const [showProjModal, setShowProjModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingProj, setEditingProj] = useState<MarketingProject | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  // Forms
  const [projForm, setProjForm] = useState({
    name: '', customer_id: '', budget: '', start_date: '', end_date: '', status: 'planning' as ProjectStatus, notes: ''
  });
  const [taskForm, setTaskForm] = useState({
    project_id: '', title: '', description: '', assigned_to: '', department_id: '', due_date: '', priority: 'medium' as 'low' | 'medium' | 'high', status: 'todo' as TaskStatus
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch CRM Leads/Projects as Projects, or custom tables if present.
      // We will read/write projects from crm_leads or create a fallback storage inside local storage/Supabase orders/tasks.
      // Wait, since we are in marketing mode, let's query `crm_leads` as projects/campaigns (since crm_leads table has estimated_value, status, stage).
      // Or we can create dedicated crm_tasks queries and crm_leads mapping.
      // Let's check `crm_leads` and mapping.
      const [leadsRes, tasksRes, staffRes, deptRes, custRes] = await Promise.all([
        supabase.from('crm_leads').select('*').eq('restaurant_id', restaurantId),
        supabase.from('crm_tasks').select('*').eq('restaurant_id', restaurantId),
        supabase.from('staff_profiles').select('id, full_name, position').eq('restaurant_id', restaurantId),
        supabase.from('staff_departments').select('id, name').eq('restaurant_id', restaurantId),
        supabase.from('customers').select('id, name').eq('restaurant_id', restaurantId)
      ]);

      // Map crm_leads to Projects
      const mappedProj = (leadsRes.data || []).map((l: any) => ({
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

      // Map crm_tasks to ProjectTasks
      const mappedTasks = (tasksRes.data || []).map((t: any) => {
        const staffMember = (staffRes.data || []).find((s: any) => s.id === t.assigned_to);
        const dept = (deptRes.data || []).find((d: any) => d.id === t.department_id);
        const proj = mappedProj.find(p => p.id === t.lead_id);
        return {
          id: t.id,
          project_id: t.lead_id || '',
          project_name: proj?.name || 'مستقل',
          title: t.title || t.subject || 'مهمة بدون عنوان',
          description: t.description || t.notes || '',
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
    } catch (e: any) {
      toast.error('خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [restaurantId]);

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
      const payload = {
        restaurant_id: restaurantId,
        lead_id: taskForm.project_id || null,
        title: taskForm.title,
        description: taskForm.description,
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
      project_id: t.project_id || '', title: t.title, description: t.description || '', assigned_to: t.assigned_to || '', department_id: t.department_id || '', due_date: t.due_date || '', priority: t.priority, status: t.status
    });
    setShowTaskModal(true);
  };

  const statusMap: Record<TaskStatus, { label: string; color: string }> = {
    todo: { label: 'مستحقة', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    in_progress: { label: 'قيد العمل', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    review: { label: 'للمراجعة', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    done: { label: 'مكتملة', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            إدارة المشاريع والمهام لكل الأقسام
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
          </h2>
          <p className="text-xs text-muted-foreground">تخطيط وتوزيع العمل والمهام على الأقسام والمسؤولين داخل الوكالة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setEditingProj(null);
            setProjForm({ name: '', customer_id: '', budget: '', start_date: '', end_date: '', status: 'planning', notes: '' });
            setShowProjModal(true);
          }}>
            <Plus className="w-4 h-4 ml-1" /> مشروع جديد
          </Button>
          <Button size="sm" onClick={() => {
            setEditingTask(null);
            setTaskForm({ project_id: '', title: '', description: '', assigned_to: '', department_id: '', due_date: '', priority: 'medium', status: 'todo' });
            setShowTaskModal(true);
          }} className="gradient-bg text-white border-0">
            <CheckSquare className="w-4 h-4 ml-1" /> إضافة مهمة للفريق
          </Button>
        </div>
      </div>

      {/* Projects Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border border-primary/10 glass-card">
          <p className="text-xs text-muted-foreground">المشاريع النشطة</p>
          <p className="text-2xl font-bold text-primary">{projects.filter(p => p.status === 'active').length}</p>
        </Card>
        <Card className="p-4 border border-primary/10 glass-card">
          <p className="text-xs text-muted-foreground">المهام المعلقة</p>
          <p className="text-2xl font-bold text-amber-600">{tasks.filter(t => t.status !== 'done').length}</p>
        </Card>
        <Card className="p-4 border border-primary/10 glass-card">
          <p className="text-xs text-muted-foreground">المهام المنجزة</p>
          <p className="text-2xl font-bold text-emerald-600">{tasks.filter(t => t.status === 'done').length}</p>
        </Card>
        <Card className="p-4 border border-primary/10 glass-card">
          <p className="text-xs text-muted-foreground">الميزانيات الإجمالية</p>
          <p className="text-2xl font-bold">{projects.reduce((sum, p) => sum + p.budget, 0).toLocaleString()} {currency}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="board">لوحة المهام (Kanban)</TabsTrigger>
          <TabsTrigger value="projects">المشاريع والحملات</TabsTrigger>
          <TabsTrigger value="tasks">جدول المهام</TabsTrigger>
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
      </Tabs>

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
                  <option value="review">للمراجعة</option>
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
