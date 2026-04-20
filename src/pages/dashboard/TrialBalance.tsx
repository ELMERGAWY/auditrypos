import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Scale, Calendar, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TrialBalanceItem {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function TrialBalance({ restaurantId, currency }: Props) {
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadTrialBalance();
  }, [restaurantId, dateFrom, dateTo]);

  const loadTrialBalance = async () => {
    try {
      setLoading(true);

      // Get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name, account_type, opening_balance')
        .eq('restaurant_id', restaurantId)
        .order('code');

      if (accountsError) throw accountsError;

      // Get all journal entry lines for the period
      const { data: journalLines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journal_entries!inner(entry_date)
        `)
        .eq('journal_entries.restaurant_id', restaurantId)
        .gte('journal_entries.entry_date', dateFrom)
        .lte('journal_entries.entry_date', dateTo);

      if (linesError) throw linesError;

      // Calculate balances for each account
      const balanceMap = new Map<string, { 
        total_debit: number; 
        total_credit: number;
        opening_balance: number;
      }>();

      // Initialize with accounts
      accounts?.forEach(acc => {
        balanceMap.set(acc.id, {
          total_debit: 0,
          total_credit: 0,
          opening_balance: acc.opening_balance || 0
        });
      });

      // Sum up journal entries
      journalLines?.forEach((line: any) => {
        const current = balanceMap.get(line.account_id) || { 
          total_debit: 0, 
          total_credit: 0,
          opening_balance: 0
        };
        current.total_debit += line.debit_amount || 0;
        current.total_credit += line.credit_amount || 0;
        balanceMap.set(line.account_id, current);
      });

      // Build trial balance array
      const trialBalanceData: TrialBalanceItem[] = (accounts || []).map(acc => {
        const balances = balanceMap.get(acc.id) || { 
          total_debit: 0, 
          total_credit: 0,
          opening_balance: 0
        };

        // Calculate closing balance based on account type
        let closingBalance = 0;
        const normalDebit = ['asset', 'expense'].includes(acc.account_type);
        
        if (normalDebit) {
          closingBalance = balances.opening_balance + balances.total_debit - balances.total_credit;
        } else {
          closingBalance = balances.opening_balance + balances.total_credit - balances.total_debit;
        }

        return {
          account_id: acc.id,
          account_code: acc.code,
          account_name: acc.name,
          account_type: acc.account_type,
          opening_balance: balances.opening_balance,
          total_debit: balances.total_debit,
          total_credit: balances.total_credit,
          closing_balance: closingBalance
        };
      }).filter(item => 
        item.opening_balance !== 0 || 
        item.total_debit !== 0 || 
        item.total_credit !== 0 || 
        item.closing_balance !== 0
      );

      setTrialBalance(trialBalanceData);
    } catch (error: any) {
      toast.error('فشل تحميل ميزان المراجعة: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(trialBalance.map(item => ({
      'كود الحساب': item.account_code,
      'اسم الحساب': item.account_name,
      'نوع الحساب': getAccountTypeLabel(item.account_type),
      'رصيد اول': item.opening_balance,
      'مدين': item.total_debit,
      'دائن': item.total_credit,
      'رصيد اخر': item.closing_balance
    })));

    const totals = {
      'كود الحساب': 'الإجمالي',
      'اسم الحساب': '',
      'نوع الحساب': '',
      'رصيد اول': totalOpeningBalance,
      'مدين': totalDebit,
      'دائن': totalCredit,
      'رصيد اخر': totalClosingBalance
    };

    XLSX.utils.sheet_add_json(worksheet, [totals], { skipHeader: true, origin: -1 });
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ميزان المراجعة');
    XLSX.writeFile(workbook, `ميزان_المراجعة_${dateFrom}_${dateTo}.xlsx`);
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      asset: 'أصول',
      liability: 'خصوم',
      equity: 'حقوق ملكية',
      revenue: 'إيرادات',
      expense: 'مصروفات'
    };
    return labels[type] || type;
  };

  const totalDebit = trialBalance.reduce((sum, item) => sum + item.total_debit, 0);
  const totalCredit = trialBalance.reduce((sum, item) => sum + item.total_credit, 0);
  const totalOpeningBalance = trialBalance.reduce((sum, item) => sum + item.opening_balance, 0);
  const totalClosingBalance = trialBalance.reduce((sum, item) => sum + item.closing_balance, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Scale className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl">ميزان المراجعة</h2>
            <p className="text-sm text-muted-foreground">فحص توازن القيود المحاسبية</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              من تاريخ
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              إلى تاريخ
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-end">
            <Button onClick={exportToExcel} variant="outline" className="w-full">
              <Download className="w-4 h-4 ml-2" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Balance Status */}
      <div className={`p-4 rounded-lg ${isBalanced ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
        <div className="flex items-center gap-2">
          <AlertCircle className={`w-5 h-5 ${isBalanced ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`font-bold ${isBalanced ? 'text-green-500' : 'text-red-500'}`}>
            {isBalanced ? '✅ ميزان المراجعة متوازن' : '❌ ميزان المراجعة غير متوازن'}
          </span>
        </div>
        <p className="text-sm mt-1 text-muted-foreground">
          إجمالي المدين: {totalDebit.toFixed(2)} {currency} | 
          إجمالي الدائن: {totalCredit.toFixed(2)} {currency} |
          الفرق: {Math.abs(totalDebit - totalCredit).toFixed(2)} {currency}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي مدين</p>
          <p className="font-bold text-lg text-success">{totalDebit.toFixed(2)} {currency}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي دائن</p>
          <p className="font-bold text-lg text-destructive">{totalCredit.toFixed(2)} {currency}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">عدد الحسابات</p>
          <p className="font-bold text-lg">{trialBalance.length} حساب</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">الفترة</p>
          <p className="font-bold text-sm">{dateFrom} إلى {dateTo}</p>
        </Card>
      </div>

      {/* Trial Balance Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium">كود</th>
                <th className="px-4 py-3 text-right text-sm font-medium">اسم الحساب</th>
                <th className="px-4 py-3 text-right text-sm font-medium">النوع</th>
                <th className="px-4 py-3 text-right text-sm font-medium">رصيد أول</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-success">مدين</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-destructive">دائن</th>
                <th className="px-4 py-3 text-right text-sm font-medium">رصيد آخر</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : trialBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    لا توجد بيانات للفترة المحددة
                  </td>
                </tr>
              ) : (
                trialBalance.map((item) => (
                  <tr key={item.account_id} className="border-b border-border/50 hover:bg-primary/5">
                    <td className="px-4 py-3 text-sm font-medium">{item.account_code}</td>
                    <td className="px-4 py-3 text-sm">{item.account_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline">{getAccountTypeLabel(item.account_type)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.opening_balance.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-success">
                      {item.total_debit > 0 ? `${item.total_debit.toFixed(2)} ${currency}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-destructive">
                      {item.total_credit > 0 ? `${item.total_credit.toFixed(2)} ${currency}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">
                      <Badge variant={item.closing_balance >= 0 ? 'default' : 'destructive'}>
                        {item.closing_balance.toFixed(2)} {currency}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-primary/5 font-bold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">الإجمالي</td>
                <td className="px-4 py-3">{totalOpeningBalance.toFixed(2)} {currency}</td>
                <td className="px-4 py-3 text-success">{totalDebit.toFixed(2)} {currency}</td>
                <td className="px-4 py-3 text-destructive">{totalCredit.toFixed(2)} {currency}</td>
                <td className="px-4 py-3">{totalClosingBalance.toFixed(2)} {currency}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
