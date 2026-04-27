import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Download, BookOpen, ArrowRight, ArrowLeft, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LedgerEntry {
  id: string;
  date: string;
  entry_number: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  account_name: string;
  account_code: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function GeneralLedger({ restaurantId, currency }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAccounts();
  }, [restaurantId]);

  useEffect(() => {
    if (selectedAccount) {
      loadLedgerEntries();
    }
  }, [selectedAccount, dateFrom, dateTo]);

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type')
      .eq('restaurant_id', restaurantId)
      .order('code');
    
    if (error) {
      toast.error('فشل تحميل الحسابات');
      return;
    }
    
    setAccounts(data || []);
    if (data && data.length > 0 && !selectedAccount) {
      setSelectedAccount(data[0].id);
    }
  };

  const loadLedgerEntries = async () => {
    try {
      setLoading(true);
      
      // Get journal entry lines for selected account
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          id,
          debit,
          credit,
          description,
          journal_entries!inner(
            id,
            entry_number,
            entry_date,
            reference_type,
            reference_id,
            description
          ),
          chart_of_accounts!inner(
            code,
            name
          )
        `)
        .eq('account_id', selectedAccount)
        .gte('journal_entries.entry_date', dateFrom)
        .lte('journal_entries.entry_date', dateTo);

      if (error) throw error;

      // Sort by date ascending (chronological order for running balance)
      const sortedData = (data || []).sort((a: any, b: any) => 
        new Date(a.journal_entries.entry_date).getTime() - new Date(b.journal_entries.entry_date).getTime()
      );

      // Calculate running balance
      let balance = 0;
      const formattedEntries: LedgerEntry[] = sortedData.map((entry: any) => {
        balance += (entry.debit || 0) - (entry.credit || 0);
        return {
          id: entry.id,
          date: entry.journal_entries.entry_date,
          entry_number: entry.journal_entries.entry_number,
          reference: entry.journal_entries.reference_type || '',
          description: entry.description || entry.journal_entries.description,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          balance: balance,
          account_name: entry.chart_of_accounts.name,
          account_code: entry.chart_of_accounts.code
        };
      });

      setEntries(formattedEntries);
    } catch (error: any) {
      toast.error('فشل تحميل القيود: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(entries.map(e => ({
      'التاريخ': e.date,
      'رقم القيد': e.entry_number,
      'المرجع': e.reference,
      'البيان': e.description,
      'مدين': e.debit,
      'دائن': e.credit,
      'الرصيد': e.balance
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'حساب استاذ');
    
    const selectedAccountName = accounts.find(a => a.id === selectedAccount)?.name || 'account';
    XLSX.writeFile(workbook, `حساب_استاذ_${selectedAccountName}_${dateFrom}_${dateTo}.xlsx`);
  };

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl">حساب الاستاذ العام</h2>
            <p className="text-sm text-muted-foreground">تفاصيل الحركات لكل حساب</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>الحساب</Label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>

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

      {/* Account Summary */}
      {selectedAccountData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">كود الحساب</p>
            <p className="font-bold text-lg">{selectedAccountData.code}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">اسم الحساب</p>
            <p className="font-bold text-lg">{selectedAccountData.name}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">إجمالي مدين</p>
            <p className="font-bold text-lg text-success">{totalDebit.toFixed(2)} {currency}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">إجمالي دائن</p>
            <p className="font-bold text-lg text-destructive">{totalCredit.toFixed(2)} {currency}</p>
          </Card>
        </div>
      )}

      {/* Ledger Entries Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium">رقم القيد</th>
                <th className="px-4 py-3 text-right text-sm font-medium">المرجع</th>
                <th className="px-4 py-3 text-right text-sm font-medium">البيان</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-success">مدين</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-destructive">دائن</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    لا توجد حركات مسجلة لهذا الحساب في الفترة المحددة
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-primary/5">
                    <td className="px-4 py-3 text-sm">{entry.date}</td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.entry_number}</td>
                    <td className="px-4 py-3 text-sm">{entry.reference}</td>
                    <td className="px-4 py-3 text-sm">{entry.description}</td>
                    <td className="px-4 py-3 text-sm text-success">
                      {entry.debit > 0 ? `${entry.debit.toFixed(2)} ${currency}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-destructive">
                      {entry.credit > 0 ? `${entry.credit.toFixed(2)} ${currency}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">
                      <Badge variant={entry.balance >= 0 ? 'default' : 'destructive'}>
                        {entry.balance.toFixed(2)} {currency}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-primary/5 font-bold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right">الإجمالي</td>
                <td className="px-4 py-3 text-success">{totalDebit.toFixed(2)} {currency}</td>
                <td className="px-4 py-3 text-destructive">{totalCredit.toFixed(2)} {currency}</td>
                <td className="px-4 py-3">
                  <Badge variant={entries[entries.length - 1]?.balance >= 0 ? 'default' : 'destructive'}>
                    {entries[entries.length - 1]?.balance.toFixed(2) || '0.00'} {currency}
                  </Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
