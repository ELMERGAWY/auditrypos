import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  resolveEffectivePlan,
  isTabAllowed,
  getTrialDaysLeft,
  isOnFreePlan,
  PLAN_DEFINITIONS,
  type PlanId,
  type RestaurantPlanContext,
} from '@/lib/subscriptionPlans';

export function usePlanFeatures(restaurant: RestaurantPlanContext | null | undefined) {
  const { i18n } = useTranslation();

  return useMemo(() => {
    const planId = resolveEffectivePlan(restaurant);
    const plan = PLAN_DEFINITIONS[planId];
    const lang = (i18n.language?.slice(0, 2) || 'ar') as 'ar' | 'en' | 'fr';
    const trialDaysLeft = getTrialDaysLeft(restaurant?.subscription_end);
    const isFree = isOnFreePlan(restaurant);
    const isLegacy = planId === 'legacy';
    const isPaid = isLegacy || (!!restaurant?.license_key && planId !== 'free');

    return {
      planId,
      plan,
      planLabel: plan.label[lang] || plan.label.ar,
      trialDaysLeft,
      isFree,
      isLegacy,
      isPaid,
      canAccessTab: (tabId: string) => isTabAllowed(planId, tabId),
      maxStaff: plan.maxStaff,
      maxModules: plan.maxModules,
      lockedTabs: plan.lockedTabs,
    };
  }, [restaurant, i18n.language]);
}

export type PlanFeatures = ReturnType<typeof usePlanFeatures>;
