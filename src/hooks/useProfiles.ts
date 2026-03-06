import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  priority: string;
  job_title: string;
  avatar_url: string | null;
  created_at: string;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    // Only fetch if session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfiles();
    });
    return () => { subscription.unsubscribe(); };
  }, [fetchProfiles]);

  // Realtime subscription for profiles
  useEffect(() => {
    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchProfiles();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchProfiles]);

  return { profiles, loading, refetch: fetchProfiles };
}
