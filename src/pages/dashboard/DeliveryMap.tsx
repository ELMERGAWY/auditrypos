import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import type { DeliveryAgent, Order, AgentStatus } from './types';
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

interface DeliveryMapProps {
  agents: DeliveryAgent[];
  deliveryOrders: Order[];
  pickingLocationFor: string | null;
  pickedLocation: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onConfirmLocation: () => void;
  onCancelPick: () => void;
}

export default function DeliveryMap({
  agents, deliveryOrders, pickingLocationFor, pickedLocation,
  onMapClick, onConfirmLocation, onCancelPick
}: DeliveryMapProps) {
  const agentsWithLocation = agents.filter(a => a.current_lat && a.current_lng);
  const mapCenter: [number, number] = agentsWithLocation[0]
    ? [agentsWithLocation[0].current_lat!, agentsWithLocation[0].current_lng!]
    : [30.0444, 31.2357];

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <p className="font-bold flex items-center gap-2">📍 خريطة المناديب</p>
        {pickingLocationFor && (
          <div className="flex gap-2 items-center">
            <p className="text-xs text-muted-foreground">انقر على الخريطة لتحديد الموقع</p>
            {pickedLocation && (
              <Button size="sm" onClick={onConfirmLocation} className="gradient-bg text-primary-foreground border-0">تأكيد</Button>
            )}
            <Button size="sm" variant="outline" onClick={onCancelPick}>إلغاء</Button>
          </div>
        )}
      </div>
      <div style={{ height: 350 }}>
        <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
          {pickingLocationFor && <MapClickHandler onLocationPick={onMapClick} />}
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
  );
}
