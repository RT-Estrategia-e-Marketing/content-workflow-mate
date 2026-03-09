import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { collection, query, where, limit, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'member';
  approved: boolean;
  created_at: string;
}

export function useUserRole() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [allRoles, setAllRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserRole(null);
      setAllRoles([]);
      setLoading(false);
      return;
    }

    const roleQuery = query(collection(db, 'user_roles'), where('user_id', '==', user.uid), limit(1));
    const unsubscribeRole = onSnapshot(roleQuery, (snapshot) => {
      if (!snapshot.empty) {
        setUserRole({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserRole);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    const allRolesQuery = query(collection(db, 'user_roles'), orderBy('created_at'));
    const unsubscribeAll = onSnapshot(allRolesQuery, (snapshot) => {
      const roles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserRole));
      setAllRoles(roles);
    });

    return () => {
      unsubscribeRole();
      unsubscribeAll();
    };
  }, [user]);

  // O Ghost Admin - Tem poder supremo mas não depende da tabela
  const isSuperUser = user?.email === 'admin@postflow.rodrigotempass.com.br';
  const isAdmin = isSuperUser || (userRole?.role === 'admin' && userRole?.approved);
  const isApproved = isSuperUser || (userRole?.approved ?? false);

  const approveUser = useCallback(async (userId: string, role: 'admin' | 'manager' | 'member') => {
    const roleDoc = allRoles.find(r => r.user_id === userId);
    if (roleDoc) {
      await updateDoc(doc(db, 'user_roles', roleDoc.id), { approved: true, role });
    }
  }, [allRoles]);

  const rejectUser = useCallback(async (userId: string) => {
    const roleDoc = allRoles.find(r => r.user_id === userId);
    if (roleDoc) {
      await deleteDoc(doc(db, 'user_roles', roleDoc.id));
    }
  }, [allRoles]);

  const refetch = useCallback(() => { }, []);

  return { userRole, allRoles, loading, isAdmin, isApproved, approveUser, rejectUser, refetch };
}
