import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wifi, WifiOff, QrCode, LayoutGrid, Shield, Zap, ArrowRight, Truck,
  Check, X, Star, CreditCard, Smartphone, Globe, BarChart3, Users, Clock, Receipt,
  Package, ShoppingCart, Warehouse, Pill, Store, Coffee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BUSINESS_TYPES } from '@/lib/businessTypes';

const features = [
  { icon: LayoutGrid, title: 'نظام ERP موديلار', desc: 'اختر الموديولات التي تناسب نشاطك فقط: مطاعم، مقاولات، محاماة، تجزئة، صيدليات، والمزيد.' },
  { icon: Zap, title: 'سرعة فائقة وأداء ذكي', desc: 'يعمل بدون إنترنت (Offline-First) مع مزامنة لحظية فور عودة الاتصال لضمان عدم توقف العمل.' },
  { icon: Shield, title: 'محاسبة احترافية', desc: 'نظام قيد مزدوج آلي، شجرة حسابات مرنة، تقارير أرباح وخسائر، وميزانية عمومية لحظية.' },
  { icon: Smartphone, title: 'تجربة مستخدم متميزة', desc: 'واجهات عصرية تدعم اللمس، الباركود، الطابعات الحرارية، وجميع أنواع الأجهزة.' },
  { icon: Globe, title: 'إدارة مركزية', desc: 'لوحة تحكم موحدة لإدارة جميع فروعك، مخازنك، وموظفيك من أي مكان في العالم.' },
  { icon: BarChart3, title: 'تحليلات ذكاء أعمال', desc: 'تقارير تفصيلية مدعومة بالذكاء الاصطناعي للتنبؤ بالمبيعات وتحسين كفاءة المخزون.' },
];

const sectors = [
  { icon: '🏗️', label: 'المقاولات والإنشاءات', desc: 'إدارة مستخلصات ومشاريع' },
  { icon: '🏠', label: 'العقارات والتأجير', desc: 'عقود وإدارة وحدات' },
  { icon: '⚖️', label: 'المحاماة والاستشارات', desc: 'قضايا ومواعيد وجلسات' },
  { icon: '🎨', label: 'التشطيبات والديكور', desc: 'مقايسات وتكاليف خامات' },
  { icon: '🚗', label: 'صيانة السيارات', desc: 'أوامر شغل وقطع غيار' },
  { icon: '🏥', label: 'الخدمات الطبية', desc: 'عيادات ومراكز متخصصة' },
];

const pricingPlans = [
  {
    name: 'البداية (Starter)',
    price: '199',
    period: 'ج.م / شهر',
    badge: 'للأنشطة الصغيرة',
    features: ['موديول واحد فقط', 'نظام POS أساسي', 'إدارة مخزون مبسطة', 'تقارير يومية', 'دعم فني عبر الشات'],
    locked: ['تعدد الموديولات', 'المحاسبة المتقدمة', 'إدارة الفروع'],
    cta: 'ابدأ الآن',
    popular: false,
    color: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    name: 'الاحترافية (Pro)',
    price: '499',
    period: 'ج.م / شهر',
    badge: 'الأكثر طلباً',
    features: ['حتى 3 موديولات مختارة', 'نظام محاسبي متكامل', 'إدارة مخزون متقدمة', 'تقارير مالية تفصيلية', 'إدارة العملاء والموردين', 'دعم فني هاتفى'],
    locked: ['تعدد الشركات'],
    cta: 'اشترك الآن',
    popular: true,
    color: 'from-purple-500/20 to-pink-500/20'
  },
  {
    name: 'المؤسسات (ERP)',
    price: '999',
    period: 'ج.م / شهر',
    badge: 'النظام الكامل',
    features: ['جميع الموديولات المتاحة', 'إدارة فروع وشركات متعددة', 'ذكاء أعمال BI', 'ربط API مخصص', 'مدير حساب مخصص', 'تدريب مباشر للفريق'],
    locked: [],
    cta: 'تواصل معنا',
    popular: false,
    color: 'from-amber-500/20 to-orange-500/20'
  },
];

