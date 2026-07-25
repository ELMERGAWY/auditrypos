
// ============================================================
// JOURNAL SERVICE - Double Entry Accounting Engine
// ============================================================

import { supabase as _supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// Loose-typed alias to bypass strict generated DB types for legacy ERP code
const supabase = _supabase as any;
import { 
  type JournalEntry, 
  type JournalEntryLine, 
  type ChartOfAccount,
  type BusinessAccountMapping,
  JOURNAL_TEMPLATES,
  BUSINESS_ACCOUNT_MAPPINGS,
  type AccountType,
} from './types';
import type { Order as _Order, OrderItem } from '@/pages/dashboard/types';
type Order = _Order & { paid_amount?: number; customer_id?: string };

// Default account codes for all businesses
const DEFAULT_ACCOUNTS: BusinessAccountMapping = {
  cashAccount: '1100',
  bankAccount: '1400',
  accountsReceivable: '1200',
  inventoryAccount: '1300',
  accountsPayable: '2100',
  taxPayable: '2150',
  accruedExpenses: '2200',
  salesRevenue: '4100',
  serviceRevenue: '4200',
  deliveryRevenue: '4300',
  cogsAccount: '5100',
  wastageAccount: '5200',
  salariesExpense: '6100',
  rentExpense: '6200',
  utilitiesExpense: '6300',
  marketingExpense: '6400',
};

class JournalService {
  private accountCache: Map<string, Map<string, ChartOfAccount>> = new Map();

  // ============================================================
  // ACCOUNT MANAGEMENT
  // ============================================================

  async getAccountByCode(restaurantId: string, code: string): Promise<ChartOfAccount | null> {
    // Check cache
    const cached = this.accountCache.get(restaurantId)?.get(code);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('code', code)
      .single();

    if (error || !data) {
      console.error(`Account ${code} not found for restaurant ${restaurantId}`, error);
      return null;
    }

    // Cache the result
    if (!this.accountCache.has(restaurantId)) {
      this.accountCache.set(restaurantId, new Map());
    }
    this.accountCache.get(restaurantId)!.set(code, data);

    return data;
  }

  async getAllAccounts(restaurantId: string): Promise<ChartOfAccount[]> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('code');

    if (error) {
      console.error('Failed to load accounts:', error);
      return [];
    }

    // Update cache
    const cache = new Map<string, ChartOfAccount>();
    data?.forEach(acc => cache.set(acc.code, acc));
    this.accountCache.set(restaurantId, cache);

    return data || [];
  }

  async getAccountsByType(restaurantId: string, type: AccountType): Promise<ChartOfAccount[]> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('account_type', type);

    if (error) {
      console.error(`Failed to load ${type} accounts:`, error);
      return [];
    }

    return data || [];
  }

  private verifiedRestaurants = new Set<string>();

  async ensureAccountingSetup(restaurantId: string, currency: string = 'ج.م'): Promise<boolean> {
    if (this.verifiedRestaurants.has(restaurantId)) return true;

    try {
      // Use RPC function to seed chart of accounts (bypasses RLS policy)
      const { error: seedErr } = await supabase
        .rpc('seed_global_coa', { 
          p_restaurant_id: restaurantId,
          p_profile: 'standard'
        });
      
      if (seedErr) throw seedErr;

      this.verifiedRestaurants.add(restaurantId);
      this.clearCache();
      console.log('✅ Accounting chart seeded successfully for:', restaurantId);
      return true;
    } catch (e: any) {
      console.error('CRITICAL: Accounting setup failed:', e);
      toast.error(`فشل تهيئة النظام المحاسبي: ${e.message || 'خطأ غير معروف'}`);
      return false;
    }
  }

  async getNextEntryNumber(restaurantId: string): Promise<string> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 'JE-000001';
    }

    const lastNumber = data[0].entry_number;
    const num = parseInt(lastNumber.replace(/\D/g, '')) || 0;
    return `JE-${String(num + 1).padStart(6, '0')}`;
  }

  // ============================================================
  // JOURNAL ENTRY CREATION
  // ============================================================

  async createJournalEntry(
    restaurantId: string,
    entry: any
  ): Promise<JournalEntry | null> {
    try {
      // Use the transaction RPC function for atomic journal entry creation
      const { data: result, error: rpcError } = await supabase.rpc('create_journal_entry_with_transaction', {
        p_restaurant_id: restaurantId,
        p_entry_date: entry.entry_date.toISOString(),
        p_reference_type: entry.reference_type,
        p_reference_id: entry.reference_id || null,
        p_description: entry.description,
        p_source: entry.source,
        p_is_posted: entry.is_posted ?? false,
        p_lines: JSON.stringify(entry.lines),
      });

      if (rpcError || !result?.success) {
        throw new Error(result?.error || rpcError?.message || 'فشل في إنشاء القيد المحاسبي');
      }

      // Fetch the created entry with its lines
      const { data: entryData, error: fetchError } = await supabase
        .from('journal_entries')
        .select('*, lines(*)')
        .eq('id', result.entry_id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch created journal entry: ${fetchError.message}`);
      }

      toast.success(`تم إنشاء قيد يومية ${result.entry_number}`);
      
      return entryData as JournalEntry;

    } catch (error: any) {
      console.error('Journal entry creation failed:', error);
      toast.error(`خطأ في إنشاء القيد: ${error.message}`);
      return null;
    }
  }

  private async updateAccountBalance(accountId: string, debit: number, credit: number): Promise<void> {
    const netChange = debit - credit;
    
    const { error } = await supabase.rpc('update_account_balance', {
      p_account_id: accountId,
      p_amount: netChange,
    });

    if (error) {
      console.error('Failed to update account balance:', error);
    }
  }

  // ============================================================
  // BUSINESS-SPECIFIC JOURNAL ENTRIES
  // ============================================================

  async createSaleJournalEntry(
    restaurantId: string,
    order: Order,
    businessType: string,
    cogs?: number,
    taxAmount: number = 0,
    destinationAccountId?: string | null
  ): Promise<JournalEntry | null> {
    const mapping = this.getBusinessMapping(businessType);
    const lines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] = [];

    // Determine target revenue account based on business type mapping
    let targetRevenueAccount = mapping.salesRevenue;
    if (businessType === 'services') targetRevenueAccount = mapping.serviceRevenue;
    if (businessType === 'shipping') targetRevenueAccount = mapping.shippingRevenue || '4400';
    if (businessType === 'distribution') targetRevenueAccount = mapping.salesRevenue || '4100';
    if (businessType === 'hospital') targetRevenueAccount = mapping.serviceRevenue || '4600';
    if (businessType === 'real_estate') targetRevenueAccount = mapping.realEstateRevenue || '4800';
    if (businessType === 'contracting') targetRevenueAccount = mapping.contractingRevenue || '4900';
    if (businessType === 'finishing') targetRevenueAccount = mapping.finishingRevenue || '4210';
    if (businessType === 'education') targetRevenueAccount = mapping.educationRevenue || '4230';

    // Get account IDs with self-healing
    let cashAcc = destinationAccountId 
      ? await supabase.from('chart_of_accounts').select('*').eq('id', destinationAccountId).single().then(r => r.data)
      : await this.getAccountByCode(restaurantId, mapping.cashAccount);
      
    let salesAcc = await this.getAccountByCode(restaurantId, targetRevenueAccount);

    if (!cashAcc || !salesAcc) {
      console.warn('Essential accounts missing, attempting self-healing...', { mapping, targetRevenueAccount });
      await this.ensureAccountingSetup(restaurantId);
      
      // Retry fetching
      this.clearCache();
      cashAcc = destinationAccountId 
        ? await supabase.from('chart_of_accounts').select('*').eq('id', destinationAccountId).single().then(r => r.data)
        : await this.getAccountByCode(restaurantId, mapping.cashAccount);
      salesAcc = await this.getAccountByCode(restaurantId, targetRevenueAccount);
    }

    if (!cashAcc || !salesAcc) {
      const missing = [];
      if (!cashAcc) missing.push(`النقدية (${mapping.cashAccount})`);
      if (!salesAcc) missing.push(`إيرادات (${targetRevenueAccount})`);
      
      console.error('Accounting accounts STILL missing after healing:', { cashAcc, salesAcc, mapping });
      toast.error(`الحسابات التالية غير موجودة: ${missing.join('، ')}. يرجى التوجه للإعدادات > المحاسبة > والضغط على "إصلاح وتوليد الحسابات".`);
      return null;
    }

    const arAcc = await this.getAccountByCode(restaurantId, mapping.accountsReceivable);
    const taxAcc = await this.getAccountByCode(restaurantId, mapping.taxPayable);

    const paidAmount = order.paid_amount || order.total;
    const remaining = order.total - paidAmount;
    const totalWithDiscount = order.total + (order.discount || 0);

    // STANDARD DOUBLE-ENTRY STRUCTURE FOR SALES INVOICES:
    // Debit: Cash/Bank Account (paid_amount only)
    // Debit: Customer Account (remaining_amount) - with customerId
    // Credit: Sales Revenue Account (total_amount including tax)
    // Credit: Tax Payable Account (tax_amount only)

    // 1. Debit: Cash/Bank for paid amount only
    if (paidAmount > 0) {
      lines.push({
        account_id: cashAcc.id,
        debit: paidAmount,
        credit: 0,
        description: `نقدية من فاتورة ${order.order_number}`,
        line_order: 1,
      });
    }

    // 2. Debit: Accounts Receivable for remaining amount - WITH CUSTOMER LINK
    if (remaining > 0 && arAcc) {
      lines.push({
        account_id: arAcc.id,
        debit: remaining,
        credit: 0,
        description: `ذمم مدينة - فاتورة ${order.order_number}`,
        line_order: 2,
        customer_id: order.customer_id || null, // Sub-ledger linking
      });
    }

    // 3. Credit: Revenue Account (total amount including tax)
    lines.push({
      account_id: salesAcc.id,
      debit: 0,
      credit: totalWithDiscount,
      description: `إيرادات ${businessType} - ${order.order_number}`,
      line_order: 3,
    });

    // 4. Credit: Tax Payable (tax amount only)
    if (taxAmount > 0 && taxAcc) {
      lines.push({
        account_id: taxAcc.id,
        debit: 0,
        credit: taxAmount,
        description: `ضريبة القيمة المضافة`,
        line_order: 4,
      });
    }

    // VALIDATION: Ensure total debit equals total credit
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Journal entry validation failed: Debit != Credit', {
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit,
        orderNumber: order.order_number,
      });
      toast.error(`خطأ في التوازن المحاسبي للفاتورة ${order.order_number}: المدين=${totalDebit.toFixed(2)}، الدائن=${totalCredit.toFixed(2)}`);
      return null;
    }

    // Create the journal entry
    const entry = await this.createJournalEntry(restaurantId, {
      entry_date: new Date(),
      reference_type: 'order',
      reference_id: order.id,
      description: `فاتورة مبيعات #${order.order_number} - ${order.customer_name || 'عميل نقدي'}`,
      source: 'pos',
      is_posted: true,
      lines,
    });

    // Create COGS entry if applicable
    if (cogs && cogs > 0 && entry) {
      await this.createCOGSJournalEntry(restaurantId, order, businessType, cogs);
    }

    // Note: Customer balance is now handled by triggers on customer_transactions
    // The checkoutIntegration will create the necessary transactions

    return entry;
  }

  async createSalesReturnJournalEntry(
    restaurantId: string,
    returnData: {
      orderId: string;
      orderNumber: string;
      amount: number;
      taxAmount: number;
      cogs?: number;
      customerId?: string;
      refundAmount: number; // Amount refunded in cash
      reason: string;
    },
    businessType: string
  ): Promise<JournalEntry | null> {
    const mapping = this.getBusinessMapping(businessType);
    const lines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] = [];

    const cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
    const arAcc = await this.getAccountByCode(restaurantId, mapping.accountsReceivable);
    const salesAcc = await this.getAccountByCode(restaurantId, mapping.salesRevenue);
    const taxAcc = await this.getAccountByCode(restaurantId, mapping.taxPayable);

    const remainingCredit = returnData.amount - returnData.refundAmount;

    // STANDARD DOUBLE-ENTRY STRUCTURE FOR SALES RETURNS:
    // Debit: Sales Revenue Account (amount excluding tax)
    // Debit: Tax Payable Account (tax amount)
    // Credit: Cash/Bank Account (refund_amount only)
    // Credit: Customer Account (remaining_credit) - with customerId

    // 1. Debit: Sales Revenue (amount excluding tax)
    lines.push({
      account_id: salesAcc?.id || '',
      debit: returnData.amount - returnData.taxAmount,
      credit: 0,
      description: `مردودات مبيعات - فاتورة ${returnData.orderNumber}`,
      line_order: 1,
    });

    // 2. Debit: Tax Payable (Reverse tax)
    if (returnData.taxAmount > 0 && taxAcc) {
      lines.push({
        account_id: taxAcc.id,
        debit: returnData.taxAmount,
        credit: 0,
        description: `عكس ضريبة المردودات`,
        line_order: 2,
      });
    }

    // 3. Credit: Cash/Bank for refund amount only
    if (returnData.refundAmount > 0 && cashAcc) {
      lines.push({
        account_id: cashAcc.id,
        debit: 0,
        credit: returnData.refundAmount,
        description: `رد نقدية - مردودات ${returnData.orderNumber}`,
        line_order: 3,
      });
    }

    // 4. Credit: Accounts Receivable for remaining credit - WITH CUSTOMER LINK
    if (remainingCredit > 0 && returnData.customerId && arAcc) {
      lines.push({
        account_id: arAcc.id,
        debit: 0,
        credit: remainingCredit,
        description: `تخفيض مديونية عميل - مردودات ${returnData.orderNumber}`,
        line_order: 4,
        customer_id: returnData.customerId, // Sub-ledger linking
      });
    }

    // VALIDATION: Ensure total debit equals total credit
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Sales return journal entry validation failed: Debit != Credit', {
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit,
        orderNumber: returnData.orderNumber,
      });
      toast.error(`خطأ في التوازن المحاسبي لمردودات المبيعات: المدين=${totalDebit.toFixed(2)}، الدائن=${totalCredit.toFixed(2)}`);
      return null;
    }

    const entry = await this.createJournalEntry(restaurantId, {
      entry_date: new Date(),
      reference_type: 'return',
      reference_id: returnData.orderId,
      description: `مردودات مبيعات #${returnData.orderNumber} - ${returnData.reason}`,
      source: 'pos',
      is_posted: true,
      lines,
    });

    // Reverse COGS
    if (returnData.cogs && returnData.cogs > 0 && entry) {
      const cogsAcc = await this.getAccountByCode(restaurantId, mapping.cogsAccount);
      const invAcc = await this.getAccountByCode(restaurantId, mapping.inventoryAccount);
      if (cogsAcc && invAcc) {
        await this.createJournalEntry(restaurantId, {
          entry_date: new Date(),
          reference_type: 'return',
          reference_id: returnData.orderId,
          description: `عكس تكلفة مردودات - ${returnData.orderNumber}`,
          source: 'auto',
          is_posted: true,
          lines: [
            { account_id: invAcc.id, debit: returnData.cogs, credit: 0, description: 'إعادة للمخزون', line_order: 1 },
            { account_id: cogsAcc.id, debit: 0, credit: returnData.cogs, description: 'تخفيض تكلفة', line_order: 2 }
          ]
        });
      }
    }

    return entry;
  }

  async createPurchaseJournalEntry(
    restaurantId: string,
    purchase: {
      id: string;
      supplierId: string;
      supplierName: string;
      amount: number;
      paidAmount: number;
      taxAmount: number;
      description: string;
    },
    businessType: string
  ): Promise<JournalEntry | null> {
    const mapping = this.getBusinessMapping(businessType);
    const lines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] = [];

    const invAcc = await this.getAccountByCode(restaurantId, mapping.inventoryAccount);
    const cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
    const apAcc = await this.getAccountByCode(restaurantId, mapping.accountsPayable);
    const taxAcc = await this.getAccountByCode(restaurantId, mapping.taxPayable);

    if (!invAcc) return null;

    const paidAmount = purchase.paidAmount || 0;
    const remaining = purchase.amount - paidAmount;

    // STANDARD DOUBLE-ENTRY STRUCTURE FOR PURCHASE INVOICES:
    // Debit: Inventory/Purchases Account (total_amount)
    // Credit: Cash/Bank Account (paid_amount only)
    // Credit: Vendor Account (remaining_amount) - with vendorId
    // Credit: Tax Payable Account (tax_amount only)

    // 1. Debit: Inventory/Purchases Account (total amount)
    lines.push({
      account_id: invAcc.id,
      debit: purchase.amount,
      credit: 0,
      description: `شراء مخزون - ${purchase.description}`,
      line_order: 1,
    });

    // 2. Credit: Cash/Bank for paid amount only
    if (paidAmount > 0 && cashAcc) {
      lines.push({
        account_id: cashAcc.id,
        debit: 0,
        credit: paidAmount,
        description: `دفع نقدي للمورد - ${purchase.supplierName}`,
        line_order: 2,
      });
    }

    // 3. Credit: Accounts Payable for remaining amount - WITH VENDOR LINK
    if (remaining > 0 && apAcc) {
      lines.push({
        account_id: apAcc.id,
        debit: 0,
        credit: remaining,
        description: `ذمم موردين - ${purchase.supplierName}`,
        line_order: 3,
        vendor_id: purchase.supplierId || null, // Sub-ledger linking
      });
    }

    // 4. Credit: Tax Payable (tax amount only)
    if (purchase.taxAmount > 0 && taxAcc) {
      lines.push({
        account_id: taxAcc.id,
        debit: 0,
        credit: purchase.taxAmount,
        description: `ضريبة القيمة المضافة على المشتريات`,
        line_order: 4,
      });
    }

    // VALIDATION: Ensure total debit equals total credit
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Purchase journal entry validation failed: Debit != Credit', {
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit,
        purchaseId: purchase.id,
      });
      toast.error(`خطأ في التوازن المحاسبي لفاتورة المشتريات: المدين=${totalDebit.toFixed(2)}، الدائن=${totalCredit.toFixed(2)}`);
      return null;
    }

    return this.createJournalEntry(restaurantId, {
      entry_date: new Date(),
      reference_type: 'purchase',
      reference_id: purchase.id,
      description: `فاتورة مشتريات من ${purchase.supplierName}`,
      source: 'pos',
      is_posted: true,
      lines,
    });
  }

  async createCOGSJournalEntry(
    restaurantId: string,
    order: Order,
    businessType: string,
    cogs: number
  ): Promise<JournalEntry | null> {
    // Skip COGS for service businesses
    if (businessType === 'services') return null;

    const mapping = this.getBusinessMapping(businessType);
    
    const cogsAcc = await this.getAccountByCode(restaurantId, mapping.cogsAccount);
    const inventoryAcc = await this.getAccountByCode(restaurantId, mapping.inventoryAccount);

    if (!cogsAcc || !inventoryAcc) {
      console.warn('COGS accounts not found, skipping COGS entry');
      return null;
    }

    return this.createJournalEntry(restaurantId, {
      entry_date: new Date(),
      reference_type: 'order',
      reference_id: order.id,
      description: `تكلفة بضاعة مباعة - ${order.order_number}`,
      source: 'auto',
      is_posted: true,
      lines: [
        {
          account_id: cogsAcc.id,
          debit: cogs,
          credit: 0,
          description: `COGS لـ ${order.order_number}`,
          line_order: 1,
        },
        {
          account_id: inventoryAcc.id,
          debit: 0,
          credit: cogs,
          description: `تخفيض المخزون - ${order.order_number}`,
          line_order: 2,
        },
      ],
    });
  }

  async createReceiptVoucherJournalEntry(
    restaurantId: string,
    businessType: string,
    voucher: {
      id: string;
      voucherNumber: string;
      amount: number;
      customerId: string;
      customerName: string;
      paymentMethod: string;
      description: string;
    }
  ): Promise<JournalEntry | null> {
    const mapping = this.getBusinessMapping(businessType);
    const lines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] = [];

    const cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
    const arAcc = await this.getAccountByCode(restaurantId, mapping.accountsReceivable);

    if (!cashAcc || !arAcc) return null;

    // STANDARD DOUBLE-ENTRY STRUCTURE FOR RECEIPT VOUCHERS:
    // Debit: Cash/Bank Account (amount)
    // Credit: Customer Account (amount) - with customerId

    // 1. Debit: Cash/Bank Account
    lines.push({
      account_id: cashAcc.id,
      debit: voucher.amount,
      credit: 0,
      description: `سند قبض #${voucher.voucherNumber} - ${voucher.customerName}`,
      line_order: 1,
    });

    // 2. Credit: Accounts Receivable - WITH CUSTOMER LINK
    lines.push({
      account_id: arAcc.id,
      debit: 0,
      credit: voucher.amount,
      description: `تحصيل من عميل - سند قبض #${voucher.voucherNumber}`,
      line_order: 2,
      customer_id: voucher.customerId, // Sub-ledger linking
    });

    // VALIDATION: Ensure total debit equals total credit
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Receipt voucher journal entry validation failed: Debit != Credit', {
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit,
        voucherNumber: voucher.voucherNumber,
      });
      toast.error(`خطأ في التوازن المحاسبي لسند القبض: المدين=${totalDebit.toFixed(2)}، الدائن=${totalCredit.toFixed(2)}`);
      return null;
    }

    return this.createJournalEntry(restaurantId, {
      entry_date: new Date(),
      reference_type: 'receipt_voucher',
      reference_id: voucher.id,
      description: `سند قبض #${voucher.voucherNumber} - ${voucher.customerName}`,
      source: 'manual',
      is_posted: true,
      lines,
    });
  }

  async createPaymentVoucherJournalEntry(
    restaurantId: string,
    businessType: string,
    voucher: {
      id: string;
      voucherNumber: string;
      amount: number;
      vendorId: string;
      vendorName: string;
      paymentMethod: string;
      description: string;
    }
  ): Promise<JournalEntry | null> {
    const mapping = this.getBusinessMapping(businessType);
    const lines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] = [];

    const cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
    const apAcc = await this.getAccountByCode(restaurantId, mapping.accountsPayable);

    if (!cashAcc || !apAcc) return null;

    // STANDARD DOUBLE-ENTRY STRUCTURE FOR PAYMENT VOUCHERS:
    // Debit: Vendor Account (amount) - with vendorId
    // Credit: Cash/Bank Account (amount)

    // 1. Debit: Accounts Payable - WITH VENDOR LINK
    lines.push({
      account_id: apAcc.id,
      debit: voucher.amount,
      credit: 0,
      description: `سداد للمورد - سند صرف #${voucher.voucherNumber}`,
      line_order: 1,
      vendor_id: voucher.vendorId, // Sub-ledger linking
    });

    // 2. Credit: Cash/Bank Account
    lines.push({
      account_id: cashAcc.id,
      debit: 0,
      credit: voucher.amount,
      description: `سند صرف #${voucher.voucherNumber} - ${voucher.vendorName}`,
      line_order: 2,
    });

    // VALIDATION: Ensure total debit equals total credit
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Payment voucher journal entry validation failed: Debit != Credit', {
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit,
        voucherNumber: voucher.voucherNumber,
      });
      toast.error(`خطأ في التوازن المحاسبي لسند الصرف: المدين=${totalDebit.toFixed(2)}، الدائن=${totalCredit.toFixed(2)}`);
      return null;
    }

    return this.createJournalEntry(restaurantId, {
      entry_date: new Date(),
      reference_type: 'payment_voucher',
      reference_id: voucher.id,
      description: `سند صرف #${voucher.voucherNumber} - ${voucher.vendorName}`,
      source: 'manual',
      is_posted: true,
      lines,
    });
  }

  async createExpenseJournalEntry(
    restaurantId: string,
    businessType: string,
    expense: {
      amount: number;
      description: string;
      category: string;
      payment_method: 'cash' | 'bank' | 'credit';
      date?: Date;
    }
  ): Promise<JournalEntry | null> {
    const mapping = this.getBusinessMapping(businessType);
    
    // Map expense category to account
    const categoryToAccount: Record<string, string> = {
      'salaries': mapping.salariesExpense,
      'rent': mapping.rentExpense,
      'utilities': mapping.utilitiesExpense,
      'marketing': mapping.marketingExpense,
      'inventory': mapping.cogsAccount,
    };

    const expenseAccountCode = categoryToAccount[expense.category] || '6500'; // General expenses
    const expenseAcc = await this.getAccountByCode(restaurantId, expenseAccountCode);
    const cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
    const bankAcc = await this.getAccountByCode(restaurantId, mapping.bankAccount);
    const apAcc = await this.getAccountByCode(restaurantId, mapping.accountsPayable);

    const lines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] = [];

    // Debit: Expense account
    if (expenseAcc) {
      lines.push({
        account_id: expenseAcc.id,
        debit: expense.amount,
        credit: 0,
        description: expense.description,
        line_order: 1,
      });
    }

    // Credit: Payment method
    if (expense.payment_method === 'cash' && cashAcc) {
      lines.push({
        account_id: cashAcc.id,
        debit: 0,
        credit: expense.amount,
        description: `دفع نقدي - ${expense.description}`,
        line_order: 2,
      });
    } else if (expense.payment_method === 'bank' && bankAcc) {
      lines.push({
        account_id: bankAcc.id,
        debit: 0,
        credit: expense.amount,
        description: `دفع بنكي - ${expense.description}`,
        line_order: 2,
      });
    } else if (expense.payment_method === 'credit' && apAcc) {
      lines.push({
        account_id: apAcc.id,
        debit: 0,
        credit: expense.amount,
        description: `على الحساب - ${expense.description}`,
        line_order: 2,
      });
    }

    return this.createJournalEntry(restaurantId, {
      entry_date: expense.date || new Date(),
      reference_type: 'expense',
      description: expense.description,
      source: 'pos',
      is_posted: true,
      lines,
    });
  }

  async createCustomerPaymentJournalEntry(
    restaurantId: string,
    payment: {
      customerId: string;
      customerName: string;
      amount: number;
      paymentMethod: 'cash' | 'bank' | 'instapay' | 'vodafone_cash';
      description?: string;
    },
    currency: string = 'ج.م'
  ): Promise<JournalEntry | null> {
    const mapping = this.getBusinessMapping('general');
    const lines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] = [];

    // Ensure accounts exist
    await this.ensureAccountingSetup(restaurantId, currency);
    this.clearCache();

    // Get accounts
    const cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
    const bankAcc = await this.getAccountByCode(restaurantId, mapping.bankAccount);
    const arAcc = await this.getAccountByCode(restaurantId, mapping.accountsReceivable);

    if (!arAcc) {
      toast.error('حساب الذمم المدينة غير موجود');
      return null;
    }

    // Determine payment account
    let paymentAcc;
    if (payment.paymentMethod === 'bank') {
      paymentAcc = bankAcc;
    } else {
      paymentAcc = cashAcc; // Treat other methods as cash
    }

    if (!paymentAcc) {
      toast.error('حساب الدفع (نقدية أو بنك) غير موجود');
      return null;
    }

    // 1. Debit: Payment account (cash/bank)
    lines.push({
      account_id: paymentAcc.id,
      debit: payment.amount,
      credit: 0,
      description: `استلام دفعة من ${payment.customerName}`,
      line_order: 1,
    });

    // 2. Credit: Accounts Receivable
    lines.push({
      account_id: arAcc.id,
      debit: 0,
      credit: payment.amount,
      description: `تخفيض مديونية ${payment.customerName}`,
      line_order: 2,
    });

    // Create journal entry
    const entry = await this.createJournalEntry(restaurantId, {
      entry_date: new Date(),
      reference_type: 'customer_payment',
      reference_id: payment.customerId,
      description: payment.description || `دفعة من ${payment.customerName}`,
      source: 'customers',
      is_posted: true,
      lines,
    });

    return entry;
  }

  // ============================================================
  // REVERSAL & ROLLBACK
  // ============================================================

  async reverseJournalEntry(
    restaurantId: string,
    originalEntryId: string,
    reason: string
  ): Promise<JournalEntry | null> {
    // Fetch the original journal entry with its lines
    const { data: originalEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*, lines(*)')
      .eq('id', originalEntryId)
      .single();

    if (fetchError || !originalEntry) {
      console.error('Failed to fetch original journal entry for reversal:', fetchError);
      toast.error('فشل في جلب القيد المحاسبي الأصلي للعكس');
      return null;
    }

    if (!originalEntry.is_posted) {
      console.warn('Cannot reverse an unposted entry');
      toast.error('لا يمكن عكس قيد غير مرحل');
      return null;
    }

    // Create reversal lines (swap debit and credit)
    const reversalLines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] = originalEntry.lines.map((line: any) => ({
      account_id: line.account_id,
      debit: line.credit, // Swap: original credit becomes debit
      credit: line.debit, // Swap: original debit becomes credit
      description: `عكس: ${line.description}`,
      line_order: line.line_order,
      customer_id: line.customer_id || null,
      vendor_id: line.vendor_id || null,
    }));

    // VALIDATION: Ensure total debit equals total credit in reversal
    const totalDebit = reversalLines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = reversalLines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Reversal journal entry validation failed: Debit != Credit', {
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit,
        originalEntryId,
      });
      toast.error(`خطأ في التوازن المحاسبي للعكس: المدين=${totalDebit.toFixed(2)}، الدائن=${totalCredit.toFixed(2)}`);
      return null;
    }

    // Create the reversal entry
    const reversalEntry = await this.createJournalEntry(restaurantId, {
      entry_date: new Date(),
      reference_type: originalEntry.reference_type,
      reference_id: originalEntry.reference_id,
      description: `عكس قيد #${originalEntry.entry_number} - ${reason}`,
      source: 'reversal',
      is_posted: true,
      lines: reversalLines,
    });

    if (reversalEntry) {
      // Mark original entry as reversed
      await supabase
        .from('journal_entries')
        .update({ is_reversed: true, reversal_entry_id: reversalEntry.id })
        .eq('id', originalEntryId);
    }

    return reversalEntry;
  }

  async deleteJournalEntryWithReversal(
    restaurantId: string,
    entryId: string,
    reason: string
  ): Promise<boolean> {
    // First reverse the entry
    const reversal = await this.reverseJournalEntry(restaurantId, entryId, reason);
    
    if (!reversal) {
      return false;
    }

    // Then mark the original entry as deleted (soft delete)
    const { error: updateError } = await supabase
      .from('journal_entries')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', entryId);

    if (updateError) {
      console.error('Failed to mark journal entry as deleted:', updateError);
      toast.error('فشل في حذف القيد المحاسبي');
      return false;
    }

    return true;
  }

  // ============================================================
  // REPORTS
  // ============================================================

  async getTrialBalance(restaurantId: string, asOfDate?: Date): Promise<any[]> {
    const { data, error } = await supabase
      .rpc('get_trial_balance', {
        p_restaurant_id: restaurantId,
        p_as_of_date: asOfDate?.toISOString(),
      });

    if (error) {
      console.error('Failed to get trial balance:', error);
      return [];
    }

    return data || [];
  }

  async getProfitAndLoss(
    restaurantId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_profit_and_loss', {
        p_restaurant_id: restaurantId,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });

    if (error) {
      console.error('Failed to get P&L:', error);
      return null;
    }

    return data;
  }

  async getBalanceSheet(restaurantId: string, asOfDate?: Date): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_balance_sheet', {
        p_restaurant_id: restaurantId,
        p_as_of_date: asOfDate?.toISOString(),
      });

    if (error) {
      console.error('Failed to get balance sheet:', error);
      return null;
    }

    return data;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getBusinessMapping(businessType: string): BusinessAccountMapping {
    const specific = BUSINESS_ACCOUNT_MAPPINGS[businessType] || {};
    return { ...DEFAULT_ACCOUNTS, ...specific };
  }

  clearCache(): void {
    this.accountCache.clear();
  }
}

// Singleton instance
export const journalService = new JournalService();
export default journalService;
