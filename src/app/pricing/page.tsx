'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';

const BORDER = '#E6E1D6';
const TEXT_PRIMARY = '#191816';
const TEXT_SECONDARY = '#5C544E';
const TEXT_MUTED = '#8C827A';
const ACCENT_COLOR = '#D96B43';
const BG_COLOR = '#FAF8F5';
const CARD_BG = '#FFFFFF';
const HIGHLIGHT_BG = '#191816';

interface PriceTier {
  name: string;
  description: string;
  features: string[];
  priceId: string;
  formattedTotals: { total: string; subscription: { interval: string } };
  unitPrice: { amount: string; currencyCode: string };
}

const staticPrices: Record<string, PriceTier[]> = {
  month: [
    {
      name: 'Starter', description: 'For small teams getting started with SEO audits.',
      features: ['5 websites tracked', '300 AI prompts/month', 'All SEO features', '3 Answer Engines tracked', 'AEO-only mode'],
      priceId: 'pri_01kxesfv0q9wsv4xm3thwvc1m4',
      formattedTotals: { total: '$29', subscription: { interval: 'month' } },
      unitPrice: { amount: '29', currencyCode: 'USD' },
    },
    {
      name: 'Growth', description: 'For growing companies that need full visibility.',
      features: ['Unlimited websites tracked', '600 AI prompts/month', 'All SEO features', '5 Answer Engines tracked', 'Full AEO & GEO Audit', 'Daily AI Visibility recommendations'],
      priceId: 'pri_01kxesgv1w8s9wjmg3ar7k15y9',
      formattedTotals: { total: '$99', subscription: { interval: 'month' } },
      unitPrice: { amount: '99', currencyCode: 'USD' },
    },
    {
      name: 'Ultra', description: 'For large organizations with advanced needs.',
      features: ['Unlimited websites tracked', '1000 AI prompts/month', 'All SEO features', '8 Answer Engines tracked', 'Full AEO & GEO Audit', 'Daily AI Visibility recommendations', 'Dedicated Developer & Marketing Expert'],
      priceId: 'pri_01kxesj1905mxkv8yekp0yf5bp',
      formattedTotals: { total: '$199', subscription: { interval: 'month' } },
      unitPrice: { amount: '199', currencyCode: 'USD' },
    },
  ],
  year: [
    {
      name: 'Starter', description: 'For small teams getting started with SEO audits.',
      features: ['5 websites tracked', '300 AI prompts/month', 'All SEO features', '3 Answer Engines tracked', 'AEO-only mode'],
      priceId: 'pri_01kwzg87yb1127xkbdjt3szez6',
      formattedTotals: { total: '$278', subscription: { interval: 'year' } },
      unitPrice: { amount: '278', currencyCode: 'USD' },
    },
    {
      name: 'Growth', description: 'For growing companies that need full visibility.',
      features: ['Unlimited websites tracked', '600 AI prompts/month', 'All SEO features', '5 Answer Engines tracked', 'Full AEO & GEO Audit', 'Daily AI Visibility recommendations'],
      priceId: 'pri_01kwzg7ex4dwyjgrdthmdqt9ae',
      formattedTotals: { total: '$950', subscription: { interval: 'year' } },
      unitPrice: { amount: '950', currencyCode: 'USD' },
    },
    {
      name: 'Ultra', description: 'For large organizations with advanced needs.',
      features: ['Unlimited websites tracked', '1000 AI prompts/month', 'All SEO features', '8 Answer Engines tracked', 'Full AEO & GEO Audit', 'Daily AI Visibility recommendations', 'Dedicated Developer & Marketing Expert'],
      priceId: 'pri_01kx46z00r3w6d0v3cb5smpfz3',
      formattedTotals: { total: '$1,910', subscription: { interval: 'year' } },
      unitPrice: { amount: '1910', currencyCode: 'USD' },
    },
  ],
};

const planLevels: Record<string, number> = {
  'Free': 0,
  'Starter': 1,
  'Growth': 2,
  'Ultra': 3,
};

