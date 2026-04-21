import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Truck, Plus, Search, Phone, MapPin, FileText, TrendingUp, 
  TrendingDown, Wallet, Download, CreditCard, AlertCircle, Receipt,
  ArrowRight, Package, DollarSign, Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number;
  credit_limit: number | null;
  tax_number: string | null;
  contact_person: string | null;
  payment_terms: string | null;
  created_at: string;
  total_purchases: number;
  last_transaction_date: string | null;
}

interface SupplierTransaction {
  id: string;
  date: string;
  type: 'purchase' | 'payment' | 'return';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface SupplierPurchaseReturn {
  id: string;
  return_number: string;
  return_date: string;
  total_amount: number;
  reason: string | null;
  status: string;
  refund_method: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function SupplierManager({ restaurantId, currency }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [returns, setReturns] = useState<SupplierPurchaseReturn[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    contact_person: '',
    credit_limit: '',
    payment_terms: '',
    tax_number: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, [restaurantId]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          id, name, phone, email, address, balance, credit_limit, tax_number, 
          contact_person, payment_terms, created_at,
          inventory_receipts(id, total_amount, receipt_date),
          supplier_transactions(id, amount, transaction_type, created_at)
        `)
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) throw error;

      const formattedSuppliers: Supplier[] = (data || []).map((s: any) => {
        const purchases = s.inventory_receipts?.reduce((sum: number, r: any) => sum + Number(r.total_amount), 0) || 0;
        
        const lastTx = s.supplier_transactions?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          id: s.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
          address: s.address,
          balance: Number(s.balance) || 0,
          credit_limit: s.credit_limit,
          tax_number: s.tax_number,
          contact_person: s.contact_person,
          payment_terms: s.payment_terms,
          created_at: s.created_at,
          last_transaction_date: lastTx?.created_at,
          total_purchases: purchases
        };
      });

      setSuppliers(formattedSuppliers);
    } catch (error: any) {
      toast.error('فشل تحميل الموردين: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierStatement = async (supplierId: string) => {
    try {
      // Get inventory receipts (purchases)
      const { data: receipts } = await supabase
        .from('inventory_receipts')
        .select('id, receipt_number, receipt_date, total_amount, paid_amount')
        .eq('supplier_id', supplierId)
        .order('receipt_date', { ascending: true });

      // Get supplier transactions (payments)
      const { data: payments } = await supabase
        .from('supplier_transactions')
        .select('id, amount, transaction_type, notes, created_at')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: true });

      // Get purchase returns
      const { data: returnsData } = await supabase
        .from('purchase_returns')
        .select('id, return_number, return_date, total_amount, status')
        .eq('supplier_id', supplierId)
        .eq('status', 'completed')
        .order('return_date', { ascending: true });

      // Build statement
      let runningBalance = 0;
      const statement: SupplierTransaction[] = [];

      // Add purchases as debits (we owe supplier)
      receipts?.forEach((receipt: any) => {
        const amount = Number(receipt.total_amount);
        runningBalance += amount;
        statement.push({
          id: receipt.id,
          date: receipt.receipt_date,
          type: 'purchase',
          reference: receipt.receipt_number,
          description: 'فاتورة مشتريات',
          debit: amount,
          credit: 0,
          balance: runningBalance
        });
      });

      // Add purchase returns as credits
      returnsData?.forEach((ret: any) => {
        const amount = Number(ret.total_amount);
        runningBalance -= amount;
        statement.push({
          id: ret.id,
          date: ret.return_date,
          type: 'return',
          reference: ret.return_number,
          description: 'مردود مشتريات',
          debit: 0,
          credit: amount,
          balance: runningBalance
        });
      });

      // Add payments as credits
      payments?.forEach((payment: any) => {
        const amount = Number(payment.amount);
        runningBalance -= amount;
        statement.push({
          id: payment.id,
          date: payment.created_at,
          type: 'payment',
          reference: '',
          description: payment.notes || 'سداد',
          debit: 0,
          credit: amount,
          balance: runningBalance
        });
      });

      // Sort by date
      statement.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Recalculate running balance
      let balance = 0;
      statement.forEach(tx => {
        balance += tx.debit - tx.credit;
        tx.balance = balance;
      });

      setTransactions(statement);
    } catch (error: any) {
      toast.error('فشل تحميل كشف الحساب: ' + error.message);
    }
  };

  const loadSupplierReturns = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_returns')
        .select('id, return_number, return_date, total_amount, reason, status, refund_method')
        .eq('supplier_id', supplierId)
        .eq('restaurant_id', restaurantId)
        .order('return_date', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل مردودات المشتريات: ' + error.message);
    }
  };

  const handleAddSupplier = async () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم المورد');
      return;
    }

    try {
      const { error } = await supabase
        .from('suppliers')
        .insert({
          restaurant_id: restaurantId,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          contact_person: formData.contact_person || null,
          credit_limit: formData.credit_limit ? Number(formData.credit_limit) : null,
          payment_terms: formData.payment_terms || null,
          tax_number: formData.tax_number || null,
          balance: 0
        });

      if (error) throw error;

      toast.success('تم إضافة المورد بنجاح');
      setShowAddModal(false);
      setFormData({ name: '', phone: '', email: '', address: '', contact_person: '', credit_limit: '', payment_terms: '', tax_number: '' });
      loadSuppliers();
    } catch (error: any) {
      toast.error('فشل إضافة المورد: ' + error.message);
    }
  };

  const exportStatement = () => {
    const worksheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
      'التاريخ': new Date(t.date).toLocaleDateString('ar-EG'),
      'النوع': t.type === 'purchase' ? 'مشتريات' : t.type === 'return' ? 'مردود' : 'سداد',
      'المرجع': t.reference,
      'البيان': t.description,
      'مدين': t.debit > 0 ? t.debit.toFixed(2) : '',
      'دائن': t.credit > 0 ? t.credit.toFixed(2) : '',
      'الرصيد': t.balance.toFixed(2)
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف حساب');
    XLSX.writeFile(workbook, `كشف_حساب_مورد_${selectedSupplier?.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.contact_person?.toLowerCase().includes(q)
    );
  }, [suppliers, searchQuery]);

  const totalPayables = suppliers.reduce((sum, s) => sum + Math.max(0, s.balance), 0);
  const totalReceivables = suppliers.reduce((sum, s) => sum + Math.max(0, -s.balance), 0);
  const overCreditSuppliers = suppliers.filter(s => s.credit_limit && s.balance > s.credit_limit);

  const startEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      contact_person: supplier.contact_person || '',
      credit_limit: supplier.credit_limit?.toString() || '',
      payment_terms: supplier.payment_terms || '',
      tax_number: supplier.tax_number || ''
    });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">إدارة الموردين</h2>
            <p className="text-xs text-muted-foreground">{suppliers.length} مورد | إجمالي المستحقات: {totalPayables.toFixed(2)} {currency}</p>
          </div>
        </div>
        <Button onClick={() => { setSelectedSupplier(null); setFormData({ name: '', phone: '', email: '', address: '', contact_person: '', credit_limit: '', payment_terms: '', tax_number: '' }); setShowAddModal(true); }}>
          <Plus className="w-4 h-4 ml-1" /> مورد جديد
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">عدد الموردين</p>
              <p className="font-bold text-lg">{suppliers.length}</p>
            </div>
            <Truck className="w-8 h-8 text-primary/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">المستحقات للموردين</p>
              <p className="font-bold text-lg text-destructive">{totalPayables.toFixed(2)} {currency}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-destructive/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">الرصيد الدائن</p>
              <p className="font-bold text-lg text-success">{totalReceivables.toFixed(2)} {currency}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-success/50" />
          </div>
        </Card>
        <Card className={`p-3 ${overCreditSuppliers.length > 0 ? 'bg-red-50 border-red-200' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">تجاوز حد الائتمان</p>
              <p className={`font-bold text-lg ${overCreditSuppliers.length > 0 ? 'text-red-600' : ''}`}>
                {overCreditSuppliers.length}
              </p>
            </div>
            <AlertCircle className={`w-8 h-8 ${overCreditSuppliers.length > 0 ? 'text-red-400' : 'text-muted-foreground/50'}`} />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="البحث في الموردين..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Suppliers Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium">المورد</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الرصيد</th>
                <th className="px-4 py-3 text-right text-sm font-medium">حد الائتمان</th>
                <th className="px-4 py-3 text-right text-sm font-medium">إجمالي المشتريات</th>
                <th className="px-4 py-3 text-right text-sm font-medium">شروط الدفع</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    لا يوجد موردين
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-border/50 hover:bg-primary/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {supplier.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          {supplier.contact_person && (
                            <p className="text-xs text-muted-foreground">{supplier.contact_person}</p>
                          )}
                          {supplier.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {supplier.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={supplier.balance > 0 ? 'destructive' : supplier.balance < 0 ? 'default' : 'secondary'}>
                        {supplier.balance.toFixed(2)} {currency}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {supplier.credit_limit ? (
                        <div className="flex items-center gap-2">
                          <span>{supplier.credit_limit.toFixed(2)} {currency}</span>
                          {supplier.balance > supplier.credit_limit && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{supplier.total_purchases.toFixed(2)} {currency}</td>
                    <td className="px-4 py-3 text-sm">{supplier.payment_terms || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            loadSupplierStatement(supplier.id);
                            setShowStatementModal(true);
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            loadSupplierReturns(supplier.id);
                            setShowReturnsModal(true);
                          }}
                        >
                          <Receipt className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(supplier)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedSupplier ? 'تعديل المورد' : 'مورد جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>اسم المورد *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="اسم المورد"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>رقم الهاتف</Label>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div>
              <Label>العنوان</Label>
              <Input 
                value={formData.address} 
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="عنوان المورد"
              />
            </div>
            <div>
              <Label>اسم الشخص المسؤول</Label>
              <Input 
                value={formData.contact_person} 
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="اسم المسؤول عن التواصل"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>حد الائتمان</Label>
                <Input 
                  type="number"
                  value={formData.credit_limit} 
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>شروط الدفع</Label>
                <Input 
                  value={formData.payment_terms} 
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="مثال: نقدي - 30 يوم"
                />
              </div>
            </div>
            <div>
              <Label>الرقم الضريبي</Label>
              <Input 
                value={formData.tax_number} 
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                placeholder="رقم التسجيل الضريبي"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                className="flex-1" 
                onClick={selectedSupplier ? () => {} : handleAddSupplier}
              >
                {selectedSupplier ? 'تحديث' : 'إضافة'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Statement Modal */}
      <Dialog open={showStatementModal} onOpenChange={setShowStatementModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>كشف حساب: {selectedSupplier?.name}</span>
              <Button variant="outline" size="sm" onClick={exportStatement}>
                <Download className="w-4 h-4 ml-1" /> تصدير
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
                <p className={`font-bold ${selectedSupplier?.balance && selectedSupplier.balance > 0 ? 'text-destructive' : 'text-success'}`}>
                  {selectedSupplier?.balance?.toFixed(2) || '0.00'} {currency}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
                <p className="font-bold text-primary">{selectedSupplier?.total_purchases?.toFixed(2) || '0.00'} {currency}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">عدد الحركات</p>
                <p className="font-bold">{transactions.length}</p>
              </Card>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="px-3 py-2 text-right">التاريخ</th>
                  <th className="px-3 py-2 text-right">النوع</th>
                  <th className="px-3 py-2 text-right">المرجع</th>
                  <th className="px-3 py-2 text-right">مدين</th>
                  <th className="px-3 py-2 text-right">دائن</th>
                  <th className="px-3 py-2 text-right">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="px-3 py-2">{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-3 py-2">
                      <Badge variant={tx.type === 'purchase' ? 'destructive' : tx.type === 'return' ? 'outline' : 'secondary'}>
                        {tx.type === 'purchase' ? 'مشتريات' : tx.type === 'return' ? 'مردود' : 'سداد'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{tx.reference}</td>
                    <td className="px-3 py-2 text-destructive">{tx.debit > 0 ? tx.debit.toFixed(2) : '-'}</td>
                    <td className="px-3 py-2 text-success">{tx.credit > 0 ? tx.credit.toFixed(2) : '-'}</td>
                    <td className="px-3 py-2 font-bold">{tx.balance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Returns Modal */}
      <Dialog open={showReturnsModal} onOpenChange={setShowReturnsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>مردودات المشتريات: {selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {returns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد مردودات مسجلة</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-primary/5 border-b">
                  <tr>
                    <th className="px-3 py-2 text-right">رقم المردود</th>
                    <th className="px-3 py-2 text-right">التاريخ</th>
                    <th className="px-3 py-2 text-right">المبلغ</th>
                    <th className="px-3 py-2 text-right">طريقة الاسترداد</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((ret) => (
                    <tr key={ret.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{ret.return_number}</td>
                      <td className="px-3 py-2">{new Date(ret.return_date).toLocaleDateString('ar-EG')}</td>
                      <td className="px-3 py-2">{ret.total_amount.toFixed(2)} {currency}</td>
                      <td className="px-3 py-2">
                        {ret.refund_method === 'cash' ? 'نقدي' :
                         ret.refund_method === 'credit' ? 'ائتمان' :
                         ret.refund_method === 'bank_transfer' ? 'تحويل بنكي' :
                         ret.refund_method === 'deduct_from_future' ? 'خصم من مستحقات' : ret.refund_method}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={
                          ret.status === 'completed' ? 'default' :
                          ret.status === 'pending' ? 'secondary' :
                          ret.status === 'approved' ? 'outline' :
                          'destructive'
                        }>
                          {ret.status === 'completed' ? 'مكتمل' :
                           ret.status === 'pending' ? 'معلق' :
                           ret.status === 'approved' ? 'معتمد' :
                           'ملغي'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
