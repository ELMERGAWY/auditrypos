// @ts-nocheck
/**
 * UNIFIED POS CONFIGURATION
 * Single source of truth that drives the one POS component for every business type.
 * Retail / Restaurant / Services / Wholesale all render the same POS, only the
 * capability flags below change.
 */
import {
  isFoodSector,
  isInventoryDrivenBusiness,
  getDefaultOrderType,
  getPosSearchPlaceholder,
} from '@/lib/businessTypes';

export interface POSConfig {
  businessType: string;
  /** dine-in tables + table grid */
  tableService: boolean;
  /** kitchen display routing */
  kitchenDisplay: boolean;
  /** stock badges, warehouse selector, stock validation */
  inventoryDriven: boolean;
  /** fractional / weight based quantities and value<->qty bidirectional entry */
  fractionalQuantities: boolean;
  /** service variables dialog (laundry, workshops, agencies...) */
  serviceVariables: boolean;
  /** barcode hardware scanner listener */
  barcodeScanner: boolean;
  /** allow paid amount + method during checkout */
  inlinePayment: boolean;
  /** held / parked tickets */
  heldTickets: boolean;
  defaultOrderType: string;
  searchPlaceholder: string;
}

const SERVICE_SECTORS = [
  'services', 'law_firm', 'marketing_agency', 'beauty_salon',
  'auto_repair', 'education', 'gym', 'rental', 'contracting', 'finishing',
];

export function getPOSConfig(businessType?: string | null): POSConfig {
  const bt = (businessType || 'other') as string;
  const food = isFoodSector(bt);
  const inventory = isInventoryDrivenBusiness(bt);
  const service = SERVICE_SECTORS.includes(bt);

  return {
    businessType: bt,
    tableService: food,
    kitchenDisplay: food,
    inventoryDriven: inventory,
    fractionalQuantities: inventory || bt === 'grocery' || bt === 'wholesale',
    serviceVariables: service || bt === 'other',
    barcodeScanner: inventory,
    inlinePayment: true,
    heldTickets: true,
    defaultOrderType: getDefaultOrderType(bt),
    searchPlaceholder: getPosSearchPlaceholder(bt),
  };
}

export default getPOSConfig;
