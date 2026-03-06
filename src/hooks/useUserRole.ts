import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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

  const fetchRole = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    if (data && data.length > 0) setUserRole(data[0] as unknown as UserRole);
    setLoading(false);
  }, [user]);

  const fetchAllRoles = useCallback(async () => {
    const { data } = await supabase.from('user_roles').select('*').order('created_at');
    if (data) setAllRoles(data as unknown as UserRole[]);
  }, []);

  useEffect(() => {
    fetchRole();
    fetchAllRoles();
  }, [fetchRole, fetchAllRoles]);

  // Realtime subscription for user_roles changes
  useEffect(() => {
    const channel = supabase
      .channel('user-roles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        fetchRole();
        fetchAllRoles();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRole, fetchAllRoles]);

  const isAdmin = userRole?.role === 'admin' && userRole?.approved;
  const isApproved = userRole?.approved ?? false;

  const approveUser = useCallback(async (userId: string, role: 'admin' | 'manager' | 'member') => {
    await supabase
      .from('user_roles')
      .update({ approved: true, role } as any)
      .eq('user_id', userId);
    fetchAllRoles();
  }, [fetchAllRoles]);

  const rejectUser = useCallback(async (userId: string) => {
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    fetchAllRoles();
  }, [fetchAllRoles]);

  return { userRole, allRoles, loading, isAdmin, isApproved, approveUser, rejectUser, refetch: fetchAllRoles };
}
