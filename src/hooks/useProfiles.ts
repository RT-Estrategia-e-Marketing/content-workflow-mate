import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export interface Profile {
  id: string; // The uid
  user_id: string; // same as id usually
  full_name: string;
  priority: string;
  job_title: string;
  avatar_url: string | null;
  created_at: string;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setProfiles([]);
        setLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        return;
      }

      const q = query(collection(db, 'profiles'), orderBy('created_at'));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
        setProfiles(data);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const refetch = useCallback(() => { }, []);

  return { profiles, loading, refetch };
}
