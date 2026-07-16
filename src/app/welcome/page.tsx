'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CheckCircle, ArrowRight, CreditCard } from 'lucide-react';

interface TransactionData {
  transaction_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  card_brand: string;
  card_last4: string;
  card_expiry_month: number;
  card_expiry_year: number;
  customer_id?: string;
  created_at: any;
}

const PRICE_TO_PLAN: Record<string, string> = {
  'pri_01kwzg87yb1127xkbdjt3szez6': 'Starter',
  'pri_01kwzg7ex4dwyjgrdthmdqt9ae': 'Growth',
  'pri_01kx46z00r3w6d0v3cb5smpfz3': 'Ultra',
  // Live Production Price IDs
  'pri_01kxesfv0q9wsv4xm3thwvc1m4': 'Starter',
  'pri_01kxesgv1w8s9wjmg3ar7k15y9': 'Growth',
  'pri_01kxesj1905mxkv8yekp0yf5bp': 'Ultra',
};

function CardBrandIcon({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  if (b.includes('visa')) {
    return (
      <div style={{ width: 40, height: 26, background: '#1a1f71', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontStyle: 'italic', letterSpacing: '0.5px' }}>VISA</span>
      </div>
    );
  }
  if (b.includes('master')) {
    return (
      <div style={{ position: 'relative', width: 40, height: 26 }}>
        <div style={{ width: 18, height: 18, background: '#eb001b', borderRadius: '50%', position: 'absolute', left: 4, top: 4 }} />
        <div style={{ width: 18, height: 18, background: '#f79e1b', borderRadius: '50%', position: 'absolute', right: 4, top: 4, opacity: 0.85 }} />
      </div>
    );
  }
  return (
    <div style={{ width: 40, height: 26, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CreditCard size={14} style={{ color: '#999' }} />
    </div>
  );
}

function formatCents(cents: number | undefined | null): string {
  if (cents == null || cents === 0) return '—';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(timestamp: any): string {
  if (!timestamp) return '—';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })} | ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

async function waitForAuth(maxMs = 5000): Promise<any> {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((u) => {
      unsub();
      resolve(u);
    });
    setTimeout(() => {
      unsub();
      resolve(auth.currentUser);
    }, maxMs);
  });
}

