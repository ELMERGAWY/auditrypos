import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, DollarSign, AlertTriangle, Clock, Gift, TrendingUp,
  LayoutGrid, Globe, UserPlus, ArrowUpRight, Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const CHART_COLORS = [
  'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)',
  'hsl(200, 80%, 50%)', 'hsl(280, 70%, 55%)', 'hsl(0, 84%, 60%)'
];

const PLAN_COLORS: Record<string, string> = {
  free: 'hsl(0, 84%, 60%)',
  starter: 'hsl(200, 80%, 50%)',
  pro: 'hsl(280, 70%, 55%)',
  enterprise: 'hsl(142, 71%, 45%)',
  legacy: 'hsl(38, 92%, 50%)',
};

interface Props {
  restaurants: any[];
  orders: any[];
  globalUsers: any[];
  adminNotifications: any[];
}

export function GlobalDashboard({ restaurants, orders, globalUsers, adminNotifications }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const activeRests = restaurants.filter(r => r.status === 'active').length;
    const freePlanRests = restaurants.filter(r => r.plan_id === 'free').length;
    const legacyRests = restaurants.filter(r => !r.plan_id).length;
    const paidRests = restaurants.filter(r => r.license_key).length;
    const newToday = restaurants.filter(r => new Date(r.created_at).toDateString() === today).length;
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today && o.status !== 'cancelled');
    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const trialPending = restaurants.filter(r =>
      r.status === 'pending' || r.status === 'trial' ||
      (r.plan_id === 'free' && r.subscription_end && new Date(r.subscription_end) > new Date())
    ).length;
    const conversionRate = restaurants.length > 0
      ? Math.round((paidRests / restaurants.length) * 100)
      : 0;

    const byPlan = [
      { name: t('plans.starter.name'), value: restaurants.filter(r => r.plan_id === 'starter').length, id: 'starter' },
      { name: t('plans.pro.name'), value: restaurants.filter(r => r.plan_id === 'pro').length, id: 'pro' },
      { name: t('plans.enterprise.name'), value: restaurants.filter(r => r.plan_id === 'enterprise').length, id: 'enterprise' },
      { name: 'Free', value: freePlanRests, id: 'free' },
      { name: 'Legacy', value: legacyRests, id: 'legacy' },
    ].filter(d => d.value > 0);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayStr = date.toDateString();
      const dayOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === dayStr);
      const daySignups = restaurants.filter(r => new Date(r.created_at).toDateString() === dayStr).length;
      return {
        day: date.toLocaleDateString(locale, { weekday: 'short' }),
        revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
        signups: daySignups,
      };
    });

    const unreadNotifs = adminNotifications.filter(n => !n.is_read).length;

    return {
      activeRests, freePlanRests, newToday, todayRevenue, trialPending,
      conversionRate, globalUsersCount: globalUsers.length,
      byPlan, last7Days, unreadNotifs, paidRests,
    };
  }, [restaurants, orders, globalUsers, adminNotifications, t, locale]);

  const kpiCards = [
    { icon: Users, value: stats.activeRests, label: t('superAdmin.stats.activeCompanies'), color: 'border-b-primary', iconColor: 'text-primary' },
    { icon: Gift, value: stats.freePlanRests, label: t('superAdmin.stats.freePlanCompanies'), color: 'border-b-destructive', iconColor: 'text-destructive' },
    { icon: DollarSign, value: stats.todayRevenue.toLocaleString(), label: t('superAdmin.stats.todayRevenue'), color: 'border-b-success', iconColor: 'text-success' },
    { icon: UserPlus, value: stats.newToday, label: t('superAdmin.stats.newSignupsToday'), color: 'border-b-warning', iconColor: 'text-warning' },
    { icon: TrendingUp, value: `${stats.conversionRate}%`, label: t('superAdmin.stats.conversionRate'), color: 'border-b-purple-500', iconColor: 'text-purple-500' },
    { icon: Globe, value: stats.globalUsersCount, label: t('superAdmin.stats.globalUsers'), color: 'border-b-cyan-500', iconColor: 'text-cyan-500' },
    { icon: Clock, value: stats.trialPending, label: t('superAdmin.stats.trialPending'), color: 'border-b-orange-500', iconColor: 'text-orange-500' },
    { icon: AlertTriangle, value: stats.unreadNotifs, label: t('superAdmin.tabs.notifications'), color: 'border-b-yellow-500', iconColor: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Global KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div key={i} className={`glass-card p-5 border-b-4 ${card.color} hover:scale-[1.02] transition-transform`}>
            <card.icon className={`w-7 h-7 ${card.iconColor} mb-2`} />
            <p className="text-2xl md:text-3xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Free Plan Companies Alert Banner */}
      {stats.freePlanRests > 0 && (
        <div className="glass-card p-4 border border-destructive/30 bg-destructive/5 flex items-center gap-4 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-destructive">{stats.freePlanRests} {t('superAdmin.stats.freePlanCompanies')}</p>
            <p className="text-sm text-muted-foreground">
              {stats.paidRests} paid · {stats.conversionRate}% {t('superAdmin.stats.conversionRate')}
            </p>
          </div>
          <Badge variant="outline" className="border-destructive/30 text-destructive">
            <Zap className="w-3 h-3 mr-1" /> {stats.unreadNotifs} new
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t('superAdmin.charts.revenueGrowth')}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.last7Days}>
              <defs>
                <linearGradient id="colorRevGlobal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevGlobal)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            {t('superAdmin.charts.planDistribution')}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stats.byPlan} innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                {stats.byPlan.map((entry) => (
                  <Cell key={entry.id} fill={PLAN_COLORS[entry.id] || CHART_COLORS[0]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {stats.byPlan.map(entry => (
              <Badge key={entry.id} variant="outline" className="text-xs">
                <span className="w-2 h-2 rounded-full mr-1 inline-block" style={{ background: PLAN_COLORS[entry.id] }} />
                {entry.name}: {entry.value}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Signup Trend */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-primary" />
          {t('superAdmin.charts.signupTrend')}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.last7Days}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
            <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Free Plan Signups */}
      {stats.freePlanRests > 0 && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-destructive" />
            {t('superAdmin.tabs.freePlan')}
          </h3>
          <div className="space-y-2">
            {restaurants.filter(r => r.plan_id === 'free').slice(0, 8).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-lg">🏢</div>
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString(locale)}
                      {r.subscription_end && ` · Trial: ${Math.max(0, Math.ceil((new Date(r.subscription_end).getTime() - Date.now()) / 86400000))}d`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">Free</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
