'use client';

import React from 'react';
import { useAuthGuard } from '@/lib/useAuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuthGuard({ redirectTo: '/login' });

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

  return <>{children}</>;
}
