import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Plus, 
  Edit, 
  Trash2,
  FileText,
  Calendar,
  User,
  Building2
} from 'lucide-react';

interface MarketingAccountingProps {
  restaurantId: string;
  currency?: string;
}

interface HourlyRate {
  id: string;
  staff_id: string | null;
  department_id: string | null;
  role: string;
  hourly_rate: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  staff_name?: string;
  department_name?: string;
}

interface ProjectCost {
  id: string;
  cost_type: string;
  description: string;
  amount: number;
  quantity: number;
  unit: string;
  task_id: string | null;
  staff_id: string | null;
  is_billable: boolean;
  billed: boolean;
  billed_amount: number;
  staff_name?: string;
  task_title?: string;
}

interface ProjectRevenue {
  id: string;
  revenue_type: string;
  description: string;
  amount: number;
  milestone_name: string;
  milestone_status: string;
  milestone_date: string | null;
  is_paid: boolean;
  paid_amount: number;
  due_date: string | null;
}

interface Profitability {
  id: string;
  total_budget: number;
  total_cost: number;
  total_revenue: number;
  total_hours_logged: number;
  gross_profit: number;
  profit_margin_percentage: number;
  cost_per_hour: number;
  revenue_per_hour: number;
  budget_utilization_percentage: number;
  completion_percentage: number;
}

interface BillingSchedule {
  id: string;
  milestone_name: string;
  milestone_description: string;
  scheduled_amount: number;
  scheduled_date: string;
  is_completed: boolean;
  status: string;
}

