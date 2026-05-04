import { useState, useEffect } from 'react';
import { 
  Network, Plus, Edit2, CheckCircle2, ChevronDown, ChevronRight, 
  Trash2, RefreshCcw, Save, Search, Download, AlertTriangle, Building2, Landmark, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChartOfAccount, AccountType, AccountSubtype } from '@/lib/accounting/types';

interface Props {
  restaurantId: string;
  currency: string;
}

export function ChartOfAccountsTab({ restaurantId, currency }: Props) {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<ChartOfAccount>>({
    name: '', code: '', account_type: 'asset', is_active: true, opening_balance: 0
  });

  useEffect(() => {
    loadAccounts();
  }, [restaurantId]);

  const loadAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('code', { ascending: true });

    if (error) {
      toast.error('فشل في تحميل شجرة الحسابات');
    } else {
      setAccounts((data || []) as any);
      // Auto expand root nodes
      const roots = ((data || []) as any[]).filter((a: any) => !a.parent_id).map((a: any) => a.id);
      setExpandedNodes(new Set(roots));
    }
    setLoading(false);
  };

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedNodes(newExpanded);
  };

  const handleSaveAccount = async () => {
    if (!formData.name || !formData.code) return toast.error('يرجى إدخال اسم وكود الحساب');

    try {
      const payload = {
        restaurant_id: restaurantId,
        code: formData.code,
        name: formData.name,
        account_type: formData.account_type === 'cogs' ? 'expense' : formData.account_type,
        parent_id: formData.parent_id || null,
        is_bank_account: formData.is_bank_account || false,
        is_cash_account: formData.is_cash_account || false,
        opening_balance: formData.opening_balance || 0,
      };

      if (formData.id) {
        await supabase.from('chart_of_accounts').update(payload).eq('id', formData.id);
        toast.success('تم تحديث الحساب بنجاح');
      } else {
        await supabase.from('chart_of_accounts').insert(payload);
        toast.success('تم إضافة الحساب بنجاح');
      }
      
      setShowAddModal(false);
      setFormData({ name: '', code: '', account_type: 'asset', is_active: true, opening_balance: 0 });
      loadAccounts();
    } catch (e: any) {
      toast.error(e.message || 'خطأ في الحفظ');
    }
  };

  const handleSeedAccounts = async (standard: 'eas' | 'ifrs' | 'us_gaap') => {
    setLoading(true);
    try {
      // Basic common accounts required by the system (must exactly match POS mapping)
      const standardAccounts = [
        { code: '1000', name: 'الأصول', account_type: 'asset', is_active: true, parent_code: null },
        { code: '1100', name: 'الصندوق / النقدية', account_type: 'asset', subtype: 'cash', is_cash_account: true, is_active: true, parent_code: '1000' },
        { code: '1200', name: 'العملاء / الذمم المدينة', account_type: 'asset', subtype: 'receivable', is_active: true, parent_code: '1000' },
        { code: '1300', name: 'المخزون', account_type: 'asset', subtype: 'inventory', is_active: true, parent_code: '1000' },
        { code: '1400', name: 'البنوك', account_type: 'asset', subtype: 'bank', is_bank_account: true, is_active: true, parent_code: '1000' },
        { code: '1500', name: 'الأصول الثابتة', account_type: 'asset', subtype: 'fixed_asset', is_active: true, parent_code: '1000' },
        
        { code: '2000', name: 'الخصوم', account_type: 'liability', is_active: true, parent_code: null },
        { code: '2100', name: 'الموردون / الذمم الدائنة', account_type: 'liability', subtype: 'payable', is_active: true, parent_code: '2000' },
        { code: '2150', name: 'الضرائب المستحقة (VAT)', account_type: 'liability', subtype: 'current_liability', is_active: true, parent_code: '2000' },
        { code: '2200', name: 'مصروفات مستحقة', account_type: 'liability', subtype: 'current_liability', is_active: true, parent_code: '2000' },
        
        { code: '3000', name: 'حقوق الملكية', account_type: 'equity', is_active: true, parent_code: null },
        { code: '3100', name: 'رأس المال', account_type: 'equity', subtype: 'capital', is_active: true, parent_code: '3000' },
        { code: '3200', name: 'الأرباح المحتجزة', account_type: 'equity', subtype: 'retained_earnings', is_active: true, parent_code: '3000' },

        { code: '4000', name: 'الإيرادات', account_type: 'revenue', is_active: true, parent_code: null },
        { code: '4100', name: 'إيرادات المبيعات', account_type: 'revenue', subtype: 'operating_revenue', is_active: true, parent_code: '4000' },
        { code: '4200', name: 'إيرادات الخدمات', account_type: 'revenue', subtype: 'operating_revenue', is_active: true, parent_code: '4000' },
        { code: '4300', name: 'إيرادات التوصيل', account_type: 'revenue', subtype: 'operating_revenue', is_active: true, parent_code: '4000' },
        
        { code: '5000', name: 'تكلفة المبيعات (COGS)', account_type: 'cogs', is_active: true, parent_code: null },
        { code: '5100', name: 'تكلفة البضاعة المباعة', account_type: 'cogs', subtype: 'direct_cogs', is_active: true, parent_code: '5000' },
        { code: '5200', name: 'عجز وتوالف المخزون', account_type: 'cogs', subtype: 'direct_cogs', is_active: true, parent_code: '5000' },

        { code: '6000', name: 'المصروفات', account_type: 'expense', is_active: true, parent_code: null },
        { code: '6100', name: 'الرواتب والأجور', account_type: 'expense', subtype: 'operating_expense', is_active: true, parent_code: '6000' },
        { code: '6200', name: 'الإيجارات', account_type: 'expense', subtype: 'operating_expense', is_active: true, parent_code: '6000' },
        { code: '6300', name: 'الكهرباء والمياه', account_type: 'expense', subtype: 'operating_expense', is_active: true, parent_code: '6000' },
        { code: '6400', name: 'التسويق والدعاية', account_type: 'expense', subtype: 'selling_expense', is_active: true, parent_code: '6000' },
        { code: '6500', name: 'مصروفات بنكية', account_type: 'expense', subtype: 'admin_expense', is_active: true, parent_code: '6000' },
      ];

      // First insert parent nodes using upsert
      for (const acc of standardAccounts.filter(a => !a.parent_code)) {
        await supabase.from('chart_of_accounts').upsert({
          restaurant_id: restaurantId,
          code: acc.code,
          name: acc.name,
          account_type: acc.account_type === 'cogs' ? 'expense' : acc.account_type,
        }, { onConflict: 'restaurant_id,code', ignoreDuplicates: true });
      }

      // Fetch inserted parents to get their IDs
      const { data: parents } = await supabase.from('chart_of_accounts').select('id, code').eq('restaurant_id', restaurantId);

      // Insert child nodes with their parent IDs
      for (const acc of standardAccounts.filter(a => a.parent_code)) {
        const parentId = parents?.find(p => p.code === acc.parent_code)?.id;
        await supabase.from('chart_of_accounts').upsert({
          restaurant_id: restaurantId,
          code: acc.code,
          name: acc.name,
          account_type: acc.account_type === 'cogs' ? 'expense' : acc.account_type,
          parent_id: parentId,
          is_bank_account: acc.is_bank_account || false,
          is_cash_account: acc.is_cash_account || false,
        }, { onConflict: 'restaurant_id,code', ignoreDuplicates: true });
      }

      toast.success(`تم إنشاء الدليل المحاسبي بنجاح بناءً على ${standard.toUpperCase()}`);
      setShowSeedModal(false);
      loadAccounts();
    } catch (e) {
      toast.error('حدث خطأ أثناء توليد الحسابات');
    }
  };

  const getAccountColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'liability': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'equity': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'revenue': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'expense': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'cogs': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'asset': return 'أصول';
      case 'liability': return 'خصوم';
      case 'equity': return 'حقوق ملكية';
      case 'revenue': return 'إيرادات';
      case 'expense': return 'مصروفات';
      case 'cogs': return 'تكلفة مبيعات';
      default: return type;
    }
  };

  // Build Tree
  const buildTree = (parentId: string | null) => {
    return accounts
      .filter(a => a.parent_id === parentId)
      .map(account => {
        const children = buildTree(account.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedNodes.has(account.id);
        
        // Filter out if searching and doesn't match
        if (searchTerm && !account.name.includes(searchTerm) && !account.code.includes(searchTerm) && children.length === 0) {
          return null;
        }

        return (
          <div key={account.id} className="w-full">
            <div className={`flex items-center justify-between p-3 border-b hover:bg-muted/30 transition-colors ${!parentId ? 'bg-muted/10 font-bold' : 'pr-8 lg:pr-12'}`}>
              <div className="flex items-center gap-3">
                {hasChildren ? (
                  <button onClick={() => toggleNode(account.id)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-primary/10">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 rtl:rotate-180 text-muted-foreground" />}
                  </button>
                ) : (
                  <div className="w-6 h-6 flex items-center justify-center"><Network className="w-3 h-3 text-muted-foreground/30" /></div>
                )}
                <span className="font-mono text-primary/80 bg-primary/5 px-2 py-0.5 rounded text-sm">{account.code}</span>
                <span className={!parentId ? 'text-lg font-black' : 'font-semibold'}>{account.name}</span>
                <Badge className={`text-[10px] px-2 py-0 border ${getAccountColor(account.account_type)}`}>
                  {getAccountTypeLabel(account.account_type)}
                </Badge>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-mono font-bold w-32 text-left" dir="ltr">{(account.current_balance || 0).toLocaleString()} {currency}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 lg:opacity-100">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setFormData({...account, parent_id: account.parent_id || undefined} as any); setShowAddModal(true); }}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  {!parentId && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => { setFormData({ name: '', code: '', account_type: account.account_type, parent_id: account.id, opening_balance: 0 }); setShowAddModal(true); }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {hasChildren && isExpanded && (
              <div className="w-full relative">
                <div className="absolute top-0 bottom-0 right-7 lg:right-11 w-px bg-border/50" />
                {children}
              </div>
            )}
          </div>
        );
      }).filter(Boolean);
  };

  return (
    <div className="space-y-6 fade-in p-2 md:p-6 pb-24 h-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight text-foreground flex items-center gap-3">
            <Network className="w-8 h-8 text-primary" />
            شجرة الحسابات (دليل الحسابات)
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">الدليل المحاسبي المتكامل يمثل الأساس لكل القيود المالية الآلية واليدوية داخل النظام. يمكنك توليد الشجرة حسب المعايير العالمية أو تخصيصها بالكامل.</p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button className="gradient-bg text-white border-0 shadow-lg shadow-primary/20 gap-2" onClick={() => setShowSeedModal(true)}>
              <Building2 className="w-4 h-4" /> توليد الشجرة آلياً
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={() => { setFormData({ name: '', code: '', account_type: 'asset', opening_balance: 0 }); setShowAddModal(true); }}>
            <Plus className="w-4 h-4" /> حساب رئيسي جديد
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card overflow-hidden shadow-xl shadow-black/5 bg-card/60 rounded-3xl border border-border/50 min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b bg-muted/20 flex flex-wrap gap-4 justify-between items-center">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="البحث برقم الكود أو اسم الحساب..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-10 bg-background/50 border-primary/10 h-10 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExpandedNodes(new Set(accounts.map(a => a.id)))} className="text-xs">توسيع الكل</Button>
            <Button variant="ghost" size="sm" onClick={() => setExpandedNodes(new Set(accounts.filter(a => !a.parent_id).map(a => a.id)))} className="text-xs">طي الكل</Button>
          </div>
        </div>

        {/* Tree Render */}
        <div className="w-full">
          {loading ? (
            <div className="p-20 flex justify-center"><RefreshCcw className="w-8 h-8 animate-spin text-primary" /></div>
          ) : accounts.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                <Network className="w-10 h-10 text-primary opacity-50" />
              </div>
              <h3 className="text-2xl font-black mb-2">دليل الحسابات غير مهيأ</h3>
              <p className="text-muted-foreground max-w-md mb-8">يجب بناء شجرة الحسابات لتتمكن من إجراء المبيعات وتوليد القيود المحاسبية الآلية.</p>
              <Button size="lg" className="gradient-bg border-0 gap-3" onClick={() => setShowSeedModal(true)}>
                <CheckCircle2 className="w-5 h-5" /> بناء الدليل المحاسبي الآن
              </Button>
            </div>
          ) : (
            <div className="flex flex-col w-full pb-10">
               <div className="flex text-xs font-bold text-muted-foreground uppercase tracking-wider p-3 bg-muted/30 border-b">
                 <div className="flex-1 pr-6">اسم ورقم الحساب (Account Name & Code)</div>
                 <div className="w-32 text-left pl-14">الرصيد الحالي (Balance)</div>
               </div>
               {buildTree(null)}
            </div>
          )}
        </div>
      </div>

      {/* SEED MODAL */}
      {showSeedModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-card p-0 max-w-3xl w-full shadow-2xl scale-in overflow-hidden border border-primary/20 rounded-3xl">
            <div className="p-8 pb-4 border-b">
              <h3 className="text-2xl font-black flex items-center gap-3">
                <Landmark className="w-7 h-7 text-primary" /> تهيئة شجرة الحسابات القياسية
              </h3>
              <p className="text-muted-foreground mt-2">اختر المعيار المحاسبي المناسب لمنطقتك وسيتم إنشاء الحسابات والأكواد تلقائياً مع مراعاة متطلبات السيستم (كالمبيعات والنقدية).</p>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10">
              {/* Option 1 */}
              <button onClick={() => handleSeedAccounts('eas')} className="text-right p-6 rounded-2xl border-2 border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all bg-card shadow-sm text-card-foreground group relative overflow-hidden">
                 <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Building2 className="w-6 h-6 text-primary" />
                 </div>
                 <h4 className="font-bold text-lg mb-2">المعايير المصرية (EAS)</h4>
                 <p className="text-xs text-muted-foreground leading-relaxed">تصنيف متوافق مع متطلبات مصلحة الضرائب المصرية وقوانين الشركات (أصول، خصوم، تكاليف).</p>
                 <Badge className="absolute top-4 left-4 bg-primary/10 text-primary border-0">ينصح به في مصر</Badge>
              </button>

              {/* Option 2 */}
              <button onClick={() => handleSeedAccounts('ifrs')} className="text-right p-6 rounded-2xl border-2 border-transparent hover:border-blue-500/30 hover:bg-blue-500/5 transition-all bg-card shadow-sm text-card-foreground group relative overflow-hidden">
                 <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Globe className="w-6 h-6 text-blue-500" />
                 </div>
                 <h4 className="font-bold text-lg mb-2">المعايير الدولية (IFRS)</h4>
                 <p className="text-xs text-muted-foreground leading-relaxed">التصنيف العالمي المعتمد في معظم دول الخليج والدول العربية للمؤسسات المتوسطة والكبيرة.</p>
              </button>

              {/* Option 3 */}
              <button onClick={() => handleSeedAccounts('us_gaap')} className="text-right p-6 rounded-2xl border-2 border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all bg-card shadow-sm text-card-foreground group relative overflow-hidden">
                 <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Landmark className="w-6 h-6 text-emerald-500" />
                 </div>
                 <h4 className="font-bold text-lg mb-2">الأمريكية (US GAAP)</h4>
                 <p className="text-xs text-muted-foreground leading-relaxed">تصنيفات متوافقة مع المبادئ المحاسبية المقبولة عموماً في الولايات المتحدة.</p>
              </button>
            </div>

            <div className="p-4 bg-amber-500/10 text-amber-700 border-t border-amber-500/20 flex items-center gap-3 px-8 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              ملاحظة: يمكنك لاحقاً تعديل أو إضافة أي حسابات من داخل النظام بحرية تامة بغض النظر عن الخيار الذي تحدده الآن.
            </div>
            
            <div className="p-4 bg-muted/50 border-t flex justify-end">
              <Button variant="ghost" onClick={() => setShowSeedModal(false)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full shadow-2xl scale-in rounded-3xl">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
              {formData.id ? <Edit2 className="w-6 h-6 text-primary" /> : <Plus className="w-6 h-6 text-primary" />}
              {formData.id ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد'}
            </h3>

            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <label className="text-xs font-bold text-muted-foreground">رقم الكود (Code)</label>
                  <Input 
                    placeholder="مثال: 1101" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="font-mono font-bold"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold text-muted-foreground">اسم الحساب (Account Name)</label>
                  <Input 
                    placeholder="اسم الحساب..." 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">نوع الحساب (Account Type)</label>
                <select 
                  value={formData.account_type} 
                  onChange={e => setFormData({...formData, account_type: e.target.value as AccountType})}
                  className="w-full bg-secondary p-3 rounded-xl border-0 font-bold"
                  disabled={!!formData.parent_id} // Lock type if it's a child (should match parent ideally)
                >
                  <option value="asset">أصول (Assets)</option>
                  <option value="liability">خصوم (Liabilities)</option>
                  <option value="equity">حقوق ملكية (Equity)</option>
                  <option value="revenue">إيرادات (Revenues)</option>
                  <option value="expense">مصروفات (Expenses)</option>
                  <option value="cogs">تكلفة المبيعات (COGS)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl cursor-pointer hover:bg-secondary transition-colors">
                  <input 
                    type="checkbox" 
                    checked={formData.is_cash_account} 
                    onChange={e => setFormData({...formData, is_cash_account: e.target.checked})}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span className="text-sm font-bold">هذا حساب نقدية</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl cursor-pointer hover:bg-secondary transition-colors">
                  <input 
                    type="checkbox" 
                    checked={formData.is_bank_account} 
                    onChange={e => setFormData({...formData, is_bank_account: e.target.checked})}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span className="text-sm font-bold">هذا حساب بنكي</span>
                </label>
              </div>

              {!formData.id && !formData.parent_id && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">الرصيد الافتتاحي</label>
                  <Input 
                    type="number" 
                    value={formData.opening_balance} 
                    onChange={e => setFormData({...formData, opening_balance: Number(e.target.value)})}
                    className="font-mono text-lg font-bold"
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <Button onClick={handleSaveAccount} className="flex-1 gradient-bg text-white border-0 h-12 text-lg font-bold shadow-lg shadow-primary/20">حفظ الحساب</Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="h-12 px-6">إلغاء</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
