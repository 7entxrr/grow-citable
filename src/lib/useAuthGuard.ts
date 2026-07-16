'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export function useAuthGuard(options?: { redirectTo?: string }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(() => auth.currentUser);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const loggedIn = localStorage.getItem('dealdeck_logged_in') === 'true';
      if (auth.currentUser && loggedIn) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('dealdeck_logged_in');
        }
        router.push(options?.redirectTo || '/login');
        setLoading(false);
        return;
      }

      let cachedDoc: any = null;
      if (typeof window !== 'undefined') {
        try {
          const cached = sessionStorage.getItem(`dealdeck_userdoc_${firebaseUser.uid}`);
          if (cached) cachedDoc = JSON.parse(cached);
        } catch (e) {}
      }

      if (cachedDoc) {
        setUser(firebaseUser);
        setUserDoc(cachedDoc);
        setLoading(false);
      }

      try {
        const userDocRef = await getDoc(doc(db, 'users', firebaseUser.uid));

        if (!userDocRef.exists()) {
          console.warn('[authGuard] Firestore user doc missing for', firebaseUser.uid, '- signing out');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('dealdeck_logged_in');
          }
          await signOut(auth);
          router.push('/login');
          setLoading(false);
          return;
        }

        const docData = { id: userDocRef.id, ...userDocRef.data() };
        setUser(firebaseUser);
        setUserDoc(docData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dealdeck_logged_in', 'true');
          try {
            sessionStorage.setItem(`dealdeck_userdoc_${firebaseUser.uid}`, JSON.stringify(docData));
          } catch (e) {}
        }
        setLoading(false);
      } catch (err) {
        if (!cachedDoc) {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [router, options?.redirectTo]);

  return { user, userDoc, loading };
}
