import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import type { RestaurantPlanContext } from '@/lib/subscriptionPlans';

interface Props {
  tabId: string;
  restaurant: RestaurantPlanContext | null | undefined;
  children: React.ReactNode;
}

export function PlanFeatureGate({ tabId, restaurant, children }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAccessTab, planLabel, isFree, trialDaysLeft } = usePlanFeatures(restaurant);

  if (canAccessTab(tabId)) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full text-center space-y-6 glass-card p-10 rounded-3xl border border-primary/20">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('planGate.title')}</h2>
          <p className="text-muted-foreground">{t('planGate.description')}</p>
        </div>
        <Badge variant="outline" className="text-sm px-4 py-1">
          {t('planGate.currentPlan')}: {planLabel}
        </Badge>
        {isFree && trialDaysLeft > 0 && (
          <div className="flex items-center justify-center gap-2 text-warning text-sm">
            <Clock className="w-4 h-4" />
            {t('planGate.trialWarning', { days: trialDaysLeft })}
          </div>
        )}
        <Button
          className="w-full gradient-bg text-white gap-2 py-6 text-lg rounded-xl"
          onClick={() => navigate('/payment')}
        >
          <Sparkles className="w-5 h-5" />
          {t('planGate.upgradeBtn')}
        </Button>
      </div>
    </div>
  );
}