const stats = [
  { value: '+1,500', label: 'نشاط تجاري' },
  { value: '18+', label: 'موديول ERP' },
  { value: '99.99%', label: 'وقت تشغيل' },
  { value: '24/7', label: 'دعم فني' },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30" dir="rtl">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      {/* Hero Section */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-md sticky top-0">
        <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl font-black tracking-tighter">Ventro<span className="text-primary">Pro</span></span>
          </div>
          <div className="flex gap-4 items-center">
            <Button variant="ghost" className="text-white/70 hover:text-white" onClick={() => navigate('/login')}>تسجيل الدخول</Button>
            <Button className="gradient-bg text-white border-0 px-6 font-bold rounded-xl shadow-lg shadow-primary/30" onClick={() => navigate('/register')}>
              تجربة مجانية
            </Button>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero Content */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
            <Badge className="bg-white/5 text-primary border-primary/20 px-4 py-1.5 rounded-full mb-8 backdrop-blur-xl">
              <Star className="w-3 h-3 ml-2 fill-primary" /> أول نظام ERP موديلار في الشرق الأوسط
            </Badge>
            <h1 className="font-display text-5xl md:text-8xl font-black mb-8 tracking-tight leading-[1.1]">
              حوّل نشاطك إلى
              <br />
              <span className="gradient-text bg-gradient-to-r from-primary via-purple-500 to-amber-500">مؤسسة ذكية</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
              Ventro Pro ليس مجرد برنامج كاشير، بل هو عقل مدبر لعملك. اختر الموديولات التي تحتاجها فقط وابدأ رحلة التحول الرقمي اليوم.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button size="lg" className="gradient-bg text-white border-0 text-xl px-10 py-8 rounded-2xl shadow-2xl shadow-primary/40 hover:scale-105 transition-transform font-bold"
                onClick={() => navigate('/register')}>
                ابدأ رحلتك مجاناً <ArrowRight className="w-6 h-6 mr-3" />
              </Button>
              <div className="flex -space-x-3 rtl:space-x-reverse">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050505] bg-secondary flex items-center justify-center text-[10px]">
                    User {i}
                  </div>
                ))}
                <div className="flex items-center mr-4 text-sm text-white/50">
                  <Check className="w-4 h-4 text-green-500 ml-1" /> موثوق من +1,500 شركة
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Modular Grid */}
        <section className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
              <div className="text-right">
                <h2 className="text-4xl md:text-5xl font-black mb-4">موديولات متخصصة <span className="text-primary">لكل قطاع</span></h2>
                <p className="text-white/50 text-xl">نظام يتشكل حسب احتياجاتك، وليس العكس.</p>
              </div>
              <Button variant="outline" className="border-white/10 hover:bg-white/5 text-lg px-8 py-6 rounded-xl">عرض جميع الموديولات (18+)</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sectors.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/50 transition-all overflow-hidden cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-5xl mb-6 block group-hover:scale-110 transition-transform">{s.icon}</span>
                  <h3 className="text-2xl font-bold mb-3">{s.label}</h3>
                  <p className="text-white/40 leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-white/[0.01] border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex flex-col gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">{f.title}</h3>
                <p className="text-white/50 leading-relaxed text-lg">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="py-32 max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6">استثمر في <span className="text-primary">مستقبل عملك</span></h2>
            <p className="text-white/50 text-xl">أسعار شفافة وعادلة، بدون رسوم خفية.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {pricingPlans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                className={`relative p-10 rounded-[2.5rem] border transition-all ${plan.popular ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/20 scale-105 z-10' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 gradient-bg text-white border-0 px-6 py-2 rounded-full text-sm font-bold">
                    الخيار الموصى به
                  </Badge>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white/60 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black tracking-tighter">{plan.price}</span>
                    <span className="text-white/40">{plan.period}</span>
                  </div>
                  <p className="text-primary font-medium mt-2">{plan.badge}</p>
                </div>
                
                <div className="space-y-4 mb-10">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-3 text-lg">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-white/80">{f}</span>
                    </div>
                  ))}
                  {plan.locked.map(f => (
                    <div key={f} className="flex items-center gap-3 text-lg opacity-30">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </div>
                      <span className="line-through">{f}</span>
                    </div>
                  ))}
                </div>

                <Button className={`w-full py-8 rounded-2xl text-xl font-bold transition-all ${plan.popular ? 'gradient-bg text-white shadow-xl shadow-primary/30' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => navigate('/register')}>
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto rounded-[3rem] p-16 relative overflow-hidden text-center border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent">
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">هل أنت مستعد للانتقال للمستوى التالي؟</h2>
              <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">انضم إلى آلاف الشركات الناجحة التي تعتمد على Ventro Pro يومياً لإدارة أعمالها.</p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button size="lg" className="gradient-bg text-white border-0 text-2xl px-12 py-10 rounded-[2rem] shadow-2xl shadow-primary/50 font-black"
                  onClick={() => navigate('/register')}>
                  ابدأ تجربتك المجانية الآن
                </Button>
              </div>
              <p className="mt-8 text-white/30">لا حاجة لبطاقة ائتمان • تفعيل فوري • دعم فني 24/7</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-12 text-right">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <span className="font-display text-3xl font-black tracking-tighter">Ventro<span className="text-primary">Pro</span></span>
            </div>
            <p className="text-white/40 text-lg leading-relaxed max-w-md">
              المنصة المتكاملة لإدارة الأعمال (Modular ERP) المصممة خصيصاً لتناسب طموح الشركات والمؤسسات العصرية في العالم العربي.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-xl mb-6">المنتج</h4>
            <ul className="space-y-4 text-white/50 text-lg">
              <li className="hover:text-primary cursor-pointer transition-colors">المميزات</li>
              <li className="hover:text-primary cursor-pointer transition-colors">الموديولات</li>
              <li className="hover:text-primary cursor-pointer transition-colors">الأسعار</li>
              <li className="hover:text-primary cursor-pointer transition-colors">قصص النجاح</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xl mb-6">الدعم</h4>
            <ul className="space-y-4 text-white/50 text-lg">
              <li className="hover:text-primary cursor-pointer transition-colors">مركز المساعدة</li>
              <li className="hover:text-primary cursor-pointer transition-colors">تواصل معنا</li>
              <li className="hover:text-primary cursor-pointer transition-colors">دخول المندوبين</li>
              <li className="hover:text-primary cursor-pointer transition-colors">سياسة الخصوصية</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-white/30 text-sm">
          <p>© 2026 Ventro Pro Cloud. جميع الحقوق محفوظة.</p>
          <div className="flex gap-6">
            <Globe className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
            <Smartphone className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
            <Shield className="w-5 h-5 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
