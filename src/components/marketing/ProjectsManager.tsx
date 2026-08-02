import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, Plus, Search, Filter, Calendar, Users, 
  DollarSign, Clock, TrendingUp, Edit2, Trash2, MoreVertical,
  CheckCircle, AlertTriangle, Play, Pause, BarChart3
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

interface Project {
  id: string;
  project_code: string;
  name: string;
  name_ar?: string;
  description?: string;
  project_type: string;
  status: string;
  priority: string;
  budget_amount: number;
  actual_cost: number;
  actual_revenue: number;
  profit_margin: number;
  start_date?: string;
  end_date?: string;
  project_manager_id?: string;
  client_id?: string;
  client_name?: string;
  manager_name?: string;
}

interface Task {
  id: string;
  task_code: string;
  name: string;
  status: string;
  priority: string;
  estimated_hours: number;
  actual_hours: number;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  progress_percentage: number;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const PROJECT_TYPES = [
  { id: 'project', label: 'مشروع' },
  { id: 'retainer', label: 'عقد شهري' },
  { id: 'hourly', label: 'بالساعة' },
  { id: 'fixed', label: 'سعر ثابت' }
];

const PROJECT_STATUS = [
  { id: 'draft', label: 'مسودة', color: 'bg-gray-500/20 text-gray-400' },
  { id: 'planning', label: 'تخطيط', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'in_progress', label: 'قيد التنفيذ', color: 'bg-amber-500/20 text-amber-400' },
  { id: 'on_hold', label: 'معلق', color: 'bg-orange-500/20 text-orange-400' },
  { id: 'completed', label: 'مكتمل', color: 'bg-green-500/20 text-green-400' },
  { id: 'cancelled', label: 'ملغي', color: 'bg-red-500/20 text-red-400' }
];

const TASK_STATUS = [
  { id: 'todo', label: 'قيد الانتظار', color: 'bg-gray-500/20 text-gray-400' },
  { id: 'in_progress', label: 'قيد التنفيذ', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'review', label: 'مراجعة', color: 'bg-amber-500/20 text-amber-400' },
  { id: 'done', label: 'مكتمل', color: 'bg-green-500/20 text-green-400' },
  { id: 'cancelled', label: 'ملغي', color: 'bg-red-500/20 text-red-400' }
];

export function ProjectsManager({ restaurantId, currency }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [projectForm, setProjectForm] = useState({
    name: '',
    name_ar: '',
    description: '',
    project_type: 'project',
    status: 'draft',
    priority: 'medium',
    budget_amount: '',
    start_date: '',
    end_date: '',
    client_id: '',
    project_manager_id: ''
  });

  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    task_type: 'task',
    status: 'todo',
    priority: 'medium',
    estimated_hours: '',
    assigned_to: '',
    due_date: '',
    progress_percentage: '0'
  });

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_projects')
        .select(`
          *,
          customers(name),
          staff_profiles(full_name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedProjects = (data || []).map((p: any) => ({
        ...p,
        client_name: p.customers?.name,
        manager_name: p.staff_profiles?.full_name
      }));

      setProjects(mappedProjects);
    } catch (error: any) {
      toast.error('فشل تحميل المشاريع: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('marketing_project_tasks')
        .select(`
          *,
          staff_profiles(full_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedTasks = (data || []).map((t: any) => ({
        ...t,
        assigned_to_name: t.staff_profiles?.full_name
      }));

      setTasks(mappedTasks);
    } catch (error: any) {
      toast.error('فشل تحميل المهام: ' + error.message);
    }
  };

  useEffect(() => { loadProjects(); }, [restaurantId]);

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) {
      toast.error('أدخل اسم المشروع');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const projectCode = `PRJ-${new Date().getFullYear()}-${(projects.length + 1).toString().padStart(4, '0')}`;

      const payload = {
        restaurant_id: restaurantId,
        project_code: editingProject?.project_code || projectCode,
        name: projectForm.name,
        name_ar: projectForm.name_ar || null,
        description: projectForm.description || null,
        project_type: projectForm.project_type,
        status: projectForm.status,
        priority: projectForm.priority,
        budget_amount: parseFloat(projectForm.budget_amount) || 0,
        start_date: projectForm.start_date || null,
        end_date: projectForm.end_date || null,
        client_id: projectForm.client_id || null,
        project_manager_id: projectForm.project_manager_id || null,
        created_by: user?.id
      };

      if (editingProject) {
        const { error } = await supabase.from('marketing_projects').update(payload).eq('id', editingProject.id);
        if (error) throw error;
        toast.success('تم تحديث المشروع بنجاح');
      } else {
        const { error } = await supabase.from('marketing_projects').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة المشروع بنجاح');
      }

      setShowProjectForm(false);
      setEditingProject(null);
      resetProjectForm();
      loadProjects();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (!selectedProject || !taskForm.name.trim()) {
      toast.error('أدخل اسم المهمة');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const taskCode = `TSK-${selectedProject.project_code}-${(tasks.length + 1).toString().padStart(3, '0')}`;

      const payload = {
        restaurant_id: restaurantId,
        project_id: selectedProject.id,
        task_code: editingTask?.task_code || taskCode,
        name: taskForm.name,
        description: taskForm.description || null,
        task_type: 'task',
        status: taskForm.status,
        priority: taskForm.priority,
        estimated_hours: parseFloat(taskForm.estimated_hours) || 0,
        assigned_to: taskForm.assigned_to || null,
        due_date: taskForm.due_date || null,
        progress_percentage: parseInt(taskForm.progress_percentage) || 0,
        created_by: user?.id
      };

      if (editingTask) {
        const { error } = await supabase.from('marketing_project_tasks').update(payload).eq('id', editingTask.id);
        if (error) throw error;
        toast.success('تم تحديث المهمة بنجاح');
      } else {
        const { error } = await supabase.from('marketing_project_tasks').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة المهمة بنجاح');
      }

      setShowTaskForm(false);
      setEditingTask(null);
      resetTaskForm();
      loadTasks(selectedProject.id);
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: '',
      name_ar: '',
      description: '',
      project_type: 'project',
      status: 'draft',
      priority: 'medium',
      budget_amount: '',
      start_date: '',
      end_date: '',
      client_id: '',
      project_manager_id: ''
    });
  };

  const resetTaskForm = () => {
    setTaskForm({
      name: '',
      description: '',
      task_type: 'task',
      status: 'todo',
      priority: 'medium',
      estimated_hours: '',
      assigned_to: '',
      due_date: '',
      progress_percentage: '0'
    });
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.project_code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalBudget: projects.reduce((sum, p) => sum + p.budget_amount, 0),
    actualCost: projects.reduce((sum, p) => sum + p.actual_cost, 0),
    actualRevenue: projects.reduce((sum, p) => sum + p.actual_revenue, 0)
  };

  const getProjectStatusDisplay = (status: string) => {
    return PROJECT_STATUS.find(s => s.id === status) || PROJECT_STATUS[0];
  };

  const getTaskStatusDisplay = (status: string) => {
    return TASK_STATUS.find(s => s.id === status) || TASK_STATUS[0];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <FolderKanban className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة المشاريع</h1>
            <p className="text-muted-foreground">إدارة المشاريع والمهام وتتبع الوقت</p>
          </div>
        </div>
        <Button onClick={() => setShowProjectForm(true)} className="gradient-bg">
          <Plus className="w-4 h-4 ml-2" />
          مشروع جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المشاريع</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
              <p className="text-xl font-bold">{stats.inProgress}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">مكتملة</p>
              <p className="text-xl font-bold">{stats.completed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">الميزانية</p>
              <p className="text-xl font-bold">{stats.totalBudget.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-purple-500/10 border-purple-500/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-xs text-muted-foreground">الإيرادات</p>
              <p className="text-xl font-bold">{stats.actualRevenue.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في المشاريع..."
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
          {PROJECT_STATUS.map(status => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </select>
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const statusDisplay = getProjectStatusDisplay(project.status);
          return (
            <Card key={project.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setSelectedProject(project); loadTasks(project.id); }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold">{project.name}</h4>
                  <p className="text-xs text-muted-foreground">{project.project_code}</p>
                </div>
                <Badge variant="outline" className={statusDisplay.color}>
                  {statusDisplay.label}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">العميل:</span>
                  <span className="font-medium">{project.client_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المدير:</span>
                  <span className="font-medium">{project.manager_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الميزانية:</span>
                  <span className="font-medium">{project.budget_amount.toLocaleString()} {currency}</span>
                </div>
                {project.start_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تاريخ البدء:</span>
                    <span className="font-medium">{new Date(project.start_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button size="sm" variant="outline" className="flex-1">
                  <BarChart3 className="w-4 h-4 ml-1" />
                  التفاصيل
                </Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingProject(project); setShowProjectForm(true); }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected Project Details */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{selectedProject.name}</h2>
                  <p className="text-muted-foreground">{selectedProject.project_code}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedProject(null)}>
                  إغلاق
                </Button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">المهام</h3>
                <Button size="sm" onClick={() => setShowTaskForm(true)} className="gradient-bg">
                  <Plus className="w-4 h-4 ml-2" />
                  مهمة جديدة
                </Button>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => {
                  const statusDisplay = getTaskStatusDisplay(task.status);
                  return (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${statusDisplay.color}`} />
                        <div>
                          <p className="font-medium">{task.name}</p>
                          <p className="text-xs text-muted-foreground">{task.assigned_to_name || 'غير معين'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">{task.actual_hours} / {task.estimated_hours} ساعة</p>
                          <p className="text-xs text-muted-foreground">{task.progress_percentage}%</p>
                        </div>
                        <Badge variant="outline" className={statusDisplay.color}>
                          {statusDisplay.label}
                        </Badge>
                        <Button size="icon" variant="ghost" onClick={() => { setEditingTask(task); setShowTaskForm(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {tasks.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    لا توجد مهام في هذا المشروع
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Form Modal */}
      <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'تعديل المشروع' : 'مشروع جديد'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم المشروع *</Label>
                <Input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="اسم المشروع"
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم بالعربية</Label>
                <Input
                  value={projectForm.name_ar}
                  onChange={(e) => setProjectForm({ ...projectForm, name_ar: e.target.value })}
                  placeholder="الاسم بالعربية"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الوصف</Label>
              <Input
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="وصف المشروع"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع المشروع</Label>
                <select
                  value={projectForm.project_type}
                  onChange={(e) => setProjectForm({ ...projectForm, project_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {PROJECT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {PROJECT_STATUS.map(status => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الميزانية</Label>
                <Input
                  type="number"
                  value={projectForm.budget_amount}
                  onChange={(e) => setProjectForm({ ...projectForm, budget_amount: e.target.value })}
                  placeholder="الميزانية"
                />
              </div>
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <select
                  value={projectForm.priority}
                  onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البدء</Label>
                <Input
                  type="date"
                  value={projectForm.start_date}
                  onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  value={projectForm.end_date}
                  onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowProjectForm(false)}>إلغاء</Button>
              <Button onClick={handleSaveProject} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Form Modal */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'تعديل المهمة' : 'مهمة جديدة'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المهمة *</Label>
              <Input
                value={taskForm.name}
                onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                placeholder="اسم المهمة"
              />
            </div>

            <div className="space-y-2">
              <Label>الوصف</Label>
              <Input
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="وصف المهمة"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الحالة</Label>
                <select
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {TASK_STATUS.map(status => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الساعات المقدرة</Label>
                <Input
                  type="number"
                  value={taskForm.estimated_hours}
                  onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: e.target.value })}
                  placeholder="الساعات المقدرة"
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الاستحقاق</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>نسبة الإنجاز (%)</Label>
              <Input
                type="number"
                value={taskForm.progress_percentage}
                onChange={(e) => setTaskForm({ ...taskForm, progress_percentage: e.target.value })}
                placeholder="0-100"
                min="0"
                max="100"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowTaskForm(false)}>إلغاء</Button>
              <Button onClick={handleSaveTask} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