const MarketingAccounting: React.FC<MarketingAccountingProps> = ({ 
  restaurantId, 
  currency = 'ج.م' 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Early return if no restaurantId
  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">يرجى اختيار مطعم أولاً</p>
      </div>
    );
  }
  
  // Data
  const [hourlyRates, setHourlyRates] = useState<HourlyRate[]>([]);
  const [projectCosts, setProjectCosts] = useState<ProjectCost[]>([]);
  const [projectRevenues, setProjectRevenues] = useState<ProjectRevenue[]>([]);
  const [profitability, setProfitability] = useState<Profitability[]>([]);
  const [billingSchedule, setBillingSchedule] = useState<BillingSchedule[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<any[]>([]);

  // Safety checks for arrays to prevent React error #306
  const safeStaff = Array.isArray(staff) ? staff : [];
  const safeDepartments = Array.isArray(departments) ? departments : [];
  const safeWorkflowInstances = Array.isArray(workflowInstances) ? workflowInstances : [];
  const safeHourlyRates = Array.isArray(hourlyRates) ? hourlyRates : [];
  const safeProjectCosts = Array.isArray(projectCosts) ? projectCosts : [];
  const safeProjectRevenues = Array.isArray(projectRevenues) ? projectRevenues : [];
  const safeBillingSchedule = Array.isArray(billingSchedule) ? billingSchedule : [];
  const safeProfitability = Array.isArray(profitability) ? profitability : [];

  // Forms
  const [showHourlyRateDialog, setShowHourlyRateDialog] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showRevenueDialog, setShowRevenueDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  
  const [editingHourlyRate, setEditingHourlyRate] = useState<HourlyRate | null>(null);
  const [editingCost, setEditingCost] = useState<ProjectCost | null>(null);
  const [editingRevenue, setEditingRevenue] = useState<ProjectRevenue | null>(null);
  const [editingBilling, setEditingBilling] = useState<BillingSchedule | null>(null);
  
  const [hourlyRateForm, setHourlyRateForm] = useState({
    staff_id: '',
    department_id: '',
    role: '',
    hourly_rate: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: ''
  });
  
  const [costForm, setCostForm] = useState({
    workflow_instance_id: '',
    cost_type: 'labor',
    description: '',
    amount: '',
    quantity: '1',
    unit: '',
    task_id: '',
    staff_id: '',
    is_billable: true
  });
  
  const [revenueForm, setRevenueForm] = useState({
    workflow_instance_id: '',
    revenue_type: 'project_fee',
    description: '',
    amount: '',
    milestone_name: '',
    milestone_status: 'pending',
    milestone_date: '',
    due_date: ''
  });
  
  const [billingForm, setBillingForm] = useState({
    workflow_instance_id: '',
    milestone_name: '',
    milestone_description: '',
    scheduled_amount: '',
    scheduled_date: ''
  });

  const loadData = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [
        ratesRes,
        costsRes,
        revenuesRes,
        profitRes,
        billingRes,
        staffRes,
        deptRes,
        instancesRes
      ] = await Promise.all([
        supabase.from('marketing_hourly_rates')
          .select('*, staff_profiles(full_name), staff_departments(name)')
          .eq('restaurant_id', restaurantId),
        supabase.from('marketing_project_costs')
          .select('*, staff_profiles(full_name), marketing_workflow_tasks(title)')
          .eq('restaurant_id', restaurantId),
        supabase.from('marketing_project_revenue')
          .select('*')
          .eq('restaurant_id', restaurantId),
        supabase.from('marketing_profitability')
          .select('*, marketing_workflow_instances(title)')
          .eq('restaurant_id', restaurantId),
        supabase.from('marketing_billing_schedule')
          .select('*')
          .eq('restaurant_id', restaurantId),
        supabase.from('staff_profiles')
          .select('id, full_name, department_id')
          .eq('restaurant_id', restaurantId),
        supabase.from('staff_departments')
          .select('id, name')
          .eq('restaurant_id', restaurantId),
        supabase.from('marketing_workflow_instances')
          .select('id, title, status')
          .eq('restaurant_id', restaurantId)
      ]);

      setHourlyRates(Array.isArray(ratesRes.data) ? ratesRes.data.map((r: any) => ({
        ...r,
        staff_name: r.staff_profiles?.full_name,
        department_name: r.staff_departments?.name
      })) : []);
      
      setProjectCosts(Array.isArray(costsRes.data) ? costsRes.data.map((c: any) => ({
        ...c,
        staff_name: c.staff_profiles?.full_name,
        task_title: c.marketing_workflow_tasks?.title
      })) : []);
      
      setProjectRevenues(Array.isArray(revenuesRes.data) ? revenuesRes.data : []);
      setProfitability(Array.isArray(profitRes.data) ? profitRes.data : []);
      setBillingSchedule(Array.isArray(billingRes.data) ? billingRes.data : []);
      setStaff(Array.isArray(staffRes.data) ? staffRes.data : []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      setWorkflowInstances(Array.isArray(instancesRes.data) ? instancesRes.data : []);
    } catch (e: any) {
      toast.error('خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      loadData();
    }
  }, [restaurantId]);

  const handleSaveHourlyRate = async () => {
    try {
      const data = {
        restaurant_id: restaurantId,
        staff_id: hourlyRateForm.staff_id || null,
        department_id: hourlyRateForm.department_id || null,
        role: hourlyRateForm.role,
        hourly_rate: parseFloat(hourlyRateForm.hourly_rate),
        effective_from: hourlyRateForm.effective_from,
        effective_to: hourlyRateForm.effective_to || null,
        created_by: user?.id
      };

      let error;
      if (editingHourlyRate) {
        const res = await supabase
          .from('marketing_hourly_rates')
          .update(data)
          .eq('id', editingHourlyRate.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('marketing_hourly_rates')
          .insert(data);
        error = res.error;
      }

      if (error) throw error;

      toast.success('تم حفظ معدل الساعة بنجاح');
      setShowHourlyRateDialog(false);
      setEditingHourlyRate(null);
      setHourlyRateForm({
        staff_id: '',
        department_id: '',
        role: '',
        hourly_rate: '',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: ''
      });
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    }
  };

  const handleSaveCost = async () => {
    try {
      const data = {
        restaurant_id: restaurantId,
        workflow_instance_id: costForm.workflow_instance_id,
        cost_type: costForm.cost_type,
        description: costForm.description,
        amount: parseFloat(costForm.amount),
        quantity: parseFloat(costForm.quantity),
        unit: costForm.unit,
        task_id: costForm.task_id || null,
        staff_id: costForm.staff_id || null,
        is_billable: costForm.is_billable,
        created_by: user?.id
      };

      let error;
      if (editingCost) {
        const res = await supabase
          .from('marketing_project_costs')
          .update(data)
          .eq('id', editingCost.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('marketing_project_costs')
          .insert(data);
        error = res.error;
      }

      if (error) throw error;

      toast.success('تم حفظ التكلفة بنجاح');
      setShowCostDialog(false);
      setEditingCost(null);
      setCostForm({
        workflow_instance_id: '',
        cost_type: 'labor',
        description: '',
        amount: '',
        quantity: '1',
        unit: '',
        task_id: '',
        staff_id: '',
        is_billable: true
      });
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    }
  };

  const handleSaveRevenue = async () => {
    try {
      const data = {
        restaurant_id: restaurantId,
        workflow_instance_id: revenueForm.workflow_instance_id,
        revenue_type: revenueForm.revenue_type,
        description: revenueForm.description,
        amount: parseFloat(revenueForm.amount),
        milestone_name: revenueForm.milestone_name,
        milestone_status: revenueForm.milestone_status,
        milestone_date: revenueForm.milestone_date || null,
        due_date: revenueForm.due_date || null,
        created_by: user?.id
      };

      let error;
      if (editingRevenue) {
        const res = await supabase
          .from('marketing_project_revenue')
          .update(data)
          .eq('id', editingRevenue.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('marketing_project_revenue')
          .insert(data);
        error = res.error;
      }

      if (error) throw error;

      toast.success('تم حفظ الإيراد بنجاح');
      setShowRevenueDialog(false);
      setEditingRevenue(null);
      setRevenueForm({
        workflow_instance_id: '',
        revenue_type: 'project_fee',
        description: '',
        amount: '',
        milestone_name: '',
        milestone_status: 'pending',
        milestone_date: '',
        due_date: ''
      });
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    }
  };

  const handleSaveBilling = async () => {
    try {
      const data = {
        restaurant_id: restaurantId,
        workflow_instance_id: billingForm.workflow_instance_id,
        milestone_name: billingForm.milestone_name,
        milestone_description: billingForm.milestone_description,
        scheduled_amount: parseFloat(billingForm.scheduled_amount),
        scheduled_date: billingForm.scheduled_date,
        created_by: user?.id
      };

      let error;
      if (editingBilling) {
        const res = await supabase
          .from('marketing_billing_schedule')
          .update(data)
          .eq('id', editingBilling.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('marketing_billing_schedule')
          .insert(data);
        error = res.error;
      }

      if (error) throw error;

      toast.success('تم حفظ جدول الفوترة بنجاح');
      setShowBillingDialog(false);
      setEditingBilling(null);
      setBillingForm({
        workflow_instance_id: '',
        milestone_name: '',
        milestone_description: '',
        scheduled_amount: '',
        scheduled_date: ''
      });
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم الحذف بنجاح');
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحذف: ' + e.message);
    }
  };

  const getCostTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      labor: 'أجور',
      materials: 'مواد',
      software: 'برمجيات',
      outsourcing: 'تعاقد خارجي',
      overhead: 'نفقات عامة',
      other: 'أخرى'
    };
    return labels[type] || type;
  };

  const getRevenueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      project_fee: 'رسوم المشروع',
      retainer: 'رسم شهري',
      hourly_billing: 'فوترة بالساعة',
      milestone: 'مرحلة',
      additional: 'إضافي',
      other: 'أخرى'
    };
    return labels[type] || type;
  };

  const getBillingStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'معلق',
      due: 'مستحق',
      overdue: 'متأخر',
      invoiced: 'مفوتر',
      paid: 'مدفوع',
      cancelled: 'ملغي'
    };
    return labels[status] || status;
  };

  const getBillingStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-500',
      due: 'bg-yellow-500',
      overdue: 'bg-red-500',
      invoiced: 'bg-blue-500',
      paid: 'bg-green-500',
      cancelled: 'bg-gray-400'
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate totals
  const totalCost = safeProjectCosts.reduce((sum, c) => sum + (c.amount * c.quantity), 0);
  const totalRevenue = safeProjectRevenues.reduce((sum, r) => sum + r.amount, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي التكاليف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold">{typeof totalCost === 'number' ? totalCost.toLocaleString() : '0'} {currency}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold">{typeof totalRevenue === 'number' ? totalRevenue.toLocaleString() : '0'} {currency}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">صافي الربح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 ${typeof totalProfit === 'number' && totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <DollarSign className="w-4 h-4" />
              <span className="text-2xl font-bold">{typeof totalProfit === 'number' ? totalProfit.toLocaleString() : '0'} {currency}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">هامش الربح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 ${parseFloat(totalMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-4 h-4" />
              <span className="text-2xl font-bold">{totalMargin}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rates">معدلات الساعة</TabsTrigger>
          <TabsTrigger value="costs">التكاليف</TabsTrigger>
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
          <TabsTrigger value="billing">جدول الفوترة</TabsTrigger>
        </TabsList>

        {/* Hourly Rates Tab */}
        <TabsContent value="rates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">معدلات الساعة للموظفين</h3>
            <Dialog open={showHourlyRateDialog} onOpenChange={setShowHourlyRateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingHourlyRate(null);
                  setHourlyRateForm({
                    staff_id: '',
                    department_id: '',
                    role: '',
                    hourly_rate: '',
                    effective_from: new Date().toISOString().split('T')[0],
                    effective_to: ''
                  });
                }}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة معدل
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingHourlyRate ? 'تعديل معدل الساعة' : 'إضافة معدل ساعة جديد'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>الموظف (اختياري)</Label>
                    <Select
                      value={hourlyRateForm.staff_id}
                      onValueChange={(v) => setHourlyRateForm({ ...hourlyRateForm, staff_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeStaff.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>القسم (اختياري)</Label>
                    <Select
                      value={hourlyRateForm.department_id}
                      onValueChange={(v) => setHourlyRateForm({ ...hourlyRateForm, department_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القسم" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeDepartments.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>المسمى الوظيفي</Label>
                    <Input
                      value={hourlyRateForm.role}
                      onChange={(e) => setHourlyRateForm({ ...hourlyRateForm, role: e.target.value })}
                      placeholder="مثال: مصمم جرافيك"
                    />
                  </div>
                  <div>
                    <Label>معدل الساعة ({currency})</Label>
                    <Input
                      type="number"
                      value={hourlyRateForm.hourly_rate}
                      onChange={(e) => setHourlyRateForm({ ...hourlyRateForm, hourly_rate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>تاريخ البدء</Label>
                    <Input
                      type="date"
                      value={hourlyRateForm.effective_from}
                      onChange={(e) => setHourlyRateForm({ ...hourlyRateForm, effective_from: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>تاريخ الانتهاء (اختياري)</Label>
                    <Input
                      type="date"
                      value={hourlyRateForm.effective_to}
                      onChange={(e) => setHourlyRateForm({ ...hourlyRateForm, effective_to: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveHourlyRate} className="w-full">
                    حفظ
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {safeHourlyRates.map(rate => (
              <Card key={rate.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {rate.staff_name && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {rate.staff_name}
                          </Badge>
                        )}
                        {rate.department_name && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {rate.department_name}
                          </Badge>
                        )}
                        {rate.role && (
                          <Badge>{rate.role}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {typeof rate.hourly_rate === 'number' ? rate.hourly_rate.toLocaleString() : '0'} {currency}/ساعة
                        </span>
                        <span>من: {rate.effective_from ? new Date(rate.effective_from).toLocaleDateString('ar-EG') : '-'}</span>
                        {rate.effective_to && (
                          <span>إلى: {new Date(rate.effective_to).toLocaleDateString('ar-EG')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingHourlyRate(rate);
                          setHourlyRateForm({
                            staff_id: rate.staff_id || '',
                            department_id: rate.department_id || '',
                            role: rate.role,
                            hourly_rate: rate.hourly_rate?.toString() || '0',
                            effective_from: rate.effective_from ? rate.effective_from.split('T')[0] : '',
                            effective_to: rate.effective_to ? rate.effective_to.split('T')[0] : ''
                          });
                          setShowHourlyRateDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete('marketing_hourly_rates', rate.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">تكاليف المشاريع</h3>
            <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingCost(null);
                  setCostForm({
                    workflow_instance_id: '',
                    cost_type: 'labor',
                    description: '',
                    amount: '',
                    quantity: '1',
                    unit: '',
                    task_id: '',
                    staff_id: '',
                    is_billable: true
                  });
                }}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة تكلفة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCost ? 'تعديل التكلفة' : 'إضافة تكلفة جديدة'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>المشروع</Label>
                    <Select
                      value={costForm.workflow_instance_id}
                      onValueChange={(v) => setCostForm({ ...costForm, workflow_instance_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المشروع" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeWorkflowInstances.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>نوع التكلفة</Label>
                    <Select
                      value={costForm.cost_type}
                      onValueChange={(v) => setCostForm({ ...costForm, cost_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">أجور</SelectItem>
                        <SelectItem value="materials">مواد</SelectItem>
                        <SelectItem value="software">برمجيات</SelectItem>
                        <SelectItem value="outsourcing">تعاقد خارجي</SelectItem>
                        <SelectItem value="overhead">نفقات عامة</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الوصف</Label>
                    <Textarea
                      value={costForm.description}
                      onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
                      placeholder="وصف التكلفة"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>المبلغ</Label>
                      <Input
                        type="number"
                        value={costForm.amount}
                        onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>الكمية</Label>
                      <Input
                        type="number"
                        value={costForm.quantity}
                        onChange={(e) => setCostForm({ ...costForm, quantity: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>الوحدة</Label>
                    <Input
                      value={costForm.unit}
                      onChange={(e) => setCostForm({ ...costForm, unit: e.target.value })}
                      placeholder="ساعة، قطعة، إلخ"
                    />
                  </div>
                  <div>
                    <Label>الموظف (اختياري)</Label>
                    <Select
                      value={costForm.staff_id}
                      onValueChange={(v) => setCostForm({ ...costForm, staff_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeStaff.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_billable"
                      checked={costForm.is_billable}
                      onChange={(e) => setCostForm({ ...costForm, is_billable: e.target.checked })}
                    />
                    <Label htmlFor="is_billable">قابل للفوترة</Label>
                  </div>
                  <Button onClick={handleSaveCost} className="w-full">
                    حفظ
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {safeProjectCosts.map(cost => (
              <Card key={cost.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge>{getCostTypeLabel(cost.cost_type)}</Badge>
                        {cost.is_billable && (
                          <Badge variant="outline" className="text-green-600">قابل للفوترة</Badge>
                        )}
                        {cost.billed && (
                          <Badge className="bg-blue-500">مفوتر</Badge>
                        )}
                      </div>
                      <p className="font-medium">{cost.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{typeof cost.amount === 'number' && typeof cost.quantity === 'number' ? (cost.amount * cost.quantity).toLocaleString() : '0'} {currency}</span>
                        {cost.staff_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {cost.staff_name}
                          </span>
                        )}
                        {cost.task_title && (
                          <span>المهمة: {cost.task_title}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCost(cost);
                          setCostForm({
                            workflow_instance_id: cost.task_id || '',
                            cost_type: cost.cost_type,
                            description: cost.description,
                            amount: cost.amount?.toString() || '0',
                            quantity: cost.quantity?.toString() || '1',
                            unit: cost.unit,
                            task_id: cost.task_id || '',
                            staff_id: cost.staff_id || '',
                            is_billable: cost.is_billable
                          });
                          setShowCostDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete('marketing_project_costs', cost.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">إيرادات المشاريع</h3>
            <Dialog open={showRevenueDialog} onOpenChange={setShowRevenueDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingRevenue(null);
                  setRevenueForm({
                    workflow_instance_id: '',
                    revenue_type: 'project_fee',
                    description: '',
                    amount: '',
                    milestone_name: '',
                    milestone_status: 'pending',
                    milestone_date: '',
                    due_date: ''
                  });
                }}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة إيراد
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingRevenue ? 'تعديل الإيراد' : 'إضافة إيراد جديد'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>المشروع</Label>
                    <Select
                      value={revenueForm.workflow_instance_id}
                      onValueChange={(v) => setRevenueForm({ ...revenueForm, workflow_instance_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المشروع" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeWorkflowInstances.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>نوع الإيراد</Label>
                    <Select
                      value={revenueForm.revenue_type}
                      onValueChange={(v) => setRevenueForm({ ...revenueForm, revenue_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project_fee">رسوم المشروع</SelectItem>
                        <SelectItem value="retainer">رسم شهري</SelectItem>
                        <SelectItem value="hourly_billing">فوترة بالساعة</SelectItem>
                        <SelectItem value="milestone">مرحلة</SelectItem>
                        <SelectItem value="additional">إضافي</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الوصف</Label>
                    <Textarea
                      value={revenueForm.description}
                      onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
                      placeholder="وصف الإيراد"
                    />
                  </div>
                  <div>
                    <Label>المبلغ</Label>
                    <Input
                      type="number"
                      value={revenueForm.amount}
                      onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  {revenueForm.revenue_type === 'milestone' && (
                    <>
                      <div>
                        <Label>اسم المرحلة</Label>
                        <Input
                          value={revenueForm.milestone_name}
                          onChange={(e) => setRevenueForm({ ...revenueForm, milestone_name: e.target.value })}
                          placeholder="مثال: تسليم التصميم"
                        />
                      </div>
                      <div>
                        <Label>حالة المرحلة</Label>
                        <Select
                          value={revenueForm.milestone_status}
                          onValueChange={(v) => setRevenueForm({ ...revenueForm, milestone_status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">معلق</SelectItem>
                            <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                            <SelectItem value="completed">مكتمل</SelectItem>
                            <SelectItem value="cancelled">ملغي</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>تاريخ المرحلة</Label>
                        <Input
                          type="date"
                          value={revenueForm.milestone_date}
                          onChange={(e) => setRevenueForm({ ...revenueForm, milestone_date: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label>تاريخ الاستحقاق</Label>
                    <Input
                      type="date"
                      value={revenueForm.due_date}
                      onChange={(e) => setRevenueForm({ ...revenueForm, due_date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveRevenue} className="w-full">
                    حفظ
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {safeProjectRevenues.map(revenue => (
              <Card key={revenue.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge>{getRevenueTypeLabel(revenue.revenue_type)}</Badge>
                        {revenue.is_paid && (
                          <Badge className="bg-green-500">مدفوع</Badge>
                        )}
                        {revenue.milestone_name && (
                          <Badge variant="outline">{revenue.milestone_name}</Badge>
                        )}
                      </div>
                      <p className="font-medium">{revenue.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-bold text-green-600">{typeof revenue.amount === 'number' ? revenue.amount.toLocaleString() : '0'} {currency}</span>
                        {revenue.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            الاستحقاق: {new Date(revenue.due_date).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRevenue(revenue);
                          setRevenueForm({
                            workflow_instance_id: '',
                            revenue_type: revenue.revenue_type,
                            description: revenue.description,
                            amount: revenue.amount?.toString() || '0',
                            milestone_name: revenue.milestone_name,
                            milestone_status: revenue.milestone_status,
                            milestone_date: revenue.milestone_date || '',
                            due_date: revenue.due_date || ''
                          });
                          setShowRevenueDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete('marketing_project_revenue', revenue.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Billing Schedule Tab */}
        <TabsContent value="billing" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">جدول الفوترة</h3>
            <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingBilling(null);
                  setBillingForm({
                    workflow_instance_id: '',
                    milestone_name: '',
                    milestone_description: '',
                    scheduled_amount: '',
                    scheduled_date: ''
                  });
                }}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة مرحلة فوترة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBilling ? 'تعديل مرحلة الفوترة' : 'إضافة مرحلة فوترة جديدة'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>المشروع</Label>
                    <Select
                      value={billingForm.workflow_instance_id}
                      onValueChange={(v) => setBillingForm({ ...billingForm, workflow_instance_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المشروع" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeWorkflowInstances.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>اسم المرحلة</Label>
                    <Input
                      value={billingForm.milestone_name}
                      onChange={(e) => setBillingForm({ ...billingForm, milestone_name: e.target.value })}
                      placeholder="مثال: الدفعة الأولى"
                    />
                  </div>
                  <div>
                    <Label>وصف المرحلة</Label>
                    <Textarea
                      value={billingForm.milestone_description}
                      onChange={(e) => setBillingForm({ ...billingForm, milestone_description: e.target.value })}
                      placeholder="وصف تفاصيل المرحلة"
                    />
                  </div>
                  <div>
                    <Label>المبلغ المقرر</Label>
                    <Input
                      type="number"
                      value={billingForm.scheduled_amount}
                      onChange={(e) => setBillingForm({ ...billingForm, scheduled_amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>تاريخ الاستحقاق</Label>
                    <Input
                      type="date"
                      value={billingForm.scheduled_date}
                      onChange={(e) => setBillingForm({ ...billingForm, scheduled_date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveBilling} className="w-full">
                    حفظ
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {safeBillingSchedule.map(billing => (
              <Card key={billing.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getBillingStatusColor(billing.status)}>
                          {getBillingStatusLabel(billing.status)}
                        </Badge>
                        {billing.is_completed && (
                          <Badge className="bg-green-500">مكتمل</Badge>
                        )}
                      </div>
                      <p className="font-medium">{billing.milestone_name}</p>
                      {billing.milestone_description && (
                        <p className="text-sm text-muted-foreground">{billing.milestone_description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-bold">{typeof billing.scheduled_amount === 'number' ? billing.scheduled_amount.toLocaleString() : '0'} {currency}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {billing.scheduled_date ? new Date(billing.scheduled_date).toLocaleDateString('ar-EG') : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingBilling(billing);
                          setBillingForm({
                            workflow_instance_id: '',
                            milestone_name: billing.milestone_name,
                            milestone_description: billing.milestone_description || '',
                            scheduled_amount: billing.scheduled_amount?.toString() || '0',
                            scheduled_date: billing.scheduled_date
                          });
                          setShowBillingDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete('marketing_billing_schedule', billing.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Profitability Summary */}
      {safeProfitability.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ملخص الربحية للمشاريع</CardTitle>
            <CardDescription>تحليل الربحية لكل مشروع</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {safeProfitability.map(p => (
                <div key={p.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">المشروع</span>
                    <span className="text-sm text-muted-foreground">
                      {typeof p.completion_percentage === 'number' ? p.completion_percentage.toFixed(0) : '0'}% مكتمل
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">الميزانية:</span>
                      <span className="block font-bold">{typeof p.total_budget === 'number' ? p.total_budget.toLocaleString() : '0'} {currency}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">التكلفة:</span>
                      <span className="block font-bold text-red-600">{typeof p.total_cost === 'number' ? p.total_cost.toLocaleString() : '0'} {currency}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الإيراد:</span>
                      <span className="block font-bold text-green-600">{typeof p.total_revenue === 'number' ? p.total_revenue.toLocaleString() : '0'} {currency}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">صافي الربح:</span>
                      <span className={`block font-bold ${typeof p.gross_profit === 'number' && p.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {typeof p.gross_profit === 'number' ? p.gross_profit.toLocaleString() : '0'} {currency}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">هامش الربح:</span>
                      <span className={`block font-bold ${typeof p.profit_margin_percentage === 'number' && p.profit_margin_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {typeof p.profit_margin_percentage === 'number' ? p.profit_margin_percentage.toFixed(1) : '0'}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الساعات المسجلة:</span>
                      <span className="block font-bold">{typeof p.total_hours_logged === 'number' ? p.total_hours_logged.toFixed(1) : '0'} ساعة</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">التكلفة/ساعة:</span>
                      <span className="block font-bold">{typeof p.cost_per_hour === 'number' ? p.cost_per_hour.toFixed(2) : '0'} {currency}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">استخدام الميزانية:</span>
                      <span className={`block font-bold ${typeof p.budget_utilization_percentage === 'number' && p.budget_utilization_percentage > 100 ? 'text-red-600' : 'text-green-600'}`}>
                        {typeof p.budget_utilization_percentage === 'number' ? p.budget_utilization_percentage.toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketingAccounting;
