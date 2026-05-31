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
  ArrowRight, Package, DollarSign, Eye, Banknote, FileJson
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  items?: any[];
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [returns, setReturns] = useState<SupplierPurchaseReturn[]>([]);
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  
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
      
      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select(`
          id, name, phone, email, address, balance, credit_limit, tax_number, 
          contact_person, payment_terms, created_at
        `)
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (suppliersError) throw suppliersError;

      // Fetch purchase invoices separately to avoid relationship issues
      const { data: invoicesData } = await supabase
        .from('purchase_invoices')
        .select('id, total_amount, tax_amount, net_amount, invoice_date, status, supplier_id')
        .eq('restaurant_id', restaurantId);

      // Fetch transactions separately
      const { data: txData } = await supabase
        .from('supplier_transactions')
        .select('id, amount, type, created_at, supplier_id')
        .eq('restaurant_id', restaurantId);

      const formattedSuppliers: Supplier[] = (suppliersData || []).map((s: any) => {
        const supplierInvoices = (invoicesData || []).filter(inv => inv.supplier_id === s.id);
        const purchases = supplierInvoices.reduce((sum: number, inv: any) => sum + Number(inv.net_amount || inv.total_amount), 0) || 0;
        
        const supplierTx = (txData || []).filter(tx => tx.supplier_id === s.id);
        const lastTx = supplierTx.sort((a: any, b: any) => 
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
      // Get inventory receipts with items (more detailed for statements)
      const { data: receipts } = await supabase
        .from('inventory_receipts')
        .select(`
          id, receipt_number, receipt_date, total_amount, tax_amount, net_amount, paid_amount, status,
          inventory_receipt_items(product_name, quantity, unit_price)
        `)
        .eq('supplier_id', supplierId)
        .eq('status', 'posted')
        .order('receipt_date', { ascending: true });

      // Get supplier transactions (payments)
      const { data: payments } = await supabase
        .from('supplier_transactions')
        .select('id, amount, type, description, created_at')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: true });

      // Build statement
      let runningBalance = 0;
      const statement: SupplierTransaction[] = [];

      // Add receipts as debits (What we owe)
      receipts?.forEach((receipt: any) => {
        const totalAmount = Number(receipt.net_amount || receipt.total_amount);
        const paidAmount = Number(receipt.paid_amount || 0);

        statement.push({
          id: receipt.id,
          date: receipt.receipt_date,
          type: 'purchase',
          reference: receipt.receipt_number,
          description: 'فاتورة مشتريات / استلام',
          debit: totalAmount,
          credit: 0,
          balance: 0, // Will be recalculated
          items: receipt.inventory_receipt_items
        });

        // If paid during receipt, add payment record as credit
        if (paidAmount > 0) {
          statement.push({
            id: `${receipt.id}-payment`,
            date: receipt.receipt_date,
            type: 'payment',
            reference: receipt.receipt_number,
            description: 'سداد دفعة مقدمة (المشتريات)',
            debit: 0,
            credit: paidAmount,
            balance: 0 // Will be recalculated
          });
        }
      });

      // Get purchase returns
      const { data: returnsData } = await supabase
        .from('purchase_returns')
        .select('id, return_number, return_date, total_amount, status')
        .eq('supplier_id', supplierId)
        .eq('status', 'completed')
        .order('return_date', { ascending: true });

      // Add purchase returns as credits
      returnsData?.forEach((ret: any) => {
        const amount = Number(ret.total_amount);
        statement.push({
          id: ret.id,
          date: ret.return_date,
          type: 'return',
          reference: ret.return_number,
          description: 'مردود مشتريات',
          debit: 0,
          credit: amount,
          balance: 0 // Will be recalculated
        });
      });

      // Add payments as credits
      payments?.forEach((payment: any) => {
        const amount = Number(payment.amount);
        statement.push({
          id: payment.id,
          date: payment.created_at,
          type: payment.type as any,
          reference: '',
          description: payment.description || 'سداد',
          debit: 0,
          credit: amount,
          balance: 0 // Will be recalculated
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

  const exportStatementPDF = () => {
    if (!selectedSupplier) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html dir="rtl">
        <head>
          <title>كشف حساب مورد - ${selectedSupplier.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            .header-info { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .items-list { font-size: 0.85em; color: #666; margin-top: 5px; }
            .debit { color: #dc3545; }
            .credit { color: #28a745; }
            .balance { font-weight: bold; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>كشف حساب مورد</h1>
            <p><strong>المورد:</strong> ${selectedSupplier.name}</p>
            <p><strong>الهاتف:</strong> ${selectedSupplier.phone || '-'}</p>
            <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-EG')}</p>
            <p><strong>الرصيد الحالي:</strong> ${selectedSupplier.balance.toFixed(2)} ${currency}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>المرجع</th>
                <th>مدين (لنا)</th>
                <th>دائن (له)</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${new Date(t.date).toLocaleDateString('ar-EG')}</td>
                  <td>
                    ${t.description}
                    ${t.items && t.items.length > 0 ? `
                      <div class="items-list">
                        ${t.items.map(i => `${i.product_name} (x${i.quantity})`).join('، ')}
                      </div>
                    ` : ''}
                  </td>
                  <td>${t.reference || '-'}</td>
                  <td class="credit">${t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
                  <td class="debit">${t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
                  <td class="balance">${t.balance.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              // window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={supplier.balance <= 0}
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setPaymentForm({
                              amount: supplier.balance.toString(),
                              payment_method: 'cash',
                              reference_number: '',
                              notes: '',
                              payment_date: new Date().toISOString().split('T')[0]
                            });
                            setShowPaymentModal(true);
                          }}
                        >
                          <Banknote className="w-4 h-4" />
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportStatement}>
                  <Download className="w-4 h-4 ml-1" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={exportStatementPDF} className="border-red-200 text-red-600 hover:bg-red-50">
                  <FileJson className="w-4 h-4 ml-1" /> PDF
                </Button>
              </div>
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
                      <div>
                        <Badge variant={tx.type === 'purchase' ? 'destructive' : tx.type === 'return' ? 'outline' : 'secondary'}>
                          {tx.type === 'purchase' ? 'مشتريات' : tx.type === 'return' ? 'مردود' : 'سداد'}
                        </Badge>
                      </div>
                      {tx.items && tx.items.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-1 bg-muted/30 p-1 rounded">
                          {tx.items.map(i => `${i.product_name} (x${i.quantity})`).join('، ')}
                        </div>
                      )}
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

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>دفع للمورد: {selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">الرصيد المستحق</p>
              <p className="text-2xl font-bold text-destructive">{selectedSupplier?.balance?.toFixed(2)} {currency}</p>
            </div>
            
            <div>
              <Label>المبلغ *</Label>
              <Input 
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label>طريقة الدفع</Label>
              <select 
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3"
              >
                <option value="cash">نقدي</option>
                <option value="bank">تحويل بنكي</option>
                <option value="check">شيك</option>
              </select>
            </div>
            
            <div>
              <Label>تاريخ الدفع</Label>
              <Input 
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              />
            </div>
            
            <div>
              <Label>رقم المرجع (اختياري)</Label>
              <Input 
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                placeholder="رقم الشيك أو الإيصال"
              />
            </div>
            
            <div>
              <Label>ملاحظات</Label>
              <Input 
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="ملاحظات إضافية"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                className="flex-1" 
                disabled={processingPayment || !paymentForm.amount}
                onClick={async () => {
                  if (!selectedSupplier) return;
                  const amount = parseFloat(paymentForm.amount);
                  if (amount <= 0) {
                    toast.error('المبلغ يجب أن يكون أكبر من صفر');
                    return;
                  }
                  
                  setProcessingPayment(true);
                  try {
                    const { error } = await supabase.rpc('record_supplier_payment', {
                      p_restaurant_id: restaurantId,
                      p_supplier_id: selectedSupplier.id,
                      p_amount: amount,
                      p_payment_method: paymentForm.payment_method,
                      p_reference_number: paymentForm.reference_number || null,
                      p_notes: paymentForm.notes || null,
                      p_payment_date: paymentForm.payment_date
                    });
                    
                    if (error) throw error;
                    
                    toast.success(`تم تسجيل دفع ${amount.toFixed(2)} ${currency} بنجاح`);
                    setShowPaymentModal(false);
                    loadSuppliers();
                    if (showStatementModal) {
                      loadSupplierStatement(selectedSupplier.id);
                    }
                  } catch (error: any) {
                    toast.error('فشل تسجيل الدفع: ' + error.message);
                  } finally {
                    setProcessingPayment(false);
                  }
                }}
              >
                {processingPayment ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Banknote className="w-4 h-4 ml-2" />
                    تسجيل الدفع
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
