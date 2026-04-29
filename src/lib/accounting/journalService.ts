
// ============================================================
// JOURNAL SERVICE - Double Entry Accounting Engine
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  type JournalEntry, 
  type JournalEntryLine, 
  type ChartOfAccount,
  type BusinessAccountMapping,
  JOURNAL_TEMPLATES,
  BUSINESS_ACCOUNT_MAPPINGS,
  type AccountType,
} from './types';
import type { Order, OrderItem } from '@/pages/dashboard/types';

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
      // Step 1: Seed root accounts (no parent) using upsert
      const rootAccounts = [
        { code: '1000', name: 'الأصول',               account_type: 'asset' },
        { code: '2000', name: 'الخصوم',               account_type: 'liability' },
        { code: '3000', name: 'حقوق الملكية',          account_type: 'equity' },
        { code: '4000', name: 'الإيرادات',             account_type: 'revenue' },
        { code: '5000', name: 'تكلفة المبيعات (COGS)', account_type: 'expense' },
        { code: '6000', name: 'المصروفات',             account_type: 'expense' },
      ].map(a => ({ restaurant_id: restaurantId, code: a.code, name: a.name, account_type: a.account_type }));

      const { error: rootErr } = await supabase
        .from('chart_of_accounts')
        .upsert(rootAccounts, { onConflict: 'restaurant_id,code', ignoreDuplicates: true });
      if (rootErr) throw rootErr;

      // Step 2: Fetch all current accounts to resolve parent IDs
      const { data: allAccounts, error: fetchErr } = await supabase
        .from('chart_of_accounts')
        .select('id, code')
        .eq('restaurant_id', restaurantId);
      if (fetchErr) throw fetchErr;

      const codeToId = new Map<string, string>();
      allAccounts?.forEach(a => codeToId.set(a.code, a.id));

      // Step 3: Seed child accounts using upsert
      const childAccounts = [
        { code: '1100', name: 'الصندوق / النقدية',           account_type: 'asset',     parent: '1000', is_cash_account: true,  is_bank_account: false },
        { code: '1200', name: 'العملاء / الذمم المدينة',     account_type: 'asset',     parent: '1000', is_cash_account: false, is_bank_account: false },
        { code: '1300', name: 'المخزون',                     account_type: 'asset',     parent: '1000', is_cash_account: false, is_bank_account: false },
        { code: '1400', name: 'البنوك',                      account_type: 'asset',     parent: '1000', is_cash_account: false, is_bank_account: true  },
        { code: '2100', name: 'الموردون / الذمم الدائنة',    account_type: 'liability', parent: '2000', is_cash_account: false, is_bank_account: false },
        { code: '2150', name: 'الضرائب المستحقة (VAT)',      account_type: 'liability', parent: '2000', is_cash_account: false, is_bank_account: false },
        { code: '3100', name: 'رأس المال',                   account_type: 'equity',    parent: '3000', is_cash_account: false, is_bank_account: false },
        { code: '3200', name: 'الأرباح المحتجزة',            account_type: 'equity',    parent: '3000', is_cash_account: false, is_bank_account: false },
        { code: '4100', name: 'إيرادات المبيعات',            account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '4120', name: 'خصم مبيعات',                  account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '4200', name: 'إيرادات الخدمات',             account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '4300', name: 'إيرادات التوصيل',             account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '4400', name: 'إيرادات الشحن',               account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '4500', name: 'إيرادات التوزيع',             account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '4600', name: 'إيرادات الخدمات الطبية',      account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '4700', name: 'إيرادات الإنتاج الصناعي',     account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '4800', name: 'إيرادات عقارية وتأجير',       account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '4900', name: 'إيرادات مقاولات وإنشاءات',    account_type: 'revenue',   parent: '4000', is_cash_account: false, is_bank_account: false },
        { code: '5100', name: 'تكلفة البضاعة المباعة',       account_type: 'expense',   parent: '5000', is_cash_account: false, is_bank_account: false },
        { code: '5150', name: 'تكلفة الخدمات المقدمة',       account_type: 'expense',   parent: '5000', is_cash_account: false, is_bank_account: false },
        { code: '5300', name: 'تكلفة الإنتاج والتشغيل',      account_type: 'expense',   parent: '5000', is_cash_account: false, is_bank_account: false },
        { code: '6100', name: 'الرواتب والأجور',             account_type: 'expense',   parent: '6000', is_cash_account: false, is_bank_account: false },
        { code: '6200', name: 'الإيجار',                     account_type: 'expense',   parent: '6000', is_cash_account: false, is_bank_account: false },
        { code: '6300', name: 'المرافق',                     account_type: 'expense',   parent: '6000', is_cash_account: false, is_bank_account: false },
        { code: '6400', name: 'الإهلاك',                     account_type: 'expense',   parent: '6000', is_cash_account: false, is_bank_account: false },
      ].map(a => ({
        restaurant_id: restaurantId,
        code: a.code,
        name: a.name,
        account_type: a.account_type,
        parent_id: codeToId.get(a.parent) || null,
        is_cash_account: a.is_cash_account,
        is_bank_account: a.is_bank_account,
      }));

      const { error: childErr } = await supabase
        .from('chart_of_accounts')
        .upsert(childAccounts, { onConflict: 'restaurant_id,code', ignoreDuplicates: true });
      if (childErr) throw childErr;

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
    entry: Omit<JournalEntry, 'id' | 'entry_number' | 'created_at' | 'lines'> & { lines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] }
  ): Promise<JournalEntry | null> {
    try {
      const entryNumber = await this.getNextEntryNumber(restaurantId);
      
      // Validate balance
      const totalDebit = entry.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredit = entry.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new Error(`Journal entry must balance: Debit ${totalDebit} ≠ Credit ${totalCredit}`);
      }

      // Insert journal entry
      const { data: journalData, error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          restaurant_id: restaurantId,
          entry_number: entryNumber,
          entry_date: entry.entry_date,
          reference_type: entry.reference_type,
          reference_id: entry.reference_id,
          description: entry.description,
          source: entry.source,
          total_debit: totalDebit,
          total_credit: totalCredit,
          is_posted: entry.is_posted ?? false,
          is_recurring: entry.is_recurring ?? false,
          created_by: entry.created_by,
        })
        .select()
        .single();

      if (journalError || !journalData) {
        throw new Error(`Failed to create journal entry: ${journalError?.message}`);
      }

      // Insert journal lines
      const linesWithEntryId = entry.lines.map((line, index) => ({
        entry_id: journalData.id,
        account_id: line.account_id,
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description,
        cost_center_id: line.cost_center_id,
        line_order: index,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntryId);

      if (linesError) {
        // Rollback - delete the journal entry
        await supabase.from('journal_entries').delete().eq('id', journalData.id);
        throw new Error(`Failed to create journal lines: ${linesError.message}`);
      }

      // Update account balances IN PARALLEL
      await Promise.all(entry.lines.map(line => 
        this.updateAccountBalance(line.account_id, line.debit || 0, line.credit || 0)
      ));

      toast.success(`تم إنشاء قيد يومية ${entryNumber}`);
      
      return {
        ...journalData,
        lines: [], // Will be loaded separately if needed
      } as JournalEntry;

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
    taxAmount: number = 0
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
    let cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
    let salesAcc = await this.getAccountByCode(restaurantId, targetRevenueAccount);

    if (!cashAcc || !salesAcc) {
      console.warn('Essential accounts missing, attempting self-healing...', { mapping, targetRevenueAccount });
      await this.ensureAccountingSetup(restaurantId);
      
      // Retry fetching
      this.clearCache();
      cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
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

    // 1. Debit: Cash/Bank for paid amount
    if (paidAmount > 0) {
      lines.push({
        account_id: cashAcc.id,
        debit: paidAmount,
        credit: 0,
        description: `نقدية من فاتورة ${order.order_number}`,
        line_order: 1,
      });
    }

    // 2. Debit: Accounts Receivable for remaining
    if (remaining > 0 && arAcc) {
      lines.push({
        account_id: arAcc.id,
        debit: remaining,
        credit: 0,
        description: `ذمم مدينة - فاتورة ${order.order_number}`,
        line_order: 2,
      });
    }

    // 3. Credit: Revenue Account
    lines.push({
      account_id: salesAcc.id,
      debit: 0,
      credit: totalWithDiscount - taxAmount,
      description: `إيرادات ${businessType} - ${order.order_number}`,
      line_order: 3,
    });

    // 4. Credit: Tax Payable
    if (taxAmount > 0 && taxAcc) {
      lines.push({
        account_id: taxAcc.id,
        debit: 0,
        credit: taxAmount,
        description: `ضريبة القيمة المضافة`,
        line_order: 4,
      });
    }

    // 5. Debit: Sales Discount (if any)
    if (order.discount > 0) {
      const discountAcc = await this.getAccountByCode(restaurantId, '4120') || salesAcc;
      lines.push({
        account_id: discountAcc.id,
        debit: order.discount,
        credit: 0,
        description: `خصم مبيعات - ${order.order_number}`,
        line_order: 5,
      });
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

    // 6. Update Customer Balance if credit sale
    if (remaining > 0 && order.customer_id) {
      await supabase.rpc('update_customer_balance', {
        p_customer_id: order.customer_id,
        p_amount: remaining
      });
    }

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

    // Debit: Sales (Return)
    lines.push({
      account_id: salesAcc?.id || '',
      debit: returnData.amount - returnData.taxAmount,
      credit: 0,
      description: `مردودات مبيعات - فاتورة ${returnData.orderNumber}`,
      line_order: 1,
    });

    // Debit: Tax Payable (Reverse)
    if (returnData.taxAmount > 0 && taxAcc) {
      lines.push({
        account_id: taxAcc.id,
        debit: returnData.taxAmount,
        credit: 0,
        description: `عكس ضريبة المردودات`,
        line_order: 2,
      });
    }

    // Credit: Cash or AR
    if (returnData.customerId && arAcc) {
      lines.push({
        account_id: arAcc.id,
        debit: 0,
        credit: returnData.amount,
        description: `تخفيض مديونية عميل - مردودات ${returnData.orderNumber}`,
        line_order: 3,
      });
      
      // Update Customer Balance
      await supabase.rpc('update_customer_balance', {
        p_customer_id: returnData.customerId,
        p_amount: -returnData.amount
      });
    } else if (cashAcc) {
      lines.push({
        account_id: cashAcc.id,
        debit: 0,
        credit: returnData.amount,
        description: `رد نقدية - مردودات ${returnData.orderNumber}`,
        line_order: 3,
      });
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
      isCredit: boolean;
      description: string;
    },
    businessType: string
  ): Promise<JournalEntry | null> {
    const mapping = this.getBusinessMapping(businessType);
    const lines: Omit<JournalEntryLine, 'id' | 'entry_id'>[] = [];

    const invAcc = await this.getAccountByCode(restaurantId, mapping.inventoryAccount);
    const cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
    const apAcc = await this.getAccountByCode(restaurantId, mapping.accountsPayable);

    if (!invAcc) return null;

    // Debit: Inventory
    lines.push({
      account_id: invAcc.id,
      debit: purchase.amount,
      credit: 0,
      description: `شراء مخزون - ${purchase.description}`,
      line_order: 1,
    });

    // Credit: Cash or Accounts Payable
    if (purchase.isCredit && apAcc) {
      lines.push({
        account_id: apAcc.id,
        debit: 0,
        credit: purchase.amount,
        description: `ذمم موردين - ${purchase.supplierName}`,
        line_order: 2,
      });

      // Update Supplier Balance
      await supabase.rpc('update_supplier_balance', {
        p_supplier_id: purchase.supplierId,
        p_amount: purchase.amount
      });
    } else if (cashAcc) {
      lines.push({
        account_id: cashAcc.id,
        debit: 0,
        credit: purchase.amount,
        description: `دفع نقدي للمورد - ${purchase.supplierName}`,
        line_order: 2,
      });
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
          description: `إنقاص مخزون - ${order.order_number}`,
          line_order: 2,
        },
      ],
    });
  }

  async createDeliveryJournalEntry(
    restaurantId: string,
    order: Order,
    deliveryFee: number,
    businessType: string
  ): Promise<JournalEntry | null> {
    if (deliveryFee <= 0) return null;

    const mapping = this.getBusinessMapping(businessType);
    const cashAcc = await this.getAccountByCode(restaurantId, mapping.cashAccount);
    const deliveryRevAcc = await this.getAccountByCode(restaurantId, mapping.deliveryRevenue || '4300');

    if (!cashAcc || !deliveryRevAcc) return null;

    return this.createJournalEntry(restaurantId, {
      entry_date: new Date(),
      reference_type: 'order',
      reference_id: order.id,
      description: `رسوم توصيل - ${order.order_number}`,
      source: 'pos',
      is_posted: true,
      lines: [
        {
          account_id: cashAcc.id,
          debit: deliveryFee,
          credit: 0,
          description: `استلام رسوم توصيل`,
          line_order: 1,
        },
        {
          account_id: deliveryRevAcc.id,
          debit: 0,
          credit: deliveryFee,
          description: `إيرادات توصيل`,
          line_order: 2,
        },
      ],
    });
  }

  async createExpenseJournalEntry(
    restaurantId: string,
    expense: {
      amount: number;
      description: string;
      category: string;
      payment_method: 'cash' | 'bank' | 'credit';
      date?: Date;
    }
  ): Promise<JournalEntry | null> {
    const mapping = this.getBusinessMapping('general');
    
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