export default function WelcomePage() {
  const [txn, setTxn] = useState<TransactionData | null>(null);
  const [upgraded, setUpgraded] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Read from localStorage first for instant display
      const localPlan = typeof window !== 'undefined' ? localStorage.getItem('gc_provisional_plan') || '' : '';
      const localAmount = typeof window !== 'undefined' ? Number(localStorage.getItem('gc_provisional_amount') || '0') : 0;
      const localTxnId = typeof window !== 'undefined' ? localStorage.getItem('gc_provisional_id') || '' : '';

      if (localTxnId && !cancelled) {
        setTxn({
          transaction_id: localTxnId,
          plan_name: localPlan,
          amount: localAmount,
          currency: 'USD',
          card_brand: '',
          card_last4: '',
          card_expiry_month: 0,
          card_expiry_year: 0,
          created_at: new Date().toISOString(),
        });
      }

      // Wait for Firebase Auth
      const user = await waitForAuth();
      if (cancelled) return;

      if (!user) {
        setError('Please log in to finalize your subscription.');
        setDone(true);
        return;
      }

      // Read from Firestore to get the saved provisional data
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && !cancelled) {
          const userData = userDoc.data();
          if (userData.subscribed === true && userData.plan && userData.plan !== 'Free') {
            const txnId = userData.latest_transaction_id;
            if (txnId) {
              const txDoc = await getDoc(doc(db, 'users', user.uid, 'transactions', txnId));
              if (txDoc.exists()) {
                setTxn(txDoc.data() as TransactionData);
              } else {
                setTxn({
                  transaction_id: txnId,
                  plan_name: userData.plan,
                  amount: userData.pending_amount || 0,
                  currency: 'USD',
                  card_brand: '',
                  card_last4: '',
                  card_expiry_month: 0,
                  card_expiry_year: 0,
                  created_at: userData.updated_at || new Date().toISOString(),
                });
              }
            }
            setUpgraded(true);
            setDone(true);
            return;
          }
        }
      } catch (err) {
        // Firestore failed — keep using localStorage data
      }

      // Try to fetch real transaction data from URL
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      // Support both transaction_id and _ptxn query parameters from Paddle
      const transactionId = params.get('transaction_id') || params.get('_ptxn') || '';

      if (transactionId) {
        try {
          const res = await fetch(`/api/transaction?transactionId=${transactionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.transactionId && !cancelled) {
              if (data.status === 'completed') {
                const realTxn = {
                  transaction_id: data.transactionId,
                  plan_name: data.priceId ? (PRICE_TO_PLAN[data.priceId] || localPlan) : localPlan,
                  amount: data.amount || localAmount,
                  currency: data.currency || 'USD',
                  card_brand: data.cardBrand || '',
                  card_last4: data.cardLast4 || '',
                  card_expiry_month: data.cardExpiryMonth || 0,
                  card_expiry_year: data.cardExpiryYear || 0,
                  customer_id: data.customerId || '',
                  created_at: new Date().toISOString(),
                };

                setTxn(realTxn);
                setUpgraded(true);

                // Update Firestore with real card details
                const provisionalId = localTxnId || `provisional_${Date.now()}`;
                const updates = {
                  transaction_id: data.transactionId,
                  customer_id: data.customerId || '',
                  subscription_id: data.subscriptionId || '',
                  card_brand: data.cardBrand || '',
                  card_last4: data.cardLast4 || '',
                  card_expiry_month: data.cardExpiryMonth || 0,
                  card_expiry_year: data.cardExpiryYear || 0,
                  status: data.status || 'completed',
                  updated_at: new Date().toISOString(),
                };
                let tokens = 10;
                const lowerPlan = realTxn.plan_name ? realTxn.plan_name.toLowerCase() : '';
                if (lowerPlan === 'starter') tokens = 300;
                else if (lowerPlan === 'growth') tokens = 600;
                else if (lowerPlan === 'ultra') tokens = 1000;

                await Promise.all([
                  setDoc(doc(db, 'users', user.uid, 'transactions', provisionalId), updates, { merge: true }),
                  setDoc(doc(db, 'transactions', provisionalId), updates, { merge: true }),
                  setDoc(doc(db, 'users', user.uid), {
                    plan: realTxn.plan_name,
                    subscribed: true,
                    latest_transaction_id: realTxn.transaction_id,
                    tokens,
                    updated_at: new Date().toISOString()
                  }, { merge: true }),
                ]);

                // Clean up provisional localStorage details
                localStorage.removeItem('gc_provisional_id');
                localStorage.removeItem('gc_provisional_plan');
                localStorage.removeItem('gc_provisional_amount');
                localStorage.removeItem('pendingPriceId');
                localStorage.removeItem('pendingPlan');
                localStorage.removeItem('pendingAmount');
                localStorage.removeItem('pendingDate');

                if (!cancelled) setDone(true);
                return;
              } else {
                setError(`Your transaction status is "${data.status}". Subscription is only activated for completed transactions.`);
                if (!cancelled) setDone(true);
                return;
              }
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            setError(errData.error || 'Failed to verify transaction with payment provider.');
            if (!cancelled) setDone(true);
            return;
          }
        } catch (err) {
          setError('An error occurred while verifying your payment.');
          if (!cancelled) setDone(true);
          return;
        }
      }

      // If we got here: we are not subscribed in Firestore, and there is no transaction ID in the URL.
      // That means no purchase actually took place or checkout was cancelled.
      if (!cancelled) {
        setError('No active transaction or verified subscription found. If you just purchased a plan, it may take a few moments to sync. Please try refreshing or contact support.');
        setDone(true);
      }
    };

    run();

    return () => { cancelled = true; };
  }, []);

  const txnId = txn?.transaction_id || '';
  const displayAmount = formatCents(txn?.amount);
  const planName = txn?.plan_name || 'Plan';
  const dateStr = txn?.created_at ? formatDateTime(txn.created_at) : '—';
  const currency = txn?.currency || 'USD';

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: '"Kumbh Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 420, width: '100%' }}>

        {/* Logo + Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Image src="/favicon/logo.png" alt="Grow Citable" width={40} height={40} style={{ objectFit: 'contain', marginBottom: 12 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a', margin: 0, letterSpacing: '-0.02em' }}>
            Grow Citable
          </h1>
        </div>

        {error ? (
          /* Error card */
          <div style={{
            background: '#fff', borderRadius: 20,
            border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: 40,
            textAlign: 'center'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 24,
              background: '#fef2f2', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>
              Subscription Status
            </h2>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.5, margin: '0 0 28px' }}>
              {error}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/pricing" style={{
                textDecoration: 'none',
                background: '#D96B43',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: 14,
                display: 'inline-block'
              }}>
                Return to Pricing
              </Link>
            </div>
          </div>
        ) : (
          /* Success card */
          <div style={{
            background: '#fff', borderRadius: 20,
            border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: 40,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 24,
              background: '#f0fdf4', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle size={24} style={{ color: '#22c55e' }} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', textAlign: 'center', margin: '0 0 4px' }}>
              Thank you
            </h2>
            <p style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 1.5, margin: '0 0 28px' }}>
              {done
                ? 'Your payment has been confirmed.'
                : 'Finalizing your subscription...'}
            </p>

            {done && <div style={{ borderTop: '1px dashed #e0e0e0', marginBottom: 24 }} />}

            {/* Transaction ID */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
                Transaction ID
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>
                {done ? txnId : 'Processing...'}
              </p>
            </div>

            {/* Amount + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
                  Amount
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                  {displayAmount}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
                  Date & Time
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                  {dateStr}
                </p>
              </div>
            </div>

            {/* Plan card */}
            <div style={{
              background: '#fafafa', borderRadius: 12,
              padding: '14px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#000', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{planName} Plan</p>
                <p style={{ fontSize: 12, color: '#22c55e', margin: '2px 0 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  Active subscription
                </p>
              </div>
            </div>

            {/* Card info */}
            {done && txn?.card_last4 && txn.card_last4 !== '****' && txn.card_last4 !== '' ? (
              <div style={{
                background: '#fafafa', borderRadius: 12,
                padding: '14px 16px', marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <CardBrandIcon brand={txn.card_brand} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                    {(txn.card_brand || 'Card').charAt(0).toUpperCase() + (txn.card_brand || 'Card').slice(1)} ending in {txn.card_last4}
                  </p>
                  {txn.card_expiry_month > 0 && (
                    <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                      Expiry: {String(txn.card_expiry_month).padStart(2, '0')}/{txn.card_expiry_year}
                    </p>
                  )}
                </div>
              </div>
            ) : done ? (
              <div style={{
                background: '#fafafa', borderRadius: 12,
                padding: '14px 16px', marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={18} style={{ color: '#22c55e' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Subscription active</p>
                </div>
              </div>
            ) : !done && (
              <div style={{
                background: '#fafafa', borderRadius: 12,
                padding: '14px 16px', marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={18} style={{ color: '#22c55e' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Subscription active</p>
                  <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                    Syncing with payment provider...
                  </p>
                </div>
              </div>
            )}

            <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', margin: 0 }}>
              Need help? <Link href="/contact" style={{ color: '#D96B43', textDecoration: 'underline' }}>Contact us</Link>
            </p>
          </div>
        )}

        {/* Dashboard CTA */}
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, color: '#1a1a1a', fontWeight: 600, fontSize: 14 }}>
            Go to Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
