'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [websiteName, setWebsiteName] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [websiteDescription, setWebsiteDescription] = useState('');
  
  // Step 2 State
  const [referralSource, setReferralSource] = useState('');
  const [customReferral, setCustomReferral] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  const isValidUrl = (url: string): boolean => {
    let clean = url.trim();
    if (!clean) return false;
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }
    try {
      const parsed = new URL(clean);
      const host = parsed.hostname;
      return !!host && host.includes('.') && host.split('.').filter(Boolean).length >= 2;
    } catch {
      return false;
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl(websiteLink)) {
      setError('Please enter a valid URL (e.g., growcitable.com)');
      return;
    }
    let normalized = websiteLink.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }
    setWebsiteLink(normalized);
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!referralSource) {
      setError('Please select an option');
      return;
    }

    if (referralSource === 'Other' && !customReferral.trim()) {
      setError('Please specify where you heard about us');
      return;
    }

    setLoading(true);
    setError('');

    const finalReferral = referralSource === 'Other' ? customReferral.trim() : referralSource;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        websiteName,
        websiteLink,
        websiteDescription,
        referralSource: finalReferral,
        onboardingCompleted: true,
        updated_at: new Date(),
      });

      router.push('/pricing');
    } catch (err: any) {
      setError(err.message || 'Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  const sourceOptions = [
    { id: 'Google Search', label: 'Google Search' },
    { id: 'AI Recommendation', label: 'AI Recommendation' },
    { id: 'Reddit', label: 'Reddit' },
    { id: 'LinkedIn', label: 'LinkedIn' },
    { id: 'Instagram', label: 'Instagram' },
    { id: 'X', label: 'X (formerly Twitter)' },
    { id: 'WhatsApp', label: 'WhatsApp' },
    { id: 'Friend', label: 'Friend' },
    { id: 'Gmail', label: 'Gmail' },
    { id: 'Other', label: 'Other' },
  ];

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5F5F5',
        fontFamily: '"Kumbh Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        <div style={{ fontSize: '14px', color: '#6B7280' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: '"Kumbh Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      background: '#F5F5F5',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Image src="/favicon/logo.png" alt="Grow Citable" width={28} height={28} style={{ borderRadius: '6px', objectFit: 'contain' }} />
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#090A0F', letterSpacing: '-0.3px' }}>Grow Citable</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '48px 40px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          boxSizing: 'border-box',
        }}>
          {/* Welcome Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: user?.photoURL ? `url(${user.photoURL})` : 'linear-gradient(135deg, #4B61EC, #7C5CFF)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 600,
            }}>
              {!user?.photoURL && (user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?')}
            </div>
            
            <h1 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#090A0F',
              marginBottom: '8px',
              letterSpacing: '-0.3px',
            }}>
              {step === 1 ? `Welcome, ${user?.displayName?.split(' ')[0] || 'there'}!` : 'One last question'}
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#6B7280',
            }}>
              {step === 1 ? "Let's set up your website profile" : "Where did you hear about Grow Citable?"}
            </p>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#DC2626',
              background: '#FEE2E2',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {step === 1 ? (
            /* STEP 1 FORM */
            <form onSubmit={handleNextStep}>
              {/* Website Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '8px' }}>
                  Website Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Company"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    outline: 'none',
                    color: '#090A0F',
                    background: '#F9FAFB',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Website Link */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '8px' }}>
                  Website Link
                </label>
                <input
                  type="text"
                  placeholder="growcitable.com"
                  value={websiteLink}
                  onChange={(e) => setWebsiteLink(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: `1px solid ${websiteLink && !isValidUrl(websiteLink) ? '#EF4444' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    outline: 'none',
                    color: '#090A0F',
                    background: '#F9FAFB',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = websiteLink && !isValidUrl(websiteLink) ? '#EF4444' : '#E5E7EB';
                    let clean = websiteLink.trim();
                    if (clean && !/^https?:\/\//i.test(clean) && isValidUrl(clean)) {
                      setWebsiteLink('https://' + clean);
                    }
                  }}
                />
                {websiteLink && !isValidUrl(websiteLink) && (
                  <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px' }}>
                    Please enter a valid URL (e.g., growcitable.com)
                  </p>
                )}
              </div>

              {/* Website Description */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '8px' }}>
                  Describe your website
                </label>
                <textarea
                  placeholder="Tell us about your website, what it does, who it's for..."
                  value={websiteDescription}
                  onChange={(e) => setWebsiteDescription(e.target.value)}
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    outline: 'none',
                    color: '#090A0F',
                    background: '#F9FAFB',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Submit / Continue Button */}
              <button
                type="submit"
                disabled={!websiteName || !websiteLink || !websiteDescription}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  background: websiteName && websiteLink && websiteDescription ? '#090A0F' : '#D1D5DB',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                Continue
              </button>
            </form>
          ) : (
            /* STEP 2 FORM */
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {sourceOptions.map((opt) => {
                  const isSelected = referralSource === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setReferralSource(opt.id);
                        setError('');
                      }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: `1.5px solid ${isSelected ? '#090A0F' : '#E5E7EB'}`,
                        background: isSelected ? '#FAFBFB' : '#FFFFFF',
                        color: '#090A0F',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Input for 'Other' option */}
              {referralSource === 'Other' && (
                <div style={{ marginBottom: '24px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Where did you hear about us? *"
                    value={customReferral}
                    onChange={(e) => {
                      setCustomReferral(e.target.value);
                      setError('');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      outline: 'none',
                      color: '#090A0F',
                      background: '#F9FAFB',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                  />
                </div>
              )}

              {/* Buttons Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: '24px' }}>
                <span 
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }} 
                  style={{ fontSize: '13px', color: '#6B7280', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}
                >
                  Back
                </span>
                
                <button
                  type="submit"
                  disabled={loading || !referralSource || (referralSource === 'Other' && !customReferral.trim())}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    background: referralSource && (referralSource !== 'Other' || customReferral.trim()) ? '#090A0F' : '#D1D5DB',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
