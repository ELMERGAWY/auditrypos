// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Building2, Construction, Trash2, ArrowLeft, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  restaurantId: string;
  currency: string;
}

export function ContractingDashboard({ restaurantId, currency }: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddSite, setShowAddSite] = useState<{ projectId: string } | null>(null);
  const [showAddBlock, setShowAddBlock] = useState<{ projectId: string; siteId?: string } | null>(null);
  
  const [newProject, setNewProject] = useState({ name: '', client: '', budget: '', pricing_type: 'fixed_price', markup_percentage: '0' });
  const [newSite, setNewSite] = useState({ name: '', location: '' });
  const [newBlock, setNewBlock] = useState({ name: '', estimatedCost: '' });
  
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [showExtract, setShowExtract] = useState<any | null>(null);
  const [extractForm, setExtractForm] = useState({ amount: '', note: '', site_id: '', block_id: '' });

  const loadData = async () => {
    setLoading(true);
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*, project_sites(*), project_blocks(*)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    
    // Calculate actual costs from expenses
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('project_id, site_id, block_id, amount')
      .eq('restaurant_id', restaurantId)
      .not('project_id', 'is', null);

    // Calculate actual revenues from sales_invoices (مستخلصات) + extract orders
    const { data: invoicesData } = await supabase
      .from('sales_invoices')
      .select('project_id, site_id, block_id, grand_total, total_amount')
      .eq('restaurant_id', restaurantId)
      .not('project_id', 'is', null);

    const { data: extractItems } = await supabase
      .from('order_items')
      .select('price, quantity, variables, orders!inner(restaurant_id, status)')
      .eq('orders.restaurant_id', restaurantId)
      .eq('orders.status', 'completed');

    // Calculate pass-through purchase invoices for projects
    const { data: passThroughData } = await supabase
      .from('purchase_invoices')
      .select('project_id, site_id, total_amount, client_sales_amount, pass_through_markup_amount')
      .eq('restaurant_id', restaurantId)
      .not('project_id', 'is', null)
      .eq('is_pass_through_to_client', true);

    const enrichedProjects = (projectsData || []).map(p => {
      const pExpenses = expensesData?.filter(e => e.project_id === p.id) || [];
      const pInvoices = invoicesData?.filter(i => i.project_id === p.id) || [];
      const pPassThrough = passThroughData?.filter(pt => pt.project_id === p.id) || [];
      const pExtracts = (extractItems || []).filter((it: any) => it.variables?.project_id === p.id);

      // Total cost includes both expenses and purchase invoice totals (for supplier bonus)
      const totalCost = pExpenses.reduce((s, e) => s + Number(e.amount), 0) +
                       pPassThrough.reduce((s, pt) => s + Number(pt.total_amount), 0);
      
      // Total revenue includes sales invoices + extract order items + pass-through client sales
      const totalRevenue = pInvoices.reduce((s, i) => s + Number(i.grand_total || i.total_amount || 0), 0) +
                          pExtracts.reduce((s: number, it: any) => s + Number(it.price || 0) * Number(it.quantity || 1), 0) +
                          pPassThrough.reduce((s, pt) => s + Number(pt.client_sales_amount), 0);
      
      // Calculate total markup from pass-through invoices
      const totalPassThroughMarkup = pPassThrough.reduce((s, pt) => s + Number(pt.pass_through_markup_amount), 0);

      // Calculate projected profit if cost-plus
      let projectedProfit = totalRevenue - totalCost;
      if (p.pricing_type === 'cost_plus_percentage' && p.markup_percentage) {
        const costPlusRevenue = totalCost * (1 + (p.markup_percentage / 100));
        projectedProfit = costPlusRevenue - totalCost;
      }

      const projectSites = (p.project_sites || []).map((s: any) => {
        const sExpenses = pExpenses.filter(e => e.site_id === s.id);
        const sInvoices = pInvoices.filter(i => i.site_id === s.id);
        const sPassThrough = pPassThrough.filter(pt => pt.site_id === s.id);
        
        const siteCost = sExpenses.reduce((sum, e) => sum + Number(e.amount), 0) +
                        sPassThrough.reduce((sum, pt) => sum + Number(pt.total_amount), 0);
        const siteRevenue = sInvoices.reduce((sum, i) => sum + Number(i.grand_total), 0) +
                           sPassThrough.reduce((sum, pt) => sum + Number(pt.client_sales_amount), 0);
        
        const siteBlocks = (p.project_blocks || []).filter((b: any) => b.site_id === s.id).map((b: any) => {
          const bExpenses = sExpenses.filter(e => e.block_id === b.id);
          const bInvoices = sInvoices.filter(i => i.block_id === b.id);
          return {
            ...b,
            actual_cost: bExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
            actual_revenue: bInvoices.reduce((sum, i) => sum + Number(i.grand_total), 0)
          };
        });

        return {
          ...s,
          total_cost: siteCost,
          total_revenue: siteRevenue,
          project_blocks: siteBlocks
        };
      });

      // Blocks without a site
      const orphanBlocks = (p.project_blocks || []).filter((b: any) => !b.site_id).map((b: any) => {
        const bExpenses = pExpenses.filter(e => e.block_id === b.id);
        const bInvoices = pInvoices.filter(i => i.block_id === b.id);
        return {
          ...b,
          actual_cost: bExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
          actual_revenue: bInvoices.reduce((sum, i) => sum + Number(i.grand_total), 0)
        };
      });

      return {
        ...p,
        total_cost: totalCost,
        total_revenue: totalRevenue,
        total_pass_through_markup: totalPassThroughMarkup,
        projected_profit: projectedProfit,
        project_sites: projectSites,
        project_blocks: orphanBlocks
      };
    });

    setProjects(enrichedProjects);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [restaurantId]);

  const handleCreateProject = async () => {
    if (!newProject.name) { toast.error('اسم المشروع مطلوب'); return; }
    
    const { error } = await supabase.from('projects').insert({
      restaurant_id: restaurantId,
      name: newProject.name,
      client_name: newProject.client,
      total_budget: Number(newProject.budget) || 0,
      pricing_type: newProject.pricing_type,
      markup_percentage: Number(newProject.markup_percentage) || 0
    });

    if (!error) {
      toast.success('تم إنشاء المشروع بنجاح');
      setShowAddProject(false);
      setNewProject({ name: '', client: '', budget: '', pricing_type: 'fixed_price', markup_percentage: '0' });
      loadData();
    } else {
      toast.error('فشل إنشاء المشروع');
    }
  };

  const handleCreateSite = async () => {
    if (!newSite.name || !showAddSite) { toast.error('اسم الموقع مطلوب'); return; }
    
    const { error } = await supabase.from('project_sites').insert({
      project_id: showAddSite.projectId,
      restaurant_id: restaurantId,
      name: newSite.name,
      location: newSite.location
    });

    if (!error) {
      toast.success('تم إضافة الموقع بنجاح');
      setShowAddSite(null);
      setNewSite({ name: '', location: '' });
      loadData();
    } else {
      toast.error('فشل إضافة الموقع');
    }
  };

  const handleCreateBlock = async () => {
    if (!newBlock.name || !showAddBlock) { toast.error('اسم المرحلة مطلوب'); return; }
    
    const { error } = await supabase.from('project_blocks').insert({
      project_id: showAddBlock.projectId,
      site_id: showAddBlock.siteId || null,
      name: newBlock.name,
      estimated_cost: Number(newBlock.estimatedCost) || 0
    });

    if (!error) {
      toast.success('تم إضافة المرحلة بنجاح');
      setShowAddBlock(null);
      setNewBlock({ name: '', estimatedCost: '' });
      loadData();
    } else {
      toast.error('فشل إضافة المرحلة');
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموقع؟')) return;
    const { error } = await supabase.from('project_sites').delete().eq('id', siteId);
    if (!error) { toast.success('تم الحذف'); loadData(); }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المرحلة؟')) return;
    const { error } = await supabase.from('project_blocks').delete().eq('id', blockId);
    if (!error) { toast.success('تم الحذف'); loadData(); }
  };

  const issueExtract = async () => {
    if (!showExtract) return;
    const amount = Number(extractForm.amount);
    if (!amount || amount <= 0) return toast.error('أدخل مبلغ المستخلص');
    const orderNumber = `EX-${Date.now().toString().slice(-8)}`;
    const { data: order, error } = await supabase.from('orders').insert({
      restaurant_id: restaurantId,
      order_number: orderNumber,
      customer_name: showExtract.client_name || showExtract.name || 'عميل مقاولة',
      total: amount,
      paid_amount: 0,
      status: 'completed',
      payment_method: 'credit',
      notes: extractForm.note || `مستخلص مشروع: ${showExtract.name}`,
      is_pos: false,
    }).select('id').single();
    if (error) return toast.error(error.message);

    await supabase.from('order_items').insert({
      order_id: order.id,
      menu_item_name: `مستخلص — ${showExtract.name}`,
      quantity: 1,
      price: amount,
      variables: {
        project_id: showExtract.id,
        site_id: extractForm.site_id || null,
        block_id: extractForm.block_id || null,
        extract: true,
      },
    });

    const { data: rest } = await supabase.from('restaurants').select('company_id').eq('id', restaurantId).maybeSingle();
    if (rest?.company_id) {
      await supabase.from('sales_invoices').insert({
        company_id: rest.company_id,
        invoice_number: orderNumber,
        order_id: order.id,
        total_amount: amount,
        paid_amount: 0,
        status: 'issued',
        notes: extractForm.note || `مستخلص ${showExtract.name}`,
        project_id: showExtract.id,
        site_id: extractForm.site_id || null,
        block_id: extractForm.block_id || null,
        is_progress_invoice: true,
        source_type: 'contracting_extract',
      });
    }

    toast.success(`تم إصدار المستخلص ${orderNumber} — يظهر في فواتير البيع`);
    setShowExtract(null);
    setExtractForm({ amount: '', note: '', site_id: '', block_id: '' });
    loadData();
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Construction className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black">إدارة المشاريع والمقاولات</h2>
            <p className="text-muted-foreground">تتبع تكاليف وإيرادات ومستخلصات المشاريع والمواقع والمراحل التنفيذية.</p>
          </div>
        </div>
        <Button onClick={() => setShowAddProject(true)} className="gap-2 text-lg h-12 px-6">
          <Plus className="w-5 h-5" /> مشروع جديد
        </Button>
      </header>

      {/* Main Project List or Selected Project Details */}
      {!selectedProject ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <Card key={p.id} className="p-0 overflow-hidden cursor-pointer hover:shadow-lg transition-all border-t-4 border-t-primary" onClick={() => setSelectedProject(p)}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.client_name || 'بدون عميل محدد'}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {p.status === 'active' ? 'قيد التنفيذ' : 'مكتمل'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 my-6">
                  <div className="bg-secondary/50 p-3 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground font-bold mb-1">المصروفات الفعلية</p>
                    <p className="text-sm font-black text-red-500">{p.total_cost.toLocaleString()} {currency}</p>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg text-center">
                    <p className="text-[10px] text-muted-foreground font-bold mb-1">المستخلصات (إيراد)</p>
                    <p className="text-sm font-black text-green-500">{p.total_revenue.toLocaleString()} {currency}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نوع التسعير:</span>
                    <span className="font-bold">
                      {p.pricing_type === 'cost_plus_percentage' ? `نسبة على التكلفة (${p.markup_percentage}%)` : 'سعر ثابت'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الربح الحالي/المتوقع:</span>
                    <span className={`font-black ${p.projected_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(p.projected_profit || 0).toLocaleString()} {currency}
                    </span>
                  </div>
                  {p.total_pass_through_markup > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ربح الفواتير المُمرّة:</span>
                      <span className="font-bold text-emerald-500">
                        {Number(p.total_pass_through_markup).toLocaleString()} {currency}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-secondary/30 px-6 py-3 border-t text-xs font-bold text-muted-foreground flex justify-between items-center gap-2">
                <span>{(p.project_sites?.length || 0) + (p.project_blocks?.length || 0)} مواقع ومراحل</span>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExtract(p);
                    setExtractForm({
                      amount: String(Math.max(0, Number(p.total_budget || 0) - Number(p.total_revenue || 0)) || ''),
                      note: '',
                      site_id: '',
                      block_id: '',
                    });
                  }}
                >
                  إصدار مستخلص
                </Button>
              </div>
            </Card>
          ))}
          {projects.length === 0 && !loading && (
             <div className="col-span-full py-20 text-center text-muted-foreground">
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-xl">لا توجد مشاريع حالياً</p>
                <Button variant="link" onClick={() => setShowAddProject(true)}>أضف مشروعك الأول</Button>
             </div>
          )}
        </div>
      ) : !selectedSite ? (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           <Button variant="ghost" onClick={() => setSelectedProject(null)} className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" /> العودة للقائمة
           </Button>
           
           <Card className="p-8 border-t-8 border-t-primary">
              <div className="flex justify-between items-start mb-8 pb-8 border-b">
                 <div>
                    <h2 className="text-3xl font-black mb-2">{selectedProject.name}</h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                       العميل: <span className="font-bold text-foreground">{selectedProject.client_name || 'غير محدد'}</span>
                    </p>
                 </div>
                 <div className="text-left bg-secondary/20 p-4 rounded-xl border">
                    <p className="text-sm text-muted-foreground mb-1">صافي ربح المشروع</p>
                    <p className={`text-3xl font-black ${selectedProject.total_revenue - selectedProject.total_cost >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                       {(selectedProject.total_revenue - selectedProject.total_cost).toLocaleString()} {currency}
                    </p>
                 </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-primary" /> المواقع (Sites)
                 </h3>
                 <Button onClick={() => setShowAddSite({ projectId: selectedProject.id })} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> إضافة موقع
                 </Button>
              </div>

              <div className="space-y-4 mb-8">
                 {selectedProject.project_sites?.map((site: any) => (
                    <Card key={site.id} className="p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedSite(site)}>
                       <div className="flex justify-between items-center">
                          <div>
                             <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-xl font-bold">{site.name}</h4>
                                {site.location && (
                                   <span className="text-sm text-muted-foreground flex items-center gap-1">
                                      <MapPin className="w-4 h-4" /> {site.location}
                                   </span>
                                )}
                             </div>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                   <p className="text-muted-foreground">المصروفات:</p>
                                   <p className="font-bold text-red-500">{Number(site.total_cost || 0).toLocaleString()} {currency}</p>
                                </div>
                                <div>
                                   <p className="text-muted-foreground">المستخلصات:</p>
                                   <p className="font-bold text-green-500">{Number(site.total_revenue || 0).toLocaleString()} {currency}</p>
                                </div>
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}> <Trash2 className="w-4 h-4" /> </Button>
                          </div>
                       </div>
                    </Card>
                 ))}
              </div>

              <div className="border-t pt-6">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold">المراحل بدون موقع (Blocks)</h4>
                    <Button onClick={() => setShowAddBlock({ projectId: selectedProject.id })} size="sm" className="gap-2">
                       <Plus className="w-4 h-4" /> إضافة مرحلة
                    </Button>
                 </div>
                 <div className="space-y-4">
                    {selectedProject.project_blocks?.map((block: any) => (
                       <div key={block.id} className="grid grid-cols-12 gap-4 px-4 py-4 border rounded-lg items-center hover:bg-secondary/20 transition-colors bg-card">
                          <div className="col-span-4 font-bold">{block.name}</div>
                          <div className="col-span-2 text-center font-mono text-sm">{Number(block.estimated_cost || 0).toLocaleString()}</div>
                          <div className="col-span-2 text-center font-mono text-sm font-bold text-red-500">{Number(block.actual_cost || 0).toLocaleString()}</div>
                          <div className="col-span-2 text-center font-mono text-sm font-bold text-green-500">{Number(block.actual_revenue || 0).toLocaleString()}</div>
                          <div className="col-span-2 flex justify-center gap-2">
                             <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBlock(block.id)}> <Trash2 className="w-4 h-4" /> </Button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           <Button variant="ghost" onClick={() => setSelectedSite(null)} className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" /> العودة للمشروع
           </Button>
           
           <Card className="p-8 border-t-8 border-t-primary">
              <div className="flex justify-between items-start mb-8 pb-8 border-b">
                 <div>
                    <h2 className="text-3xl font-black mb-2">{selectedSite.name}</h2>
                    {selectedSite.location && (
                       <p className="text-muted-foreground flex items-center gap-2">
                          <MapPin className="w-4 h-4" /> {selectedSite.location}
                       </p>
                    )}
                 </div>
                 <div className="text-left bg-secondary/20 p-4 rounded-xl border">
                    <p className="text-sm text-muted-foreground mb-1">صافي ربح الموقع</p>
                    <p className={`text-3xl font-black ${(selectedSite.total_revenue - selectedSite.total_cost) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                       {(selectedSite.total_revenue - selectedSite.total_cost).toLocaleString()} {currency}
                    </p>
                 </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-primary" /> المراحل والبلوكات (WBS)
                 </h3>
                 <Button onClick={() => setShowAddBlock({ projectId: selectedProject.id, siteId: selectedSite.id })} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> إضافة مرحلة
                 </Button>
              </div>

              <div className="space-y-4">
                 <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-secondary/50 rounded-lg text-sm font-bold text-muted-foreground">
                    <div className="col-span-4">اسم المرحلة / البلوك</div>
                    <div className="col-span-2 text-center">التكلفة التقديرية</div>
                    <div className="col-span-2 text-center">المصروف الفعلي</div>
                    <div className="col-span-2 text-center">المستخلصات</div>
                    <div className="col-span-2 text-center">إجراءات</div>
                 </div>
                 
                 {selectedSite.project_blocks?.map((block: any) => (
                    <div key={block.id} className="grid grid-cols-12 gap-4 px-4 py-4 border rounded-lg items-center hover:bg-secondary/20 transition-colors bg-card">
                       <div className="col-span-4 font-bold">{block.name}</div>
                       <div className="col-span-2 text-center font-mono text-sm">{Number(block.estimated_cost || 0).toLocaleString()}</div>
                       <div className="col-span-2 text-center font-mono text-sm font-bold text-red-500">{Number(block.actual_cost || 0).toLocaleString()}</div>
                       <div className="col-span-2 text-center font-mono text-sm font-bold text-green-500">{Number(block.actual_revenue || 0).toLocaleString()}</div>
                       <div className="col-span-2 flex justify-center gap-2">
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBlock(block.id)}>
                             <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                    </div>
                 ))}

                 {(!selectedSite.project_blocks || selectedSite.project_blocks.length === 0) && (
                    <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground">
                       لم يتم تقسيم الموقع لمراحل بعد.
                    </div>
                 )}
              </div>
           </Card>
        </div>
      )}

      {/* Add Project Modal */}
      <AnimatePresence>
         {showAddProject && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card p-8 max-w-md w-full shadow-2xl">
                  <h3 className="text-2xl font-black mb-6">إضافة مشروع جديد</h3>
                  <div className="space-y-4">
                     <div>
                        <Label>اسم المشروع *</Label>
                        <Input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="مثال: كومباوند الصفوة، فيلا رقم 5" />
                     </div>
                     <div>
                        <Label>اسم العميل / المالك</Label>
                        <Input value={newProject.client} onChange={e => setNewProject({...newProject, client: e.target.value})} placeholder="اسم جهة الإسناد" />
                     </div>
                     <div>
                        <Label>الموازنة التقديرية ({currency})</Label>
                        <Input type="number" value={newProject.budget} onChange={e => setNewProject({...newProject, budget: e.target.value})} placeholder="0.00" />
                     </div>
                     <div>
                        <Label>نوع التسعير</Label>
                        <Select value={newProject.pricing_type} onValueChange={v => setNewProject({...newProject, pricing_type: v})}>
                           <SelectTrigger>
                              <SelectValue placeholder="اختر نوع التسعير" />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="fixed_price">سعر ثابت للمشروع</SelectItem>
                              <SelectItem value="cost_plus_percentage">نسبة على التكلفة (Cost Plus)</SelectItem>
                           </SelectContent>
                        </Select>
                     </div>
                     {newProject.pricing_type === 'cost_plus_percentage' && (
                        <div>
                           <Label>نسبة الربح على التكلفة (%)</Label>
                           <Input type="number" value={newProject.markup_percentage} onChange={e => setNewProject({...newProject, markup_percentage: e.target.value})} placeholder="مثال: 10.00" min="0" step="0.01" />
                        </div>
                     )}
                     <div className="flex gap-3 pt-6">
                        <Button className="flex-1 text-white" onClick={handleCreateProject}>حفظ وإنشاء</Button>
                        <Button variant="outline" onClick={() => setShowAddProject(false)}>إلغاء</Button>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Add Site Modal */}
      <AnimatePresence>
         {showAddSite && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card p-8 max-w-md w-full shadow-2xl">
                  <h3 className="text-2xl font-black mb-6">إضافة موقع تنفيذي</h3>
                  <div className="space-y-4">
                     <div>
                        <Label>اسم الموقع *</Label>
                        <Input value={newSite.name} onChange={e => setNewSite({...newSite, name: e.target.value})} placeholder="مثال: الموقع A، فيلا 1، شارع 5" />
                     </div>
                     <div>
                        <Label>الموقع (العنوان)</Label>
                        <Input value={newSite.location} onChange={e => setNewSite({...newSite, location: e.target.value})} placeholder="مثال: القاهرة، شارع الهرم" />
                     </div>
                     <div className="flex gap-3 pt-6">
                        <Button className="flex-1 text-white" onClick={handleCreateSite}>حفظ الموقع</Button>
                        <Button variant="outline" onClick={() => setShowAddSite(null)}>إلغاء</Button>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Add Block Modal */}
      <AnimatePresence>
         {showAddBlock && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card p-8 max-w-md w-full shadow-2xl">
                  <h3 className="text-2xl font-black mb-6">إضافة مرحلة / بلوك تنفيذي</h3>
                  <div className="space-y-4">
                     <div>
                        <Label>اسم المرحلة *</Label>
                        <Input value={newBlock.name} onChange={e => setNewBlock({...newBlock, name: e.target.value})} placeholder="مثال: مرحلة الأساسات، تشطيب الدور الأول" />
                     </div>
                     <div>
                        <Label>التكلفة التقديرية للمرحلة ({currency})</Label>
                        <Input type="number" value={newBlock.estimatedCost} onChange={e => setNewBlock({...newBlock, estimatedCost: e.target.value})} placeholder="0.00" />
                     </div>
                     <div className="flex gap-3 pt-6">
                        <Button className="flex-1 text-white" onClick={handleCreateBlock}>حفظ المرحلة</Button>
                        <Button variant="outline" onClick={() => setShowAddBlock(null)}>إلغاء</Button>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      <AnimatePresence>
        {showExtract && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4" dir="rtl">
              <h3 className="text-xl font-black">إصدار مستخلص — {showExtract.name}</h3>
              <p className="text-xs text-muted-foreground">ينشئ فاتورة بيع مرتبطة بالمشروع وتظهر في الإيرادات مباشرة.</p>
              <div>
                <Label>المبلغ ({currency})</Label>
                <Input type="number" value={extractForm.amount} onChange={e => setExtractForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              {(showExtract.project_sites || []).length > 0 && (
                <div>
                  <Label>الموقع (اختياري)</Label>
                  <Select value={extractForm.site_id || 'none'} onValueChange={v => setExtractForm(f => ({ ...f, site_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="كل المشروع" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">كل المشروع</SelectItem>
                      {(showExtract.project_sites || []).map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>ملاحظة</Label>
                <Input value={extractForm.note} onChange={e => setExtractForm(f => ({ ...f, note: e.target.value }))} placeholder="مستخلص رقم ..." />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={issueExtract}>إصدار</Button>
                <Button variant="outline" onClick={() => setShowExtract(null)}>إلغاء</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