const UPGRADE_FEATURES: Record<string, Record<string, string>> = {
  'Websites tracked': { 'Free': '1', 'Starter': '5', 'Growth': 'Unlimited', 'Ultra': 'Unlimited' },
  'All SEO features': { 'Free': 'Yes', 'Starter': 'Yes', 'Growth': 'Yes', 'Ultra': 'Yes' },
  'AI prompts/month': { 'Free': '—', 'Starter': '300', 'Growth': '600', 'Ultra': '1000' },
  'Answer Engines tracked': { 'Free': '—', 'Starter': '3', 'Growth': '5', 'Ultra': '8' },
  'AEO & GEO availability': { 'Free': '—', 'Starter': 'AEO only', 'Growth': 'Full AEO + GEO', 'Ultra': 'Full AEO + GEO' },
  'Daily AI Visibility recommendations': { 'Free': '—', 'Starter': '—', 'Growth': 'Yes', 'Ultra': 'Yes' },
  'Dedicated Developer & Marketing Expert': { 'Free': '—', 'Starter': '—', 'Growth': '—', 'Ultra': 'Yes' },
};

const ENGINE_ICONS = [
  { src: '/ai-logo/chatgpt.png', name: 'ChatGPT' },
  { src: '/ai-logo/gemini.png', name: 'Gemini' },
  { src: '/ai-logo/claude.png', name: 'Claude' },
  { src: '/ai-logo/perplexity.png', name: 'Perplexity' },
  { src: '/ai-logo/deepseek.png', name: 'DeepSeek' },
  { src: '/ai-logo/grok.png', name: 'Grok' },
  { src: '/ai-logo/copilot.webp', name: 'Copilot' },
  { src: '/ai-logo/meta ai.png', name: 'Meta AI' },
];

