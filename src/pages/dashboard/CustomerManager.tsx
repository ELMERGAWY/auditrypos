// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Search, Phone, MapPin, FileText, TrendingUp, 
  TrendingDown, Wallet, Download, CreditCard, AlertCircle, Receipt,
  ArrowRight, Calendar, Eye, FileJson, Trash2, Banknote, Edit, X, Settings, Printer
} from 'lucide-react';
import { CustomerSearch } from './CustomerSearch';
import { PaymentAllocations, type Allocation } from '@/components/PaymentAllocations';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number;
  credit_limit: number | null;
  tax_number: string | null;
  created_at: string;
  last_transaction_date: string | null;
  total_sales: number;
}

interface CustomerTransaction {
  id: string;
  date: string;
  type: 'invoice' | 'payment' | 'return' | 'credit_note';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  items?: any[];
}

interface CustomerSalesReturn {
  id: string;
  return_number: string;
  return_date: string;
  total_amount: number;
  reason: string | null;
  status: string;
}

interface ReceiptVoucher {
  id: string;
  voucher_number: string;
  voucher_date: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  account_id: string | null;
  counter_account_id: string | null;
  created_at: string;
  isLegacy?: boolean;
  transaction_id?: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function CustomerManager({ restaurantId, currency }: Props) {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [returns, setReturns] = useState<CustomerSalesReturn[]>([]);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'cash', notes: '' });
  const [processingPayment, setProcessingPayment] = useState(false);

  // Receipt Vouchers
  const [receiptVouchers, setReceiptVouchers] = useState<ReceiptVoucher[]>([]);
  const [receiptVoucherSearch, setReceiptVoucherSearch] = useState('');
  const [showReceiptVoucherModal, setShowReceiptVoucherModal] = useState(false);
  const [voucherAllocations, setVoucherAllocations] = useState<Allocation[]>([]);
  const [editingReceiptVoucher, setEditingReceiptVoucher] = useState<ReceiptVoucher | null>(null);

  const [receiptVoucherForm, setReceiptVoucherForm] = useState({
    customer_id: '',
    customer_name: '',
    amount: '',
    payment_method: 'cash',
    notes: '',
    voucher_date: new Date().toISOString().split('T')[0],
    account_id: '',
    counter_account_id: ''
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  // Print Settings
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    customerCopy: true,
    businessCopy: true,
    kitchenCopy: false
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
    tax_number: '',
    customer_type: 'retail',
    notes: '',
    customer_ref: ''
  });

  useEffect(() => {
    loadCustomers();
    loadReceiptVouchers();
    loadAccounts();
  }, [restaurantId]);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, name, code, account_type')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل الحسابات: ' + error.message);
    }
  };

  const filteredReceiptVouchers = receiptVouchers.filter(v =>
    !receiptVoucherSearch ||
    v.voucher_number.toLowerCase().includes(receiptVoucherSearch.toLowerCase()) ||
    v.customer_name?.toLowerCase().includes(receiptVoucherSearch.toLowerCase()) ||
    v.notes?.toLowerCase().includes(receiptVoucherSearch.toLowerCase())
  );

  const isReceivableAccount = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc && (acc.code?.startsWith('12') || acc.name?.includes('عملاء') || acc.name?.includes('مدينة'));
  };

  const handleReceiptAccountChange = (accountId: string) => {
    setReceiptVoucherForm(prev => ({
      ...prev,
      account_id: accountId,
      counter_account_id: isReceivableAccount(accountId) ? accountId : prev.counter_account_id
    }));
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    const recAcc = accounts.find(acc => acc.code?.startsWith('12') || acc.name?.includes('عملاء') || acc.name?.includes('مدينة'));
    setReceiptVoucherForm(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.name || '',
      account_id: recAcc ? recAcc.id : prev.account_id,
      counter_account_id: recAcc ? recAcc.id : prev.counter_account_id
    }));
  };

  const handleCustomerSearchChange = (name: string, phone?: string, address?: string, customerId?: string) => {
    const recAcc = accounts.find(acc => acc.code?.startsWith('12') || acc.name?.includes('عملاء') || acc.name?.includes('مدينة'));
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      setReceiptVoucherForm(prev => ({
        ...prev,
        customer_id: customerId,
        customer_name: customer?.name || name,
        account_id: recAcc ? recAcc.id : prev.account_id,
        counter_account_id: recAcc ? recAcc.id : prev.counter_account_id
      }));
    } else {
      setReceiptVoucherForm(prev => ({
        ...prev,
        customer_name: name
      }));
    }
  };

  const handlePrintReceiptVoucher = () => {
    const customer = customers.find(c => c.id === receiptVoucherForm.customer_id);
    const amount = Number(receiptVoucherForm.amount);
    const newBalance = customer ? customer.balance - amount : 0;
    const receiptDate = new Date(receiptVoucherForm.voucher_date).toLocaleDateString('ar-EG');
    const receiptTime = new Date().toLocaleTimeString('ar-EG');
    
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (printWindow) {
      let content = '';
      
      if (printSettings.customerCopy) {
        content += `
          <div class="page-break">
            <div class="center bold" style="margin-bottom: 5px;">نسخة العميل</div>
            <div class="center title">سند قبض</div>
            <div class="divider"></div>
            <div class="row"><span>التاريخ:</span><span>${receiptDate}</span></div>
            <div class="row"><span>الوقت:</span><span>${receiptTime}</span></div>
            <div class="divider"></div>
            <div class="row"><span>اسم العميل:</span><span class="bold">${receiptVoucherForm.customer_name}</span></div>
            <div class="row"><span>الهاتف:</span><span>${customer?.phone || '-'}</span></div>
            <div class="divider"></div>
            <div class="amount">${amount.toFixed(2)} ${currency}</div>
            ${customer ? `<div class="row"><span>الرصيد السابق:</span><span>${customer.balance.toFixed(2)} ${currency}</span></div><div class="row"><span>الرصيد الجديد:</span><span class="bold">${newBalance.toFixed(2)} ${currency}</span></div>` : ''}
            ${receiptVoucherForm.notes ? `<div class="divider"></div><div>ملاحظات: ${receiptVoucherForm.notes}</div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size:10px;color:#666;margin-top:8px">Powered by AuditryPOS</div>
          </div>
        `;
      }
      
      if (printSettings.businessCopy) {
        content += `
          <div class="page-break">
            <div class="center bold" style="margin-bottom: 5px;">نسخة المؤسسة</div>
            <div class="center title">سند قبض</div>
            <div class="divider"></div>
            <div class="row"><span>التاريخ:</span><span>${receiptDate}</span></div>
            <div class="row"><span>الوقت:</span><span>${receiptTime}</span></div>
            <div class="divider"></div>
            <div class="row"><span>اسم العميل:</span><span class="bold">${receiptVoucherForm.customer_name}</span></div>
            <div class="row"><span>الهاتف:</span><span>${customer?.phone || '-'}</span></div>
            <div class="divider"></div>
            <div class="amount">${amount.toFixed(2)} ${currency}</div>
            ${customer ? `<div class="row"><span>الرصيد السابق:</span><span>${customer.balance.toFixed(2)} ${currency}</span></div><div class="row"><span>الرصيد الجديد:</span><span class="bold">${newBalance.toFixed(2)} ${currency}</span></div>` : ''}
            ${receiptVoucherForm.notes ? `<div class="divider"></div><div>ملاحظات: ${receiptVoucherForm.notes}</div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size:10px;color:#666;margin-top:8px">Powered by AuditryPOS</div>
          </div>
        `;
      }
      
      if (printSettings.kitchenCopy) {
        content += `
          <div class="page-break">
            <div class="center bold" style="margin-bottom: 5px;">نسخة المطبخ</div>
            <div class="center title">سند قبض</div>
            <div class="divider"></div>
            <div class="row"><span>التاريخ:</span><span>${receiptDate}</span></div>
            <div class="row"><span>الوقت:</span><span>${receiptTime}</span></div>
            <div class="divider"></div>
            <div class="row"><span>اسم العميل:</span><span class="bold">${receiptVoucherForm.customer_name}</span></div>
            <div class="amount">${amount.toFixed(2)} ${currency}</div>
            ${receiptVoucherForm.notes ? `<div class="divider"></div><div>ملاحظات: ${receiptVoucherForm.notes}</div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size:10px;color:#666;margin-top:8px">Powered by AuditryPOS</div>
          </div>
        `;
      }

      printWindow.document.write(`<!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head><meta charset="UTF-8"><title>سند قبض</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 18px; font-weight: bold; margin: 8px 0; border: 2px solid #000; padding: 4px; }
          .divider { border-top: 1px dashed #333; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; }
          .amount { font-size: 20px; font-weight: bold; text-align: center; margin: 8px 0; }
          .page-break { page-break-after: always; }
          .page-break:last-child { page-break-after: avoid; }
          @media print { @page { margin: 0; } }
        </style></head>
        <body>
          ${content}
        </body></html>`);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
    }
  };

  const loadReceiptVouchers = async () => {
    try {
      const vouchers: ReceiptVoucher[] = [];

      const { data, error } = await supabase
        .from('receipt_vouchers')
        .select(`
          id, voucher_number, voucher_date, customer_id, amount, payment_method, notes,
          account_id, counter_account_id, created_at,
          customers(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('voucher_date', { ascending: false });

      if (!error && data) {
        vouchers.push(...(data || []).map((rv: any) => ({
          id: rv.id,
          voucher_number: rv.voucher_number,
          voucher_date: rv.voucher_date,
          customer_id: rv.customer_id,
          customer_name: rv.customers?.name || 'غير معروف',
          amount: Number(rv.amount),
          payment_method: rv.payment_method,
          notes: rv.notes,
          account_id: rv.account_id,
          counter_account_id: rv.counter_account_id,
          created_at: rv.created_at
        })));
      }

      // سندات قديمة من customer_transactions (قبل إنشاء جدول receipt_vouchers)
      const { data: legacyTxs } = await supabase
        .from('customer_transactions')
        .select('id, customer_id, amount, description, payment_method, created_at, customers(name)')
        .eq('restaurant_id', restaurantId)
        .eq('type', 'payment')
        .order('created_at', { ascending: false });

      const legacyVouchers: ReceiptVoucher[] = (legacyTxs || [])
        .filter((tx: any) => !vouchers.some(v => v.customer_id === tx.customer_id && v.amount === Math.abs(Number(tx.amount)) && v.created_at === tx.created_at))
        .map((tx: any) => ({
          id: `legacy-${tx.id}`,
          voucher_number: `RV-LEG-${String(tx.id).slice(0, 6)}`,
          voucher_date: tx.created_at,
          customer_id: tx.customer_id,
          customer_name: tx.customers?.name || 'غير معروف',
          amount: Math.abs(Number(tx.amount)),
          payment_method: tx.payment_method || 'cash',
          notes: tx.description,
          account_id: null,
          counter_account_id: null,
          created_at: tx.created_at,
          isLegacy: true,
          transaction_id: tx.id
        }));

      setReceiptVouchers([...vouchers, ...legacyVouchers]);
    } catch (error: any) {
      toast.error('فشل تحميل سندات القبض: ' + error.message);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      
      // Get customers with aggregated data
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id, name, phone, email, address, balance, credit_limit, tax_number, created_at, customer_ref,
          orders(id, total, created_at, status),
          customer_transactions(id, amount, type, created_at)
        `)
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) throw error;

      const formattedCustomers: Customer[] = await Promise.all((data || []).map(async (c: any) => {
        const sales = (c.orders || []).filter((o: any) => o.status !== 'cancelled')
          .reduce((sum: number, o: any) => sum + Number(o.total), 0) || 0;
        
        const lastTx = (c.customer_transactions || []).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        // Calculate balance from customer transactions (statement) instead of using the cached balance field
        let calculatedBalance = 0;
        
        // Get orders (invoices) for this customer
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, total, paid_amount, status, created_at')
          .eq('customer_id', c.id)
          .eq('restaurant_id', restaurantId);
        
        // Get customer transactions (payments, etc.)
        const { data: txData } = await supabase
          .from('customer_transactions')
          .select('id, amount, type, created_at')
          .eq('customer_id', c.id)
          .neq('type', 'sale'); // Exclude 'sale' type as it's redundant with orders
        
        // Build and sort all transactions by date
        const allTransactions: any[] = [];
        
        // Add orders as debit transactions
        ordersData?.forEach((order: any) => {
          if (order.status !== 'cancelled') {
            allTransactions.push({
              date: order.created_at,
              debit: Number(order.total) || 0,
              credit: 0
            });
            // Add immediate payment as credit
            const paidAtCheckout = Number(order.paid_amount) || 0;
            if (paidAtCheckout > 0) {
              allTransactions.push({
                date: order.created_at,
                debit: 0,
                credit: paidAtCheckout
              });
            }
          }
        });
        
        // Add other transactions
        txData?.forEach((tx: any) => {
          const amount = Number(tx.amount) || 0;
          allTransactions.push({
            date: tx.created_at,
            debit: tx.type === 'debit' ? Math.abs(amount) : 0,
            credit: tx.type !== 'debit' ? Math.abs(amount) : 0
          });
        });
        
        // Sort by date and calculate running balance
        allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        allTransactions.forEach(tx => {
          calculatedBalance += (tx.debit || 0) - (tx.credit || 0);
        });
        
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          balance: calculatedBalance, // Use calculated balance from statement
          credit_limit: c.credit_limit,
          tax_number: c.tax_number,
          created_at: c.created_at,
          last_transaction_date: lastTx?.created_at,
          total_sales: sales
        };
      }));

      setCustomers(formattedCustomers);
    } catch (error: any) {
      console.error('Failed to load customers:', error);
      toast.error('فشل تحميل العملاء: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerStatement = async (customerId: string) => {
    try {
      // Get orders (invoices) with items
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id, order_number, created_at, total, paid_amount, status,
          order_items(menu_item_name, quantity, price)
        `)
        .eq('customer_id', customerId)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true });

      // Get customer transactions (subsequent payments)
      // We filter out 'sale' type because we already add the full order total as debit
      const { data: paymentsData } = await supabase
        .from('customer_transactions')
        .select('id, amount, type, description, created_at, order_id')
        .eq('customer_id', customerId)
        .neq('type', 'sale') // CRITICAL: 'sale' in transactions is redundant with 'orders' table
        .order('created_at', { ascending: true });

      // Build statement
      const statement: CustomerTransaction[] = [];

      // Add orders and their immediate payments
      ordersData?.forEach((order: any) => {
        if (order.status !== 'cancelled') {
          const totalAmount = Number(order.total);
          const paidAtCheckout = Number(order.paid_amount || 0);
          
          // 1. Add the Invoice as a DEBIT (What they owe)
          statement.push({
            id: order.id,
            date: order.created_at,
            type: 'invoice',
            reference: order.order_number,
            description: 'فاتورة مبيعات',
            debit: totalAmount,
            credit: 0,
            balance: 0,
            items: order.order_items
          });

          // 2. Add the payment made at checkout as a CREDIT (What they paid)
          if (paidAtCheckout > 0) {
            statement.push({
              id: `${order.id}-payment`,
              date: order.created_at,
              type: 'payment',
              reference: order.order_number,
              description: 'سداد دفعة مقدمة (عند الفاتورة)',
              debit: 0,
              credit: paidAtCheckout,
              balance: 0
            });
          }
        }
      });

      // Add other transactions (subsequent payments, returns, etc.)
      paymentsData?.forEach((payment: any) => {
        const amount = Number(payment.amount);
        statement.push({
          id: payment.id,
          date: payment.created_at,
          type: payment.type as any,
          reference: '',
          description: payment.description || (payment.type === 'payment' ? 'سداد' : 'تسوية'),
          debit: payment.type === 'debit' ? Math.abs(amount) : 0,
          credit: payment.type !== 'debit' ? Math.abs(amount) : 0,
          balance: 0
        });
      });

      // Sort by date then calculate cumulative balance
      statement.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let runningBalance = 0;
      statement.forEach(tx => {
        runningBalance += (Number(tx.debit) || 0) - (Number(tx.credit) || 0);
        tx.balance = runningBalance;
      });

      setTransactions(statement);
    } catch (error: any) {
      console.error('Failed to load statement:', error);
      toast.error('فشل تحميل كشف الحساب: ' + error.message);
    }
  };

  const loadCustomerReturns = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('sales_returns')
        .select('id, return_number, return_date, total_amount, reason, status')
        .eq('customer_id', customerId)
        .eq('restaurant_id', restaurantId)
        .order('return_date', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل مردودات المبيعات: ' + error.message);
    }
  };

  const handleAddCustomer = async () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }

    try {
      const trimmedName = formData.name.trim();
      const trimmedPhone = formData.phone?.trim();

      // Duplicate prevention: match by phone (primary) or by name if no phone
      let dupQuery = supabase
        .from('customers')
        .select('id, name, phone')
        .eq('restaurant_id', restaurantId);
      if (trimmedPhone) {
        dupQuery = dupQuery.eq('phone', trimmedPhone);
      } else {
        dupQuery = dupQuery.ilike('name', trimmedName);
      }
      const { data: existing } = await dupQuery.limit(1);
      if (existing && existing.length > 0) {
        const dup = existing[0];
        toast.error(`العميل موجود مسبقاً: ${dup.name}${dup.phone ? ` (${dup.phone})` : ''}`);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .insert({
          restaurant_id: restaurantId,
          name: trimmedName,
          phone: trimmedPhone || null,
          email: formData.email || null,
          address: formData.address || null,
          credit_limit: formData.credit_limit ? Number(formData.credit_limit) : 0,
          tax_number: formData.tax_number || null,
          customer_type: formData.customer_type || 'retail',
          notes: formData.notes || null,
          customer_ref: formData.customer_ref || null,
          balance: 0
        } as any);

      if (error) throw error;

      toast.success('تم إضافة العميل بنجاح');
      setShowAddModal(false);
      setFormData({ name: '', phone: '', email: '', address: '', credit_limit: '', tax_number: '', customer_type: 'retail', notes: '', customer_ref: '' });
      loadCustomers();
    } catch (error: any) {
      toast.error('فشل إضافة العميل: ' + error.message);
    }
  };


  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          credit_limit: formData.credit_limit ? Number(formData.credit_limit) : 0,
          tax_number: formData.tax_number || null,
          customer_type: formData.customer_type || 'retail',
          notes: formData.notes || null,
          customer_ref: formData.customer_ref || null
        } as any)
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      toast.success('تم تحديث العميل بنجاح');
      setShowAddModal(false);
      setSelectedCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '', credit_limit: '', tax_number: '', customer_type: 'retail', notes: '', customer_ref: '' });
      loadCustomers();
    } catch (error: any) {
      toast.error('فشل تحديث العميل: ' + error.message);
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`حذف العميل "${customer.name}"؟ سيتم حذف جميع البيانات المرتبطة بدون رجعة.`)) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', customer.id);
      if (error) throw error;
      toast.success('تم حذف العميل');
      loadCustomers();
    } catch (error: any) {
      toast.error('فشل الحذف: ' + error.message);
    }
  };

  // We'll need to import journalService, but first let's see, since it's optional, we can just proceed with the database fix for now, since the main issue was the accounts not existing! Let's just keep the handleSaveReceiptVoucher as is for now, since we already added the PERFORM seed_global_coa in the database function!

  const handleSaveReceiptVoucher = async () => {
    if (!receiptVoucherForm.customer_id) {
      toast.error('يرجى اختيار العميل');
      return;
    }
    const amount = Number(receiptVoucherForm.amount);
    if (!amount || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      if (editingReceiptVoucher?.isLegacy && editingReceiptVoucher.transaction_id) {
        const oldAmount = editingReceiptVoucher.amount;
        const customer = customers.find(c => c.id === receiptVoucherForm.customer_id);
        const { error: txError } = await supabase.from('customer_transactions').update({
          amount: -amount,
          description: receiptVoucherForm.notes || 'سند قبض',
          payment_method: receiptVoucherForm.payment_method,
        }).eq('id', editingReceiptVoucher.transaction_id);
        if (txError) throw txError;
        if (customer) {
          await supabase.from('customers').update({
            balance: customer.balance + (oldAmount - amount)
          }).eq('id', customer.id);
        }
      } else {
        const { error } = await supabase.rpc('save_receipt_voucher', {
          p_restaurant_id: restaurantId,
          p_customer_id: receiptVoucherForm.customer_id,
          p_amount: amount,
          p_payment_method: receiptVoucherForm.payment_method,
          p_voucher_date: receiptVoucherForm.voucher_date,
          p_notes: receiptVoucherForm.notes || null,
          p_account_id: receiptVoucherForm.account_id || null,
          p_counter_account_id: receiptVoucherForm.counter_account_id || null,
          p_voucher_id: editingReceiptVoucher?.id || null
        });
        if (error) throw error;
      }

      // Apply allocations to unpaid orders (multi-invoice payment)
      if (voucherAllocations.length > 0) {
        for (const a of voucherAllocations) {
          const newPaid = Number(a.previous_paid || 0) + Number(a.amount || 0);
          const fullyPaid = newPaid >= Number(a.order_total || 0) - 0.01;
          await supabase.from('orders').update({
            paid_amount: newPaid,
            ...(fullyPaid ? { payment_status: 'paid' } : { payment_status: 'partial' }),
          } as any).eq('id', a.order_id);
        }
      }

      toast.success(editingReceiptVoucher ? 'تم تحديث سند القبض' : 'تم إضافة سند القبض');


      setShowReceiptVoucherModal(false);
      setEditingReceiptVoucher(null);
      setReceiptVoucherForm({
        customer_id: '',
        customer_name: '',
        amount: '',
        payment_method: 'cash',
        notes: '',
        voucher_date: new Date().toISOString().split('T')[0],
        account_id: '',
        counter_account_id: ''
      });
      loadReceiptVouchers();
      loadCustomers();
    } catch (error: any) {
      toast.error('فشل حفظ سند القبض: ' + error.message);
    }
  };

  const handleDeleteReceiptVoucher = async (voucher: ReceiptVoucher) => {
    if (!confirm('حذف سند القبض هذا؟')) return;
    try {
      if (voucher.isLegacy && voucher.transaction_id) {
        const customer = customers.find(c => c.id === voucher.customer_id);
        await supabase.from('customer_transactions').delete().eq('id', voucher.transaction_id);
        if (customer) {
          await supabase.from('customers').update({ balance: customer.balance + voucher.amount }).eq('id', customer.id);
        }
      } else {
        const { error } = await supabase.rpc('delete_receipt_voucher', { p_voucher_id: voucher.id });
        if (error) throw error;
      }
      toast.success('تم حذف سند القبض');
      loadReceiptVouchers();
      loadCustomers();
    } catch (error: any) {
      toast.error('فشل الحذف: ' + error.message);
    }
  };

  const handleSavePayment = async () => {
    if (!selectedCustomer) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) { toast.error('أدخل مبلغ صحيح'); return; }
    setProcessingPayment(true);
    try {
      const recAcc = accounts.find(acc => acc.code?.startsWith('12') || acc.name?.includes('عملاء') || acc.name?.includes('مدينة'));
      const { error: rpcError } = await supabase.rpc('save_receipt_voucher', {
        p_restaurant_id: restaurantId,
        p_customer_id: selectedCustomer.id,
        p_amount: amount,
        p_payment_method: paymentForm.payment_method,
        p_voucher_date: new Date().toISOString().split('T')[0],
        p_notes: paymentForm.notes || 'سند قبض',
        p_account_id: recAcc ? recAcc.id : null,
        p_counter_account_id: recAcc ? recAcc.id : null,
        p_voucher_id: null
      });

      if (rpcError) {
        const newBalance = selectedCustomer.balance - amount;
        await supabase.from('customers').update({ balance: newBalance }).eq('id', selectedCustomer.id);
        await supabase.from('customer_transactions').insert({
          customer_id: selectedCustomer.id,
          restaurant_id: restaurantId,
          type: 'payment',
          amount: -amount,
          description: paymentForm.notes || 'دفعة نقدية من العميل',
          payment_method: paymentForm.payment_method,
        } as any);
      }

      toast.success(`تم تسجيل دفعة ${amount.toFixed(2)} ${currency}`);
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', payment_method: 'cash', notes: '' });
      loadCustomers();
      loadReceiptVouchers();
    } catch (error: any) {
      toast.error('فشل تسجيل الدفعة: ' + error.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedCustomer) return;
    const amount = Number(paymentForm.amount);
    const newBalance = selectedCustomer.balance - amount;
    const receiptDate = new Date().toLocaleDateString('ar-EG');
    const receiptTime = new Date().toLocaleTimeString('ar-EG');
    
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (printWindow) {
      let content = '';
      
      if (printSettings.customerCopy) {
        content += `
          <div class="page-break">
            <div class="center bold" style="margin-bottom: 5px;">نسخة العميل</div>
            <div class="center title">سند قبض</div>
            <div class="divider"></div>
            <div class="row"><span>التاريخ:</span><span>${receiptDate}</span></div>
            <div class="row"><span>الوقت:</span><span>${receiptTime}</span></div>
            <div class="divider"></div>
            <div class="row"><span>اسم العميل:</span><span class="bold">${selectedCustomer.name}</span></div>
            <div class="row"><span>الهاتف:</span><span>${selectedCustomer.phone || '-'}</span></div>
            <div class="divider"></div>
            <div class="amount">${amount.toFixed(2)} ${currency}</div>
            <div class="row"><span>الرصيد السابق:</span><span>${selectedCustomer.balance.toFixed(2)} ${currency}</span></div>
            <div class="row"><span>الرصيد الجديد:</span><span class="bold">${newBalance.toFixed(2)} ${currency}</span></div>
            ${paymentForm.notes ? `<div class="divider"></div><div>ملاحظات: ${paymentForm.notes}</div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size:10px;color:#666;margin-top:8px">Powered by AuditryPOS</div>
          </div>
        `;
      }
      
      if (printSettings.businessCopy) {
        content += `
          <div class="page-break">
            <div class="center bold" style="margin-bottom: 5px;">نسخة المؤسسة</div>
            <div class="center title">سند قبض</div>
            <div class="divider"></div>
            <div class="row"><span>التاريخ:</span><span>${receiptDate}</span></div>
            <div class="row"><span>الوقت:</span><span>${receiptTime}</span></div>
            <div class="divider"></div>
            <div class="row"><span>اسم العميل:</span><span class="bold">${selectedCustomer.name}</span></div>
            <div class="row"><span>الهاتف:</span><span>${selectedCustomer.phone || '-'}</span></div>
            <div class="divider"></div>
            <div class="amount">${amount.toFixed(2)} ${currency}</div>
            <div class="row"><span>الرصيد السابق:</span><span>${selectedCustomer.balance.toFixed(2)} ${currency}</span></div>
            <div class="row"><span>الرصيد الجديد:</span><span class="bold">${newBalance.toFixed(2)} ${currency}</span></div>
            ${paymentForm.notes ? `<div class="divider"></div><div>ملاحظات: ${paymentForm.notes}</div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size:10px;color:#666;margin-top:8px">Powered by AuditryPOS</div>
          </div>
        `;
      }
      
      if (printSettings.kitchenCopy) {
        content += `
          <div class="page-break">
            <div class="center bold" style="margin-bottom: 5px;">نسخة المطبخ</div>
            <div class="center title">سند قبض</div>
            <div class="divider"></div>
            <div class="row"><span>التاريخ:</span><span>${receiptDate}</span></div>
            <div class="row"><span>الوقت:</span><span>${receiptTime}</span></div>
            <div class="divider"></div>
            <div class="row"><span>اسم العميل:</span><span class="bold">${selectedCustomer.name}</span></div>
            <div class="amount">${amount.toFixed(2)} ${currency}</div>
            ${paymentForm.notes ? `<div class="divider"></div><div>ملاحظات: ${paymentForm.notes}</div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size:10px;color:#666;margin-top:8px">Powered by AuditryPOS</div>
          </div>
        `;
      }

      printWindow.document.write(`<!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head><meta charset="UTF-8"><title>سند قبض</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 18px; font-weight: bold; margin: 8px 0; border: 2px solid #000; padding: 4px; }
          .divider { border-top: 1px dashed #333; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; }
          .amount { font-size: 20px; font-weight: bold; text-align: center; margin: 8px 0; }
          .page-break { page-break-after: always; }
          .page-break:last-child { page-break-after: avoid; }
          @media print { @page { margin: 0; } }
        </style></head>
        <body>
          ${content}
        </body></html>`);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
    }
  };

  const exportStatement = () => {
    const worksheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
      'التاريخ': new Date(t.date).toLocaleDateString('ar-EG'),
      'النوع': t.type === 'invoice' ? 'فاتورة' : 'سداد',
      'المرجع': t.reference,
      'البيان': t.description,
      'مدين': t.debit > 0 ? t.debit.toFixed(2) : '',
      'دائن': t.credit > 0 ? t.credit.toFixed(2) : '',
      'الرصيد': t.balance.toFixed(2)
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف حساب');
    XLSX.writeFile(workbook, `كشف_حساب_${selectedCustomer?.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportStatementPDF = () => {
    if (!selectedCustomer) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html dir="rtl">
        <head>
          <title>كشف حساب - ${selectedCustomer.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            .header-info { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { bg-color: #f8f9fa; font-weight: bold; }
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
            <h1>كشف حساب عميل</h1>
            <p><strong>العميل:</strong> ${selectedCustomer.name}</p>
            <p><strong>الهاتف:</strong> ${selectedCustomer.phone || '-'}</p>
            <p><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-EG')}</p>
            <p><strong>الرصيد الحالي:</strong> ${selectedCustomer.balance.toFixed(2)} ${currency}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>المرجع</th>
                <th>مدين</th>
                <th>دائن</th>
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
                        ${t.items.map(i => `${i.menu_item_name} (x${i.quantity})`).join('، ')}
                      </div>
                    ` : ''}
                  </td>
                  <td>${t.reference || '-'}</td>
                  <td class="debit">${t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
                  <td class="credit">${t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
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

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const totalReceivables = customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
  const totalPayables = customers.reduce((sum, c) => sum + Math.max(0, -c.balance), 0);
  const overLimitCustomers = customers.filter(c => c.credit_limit && c.balance > c.credit_limit);

  const startEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      credit_limit: customer.credit_limit?.toString() || '',
      tax_number: customer.tax_number || '',
      customer_type: (customer as any).customer_type || 'retail',
      notes: (customer as any).notes || '',
      customer_ref: (customer as any).customer_ref || ''
    });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customers">العملاء</TabsTrigger>
          <TabsTrigger value="receipt-vouchers">سندات القبض</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4 mt-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">العملاء وحساباتهم</h2>
                <p className="text-xs text-muted-foreground">{customers.length} عميل | إجمالي الذمم: {totalReceivables.toFixed(2)} {currency}</p>
              </div>
            </div>
            <Button onClick={() => { setSelectedCustomer(null); setFormData({ name: '', phone: '', email: '', address: '', credit_limit: '', tax_number: '', customer_type: 'retail', notes: '' }); setShowAddModal(true); }}>
              <Plus className="w-4 h-4 ml-1" /> عميل جديد
            </Button>
          </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
              <p className="font-bold text-lg">{customers.length}</p>
            </div>
            <Users className="w-8 h-8 text-primary/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">الذمم المدينة</p>
              <p className="font-bold text-lg text-destructive">{totalReceivables.toFixed(2)} {currency}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-destructive/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">الرصيد الدائن</p>
              <p className="font-bold text-lg text-success">{totalPayables.toFixed(2)} {currency}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-success/50" />
          </div>
        </Card>
        <Card className={`p-3 ${overLimitCustomers.length > 0 ? 'bg-red-50 border-red-200' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">تجاوز حد الائتمان</p>
              <p className={`font-bold text-lg ${overLimitCustomers.length > 0 ? 'text-red-600' : ''}`}>
                {overLimitCustomers.length}
              </p>
            </div>
            <AlertCircle className={`w-8 h-8 ${overLimitCustomers.length > 0 ? 'text-red-400' : 'text-muted-foreground/50'}`} />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="البحث في العملاء..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Customers Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الرصيد</th>
                <th className="px-4 py-3 text-right text-sm font-medium">حد الائتمان</th>
                <th className="px-4 py-3 text-right text-sm font-medium">إجمالي المبيعات</th>
                <th className="px-4 py-3 text-right text-sm font-medium">آخر حركة</th>
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
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    لا يوجد عملاء
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/50 hover:bg-primary/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          {customer.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {customer.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={customer.balance > 0 ? 'destructive' : customer.balance < 0 ? 'default' : 'secondary'}>
                        {customer.balance.toFixed(2)} {currency}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {customer.credit_limit ? (
                        <div className="flex items-center gap-2">
                          <span>{customer.credit_limit.toFixed(2)} {currency}</span>
                          {customer.balance > customer.credit_limit && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{customer.total_sales.toFixed(2)} {currency}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {customer.last_transaction_date ? 
                        new Date(customer.last_transaction_date).toLocaleDateString('ar-EG') : 
                        '-'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            loadCustomerStatement(customer.id);
                            setShowStatementModal(true);
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            loadCustomerReturns(customer.id);
                            setShowReturnsModal(true);
                          }}
                        >
                          <Receipt className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="سند قبض"
                          disabled={customer.balance <= 0}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setPaymentForm({ amount: customer.balance.toString(), payment_method: 'cash', notes: '' });
                            setShowPaymentModal(true);
                          }}
                        >
                          <Banknote className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="تعديل" onClick={() => startEdit(customer)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="حذف"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCustomer(customer)}
                        >
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

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCustomer ? 'تعديل العميل' : 'عميل جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>اسم العميل *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="اسم العميل"
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
                placeholder="عنوان العميل"
              />
            </div>
            <div>
              <Label>الرقم المرجعي</Label>
              <Input 
                value={formData.customer_ref} 
                onChange={(e) => setFormData({ ...formData, customer_ref: e.target.value })}
                placeholder="رقم مرجعي للعميل"
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
                <Label>الرقم الضريبي</Label>
                <Input 
                  value={formData.tax_number} 
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  placeholder="رقم التسجيل الضريبي"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تصنيف العميل</Label>
                <select
                  value={formData.customer_type}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-background border border-input text-sm"
                >
                  <option value="retail">تجزئة</option>
                  <option value="wholesale">جملة</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات اختيارية"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                className="flex-1" 
                onClick={selectedCustomer ? handleUpdateCustomer : handleAddCustomer}
              >
                {selectedCustomer ? 'تحديث' : 'إضافة'}
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
              <span>كشف حساب: {selectedCustomer?.name}</span>
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
                <p className={`font-bold ${selectedCustomer?.balance && selectedCustomer.balance > 0 ? 'text-destructive' : 'text-success'}`}>
                  {selectedCustomer?.balance?.toFixed(2) || '0.00'} {currency}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                <p className="font-bold text-primary">{selectedCustomer?.total_sales?.toFixed(2) || '0.00'} {currency}</p>
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
                        <Badge variant={tx.type === 'invoice' ? 'default' : 'secondary'}>
                          {tx.type === 'invoice' ? 'فاتورة' : 'سداد'}
                        </Badge>
                      </div>
                      {tx.items && tx.items.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-1 bg-muted/30 p-1 rounded">
                          {tx.items.map(i => `${i.menu_item_name} (x${i.quantity})`).join('، ')}
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
            <DialogTitle>مردودات المبيعات: {selectedCustomer?.name}</DialogTitle>
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
                    <th className="px-3 py-2 text-right">السبب</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((ret) => (
                    <tr key={ret.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{ret.return_number}</td>
                      <td className="px-3 py-2">{new Date(ret.return_date).toLocaleDateString('ar-EG')}</td>
                      <td className="px-3 py-2">{ret.total_amount.toFixed(2)} {currency}</td>
                      <td className="px-3 py-2">{ret.reason || '-'}</td>
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

      {/* Payment Modal — سند قبض */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>سند قبض من العميل: {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
              <p className="text-2xl font-bold text-destructive">{selectedCustomer?.balance?.toFixed(2)} {currency}</p>
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
                className="w-full px-3 py-2 rounded-md bg-background border border-input text-sm"
              >
                <option value="cash">💵 نقدي</option>
                <option value="instapay">📱 إنستاباي</option>
                <option value="vodafone_cash">📲 فودافون كاش</option>
                <option value="bank">🏦 تحويل بنكي</option>
              </select>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="اختياري"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gradient-bg text-primary-foreground border-0" disabled={processingPayment} onClick={handleSavePayment}>
                {processingPayment ? 'جاري التسجيل...' : 'حفظ السند'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handlePrintReceipt}>
                طباعة السند
              </Button>
              <Button variant="outline" onClick={() => setShowPrintSettings(true)}>
                <Settings className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="receipt-vouchers" className="space-y-4 mt-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">سندات القبض</h2>
                <p className="text-xs text-muted-foreground">{receiptVouchers.length} سند</p>
              </div>
            </div>
            <Button onClick={() => {
              setEditingReceiptVoucher(null);
              setReceiptVoucherForm({
                customer_id: '',
                customer_name: '',
                amount: '',
                payment_method: 'cash',
                notes: '',
                voucher_date: new Date().toISOString().split('T')[0],
                account_id: '',
                counter_account_id: ''
              });
              setShowReceiptVoucherModal(true);
            }}>
              <Plus className="w-4 h-4 ml-1" /> سند جديد
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم السند، اسم العميل، الملاحظات..."
              value={receiptVoucherSearch}
              onChange={(e) => setReceiptVoucherSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Receipt Vouchers Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary/5 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium">رقم السند</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">التاريخ</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">العميل</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">المبلغ</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">طريقة الدفع</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">الملاحظات</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceiptVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">لا توجد سندات</td>
                    </tr>
                  ) : (
                    filteredReceiptVouchers.map((voucher) => (
                      <tr key={voucher.id} className="border-b border-border/50 hover:bg-primary/5">
                        <td className="px-4 py-3 font-medium">
                          {voucher.voucher_number}
                          {voucher.isLegacy && <Badge variant="outline" className="mr-1 text-[10px]">قديم</Badge>}
                        </td>
                        <td className="px-4 py-3">{new Date(voucher.voucher_date).toLocaleDateString('ar-EG')}</td>
                        <td className="px-4 py-3">{voucher.customer_name}</td>
                        <td className="px-4 py-3 font-bold">{voucher.amount.toFixed(2)} {currency}</td>
                        <td className="px-4 py-3">
                          {voucher.payment_method === 'cash' ? '💵 نقدي' :
                           voucher.payment_method === 'instapay' ? '📱 إنستاباي' :
                           voucher.payment_method === 'vodafone_cash' ? '📲 فودافون كاش' :
                           '🏦 تحويل بنكي'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{voucher.notes || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingReceiptVoucher(voucher);
                                setReceiptVoucherForm({
                                  customer_id: voucher.customer_id,
                                  customer_name: voucher.customer_name,
                                  amount: voucher.amount.toString(),
                                  payment_method: voucher.payment_method,
                                  notes: voucher.notes || '',
                                  voucher_date: voucher.voucher_date.split('T')[0],
                                  account_id: voucher.account_id || '',
                                  counter_account_id: voucher.counter_account_id || ''
                                });
                                setShowReceiptVoucherModal(true);
                              }}
                              title="تعديل السند"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteReceiptVoucher(voucher)}
                            >
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
        </TabsContent>
      </Tabs>

      {/* Receipt Voucher Modal */}
      <Dialog open={showReceiptVoucherModal} onOpenChange={setShowReceiptVoucherModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReceiptVoucher ? 'تعديل سند قبض' : 'سند قبض جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>العميل *</Label>
              <CustomerSearch
                restaurantId={restaurantId}
                value={receiptVoucherForm.customer_name}
                onChange={handleCustomerSearchChange}
                placeholder="ابحث عن عميل أو أدخل اسم جديد"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المبلغ *</Label>
                <Input
                  type="number"
                  value={receiptVoucherForm.amount}
                  onChange={(e) => setReceiptVoucherForm({ ...receiptVoucherForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={receiptVoucherForm.voucher_date}
                  onChange={(e) => setReceiptVoucherForm({ ...receiptVoucherForm, voucher_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>طريقة الدفع</Label>
                <select
                  value={receiptVoucherForm.payment_method}
                  onChange={(e) => setReceiptVoucherForm({ ...receiptVoucherForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-background border border-input text-sm"
                >
                  <option value="cash">💵 نقدي</option>
                  <option value="instapay">📱 إنستاباي</option>
                  <option value="vodafone_cash">📲 فودافون كاش</option>
                  <option value="bank">🏦 تحويل بنكي</option>
                </select>
              </div>
              <div>
                <Label>توجيه على حساب</Label>
                <select
                  value={receiptVoucherForm.account_id}
                  onChange={(e) => handleReceiptAccountChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background border border-input text-sm"
                >
                  <option value="">تلقائي (نقدية/بنك)</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {isReceivableAccount(receiptVoucherForm.account_id) && receiptVoucherForm.customer_id && (
              <p className="text-xs text-primary bg-primary/5 p-2 rounded">
                تم ربط حساب العملاء بالعميل المختار أعلاه تلقائياً
              </p>
            )}
            <div>
              <Label>ملاحظات</Label>
              <Input
                value={receiptVoucherForm.notes}
                onChange={(e) => setReceiptVoucherForm({ ...receiptVoucherForm, notes: e.target.value })}
                placeholder="اختياري"
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gradient-bg text-primary-foreground border-0" onClick={handleSaveReceiptVoucher}>
                {editingReceiptVoucher ? 'تحديث' : 'إضافة'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handlePrintReceiptVoucher}>
                طباعة
              </Button>
              <Button variant="outline" onClick={() => setShowPrintSettings(true)}>
                <Settings className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" onClick={() => setShowReceiptVoucherModal(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Settings Modal */}
      <AnimatePresence>
        {showPrintSettings && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPrintSettings(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">إعدادات الطباعة</h3>
                <button onClick={() => setShowPrintSettings(false)}><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={printSettings.customerCopy} onChange={(e) => setPrintSettings({ ...printSettings, customerCopy: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">نسخة العميل</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={printSettings.businessCopy} onChange={(e) => setPrintSettings({ ...printSettings, businessCopy: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">نسخة المؤسسة</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={printSettings.kitchenCopy} onChange={(e) => setPrintSettings({ ...printSettings, kitchenCopy: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">نسخة المطبخ</span>
                </label>
              </div>
              
              <Button onClick={() => setShowPrintSettings(false)} className="w-full gradient-bg text-primary-foreground border-0">حفظ</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
