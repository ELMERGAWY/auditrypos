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
  FileText, Plus, Search, Clock, Eye, RefreshCcw, Trash2,
  TrendingUp, TrendingDown, Package, Warehouse, Banknote, CheckCircle2, X, Barcode, Minus
} from 'lucide-react';
import { journalService } from '@/lib/accounting/journalService';
import { inventoryCosting } from '@/lib/accounting/inventoryCosting';

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
  status: string;
  notes: string | null;
  created_at: string;
  goods_received_at: string | null;
  inventory_receipt_id: string | null;
  is_credit: boolean;
}

interface LineItem {
  line_type: 'inventory' | 'gl';
  product_id?: string;
  gl_account_id?: string;
  warehouse_id?: string;
  sub_warehouse_id?: string;
  description: string;
  quantity: number;
  unit_cost: number;
  tax_amount: number;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function PurchaseInvoices({ restaurantId, currency }: Props) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoice | null>(null);
  const [viewLines, setViewLines] = useState<any[]>([]);

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [supplierContracts, setSupplierContracts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; cost_price: number; unit: string; barcode?: string; sku?: string; category?: string }[]>([]);
  const [glAccounts, setGlAccounts] = useState<{ id: string; code: string; name: string; account_type: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [subWarehouses, setSubWarehouses] = useState<{ id: string; name: string; main_warehouse_id: string }[]>([]);
  const [itemTypes, setItemTypes] = useState<{ id: string; code: string; name_ar: string }[]>([]);
  const [costingMethod, setCostingMethod] = useState<'fifo' | 'lifo' | 'wac' | 'specific'>('fifo');

  const [form, setForm] = useState({
    supplier_id: '',
    supplier_contract_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    paid_amount: '',
    is_credit: true,
    notes: '',
    is_pass_through_to_client: false,
    client_sales_amount: '',
  });
  const [lines, setLines] = useState<LineItem[]>([
    { line_type: 'inventory', description: '', quantity: 1, unit_cost: 0, tax_amount: 0 }
  ]);
  const [saving, setSaving] = useState(false);

  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', notes: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadInvoices();
    Promise.all([
      supabase.from('suppliers').select('id,name').eq('restaurant_id', restaurantId),
      supabase.from('supplier_contracts').select('*').eq('restaurant_id', restaurantId).eq('status', 'active'),
      supabase.from('projects').select('id,name').eq('restaurant_id', restaurantId),
      supabase.from('products').select('id,name,cost_price,unit,barcode,sku,category').eq('restaurant_id', restaurantId),
      supabase.from('chart_of_accounts').select('id,code,name,account_type').eq('restaurant_id', restaurantId),
      supabase.from('warehouses').select('id,name').eq('restaurant_id', restaurantId),
      supabase.from('sub_warehouses').select('id,name,main_warehouse_id').eq('restaurant_id', restaurantId),
      supabase.from('item_types').select('id,code,name_ar').eq('is_active', true),
      supabase.from('restaurants').select('inventory_method').eq('id', restaurantId).single(),
      supabase.from('inventory_settings').select('costing_method').eq('restaurant_id', restaurantId).maybeSingle(),
    ]).then(([s, sc, prj, p, a, w, sw, it, rest, settings]: any) => {
      console.log('Products query:', { data: p.data, error: p.error, restaurantId });
      // Show toast with query result for debugging
      if (p.error) {
        toast.error(`خطأ في تحميل المنتجات: ${p.error.message}`);
      } else if (!p.data || p.data.length === 0) {
        toast.warning(`لا توجد منتجات (${p.data?.length || 0}) للمطعم`);
      } else {
        toast.success(`تم تحميل ${p.data.length} منتج`);
      }
      setSuppliers(s.data || []);
      setSupplierContracts(sc.data || []);
      setProjects(prj.data || []);
      setProducts(p.data || []);
      setGlAccounts((a.data || []).filter((acc: any) => ['expense', 'asset'].includes(acc.account_type)));
      setWarehouses(w.data || []);
      setSubWarehouses(sw.data || []);
      setItemTypes(it.data || []);

      // Get costing method from restaurant settings first, then fallback to old settings
      let method = 'fifo';
      if (rest?.data?.inventory_method) {
        const m = rest.data.inventory_method.toLowerCase();
        method = m === 'weighted_avg' ? 'wac' : m;
      } else if (settings?.data?.costing_method) {
        method = settings.data.costing_method;
      }
      setCostingMethod(method);
    });
  }, [restaurantId]);

  // Auto-open the add modal when navigated from Inventory with a pre-selected product
  useEffect(() => {
    try {
      const prefillStr = localStorage.getItem('prefill_purchase_product');
      if (prefillStr) {
        const prefill = JSON.parse(prefillStr);
        localStorage.removeItem('prefill_purchase_product');
        if (prefill?.product_id) {
          // Pre-fill the invoice lines with the product from inventory
          setLines([{
            line_type: 'inventory',
            product_id: prefill.product_id,
            warehouse_id: prefill.warehouse_id || '',
            description: prefill.product_name || '',
            quantity: 1,
            unit_cost: Number(prefill.cost_price || 0),
            tax_amount: 0,
          }]);
          // Set a flag so we know to redirect back after saving
          localStorage.setItem('redirect_after_purchase_save', 'inventory');
          // Open the modal
          setShowAddModal(true);
        }
      }
    } catch (e) {
      console.error('prefill parse error:', e);
    }
  // Run after master data (products/warehouses) is loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, warehouses.length]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((r: any) => ({
        ...r,
        total_amount: Number(r.total_amount || 0),
        tax_amount: Number(r.tax_amount || 0),
        net_amount: Number(r.net_amount || 0),
        paid_amount: Number(r.paid_amount || 0),
      }));
      setInvoices(mapped);

      // Generate next invoice number based on history
      if (mapped.length > 0) {
        const lastNum = mapped[0].invoice_number;
        const match = lastNum.match(/\d+/);
        if (match) {
          const nextVal = parseInt(match[0]) + 1;
          const prefix = lastNum.replace(/\d+/, '');
          setForm(prev => ({ ...prev, invoice_number: `${prefix}${nextVal}` }));
        } else {
          setForm(prev => ({ ...prev, invoice_number: `PI-${mapped.length + 1}` }));
        }
      } else {
        setForm(prev => ({ ...prev, invoice_number: 'PI-1001' }));
      }
    } catch (e: any) {
      toast.error('فشل تحميل الفواتير: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const subTotal = lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_cost)), 0);
  const taxTotal = lines.reduce((s, l) => s + Number(l.tax_amount || 0), 0);
  const netTotal = subTotal + taxTotal;

  const addLine = () => setLines([...lines, { line_type: 'inventory', description: '', quantity: 1, unit_cost: 0, tax_amount: 0 }]);
  const updateLine = (i: number, patch: Partial<LineItem>) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const handleBarcodeScan = (code: string) => {
    if (!code) return;
    const p = products.find(pr => pr.barcode === code || pr.sku === code);
    if (p) {
      const existingIdx = lines.findIndex(l => l.product_id === p.id && l.line_type === 'inventory');
      if (existingIdx >= 0) {
        const currentQty = Number(lines[existingIdx].quantity) || 0;
        updateLine(existingIdx, { quantity: currentQty + 1 });
      } else {
        const newLine = { 
          line_type: 'inventory' as const, 
          product_id: p.id, 
          unit_cost: p.cost_price || 0, 
          description: p.name, 
          quantity: 1, 
          tax_amount: 0 
        };
        // If the last line is empty, replace it, otherwise add new
        if (lines.length === 1 && !lines[0].product_id && !lines[0].gl_account_id) {
          setLines([newLine]);
        } else {
          setLines([...lines, newLine]);
        }
      }
      setBarcodeInput('');
      toast.success(`تمت إضافة: ${p.name}`);
    } else {
      toast.error('لم يتم العثور على منتج بهذا الباركود');
    }
  };

  const handleSave = async () => {
    if (!form.supplier_id) { toast.error('اختر المورد'); return; }
    if (lines.length === 0) { toast.error('أضف بند واحد على الأقل'); return; }
    for (const l of lines) {
      if (l.line_type === 'inventory' && !l.product_id) { toast.error('اختر منتج لكل بند مخزون أو غير النوع إلى حساب'); return; }
      if (l.line_type === 'gl' && !l.gl_account_id) { toast.error('اختر حساب لكل بند محاسبي'); return; }
      if (!l.quantity || !l.unit_cost) { toast.error('أدخل الكمية والتكلفة لكل بند'); return; }
    }
    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === form.supplier_id);
      const paid = Number(form.paid_amount || 0);

      const clientSalesAmount = Number(form.client_sales_amount) || 0;
      const passThroughMarkup = form.is_pass_through_to_client ? clientSalesAmount - netTotal : 0;
      
      const { data: inv, error } = await supabase
        .from('purchase_invoices')
        .insert({
          restaurant_id: restaurantId,
          supplier_id: form.supplier_id,
          supplier_contract_id: form.supplier_contract_id || null,
          supplier_name: supplier?.name,
          invoice_number: form.invoice_number || `PI-${Date.now()}`,
          invoice_date: form.invoice_date,
          total_amount: subTotal,
          tax_amount: taxTotal,
          net_amount: netTotal,
          paid_amount: paid,
          is_credit: form.is_credit && paid < netTotal,
          notes: form.notes,
          status: 'draft',
          is_pass_through_to_client: form.is_pass_through_to_client,
          client_sales_amount: clientSalesAmount,
          pass_through_markup_amount: passThroughMarkup,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Insert lines
      const linesData = lines.map(l => ({
        invoice_id: inv.id,
        line_type: l.line_type,
        product_id: l.line_type === 'inventory' ? l.product_id : null,
        gl_account_id: l.line_type === 'gl' ? l.gl_account_id : null,
        warehouse_id: l.line_type === 'inventory' ? (l.warehouse_id || null) : null,
        sub_warehouse_id: l.line_type === 'inventory' ? (l.sub_warehouse_id || null) : null,
        description: l.description || '',
        quantity: Number(l.quantity),
        unit_cost: Number(l.unit_cost),
        total: Number(l.quantity) * Number(l.unit_cost),
        tax_amount: Number(l.tax_amount || 0),
      }));
      console.log('Saving invoice lines:', linesData);
      const { error: linesError } = await supabase.from('purchase_invoice_items').insert(linesData as any);
      if (linesError) {
        console.error('Failed to save invoice lines:', linesError);
        throw new Error('فشل حفظ بنود الفاتورة: ' + linesError.message);
      }

      // Create inventory movements for inventory items
      for (const l of lines) {
        if (l.line_type === 'inventory' && l.warehouse_id && l.product_id) {
          await supabase.from('inventory_movements').insert({
            product_id: l.product_id,
            warehouse_id: l.warehouse_id,
            sub_warehouse_id: l.sub_warehouse_id || null,
            movement_type: 'IN',
            quantity: Number(l.quantity),
            reference_type: 'PURCHASE',
            reference_id: inv.id,
            created_at: new Date().toISOString()
          });
        }
      }

      // Auto journal entry - simplified direct insert to avoid stack depth error
      try {
        // Get default accounts directly
        const { data: accounts, error: accountsError } = await supabase
          .from('chart_of_accounts')
          .select('id,code')
          .eq('restaurant_id', restaurantId)
          .in('code', ['1200', '1100', '2100']); // Inventory, Cash, Accounts Payable

        if (accountsError) {
          console.error('Failed to load accounts:', accountsError);
          toast.error('فشل تحميل الحسابات المحاسبية');
        } else {
          console.log('Available accounts:', accounts);
          const invAcc = accounts?.find(a => a.code === '1200');
          const cashAcc = accounts?.find(a => a.code === '1100');
          const apAcc = accounts?.find(a => a.code === '2100');

          if (!invAcc) {
            toast.error('حساب المخزون (1200) غير موجود - يرجى إضافته من دليل الحسابات');
          } else {
            // Get next entry number
            const { data: lastEntry } = await supabase
              .from('journal_entries')
              .select('entry_number')
              .eq('restaurant_id', restaurantId)
              .order('created_at', { ascending: false })
              .limit(1);

            const lastNum = lastEntry?.[0]?.entry_number || 'JE-000000';
            const num = parseInt(lastNum.replace(/\D/g, '')) || 0;
            const entryNumber = `JE-${String(num + 1).padStart(6, '0')}`;

            // Create journal entry
            const { data: journalData, error: journalError } = await supabase
              .from('journal_entries')
              .insert({
                restaurant_id: restaurantId,
                entry_number: entryNumber,
                entry_date: form.invoice_date,
                reference_type: 'purchase',
                reference_id: inv.id,
                description: `فاتورة مشتريات من ${supplier?.name || 'مورد'}`,
                source: 'pos',
                total_debit: netTotal,
                total_credit: netTotal,
                is_posted: true,
              })
              .select()
              .single();

            if (!journalError && journalData) {
              // Create journal lines
              const lines = [
                {
                  entry_id: journalData.id,
                  account_id: invAcc.id,
                  debit: netTotal,
                  credit: 0,
                  description: `شراء مخزون - ${inv.invoice_number}`,
                  line_order: 1,
                }
              ];

              // Add credit line
              const creditAcc = (form.is_credit && paid < netTotal && apAcc) ? apAcc : cashAcc;
              if (creditAcc) {
                lines.push({
                  entry_id: journalData.id,
                  account_id: creditAcc.id,
                  debit: 0,
                  credit: netTotal,
                  description: form.is_credit && paid < netTotal ? `ذمم موردين - ${supplier?.name}` : `دفع نقدي للمورد - ${supplier?.name}`,
                  line_order: 2,
                });
              }

              await supabase.from('journal_entry_lines').insert(lines);
              await supabase.from('purchase_invoices').update({ journal_entry_id: journalData.id }).eq('id', inv.id);
              toast.success(`تم إنشاء القيد المحاسبي ${entryNumber}`);
            } else {
              console.error('Journal entry creation failed:', journalError);
              toast.error('فشل إنشاء القيد: ' + (journalError?.message || 'خطأ غير معروف'));
            }
          }
        }
      } catch (jeErr: any) {
        console.error('Journal entry error:', jeErr);
        toast.error('فشل إنشاء القيد المحاسبي: ' + jeErr.message);
      }

      toast.success('تم حفظ الفاتورة');
      setShowAddModal(false);
      // If we were navigated here from Inventory, redirect back and let InventoryTab reload stock
      const redirectTarget = localStorage.getItem('redirect_after_purchase_save');
      if (redirectTarget === 'inventory') {
        localStorage.removeItem('redirect_after_purchase_save');
        window.dispatchEvent(new CustomEvent('navigate-to-inventory'));
        return;
      }
      setForm({
        supplier_id: '',
        supplier_contract_id: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        paid_amount: '',
        is_credit: true,
        notes: '',
        is_pass_through_to_client: false,
        client_sales_amount: '',
      });
      setLines([{ line_type: 'inventory', description: '', quantity: 1, unit_cost: 0, tax_amount: 0 }]);
      loadInvoices();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const openView = async (inv: PurchaseInvoice) => {
    setViewInvoice(inv);
    setShowViewModal(true);
    const { data } = await supabase
      .from('purchase_invoice_items')
      .select('*, products(name), chart_of_accounts(code,name), warehouses(name)')
      .eq('invoice_id', inv.id);
    setViewLines(data || []);
  };

  const handleDelete = async (inv: PurchaseInvoice) => {
    if (!confirm(`حذف الفاتورة ${inv.invoice_number}؟`)) return;
    try {
      await supabase.from('purchase_invoices').delete().eq('id', inv.id);
      toast.success('تم الحذف');
      loadInvoices();
    } catch (e: any) {
      toast.error('فشل الحذف: ' + e.message);
    }
  };

  const handleReceiveGoods = async (inv: PurchaseInvoice) => {
    if (inv.goods_received_at) { toast.info('تم استلام البضاعة بالفعل'); return; }
    const { data: items, error: itemsError } = await supabase
      .from('purchase_invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .eq('line_type', 'inventory');
    
    if (itemsError) {
      console.error('Failed to load invoice items:', itemsError);
      toast.error('فشل تحميل بنود الفاتورة');
      return;
    }
    
    const invItems = (items || []) as any[];
    console.log('Invoice items for receiving:', invItems);
    
    if (invItems.length === 0) {
      toast.info('لا توجد بنود مخزون في هذه الفاتورة - تأكد من اختيار نوع "مخزون" عند إضافة البنود');
      return;
    }

    if (!confirm(`استلام البضاعة وإضافتها للمخزون باستخدام طريقة ${costingMethod.toUpperCase()}؟`)) return;
    setProcessing(true);
    try {
      // Create inventory receipt header
      const receiptNumber = `RC-${Date.now()}`;
      const totalAmount = invItems.reduce((s, l) => s + Number(l.total), 0);
      const { data: receipt, error: rErr } = await supabase
        .from('inventory_receipts')
        .insert({
          restaurant_id: restaurantId,
          receipt_number: receiptNumber,
          supplier_id: inv.supplier_id,
          receipt_date: new Date().toISOString().split('T')[0],
          total_amount: totalAmount,
          discount_amount: 0,
          tax_amount: 0,
          net_amount: totalAmount,
          paid_amount: 0,
          status: 'posted',
          notes: `استلام تلقائي من فاتورة ${inv.invoice_number}`,
        } as any)
        .select()
        .single();
      if (rErr) throw rErr;

      // Insert receipt items + add cost layers + update product stock
      for (const l of invItems) {
        const product = products.find(p => p.id === l.product_id);
        await supabase.from('inventory_receipt_items').insert({
          inventory_receipt_id: receipt.id,
          product_id: l.product_id,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
          total_cost: l.total,
          unit: product?.unit || 'piece',
          warehouse_location: l.warehouse_id || null,
        } as any);

        // Apply costing method via service (using new inventoryCosting)
        try {
          // Use sub_warehouse_id if provided, otherwise use warehouse_id
          const subWarehouseId = l.sub_warehouse_id || l.warehouse_id;
          if (subWarehouseId) {
            await inventoryCosting.addCostLayer(
              l.product_id,
              subWarehouseId,
              Number(l.quantity),
              Number(l.unit_cost),
              'PURCHASE',
              'PURCHASE_INVOICE',
              receipt.id,
              receipt.invoice_number,
              'IFRS'
            );
          }
        } catch (e) { console.warn('cost layer:', e); }

        // Update product on-hand quantity + new cost (WAC) or last cost (FIFO/LIFO)
        const { data: cur } = await supabase.from('products').select('quantity, cost_price').eq('id', l.product_id).single();
        const curQty = Number(cur?.quantity || 0);
        const curCost = Number(cur?.cost_price || 0);
        const newQty = curQty + Number(l.quantity);
        let newCost = curCost;
        if (costingMethod === 'wac') {
          newCost = newQty > 0 ? ((curQty * curCost) + (Number(l.quantity) * Number(l.unit_cost))) / newQty : Number(l.unit_cost);
        } else {
          // FIFO/LIFO: keep last cost as reference; layers used at sale time
          newCost = Number(l.unit_cost);
        }
        await supabase.from('products').update({ quantity: newQty, cost_price: newCost }).eq('id', l.product_id);
      }

      await supabase.from('purchase_invoices').update({
        goods_received_at: new Date().toISOString(),
        inventory_receipt_id: receipt.id,
        status: 'received',
      }).eq('id', inv.id);

      toast.success('تم استلام البضاعة وتحديث المخزون');
      loadInvoices();
      if (viewInvoice?.id === inv.id) openView(inv);
    } catch (e: any) {
      toast.error('فشل الاستلام: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const openPay = (inv: PurchaseInvoice) => {
    setViewInvoice(inv);
    setPayForm({ amount: Math.max(0, inv.net_amount - inv.paid_amount).toString(), payment_method: 'cash', notes: '' });
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!viewInvoice) return;
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) { toast.error('أدخل مبلغ صحيح'); return; }
    setProcessing(true);
    try {
      const newPaid = viewInvoice.paid_amount + amount;
      await supabase.from('purchase_invoices').update({ paid_amount: newPaid }).eq('id', viewInvoice.id);
      // Insert supplier transaction - database trigger will automatically update supplier balance
      if (viewInvoice.supplier_id) {
        await supabase.from('supplier_transactions').insert({
          supplier_id: viewInvoice.supplier_id,
          restaurant_id: restaurantId,
          type: 'payment',
          amount: -amount,
          description: payForm.notes || `سداد فاتورة ${viewInvoice.invoice_number}`,
        } as any);
      }
      toast.success('تم تسجيل السداد');
      setShowPayModal(false);
      loadInvoices();
    } catch (e: any) {
      toast.error('فشل السداد: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredInvoices = invoices.filter(r =>
    r.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusBadge = (inv: PurchaseInvoice) => {
    const paidFully = inv.paid_amount >= inv.net_amount;
    const received = !!inv.goods_received_at;
    if (paidFully && received) return <Badge className="bg-emerald-500">مكتملة</Badge>;
    if (received) return <Badge variant="outline" className="border-amber-500 text-amber-600">مستلمة - غير مدفوعة</Badge>;
    if (paidFully) return <Badge variant="outline" className="border-blue-500 text-blue-600">مدفوعة - لم تستلم</Badge>;
    return <Badge variant="outline">مسودة</Badge>;
  };

  return (
    <div className="space-y-6 fade-in p-4">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black">فواتير المشتريات</h2>
          <p className="text-muted-foreground text-sm">إدارة فواتير الموردين مع بنود مخزون أو محاسبية، السداد واستلام البضاعة.</p>
        </div>
        <Button className="gradient-bg border-0 text-white gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> فاتورة جديدة
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 glass-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
              <h3 className="text-xl font-bold">{invoices.reduce((s, i) => s + i.net_amount, 0).toLocaleString()} {currency}</h3>
            </div>
            <TrendingUp className="w-6 h-6 text-primary/60" />
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground">غير مدفوع</p>
              <h3 className="text-xl font-bold text-destructive">{(invoices.reduce((s, i) => s + (i.net_amount - i.paid_amount), 0)).toLocaleString()} {currency}</h3>
            </div>
            <TrendingDown className="w-6 h-6 text-destructive/60" />
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground">في انتظار الاستلام</p>
              <h3 className="text-xl font-bold">{invoices.filter(i => !i.goods_received_at).length}</h3>
            </div>
            <Warehouse className="w-6 h-6 text-amber-500/60" />
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground">طريقة التسعير</p>
              <h3 className="text-sm font-bold uppercase mt-1">
                {costingMethod === 'wac' ? 'المتوسط المرجح (WAC)' : 
                 costingMethod === 'fifo' ? 'الوارد أولاً يصرف أولاً (FIFO)' : 
                 costingMethod === 'lifo' ? 'الوارد أخيراً يصرف أولاً (LIFO)' : costingMethod}
              </h3>
            </div>
            <Package className="w-6 h-6 text-primary/60" />
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="البحث برقم الفاتورة أو المورد..." className="pr-10 h-11 bg-card/50" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-primary/5 border-b border-border">
                <th className="px-4 py-3 font-bold text-xs">رقم الفاتورة</th>
                <th className="px-4 py-3 font-bold text-xs">التاريخ</th>
                <th className="px-4 py-3 font-bold text-xs">المورد</th>
                <th className="px-4 py-3 font-bold text-xs">الصافي</th>
                <th className="px-4 py-3 font-bold text-xs">المدفوع</th>
                <th className="px-4 py-3 font-bold text-xs">الحالة</th>
                <th className="px-4 py-3 font-bold text-xs">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center"><RefreshCcw className="w-8 h-8 animate-spin mx-auto text-primary opacity-30" /></td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground italic">لا توجد فواتير</td></tr>
              ) : (
                filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-xs">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-sm">{new Date(invoice.invoice_date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3 font-bold text-sm">{invoice.supplier_name || '-'}</td>
                    <td className="px-4 py-3 font-bold text-primary">{invoice.net_amount.toLocaleString()} {currency}</td>
                    <td className="px-4 py-3 text-sm">{invoice.paid_amount.toLocaleString()} {currency}</td>
                    <td className="px-4 py-3">{statusBadge(invoice)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="عرض" onClick={() => openView(invoice)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" title="سداد"
                          disabled={invoice.paid_amount >= invoice.net_amount}
                          onClick={() => openPay(invoice)}
                          className="text-emerald-600 hover:text-emerald-600"
                        >
                          <Banknote className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" title="استلام البضاعة"
                          disabled={!!invoice.goods_received_at}
                          onClick={() => handleReceiveGoods(invoice)}
                          className="text-blue-600 hover:text-blue-600"
                        >
                          <Warehouse className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="حذف" className="text-destructive hover:text-destructive" onClick={() => handleDelete(invoice)}>
                          <Trash2 className="w-4 h-4" />
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
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">فاتورة مشتريات جديدة</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 py-2">
            <div className="col-span-2">
              <Label>المورد *</Label>
              <Select value={form.supplier_id} onValueChange={v => setForm({ ...form, supplier_id: v, supplier_contract_id: '' })}>
                <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>عقد المورد</Label>
              <Select value={form.supplier_contract_id} onValueChange={v => setForm({ ...form, supplier_contract_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر العقد (اختياري)" /></SelectTrigger>
                <SelectContent>
                  {supplierContracts.filter(sc => sc.supplier_id === form.supplier_id).map(sc => 
                    <SelectItem key={sc.id} value={sc.id}>{sc.name} ({new Date(sc.start_date).toLocaleDateString('ar-EG')} - {new Date(sc.end_date).toLocaleDateString('ar-EG')})</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>رقم الفاتورة</Label>
              <Input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} placeholder="تلقائي" />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} />
            </div>
          </div>
          
          {/* Pass-through to Client Toggle */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 mt-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPassThrough"
                checked={form.is_pass_through_to_client}
                onChange={(e) => setForm({ ...form, is_pass_through_to_client: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <Label htmlFor="isPassThrough" className="text-sm">
                فاتورة مُمرّة للعميل (تُستخدم لحساب البونص فقط
              </Label>
            </div>
            {form.is_pass_through_to_client && (
              <div>
                <Label>سعر البيع للعميل ({currency})</Label>
                <Input
                  type="number"
                  value={form.client_sales_amount}
                  onChange={(e) => setForm({ ...form, client_sales_amount: e.target.value })}
                  placeholder="مثال: 1000"
                />
              </div>
            )}
          </div>

          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex items-center gap-4">
            <div className="flex-1 relative">
              <Barcode className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-primary" />
              <Input
                placeholder="امسح الباركود لإضافة منتج فورا..."
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleBarcodeScan(barcodeInput);
                    e.preventDefault();
                  }
                }}
                className="pr-10 border-primary/20 focus:border-primary"
              />
            </div>
            <p className="text-[10px] text-muted-foreground max-w-[150px]">يمكنك استخدام قارئ الباركود أو إدخال الكود يدوياً والضغط على Enter</p>
          </div>

          {/* Lines table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">بنود الفاتورة</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-4 h-4 ml-1" /> إضافة بند</Button>
              </div>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-2 text-right">النوع</th>
                    <th className="px-2 py-2 text-right min-w-[200px]">المنتج / الحساب (بحث)</th>
                    <th className="px-2 py-2 text-right">المخزن</th>
                    <th className="px-2 py-2 text-right">المخزن الفرعي</th>
                    <th className="px-2 py-2 text-right">الوصف</th>
                    <th className="px-2 py-2 text-center w-32">الكمية</th>
                    <th className="px-2 py-2 text-right w-24">التكلفة</th>
                    <th className="px-2 py-2 text-right w-20">الضريبة</th>
                    <th className="px-2 py-2 text-right w-24">الإجمالي</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">
                        <select
                          value={l.line_type}
                          onChange={e => updateLine(i, { line_type: e.target.value as any, product_id: undefined, gl_account_id: undefined })}
                          className="w-full px-2 py-1 rounded bg-background border border-input"
                        >
                          <option value="inventory">مخزون</option>
                          <option value="gl">حساب</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        {l.line_type === 'inventory' ? (
                          <div className="relative group">
                            <Input
                              placeholder="بحث بالاسم أو الكود..."
                              defaultValue={products.find(p => p.id === l.product_id)?.name || ''}
                              className="h-8 text-xs pr-7"
                              list={`product-list-${i}`}
                              onChange={e => {
                                const val = e.target.value;
                                const p = products.find(pr => pr.name === val || pr.barcode === val || pr.sku === val);
                                if (p) {
                                  updateLine(i, { product_id: p.id, unit_cost: l.unit_cost || (p?.cost_price ?? 0), description: l.description || p?.name || '' });
                                }
                              }}
                            />
                            <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <datalist id={`product-list-${i}`}>
                              {products.map(p => <option key={p.id} value={p.name}>{p.barcode ? `[${p.barcode}] ` : ''}{p.sku ? `[${p.sku}] ` : ''}{p.category || ''}</option>)}
                            </datalist>
                          </div>
                        ) : (
                          <select
                            value={l.gl_account_id || ''}
                            onChange={e => {
                              const acc = glAccounts.find(a => a.id === e.target.value);
                              updateLine(i, { gl_account_id: e.target.value, description: l.description || acc?.name || '' });
                            }}
                            className="w-full px-2 py-1 rounded bg-background border border-input h-8"
                          >
                            <option value="">— اختر حساب —</option>
                            {glAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {l.line_type === 'inventory' ? (
                          <select
                            value={l.warehouse_id || ''}
                            onChange={e => updateLine(i, { warehouse_id: e.target.value, sub_warehouse_id: '' })}
                            className="w-full px-2 py-1 rounded bg-background border border-input h-8"
                          >
                            <option value="">افتراضي</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        ) : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-2 py-1">
                        {l.line_type === 'inventory' && l.warehouse_id ? (
                          <select
                            value={l.sub_warehouse_id || ''}
                            onChange={e => updateLine(i, { sub_warehouse_id: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-background border border-input h-8"
                          >
                            <option value="">اختر المخزن الفرعي</option>
                            {subWarehouses.filter(sw => sw.main_warehouse_id === l.warehouse_id).map(sw => 
                              <option key={sw.id} value={sw.id}>{sw.name}</option>
                            )}
                          </select>
                        ) : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-2 py-1">
                        <Input value={l.description} onChange={e => updateLine(i, { description: e.target.value })} className="h-8 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-0.5">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateLine(i, { quantity: Math.max(0, (Number(l.quantity) || 0) - 1) })}><Minus className="w-3 h-3" /></Button>
                          <Input 
                            type="number" 
                            step="0.001" 
                            value={l.quantity} 
                            onChange={e => updateLine(i, { quantity: Number(e.target.value) })} 
                            className="h-7 text-xs text-center border-0 bg-transparent focus-visible:ring-0 px-0" 
                          />
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateLine(i, { quantity: (Number(l.quantity) || 0) + 1 })}><Plus className="w-3 h-3" /></Button>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" step="0.01" value={l.unit_cost} onChange={e => updateLine(i, { unit_cost: Number(e.target.value) })} className="h-8 text-xs" />
                      </td>
                      <td className="px-2 py-1">
                        <Input type="number" step="0.01" value={l.tax_amount} onChange={e => updateLine(i, { tax_amount: Number(e.target.value) })} className="h-8 text-xs" />
                      </td>
                      <td className="px-2 py-1 font-bold">{((Number(l.quantity) || 0) * (Number(l.unit_cost) || 0)).toFixed(2)}</td>
                      <td className="px-2 py-1">
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeLine(i)}><X className="w-3 h-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 font-bold">
                  <tr>
                    <td colSpan={8} className="px-2 py-2 text-left">المجموع</td>
                    <td className="px-2 py-2">{subTotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={8} className="px-2 py-2 text-left">الضريبة</td>
                    <td className="px-2 py-2">{taxTotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                  <tr className="text-primary text-base">
                    <td colSpan={8} className="px-2 py-2 text-left">الصافي</td>
                    <td className="px-2 py-2">{netTotal.toFixed(2)} {currency}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <Label>المدفوع نقداً</Label>
              <Input type="number" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} placeholder="0 = آجل بالكامل" />
            </div>
            <div className="flex items-end gap-2">
              <input type="checkbox" id="iscredit" checked={form.is_credit} onChange={e => setForm({ ...form, is_credit: e.target.checked })} />
              <Label htmlFor="iscredit">ذمم آجلة</Label>
            </div>
            <div className="col-span-1">
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={1} />
            </div>
          </div>

          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
            <Button className="gradient-bg border-0 text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4">
              <span>فاتورة {viewInvoice?.invoice_number}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  disabled={!viewInvoice || viewInvoice.paid_amount >= (viewInvoice?.net_amount || 0)}
                  onClick={() => viewInvoice && openPay(viewInvoice)}
                >
                  <Banknote className="w-4 h-4 ml-1" /> سداد الفاتورة
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={!viewInvoice || !!viewInvoice.goods_received_at}
                  onClick={() => viewInvoice && handleReceiveGoods(viewInvoice)}
                >
                  <Warehouse className="w-4 h-4 ml-1" /> استلام البضاعة
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground">المورد: </span><span className="font-bold">{viewInvoice.supplier_name}</span></div>
                <div><span className="text-muted-foreground">التاريخ: </span>{new Date(viewInvoice.invoice_date).toLocaleDateString('ar-EG')}</div>
                <div><span className="text-muted-foreground">الإجمالي: </span><span className="font-bold text-primary">{viewInvoice.net_amount.toLocaleString()} {currency}</span></div>
                <div><span className="text-muted-foreground">المدفوع: </span>{viewInvoice.paid_amount.toLocaleString()} {currency}</div>
                <div className="col-span-4">{statusBadge(viewInvoice)} {viewInvoice.goods_received_at && <Badge className="bg-blue-500 mr-2"><CheckCircle2 className="w-3 h-3 ml-1" /> تم الاستلام</Badge>}</div>
              </div>
              <table className="w-full text-xs border rounded">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-2 text-right">النوع</th>
                    <th className="px-2 py-2 text-right">المنتج/الحساب</th>
                    <th className="px-2 py-2 text-right">الوصف</th>
                    <th className="px-2 py-2 text-right">الكمية</th>
                    <th className="px-2 py-2 text-right">التكلفة</th>
                    <th className="px-2 py-2 text-right">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLines.map((l: any) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-2 py-1">
                        <Badge variant={l.line_type === 'inventory' ? 'default' : 'outline'}>
                          {l.line_type === 'inventory' ? 'مخزون' : 'حساب'}
                        </Badge>
                      </td>
                      <td className="px-2 py-1 font-medium">
                        {l.line_type === 'inventory' ? l.products?.name : `${l.chart_of_accounts?.code} - ${l.chart_of_accounts?.name}`}
                      </td>
                      <td className="px-2 py-1">{l.description}</td>
                      <td className="px-2 py-1">{Number(l.quantity).toLocaleString()}</td>
                      <td className="px-2 py-1">{Number(l.unit_cost).toLocaleString()}</td>
                      <td className="px-2 py-1 font-bold">{Number(l.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pay Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>سداد فاتورة {viewInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-3">
              <div className="bg-secondary/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">المتبقي</p>
                <p className="text-2xl font-bold text-destructive">{(viewInvoice.net_amount - viewInvoice.paid_amount).toFixed(2)} {currency}</p>
              </div>
              <div>
                <Label>المبلغ *</Label>
                <Input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <select value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-md bg-background border border-input text-sm">
                  <option value="cash">نقدي</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="instapay">إنستاباي</option>
                </select>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Input value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gradient-bg text-primary-foreground border-0" disabled={processing} onClick={handlePay}>
                  {processing ? 'جاري السداد...' : 'تأكيد السداد'}
                </Button>
                <Button variant="outline" onClick={() => setShowPayModal(false)}>إلغاء</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
