import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null); // Firebase doesn't have an explicit session object like Supabase
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setSession(currentUser ? { user: currentUser } : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Firebase auth doesn't store arbitrary metadata like Supabase easily in the same call.
      // We must write to the profiles collection manually here:
      await setDoc(doc(db, 'profiles', userCredential.user.uid), {
        user_id: userCredential.user.uid,
        full_name: fullName,
        priority: 'member',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const isAdminAcc = email.toLowerCase() === 'admin@admin.com';
      await setDoc(doc(db, 'user_roles', userCredential.user.uid), {
        user_id: userCredential.user.uid,
        role: isAdminAcc ? 'admin' : 'member',
        approved: isAdminAcc,
        created_at: new Date().toISOString()
      });
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return { user, session, loading, signIn, signUp, signOut };
}
