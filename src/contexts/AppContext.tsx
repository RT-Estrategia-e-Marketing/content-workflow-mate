import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

type AppDataType = ReturnType<typeof useAppData>;

interface WorkspaceContextType {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
}

type AppContextType = AppDataType & WorkspaceContextType;

const AppContext = createContext<AppContextType | null>(null);

function useWorkspaceState(clients: AppDataType['clients']): WorkspaceContextType {
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Listen to auth state to get userId
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsub;
  }, []);

  // Load workspace preference from Firebase when userId is known
  useEffect(() => {
    if (!userId) return;

    const prefRef = doc(db, 'user_preferences', userId);
    const unsub = onSnapshot(prefRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.active_workspace_id) {
          setActiveWorkspaceIdState(data.active_workspace_id);
        }
      }
    });

    return unsub;
  }, [userId]);

  // Auto-select first workspace if none selected and clients are loaded
  useEffect(() => {
    if (!activeWorkspaceId && clients.length > 0 && userId) {
      const firstId = clients[0].id;
      setActiveWorkspaceIdState(firstId);
      // Save to Firebase
      setDoc(doc(db, 'user_preferences', userId), {
        active_workspace_id: firstId,
      }, { merge: true }).catch(console.error);
    }
  }, [clients, activeWorkspaceId, userId]);

  const setActiveWorkspaceId = useCallback(async (id: string) => {
    setActiveWorkspaceIdState(id);
    if (!userId) return;
    await setDoc(doc(db, 'user_preferences', userId), {
      active_workspace_id: id,
    }, { merge: true });
  }, [userId]);

  return { activeWorkspaceId, setActiveWorkspaceId };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const data = useAppData();
  const workspace = useWorkspaceState(data.clients);

  return (
    <AppContext.Provider value={{ ...data, ...workspace }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
