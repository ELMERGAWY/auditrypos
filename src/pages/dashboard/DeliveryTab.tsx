// @ts-nocheck
import { useState, lazy, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  Plus, Phone, MapPin, Navigation, Copy, Trash2, 
  Truck, Star, Clock, Activity, Search, 
  Filter, MoreHorizontal, UserCheck, Timer,
  ArrowUpRight, ShoppingBag
} from 'lucide-react';
import type { DeliveryAgent, Order, AgentStatus } from './types';
import { AGENT_STATUS_CONFIG as STATUS_CONF } from './types';

const DeliveryMap = lazy(() => import('./DeliveryMap'));

interface Props {
  restaurantId: string;
  agents: DeliveryAgent[];
  setAgents: (agents: DeliveryAgent[]) => void;
  deliveryOrders: Order[];
  onAssignAgent: (orderId: string, agentId: string) => void;
}

export function DeliveryTab({ restaurantId, agents, setAgents, deliveryOrders, onAssignAgent }: Props) {
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentForm, setAgentForm] = useState({ name: '', phone: '', vehicle_type: 'motorcycle' });
  const [pickingLocationFor, setPickingLocationFor] = useState<string | null>(null);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    return agents.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone?.includes(searchQuery)
    );
  }, [agents, searchQuery]);

  const handleAddAgent = async () => {
    if (!agentForm.name) { toast.error('أدخل اسم المندوب'); return; }
    const { data, error } = await supabase.from('delivery_agents').insert({
      restaurant_id: restaurantId, 
      name: agentForm.name, 
      phone: agentForm.phone,
      vehicle_type: agentForm.vehicle_type,
      status: 'available'
    }).select().single();
    
    if (error) { toast.error('خطأ في الإضافة'); return; }
    setAgents([...agents, data as unknown as DeliveryAgent]);
    setAgentForm({ name: '', phone: '', vehicle_type: 'motorcycle' });
    setShowAddAgent(false);
    toast.success('تم إضافة المندوب بنجاح');
  };

  const handleUpdateStatus = async (agent: DeliveryAgent, status: AgentStatus) => {
    await supabase.from('delivery_agents').update({ status }).eq('id', agent.id);
    setAgents(agents.map(a => a.id === agent.id ? { ...a, status } : a));
    toast.success(`تغيرت حالة المندوب إلى ${STATUS_CONF[status]?.label}`);
  };

  const handleDeleteAgent = async (id: string) => {
    const { error } = await supabase.from('delivery_agents').delete().eq('id', id);
    if (error) {
      toast.error('لا يمكن حذف المندوب لارتباطه بطلبات سابقة');
      return;
    }
    setAgents(agents.filter(a => a.id !== id));
    toast.success('تم حذف المندوب');
  };

  const generateTrackingLink = async (orderId: string, customerPhone?: string) => {
    const token = crypto.randomUUID();
    await supabase.from('orders').update({ tracking_token: token }).eq('id', orderId);
    const link = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ رابط التتبع!');
    
    if (customerPhone) {
      const phone = customerPhone.replace(/^0/, '20'); 
      const text = `تتبع طلبك من هنا:\n${link}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const agentsWithLocation = agents.filter(a => a.current_lat && a.current_lng);
  const availableAgents = agents.filter(a => a.status === 'available');
  const busyAgents = agents.filter(a => a.status === 'busy');

  return (
    <div className="p-6 space-y-8 fade-in" dir="rtl">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <div className="p-2 rounded-2xl gradient-bg text-white shadow-lg">
              <Truck className="w-6 h-6" />
            </div>
            إدارة أسطول المناديب والعمليات اللوجستية
          </h2>
          <p className="text-muted-foreground mt-1">تتبع المناديب، تعيين الطلبات، وتحليل كفاءة التوصيل في الوقت الفعلي.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2 rounded-xl"><Filter className="w-4 h-4" /> تصفية</Button>
           <Button onClick={() => setShowAddAgent(true)} className="gradient-bg text-white border-0 gap-2 rounded-xl shadow-lg hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" /> إضافة مندوب جديد
          </Button>
        </div>
      </header>

      {/* World-Class Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 glass-card border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">مناديب متاحين</p>
              <h3 className="text-3xl font-black mt-2">{availableAgents.length}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 glass-card border-amber-500/20 bg-amber-500/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">قيد التوصيل</p>
              <h3 className="text-3xl font-black mt-2">{busyAgents.length}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform">
              <Timer className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 glass-card border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">طلبات اليوم</p>
              <h3 className="text-3xl font-black mt-2">{deliveryOrders.length}</h3>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 glass-card border-purple-500/20 bg-purple-500/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">متوسط وقت التوصيل</p>
              <h3 className="text-3xl font-black mt-2">28 <span className="text-sm font-normal">دقيقة</span></h3>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Map & Add Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="ابحث عن مندوب بالاسم أو رقم الهاتف..." 
              className="pr-12 h-12 bg-card border-border/50 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="glass-card rounded-3xl overflow-hidden border-primary/10 shadow-xl min-h-[400px]">
            <Suspense fallback={<div className="h-[400px] flex items-center justify-center text-muted-foreground">جاري تحميل الخريطة التفاعلية...</div>}>
              <DeliveryMap
                agents={agents}
                deliveryOrders={deliveryOrders}
                pickingLocationFor={pickingLocationFor}
                pickedLocation={pickedLocation}
                onMapClick={(lat, lng) => setPickedLocation({ lat, lng })}
                onConfirmLocation={() => pickingLocationFor && pickedLocation && (async (id, lt, ln) => {
                  await supabase.from('delivery_agents').update({ current_lat: lt, current_lng: ln, last_location_update: new Date().toISOString() }).eq('id', id);
                  setAgents(agents.map(a => a.id === id ? { ...a, current_lat: lt, current_lng: ln } : a));
                  setPickingLocationFor(null); setPickedLocation(null);
                  toast.success('تم تحديث الموقع الجغرافي');
                })(pickingLocationFor, pickedLocation.lat, pickedLocation.lng)}
                onCancelPick={() => { setPickingLocationFor(null); setPickedLocation(null); }}
              />
            </Suspense>
          </div>
        </div>

        <aside className="space-y-6">
          <AnimatePresence>
            {showAddAgent && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <Card className="p-6 border-primary/20 shadow-2xl bg-gradient-to-br from-card to-secondary/20">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">إضافة عضو أسطول جديد</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddAgent(false)}><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">اسم المندوب</Label>
                      <Input value={agentForm.name} onChange={e => setAgentForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: أحمد محمد" className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">رقم الهاتف</Label>
                      <Input value={agentForm.phone} onChange={e => setAgentForm(f => ({ ...f, phone: e.target.value }))} placeholder="01xxxxxxxxx" className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">نوع المركبة</Label>
                      <select className="w-full h-10 bg-background border rounded-lg px-3 text-sm" value={agentForm.vehicle_type} onChange={e => setAgentForm(f => ({ ...f, vehicle_type: e.target.value }))}>
                        <option value="motorcycle">دراجة نارية 🏍️</option>
                        <option value="bicycle">دراجة هوائية 🚲</option>
                        <option value="car">سيارة 🚗</option>
                        <option value="van">فان / نقل 🚚</option>
                      </select>
                    </div>
                    <Button onClick={handleAddAgent} className="w-full gradient-bg text-white border-0 shadow-lg mt-2">تفعيل المندوب</Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            <h3 className="font-black text-sm flex items-center justify-between">
              قائمة المناديب ({filteredAgents.length})
              <Badge variant="outline" className="text-[10px]">{availableAgents.length} متاح</Badge>
            </h3>
            {filteredAgents.map(agent => (
              <div key={agent.id} className="glass-card p-4 hover:border-primary/50 transition-all group relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                      {agent.vehicle_type === 'car' ? '🚗' : agent.vehicle_type === 'van' ? '🚚' : '🛵'}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{agent.name}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-current" />
                        <span>4.8 (120 طلب)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`rounded-full px-3 text-[10px] border-0 ${agent.status === 'available' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      {STATUS_CONF[agent.status]?.label || agent.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {(['available', 'busy', 'offline'] as AgentStatus[]).map(s => (
                    <button key={s} onClick={() => handleUpdateStatus(agent, s)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${agent.status === s ? 'gradient-bg text-white border-0 shadow-md' : 'bg-secondary/50 text-muted-foreground hover:bg-muted'}`}>
                      {STATUS_CONF[s]?.label || s}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10 text-primary" onClick={() => setPickingLocationFor(agent.id)} title="تحديد الموقع">
                      <MapPin className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive" onClick={() => handleDeleteAgent(agent.id)} title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-lg">الملف الشخصي</Button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* World-Class Active Delivery Orders */}
      {deliveryOrders.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> رحلات التوصيل الجارية
            </h3>
            <Badge className="bg-primary/10 text-primary border-0">{deliveryOrders.length} طلب نشط</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveryOrders.map(order => {
              const assignedAgent = agents.find(a => a.id === order.delivery_agent_id);
              return (
                <div key={order.id} className="glass-card p-5 border-l-4 border-l-primary hover:shadow-2xl transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg">#{order.order_number.slice(-4)}</span>
                        <Badge variant="outline" className="text-[10px] h-5">جديد</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString('ar-EG')}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-primary">{order.total} {currency}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">{order.customer_name || 'عميل نقدي'}</p>
                        <p className="text-[10px] text-muted-foreground">{order.customer_phone || 'لا يوجد هاتف'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{order.delivery_address || 'استلام من الفرع'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    {assignedAgent ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white">🛵</div>
                        <div>
                          <p className="text-[10px] font-black">{assignedAgent.name}</p>
                          <p className="text-[8px] text-muted-foreground">قيد التوصيل...</p>
                        </div>
                      </div>
                    ) : (
                      <select 
                        className="text-[10px] font-bold bg-secondary border-0 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20"
                        onChange={e => e.target.value && onAssignAgent(order.id, e.target.value)} defaultValue=""
                      >
                        <option value="">تعيين مندوب فوري...</option>
                        {availableAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 px-3 text-[10px] gap-2 hover:bg-emerald-50 text-emerald-600" onClick={() => generateTrackingLink(order.id, order.customer_phone)}>
                      <Copy className="w-3 h-3" /> رابط التتبع
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
