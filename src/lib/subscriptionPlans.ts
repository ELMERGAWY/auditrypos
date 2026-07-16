/**
 * Subscription plan definitions.
 * Existing restaurants without plan_id are treated as "legacy" — full access preserved.
 */

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise' | 'legacy';

export interface PlanDefinition {
  id: PlanId;
  maxModules: number;
  maxStaff: number;
  maxBranches: number;
  allowedTabs: string[] | 'all';
  lockedTabs: string[];
  label: { ar: string; en: string; fr: string };
}

const FREE_ALLOWED = [
  'pos', 'orders', 'menu', 'inventory', 'notifications', 'settings', 'chat', 'staff',
];

const STARTER_ALLOWED = [
  ...FREE_ALLOWED, 'customers', 'suppliers', 'shifts', 'expenses', 'analytics',
];

const PRO_ALLOWED = [
  ...STARTER_ALLOWED, 'crm', 'financials', 'treasury', 'sales_orders', 'sales_invoices',
  'purchase_orders', 'purchase_invoices', 'chart_of_accounts', 'manual_journal',
  'delivery', 'kds', 'qr', 'loyalty', 'ai_assistant',
];

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    maxModules: 1,
    maxStaff: 3,
    maxBranches: 1,
    allowedTabs: FREE_ALLOWED,
    lockedTabs: [
      'crm', 'ai_assistant', 'analytics', 'financials', 'treasury', 'branches',
      'marketing_hub', 'marketing_services', 'marketing_quotes', 'marketing_contracts',
      'chart_of_accounts', 'manual_journal', 'fixed_assets', 'contracting', 'projects',
      'bom', 'garment_production', 'gift_cards', 'delivery', 'kds',
    ],
    label: { ar: 'مجاني', en: 'Free', fr: 'Gratuit' },
  },
  starter: {
    id: 'starter',
    maxModules: 1,
    maxStaff: 10,
    maxBranches: 1,
    allowedTabs: STARTER_ALLOWED,
    lockedTabs: ['crm', 'ai_assistant', 'financials', 'treasury', 'branches', 'marketing_hub'],
    label: { ar: 'البداية', en: 'Starter', fr: 'Débutant' },
  },
  pro: {
    id: 'pro',
    maxModules: 3,
    maxStaff: 50,
    maxBranches: 5,
    allowedTabs: PRO_ALLOWED,
    lockedTabs: ['branches', 'marketing_hub', 'garment_production'],
    label: { ar: 'احترافي', en: 'Pro', fr: 'Pro' },
  },
  enterprise: {
    id: 'enterprise',
    maxModules: 999,
    maxStaff: 999,
    maxBranches: 999,
    allowedTabs: 'all',
    lockedTabs: [],
    label: { ar: 'مؤسسات', en: 'Enterprise', fr: 'Entreprise' },
  },
  legacy: {
    id: 'legacy',
    maxModules: 999,
    maxStaff: 999,
    maxBranches: 999,
    allowedTabs: 'all',
    lockedTabs: [],
    label: { ar: 'تقليدي', en: 'Legacy', fr: 'Héritage' },
  },
};

export interface RestaurantPlanContext {
  plan_id?: string | null;
  subscription_end?: string | null;
  license_key?: string | null;
  status?: string | null;
}

/** Resolve effective plan without breaking existing paid/trial users. */
export function resolveEffectivePlan(restaurant: RestaurantPlanContext | null | undefined): PlanId {
  if (!restaurant) return 'free';

  // Existing restaurants without plan_id keep full access (legacy)
  if (!restaurant.plan_id) return 'legacy';

  // Paid with valid subscription
  if (restaurant.license_key) {
    const plan = restaurant.plan_id as PlanId;
    if (plan in PLAN_DEFINITIONS && plan !== 'free') return plan;
    return 'pro';
  }

  return (restaurant.plan_id as PlanId) || 'free';
}

export function isTabAllowed(planId: PlanId, tabId: string): boolean {
  const plan = PLAN_DEFINITIONS[planId] ?? PLAN_DEFINITIONS.free;
  if (plan.allowedTabs === 'all') return true;
  if (plan.lockedTabs.includes(tabId)) return false;
  return plan.allowedTabs.includes(tabId);
}

export function isOnFreePlan(restaurant: RestaurantPlanContext | null | undefined): boolean {
  return resolveEffectivePlan(restaurant) === 'free';
}

export function getTrialDaysLeft(subscriptionEnd?: string | null): number {
  if (!subscriptionEnd) return 0;
  const diff = new Date(subscriptionEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Global pricing — multi-currency display */
export const GLOBAL_PRICING = {
  starter: { usd: 9, eur: 8, egp: 199 },
  pro: { usd: 29, eur: 27, egp: 499 },
  enterprise: { usd: 59, eur: 55, egp: 999 },
} as const;

export type CurrencyCode = 'usd' | 'eur' | 'egp';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  usd: '$',
  eur: '€',
  egp: 'EGP',
};

export function formatPrice(amount: number, currency: CurrencyCode, lang: string): string {
  if (currency === 'egp') return `${amount} ${CURRENCY_SYMBOLS.egp}`;
  const symbol = CURRENCY_SYMBOLS[currency];
  return lang === 'ar' ? `${amount} ${symbol}` : `${symbol}${amount}`;
}
