import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Wifi, WifiOff, QrCode, LayoutGrid, Shield, Zap, ArrowRight, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: LayoutGrid, title: 'نظام POS ذكي', desc: 'واجهة شبكية سهلة مع سلة مشتريات وطباعة فواتير' },
  { icon: WifiOff, title: 'يعمل بدون إنترنت', desc: 'محرك متقدم يحفظ البيانات محلياً ويُزامن تلقائياً' },
  { icon: QrCode, title: 'قائمة QR', desc: 'قائمة طعام رقمية جميلة بتصميم متجاوب للموبايل' },
  { icon: Shield, title: 'نظام ترخيص آمن', desc: 'مفاتيح ترخيص مشفرة وإدارة اشتراكات متقدمة' },
  { icon: Zap, title: 'استدعاء الويتر', desc: 'نظام تنبيهات فورية عندما يطلب العميل الويتر' },
  { icon: ChefHat, title: 'لوحة تحكم شاملة', desc: 'إدارة كاملة للمطعم من مكان واحد' },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-10" />
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SmartResto</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/driver-login')}>
              <Truck className="w-4 h-4 ml-1" /> دخول المندوب
            </Button>
            <Button variant="ghost" onClick={() => navigate('/login')}>تسجيل الدخول</Button>
            <Button className="gradient-bg text-primary-foreground border-0" onClick={() => navigate('/register')}>
              ابدأ مجاناً
            </Button>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Wifi className="w-4 h-4" /> يعمل بدون إنترنت — Offline First
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              نظام إدارة المطاعم
              <br />
              <span className="gradient-text">الأذكى في المنطقة</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              SmartResto POS — نظام نقاط بيع متكامل مع قائمة QR رقمية، يعمل حتى بدون اتصال بالإنترنت
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gradient-bg text-primary-foreground border-0 text-lg px-8 py-6 glow-primary"
                onClick={() => navigate('/register')}
              >
                ابدأ الآن مجاناً <ArrowRight className="w-5 h-5 mr-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => navigate('/qr-menu/demo-1')}
              >
                شاهد القائمة التجريبية
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">كل ما تحتاجه في مكان واحد</h2>
          <p className="text-muted-foreground text-lg">أدوات متقدمة لإدارة مطعمك بكفاءة عالية</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center glass-card p-12 relative overflow-hidden">
          <div className="absolute inset-0 gradient-bg opacity-5" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">جاهز لتطوير مطعمك؟</h2>
            <p className="text-muted-foreground text-lg mb-8">انضم الآن وابدأ باستخدام SmartResto POS</p>
            <Button
              size="lg"
              className="gradient-bg text-primary-foreground border-0 text-lg px-10 py-6 glow-primary"
              onClick={() => navigate('/register')}
            >
              سجّل مطعمك الآن
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-muted-foreground text-sm">
        © 2026 SmartResto POS. جميع الحقوق محفوظة.
      </footer>
    </div>
  );
};

export default Index;