export default function PricingPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<PriceTier[]>(staticPrices.month);
  const [loading, setLoading] = useState(false);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subDetails, setSubDetails] = useState<any>(null);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);

  // Single auth + subscription effect
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // Clean up any previous Firestore listener
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }

      if (u) {
        setUser(u);
        setUserEmail(u.email || '');

        // Step 1: Immediate Firestore read — resolves from cache if available
        getDoc(doc(db, 'users', u.uid)).then((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            console.log('[pricing] getDoc:', JSON.stringify({ subscribed: d.subscribed, plan: d.plan }));
            if (d.subscribed === true && d.plan && d.plan !== 'Free') {
              setCurrentPlan(d.plan);
            } else {
              setCurrentPlan('Free');
            }
          }
        }).catch((err) => {
          console.error('[pricing] getDoc error:', err);
        });

        // Step 2: Real-time listener for updates (when webhook overwrites later)
        firestoreUnsubRef.current = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (d.subscribed === true && d.plan && d.plan !== 'Free') {
              setCurrentPlan(d.plan);
            } else {
              setCurrentPlan('Free');
            }
          }
        }, (err) => {
          console.error('[pricing] onSnapshot error:', err);
        });

        fetch(`/api/subscription?userId=${u.uid}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.subscription && (data.subscription.status === 'active' || data.subscription.status === 'canceling')) {
              setCurrentPlan(data.subscription.plan_name);
              setSubDetails(data.subscription);
            }
          })
          .catch(() => {});
      } else {
        setUser(null);
        setCurrentPlan(null);
        setSubDetails(null);
      }
    });
    return () => {
      unsub();
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) {
      console.error('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is missing');
      return;
    }

    const isSandbox = token.startsWith('test_');
    initializePaddle({
      token,
      environment: isSandbox ? 'sandbox' : 'production',
    }).then((p) => {
      setPaddle(p);
    });
  }, []);

  const getButtonProps = (planName: string, onClickHandler?: () => void) => {
    const cardLevel = planLevels[planName] || 0;
    const activePlanName = currentPlan || 'Free';
    const activeLevel = planLevels[activePlanName] || 0;

    const buttonStyle = (isHighlighted: boolean, disabled: boolean): React.CSSProperties => ({
      width: '100%',
      padding: '13px',
      marginTop: '28px',
      fontSize: '13.5px',
      fontWeight: 450,
      fontFamily: 'inherit',
      color: disabled
        ? (isHighlighted ? 'rgba(255, 255, 255, 0.5)' : 'rgba(25, 24, 22, 0.38)')
        : (isHighlighted ? HIGHLIGHT_BG : '#FFFFFF'),
      background: disabled
        ? (isHighlighted ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 24, 22, 0.05)')
        : (isHighlighted ? '#FFFFFF' : ACCENT_COLOR),
      border: disabled ? `1px solid ${BORDER}` : 'none',
      borderRadius: '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.8 : 1,
      textAlign: 'center',
    });

    if (activeLevel === 0) {
      return {
        text: 'Get Started',
        disabled: false,
        onClick: onClickHandler,
        style: (isHighlighted: boolean) => buttonStyle(isHighlighted, false),
      };
    }

    if (activeLevel === cardLevel) {
      return {
        text: 'Current Plan',
        disabled: true,
        onClick: undefined,
        style: (isHighlighted: boolean) => buttonStyle(isHighlighted, true),
      };
    }

    if (activeLevel > cardLevel) {
      return {
        text: 'You can downgrade in your next billing cycle',
        disabled: true,
        onClick: undefined,
        style: (isHighlighted: boolean) => ({
          ...buttonStyle(isHighlighted, true),
          fontSize: '11px',
          padding: '14px 8px',
        }),
      };
    }

    return {
      text: 'Upgrade Plan',
      disabled: false,
      onClick: onClickHandler,
      style: (isHighlighted: boolean) => buttonStyle(isHighlighted, false),
    };
  };

  const getProrationInfo = (targetPlanName: string, targetPlanPrice: number) => {
    if (!subDetails || !currentPlan) return null;
    
    const activeLevel = planLevels[currentPlan] || 0;
    const targetLevel = planLevels[targetPlanName] || 0;
    
    if (activeLevel === 0 || targetLevel <= activeLevel) return null;
    
    const startsAt = subDetails.starts_at ? new Date(subDetails.starts_at) : null;
    const endsAt = subDetails.ends_at ? new Date(subDetails.ends_at) : null;
    if (!startsAt || !endsAt) return null;
    
    const now = new Date();
    const totalMs = endsAt.getTime() - startsAt.getTime();
    const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
    const remainingMs = endsAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60 * 24)));
    
    const isYearly = totalDays > 45;
    
    const priceMap: Record<string, number> = isYearly 
      ? { 'Starter': 278, 'Growth': 950, 'Ultra': 1910 }
      : { 'Starter': 29, 'Growth': 99, 'Ultra': 199 };
      
    const currentPrice = priceMap[currentPlan] || 0;
    if (currentPrice === 0) return null;
    
    const expectedMap: Record<string, number> = isYearly
      ? { 'Starter': 278, 'Growth': 950, 'Ultra': 1910 }
      : { 'Starter': 29, 'Growth': 99, 'Ultra': 199 };
    const expectedTargetPrice = expectedMap[targetPlanName] || targetPlanPrice;
    
    let normalizedTargetPrice = targetPlanPrice;
    if (targetPlanPrice >= expectedTargetPrice * 50) {
      normalizedTargetPrice = targetPlanPrice / 100;
    }
    
    const dailyRate = currentPrice / totalDays;
    const credit = Math.round(dailyRate * remainingDays * 100) / 100;
    const proratedPrice = Math.max(0, Math.round((normalizedTargetPrice - credit) * 100) / 100);
    
    return {
      credit,
      proratedPrice,
      remainingDays,
      currentPlanName: currentPlan,
    };
  };

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      console.error('User not logged in');
      return;
    }

    const PLAN_MAP: Record<string, string> = {
      'pri_01kwzg87yb1127xkbdjt3szez6': 'Starter',
      'pri_01kwzg7ex4dwyjgrdthmdqt9ae': 'Growth',
      'pri_01kx46z00r3w6d0v3cb5smpfz3': 'Ultra',
      // Live Production Price IDs
      'pri_01kxesfv0q9wsv4xm3thwvc1m4': 'Starter',
      'pri_01kxesgv1w8s9wjmg3ar7k15y9': 'Growth',
      'pri_01kxesj1905mxkv8yekp0yf5bp': 'Ultra',
    };
    const PRICES: Record<string, number> = {
      'pri_01kwzg87yb1127xkbdjt3szez6': 29,
      'pri_01kwzg7ex4dwyjgrdthmdqt9ae': 99,
      'pri_01kx46z00r3w6d0v3cb5smpfz3': 199,
      // Live Production Prices
      'pri_01kxesfv0q9wsv4xm3thwvc1m4': 29,
      'pri_01kxesgv1w8s9wjmg3ar7k15y9': 99,
      'pri_01kxesj1905mxkv8yekp0yf5bp': 199,
    };

    const planName = PLAN_MAP[priceId] || 'Plan';
    const amount = PRICES[priceId] || 0;
    const amountInCents = amount * 100;
    const now = new Date();
    const provisionalId = `provisional_${Date.now()}`;

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Save to localStorage
    localStorage.setItem('pendingPriceId', priceId);
    localStorage.setItem('pendingPlan', planName);
    localStorage.setItem('pendingAmount', String(amountInCents));
    localStorage.setItem('pendingDate', now.toISOString());
    localStorage.setItem('gc_provisional_id', provisionalId);
    localStorage.setItem('gc_provisional_plan', planName);
    localStorage.setItem('gc_provisional_amount', String(amountInCents));

    // Save to Firestore BEFORE opening Paddle checkout (provisional only)
    try {
      const userRef = doc(db, 'users', user.uid);
      const userTxnRef = doc(db, 'users', user.uid, 'transactions', provisionalId);
      const topTxnRef = doc(db, 'transactions', provisionalId);

      const data = {
        transaction_id: provisionalId,
        user_id: user.uid,
        customer_id: isLocalhost ? 'cust_local_dev' : '',
        subscription_id: isLocalhost ? 'sub_local_dev' : '',
        plan_name: planName,
        amount: amountInCents,
        currency: 'USD',
        card_brand: isLocalhost ? 'Visa' : '',
        card_last4: isLocalhost ? '4242' : '',
        card_expiry_month: isLocalhost ? 12 : 0,
        card_expiry_year: isLocalhost ? 2030 : 0,
        status: isLocalhost ? 'completed' : 'pending',
        saved_from_client: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      // Ensure user doc exists first
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || user.uid,
          displayName: '',
          createdAt: now.toISOString(),
        });
      }

      // Only save transaction records, NOT subscription status
      // Subscription will be activated by webhook after successful payment
      await Promise.all([
        setDoc(userTxnRef, data),
        setDoc(topTxnRef, data),
        setDoc(userRef, {
          latest_transaction_id: provisionalId,
          pending_plan: planName,
          pending_amount: amountInCents,
          updated_at: now.toISOString(),
        }, { merge: true }),
      ]);

      if (isLocalhost) {
        // Local development: activate subscription immediately
        let tokens = 10;
        const lowerPlan = planName ? planName.toLowerCase() : '';
        if (lowerPlan === 'starter') tokens = 300;
        else if (lowerPlan === 'growth') tokens = 600;
        else if (lowerPlan === 'ultra') tokens = 1000;

        await setDoc(userRef, {
          subscribed: true,
          plan: planName,
          tokens,
          pending_plan: null,
          pending_amount: null,
          updated_at: now.toISOString(),
        }, { merge: true });

        alert(`[Local Bypass] Successfully mock-purchased the ${planName} Plan!`);
        router.push('/welcome');
        return;
      }
    } catch (err) {
      console.error('[pricing] Failed to save provisional transaction:', err);
    }

    if (!paddle) {
      console.error('Paddle not initialized');
      // Clean up pending data if paddle fails
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          pending_plan: null,
          pending_amount: null,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to clean up pending data:', e);
      }
      return;
    }

    // Setup checkout close handler to clean up if user cancels
    const checkoutClosedHandler = (event: any) => {
      if (event.data.event === 'checkout.close') {
        // User closed checkout without completing - clean up pending data
        const cleanupFields: Record<string, any> = {
          pending_plan: null,
          pending_amount: null,
          updated_at: new Date().toISOString(),
        };

        // Revert latest_transaction_id if it's provisional
        getDoc(doc(db, 'users', user.uid)).then((snap) => {
          if (snap.exists()) {
            const currentTxId = snap.data().latest_transaction_id;
            if (currentTxId && currentTxId.startsWith('provisional_')) {
              cleanupFields.latest_transaction_id = null;
            }
            updateDoc(doc(db, 'users', user.uid), cleanupFields).catch((e) => console.error('Failed to clean up pending data:', e));
          }
        }).catch((e) => console.error('Failed to read user doc for cleanup:', e));

        // Clean up localStorage
        localStorage.removeItem('gc_provisional_id');
        localStorage.removeItem('gc_provisional_plan');
        localStorage.removeItem('gc_provisional_amount');
        localStorage.removeItem('pendingPriceId');
        localStorage.removeItem('pendingPlan');
        localStorage.removeItem('pendingAmount');
        localStorage.removeItem('pendingDate');

        // Remove event listener after cleanup
        window.removeEventListener('message', checkoutClosedHandler);
      }
    };

    window.addEventListener('message', checkoutClosedHandler);

    // Remove event listener after a timeout (cleanup safety)
    setTimeout(() => {
      window.removeEventListener('message', checkoutClosedHandler);
    }, 300000); // 5 minutes

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      settings: {
        displayMode: 'overlay',
        variant: 'one-page',
        theme: 'light',
        successUrl: `${window.location.origin}/welcome`,
      },
      ...(userEmail ? { customer: { email: userEmail } } : {}),
      customData: { userId: user.uid, email: userEmail },
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: '"Kumbh Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      fontWeight: 300,
      background: BG_COLOR,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '24px 32px', width: '100%' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Image src="/favicon/logo.png" alt="Grow Citable" width={28} height={28} style={{ borderRadius: '6px', objectFit: 'contain' }} />
          <span style={{ fontSize: '18px', fontWeight: 450, color: TEXT_PRIMARY, letterSpacing: '-0.3px' }}>Grow Citable</span>
        </Link>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '32px', padding: '0 20px' }}>
        <h1 className="pricingTitle" style={{
          fontSize: '38px',
          fontWeight: 500,
          color: TEXT_PRIMARY,
          marginBottom: '12px',
          letterSpacing: '-0.5px',
        }}>
          Simple & transparent pricing
        </h1>
        <p style={{
          fontSize: '15px',
          color: TEXT_SECONDARY,
          maxWidth: '520px',
          margin: '0 auto',
          lineHeight: '1.6',
        }}>
          Choose a plan that fits your business needs and budget. No hidden fees, no surprises—just straightforward pricing.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="pricingGrid">
        {/* Free Card */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: '12px',
          padding: '32px 28px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 450, color: TEXT_SECONDARY, marginBottom: '12px' }}>Free Plan</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: 500, color: TEXT_PRIMARY }}>$0</span>
            <span style={{ fontSize: '14px', color: TEXT_MUTED, marginLeft: '4px' }}>/forever</span>
          </div>
          <p style={{ fontSize: '13px', color: TEXT_SECONDARY, marginBottom: '28px', lineHeight: '1.5' }}>
            Get started with basic features.
          </p>
          <div style={{ fontSize: '13px', fontWeight: 450, color: TEXT_PRIMARY, marginBottom: '14px' }}>Features:</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {['1 website tracked', 'All SEO features', '1 language'].map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: TEXT_SECONDARY }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT_COLOR, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
          <div style={{ textAlign: 'center', marginTop: '12px', marginBottom: '12px' }}>
            <span onClick={() => document.getElementById('all-features')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: '12px', color: ACCENT_COLOR, cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}>
              View more
            </span>
          </div>
          {(() => {
            const handleFreeClick = async () => {
              if (user) {
                try {
                  const userRef = doc(db, 'users', user.uid);
                  await updateDoc(userRef, {
                    plan: 'Free',
                    subscribed: false,
                    tokens: 0,
                    updated_at: new Date().toISOString()
                  });
                  setCurrentPlan('Free');
                  alert('[Local Test] Reverted account to Free Tier');
                } catch (e) {
                  console.error('Failed to revert to Free plan:', e);
                }
              }
              const storedUserId = localStorage.getItem('gc_userId');
              if (storedUserId) {
                router.push('/dashboard');
              } else {
                router.push('/signup');
              }
            };
            const btnProps = getButtonProps('Free', handleFreeClick);
            return btnProps.disabled ? (
              <button disabled={true} style={btnProps.style(false)}>
                {btnProps.text}
              </button>
            ) : (
              <button onClick={handleFreeClick} style={btnProps.style(false)}>
                {btnProps.text}
              </button>
            );
          })()}
        </div>
        {/* Paid Tiers */}
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={{
              background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: '12px',
              padding: '32px 28px', width: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: '14px', color: TEXT_MUTED }}>Loading...</div>
            </div>
          ))
        ) : (
          tiers.map((tier, i) => {
            const isHighlighted = i === 1;
            return (
              <div key={tier.name} style={{
                background: isHighlighted ? HIGHLIGHT_BG : CARD_BG,
                border: isHighlighted ? 'none' : `1px solid ${BORDER}`,
                borderRadius: '12px',
                padding: '32px 28px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: isHighlighted ? '0 10px 30px rgba(25, 24, 22, 0.12)' : 'none',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: 450, color: isHighlighted ? TEXT_MUTED : TEXT_SECONDARY, marginBottom: '12px' }}>{tier.name} Plan</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 500, color: isHighlighted ? '#FFFFFF' : TEXT_PRIMARY }}>{tier.formattedTotals.total}</span>
                  <span style={{ fontSize: '14px', color: isHighlighted ? TEXT_MUTED : TEXT_MUTED, marginLeft: '4px' }}>
                    /{tier.formattedTotals.subscription?.interval === 'year' ? 'year' : 'month'}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: isHighlighted ? TEXT_MUTED : TEXT_SECONDARY, marginBottom: '28px', lineHeight: '1.5' }}>
                  {tier.description}
                </p>
                <div style={{ fontSize: '13px', fontWeight: 450, color: isHighlighted ? '#FFFFFF' : TEXT_PRIMARY, marginBottom: '14px' }}>Features:</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: isHighlighted ? '#D1D5DB' : TEXT_SECONDARY }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: isHighlighted ? '#FFFFFF' : ACCENT_COLOR, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div style={{ textAlign: 'center', marginTop: '12px', marginBottom: '12px' }}>
                  <span onClick={() => document.getElementById('all-features')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: '12px', color: isHighlighted ? '#D1D5DB' : ACCENT_COLOR, cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}>
                    View more
                  </span>
                </div>
                {(() => {
                  const proration = getProrationInfo(tier.name, parseFloat(tier.unitPrice.amount));
                  if (!proration) return null;
                  const currentName = proration.currentPlanName;
                  const targetName = tier.name;
                  return (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      background: isHighlighted ? 'rgba(255, 255, 255, 0.08)' : 'rgba(217, 107, 67, 0.06)',
                      border: isHighlighted ? '1px solid rgba(255, 255, 255, 0.15)' : `1px solid ${BORDER}`,
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      lineHeight: '1.4',
                      color: isHighlighted ? '#E5E7EB' : TEXT_SECONDARY,
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: isHighlighted ? '#FFFFFF' : TEXT_PRIMARY }}>
                        Upgrade from {currentName} to {targetName}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', fontSize: '11px' }}>
                        <div style={{ fontWeight: 500, color: isHighlighted ? '#D1D5DB' : TEXT_SECONDARY }}>Feature</div>
                        <div style={{ textAlign: 'center', color: isHighlighted ? '#9CA3AF' : TEXT_MUTED }}>{currentName}</div>
                        <div style={{ textAlign: 'center', fontWeight: 600, color: isHighlighted ? '#FFFFFF' : ACCENT_COLOR }}>{targetName}</div>
                        {Object.entries(UPGRADE_FEATURES).map(([feat, values]) => (
                          <React.Fragment key={feat}>
                            <div style={{ color: isHighlighted ? '#D1D5DB' : TEXT_SECONDARY }}>{feat}</div>
                            <div style={{ textAlign: 'center', color: isHighlighted ? '#9CA3AF' : TEXT_MUTED }}>{values[currentName] || '—'}</div>
                            <div style={{ textAlign: 'center', fontWeight: 600, color: isHighlighted ? '#FFFFFF' : ACCENT_COLOR }}>{values[targetName] || '—'}</div>
                          </React.Fragment>
                        ))}
                      </div>
                      <div style={{ borderTop: `1px solid ${isHighlighted ? 'rgba(255,255,255,0.1)' : BORDER}`, marginTop: '8px', paddingTop: '8px', textAlign: 'center' }}>
                        Upgrade today for just <strong style={{ color: isHighlighted ? '#FFFFFF' : 'var(--primary-blue)', fontWeight: 600 }}>${proration.proratedPrice.toFixed(2)}</strong>!
                        <div style={{ marginTop: '2px', opacity: 0.85 }}>
                          (We've applied a <strong>${proration.credit.toFixed(2)}</strong> credit for the {proration.remainingDays} days remaining)
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  const btnProps = getButtonProps(tier.name, () => handleSubscribe(tier.priceId));
                  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                  return (
                    <button
                      onClick={btnProps.onClick}
                      disabled={btnProps.disabled || (!isLocalhost && !paddle)}
                      style={btnProps.style(isHighlighted)}
                    >
                      {btnProps.text}
                    </button>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>

      {/* Comparison Table Section */}
      <div id="all-features" style={{
        maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 24px 80px',
      }}>
        <h2 className="pricingSubtitle" style={{
          fontSize: 28, fontWeight: 500, color: TEXT_PRIMARY,
          marginBottom: 8, letterSpacing: '-0.3px',
        }}>
          Compare features across all plans
        </h2>
        <p style={{ fontSize: 14, color: TEXT_SECONDARY, marginBottom: 32, lineHeight: 1.5 }}>
          Find the right fit for your business needs.
        </p>

        <div style={{
          overflowX: 'auto', borderRadius: 12,
          border: `1px solid ${BORDER}`, background: CARD_BG,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '16px 20px', fontWeight: 500, color: TEXT_SECONDARY, fontSize: 12, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Feature</th>
                <th style={{ textAlign: 'center', padding: '16px 20px', fontWeight: 500, color: TEXT_PRIMARY }}>Free</th>
                <th style={{ textAlign: 'center', padding: '16px 20px', fontWeight: 500, color: TEXT_PRIMARY }}>Starter</th>
                <th style={{ textAlign: 'center', padding: '16px 20px', fontWeight: 600, color: '#fff', background: HIGHLIGHT_BG }}>Growth</th>
                <th style={{ textAlign: 'center', padding: '16px 20px', fontWeight: 500, color: TEXT_PRIMARY }}>Ultra</th>
              </tr>
            </thead>
            <tbody>
              {[
                { category: 'Websites tracked', free: '1', starter: '5', growth: 'Unlimited', ultra: 'Unlimited' },
                { category: 'AI prompts/month', free: '—', starter: '300', growth: '600', ultra: '1000' },
                { category: 'All SEO features', free: 'Yes', starter: 'Yes', growth: 'Yes', ultra: 'Yes' },
                { type: 'engines', category: 'Answer Engine Insights', free: '—' },
                { category: 'Weekly email report', free: '—', starter: 'Yes', growth: 'Yes', ultra: 'Yes' },
                { category: 'AI Visibility tasks', free: '—', starter: 'Up to 5/day', growth: 'Up to 10/day', ultra: 'Up to 20/day' },
                { category: 'Languages', free: '1', starter: '1', growth: '1', ultra: 'Custom' },
                { category: 'AEO-only mode', free: '—', starter: 'Yes', growth: 'Full AEO + GEO', ultra: 'Full AEO + GEO' },
                { category: 'Domain Ranking', free: '—', starter: 'Yes', growth: 'Yes', ultra: 'Yes' },
                { category: 'Multi-country support (50+)', free: 'Yes', starter: 'Yes', growth: 'Yes', ultra: 'Yes' },
                { category: 'Detailed Reports & Export', free: 'Yes', starter: 'Yes', growth: 'Yes', ultra: 'Yes' },
                { category: 'Export JSON & CSV', free: 'Yes', starter: 'Yes', growth: 'Yes', ultra: 'Yes' },
                { category: 'All-time History', free: 'Yes', starter: 'Yes', growth: 'Yes', ultra: 'Yes' },
                { category: 'AI Agent', free: '—', starter: 'Yes', growth: 'Yes', ultra: 'Yes' },
                { category: 'Daily AI Visibility recommendations', free: '—', starter: '—', growth: 'Yes', ultra: 'Yes' },
                { category: 'Full AEO & GEO Audit', free: '—', starter: '—', growth: 'Yes', ultra: 'Yes' },
                { category: '24/7 Support', free: '—', starter: '—', growth: '—', ultra: 'Yes' },
                { category: 'Dedicated Developer & Marketing Expert', free: '—', starter: '—', growth: '—', ultra: 'Yes' },
              ].map((row: any, i) => {
                const isEven = i % 2 === 0;
                if (row.type === 'engines') {
                  const starterEngines = ENGINE_ICONS.slice(0, 3);
                  const growthEngines = ENGINE_ICONS.slice(0, 5);
                  const ultraEngines = ENGINE_ICONS.slice(0, 8);
                  const cellStyle = { padding: '14px 12px', textAlign: 'center', verticalAlign: 'top' } as const;
                  const iconStyle = { width: 24, height: 24, borderRadius: '4px', objectFit: 'contain' } as const;
                  return (
                    <tr key={row.category} style={{
                      borderBottom: `1px solid ${BORDER}`,
                      background: isEven ? '#FCFAF8' : CARD_BG,
                    }}>
                      <td style={{ padding: '14px 20px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{row.category}</div>
                      </td>
                      <td style={{ ...cellStyle, color: TEXT_SECONDARY, fontSize: 12.5 }}>{row.free}</td>
                      <td style={cellStyle}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {starterEngines.map((e) => (
                            <img key={e.name} src={e.src} alt={e.name} style={iconStyle} title={e.name} />
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>3 engines</div>
                      </td>
                      <td style={{ ...cellStyle, background: isEven ? 'rgba(25, 24, 22, 0.02)' : 'transparent' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {growthEngines.map((e) => (
                            <img key={e.name} src={e.src} alt={e.name} style={iconStyle} title={e.name} />
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>5 engines</div>
                      </td>
                      <td style={cellStyle}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {ultraEngines.map((e) => (
                            <img key={e.name} src={e.src} alt={e.name} style={iconStyle} title={e.name} />
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>8 engines</div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={row.category} style={{
                    borderBottom: i < 17 ? `1px solid ${BORDER}` : 'none',
                    background: isEven ? '#FCFAF8' : CARD_BG,
                  }}>
                    <td style={{ padding: '14px 20px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{row.category}</div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: TEXT_SECONDARY, fontSize: 12.5, lineHeight: 1.4, verticalAlign: 'top' }}>{row.free}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: TEXT_SECONDARY, fontSize: 12.5, lineHeight: 1.4, verticalAlign: 'top' }}>{row.starter}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: TEXT_SECONDARY, fontSize: 12.5, lineHeight: 1.4, verticalAlign: 'top', background: isEven ? 'rgba(25, 24, 22, 0.02)' : 'transparent' }}>{row.growth}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: TEXT_SECONDARY, fontSize: 12.5, lineHeight: 1.4, verticalAlign: 'top' }}>{row.ultra}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 16, textAlign: 'center' }}>
          All plans include core platform features. Ultra plan includes custom pricing and dedicated support.{' '}
          <Link href="/contact" style={{ color: ACCENT_COLOR, textDecoration: 'underline' }}>Contact us</Link> for details.
        </p>
      </div>

      {/* Footer */}
      <footer style={{
        background: "#000000",
        color: "#FFFFFF",
        padding: "80px 48px 32px 48px"
      }}>
        {/* Main Grid */}
        <div className="footer-grid" style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: "60px",
          marginBottom: "60px"
        }}>
          {/* Column 1: Brand */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Image src="/favicon/logo-white2.png" alt="Grow Citable" width={28} height={28} style={{ borderRadius: '6px', objectFit: 'contain' }} />
              <span style={{ fontSize: "1.15rem", fontWeight: 500, letterSpacing: "-0.02em" }}>Grow Citable</span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255, 255, 255, 0.35)", lineHeight: "1.6", margin: 0, maxWidth: "320px" }}>
              AI-powered SEO platform that helps you optimize, track, and grow your organic search presence.
            </p>
            <div style={{ display: "flex", gap: "14px", marginTop: "4px" }}>
              <a href="https://x.com/growcitable" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s", fontSize: "13px" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
                  <span>𝕏</span>
                </div>
              </a>
              <a href="https://linkedin.com/company/growcitable" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s", fontStyle: "italic", fontWeight: 500, fontSize: "13px", color: "rgba(255,255,255,0.5)" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
                  <span>in</span>
                </div>
              </a>
              <a href="https://instagram.com/growcitable" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
                  </svg>
                </div>
              </a>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h4 style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Platform</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Agents", href: "/agents" },
                { label: "Prompt Volumes", href: "/prompt-volumes" },
                { label: "Agent Analytics", href: "/agent-analytics" },
                { label: "Guides", href: "/guides" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.55)", cursor: "pointer", transition: "color 0.2s", textDecoration: "none" }}
                    onMouseOver={e => e.currentTarget.style.color = "white"}
                    onMouseOut={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)"}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Resources</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Resource Center", href: "/resource-center" },
                { label: "Help Center", href: "/help-center" },
                { label: "Blog", href: "/blog" },
                { label: "Grow Citable Index", href: "/grow-citable-index" },
                { label: "Research Hub", href: "/research-hub" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.55)", cursor: "pointer", transition: "color 0.2s", textDecoration: "none" }}
                    onMouseOver={e => e.currentTarget.style.color = "white"}
                    onMouseOut={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)"}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h4 style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Company</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Enterprise", href: "/enterprise" },
                { label: "Pricing", href: "/pricing" },
                { label: "Contact us", href: "/contact" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.55)", cursor: "pointer", transition: "color 0.2s", textDecoration: "none" }}
                    onMouseOver={e => e.currentTarget.style.color = "white"}
                    onMouseOut={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)"}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/rules" style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.55)", textDecoration: "none", transition: "color 0.2s", cursor: "pointer" }}
                  onMouseOver={e => e.currentTarget.style.color = "white"}
                  onMouseOut={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)"}>Rules & Policies</Link>
              </li>
              <li>
                <Link href="/ai-instructions" style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.55)", cursor: "pointer", transition: "color 0.2s", textDecoration: "none" }}
                  onMouseOver={e => e.currentTarget.style.color = "white"}
                  onMouseOut={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)"}>AI Instructions</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          paddingTop: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "rgba(255, 255, 255, 0.25)"
        }}>
          <span>© 2026 Grow Citable. All rights reserved.</span>
          <div style={{ display: "flex", gap: "24px" }}>
            <Link href="/rules" style={{ color: "inherit", textDecoration: "none" }}>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseOver={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}>Privacy Policy</span>
            </Link>
            <Link href="/rules" style={{ color: "inherit", textDecoration: "none" }}>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseOver={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}>Terms of Service</span>
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
