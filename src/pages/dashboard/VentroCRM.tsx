import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Target, Heart, MessageSquare, 
  TrendingUp, Star, Phone, Mail, MapPin, 
  Calendar, Search, Filter, MoreVertical,
  Award, Zap, History, ShoppingCart, 
  ArrowRight, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  restaurantId: string;
  currency: string;
}

export function VentroCRM({ restaurantId, currency }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'customers' | 'loyalty'>('overview');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCRMData();
  }, [restaurantId]);

  const loadCRMData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('total_spent', { ascending: false });
    
    if (data) setCustomers(data);
    setLoading(false);
  };

  return (
    <div className="flex h-full bg-background overflow-hidden" dir="rtl">
      {/* CRM Sub-Navigation */}
      <div className="w-64 border-l bg-card/30 backdrop-blur-md p-4 flex flex-col shrink-0 gap-2">
         <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-3 mb-4">نظام إدارة العملاء</h3>
         {[
           { id: 'overview', label: 'لوحة التحكم', icon: Target },
           { id: 'leads', label: 'العملاء المحتملين', icon: UserPlus },
           { id: 'customers', label: 'قاعدة العملاء', icon: Users },
           { id: 'loyalty', label: 'برامج الولاء', icon: Heart },
         ].map(item => (
           <button
             key={item.id}
             onClick={() => setActiveTab(item.id as any)}
             className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
               activeTab === item.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/5 text-muted-foreground'
             }`}
           >
             <item.icon className="w-4 h-4" /> {item.label}
           </button>
         ))}
      </div>

      {/* CRM Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-8 fade-in">
            <header>
               <h2 className="text-3xl font-black tracking-tight">نبض العملاء والنمو</h2>
               <p className="text-muted-foreground">راقب ولاء عملائك وحول التوقعات إلى مبيعات حقيقية</p>
            </header>

            {/* CRM Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="glass-card p-6 border-primary/20">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-4"><Users className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">إجمالي العملاء</p>
                  <h3 className="text-3xl font-black mt-1">{customers.length}</h3>
               </div>
               <div className="glass-card p-6 border-emerald-500/20">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit mb-4"><Heart className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">العملاء النشطون</p>
                  <h3 className="text-3xl font-black mt-1">{customers.filter(c => (c.total_spent || 0) > 1000).length}</h3>
               </div>
               <div className="glass-card p-6 border-amber-500/20">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit mb-4"><Star className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">إجمالي نقاط الولاء</p>
                  <h3 className="text-3xl font-black mt-1">12,450</h3>
               </div>
               <div className="glass-card p-6 border-blue-500/20">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 w-fit mb-4"><Zap className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">معدل التحويل</p>
                  <h3 className="text-3xl font-black mt-1">24%</h3>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Top Customers (VIPs) */}
               <div className="space-y-4">
                  <h3 className="font-bold text-xl flex items-center gap-2">🏆 عملاء القمة (VIP)</h3>
                  <div className="glass-card divide-y divide-border/30">
                     {customers.slice(0, 5).map((c, i) => (
                        <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg">
                                 {c.name?.[0] || 'U'}
                              </div>
                              <div>
                                 <p className="text-sm font-bold">{c.name}</p>
                                 <p className="text-[10px] text-muted-foreground">آخر طلب: منذ 3 أيام • {c.phone}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <Badge className="bg-amber-500/10 text-amber-500 border-0 mb-1">VIP Gold</Badge>
                              <p className="font-bold text-sm">{(c.total_spent || 0).toLocaleString()} {currency}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Retention Metrics */}
               <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative w-48 h-48">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-muted/20" />
                        <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray={552} strokeDashoffset={552 * (1 - 0.78)} className="text-primary" />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-primary">78%</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">معدل الاستبقاء</span>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <h4 className="font-bold text-lg">أداء متميز في الحفاظ على العملاء</h4>
                     <p className="text-sm text-muted-foreground max-w-xs">نسبة العملاء الذين عادوا للشراء مرة أخرى خلال هذا الشهر زادت بنسبة 12% عن الشهر الماضي.</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
               <div>
                  <h2 className="text-2xl font-black">قاعدة بيانات العملاء</h2>
                  <p className="text-sm text-muted-foreground">إدارة شاملة لبيانات العملاء، سلوكهم الشرائي، وتاريخ التواصل</p>
               </div>
               <div className="flex gap-2">
                  <Button variant="outline" className="gap-2"><Download className="w-4 h-4" /> تصدير</Button>
                  <Button className="gradient-bg text-primary-foreground border-0 gap-2"><UserPlus className="w-4 h-4" /> عميل جديد</Button>
               </div>
            </div>

            <div className="flex gap-4 mb-6">
               <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pr-10 bg-card border-border/50" placeholder="بحث باسم العميل، رقم الهاتف، أو كود الولاء..." />
               </div>
               <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" /> تصفية</Button>
            </div>

            <div className="glass-card overflow-hidden shadow-2xl">
               <table className="w-full text-right text-sm">
                  <thead className="bg-muted/50 border-b">
                     <tr>
                        <th className="p-4">العميل</th>
                        <th className="p-4">التصنيف</th>
                        <th className="p-4">إجمالي المشتريات</th>
                        <th className="p-4">النقاط</th>
                        <th className="p-4">آخر حركة</th>
                        <th className="p-4">الإجراءات</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                     {customers.map(c => (
                        <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                           <td className="p-4">
                              <div className="font-bold">{c.name}</div>
                              <div className="text-[10px] text-muted-foreground">{c.phone}</div>
                           </td>
                           <td className="p-4">
                              <Badge className={cn(
                                 "border-0",
                                 (c.total_spent || 0) > 5000 ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                              )}>
                                 {(c.total_spent || 0) > 5000 ? 'بلاتيني' : 'فضي'}
                              </Badge>
                           </td>
                           <td className="p-4 font-bold">{(c.total_spent || 0).toLocaleString()} {currency}</td>
                           <td className="p-4">
                              <div className="flex items-center gap-1 font-bold text-amber-500">
                                 <Star className="w-3 h-3 fill-current" /> {Math.floor((c.total_spent || 0) / 10)}
                              </div>
                           </td>
                           <td className="p-4 text-xs text-muted-foreground">منذ {Math.floor(Math.random() * 10) + 1} أيام</td>
                           <td className="p-4">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'loyalty' && (
          <div className="space-y-8 fade-in max-w-4xl mx-auto">
             <div className="text-center space-y-3 mb-12">
                <Award className="w-16 h-16 text-amber-500 mx-auto" />
                <h2 className="text-3xl font-black">مركز إدارة الولاء والمكافآت</h2>
                <p className="text-muted-foreground">صمم برامج تحفز عملائك على العودة دائماً</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-8 space-y-6 bg-gradient-to-br from-amber-500/5 to-transparent">
                   <h3 className="font-bold text-xl flex items-center gap-2 text-amber-600"><Zap className="w-5 h-5" /> برنامج النقاط النشط</h3>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl border border-amber-500/20">
                         <span className="text-sm font-medium">سعر النقطة عند الشراء</span>
                         <span className="font-bold">100 ج.م = 5 نقاط</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl border border-amber-500/20">
                         <span className="text-sm font-medium">قيمة استرداد النقطة</span>
                         <span className="font-bold">100 نقطة = 10 ج.م</span>
                      </div>
                      <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0 h-12 font-bold">تعديل قواعد النقاط</Button>
                   </div>
                </div>

                <div className="glass-card p-8 space-y-6">
                   <h3 className="font-bold text-xl flex items-center gap-2"><History className="w-5 h-5 text-primary" /> آخر استردادات النقاط</h3>
                   <div className="space-y-4">
                      {[1,2,3].map(i => (
                         <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border/30">
                            <div>
                               <p className="font-bold">أحمد علي</p>
                               <p className="text-[10px] text-muted-foreground">استبدال 500 نقطة بخصم مالي</p>
                            </div>
                            <span className="text-emerald-500 font-bold">-50 {currency}</span>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
