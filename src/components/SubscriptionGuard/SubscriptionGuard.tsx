'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/lib/useAuthGuard';

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, userDoc, loading } = useAuthGuard({ redirectTo: '/login' });
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('dealdeck_subscribed') === 'true';
      if (cached) setAllowed(true);
    }

    if (loading) return;
    if (!user || !userDoc) return;

    fetch(`/api/subscription?userId=${user.uid}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.subscription && (data.subscription.status === 'active' || data.subscription.status === 'canceling')) {
          setAllowed(true);
        } else {
          router.push('/pricing');
        }
      })
      .catch(() => {
        router.push('/pricing');
      });
  }, [user, userDoc, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5F5F5',
        fontFamily: '"Kumbh Sans", sans-serif',
      }}>
        <div style={{ fontSize: '14px', color: 'rgba(0,0,0,0.5)' }}>Loading...</div>
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
