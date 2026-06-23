/**
 * STANDARD CHART OF ACCOUNTS
 * Professional accounting structure for all business types
 * 
 * Structure:
 * 1. Assets (1.x)
 * 2. Liabilities (2.x)
 * 3. Equity (3.x)
 * 4. Revenue (4.x)
 * 5. COGS (5.x)
 * 6. Operating Expenses (6.x)
 */

import { supabase } from '@/integrations/supabase/client';

export interface StandardAccount {
  code: string;
  name: string;
  name_en: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_code?: string;
  is_bank_account?: boolean;
  is_cash_account?: boolean;
}

// ============================================================
// STANDARD CHART OF ACCOUNTS
// ============================================================
export const STANDARD_CHART_OF_ACCOUNTS: StandardAccount[] = [
  // ============================================================
  // 1. ASSETS (الأصول)
  // ============================================================
  { code: '1', name: 'الأصول', name_en: 'Assets', account_type: 'asset' },
  
  // Current Assets (الأصول المتداولة)
  { code: '1.01', name: 'الأصول المتداولة', name_en: 'Current Assets', account_type: 'asset', parent_code: '1' },
  
  // Cash & Bank
  { code: '1.01.001', name: 'الصندوق', name_en: 'Cash', account_type: 'asset', parent_code: '1.01', is_cash_account: true },
  { code: '1.01.002', name: 'البنك', name_en: 'Bank', account_type: 'asset', parent_code: '1.01', is_bank_account: true },
  { code: '1.01.003', name: 'العملاء', name_en: 'Accounts Receivable', account_type: 'asset', parent_code: '1.01' },
  
  // Inventory (For businesses with inventory)
  { code: '1.01.004', name: 'مخزون البضاعة', name_en: 'Inventory - Goods', account_type: 'asset', parent_code: '1.01' },
  { code: '1.01.005', name: 'مخزون المطبخ', name_en: 'Inventory - Kitchen', account_type: 'asset', parent_code: '1.01' },
  { code: '1.01.006', name: 'مدفوعات مسبقة', name_en: 'Prepayments', account_type: 'asset', parent_code: '1.01' },
  
  // Fixed Assets (الأصول الثابتة)
  { code: '1.02', name: 'الأصول الثابتة', name_en: 'Fixed Assets', account_type: 'asset', parent_code: '1' },
  { code: '1.02.001', name: 'أثاث ومعدات', name_en: 'Furniture & Equipment', account_type: 'asset', parent_code: '1.02' },
  { code: '1.02.002', name: 'أجهزة كمبيوتر', name_en: 'Computers', account_type: 'asset', parent_code: '1.02' },
  { code: '1.02.003', name: 'سيارات', name_en: 'Vehicles', account_type: 'asset', parent_code: '1.02' },
  { code: '1.02.004', name: 'إهلاك متراكم', name_en: 'Accumulated Depreciation', account_type: 'asset', parent_code: '1.02' },
  
  // ============================================================
  // 2. LIABILITIES (الالتزامات)
  // ============================================================
  { code: '2', name: 'الالتزامات', name_en: 'Liabilities', account_type: 'liability' },
  
  // Current Liabilities
  { code: '2.01', name: 'الالتزامات المتداولة', name_en: 'Current Liabilities', account_type: 'liability', parent_code: '2' },
  { code: '2.01.001', name: 'ضريبة القيمة المضافة', name_en: 'VAT Payable', account_type: 'liability', parent_code: '2.01' },
  { code: '2.01.002', name: 'الموردين', name_en: 'Accounts Payable', account_type: 'liability', parent_code: '2.01' },
  { code: '2.01.003', name: 'قروض قصيرة الأجل', name_en: 'Short-term Loans', account_type: 'liability', parent_code: '2.01' },
  { code: '2.01.004', name: 'مصروفات مستحقة', name_en: 'Accrued Expenses', account_type: 'liability', parent_code: '2.01' },
  
  // Long-term Liabilities
  { code: '2.02', name: 'الالتزامات طويلة الأجل', name_en: 'Long-term Liabilities', account_type: 'liability', parent_code: '2' },
  { code: '2.02.001', name: 'قروض طويلة الأجل', name_en: 'Long-term Loans', account_type: 'liability', parent_code: '2.02' },
  
  // ============================================================
  // 3. EQUITY (حقوق الملكية)
  // ============================================================
  { code: '3', name: 'حقوق الملكية', name_en: 'Equity', account_type: 'equity' },
  { code: '3.01', name: 'رأس المال', name_en: 'Capital', account_type: 'equity', parent_code: '3' },
  { code: '3.02', name: 'الأرباح المحتجزة', name_en: 'Retained Earnings', account_type: 'equity', parent_code: '3' },
  { code: '3.03', name: 'أرباح السنة الحالية', name_en: 'Current Year Profit', account_type: 'equity', parent_code: '3' },
  
  // ============================================================
  // 4. REVENUE (الإيرادات)
  // ============================================================
  { code: '4', name: 'الإيرادات', name_en: 'Revenue', account_type: 'revenue' },
  
  // Service Revenue (للأعمال الخدمية)
  { code: '4.01', name: 'إيرادات الخدمات', name_en: 'Service Revenue', account_type: 'revenue', parent_code: '4' },
  { code: '4.01.001', name: 'إيراد استشارات', name_en: 'Consulting Revenue', account_type: 'revenue', parent_code: '4.01' },
  { code: '4.01.002', name: 'إيراد خدمات محاسبية', name_en: 'Accounting Services', account_type: 'revenue', parent_code: '4.01' },
  { code: '4.01.003', name: 'إيراد خدمات قانونية', name_en: 'Legal Services', account_type: 'revenue', parent_code: '4.01' },
  
  // Sales Revenue (للتجارة)
  { code: '4.02', name: 'إيرادات المبيعات', name_en: 'Sales Revenue', account_type: 'revenue', parent_code: '4' },
  { code: '4.02.001', name: 'مبيعات البضاعة', name_en: 'Goods Sales', account_type: 'revenue', parent_code: '4.02' },
  { code: '4.02.002', name: 'مبيعات بالجملة', name_en: 'Wholesale Sales', account_type: 'revenue', parent_code: '4.02' },
  
  // Food Revenue (للمطاعم)
  { code: '4.03', name: 'إيرادات الطعام', name_en: 'Food Revenue', account_type: 'revenue', parent_code: '4' },
  { code: '4.03.001', name: 'مبيعات الأكل في المطعم', name_en: 'Dine-in Sales', account_type: 'revenue', parent_code: '4.03' },
  { code: '4.03.002', name: 'مبيعات التيك أواي', name_en: 'Takeaway Sales', account_type: 'revenue', parent_code: '4.03' },
  { code: '4.03.003', name: 'مبيعات الدليفري', name_en: 'Delivery Sales', account_type: 'revenue', parent_code: '4.03' },
  
  // Other Revenue
  { code: '4.04', name: 'إيرادات أخرى', name_en: 'Other Revenue', account_type: 'revenue', parent_code: '4' },
  { code: '4.04.001', name: 'خصومات مكتسبة', name_en: 'Purchase Discounts', account_type: 'revenue', parent_code: '4.04' },
  
  // ============================================================
  // 5. COGS (تكلفة البضاعة المباعة)
  // ============================================================
  { code: '5', name: 'تكلفة البضاعة المباعة', name_en: 'Cost of Goods Sold', account_type: 'expense' },
  { code: '5.01', name: 'تكلفة المشتريات', name_en: 'Purchase Cost', account_type: 'expense', parent_code: '5' },
  { code: '5.01.001', name: 'تكلفة بضاعة مباعة', name_en: 'COGS - Goods', account_type: 'expense', parent_code: '5.01' },
  { code: '5.01.002', name: 'تكلفة مكونات الطعام', name_en: 'Food Cost', account_type: 'expense', parent_code: '5.01' },
  { code: '5.01.003', name: 'مرتجعات مشتريات', name_en: 'Purchase Returns', account_type: 'expense', parent_code: '5.01' },
  { code: '5.02', name: 'مصاريف الشحن والنقل', name_en: 'Shipping Costs', account_type: 'expense', parent_code: '5' },
  
  // ============================================================
  // 6. OPERATING EXPENSES (المصاريف التشغيلية)
  // ============================================================
  { code: '6', name: 'المصاريف', name_en: 'Operating Expenses', account_type: 'expense' },
  
  // Personnel
  { code: '6.01', name: 'مصاريف الموظفين', name_en: 'Personnel Expenses', account_type: 'expense', parent_code: '6' },
  { code: '6.01.001', name: 'مرتبات وأجور', name_en: 'Salaries & Wages', account_type: 'expense', parent_code: '6.01' },
  { code: '6.01.002', name: 'تأمينات اجتماعية', name_en: 'Social Insurance', account_type: 'expense', parent_code: '6.01' },
  { code: '6.01.003', name: 'مكافآت وحوافز', name_en: 'Bonuses', account_type: 'expense', parent_code: '6.01' },
  
  // Rent & Utilities
  { code: '6.02', name: 'الإيجار والمرافق', name_en: 'Rent & Utilities', account_type: 'expense', parent_code: '6' },
  { code: '6.02.001', name: 'إيجار المحل', name_en: 'Rent', account_type: 'expense', parent_code: '6.02' },
  { code: '6.02.002', name: 'كهرباء', name_en: 'Electricity', account_type: 'expense', parent_code: '6.02' },
  { code: '6.02.003', name: 'مياه', name_en: 'Water', account_type: 'expense', parent_code: '6.02' },
  { code: '6.02.004', name: 'إنترنت واتصالات', name_en: 'Internet & Telecom', account_type: 'expense', parent_code: '6.02' },
  
  // Marketing
  { code: '6.03', name: 'التسويق والإعلان', name_en: 'Marketing', account_type: 'expense', parent_code: '6' },
  { code: '6.03.001', name: 'إعلانات', name_en: 'Advertising', account_type: 'expense', parent_code: '6.03' },
  { code: '6.03.002', name: 'عمولات sales', name_en: 'Sales Commissions', account_type: 'expense', parent_code: '6.03' },
  
  // Administrative
  { code: '6.04', name: 'مصاريف إدارية', name_en: 'Administrative', account_type: 'expense', parent_code: '6' },
  { code: '6.04.001', name: 'ورق وطباعة', name_en: 'Stationery', account_type: 'expense', parent_code: '6.04' },
  { code: '6.04.002', name: 'صيانة', name_en: 'Maintenance', account_type: 'expense', parent_code: '6.04' },
  { code: '6.04.003', name: 'نظافة', name_en: 'Cleaning', account_type: 'expense', parent_code: '6.04' },
  { code: '6.04.004', name: 'مصاريف بنكية', name_en: 'Bank Charges', account_type: 'expense', parent_code: '6.04' },
  { code: '6.04.005', name: 'استشارات خارجية', name_en: 'External Consulting', account_type: 'expense', parent_code: '6.04' },
  
  // Depreciation
  { code: '6.05', name: 'الإهلاك', name_en: 'Depreciation', account_type: 'expense', parent_code: '6' },
  { code: '6.05.001', name: 'إهلاك معدات', name_en: 'Equipment Depreciation', account_type: 'expense', parent_code: '6.05' },
  { code: '6.05.002', name: 'إهلاك سيارات', name_en: 'Vehicle Depreciation', account_type: 'expense', parent_code: '6.05' },
  
  // Other
  { code: '6.06', name: 'مصاريف متنوعة', name_en: 'Miscellaneous', account_type: 'expense', parent_code: '6' },
  { code: '6.06.001', name: 'مصاريف نقدية متنوعة', name_en: 'Petty Cash', account_type: 'expense', parent_code: '6.06' },
];

