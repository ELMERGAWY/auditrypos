import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Phone, MapPin, Navigation, Copy, Trash2, ExternalLink } from 'lucide-react';
import type { DeliveryAgent, Order, AgentStatus, AGENT_STATUS_CONFIG } from './types';
import { AGENT_STATUS_CONFIG as STATUS_CONF } from './types';

// Fix leaflet default icon issue with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const agentIcon = (status: AgentStatus) => L.divIcon({
  html: `<div style="background:${status === 'available' ? '#22c55e' : status === 'busy' ? '#f59e0b' : '#6b7280'};width:28px;height:28px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🛵</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: '',
});

const customerIcon = L.divIcon({
  html: `<div style="background:#ef4444;width:28px;height:28px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  className: '',
});

function MapClickHandler({ onLocationPick }: { onLocationPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onLocationPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

interface Props {
  restaurantId: string;
  agents: DeliveryAgent[];
  setAgents: (agents: DeliveryAgent[]) => void;
  deliveryOrders: Order[];
  onAssignAgent: (orderId: string, agentId: string) => void;
}

export function DeliveryTab({ restaurantId, agents, setAgents, deliveryOrders, onAssignAgent }: Props) {
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: '', phone: '' });
  const [pickingLocationFor, setPickingLocationFor] = useState<string | null>(null);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter] = useState<[number, number]>([30.0444, 31.2357]); // Cairo default

  const handleAddAgent = async () => {
    if (!agentForm.name) { toast.error('أدخل اسم المندوب'); return; }
    const { data, error } = await supabase.from('delivery_agents').insert({
      restaurant_id: restaurantId,
      name: agentForm.name,
      phone: agentForm.phone,
    }).select().single();
    if (error) { toast.error('خطأ في الإضافة'); return; }
    setAgents([...agents, data as unknown as DeliveryAgent]);
    setAgentForm({ name: '', phone: '' });
    setShowAddAgent(false);
    toast.success('تم إضافة المندوب');
  };

  const handleUpdateStatus = async (agent: DeliveryAgent, status: AgentStatus) => {
    await supabase.from('delivery_agents').update({ status }).eq('id', agent.id);
    setAgents(agents.map(a => a.id === agent.id ? { ...a, status } : a));
  };

  const handleDeleteAgent = async (id: string) => {
    await supabase.from('delivery_agents').delete().eq('id', id);
    setAgents(agents.filter(a => a.id !== id));
    toast.success('تم حذف المندوب');
  };

  const handleSetLocation = async (agentId: string, lat: number, lng: number) => {
    await supabase.from('delivery_agents').update({
      current_lat: lat,
      current_lng: lng,
      last_location_update: new Date().toISOString(),
    }).eq('id', agentId);
    setAgents(agents.map(a => a.id === agentId ? { ...a, current_lat: lat, current_lng: lng } : a));
    setPickingLocationFor(null);
    setPickedLocation(null);
    toast.success('تم تحديث موقع المندوب');
  };

  const handleMapClick = (lat: number, lng: number) => {
    setPickedLocation({ lat, lng });
  };

  const confirmPickedLocation = () => {
    if (pickingLocationFor && pickedLocation) {
      handleSetLocation(pickingLocationFor, pickedLocation.lat, pickedLocation.lng);
    }
  };

  const generateTrackingLink = async (orderId: string) => {
    const token = crypto.randomUUID();
    await supabase.from('orders').update({ tracking_token: token }).eq('id', orderId);
    const link = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ رابط التتبع! شاركه مع العميل');
  };

  const agentsWithLocation = agents.filter(a => a.current_lat && a.current_lng);
  const availableAgents = agents.filter(a => a.status === 'available');
  const busyAgents = agents.filter(a => a.status === 'busy');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">🛵 إدارة المناديب والتوصيل</h2>
        <Button onClick={() => setShowAddAgent(true)} className="gradient-bg text-primary-foreground border-0">
          <Plus className="w-4 h-4 ml-1" /> إضافة مندوب
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-success">{availableAgents.length}</p>
          <p className="text-xs text-muted-foreground">متاح</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-warning">{busyAgents.length}</p>
          <p className="text-xs text-muted-foreground">مشغول</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{deliveryOrders.length}</p>
          <p className="text-xs text-muted-foreground">طلبات توصيل</p>
        </div>
      </div>

      {/* Add Agent Form */}
      <AnimatePresence>
        {showAddAgent && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-bold">إضافة مندوب جديد</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الاسم</Label><Input value={agentForm.name} onChange={e => setAgentForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المندوب" /></div>
                <div><Label>رقم الهاتف</Label><Input value={agentForm.phone} onChange={e => setAgentForm(f => ({ ...f, phone: e.target.value }))} placeholder="01xxxxxxxxx" /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddAgent} className="gradient-bg text-primary-foreground border-0">إضافة</Button>
                <Button variant="outline" onClick={() => setShowAddAgent(false)}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map */}
      {(agentsWithLocation.length > 0 || pickingLocationFor) && (
        <div className="glass-card overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <p className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> خريطة المناديب</p>
            {pickingLocationFor && (
              <div className="flex gap-2 items-center">
                <p className="text-xs text-muted-foreground">انقر على الخريطة لتحديد الموقع</p>
                {pickedLocation && (
                  <Button size="sm" onClick={confirmPickedLocation} className="gradient-bg text-primary-foreground border-0">تأكيد</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setPickingLocationFor(null); setPickedLocation(null); }}>إلغاء</Button>
              </div>
            )}
          </div>
          <div style={{ height: 350 }}>
            <MapContainer center={agentsWithLocation[0] ? [agentsWithLocation[0].current_lat!, agentsWithLocation[0].current_lng!] : mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
              {pickingLocationFor && <MapClickHandler onLocationPick={handleMapClick} />}
              {pickedLocation && (
                <Marker position={[pickedLocation.lat, pickedLocation.lng]} icon={customerIcon}>
                  <Popup>موقع مختار</Popup>
                </Marker>
              )}
              {agentsWithLocation.map(agent => (
                <Marker key={agent.id} position={[agent.current_lat!, agent.current_lng!]} icon={agentIcon(agent.status)}>
                  <Popup>
                    <div className="text-sm font-bold">{agent.name}</div>
                    <div className="text-xs">{STATUS_CONF[agent.status].label}</div>
                    {agent.last_location_update && (
                      <div className="text-xs text-gray-500">آخر تحديث: {new Date(agent.last_location_update).toLocaleTimeString('ar-EG')}</div>
                    )}
                  </Popup>
                </Marker>
              ))}
              {deliveryOrders.filter(o => o.delivery_lat && o.delivery_lng).map(o => (
                <Marker key={o.id} position={[o.delivery_lat!, o.delivery_lng!]} icon={customerIcon}>
                  <Popup>
                    <div className="text-sm font-bold">طلب #{o.order_number.slice(-4)}</div>
                    <div className="text-xs">{o.customer_name} - {o.delivery_address}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className="space-y-3">
        <h3 className="font-bold">المناديب ({agents.length})</h3>
        {agents.length === 0 && <p className="text-muted-foreground text-center py-8">لا يوجد مناديب مسجلين</p>}
        {agents.map(agent => (
          <div key={agent.id} className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">🛵</div>
                <div>
                  <p className="font-bold">{agent.name}</p>
                  {agent.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{agent.phone}</p>}
                </div>
              </div>
              <Badge className={agent.status === 'available' ? 'status-active' : agent.status === 'busy' ? 'status-pending' : 'bg-secondary text-muted-foreground'}>
                {STATUS_CONF[agent.status].label}
              </Badge>
            </div>

            {agent.current_lat && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                <Navigation className="w-3 h-3" />
                آخر تحديث: {agent.last_location_update ? new Date(agent.last_location_update).toLocaleTimeString('ar-EG') : 'غير معروف'}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(['available', 'busy', 'offline'] as AgentStatus[]).map(s => (
                <Button key={s} size="sm" variant={agent.status === s ? 'default' : 'outline'}
                  className={agent.status === s ? 'gradient-bg text-primary-foreground border-0' : ''}
                  onClick={() => handleUpdateStatus(agent, s)}>
                  {STATUS_CONF[s].label}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPickingLocationFor(agent.id)} className="text-primary border-primary/30">
                <MapPin className="w-3 h-3 ml-1" /> {agent.current_lat ? 'تحديث موقع' : 'تحديد موقع'}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeleteAgent(agent.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Orders */}
      {deliveryOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold">طلبات التوصيل النشطة</h3>
          {deliveryOrders.map(order => {
            const assignedAgent = agents.find(a => a.id === order.delivery_agent_id);
            return (
              <div key={order.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold">#{order.order_number.slice(-4)}</span>
                    {order.customer_name && <span className="text-sm text-muted-foreground mr-2">{order.customer_name}</span>}
                  </div>
                  <span className="font-bold text-primary">{order.total} ج.م</span>
                </div>
                {order.delivery_address && <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{order.delivery_address}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {assignedAgent ? (
                    <Badge className="status-pending">🛵 {assignedAgent.name}</Badge>
                  ) : (
                    <select
                      className="text-xs bg-secondary border border-border rounded-lg px-2 py-1"
                      onChange={e => e.target.value && onAssignAgent(order.id, e.target.value)}
                      defaultValue="">
                      <option value="">تعيين مندوب...</option>
                      {availableAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                  <Button size="sm" variant="outline" className="text-primary" onClick={() => generateTrackingLink(order.id)}>
                    <Copy className="w-3 h-3 ml-1" /> نسخ رابط التتبع
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
