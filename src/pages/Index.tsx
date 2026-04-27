import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wifi, WifiOff, QrCode, LayoutGrid, Shield, Zap, ArrowRight, Truck,
  Check, Star, CreditCard, Smartphone, Globe, BarChart3, Users, Clock, Receipt,
  Package, ShoppingCart, Warehouse, Pill, Store, Coffee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BUSINESS_TYPES } from '@/lib/businessTypes';

const features = [
  { icon: LayoutGrid, title: 'نظام POS احترافي', desc: 'واجهة ذكية مع باركود، سلة مشتريات، خصومات، طباعة فواتير حرارية، وفواتير متعددة' },
  { icon: Package, title: 'إدارة مخزون ذكية', desc: 'تتبع المخزون في الوقت الحقيقي مع تنبيهات نفاد وتواريخ صلاحية وحركات مخزون' },
  { icon: Users, title: 'حسابات عملاء وذمم', desc: 'دفتر حسابات العملاء مع بيع آجل وكشف حساب وإدارة ائتمان متقدمة' },
  { icon: QrCode, title: 'قائمة QR رقمية', desc: 'قائمة احترافية يفتحها عميلك بمسح QR Code — للمطاعم والكافيهات' },
  { icon: Truck, title: 'نظام توصيل متكامل', desc: 'إدارة المناديب، تتبع على الخريطة، وروابط تتبع للعملاء' },
  { icon: BarChart3, title: 'تقارير وتحليلات', desc: 'رسوم بيانية للمبيعات، تقارير المصروفات، تحليل الأرباح والخسائر' },
  { icon: Shield, title: 'أمان وحماية', desc: 'تشفير كامل للبيانات مع صلاحيات مستخدمين ونسخ احتياطي تلقائي' },
  { icon: Zap, title: 'يعمل بدون إنترنت', desc: 'محرك Offline-First يحفظ البيانات محلياً ويُزامن عند عودة الاتصال' },
  { icon: Receipt, title: 'فواتير ضريبية', desc: 'إصدار فواتير ضريبية احترافية مع طباعة حرارية وتصدير PDF' },
];

const sectors = [
  { icon: '🍽️', label: 'مطاعم وكافيهات', desc: 'POS + قائمة QR + توصيل' },
  { icon: '🏪', label: 'تجزئة ومحلات', desc: 'باركود + مخزون + عملاء' },
  { icon: '📦', label: 'تجارة جملة', desc: 'فواتير آجلة + ذمم + أقساط' },
  { icon: '🛒', label: 'سوبر ماركت', desc: 'ماسح باركود + صلاحية' },
  { icon: '🏭', label: 'مخازن ومستودعات', desc: 'جرد + حركات + تقارير' },
  { icon: '💊', label: 'صيدليات', desc: 'صلاحية + باركود + وصفات' },
];

const pricingPlans = [
  {
    name: 'تجريبي',
    price: 'مجاني',
    period: '14 يوم',
    badge: 'ابدأ الآن',
    features: ['نظام POS كامل', 'إدارة مخزون أساسية', 'تقارير مبسطة', 'حتى 50 منتج'],
    locked: ['حسابات عملاء', 'تقارير متقدمة', 'إدارة شفتات', 'نظام توصيل'],
    cta: 'ابدأ مجاناً',
    popular: false,
  },
  {
    name: 'شهري',
    price: '299',
    period: 'ج.م / شهر',
    badge: 'الأكثر شيوعاً',
    features: ['كل مميزات النسخة التجريبية', 'منتجات وعملاء غير محدودين', 'حسابات عملاء وذمم مالية', 'تقارير وتحليلات متقدمة', 'نظام توصيل كامل', 'دعم فني أولوية'],
    locked: [],
    cta: 'اشترك الآن',
    popular: true,
  },
  {
    name: 'سنوي',
    price: '2,499',
    period: 'ج.م / سنة',
    badge: 'وفّر 30%',
    features: ['كل المميزات المدفوعة', 'خصم 30% على السعر الشهري', 'أولوية في الدعم الفني', 'تحديثات مجانية طوال السنة'],
    locked: [],
    cta: 'اشترك سنوياً',
    popular: false,
  },
];

const paymentMethods = [
  { name: 'InstaPay', icon: '💳', desc: 'تحويل فوري من أي بنك' },
  { name: 'Vodafone Cash', icon: '📱', desc: 'محفظة فودافون كاش' },
  { name: 'PayPal', icon: '🅿️', desc: 'دفع دولي آمن' },
  { name: 'تحويل بنكي', icon: '🏦', desc: 'تحويل مباشر للحساب' },
];

