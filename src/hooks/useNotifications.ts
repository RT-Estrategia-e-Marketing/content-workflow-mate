import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';

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

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      // Sort client side to avoid requiring composite indexes immediately
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  }, []);

  const markAsUnread = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: false });
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  }, [user, notifications]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'notifications', id));
  }, [user]);

  const deleteAllNotifications = useCallback(async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      batch.delete(doc(db, 'notifications', n.id));
    });
    await batch.commit();
  }, [user, notifications]);

  const createNotification = useCallback(async (data: {
    user_id: string;
    post_id: string;
    client_id: string;
    type: string;
    message: string;
  }) => {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      from_user_id: user?.uid || null,
      created_at: new Date().toISOString()
    });
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const refetch = useCallback(() => { }, []);

  return { notifications, loading, unreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification, deleteAllNotifications, createNotification, refetch };
}
