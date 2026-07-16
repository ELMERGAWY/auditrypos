import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Gift, CheckCheck, ExternalLink, AlertCircle, Info, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  restaurant_id?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface Props {
  onViewCompany?: (id: string, name: string) => void;
  onNotificationsChange?: (notifications: AdminNotification[]) => void;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  free_signup: Gift,
  info: Info,
  alert: AlertCircle,
  upgrade: Zap,
};

const TYPE_COLORS: Record<string, string> = {
  free_signup: 'text-destructive bg-destructive/10',
  info: 'text-primary bg-primary/10',
  alert: 'text-warning bg-warning/10',
  upgrade: 'text-success bg-success/10',
};

export function AdminNotificationsPanel({ onViewCompany, onNotificationsChange }: Props) {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = i18n.language === 'ar' ? 'ar-EG' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';

  const load = async () => {
    const { data } = await supabase
      .from('admin_notifications' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    const notifs = (data || []) as AdminNotification[];
    setNotifications(notifs);
    onNotificationsChange?.(notifs);
    setLoading(false);
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel('admin-notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, (payload) => {
        const newNotif = payload.new as AdminNotification;
        setNotifications(prev => {
          const updated = [newNotif, ...prev];
          onNotificationsChange?.(updated);
          return updated;
        });
        toast.info(newNotif.title, { description: newNotif.body });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('admin_notifications' as any).update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success(t('superAdmin.markAllRead'));
  };

  const markRead = async (id: string) => {
    await supabase.from('admin_notifications' as any).update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold">{t('superAdmin.tabs.notifications')}</h2>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
            <CheckCheck className="w-4 h-4" />
            {t('superAdmin.markAllRead')}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground">{t('superAdmin.noNotifications')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const Icon = TYPE_ICONS[notif.type] || Bell;
            const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.info;
            return (
              <div
                key={notif.id}
                className={`glass-card p-4 rounded-xl flex items-start gap-4 transition-all cursor-pointer hover:border-primary/30 ${
                  !notif.is_read ? 'border-l-4 border-l-primary bg-primary/5' : 'opacity-70'
                }`}
                onClick={() => markRead(notif.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{notif.title}</p>
                    {!notif.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  {notif.body && <p className="text-xs text-muted-foreground">{notif.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(notif.created_at).toLocaleString(locale)}
                  </p>
                </div>
                {notif.restaurant_id && onViewCompany && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 gap-1 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewCompany(notif.restaurant_id!, notif.body || '');
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t('superAdmin.viewCompany')}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { AdminNotification };
