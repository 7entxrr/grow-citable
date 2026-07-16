'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthGuard } from '@/lib/useAuthGuard';
import Sidebar from '@/components/Sidebar/Sidebar';
import styles from '../page.module.css';
import {
  Settings as SettingsIcon,
  Bell,
  CreditCard,
  Shield,
  User as UserIcon,
  X,
  AlertTriangle,
  ExternalLink,
  LogOut,
  Globe,
  Palette,
  Check,
  Copy,
} from 'lucide-react';

const tabs = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'security', label: 'Security & login', icon: Shield },
  { id: 'account', label: 'Account', icon: UserIcon },
];

// Claude-inspired warm minimalist design tokens
function formatCents(cents: number | undefined | null): string {
  if (cents == null || cents === 0) return '$0.00';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const BORDER = '#E6E1D6'; // Soft warm border
const TEXT_PRIMARY = '#191816'; // Deep warm charcoal
const TEXT_SECONDARY = '#5C544E'; // Muted warm brown
const TEXT_MUTED = '#8C827A'; // Lighter muted warm brown
const ACCENT_COLOR = '#D96B43'; // Claude warm clay/orange accent
const BG_HOVER = '#F3EFE9'; // Soft warm sand hover
const BG_COLOR = '#FAF8F5'; // Warm paper background
const CARD_BG = '#FFFFFF'; // Crisp card background

function TransactionDetailsModal({
  onClose,
  plan,
  amount,
  cardBrand,
  cardLast4,
  date,
  status,
  info,
  formatDate,
  transactionId,
  subscriptionId,
  customerId,
  currency,
}: {
  onClose: () => void;
  plan: string;
  amount: number;
  cardBrand?: string;
  cardLast4?: string;
  date: any;
  status: string;
  info: { billing: string; nextBilling: string | null; cancelAt: string | null; expiryMonth?: number; expiryYear?: number };
  formatDate: (t: any) => string;
  isLast: boolean;
  transactionId?: string;
  subscriptionId?: string;
  customerId?: string;
  currency?: string;
}) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const renderModalField = (label: string, value: string | undefined, copyable: boolean = false) => {
    if (!value) return null;
    const isCopied = copiedText === value;
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
      }}>
        <span style={{ color: TEXT_SECONDARY, fontSize: '12.5px', fontWeight: 400 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontWeight: 500,
            color: TEXT_PRIMARY,
            fontFamily: copyable ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit',
            fontSize: copyable ? '11.5px' : '13px',
          }}>
            {value}
          </span>
          {copyable && (
            <button
              onClick={() => handleCopy(value)}
              style={{
                fontSize: '10px',
                fontWeight: 500,
                color: isCopied ? '#059669' : ACCENT_COLOR,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 4px',
                borderRadius: '4px',
              }}
            >
              {isCopied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9, 10, 15, 0.15)',
      backdropFilter: 'blur(3px)',
      WebkitBackdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
    }}>
      <div style={{
        background: CARD_BG,
        borderRadius: '12px',
        width: '400px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(9, 10, 15, 0.08)',
        border: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: TEXT_PRIMARY }}>Receipt Details</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: TEXT_SECONDARY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Fields List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '24px' }}>
          {renderModalField('Plan', `${plan} Plan`)}
          {renderModalField('Total Paid', `${formatCents(amount)} ${currency || 'USD'}`)}
          {renderModalField('Transaction Date', formatDate(date))}
          {renderModalField('Status', status.toUpperCase())}
          {renderModalField('Billing Cycle', info.billing)}
          {renderModalField('Payment Method', cardBrand && cardLast4 ? `${cardBrand.toUpperCase()} •••• ${cardLast4} (Exp: ${info.expiryMonth}/${info.expiryYear})` : 'Paddle Processed')}
          {renderModalField(info.cancelAt ? 'Cancels On' : 'Next Billing Date', info.cancelAt || info.nextBilling || '—')}
          {renderModalField('Transaction ID', transactionId, true)}
          {renderModalField('Subscription ID', subscriptionId, true)}
          {renderModalField('Customer ID', customerId, true)}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#FFFFFF',
            background: '#090A0F',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          Close Details
        </button>

        {/* Report issue link */}
        <a
          href="/contact"
          style={{
            fontSize: '11px',
            color: ACCENT_COLOR,
            textAlign: 'center',
            marginTop: '12px',
            textDecoration: 'none',
            fontWeight: 400,
            transition: 'color 0.15s',
          }}
          onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          Report issue
        </a>
      </div>
    </div>
  );
}

