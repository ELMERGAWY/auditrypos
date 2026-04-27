import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Package, Truck, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  order: Package,
  delivery: Truck,
  alert: AlertCircle,
  info: Info,
};

export function NotificationsTab({ restaurantId }: { restaurantId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(100);
    setNotifications((data || []) as unknown as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, [restaurantId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications-tab')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as unknown as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    for (const n of unread) {
      await supabase.from('notifications').update({ is_read: true } as any).eq('id', n.id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('تم تعيين الكل كمقروء');
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> الإشعارات
          {unreadCount > 0 && (
            <Badge className="gradient-bg text-primary-foreground">{unreadCount}</Badge>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAllRead}>
            <Check className="w-4 h-4 ml-1" /> تعيين الكل كمقروء
          </Button>
        )}
      </div>

      {loading && <p className="text-center text-muted-foreground py-12">جاري التحميل...</p>}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد إشعارات بعد</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map(n => {
          const Icon = TYPE_ICONS[n.type] || Bell;
          return (
            <div key={n.id} className={`glass-card p-4 flex items-start gap-3 transition-all ${!n.is_read ? 'border-primary/30 bg-primary/5' : ''}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-primary/20' : 'bg-secondary'}`}>
                <Icon className={`w-5 h-5 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleDateString('ar-EG')} — {new Date(n.created_at).toLocaleTimeString('ar-EG')}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {!n.is_read && (
                  <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)} title="تعيين كمقروء">
                    <Check className="w-3 h-3" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteNotification(n.id)} title="حذف">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
