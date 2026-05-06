// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, Plus, Search, Calendar, Package, DollarSign, 
  CheckCircle, Clock, XCircle, Download, Eye, RefreshCcw,
  TrendingUp, TrendingDown, Warehouse, Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { journalService } from '@/lib/accounting/journalService';

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string | null;
  supplier_id: string | null;
  total_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  status: 'draft' | 'approved' | 'posted' | 'cancelled';
  notes: string | null;
  created_at: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function PurchaseInvoices({ restaurantId, currency }: Props) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    supplier_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    total_amount: '',
    tax_amount: '',
    paid_amount: '',
    is_credit: true,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInvoices();
    supabase.from('suppliers').select('id,name').eq('restaurant_id', restaurantId).then(({ data }) => setSuppliers(data || []));
  }, [restaurantId]);

  const handleSave = async () => {
    if (!form.supplier_id || !form.total_amount) {
      toast.error('المورد والمبلغ مطلوبين');
      return;
    }
    setSaving(true);
    try {
      const total = parseFloat(form.total_amount);
      const tax = parseFloat(form.tax_amount || '0');
      const net = total + tax;
      const paid = parseFloat(form.paid_amount || '0');
      const supplier = suppliers.find(s => s.id === form.supplier_id);

      const { data: inv, error } = await supabase
        .from('purchase_invoices')
        .insert({
          restaurant_id: restaurantId,
          invoice_number: form.invoice_number || `PI-${Date.now()}`,
          invoice_date: form.invoice_date,
          supplier_name: supplier?.name,
          total_amount: total,
        })
        .select()
        .single();
      if (error) throw error;

      // Auto-post journal entry
      try {
        const je = await journalService.createPurchaseJournalEntry(restaurantId, {
          id: inv.id,
          supplierId: form.supplier_id,
          supplierName: supplier?.name || 'مورد',
          amount: net,
          description: form.invoice_number || inv.invoice_number,
          isCredit: form.is_credit && paid < net,
          date: form.invoice_date,
        });
        if (je?.id) {
          await supabase.from('purchase_invoices').update({ journal_entry_id: je.id }).eq('id', inv.id);
        }
        toast.success('تم تسجيل الفاتورة وترحيل القيد المحاسبي');
      } catch (jeErr: any) {
        toast.warning('تم حفظ الفاتورة لكن فشل ترحيل القيد: ' + jeErr.message);
      }
      setShowAddModal(false);
      setForm({ supplier_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], total_amount: '', tax_amount: '', paid_amount: '', is_credit: true, notes: '' });
      loadInvoices();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          suppliers(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('invoice_date', { ascending: false });

      if (error) {
        // If table doesn't exist, we might need a migration
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
           setInvoices([]);
           return;
        }
        throw error;
      }

      setInvoices((data || []).map(r => ({
        ...r,
        supplier_name: r.suppliers?.name,
        total_amount: Number(r.total_amount),
        tax_amount: Number(r.tax_amount),
        net_amount: Number(r.net_amount),
        paid_amount: Number(r.paid_amount)
      })));
    } catch (error: any) {
      toast.error('فشل تحميل فواتير المشتريات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(r => 
    r.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in p-4">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black">فواتير المشتريات</h2>
          <p className="text-muted-foreground text-sm">إدارة الفواتير المالية الواردة من الموردين والأثر المحاسبي لها.</p>
        </div>
        <Button className="gradient-bg border-0 text-white gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> فاتورة مشتريات جديدة
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 glass-card border-primary/20 bg-primary/5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">إجمالي المشتريات</p>
              <h3 className="text-2xl font-bold">{invoices.reduce((s, i) => s + i.net_amount, 0).toLocaleString()} {currency}</h3>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><TrendingUp className="w-6 h-6" /></div>
          </div>
        </Card>

        <Card className="p-6 glass-card border-destructive/20 bg-destructive/5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">غير مدفوع</p>
              <h3 className="text-2xl font-bold">{(invoices.reduce((s, i) => s + i.net_amount, 0) - invoices.reduce((s, i) => s + i.paid_amount, 0)).toLocaleString()} {currency}</h3>
            </div>
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive"><TrendingDown className="w-6 h-6" /></div>
          </div>
        </Card>

        <Card className="p-6 glass-card border-amber-500/20 bg-amber-500/5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground mb-1">تحت المراجعة</p>
              <h3 className="text-2xl font-bold">{invoices.filter(i => i.status === 'draft').length} فواتير</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500"><Clock className="w-6 h-6" /></div>
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="البحث برقم الفاتورة أو المورد..." 
          className="pr-10 h-11 bg-card/50" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-primary/5 border-b border-border">
                <th className="px-6 py-4 font-bold text-sm">رقم الفاتورة</th>
                <th className="px-6 py-4 font-bold text-sm">التاريخ</th>
                <th className="px-6 py-4 font-bold text-sm">المورد</th>
                <th className="px-6 py-4 font-bold text-sm">الصافي</th>
                <th className="px-6 py-4 font-bold text-sm">الحالة</th>
                <th className="px-6 py-4 font-bold text-sm">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><RefreshCcw className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" /></td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic">لا توجد فواتير حالياً</td></tr>
              ) : (
                filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-sm">{new Date(invoice.invoice_date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4 font-bold">{invoice.supplier_name}</td>
                    <td className="px-6 py-4 font-black text-primary">{invoice.net_amount.toLocaleString()} {currency}</td>
                    <td className="px-6 py-4">
                      <Badge variant={invoice.status === 'posted' ? 'default' : 'outline'} className={invoice.status === 'posted' ? 'bg-emerald-500' : ''}>
                        {invoice.status === 'posted' ? 'مرحلة' : 'مسودة'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm" className="hover:text-primary"><Eye className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">إضافة فاتورة مشتريات</DialogTitle>
          </DialogHeader>
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto">
              <FileText className="w-10 h-10 text-primary opacity-20" />
            </div>
            <p className="text-muted-foreground">جاري تجهيز واجهة الإدخال المتقدمة للفواتير...</p>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>إغلاق</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