function PaymentRow({ plan, amount, cardBrand, cardLast4, date, status, isCurrent, info, formatDate, isLast, transactionId, subscriptionId, customerId, currency }: {
  plan: string;
  amount: number;
  cardBrand?: string;
  cardLast4?: string;
  date: any;
  status: string;
  isCurrent: boolean;
  info: { billing: string; nextBilling: string | null; cancelAt: string | null; expiryMonth?: number; expiryYear?: number };
  formatDate: (t: any) => string;
  isLast: boolean;
  transactionId?: string;
  subscriptionId?: string;
  customerId?: string;
  currency?: string;
}) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div style={{ borderBottom: isLast ? 'none' : `1px solid ${BORDER}` }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '150px 80px 110px 100px 36px',
        padding: '14px 20px',
        fontSize: '13px',
        color: TEXT_PRIMARY,
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 500 }}>
          {plan} Plan
        </span>
        <span style={{ fontWeight: 400 }}>{formatCents(amount)}</span>
        <span style={{ color: TEXT_SECONDARY }}>{formatDate(date)}</span>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500,
            background: status === 'active' ? 'rgba(46, 196, 182, 0.08)' : 'rgba(255, 89, 89, 0.08)',
            color: status === 'active' ? '#0d9488' : '#e11d48',
          }}>
            {status === 'active' ? 'Active' : status === 'canceling' ? 'Canceling' : status}
          </span>
        </span>
        <button
          onClick={() => setShowInfo(true)}
          style={{
            width: 22,
            height: 22,
            borderRadius: '4px',
            border: `1px solid ${BORDER}`,
            background: '#fff',
            color: TEXT_SECONDARY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'inherit',
            padding: 0,
            transition: 'all 0.15s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = BG_HOVER;
            e.currentTarget.style.color = TEXT_PRIMARY;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.color = TEXT_SECONDARY;
          }}
        >
          i
        </button>
      </div>

      {showInfo && (
        <TransactionDetailsModal
          onClose={() => setShowInfo(false)}
          plan={plan}
          amount={amount}
          cardBrand={cardBrand}
          cardLast4={cardLast4}
          date={date}
          status={status}
          isLast={isLast}
          info={info}
          formatDate={formatDate}
          transactionId={transactionId}
          subscriptionId={subscriptionId}
          customerId={customerId}
          currency={currency}
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, userDoc, loading: authLoading } = useAuthGuard();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [txn, setTxn] = useState<any>(null);
  const [subDetails, setSubDetails] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  // States for general and notifications preferences
  const [accent, setAccent] = useState('blue');
  const [theme, setTheme] = useState('light');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [notifyMarketing, setNotifyMarketing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (authLoading || !user || !userDoc) return;

    setDisplayName(user.displayName || '');

    const loadData = async () => {
      try {
        if (userDoc.latest_transaction_id) {
          const txDoc = await getDoc(doc(db, 'users', user.uid, 'transactions', userDoc.latest_transaction_id));
          if (txDoc.exists()) setTxn(txDoc.data());
        }
        const paymentsQuery = query(
          collection(db, 'users', user.uid, 'transactions'),
          orderBy('created_at', 'desc')
        );
        const paymentsSnap = await getDocs(paymentsQuery);
        setPayments(paymentsSnap.docs.map(d => d.data()));

        try {
          const subRes = await fetch(`/api/subscription?userId=${user.uid}`);
          const subData = await subRes.json();
          if (subData.subscription) setSubDetails(subData.subscription);
        } catch {}
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, [user, userDoc, authLoading]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, 'users', user.uid), { displayName });
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handlePortal = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    }
    setPortalLoading(false);
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    setCancelLoading(true);
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        setSubDetails((prev: any) => ({
          ...prev,
          status: 'canceling',
          cancel_at: data.cancelAt,
        }));
        sessionStorage.removeItem(`dealdeck_userdoc_${user.uid}`);
        setShowCancelConfirm(false);
      }
    } catch (err) {
      console.error(err);
    }
    setCancelLoading(false);
  };

  const handleResumeSubscription = async () => {
    if (!user) return;
    setResumeLoading(true);
    try {
      const res = await fetch('/api/resume-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        setSubDetails((prev: any) => ({
          ...prev,
          status: 'active',
          cancel_at: null,
        }));
        sessionStorage.removeItem(`dealdeck_userdoc_${user.uid}`);
      }
    } catch (err) {
      console.error(err);
    }
    setResumeLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '—';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    background: CARD_BG,
    borderRadius: '8px',
    border: `1px solid ${BORDER}`,
    marginBottom: '12px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13.5px',
    fontWeight: 500,
    color: TEXT_PRIMARY,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '13px',
    color: TEXT_SECONDARY,
    fontWeight: 400,
  };

  const renderGeneral = () => (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 500, color: TEXT_PRIMARY, marginBottom: '4px' }}>General</h2>
      <p style={{ fontSize: '13px', color: TEXT_SECONDARY, marginBottom: '24px' }}>Manage workspace layout, themes, and language preferences.</p>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Palette size={16} style={{ color: TEXT_SECONDARY }} />
          <div>
            <span style={labelStyle}>Theme Appearance</span>
            <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '2px' }}>Toggle dark mode preferences</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.03)', padding: '2px', borderRadius: '6px' }}>
          {['light', 'dark', 'system'].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '4px',
                background: theme === t ? '#FFFFFF' : 'transparent',
                color: theme === t ? TEXT_PRIMARY : TEXT_SECONDARY,
                boxShadow: theme === t ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                textTransform: 'capitalize',
                transition: 'all 0.1s ease',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Palette size={16} style={{ color: TEXT_SECONDARY }} />
          <div>
            <span style={labelStyle}>Accent Color</span>
            <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '2px' }}>Personalize highlight details</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'blue', color: '#4B61EC' },
            { id: 'orange', color: '#C6613F' },
            { id: 'green', color: '#2EC4B6' },
            { id: 'purple', color: '#7C5CFF' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setAccent(item.id)}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: item.color,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                position: 'relative',
                transform: accent === item.id ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.15s',
              }}
            >
              {accent === item.id && <Check size={10} strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Globe size={16} style={{ color: TEXT_SECONDARY }} />
          <div>
            <span style={labelStyle}>Language</span>
            <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '2px' }}>Default display dialect</div>
          </div>
        </div>
        <span style={valueStyle}>English (US)</span>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 500, color: TEXT_PRIMARY, marginBottom: '4px' }}>Notifications</h2>
      <p style={{ fontSize: '13px', color: TEXT_SECONDARY, marginBottom: '24px' }}>Configure notification logs, alerts, and report emails.</p>

      {[
        { id: 'email', label: 'Email Notifications', desc: 'Receive updates about your audits via email', state: notifyEmail, setState: setNotifyEmail },
        { id: 'weekly', label: 'Weekly Reports', desc: 'Get a weekly summary of your site performance', state: notifyWeekly, setState: setNotifyWeekly },
        { id: 'marketing', label: 'Marketing Updates', desc: 'Receive tips, product updates, and inspiration', state: notifyMarketing, setState: setNotifyMarketing },
      ].map((item, i) => (
        <div key={item.id} style={cardStyle}>
          <div>
            <div style={labelStyle}>{item.label}</div>
            <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '2px' }}>{item.desc}</div>
          </div>
          <div
            onClick={() => {
              if (item.id === 'weekly' && (!userDoc?.plan || userDoc.plan.toLowerCase() === 'free')) {
                alert("Weekly email reports are not included in the Free tier. Please upgrade to a Starter, Growth, or Ultra subscription to enable weekly reports.");
                return;
              }
              item.setState(!item.state);
            }}
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              cursor: 'pointer',
              background: item.state ? ACCENT_COLOR : 'rgba(0, 0, 0, 0.08)',
              position: 'relative',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: 3,
              left: item.state ? 19 : 3,
              transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            }} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderBilling = () => (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 500, color: TEXT_PRIMARY, marginBottom: '4px' }}>Billing</h2>
      <p style={{ fontSize: '13px', color: TEXT_SECONDARY, marginBottom: '24px' }}>Manage subscription plan, details, history, and portal settings.</p>

      {/* Current Plan Card (Stripe-inspired Clean Minimalist Design) */}
      {txn ? (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: TEXT_MUTED, letterSpacing: '0.5px', marginBottom: '8px' }}>CURRENT SUBSCRIPTION</div>
          <div style={{
            padding: '20px 24px',
            background: CARD_BG,
            borderRadius: '8px',
            border: `1px solid ${BORDER}`,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 500, color: TEXT_PRIMARY }}>{txn.plan_name} Plan</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    background: 'rgba(75, 97, 236, 0.08)',
                    color: ACCENT_COLOR,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}>
                    Active
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: TEXT_SECONDARY, marginTop: '2px' }}>Billed monthly</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 500, color: TEXT_PRIMARY }}>{formatCents(txn.amount)}/mo</div>
                <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '1px' }}>charged automatically</div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1.2fr',
              gap: '12px',
              paddingTop: '16px',
              borderTop: `1px solid ${BORDER}`,
              fontSize: '12.5px',
            }}>
              <div>
                <div style={{ color: TEXT_MUTED, marginBottom: '2px' }}>Card Method</div>
                <div style={{ fontWeight: 450, color: TEXT_PRIMARY }}>
                  {(txn.card_brand || subDetails?.card_brand) ? `${(txn.card_brand || subDetails?.card_brand).charAt(0).toUpperCase() + (txn.card_brand || subDetails?.card_brand).slice(1)} •••• ${txn.card_last4 || subDetails?.card_last4}` : 'Paddle Processed'}
                </div>
              </div>
              <div>
                <div style={{ color: TEXT_MUTED, marginBottom: '2px' }}>Expiry</div>
                <div style={{ fontWeight: 450, color: TEXT_PRIMARY }}>
                  {(txn.card_expiry_month || subDetails?.card_expiry_month) ? `${txn.card_expiry_month || subDetails?.card_expiry_month}/${txn.card_expiry_year || subDetails?.card_expiry_year}` : '—'}
                </div>
              </div>
              <div>
                <div style={{ color: TEXT_MUTED, marginBottom: '2px' }}>
                  {subDetails?.cancel_at ? 'Cancels On' : 'Next Invoice'}
                </div>
                <div style={{ fontWeight: 450, color: subDetails?.cancel_at ? '#e11d48' : TEXT_PRIMARY }}>
                  {subDetails?.cancel_at ? (
                    formatDate(subDetails.cancel_at)
                  ) : subDetails?.next_billing ? (
                    formatDate(subDetails.next_billing)
                  ) : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
              {subDetails?.status === 'canceling' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: '#b45309',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                  }}>
                    Active until {formatDate(subDetails.cancel_at)}
                  </span>
                  <button
                    onClick={handleResumeSubscription}
                    disabled={resumeLoading}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#FFFFFF',
                      background: ACCENT_COLOR,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: resumeLoading ? 'not-allowed' : 'pointer',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseOver={(e) => { if (!resumeLoading) e.currentTarget.style.opacity = '0.9'; }}
                    onMouseOut={(e) => { if (!resumeLoading) e.currentTarget.style.opacity = '1'; }}
                  >
                    {resumeLoading ? 'Resuming...' : 'Resume Subscription'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: '#e11d48',
                    background: '#FFFFFF',
                    border: '1px solid rgba(255, 89, 89, 0.15)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 89, 89, 0.02)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  Cancel Plan
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '24px',
          background: CARD_BG,
          borderRadius: '8px',
          border: `1px solid ${BORDER}`,
          textAlign: 'center',
          marginBottom: '28px',
        }}>
          <p style={{ fontSize: '13.5px', color: TEXT_SECONDARY, marginBottom: '16px' }}>No active subscription.</p>
          <button
            onClick={() => router.push('/pricing')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#FFFFFF',
              background: ACCENT_COLOR,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            Choose Plan
          </button>
        </div>
      )}

      {/* Payment History List */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 500, color: TEXT_MUTED, letterSpacing: '0.5px', marginBottom: '8px' }}>PAYMENT HISTORY</div>
        {(() => {
          const allPayments: any[] = [];
          if (txn) {
            allPayments.push({
              transaction_id: txn.transaction_id || txn.transactionId || null,
              plan_name: txn.plan_name,
              amount: txn.amount,
              card_brand: txn.card_brand || subDetails?.card_brand,
              card_last4: txn.card_last4 || subDetails?.card_last4,
              created_at: txn.created_at,
              status: subDetails?.status === 'canceling' ? 'canceling' : 'active',
              _isCurrent: true,
            });
          }
          payments.forEach(p => allPayments.push({ ...p, _isCurrent: false }));
          allPayments.sort((a, b) => {
            const da = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at || 0).getTime();
            const db = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at || 0).getTime();
            return db - da;
          });

          // Deduplicate transactions by transaction_id
          const seen = new Set();
          const uniquePayments = allPayments.filter(p => {
            const id = p.transaction_id || (p._isCurrent && 'current');
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          });

          return uniquePayments.length > 0 ? (
            <div style={{
              border: `1px solid ${BORDER}`,
              borderRadius: '8px',
              overflow: 'hidden',
              background: CARD_BG,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '150px 80px 110px 100px 36px',
                padding: '10px 20px',
                background: 'rgba(0,0,0,0.01)',
                borderBottom: `1px solid ${BORDER}`,
                fontSize: '11px',
                fontWeight: 500,
                color: TEXT_MUTED,
                letterSpacing: '0.2px',
                alignItems: 'center',
              }}>
                <span>Plan</span>
                <span>Amount</span>
                <span>Date</span>
                <span>Status</span>
                <span></span>
              </div>
              {uniquePayments.map((p, i) => (
                <PaymentRow
                  key={i}
                  plan={p.plan_name}
                  amount={p.amount}
                  cardBrand={p.card_brand}
                  cardLast4={p.card_last4}
                  date={p.created_at}
                  status={p.status}
                  isCurrent={p._isCurrent}
                  transactionId={p.transaction_id}
                  subscriptionId={p.subscription_id}
                  customerId={p.customer_id}
                  currency={p.currency}
                  info={{
                    billing: p.billing_cycle || 'Monthly',
                    nextBilling: p._isCurrent && subDetails?.next_billing ? formatDate(subDetails.next_billing) : null,
                    cancelAt: p._isCurrent && subDetails?.cancel_at ? formatDate(subDetails.cancel_at) : null,
                    expiryMonth: p.card_expiry_month || (p._isCurrent && subDetails?.card_expiry_month),
                    expiryYear: p.card_expiry_year || (p._isCurrent && subDetails?.card_expiry_year),
                  }}
                  formatDate={formatDate}
                  isLast={i === uniquePayments.length - 1}
                />
              ))}
            </div>
          ) : (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              background: CARD_BG,
              borderRadius: '8px',
              border: `1px solid ${BORDER}`,
              fontSize: '13px',
              color: TEXT_MUTED,
            }}>
              No payment logs found.
            </div>
          );
        })()}
      </div>
    </div>
  );

  const renderAccount = () => (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 500, color: TEXT_PRIMARY, marginBottom: '4px' }}>Account</h2>
      <p style={{ fontSize: '13px', color: TEXT_SECONDARY, marginBottom: '24px' }}>Manage personal display name, authentication email, and account settings.</p>

      {/* User Info Overview card */}
      <div style={{
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.01)',
        borderRadius: '8px',
        border: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: user?.photoURL ? `url(${user.photoURL})` : 'linear-gradient(135deg, #4B61EC, #7C5CFF)',
          backgroundSize: 'cover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 500,
        }}>
          {!user?.photoURL && (user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?')}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: TEXT_PRIMARY }}>{user?.displayName || 'Set Display Name'}</div>
          <div style={{ fontSize: '12px', color: TEXT_SECONDARY, marginTop: '1px' }}>@{user?.email?.split('@')[0]}</div>
        </div>
      </div>

      <div style={{ ...cardStyle, flexDirection: 'column', alignItems: 'stretch', gap: '14px', padding: '18px' }}>
        <div>
          <span style={labelStyle}>Update Display Name</span>
          <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '2px' }}>Enter your full name for audits & workspace details</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '13px',
              border: `1px solid ${BORDER}`,
              borderRadius: '6px',
              outline: 'none',
              fontFamily: 'inherit',
              background: CARD_BG,
              color: TEXT_PRIMARY,
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'}
            onBlur={(e) => e.currentTarget.style.borderColor = BORDER}
          />
          <button
            onClick={handleSave}
            disabled={saving || displayName === (user?.displayName || '')}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#FFFFFF',
              background: ACCENT_COLOR,
              border: 'none',
              borderRadius: '6px',
              cursor: (saving || displayName === (user?.displayName || '')) ? 'not-allowed' : 'pointer',
              opacity: (saving || displayName === (user?.displayName || '')) ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <UserIcon size={16} style={{ color: TEXT_SECONDARY }} />
          <div>
            <span style={labelStyle}>Linked Email</span>
            <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '2px' }}>Primary notification and account login address</div>
          </div>
        </div>
        <span style={valueStyle}>{user?.email || '—'}</span>
      </div>

      {/* Danger Zone Card */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        background: 'rgba(255, 89, 89, 0.02)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 89, 89, 0.1)',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#DC2626', letterSpacing: '0.5px', marginBottom: '14px' }}>DANGER ZONE</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ ...labelStyle, color: '#090A0F' }}>Close Account</div>
            <div style={{ fontSize: '12px', color: TEXT_SECONDARY, marginTop: '2px' }}>Permanently erase display profile and logs.</div>
          </div>
          <button
            style={{
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: 500,
              color: '#DC2626',
              background: CARD_BG,
              border: '1px solid rgba(255, 89, 89, 0.2)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 89, 89, 0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
          >
            Delete Account
          </button>
        </div>

        <div style={{ borderTop: `1px dashed rgba(255, 89, 89, 0.1)`, paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={labelStyle}>Log out of workspace</div>
            <div style={{ fontSize: '12px', color: TEXT_SECONDARY, marginTop: '2px' }}>Sign out of current active session.</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: 500,
              color: '#FFFFFF',
              background: '#DC2626',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            <LogOut size={12} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 500, color: TEXT_PRIMARY, marginBottom: '4px' }}>Security</h2>
      <p style={{ fontSize: '13px', color: TEXT_SECONDARY, marginBottom: '24px' }}>Manage workspace security parameters, sessions, and credentials.</p>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={16} style={{ color: TEXT_SECONDARY }} />
          <div>
            <span style={labelStyle}>Password Security</span>
            <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '2px' }}>Update or set account login credentials</div>
          </div>
        </div>
        <button
          style={{
            padding: '6px 12px',
            fontSize: '12.5px',
            fontWeight: 500,
            color: TEXT_PRIMARY,
            background: '#FFFFFF',
            border: `1px solid ${BORDER}`,
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = BG_HOVER}
          onMouseOut={(e) => e.currentTarget.style.background = '#FFFFFF'}
        >
          Reset Password
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneral();
      case 'notifications': return renderNotifications();
      case 'billing': return renderBilling();
      case 'account': return renderAccount();
      case 'security': return renderSecurity();
      default: return renderGeneral();
    }
  };

  return (
    <div className={styles.dashboardContainer} style={{ background: 'transparent' }}>
      <style>{`
        @media (max-width: 768px) {
          .settings-modal-overlay {
            padding: 0 !important;
            align-items: flex-end !important;
          }
          .settings-modal-inner {
            width: 100vw !important;
            max-width: 100vw !important;
            max-height: 92vh !important;
            height: auto !important;
            min-height: 70vh !important;
            border-radius: 16px 16px 0 0 !important;
            flex-direction: column !important;
          }
          .settings-nav-sidebar {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
            padding: 12px 10px !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 8px !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .settings-close-btn {
            margin-bottom: 0 !important;
            flex-shrink: 0 !important;
          }
          .settings-tabs-list {
            flex-direction: row !important;
            gap: 4px !important;
            flex: 1 !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 2px 0 !important;
          }
          .settings-tab-btn {
            white-space: nowrap !important;
            font-size: 12px !important;
            padding: 6px 10px !important;
            width: auto !important;
          }
          .settings-content-area {
            padding: 20px 16px !important;
            flex: 1 !important;
            overflow-y: auto !important;
          }
          .settings-content-area div[style*="grid-template-columns"][style*="150px"] {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            padding: 10px 14px !important;
          }
          .settings-content-area div[style*="grid-template-columns"][style*="1fr 1fr 1.2fr"] {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
        @media (max-width: 640px) {
          .settings-content-area {
            padding: 16px 12px !important;
          }
          .settings-modal-inner {
            max-height: 95vh !important;
            min-height: 80vh !important;
          }
          .settings-content-area div[style*="grid-template-columns"][style*="150px"] {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
            padding: 8px 12px !important;
          }
          .settings-content-area div[style*="grid-template-columns"][style*="1fr 1fr 1.2fr"] {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
        }
        @media (max-width: 480px) {
          .settings-content-area {
            padding: 12px 10px !important;
          }
        }
      `}</style>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper} />
      </main>

      <div className="anthropic-theme settings-modal-overlay" style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9, 10, 15, 0.20)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div className="settings-modal-inner" style={{
          background: BG_COLOR,
          borderRadius: '12px',
          width: '840px',
          maxWidth: '92vw',
          height: '580px',
          maxHeight: '85vh',
          display: 'flex',
          overflow: 'hidden',
          border: `1px solid ${BORDER}`,
          boxShadow: '0 20px 50px rgba(25, 24, 22, 0.08)',
        }}>
          {/* Left Sidebar */}
          <div className="settings-nav-sidebar" style={{
            width: '210px',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#111315',
            padding: '20px 10px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}>
            <button
              onClick={() => router.back()}
              className="settings-close-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                marginBottom: '20px',
                color: 'rgba(255, 255, 255, 0.6)',
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
            >
              <X size={14} />
            </button>

            <div className="settings-tabs-list" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`settings-tab-btn ${isActive ? 'settings-tab-active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                      background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease-in-out',
                    }}
                    onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                    onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon size={14} style={{ opacity: 1, color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)' }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content */}
          <div className="settings-content-area" style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: BG_COLOR }}>
            {renderContent()}
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 10, 15, 0.15)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}>
            <div style={{
              background: CARD_BG,
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '380px',
              width: '90%',
              boxShadow: '0 15px 40px rgba(9, 10, 15, 0.05)',
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '6px',
                  background: 'rgba(255, 89, 89, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AlertTriangle size={16} color="#DC2626" />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>Cancel Subscription</h3>
              </div>
              <p style={{ fontSize: '13.5px', color: TEXT_SECONDARY, lineHeight: '1.5', marginBottom: '20px' }}>
                {subDetails?.status === 'canceling'
                  ? `Your ${txn?.plan_name} plan is already scheduled to cancel on ${formatDate(subDetails.cancel_at)}. You will lose access to all premium features after this date.`
                  : `Are you sure you want to cancel your ${txn?.plan_name} plan? You will retain access to your premium features until the end of your current billing period on ${formatDate(subDetails?.next_billing)}.`
                }
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: TEXT_PRIMARY,
                    background: CARD_BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = BG_HOVER}
                  onMouseOut={(e) => e.currentTarget.style.background = CARD_BG}
                >
                  {subDetails?.status === 'canceling' ? 'Close' : 'Keep Subscription'}
                </button>
                {subDetails?.status !== 'canceling' && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#FFFFFF',
                      background: '#DC2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: cancelLoading ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      opacity: cancelLoading ? 0.6 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {cancelLoading ? 'Canceling...' : 'Yes, Cancel'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
