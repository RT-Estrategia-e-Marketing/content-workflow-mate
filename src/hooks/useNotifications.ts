import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const DISMISSED_NOTIFICATIONS_KEY = 'postflow_dismissed_notifications';
const NOTIFICATIONS_SYNC_KEY = 'postflow_notifications_sync';

const readDismissedNotifications = () => {
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeDismissedNotifications = (ids: string[]) => {
  localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(ids));
};

const notifyNotificationsChanged = () => {
  localStorage.setItem(NOTIFICATIONS_SYNC_KEY, Date.now().toString());
};

export interface Notification {
  id: string;
  user_id: string;
  from_user_id: string | null;
  post_id: string;
  client_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => readDismissedNotifications());

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications((data as unknown as Notification[]).filter(n => !dismissedIds.includes(n.id)));
    }
    setLoading(false);
  }, [user, dismissedIds]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    setNotifications(prev => prev.filter(n => !dismissedIds.includes(n.id)));
  }, [dismissedIds]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DISMISSED_NOTIFICATIONS_KEY) {
        setDismissedIds(readDismissedNotifications());
      }
      if (event.key === NOTIFICATIONS_SYNC_KEY) {
        fetchNotifications();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchNotifications]);

  const persistDismissed = useCallback((ids: string[]) => {
    const unique = Array.from(new Set(ids));
    setDismissedIds(unique);
    writeDismissedNotifications(unique);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    notifyNotificationsChanged();
  }, []);

  const markAsUnread = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: false } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    notifyNotificationsChanged();
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true } as any).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    notifyNotificationsChanged();
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);
    persistDismissed([...dismissedIds, id]);
    setNotifications(prev => prev.filter(n => n.id !== id));
    notifyNotificationsChanged();
  }, [user, dismissedIds, persistDismissed]);

  const deleteAllNotifications = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    persistDismissed([...dismissedIds, ...notifications.map(n => n.id)]);
    setNotifications([]);
    notifyNotificationsChanged();
  }, [user, notifications, dismissedIds, persistDismissed]);

  const createNotification = useCallback(async (data: {
    user_id: string;
    post_id: string;
    client_id: string;
    type: string;
    message: string;
  }) => {
    await supabase.from('notifications').insert({
      ...data,
      from_user_id: user?.id,
    } as any);
    notifyNotificationsChanged();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, loading, unreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification, deleteAllNotifications, createNotification, refetch: fetchNotifications };
}