const stats = [
  { value: '+1000', label: 'نشاط تجاري' },
  { value: '+100K', label: 'فاتورة شهرياً' },
  { value: '99.9%', label: 'وقت تشغيل' },
  { value: '24/7', label: 'دعم فني' },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-10" />
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SmartPOS</span>
          </div>
          <div className="flex gap-2 sm:gap-3 items-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/driver-login')} className="hidden sm:flex">
              <Truck className="w-4 h-4 ml-1" /> دخول المندوب
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>تسجيل الدخول</Button>
            <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => navigate('/register')}>
              ابدأ مجاناً
            </Button>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Wifi className="w-4 h-4" /> يعمل بدون إنترنت — لكل الأنشطة التجارية
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              نظام نقاط البيع
              <br />
              <span className="gradient-text">الأذكى والأشمل</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              SmartPOS — نظام POS احترافي لكل الأنشطة التجارية: مطاعم، محلات تجزئة، جملة، سوبر ماركت، صيدليات، مخازن.
              <br className="hidden sm:block" />
              كل ما تحتاجه في منصة واحدة.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gradient-bg text-primary-foreground border-0 text-lg px-8 py-6 glow-primary"
                onClick={() => navigate('/register')}>
                ابدأ الآن مجاناً — 14 يوم <ArrowRight className="w-5 h-5 mr-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6"
                onClick={() => navigate('/qr-menu/demo-1')}>
                شاهد القائمة التجريبية
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sectors */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">نظام واحد — كل القطاعات</h2>
          <p className="text-muted-foreground text-lg">اختر نوع نشاطك عند التسجيل وسيتم تخصيص النظام لك تلقائياً</p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sectors.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="glass-card p-5 text-center hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => navigate('/register')}>
              <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{s.icon}</span>
              <p className="font-bold text-sm">{s.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">مميزات تنافسية حقيقية</h2>
          <p className="text-muted-foreground text-lg">أدوات متقدمة لإدارة نشاطك التجاري بكفاءة واحترافية</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="glass-card p-6 hover:border-primary/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-card/30" id="pricing">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">خطط الأسعار</h2>
            <p className="text-muted-foreground text-lg">خطة واحدة تناسب كل الأنشطة التجارية</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`glass-card p-6 relative flex flex-col ${plan.popular ? 'border-primary/50 shadow-xl shadow-primary/10 scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-bg text-primary-foreground border-0 px-4 py-1">
                      <Star className="w-3 h-3 ml-1" /> {plan.badge}
                    </Badge>
                  </div>
                )}
                <div className="text-center mb-6 pt-2">
                  <h3 className="font-display text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                    {plan.period !== '14 يوم' && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                  {plan.period === '14 يوم' && <p className="text-sm text-muted-foreground mt-1">{plan.period} مجاناً</p>}
                </div>
                <div className="space-y-3 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-success shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                  {plan.locked.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground/50">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span className="line-through">{f}</span>
                    </div>
                  ))}
                </div>
                <Button className={`w-full mt-6 ${plan.popular ? 'gradient-bg text-primary-foreground border-0 glow-primary' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => navigate(plan.price === 'مجاني' ? '/register' : '/payment')}>
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">طرق الدفع المتاحة</h2>
            <p className="text-muted-foreground text-lg">ادفع بالطريقة الأنسب لك — التفعيل فوري بعد التأكيد</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {paymentMethods.map((m, i) => (
              <motion.div key={m.name} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card p-5 text-center hover:border-primary/30 transition-colors">
                <span className="text-4xl block mb-3">{m.icon}</span>
                <p className="font-bold text-sm">{m.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center glass-card p-12 relative overflow-hidden">
          <div className="absolute inset-0 gradient-bg opacity-5" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">جاهز لتطوير نشاطك؟</h2>
            <p className="text-muted-foreground text-lg mb-4">انضم لأكثر من 1000 نشاط تجاري يستخدم SmartPOS</p>
            <p className="text-sm text-muted-foreground mb-8">ابدأ بنسخة تجريبية مجانية لمدة 14 يوم — بدون بطاقة ائتمان</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gradient-bg text-primary-foreground border-0 text-lg px-10 py-6 glow-primary"
                onClick={() => navigate('/register')}>
                سجّل نشاطك الآن
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate('/payment')}>
                <CreditCard className="w-5 h-5 ml-2" /> عرض خطط الأسعار
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">SmartPOS</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2026 SmartPOS. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <button onClick={() => navigate('/login')} className="hover:text-foreground transition-colors">تسجيل الدخول</button>
            <button onClick={() => navigate('/payment')} className="hover:text-foreground transition-colors">الأسعار</button>
            <button onClick={() => navigate('/driver-login')} className="hover:text-foreground transition-colors">المندوبين</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
