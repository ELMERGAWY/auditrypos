import { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Download, Printer, Filter,
  ArrowRight, ArrowUpRight, ArrowDownLeft, RefreshCcw,
  Banknote, History, Wallet, Landmark, TrendingUp,
  MoreVertical, CheckCircle2, AlertCircle, Calendar,
  ArrowRightLeft, FileText, X
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

export function BankCashModule({ restaurantId, currency }: Props) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // Form States
  const [newAcc, setNewAcc] = useState({ name: '', type: 'bank', balance: 0, code: '' });
  const [transfer, setTransfer] = useState({ from: '', to: '', amount: 0, note: '' });

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    setLoading(true);
    const { data: accs } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .or('is_bank_account.eq.true,is_cash_account.eq.true');
    
    if (accs) setAccounts(accs);
    setLoading(false);
  };

  const handleAddAccount = async () => {
    if (!newAcc.name || !newAcc.code) return toast.error('يرجى إكمال البيانات');
    
    const { error } = await supabase.from('chart_of_accounts').insert({
      restaurant_id: restaurantId,
      name: newAcc.name,
      code: newAcc.code,
      account_type: 'asset',
      is_bank_account: newAcc.type === 'bank',
      is_cash_account: newAcc.type === 'cash',
      opening_balance: newAcc.balance,
      current_balance: newAcc.balance
    });

    if (error) toast.error('خطأ في إضافة الحساب');
    else {
      toast.success('تم إضافة الحساب بنجاح');
      setShowAddAccount(false);
      loadData();
    }
  };

  const handleTransfer = async () => {
    if (!transfer.from || !transfer.to || transfer.amount <= 0) return toast.error('بيانات التحويل غير مكتملة');
    
    setLoading(true);
    try {
       // 1. Create Journal Entry
       const entryNum = `TR-${Date.now().toString().slice(-6)}`;
       const { data: entry } = await supabase.from('journal_entries').insert({
         restaurant_id: restaurantId,
         entry_number: entryNum,
         entry_date: new Date().toISOString().split('T')[0],
         description: `تحويل نقدية: ${transfer.note}`,
         source: 'system',
         total_debit: transfer.amount,
         total_credit: transfer.amount,
         is_posted: true
       }).select().single();

       if (entry) {
         // 2. Create Lines (Debit To, Credit From)
         await supabase.from('journal_entry_lines').insert([
           { entry_id: entry.id, account_id: transfer.to, debit: transfer.amount, description: 'استلام تحويل' },
           { entry_id: entry.id, account_id: transfer.from, credit: transfer.amount, description: 'إرسال تحويل' }
         ]);

         // 3. Update Balances
         await supabase.rpc('update_account_balance', { acc_id: transfer.from });
         await supabase.rpc('update_account_balance', { acc_id: transfer.to });

         toast.success('تمت عملية التحويل بنجاح وتوليد القيد المحاسبي');
         setShowTransfer(false);
         loadData();
       }
    } catch (e) {
      toast.error('حدث خطأ أثناء التحويل');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight">إدارة النقدية والبنوك</h2>
          <p className="text-muted-foreground">تحكم متقدم في التدفقات النقدية والتحويلات البينية</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowTransfer(true)} variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
            <RefreshCcw className="w-4 h-4" /> تحويل بين الحسابات
          </Button>
          <Button onClick={() => setShowAddAccount(true)} className="gradient-bg text-primary-foreground border-0 gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> إضافة حساب جديد
          </Button>
        </div>
      </div>

      {/* Quick Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Wallet className="w-5 h-5" /></div>
            <span className="text-sm font-bold">إجمالي النقدية</span>
          </div>
          <h3 className="text-3xl font-black">{accounts.filter(a => a.is_cash_account).reduce((s, a) => s + (a.current_balance || 0), 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
        </div>
        <div className="glass-card p-6 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Landmark className="w-5 h-5" /></div>
            <span className="text-sm font-bold">إجمالي أرصدة البنوك</span>
          </div>
          <h3 className="text-3xl font-black">{accounts.filter(a => a.is_bank_account).reduce((s, a) => s + (a.current_balance || 0), 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
        </div>
        <div className="glass-card p-6 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp className="w-5 h-5" /></div>
            <span className="text-sm font-bold">صافي التدفق المالي</span>
          </div>
          <h3 className="text-3xl font-black text-emerald-500">+12,500 <span className="text-sm font-normal text-muted-foreground">{currency}</span></h3>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {accounts.map(acc => (
          <div key={acc.id} className="glass-card p-8 group hover:border-primary/50 transition-all relative overflow-hidden">
            <div className={cn("absolute top-0 left-0 w-1.5 h-full", acc.is_bank_account ? "bg-blue-500" : "bg-primary")} />
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-1">
                <Badge className="bg-muted text-muted-foreground border-0 text-[10px] font-mono">{acc.code}</Badge>
                <h4 className="text-xl font-black">{acc.name}</h4>
                <p className="text-xs text-muted-foreground">{acc.is_bank_account ? 'حساب بنكي جاري' : 'خزينة نقدية رئيسية'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-full"><Printer className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-4 h-4" /></Button>
              </div>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-widest">الرصيد الدفتري</p>
                <p className="text-4xl font-black tracking-tighter text-foreground">
                  {acc.current_balance?.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">{currency}</span>
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" className="w-32 bg-secondary hover:bg-secondary/80 text-foreground border-0">كشف حساب</Button>
                <Button size="sm" variant="outline" className="w-32">مطابقة بنكية</Button>
              </div>
            </div>

            {/* Micro Activity Sparkline (Placeholder Concept) */}
            <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
               <div className="flex items-center gap-2 text-xs text-emerald-500 font-bold">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> +2,400 اليوم
               </div>
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <History className="w-3.5 h-3.5" /> آخر حركة: منذ ساعتين
               </div>
            </div>
          </div>
        ))}
        {accounts.length === 0 && !loading && (
          <div className="col-span-2 p-24 text-center border-2 border-dashed rounded-[3rem] text-muted-foreground">
            <Building2 className="w-20 h-20 mb-6 opacity-5 mx-auto" />
            <h3 className="text-xl font-bold text-foreground/50">لا توجد حسابات مالية</h3>
            <p className="max-w-xs mx-auto mt-2">ابدأ بإضافة أول خزينة أو حساب بنكي لبدء تتبع تدفقاتك النقدية باحترافية</p>
            <Button onClick={() => setShowAddAccount(true)} className="mt-6 gradient-bg border-0">إضافة حساب الآن</Button>
          </div>
        )}
      </div>

      {/* Modals Section */}
      {showAddAccount && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="glass-card p-8 max-w-md w-full space-y-6 shadow-2xl scale-in">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> إضافة حساب مالي</h3>
                 <Button variant="ghost" size="icon" onClick={() => setShowAddAccount(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold">نوع الحساب</label>
                       <select value={newAcc.type} onChange={e => setNewAcc({...newAcc, type: e.target.value})} className="w-full bg-secondary p-2 rounded-lg text-sm border-0">
                          <option value="bank">حساب بنكي</option>
                          <option value="cash">خزينة نقدية</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold">كود الحساب (COA)</label>
                       <Input placeholder="مثال: 1101" value={newAcc.code} onChange={e => setNewAcc({...newAcc, code: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold">اسم الحساب</label>
                    <Input placeholder="مثال: بنك مصر - فرع النيل" value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold">الرصيد الافتتاحي</label>
                    <Input type="number" value={newAcc.balance} onChange={e => setNewAcc({...newAcc, balance: Number(e.target.value)})} />
                 </div>
                 <Button onClick={handleAddAccount} className="w-full gradient-bg border-0 h-12 text-lg font-bold">تأكيد الإضافة</Button>
              </div>
           </div>
        </div>
      )}

      {showTransfer && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="glass-card p-8 max-w-md w-full space-y-6 shadow-2xl scale-in">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-bold flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-primary" /> تحويل نقدي بين الحسابات</h3>
                 <Button variant="ghost" size="icon" onClick={() => setShowTransfer(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-4 text-right">
                 <div className="space-y-2">
                    <label className="text-xs font-bold">من حساب</label>
                    <select value={transfer.from} onChange={e => setTransfer({...transfer, from: e.target.value})} className="w-full bg-secondary p-3 rounded-xl text-sm border-0">
                       <option value="">اختر الحساب المصدر</option>
                       {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.current_balance})</option>)}
                    </select>
                 </div>
                 <div className="flex justify-center my-[-10px] relative z-10">
                    <div className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg"><ArrowDownLeft className="w-4 h-4" /></div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold">إلى حساب</label>
                    <select value={transfer.to} onChange={e => setTransfer({...transfer, to: e.target.value})} className="w-full bg-secondary p-3 rounded-xl text-sm border-0">
                       <option value="">اختر الحساب المستلم</option>
                       {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.current_balance})</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold">مبلغ التحويل</label>
                    <Input type="number" placeholder="0.00" value={transfer.amount} onChange={e => setTransfer({...transfer, amount: Number(e.target.value)})} className="h-12 text-center text-2xl font-black" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold">ملاحظات / بيان</label>
                    <Input placeholder="مثال: تغذية البنك من الخزينة" value={transfer.note} onChange={e => setTransfer({...transfer, note: e.target.value})} />
                 </div>
                 <Button onClick={handleTransfer} disabled={loading} className="w-full gradient-bg border-0 h-14 text-lg font-black shadow-xl shadow-primary/20">
                    {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'تأكيد عملية التحويل'}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
