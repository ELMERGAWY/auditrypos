import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, CheckCircle, Truck, Clock, MapPin, Phone, Share2, MessageCircle, Mail, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DeliveryMap = lazy(() => import('./dashboard/DeliveryMap'));

interface TrackingData {
  order: any;
  restaurant: any;
  agent: any;
  items: any[];
}

const STATUS_STEPS = [
  { key: 'pending', label: 'تم استلام الطلب', icon: Clock },
  { key: 'preparing', label: 'جاري التحضير', icon: Package },
  { key: 'ready', label: 'جاهز للتوصيل', icon: CheckCircle },
  { key: 'delivered', label: 'تم التوصيل', icon: Truck },
];

const TrackOrder = () => {
  const { token } = useParams();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      // Find order by tracking token
      const { data: order, error: err } = await supabase
        .from('orders')
        .select('*')
        .eq('tracking_token', token)
        .maybeSingle();

      if (err || !order) {
        setError('لم يتم العثور على الطلب');
        setLoading(false);
        return;
      }

      const [restRes, itemsRes, agentRes] = await Promise.all([
        supabase.from('restaurants_public').select('*').eq('id', order.restaurant_id).maybeSingle(),
        supabase.from('order_items').select('*').eq('order_id', order.id),
        order.delivery_agent_id
          ? supabase.from('delivery_agents_tracking').select('*').eq('id', order.delivery_agent_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setData({
        order,
        restaurant: restRes.data,
        agent: agentRes.data,
        items: itemsRes.data || [],
      });
      setLoading(false);
    };
    load();

    // Realtime updates
    const channel = supabase
      .channel(`track-${token}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.new.tracking_token === token) {
            setData(prev => prev ? { ...prev, order: payload.new } : prev);
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_agents' },
        (payload) => {
          setData(prev => {
            if (prev && prev.order.delivery_agent_id === payload.new.id) {
              return { ...prev, agent: payload.new };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [token]);

  const shareLink = `${window.location.origin}/track/${token}`;

  const shareWhatsApp = () => {
    const text = `تتبع طلبك من ${data?.restaurant?.name || 'المتجر'}:\n${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    const subject = `تتبع طلبك - ${data?.order?.order_number}`;
    const body = `يمكنك تتبع طلبك من هنا:\n${shareLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareSMS = () => {
    const text = `تتبع طلبك: ${shareLink}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('تم نسخ رابط التتبع');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground">جاري تحميل بيانات الطلب...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="glass-card p-8 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="font-display text-xl font-bold mb-2">لم يتم العثور على الطلب</h2>
          <p className="text-muted-foreground text-sm">تأكد من صحة رابط التتبع</p>
        </div>
      </div>
    );
  }

  const { order, restaurant, agent, items } = data;
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const isCompleted = order.status === 'completed' || order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';
  const currency = restaurant?.currency || 'ج.م';
  const hasAgentLocation = agent?.current_lat && agent?.current_lng;

  return (
    <div className="min-h-screen bg-background pb-8" dir="rtl">
      {/* Header */}
      <div className="bg-primary/10 border-b border-border p-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {restaurant?.logo_url ? (
            <img src={restaurant.logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-card" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="font-display text-lg font-bold">{restaurant?.name || 'المتجر'}</h1>
            <p className="text-sm text-muted-foreground">تتبع طلبك #{order.order_number?.slice(-4)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        {/* Status Timeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h2 className="font-display font-bold mb-4">حالة الطلب</h2>
          
          {isCancelled ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-3">
                <Package className="w-8 h-8 text-destructive" />
              </div>
              <p className="font-bold text-destructive text-lg">تم إلغاء الطلب</p>
            </div>
          ) : (
            <div className="space-y-4">
              {STATUS_STEPS.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: isCurrent ? 1.1 : 1 }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                        } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                        <StepIcon className="w-5 h-5" />
                      </motion.div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`w-0.5 h-8 mt-1 ${isActive ? 'bg-primary' : 'bg-border'}`} />
                      )}
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                      {isCurrent && !isCompleted && (
                        <p className="text-xs text-primary animate-pulse">الحالة الحالية</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Live Map */}
        {hasAgentLocation && !isCancelled && !isCompleted && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <h3 className="font-display font-bold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> موقع المندوب على الخريطة
            </h3>
            <Suspense fallback={<div className="h-64 bg-secondary rounded-xl animate-pulse" />}>
              <DeliveryMap
                agents={[agent]}
                deliveryOrders={order.delivery_lat ? [order] : []}
                pickingLocationFor={null}
                pickedLocation={null}
                onMapClick={() => {}}
                onConfirmLocation={() => {}}
                onCancelPick={() => {}}
              />
            </Suspense>
          </motion.div>
        )}

        {/* Order Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="font-display font-bold mb-3">تفاصيل الطلب</h3>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.menu_item_image} {item.menu_item_name} × {item.quantity}</span>
                <span className="font-bold">{(item.price * item.quantity).toFixed(0)} {currency}</span>
              </div>
            ))}
            <div className="flex justify-between font-display font-bold text-lg pt-3 border-t border-border">
              <span>الإجمالي</span>
              <span className="text-primary">{order.total} {currency}</span>
            </div>
          </div>
          {order.delivery_address && (
            <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {order.delivery_address}
            </div>
          )}
        </motion.div>

        {/* Share Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
          <h3 className="font-display font-bold mb-3 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" /> مشاركة رابط التتبع
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={shareWhatsApp} variant="outline" className="h-12">
              <MessageCircle className="w-4 h-4 ml-2 text-green-500" /> واتساب
            </Button>
            <Button onClick={shareSMS} variant="outline" className="h-12">
              <Phone className="w-4 h-4 ml-2 text-blue-500" /> رسالة SMS
            </Button>
            <Button onClick={shareEmail} variant="outline" className="h-12">
              <Mail className="w-4 h-4 ml-2 text-orange-500" /> بريد إلكتروني
            </Button>
            <Button onClick={copyLink} variant="outline" className="h-12">
              <Copy className="w-4 h-4 ml-2" /> نسخ الرابط
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrackOrder;
