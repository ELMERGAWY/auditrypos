
// ============================================================
// TAX MANAGEMENT SYSTEM
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import type { TaxConfig, OrderTaxLine } from './types';

export interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  total: number;
  isInclusive: boolean;
  taxLines: OrderTaxLine[];
}

export interface TaxBreakdown {
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  grossAmount: number;
}

class TaxService {
  private taxCache: Map<string, TaxConfig[]> = new Map();

  // ============================================================
  // TAX CONFIGURATION MANAGEMENT
  // ============================================================

  async getTaxRates(restaurantId: string, forceRefresh = false): Promise<TaxConfig[]> {
    if (!forceRefresh) {
      const cached = this.taxCache.get(restaurantId);
      if (cached) return cached;
    }

    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load tax rates:', error);
      return [];
    }

    const configs = (data || []) as TaxConfig[];
    this.taxCache.set(restaurantId, configs);
    return configs;
  }

  async createTaxRate(config: Omit<TaxConfig, 'id'>): Promise<TaxConfig | null> {
    const { data, error } = await supabase
      .from('tax_rates')
      .insert({
        restaurant_id: config.restaurant_id,
        name: config.name,
        rate: config.rate,
        type: config.type,
        is_compound: config.is_compound,
        is_included_in_price: config.is_included_in_price,
        applies_to: config.applies_to,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create tax rate:', error);
      return null;
    }

    // Clear cache
    this.taxCache.delete(config.restaurant_id);
    return data as TaxConfig;
  }

  async updateTaxRate(taxId: string, updates: Partial<TaxConfig>): Promise<boolean> {
    const { error } = await supabase
      .from('tax_rates')
      .update(updates)
      .eq('id', taxId);

    if (error) {
      console.error('Failed to update tax rate:', error);
      return false;
    }

    // Clear all caches
    this.taxCache.clear();
    return true;
  }

  // ============================================================
  // TAX CALCULATION
  // ============================================================

  /**
   * Calculate tax for a single amount
   */
  calculateTax(
    amount: number,
    taxRate: number,
    isInclusive: boolean
  ): TaxBreakdown {
    if (isInclusive) {
      // Price includes tax: Extract tax from total
      const divisor = 1 + (taxRate / 100);
      const netAmount = amount / divisor;
      const taxAmount = amount - netAmount;
      
      return {
        taxableAmount: netAmount,
        taxRate,
        taxAmount,
        netAmount,
        grossAmount: amount,
      };
    } else {
      // Price excludes tax: Add tax to net
      const taxAmount = amount * (taxRate / 100);
      
      return {
        taxableAmount: amount,
        taxRate,
        taxAmount,
        netAmount: amount,
        grossAmount: amount + taxAmount,
      };
    }
  }

  /**
   * Calculate taxes for an order with multiple items
   */
  async calculateOrderTaxes(
    restaurantId: string,
    items: Array<{
      product_id?: string;
      category?: string;
      price: number;
      quantity: number;
    }>,
    options: {
      isDelivery?: boolean;
      deliveryFee?: number;
      discount?: number;
    } = {}
  ): Promise<TaxCalculation> {
    const taxRates = await this.getTaxRates(restaurantId);
    
    if (taxRates.length === 0) {
      // No tax configured - return zero tax
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        subtotal,
        taxAmount: 0,
        total: subtotal,
        isInclusive: false,
        taxLines: [],
      };
    }

    let subtotal = 0;
    let totalTax = 0;
    const taxLines: OrderTaxLine[] = [];

    // Calculate tax for each item
    for (const item of items) {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      // Find applicable tax rates for this item
      const applicableTaxes = taxRates.filter(tax => {
        // Check if tax applies to this product category
        if (tax.applies_to && tax.applies_to.length > 0) {
          if (!item.category) return tax.applies_to.includes('all');
          return tax.applies_to.includes(item.category) || tax.applies_to.includes('all');
        }
        return true;
      });

      for (const tax of applicableTaxes) {
        const breakdown = this.calculateTax(
          itemTotal,
          tax.rate,
          tax.is_included_in_price
        );

        totalTax += breakdown.taxAmount;

        taxLines.push({
          tax_config_id: tax.id,
          tax_name: tax.name,
          tax_rate: tax.rate,
          taxable_amount: breakdown.taxableAmount,
          tax_amount: breakdown.taxAmount,
        });
      }
    }

    // Calculate delivery fee tax if applicable
    if (options.isDelivery && options.deliveryFee && options.deliveryFee > 0) {
      const deliveryTaxRate = taxRates.find(t => t.applies_to?.includes('delivery') || t.applies_to?.includes('all'));
      
      if (deliveryTaxRate) {
        const deliveryBreakdown = this.calculateTax(
          options.deliveryFee,
          deliveryTaxRate.rate,
          deliveryTaxRate.is_included_in_price
        );

        totalTax += deliveryBreakdown.taxAmount;

        taxLines.push({
          tax_config_id: deliveryTaxRate.id,
          tax_name: `${deliveryTaxRate.name} (توصيل)`,
          tax_rate: deliveryTaxRate.rate,
          taxable_amount: deliveryBreakdown.taxableAmount,
          tax_amount: deliveryBreakdown.taxAmount,
        });
      }
    }

    // Aggregate taxes by tax config
    const aggregatedTaxes = this.aggregateTaxes(taxLines);

    // Check if taxes are inclusive
    const hasInclusiveTax = taxRates.some(t => t.is_included_in_price);

    let finalSubtotal = subtotal;
    let finalTotal = subtotal;

    if (hasInclusiveTax) {
      // If any tax is inclusive, the subtotal already includes tax
      finalTotal = subtotal;
      finalSubtotal = subtotal - totalTax;
    } else {
      // Tax exclusive: add tax to subtotal
      finalTotal = subtotal + totalTax;
    }

    // Apply discount after tax calculation
    if (options.discount && options.discount > 0) {
      finalTotal = Math.max(0, finalTotal - options.discount);
    }

    return {
      subtotal: finalSubtotal,
      taxAmount: totalTax,
      total: finalTotal,
      isInclusive: hasInclusiveTax,
      taxLines: aggregatedTaxes,
    };
  }

  private aggregateTaxes(taxLines: OrderTaxLine[]): OrderTaxLine[] {
    const aggregated = new Map<string, OrderTaxLine>();

    for (const line of taxLines) {
      const existing = aggregated.get(line.tax_config_id);
      if (existing) {
        existing.taxable_amount += line.taxable_amount;
        existing.tax_amount += line.tax_amount;
      } else {
        aggregated.set(line.tax_config_id, { ...line });
      }
    }

    return Array.from(aggregated.values());
  }

  // ============================================================
  // QUICK CALCULATIONS
  // ============================================================

  /**
   * Quick VAT calculation for Egypt (14%)
   */
  static calculateVAT(amount: number, isInclusive = false): TaxBreakdown {
    const vatRate = 14; // Egypt VAT rate

    if (isInclusive) {
      const netAmount = amount / 1.14;
      return {
        taxableAmount: netAmount,
        taxRate: vatRate,
        taxAmount: amount - netAmount,
        netAmount,
        grossAmount: amount,
      };
    } else {
      const taxAmount = amount * 0.14;
      return {
        taxableAmount: amount,
        taxRate: vatRate,
        taxAmount,
        netAmount: amount,
        grossAmount: amount + taxAmount,
      };
    }
  }

  /**
   * Calculate reverse tax (extract from total)
   */
  static extractTax(totalAmount: number, taxRate: number): { net: number; tax: number } {
    const divisor = 1 + (taxRate / 100);
    const net = totalAmount / divisor;
    const tax = totalAmount - net;
    return { net, tax };
  }

  // ============================================================
  // TAX REPORTING
  // ============================================================

  async getTaxReport(
    restaurantId: string,
    startDate: Date,
    endDate: Date,
    taxType?: 'vat' | 'sales' | 'service'
  ): Promise<{
    totalTaxable: number;
    totalTax: number;
    byRate: Array<{ rate: number; taxable: number; tax: number }>;
    byPeriod: Array<{ period: string; taxable: number; tax: number }>;
  }> {
    const { data, error } = await supabase
      .from('order_taxes')
      .select(`
        tax_amount,
        taxable_amount,
        tax_rate:tax_rates(rate, type)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('tax_rates.restaurant_id', restaurantId);

    if (error || !data) {
      return { totalTaxable: 0, totalTax: 0, byRate: [], byPeriod: [] };
    }

    // Aggregate by rate
    const byRate = new Map<number, { taxable: number; tax: number }>();
    let totalTaxable = 0;
    let totalTax = 0;

    for (const record of data as any[]) {
      const rate = record.tax_rate?.rate || 0;
      const taxable = Number(record.taxable_amount) || 0;
      const tax = Number(record.tax_amount) || 0;

      totalTaxable += taxable;
      totalTax += tax;

      const existing = byRate.get(rate) || { taxable: 0, tax: 0 };
      byRate.set(rate, {
        taxable: existing.taxable + taxable,
        tax: existing.tax + tax,
      });
    }

    return {
      totalTaxable,
      totalTax,
      byRate: Array.from(byRate.entries()).map(([rate, amounts]) => ({
        rate,
        taxable: amounts.taxable,
        tax: amounts.tax,
      })),
      byPeriod: [], // Would need more complex query for period breakdown
    };
  }

  // ============================================================
  // DEFAULT TAX SETUP
  // ============================================================

  async setupDefaultTaxes(restaurantId: string, country: string = 'EG'): Promise<void> {
    const defaultTaxes: Array<Omit<TaxConfig, 'id'>> = [];

    if (country === 'EG') {
      // Egypt VAT
      defaultTaxes.push({
        restaurant_id: restaurantId,
        name: 'ضريبة القيمة المضافة',
        rate: 14,
        type: 'vat',
        is_compound: false,
        is_included_in_price: false,
        applies_to: ['all'],
        is_active: true,
      });
    } else if (country === 'SA') {
      // Saudi VAT
      defaultTaxes.push({
        restaurant_id: restaurantId,
        name: 'VAT',
        rate: 15,
        type: 'vat',
        is_compound: false,
        is_included_in_price: false,
        applies_to: ['all'],
        is_active: true,
      });
    } else if (country === 'AE') {
      // UAE VAT
      defaultTaxes.push({
        restaurant_id: restaurantId,
        name: 'VAT',
        rate: 5,
        type: 'vat',
        is_compound: false,
        is_included_in_price: false,
        applies_to: ['all'],
        is_active: true,
      });
    }

    for (const tax of defaultTaxes) {
      await this.createTaxRate(tax);
    }
  }

  clearCache(): void {
    this.taxCache.clear();
  }
}

// Singleton instance
export const taxService = new TaxService();
export default taxService;
