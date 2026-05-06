// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Landmark, Wallet, ArrowRightLeft, TrendingUp, TrendingDown, 
  Plus, History, RefreshCcw, Building2, CreditCard, PiggyBank, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { journalService } from '@/lib/accounting/journalService';
import { BankReconciliation } from './BankReconciliation';

interface TreasuryTabProps {
  restaurantId: string;
  currency: string;
}

export function TreasuryTab({ restaurantId, currency }: TreasuryTabProps) {
  const [banks, setBanks] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromId: '',
    toId: '',
    fromType: 'bank', // 'bank' or 'cash'
    toType: 'cash',
    amount: '',
    notes: ''
  });
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddCash, setShowAddCash] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({ name: '', number: '', initialBalance: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [banksRes, accountsRes] = await Promise.all([
        supabase.from('bank_accounts').select('*').eq('restaurant_id', restaurantId),
        supabase.from('chart_of_accounts').select('*').eq('restaurant_id', restaurantId).ilike('code', '11%')
      ]);

      setBanks(banksRes.data || []);
      setCashAccounts(accountsRes.data || []);
    } catch (e) {
      toast.error('فشل تحميل بيانات الخزينة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [restaurantId]);

  const totalCash = cashAccounts.reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0);
  const totalBanks = banks.reduce((sum, b) => sum + (Number(b.current_balance) || 0), 0);

  const handleTransfer = async () => {
    if (!transferForm.amount || !transferForm.fromId || !transferForm.toId) {
      toast.error('يرجى إكمال جميع البيانات');
      return;
    }

    const amount = parseFloat(transferForm.amount);
    try {
      // Find account codes
      const fromAcc = transferForm.fromType === 'bank' 
        ? banks.find(b => b.id === transferForm.fromId)?.ledger_account_id 
        : cashAccounts.find(c => c.id === transferForm.fromId)?.code;
      
      const toAcc = transferForm.toType === 'bank' 
        ? banks.find(b => b.id === transferForm.toId)?.ledger_account_id 
        : cashAccounts.find(c => c.id === transferForm.toId)?.code;

      if (!fromAcc || !toAcc) {
        // Fallback to basic codes if not linked
        toast.error('الحسابات غير مرتبطة بالدليل المحاسبي');
        return;
      }

      const result = await journalService.createJournalEntry(restaurantId, {
        entry_date: new Date(),
        description: `تحويل داخلي: ${transferForm.notes || 'بدون ملاحظات'}`,
        source: 'manual',
        is_posted: true,
        lines: [
          { account_id: fromAcc, debit: 0, credit: amount, description: 'تحويل صادر' },
          { account_id: toAcc, debit: amount, credit: 0, description: 'تحويل وارد' }
        ]
      });

      if (result) {
        toast.success('تمت عملية التحويل بنجاح ✅');
        setShowTransferModal(false);
        loadData();
      }
    } catch (e) {
      toast.error('فشلت عملية التحويل');
    }
  };

  const handleAddBank = async () => {
    if (!newAccountForm.name || !newAccountForm.number) {
      toast.error('يرجى إدخال اسم البنك ورقم الحساب');
      return;
    }
    
    // 1. Create Chart of Account under Banks (140x)
    const newCode = `140${banks.length + 1}`;
    const { data: coa, error: coaError } = await supabase.from('chart_of_accounts').insert({
      restaurant_id: restaurantId,
      code: newCode,
      name: `بنك - ${newAccountForm.name}`,
      account_type: 'asset',
      description: 'حساب بنكي',
      is_active: true
    }).select().single();

    if (coaError) {
      toast.error('فشل في إنشاء الحساب الدليلي');
      return;
    }

    // 2. Create Bank Account
    const { error } = await supabase.from('bank_accounts').insert({
      restaurant_id: restaurantId,
      bank_name: newAccountForm.name,
      account_name: newAccountForm.name,
      account_number: newAccountForm.number,
      current_balance: Number(newAccountForm.initialBalance) || 0,
      ledger_account_id: coa.code
    });

    if (!error) {
      toast.success('تمت إضافة الحساب البنكي بنجاح');
      setShowAddBank(false);
      setNewAccountForm({ name: '', number: '', initialBalance: '' });
      loadData();
    } else {
      toast.error('فشل في إضافة البنك');
    }
  };

  const handleAddCash = async () => {
    if (!newAccountForm.name) {
      toast.error('يرجى إدخال اسم الخزينة');
      return;
    }
    
    // Create Chart of Account under Cash (110x)
    const cashCount = cashAccounts.length;
    const newCode = `110${cashCount + 1}`;
    
    const { error } = await supabase.from('chart_of_accounts').insert({
      restaurant_id: restaurantId,
      code: newCode,
      name: `خزينة - ${newAccountForm.name}`,
      account_type: 'asset',
      description: 'نقدية بالصندوق',
      current_balance: Number(newAccountForm.initialBalance) || 0,
      is_active: true
    });

    if (!error) {
      toast.success('تمت إضافة الخزينة بنجاح');
      setShowAddCash(false);
      setNewAccountForm({ name: '', number: '', initialBalance: '' });
      loadData();
    } else {
      toast.error('فشل في إضافة الخزينة');
    }
  };

  return (
    <div className="space-y-6 fade-in p-4">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black">الخزينة والبنوك</h2>
          <p className="text-muted-foreground text-sm">إدارة النقدية والودائع البنكية والتحويلات الداخلية.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} size="icon">
            <RefreshCcw className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowReconciliation(true)}>
            <ShieldCheck className="w-4 h-4" /> المطابقة البنكية
          </Button>
          <Button className="gradient-bg border-0 text-white gap-2" onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft className="w-4 h-4" /> تحويل داخلي
          </Button>
        </div>
      </header>

      {/* Reconciliation Modal */}
      {showReconciliation && (
        <BankReconciliation 
          restaurantId={restaurantId} 
          currency={currency} 
          onClose={() => setShowReconciliation(false)} 
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-primary/20 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm text-muted-foreground mb-1">إجمالي النقدية (الخزائن)</p>
              <h3 className="text-4xl font-black text-primary">{totalCash.toLocaleString()} {currency}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-primary/10 text-primary shadow-inner">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/20 hover:bg-primary/5" onClick={() => setShowAddCash(true)}>
                <Plus className="w-4 h-4" /> إنشاء خزينة جديدة
             </Button>
          </div>
          <div className="mt-6 space-y-3">
            {cashAccounts.map(acc => (
              <div key={acc.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="text-sm font-bold">{acc.name}</span>
                <span className="font-mono text-xs">{(acc.current_balance || 0).toLocaleString()} {currency}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 glass-card relative overflow-hidden group border-emerald-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm text-muted-foreground mb-1">إجمالي الأرصدة البنكية</p>
              <h3 className="text-4xl font-black text-emerald-500">{totalBanks.toLocaleString()} {currency}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner">
              <Building2 className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <Button variant="outline" size="sm" className="gap-2 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/5" onClick={() => setShowAddBank(true)}>
                <Plus className="w-4 h-4" /> إنشاء حساب بنكي جديد
             </Button>
          </div>
          <div className="mt-6 space-y-3">
            {banks.map(bank => (
              <div key={bank.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{bank.bank_name}</span>
                  <span className="text-[10px] text-muted-foreground">{bank.account_name}</span>
                </div>
                <span className="font-mono text-xs">{(bank.current_balance || 0).toLocaleString()} {currency}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Internal Transfers Logic Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 max-w-lg w-full">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
              <ArrowRightLeft className="text-primary" /> تحويل رصيد داخلي
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>من حساب</Label>
                  <select 
                    className="w-full bg-secondary p-2 rounded-lg"
                    value={transferForm.fromId}
                    onChange={e => setTransferForm({...transferForm, fromId: e.target.value})}
                  >
                    <option value="">اختر الحساب</option>
                    <optgroup label="البنوك">
                      {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
                    </optgroup>
                    <optgroup label="الخزينة">
                      {cashAccounts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <Label>إلى حساب</Label>
                  <select 
                    className="w-full bg-secondary p-2 rounded-lg"
                    value={transferForm.toId}
                    onChange={e => setTransferForm({...transferForm, toId: e.target.value})}
                  >
                    <option value="">اختر الحساب</option>
                    <optgroup label="البنوك">
                      {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
                    </optgroup>
                    <optgroup label="الخزينة">
                      {cashAccounts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <Label>المبلغ</Label>
                <Input type="number" placeholder="0.00" value={transferForm.amount} onChange={e => setTransferForm({...transferForm, amount: e.target.value})} />
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Input placeholder="مثال: تحويل لرواتب الموظفين" value={transferForm.notes} onChange={e => setTransferForm({...transferForm, notes: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1 gradient-bg border-0 text-white h-12 text-lg font-bold" onClick={handleTransfer}>إتمام التحويل</Button>
                <Button variant="outline" className="h-12" onClick={() => setShowTransferModal(false)}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Bank Modal */}
      {showAddBank && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 max-w-md w-full">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
              <Building2 className="text-emerald-500" /> إضافة حساب بنكي
            </h3>
            <div className="space-y-4">
              <div>
                <Label>اسم البنك</Label>
                <Input placeholder="مثال: البنك الأهلي" value={newAccountForm.name} onChange={e => setNewAccountForm({...newAccountForm, name: e.target.value})} />
              </div>
              <div>
                <Label>رقم الحساب</Label>
                <Input placeholder="رقم الحساب أو الآيبان" value={newAccountForm.number} onChange={e => setNewAccountForm({...newAccountForm, number: e.target.value})} />
              </div>
              <div>
                <Label>الرصيد الافتتاحي (اختياري)</Label>
                <Input type="number" placeholder="0.00" value={newAccountForm.initialBalance} onChange={e => setNewAccountForm({...newAccountForm, initialBalance: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleAddBank}>إضافة الحساب</Button>
                <Button variant="outline" onClick={() => setShowAddBank(false)}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Cash Modal */}
      {showAddCash && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 max-w-md w-full">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
              <Wallet className="text-primary" /> إضافة خزينة نقدية
            </h3>
            <div className="space-y-4">
              <div>
                <Label>اسم الخزينة</Label>
                <Input placeholder="مثال: الخزينة الرئيسية، صندوق فرع المهندسين" value={newAccountForm.name} onChange={e => setNewAccountForm({...newAccountForm, name: e.target.value})} />
              </div>
              <div>
                <Label>الرصيد الافتتاحي (اختياري)</Label>
                <Input type="number" placeholder="0.00" value={newAccountForm.initialBalance} onChange={e => setNewAccountForm({...newAccountForm, initialBalance: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <Button className="flex-1 gradient-bg text-white" onClick={handleAddCash}>إضافة الخزينة</Button>
                <Button variant="outline" onClick={() => setShowAddCash(false)}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