// ============================================================
// INITIALIZATION FUNCTION
// ============================================================

export async function initializeChartOfAccounts(
  restaurantId: string,
  template: 'standard' | 'services' | 'retail' | 'restaurant' = 'standard'
): Promise<{ success: boolean; message: string; accountsCreated: number }> {
  try {
    // Filter accounts based on template
    let accountsToCreate = [...STANDARD_CHART_OF_ACCOUNTS];
    
    switch (template) {
      case 'services':
        // Exclude inventory-related accounts for services
        accountsToCreate = accountsToCreate.filter(acc => 
          !acc.code.startsWith('1.01.004') && // Inventory - Goods
          !acc.code.startsWith('1.01.005') && // Inventory - Kitchen
          !acc.code.startsWith('4.02') &&     // Sales Revenue
          !acc.code.startsWith('4.03') &&     // Food Revenue
          !acc.code.startsWith('5')           // COGS
        );
        break;
        
      case 'restaurant':
        // Exclude service revenue, include food revenue
        accountsToCreate = accountsToCreate.filter(acc =>
          !acc.code.startsWith('4.01') || // Keep service as optional
          acc.code.startsWith('1.01.005') || // Keep kitchen inventory
          acc.code.startsWith('4.03') ||      // Keep food revenue
          acc.code.startsWith('5.01.002')     // Keep food cost
        );
        break;
        
      case 'retail':
        // Standard is good for retail
        break;
    }

    // Create a map to store parent IDs
    const parentIdMap = new Map<string, string>();
    let createdCount = 0;

    // First pass: Create parent accounts (those without parent_code)
    const parentAccounts = accountsToCreate.filter(acc => !acc.parent_code);
    
    for (const acc of parentAccounts) {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert({
          restaurant_id: restaurantId,
          code: acc.code,
          name: acc.name,
          account_type: acc.account_type,
          is_bank_account: acc.is_bank_account || false,
          is_cash_account: acc.is_cash_account || false,
          opening_balance: 0,
          current_balance: 0
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') { // Duplicate
          console.log(`Account ${acc.code} already exists`);
          continue;
        }
        throw error;
      }

      parentIdMap.set(acc.code, data.id);
      createdCount++;
    }

    // Second pass: Create child accounts
    const childAccounts = accountsToCreate.filter(acc => acc.parent_code);
    
    for (const acc of childAccounts) {
      const parentId = parentIdMap.get(acc.parent_code!);
      
      if (!parentId) {
        console.warn(`Parent account ${acc.parent_code} not found for ${acc.code}`);
        continue;
      }

      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert({
          restaurant_id: restaurantId,
          code: acc.code,
          name: acc.name,
          account_type: acc.account_type,
          parent_id: parentId,
          is_bank_account: acc.is_bank_account || false,
          is_cash_account: acc.is_cash_account || false,
          opening_balance: 0,
          current_balance: 0
        })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') { // Duplicate
          console.log(`Account ${acc.code} already exists`);
          continue;
        }
        throw error;
      }

      parentIdMap.set(acc.code, data.id);
      createdCount++;
    }

    return {
      success: true,
      message: `Chart of accounts initialized successfully with ${createdCount} accounts`,
      accountsCreated: createdCount
    };

  } catch (error: any) {
    console.error('Error initializing chart of accounts:', error);
    return {
      success: false,
      message: error.message,
      accountsCreated: 0
    };
  }
}

// ============================================================
// GET ACCOUNTS BY TYPE
// ============================================================

export async function getAccountsByType(
  restaurantId: string,
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
): Promise<{ id: string; code: string; name: string; balance: number }[]> {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, current_balance')
    .eq('restaurant_id', restaurantId)
    .eq('account_type', accountType)
    .order('code');

  if (error) throw error;

  return (data || []).map(acc => ({
    id: acc.id,
    code: acc.code,
    name: acc.name,
    balance: acc.current_balance || 0
  }));
}

// ============================================================
// GET ACCOUNT BY CODE
// ============================================================

export async function getAccountByCode(
  restaurantId: string,
  code: string
): Promise<{ id: string; name: string; balance: number } | null> {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, name, current_balance')
    .eq('restaurant_id', restaurantId)
    .eq('code', code)
    .single();

  if (error) return null;

  return data ? {
    id: data.id,
    name: data.name,
    balance: data.current_balance || 0
  } : null;
}
