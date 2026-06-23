// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, AlertCircle, Calendar, Landmark, 
  ArrowRightLeft, FileSearch, ShieldCheck, Download,
  ArrowUpRight, ArrowDownLeft, RefreshCcw, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BankReconciliationProps {
  restaurantId: string;
  currency: string;
  onClose: () => void;
}

export function BankReconciliation({ restaurantId, currency, onClose }: BankReconciliationProps) {
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [statementBalance, setStatementBalance] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadBanks();
  }, [restaurantId]);

  const loadBanks = async () => {
    const { data } = await supabase.from('bank_accounts').select('*').eq('restaurant_id', restaurantId);
    setBanks(data || []);
  };

  const loadTransactions = async (bank: any) => {
    if (!bank) return;
    setLoading(true);
    try {
      // Fetch journal entry lines for the linked ledger account
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          journal_entries (
            entry_date,
            entry_number,
            description,
            reference_type,
            reference_id
          )
        `)
        .eq('account_id', bank.ledger_account_id)
        .order('id', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (e) {
      toast.error('فشل تحميل القيود المحاسبية');
    } finally {
      setLoading(false);
    }
  };

  const handleBankSelect = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    setSelectedBank(bank);
    loadTransactions(bank);
  };

  const toggleMatch = (id: string) => {
    const newMatched = new Set(matchedIds);
    if (newMatched.has(id)) newMatched.delete(id);
    else newMatched.add(id);
    setMatchedIds(newMatched);
  };

  const matchedTotal = Array.from(matchedIds).reduce((sum, id) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return sum;
    return sum + (t.debit || 0) - (t.credit || 0);
  }, 0);

  const systemBalance = selectedBank?.current_balance || 0;
  const diff = Number(statementBalance) - (systemBalance + matchedTotal); // Simplified logic for demo

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in zoom-in duration-300">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black">المطابقة البنكية المتقدمة</h2>
            <p className="text-muted-foreground">مطابقة كشف حساب البنك مع القيود المحاسبية في النظام.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-12 w-12 hover:bg-destructive/10 hover:text-destructive">
          <X className="w-6 h-6" />
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-hidden">
        {/* Sidebar: Config */}
        <Card className="p-6 glass-card space-y-6 overflow-y-auto h-full border-white/10">
          <div className="space-y-4">
            <div>
              <Label>اختر البنك</Label>
              <select 
                className="w-full bg-secondary p-3 rounded-xl border-0 mt-2 text-sm font-bold"
                onChange={e => handleBankSelect(e.target.value)}
                value={selectedBank?.id || ''}
              >
                <option value="">-- اختر حساباً بنكياً --</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name}</option>)}
              </select>
            </div>

            <div>
              <Label>تاريخ كشف الحساب</Label>
              <Input type="date" className="mt-2" value={statementDate} onChange={e => setStatementDate(e.target.value)} />
            </div>

            <div>
              <Label>الرصيد في كشف الحساب (Statement Balance)</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                className="mt-2 h-12 text-lg font-mono font-bold" 
                value={statementBalance}
                onChange={e => setStatementBalance(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">رصيد النظام الحالي:</span>
              <span className="font-bold">{systemBalance.toLocaleString()} {currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي المطابقات:</span>
              <span className="font-bold text-emerald-500">+{matchedTotal.toLocaleString()} {currency}</span>
            </div>
            <div className="p-4 rounded-2xl bg-secondary/50 border border-white/5">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">الفرق (Discrepancy)</p>
              <p className={`text-2xl font-black ${Math.abs(diff) < 0.1 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {diff.toLocaleString()} {currency}
              </p>
              {Math.abs(diff) < 0.1 ? (
                <div className="flex items-center gap-1 text-[10px] text-emerald-500 mt-1 font-bold">
                  <CheckCircle2 className="w-3 h-3" /> الحساب مطابق تماماً
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-rose-500 mt-1 font-bold">
                  <AlertCircle className="w-3 h-3" /> يوجد فرق يحتاج للمراجعة
                </div>
              )}
            </div>
          </div>

          <Button className="w-full h-14 gradient-bg border-0 text-white font-black text-lg shadow-xl shadow-primary/20" disabled={Math.abs(diff) > 0.1}>
            حفظ واعتماد المطابقة
          </Button>
        </Card>

        {/* Main: Transactions List */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden h-full">
          <div className="flex justify-between items-end px-2">
            <div>
              <h3 className="text-xl font-black">القيود غير المطابقة</h3>
              <p className="text-xs text-muted-foreground">يرجى تحديد القيود التي تظهر في كشف حساب البنك.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => loadTransactions(selectedBank)}>
                <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-3 h-3" /> تصدير Excel
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-premium">
            {!selectedBank ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
                <Landmark className="w-16 h-16" />
                <p className="font-bold">يرجى اختيار حساب بنكي للبدء في المطابقة</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
                <FileSearch className="w-16 h-16" />
                <p className="font-bold">لا توجد قيود محاسبية لهذا الحساب</p>
              </div>
            ) : (
              transactions.map(tx => (
                <motion.div 
                  key={tx.id} 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => toggleMatch(tx.id)}
                  className={`group relative p-5 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 ${
                    matchedIds.has(tx.id) 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5' 
                      : 'bg-card/50 border-white/5 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl ${tx.debit > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                      {tx.debit > 0 ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-lg">{tx.journal_entries?.entry_number}</span>
                        <Badge variant="secondary" className="text-[10px] opacity-70 uppercase">{tx.journal_entries?.reference_type}</Badge>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground line-clamp-1">{tx.description || tx.journal_entries?.description}</p>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 mt-2">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(tx.journal_entries?.entry_date).toLocaleDateString('ar-EG')}</span>
                        <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> ID: {tx.id.slice(0, 8)}</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <p className={`text-2xl font-black font-mono ${tx.debit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.debit > 0 ? `+${tx.debit.toLocaleString()}` : `-${tx.credit.toLocaleString()}`}
                      </p>
                      {matchedIds.has(tx.id) && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-black bg-emerald-500/10 px-3 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> تم المطابقة
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
