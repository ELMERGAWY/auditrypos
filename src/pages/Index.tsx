import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid, Shield, Zap, ArrowRight, Check, X, Star,
  Globe, BarChart3, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/global/LanguageSwitcher';
import { CurrencySwitcher, useCurrencyPreference } from '@/components/global/CurrencySwitcher';
import { GLOBAL_PRICING, formatPrice } from '@/lib/subscriptionPlans';
import { getLanguageDir } from '@/lib/i18n';

const Index = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useCurrencyPreference();
  const dir = getLanguageDir(i18n.language);
  const isRtl = dir === 'rtl';

  const features = [
    { icon: LayoutGrid, titleKey: 'features.modular.title', descKey: 'features.modular.desc' },
    { icon: Zap, titleKey: 'features.offline.title', descKey: 'features.offline.desc' },
    { icon: Shield, titleKey: 'features.accounting.title', descKey: 'features.accounting.desc' },
    { icon: Smartphone, titleKey: 'features.ux.title', descKey: 'features.ux.desc' },
    { icon: Globe, titleKey: 'features.central.title', descKey: 'features.central.desc' },
    { icon: BarChart3, titleKey: 'features.bi.title', descKey: 'features.bi.desc' },
  ];

  const sectors = [
    { icon: '🏗️', labelKey: 'sectors.construction.label', descKey: 'sectors.construction.desc' },
    { icon: '🏠', labelKey: 'sectors.realestate.label', descKey: 'sectors.realestate.desc' },
    { icon: '⚖️', labelKey: 'sectors.legal.label', descKey: 'sectors.legal.desc' },
    { icon: '🎨', labelKey: 'sectors.finishing.label', descKey: 'sectors.finishing.desc' },
    { icon: '🚗', labelKey: 'sectors.automotive.label', descKey: 'sectors.automotive.desc' },
    { icon: '🏥', labelKey: 'sectors.medical.label', descKey: 'sectors.medical.desc' },
  ];

  const pricingPlans = [
    { id: 'starter' as const, popular: false, planKey: 'starter' },
    { id: 'pro' as const, popular: true, planKey: 'pro' },
    { id: 'enterprise' as const, popular: false, planKey: 'enterprise' },
  ];

  const stats = [
    { value: '+1,500', labelKey: 'landing.stats.businesses' },
    { value: '18+', labelKey: 'landing.stats.modules' },
    { value: '99.99%', labelKey: 'landing.stats.uptime' },
    { value: '24/7', labelKey: 'landing.stats.support' },
  ];

  const ArrowIcon = isRtl ? ArrowRight : ArrowRight;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30" dir={dir}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[30%] bg-cyan-500/5 blur-[150px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-white/5 backdrop-blur-md sticky top-0">
        <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl font-black tracking-tighter">Auditry</span>
          </div>
          <div className="flex gap-2 sm:gap-4 items-center">
            <LanguageSwitcher variant="ghost" className="text-white/70 hover:text-white" />
            <Button variant="ghost" className="text-white/70 hover:text-white hidden sm:flex" onClick={() => navigate('/login')}>
              {t('common.login')}
            </Button>
            <Button className="gradient-bg text-white border-0 px-4 sm:px-6 font-bold rounded-xl shadow-lg shadow-primary/30" onClick={() => navigate('/register')}>
              {t('common.freeTrial')}
            </Button>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
            <Badge className="bg-white/5 text-primary border-primary/20 px-4 py-1.5 rounded-full mb-8 backdrop-blur-xl">
              <Star className={`w-3 h-3 ${isRtl ? 'ml-2' : 'mr-2'} fill-primary`} />
              {t('landing.badge')}
            </Badge>
            <h1 className="font-display text-5xl md:text-8xl font-black mb-8 tracking-tight leading-[1.1]">
              {t('landing.heroTitle1')}
              <br />
              <span className="gradient-text bg-gradient-to-r from-primary via-purple-500 to-amber-500">{t('landing.heroTitle2')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
              {t('landing.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button size="lg" className="gradient-bg text-white border-0 text-xl px-10 py-8 rounded-2xl shadow-2xl shadow-primary/40 hover:scale-105 transition-transform font-bold"
                onClick={() => navigate('/register')}>
                {t('landing.heroCta')}
                <ArrowIcon className={`w-6 h-6 ${isRtl ? 'mr-3 rotate-180' : 'ml-3'}`} />
              </Button>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Check className="w-4 h-4 text-green-500" />
                {t('common.trustedBy')}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-3xl mx-auto">
            {stats.map(s => (
              <div key={s.labelKey} className="text-center">
                <p className="text-3xl font-black text-primary">{s.value}</p>
                <p className="text-white/40 text-sm mt-1">{t(s.labelKey)}</p>
              </div>
            ))}
          </motion.div>
        </section>

        <section className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className={`flex flex-col md:flex-row items-end justify-between mb-16 gap-6 ${isRtl ? 'text-right' : 'text-left'}`}>
              <div>
                <h2 className="text-4xl md:text-5xl font-black mb-4">
                  {t('landing.modulesTitle')} <span className="text-primary">{t('landing.modulesTitleHighlight')}</span>
                </h2>
                <p className="text-white/50 text-xl">{t('landing.modulesSubtitle')}</p>
              </div>
              <Button variant="outline" className="border-white/10 hover:bg-white/5 text-lg px-8 py-6 rounded-xl">
                {t('landing.viewAllModules')}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sectors.map((s, i) => (
                <motion.div key={s.labelKey} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/50 transition-all overflow-hidden cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-5xl mb-6 block group-hover:scale-110 transition-transform">{s.icon}</span>
                  <h3 className="text-2xl font-bold mb-3">{t(s.labelKey)}</h3>
                  <p className="text-white/40 leading-relaxed">{t(s.descKey)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-white/[0.01] border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6 text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">{t('landing.featuresTitle')}</h2>
            <p className="text-white/50 text-xl">{t('landing.featuresSubtitle')}</p>
          </div>
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {features.map((f, i) => (
              <motion.div key={f.titleKey} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`flex flex-col gap-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">{t(f.titleKey)}</h3>
                <p className="text-white/50 leading-relaxed text-lg">{t(f.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-32 max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <h2 className="text-4xl md:text-6xl font-black">
                {t('landing.pricingTitle')} <span className="text-primary">{t('landing.pricingTitleHighlight')}</span>
              </h2>
            </div>
            <p className="text-white/50 text-xl mb-4">{t('landing.pricingSubtitle')}</p>
            <div className="flex items-center justify-center gap-4">
              <CurrencySwitcher value={currency} onChange={setCurrency} variant="outline" className="border-white/10 text-white" />
              <Badge variant="outline" className="border-green-500/30 text-green-400">{t('landing.pricingNote')}</Badge>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => {
              const price = GLOBAL_PRICING[plan.id][currency];
              const features = t(`plans.${plan.planKey}.features`, { returnObjects: true }) as string[];
              const locked = t(`plans.${plan.planKey}.locked`, { returnObjects: true }) as string[];
              return (
                <motion.div key={plan.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  className={`relative p-10 rounded-[2.5rem] border transition-all ${plan.popular ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/20 scale-105 z-10' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 gradient-bg text-white border-0 px-6 py-2 rounded-full text-sm font-bold">
                      {t(`plans.${plan.planKey}.badge`)}
                    </Badge>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white/60 mb-2">{t(`plans.${plan.planKey}.name`)}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black tracking-tighter">{formatPrice(price, currency, i18n.language)}</span>
                      <span className="text-white/40">/ {t('common.month')}</span>
                    </div>
                    <p className="text-primary font-medium mt-2">{t(`plans.${plan.planKey}.badge`)}</p>
                  </div>
                  <div className="space-y-4 mb-10">
                    {Array.isArray(features) && features.map(f => (
                      <div key={f} className="flex items-center gap-3 text-lg">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="text-white/80">{f}</span>
                      </div>
                    ))}
                    {Array.isArray(locked) && locked.map(f => (
                      <div key={f} className="flex items-center gap-3 text-lg opacity-30">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <X className="w-4 h-4" />
                        </div>
                        <span className="line-through">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className={`w-full py-8 rounded-2xl text-xl font-bold transition-all ${plan.popular ? 'gradient-bg text-white shadow-xl shadow-primary/30' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => navigate('/register')}
                  >
                    {plan.id === 'enterprise' ? t('common.contactUs') : t('common.subscribeNow')}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto rounded-[3rem] p-16 relative overflow-hidden text-center border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent">
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">{t('landing.ctaTitle')}</h2>
              <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">{t('landing.ctaSubtitle')}</p>
              <Button size="lg" className="gradient-bg text-white border-0 text-2xl px-12 py-10 rounded-[2rem] shadow-2xl shadow-primary/50 font-black"
                onClick={() => navigate('/register')}>
                {t('landing.ctaButton')}
              </Button>
              <p className="mt-8 text-white/30">{t('landing.pricingNote')}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-16 px-6 relative z-10">
        <div className={`max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-12 ${isRtl ? 'text-right' : 'text-left'}`}>
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <span className="font-display text-3xl font-black tracking-tighter">Auditry</span>
            </div>
            <p className="text-white/40 text-lg leading-relaxed max-w-md">{t('landing.heroSubtitle')}</p>
            <div className="flex gap-3 mt-6">
              <LanguageSwitcher variant="outline" className="border-white/10 text-white/70" showLabel />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-xl mb-6">{t('landing.footerProduct')}</h4>
            <ul className="space-y-4 text-white/50 text-lg">
              <li className="hover:text-primary cursor-pointer transition-colors">{t('landing.featuresTitle')}</li>
              <li className="hover:text-primary cursor-pointer transition-colors">{t('landing.modulesTitle')}</li>
              <li className="hover:text-primary cursor-pointer transition-colors">{t('landing.pricingTitleHighlight')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xl mb-6">{t('landing.footerSupport')}</h4>
            <ul className="space-y-4 text-white/50 text-lg">
              <li className="hover:text-primary cursor-pointer transition-colors">{t('common.contactUs')}</li>
              <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/login')}>{t('common.login')}</li>
              <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/register')}>{t('common.freeTrial')}</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-white/30 text-sm">
          <p>© 2026 Auditry ERP. All rights reserved.</p>
          <div className="flex gap-4 items-center">
            <Globe className="w-5 h-5" />
            <span>AR · EN · FR</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
