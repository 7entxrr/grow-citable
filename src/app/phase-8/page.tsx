'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import styles from '../page.module.css';
import { 
  Search, 
  Loader2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  BookOpen, 
  Award, 
  MessageSquare, 
  FileText, 
  AlertCircle, 
  ExternalLink,
  Check,
  RefreshCw,
  Lightbulb 
} from 'lucide-react';

import { auth } from '@/lib/firebase';

interface TrustMention {
  title: string;
  link: string;
  snippet: string;
}

interface TrustBenchmark {
  score: number;
  whyCites: string;
  matchReasons: string[];
  mentionsCount: number;
  sampleMentions: TrustMention[];
}

interface IgnoreAuditItem {
  label: string;
  description: string;
  passed: boolean;
}

interface CitationBoosterItem {
  topic: string;
  targetQuestion: string;
  changeBlock: string;
}

interface CitationOptimizerBlueprint {
  benchmarks: {
    forbes: TrustBenchmark;
    reddit: TrustBenchmark;
    wikipedia: TrustBenchmark;
  };
  whyIgnores: IgnoreAuditItem[];
  citationBoosterPlan: {
    journalistic: CitationBoosterItem;
    wikipediaStyle: CitationBoosterItem;
    sentimentStyle: CitationBoosterItem;
  };
  simulated?: boolean;
}

export default function Phase8Page() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<CitationOptimizerBlueprint | null>(null);
  const [activePlanTab, setActivePlanTab] = useState<'journalistic' | 'wikipedia' | 'sentiment'>('journalistic');
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const shouldRetryRef = useRef(false);

  const handleRunOptimizer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setError(null);
    setBlueprint(null);
    setCopySuccess(null);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to run this citation optimization blueprint.");
      setLoading(false);
      return;
    }

    try {
      const tokenRes = await fetch('/api/consume-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: 1 })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.message || "Failed to consume tokens.");
      }

      const res = await fetch('/api/citation-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to analyze citations.');
      }

      const data = await res.json();
      setBlueprint(data);
    } catch (err: any) {
      console.error('Citation optimizer error:', err);
      setError(err.message || 'An unexpected error occurred during citation optimization.');
      
      if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
        shouldRetryRef.current = true;
        setRateLimitCountdown(60);
        const timer = setInterval(() => {
          setRateLimitCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setError(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rateLimitCountdown === 0 && shouldRetryRef.current) {
      shouldRetryRef.current = false;
      handleRunOptimizer();
    }
  }, [rateLimitCountdown]);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2500);
  };

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar />

      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.titleArea}>
              <h1 className={styles.title}>AI Search OS</h1>
              <p className={styles.subtitle}>Phase 8 — Citation Optimizer (Live Brand Mentions Checker)</p>
            </div>
            <div className={styles.headerMeta}>
              <span className={`${styles.metaBadge} ${blueprint ? '' : styles.metaBadgePending}`}>
                {blueprint ? 'Citation Audit Active' : 'Pending Verification'}
              </span>
            </div>
          </header>

          {/* Description banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(75,97,236,0.06) 0%, rgba(200,80,192,0.04) 100%)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <Award size={24} style={{ color: 'var(--primary-blue)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)' }}>Live Brand Citation Optimizer</h4>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--grey-text)' }}>
                Before AI search models (Perplexity, ChatGPT) can cite your brand, you must exist on the authority platforms they rely on. This tool checks if your brand is actually discussed on <strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>Forbes</strong>, <strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>Reddit</strong>, and <strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>Wikipedia</strong>, audits your content gaps, and suggests copy improvements.
              </p>
            </div>
          </div>

          {/* How It Works Accordion */}
          <div style={{ background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div 
              onClick={() => setShowGuide(!showGuide)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Sparkles size={18} style={{ color: 'var(--primary-blue)' }} />
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)' }}><Lightbulb size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> How It Works & Why It Matters</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--primary-blue)', fontWeight: '750' }}>
                {showGuide ? 'Hide Guide ▲' : 'Show Guide ▼'}
              </span>
            </div>

            {showGuide && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '13px', lineHeight: '1.6' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <strong style={{ color: 'var(--text-dark)' }}>1. Real-Time Citation Proofing (PR Audit)</strong>
                  <p style={{ margin: 0, color: 'var(--grey-text)' }}>
                    AI search models (ChatGPT, Claude, Perplexity) only cite brands that have authority on key trust channels. We execute live parallel queries for your brand name against <strong>Forbes</strong> (journalistic authority), <strong>Reddit</strong> (community sentiment), and <strong>Wikipedia</strong> (neutral facts).
                  </p>
                  <p style={{ margin: 0, color: 'var(--grey-text)' }}>
                    If <strong>0 mentions</strong> are found, your trust match falls to 0% because AI assistants lack external indices to reference your brand.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <strong style={{ color: 'var(--text-dark)' }}>2. EEAT Gaps Audit & Actionable Boosters</strong>
                  <p style={{ margin: 0, color: 'var(--grey-text)' }}>
                    We analyze your webpage copy for quality flags. The crawler checklist flags over-promotional sales copy, missing author profiles, or unverified facts that cause AI models to ignore your site.
                  </p>
                  <p style={{ margin: 0, color: 'var(--grey-text)' }}>
                    We then generate three copy-pasteable <strong>Booster Blocks</strong> structured for <strong>2026/2027</strong> standards that you can paste directly onto your webpage to instantly address these gaps.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input Panel */}
          <section className={styles.scanSection} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-dark)' }}>Target Webpage & Brand Auditor</h3>
            <form onSubmit={handleRunOptimizer} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="url-input" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--grey-dark)' }}>Website URL</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', color: 'var(--grey-text)' }} />
                  <input 
                    id="url-input"
                    type="text" 
                    placeholder="e.g. salesforce.com" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className={styles.input}
                    style={{ padding: '12px 12px 12px 42px', fontSize: '13px' }}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !urlInput.trim() || rateLimitCountdown > 0}
                className={styles.scanButton}
                style={{ padding: '12px 32px', height: '44px', fontSize: '13.5px' }}
              >
                {rateLimitCountdown > 0 ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Rate Limit Locked ({rateLimitCountdown}s)</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Auditing Brand Citations...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Optimize Citations</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(255, 255, 255, 0.22)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#ffffff',
                      verticalAlign: 'middle',
                      marginLeft: '8px'
                    }}>
                      <img
                        src="/favicon/logo-white2.png"
                        alt="Token"
                        style={{ width: '12px', height: '12px', objectFit: 'contain' }}
                      />
                      <span>1</span>
                    </span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Rate limit warning banner */}
          {rateLimitCountdown > 0 && (
            <div className={styles.warningBanner} style={{ borderLeft: '4px solid var(--border-yellow)' }}>
              <AlertTriangle size={18} className={styles.warningIcon} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Groq API Rate Limit Hit</strong>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Google AI Studio Free Tier allows 15 queries per minute. Please wait {rateLimitCountdown} seconds for your rate limit window to auto-reset and execute.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && rateLimitCountdown === 0 && (
            <div className={styles.errorBanner} style={{ borderLeft: '4px solid var(--border-red)' }}>
              <XCircle size={18} className={styles.errorIcon} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Citation Audit Error</strong>
                <p style={{ margin: 0, fontSize: '13px' }}>{error}</p>
              </div>
            </div>
          )}

          {copySuccess && (
            <div style={{ background: 'var(--success-green-bg)', color: 'var(--success-green-text)', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', border: '1px solid rgba(46, 196, 182, 0.3)' }}>
              <CheckCircle2 size={16} />
              <span>Successfully copied {copySuccess} to clipboard!</span>
            </div>
          )}

          {/* Blueprint Results */}
          {blueprint && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
              
              {/* Comparative Trust Benchmarks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                
                {/* Forbes Benchmark */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-sm)', borderTop: '4px solid #1a3a5f' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <BookOpen size={16} style={{ color: '#1a3a5f' }} />
                      <span style={{ fontSize: '11px', fontWeight: '850', color: '#1a3a5f', textTransform: 'uppercase' }}>Forbes Model</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#1a3a5f', fontWeight: '700', background: 'rgba(26,58,95,0.06)', padding: '2px 6px', borderRadius: '4px' }}>Journalistic</span>
                  </div>

                  {/* Mentions Search Check status */}
                  <div style={{ background: blueprint.benchmarks.forbes.mentionsCount > 0 ? '#e3fcef' : '#ffebe6', color: blueprint.benchmarks.forbes.mentionsCount > 0 ? '#006644' : '#bf2600', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '750', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {blueprint.benchmarks.forbes.mentionsCount > 0 ? (
                      <>
                        <Check size={14} />
                        <span>{blueprint.benchmarks.forbes.mentionsCount} Mentions Found on Forbes</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} />
                        <span>0 Mentions Found (Trust Deficit)</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                        <circle cx="30" cy="30" r="26" stroke="#f0f1f7" strokeWidth="5" />
                        <circle 
                          cx="30" 
                          cy="30" 
                          r="26" 
                          stroke="#1a3a5f" 
                          strokeWidth="5" 
                          strokeDasharray={163} 
                          strokeDashoffset={163 - (163 * blueprint.benchmarks.forbes.score) / 100}
                          strokeLinecap="round"
                          transform="rotate(-90 30 30)"
                        />
                      </svg>
                      <span style={{ position: 'absolute', fontSize: '14.5px', fontWeight: '800', color: 'var(--text-dark)' }}>{blueprint.benchmarks.forbes.score}%</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--grey-text)', lineHeight: '1.4' }}>
                      <strong>Why Cites:</strong> {blueprint.benchmarks.forbes.whyCites}
                    </div>
                  </div>

                  {blueprint.benchmarks.forbes.sampleMentions && blueprint.benchmarks.forbes.sampleMentions.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--grey-text)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Organic Mention Proofs:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {blueprint.benchmarks.forbes.sampleMentions.map((mention, mIdx) => (
                          <a 
                            key={mIdx} 
                            href={mention.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ textDecoration: 'none', display: 'block', padding: '8px', background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '11.5px', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          >
                            <span style={{ color: 'var(--primary-blue)', fontWeight: '700', display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {mention.title} <ExternalLink size={10} />
                            </span>
                            <span style={{ display: 'block', color: 'var(--grey-text)', marginTop: '2px', lineHeight: '1.4' }}>
                              {mention.snippet.substring(0, 100)}...
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--grey-dark)', display: 'block', marginBottom: '8px' }}>Website Content Deficits:</span>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', color: 'var(--grey-text)', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.4' }}>
                      {(blueprint.benchmarks.forbes.matchReasons || []).map((reason, rIdx) => (
                        <li key={rIdx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Reddit Benchmark */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-sm)', borderTop: '4px solid #ff4500' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <MessageSquare size={16} style={{ color: '#ff4500' }} />
                      <span style={{ fontSize: '11px', fontWeight: '850', color: '#ff4500', textTransform: 'uppercase' }}>Reddit Model</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#ff4500', fontWeight: '700', background: 'rgba(255,69,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>Sentiment</span>
                  </div>

                  {/* Mentions Search Check status */}
                  <div style={{ background: blueprint.benchmarks.reddit.mentionsCount > 0 ? '#e3fcef' : '#ffebe6', color: blueprint.benchmarks.reddit.mentionsCount > 0 ? '#006644' : '#bf2600', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '750', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {blueprint.benchmarks.reddit.mentionsCount > 0 ? (
                      <>
                        <Check size={14} />
                        <span>{blueprint.benchmarks.reddit.mentionsCount} Mentions Found on Reddit</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} />
                        <span>0 Mentions Found (Trust Deficit)</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                        <circle cx="30" cy="30" r="26" stroke="#f0f1f7" strokeWidth="5" />
                        <circle 
                          cx="30" 
                          cy="30" 
                          r="26" 
                          stroke="#ff4500" 
                          strokeWidth="5" 
                          strokeDasharray={163} 
                          strokeDashoffset={163 - (163 * blueprint.benchmarks.reddit.score) / 100}
                          strokeLinecap="round"
                          transform="rotate(-90 30 30)"
                        />
                      </svg>
                      <span style={{ position: 'absolute', fontSize: '14.5px', fontWeight: '800', color: 'var(--text-dark)' }}>{blueprint.benchmarks.reddit.score}%</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--grey-text)', lineHeight: '1.4' }}>
                      <strong>Why Cites:</strong> {blueprint.benchmarks.reddit.whyCites}
                    </div>
                  </div>

                  {blueprint.benchmarks.reddit.sampleMentions && blueprint.benchmarks.reddit.sampleMentions.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--grey-text)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Organic Mention Proofs:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {blueprint.benchmarks.reddit.sampleMentions.map((mention, mIdx) => (
                          <a 
                            key={mIdx} 
                            href={mention.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ textDecoration: 'none', display: 'block', padding: '8px', background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '11.5px', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          >
                            <span style={{ color: 'var(--primary-blue)', fontWeight: '700', display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {mention.title} <ExternalLink size={10} />
                            </span>
                            <span style={{ display: 'block', color: 'var(--grey-text)', marginTop: '2px', lineHeight: '1.4' }}>
                              {mention.snippet.substring(0, 100)}...
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--grey-dark)', display: 'block', marginBottom: '8px' }}>Website Content Deficits:</span>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', color: 'var(--grey-text)', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.4' }}>
                      {(blueprint.benchmarks.reddit.matchReasons || []).map((reason, rIdx) => (
                        <li key={rIdx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Wikipedia Benchmark */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-sm)', borderTop: '4px solid #7a7a7a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <FileText size={16} style={{ color: '#7a7a7a' }} />
                      <span style={{ fontSize: '11px', fontWeight: '850', color: '#7a7a7a', textTransform: 'uppercase' }}>Wikipedia Model</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#7a7a7a', fontWeight: '700', background: 'rgba(122,122,122,0.06)', padding: '2px 6px', borderRadius: '4px' }}>Neutrality</span>
                  </div>

                  {/* Mentions Search Check status */}
                  <div style={{ background: blueprint.benchmarks.wikipedia.mentionsCount > 0 ? '#e3fcef' : '#ffebe6', color: blueprint.benchmarks.wikipedia.mentionsCount > 0 ? '#006644' : '#bf2600', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '750', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {blueprint.benchmarks.wikipedia.mentionsCount > 0 ? (
                      <>
                        <Check size={14} />
                        <span>{blueprint.benchmarks.wikipedia.mentionsCount} Mentions Found on Wikipedia</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} />
                        <span>0 References Found (Trust Deficit)</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                        <circle cx="30" cy="30" r="26" stroke="#f0f1f7" strokeWidth="5" />
                        <circle 
                          cx="30" 
                          cy="30" 
                          r="26" 
                          stroke="#7a7a7a" 
                          strokeWidth="5" 
                          strokeDasharray={163} 
                          strokeDashoffset={163 - (163 * blueprint.benchmarks.wikipedia.score) / 100}
                          strokeLinecap="round"
                          transform="rotate(-90 30 30)"
                        />
                      </svg>
                      <span style={{ position: 'absolute', fontSize: '14.5px', fontWeight: '800', color: 'var(--text-dark)' }}>{blueprint.benchmarks.wikipedia.score}%</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--grey-text)', lineHeight: '1.4' }}>
                      <strong>Why Cites:</strong> {blueprint.benchmarks.wikipedia.whyCites}
                    </div>
                  </div>

                  {blueprint.benchmarks.wikipedia.sampleMentions && blueprint.benchmarks.wikipedia.sampleMentions.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--grey-text)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Organic Mention Proofs:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {blueprint.benchmarks.wikipedia.sampleMentions.map((mention, mIdx) => (
                          <a 
                            key={mIdx} 
                            href={mention.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ textDecoration: 'none', display: 'block', padding: '8px', background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '11.5px', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          >
                            <span style={{ color: 'var(--primary-blue)', fontWeight: '700', display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {mention.title} <ExternalLink size={10} />
                            </span>
                            <span style={{ display: 'block', color: 'var(--grey-text)', marginTop: '2px', lineHeight: '1.4' }}>
                              {mention.snippet.substring(0, 100)}...
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--grey-dark)', display: 'block', marginBottom: '8px' }}>Website Content Deficits:</span>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', color: 'var(--grey-text)', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.4' }}>
                      {(blueprint.benchmarks.wikipedia.matchReasons || []).map((reason, rIdx) => (
                        <li key={rIdx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>

              {/* why AI ignores your page */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>Why AI Ignores Your Page (Audited Trust Signals)</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(blueprint.whyIgnores || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'var(--grey-light)', border: '1px solid var(--border-color)', padding: '14px 18px', borderRadius: '8px' }}>
                      {item.passed ? (
                        <CheckCircle2 size={18} style={{ color: '#36b37e', marginTop: '2px', flexShrink: 0 }} />
                      ) : (
                        <AlertCircle size={18} style={{ color: '#ff5630', marginTop: '2px', flexShrink: 0 }} />
                      )}
                      <div>
                        <strong style={{ display: 'block', fontSize: '13.5px', color: item.passed ? 'var(--text-dark)' : '#bf2600', marginBottom: '2px' }}>
                          {item.label}
                        </strong>
                        <span style={{ fontSize: '12.5px', color: 'var(--grey-text)' }}>{item.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Citation Booster Action Plan */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                  <Sparkles size={18} style={{ color: 'var(--primary-blue)' }} />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-dark)', textTransform: 'uppercase' }}>Citation Boost Action Plan</span>
                </div>

                {/* Sub Tab selection */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', paddingBottom: '1px' }}>
                  {[
                    { id: 'journalistic', label: 'Journalistic Stat Block (Forbes style)' },
                    { id: 'wikipedia', label: 'Neutral Definition block (Wikipedia style)' },
                    { id: 'sentiment', label: 'First-person Sentiment block (Reddit style)' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePlanTab(tab.id as any)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        border: 'none',
                        background: 'none',
                        borderBottom: activePlanTab === tab.id ? '2px solid var(--primary-blue)' : 'none',
                        color: activePlanTab === tab.id ? 'var(--primary-blue)' : 'var(--grey-text)',
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content area */}
                {activePlanTab === 'journalistic' && blueprint.citationBoosterPlan.journalistic && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' }}>
                      <div style={{ background: 'var(--grey-light)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong>Niche Opportunity:</strong> {blueprint.citationBoosterPlan.journalistic.topic}
                      </div>
                      <div style={{ background: 'var(--grey-light)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong>Target AEO Question:</strong> "{blueprint.citationBoosterPlan.journalistic.targetQuestion}"
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        readOnly
                        value={blueprint.citationBoosterPlan.journalistic.changeBlock}
                        style={{ width: '100%', height: '140px', padding: '16px 16px 16px 16px', fontFamily: 'monospace', fontSize: '12.5px', background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--grey-dark)', lineHeight: '1.6', resize: 'none' }}
                      />
                      <button
                        onClick={() => handleCopyText(blueprint.citationBoosterPlan.journalistic.changeBlock, 'Journalistic Block')}
                        style={{ position: 'absolute', right: '12px', top: '12px', background: 'var(--primary-blue)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '750', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center' }}
                      >
                        <Copy size={12} />
                        <span>Copy Block</span>
                      </button>
                    </div>
                  </div>
                )}

                {activePlanTab === 'wikipedia' && blueprint.citationBoosterPlan.wikipediaStyle && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' }}>
                      <div style={{ background: 'var(--grey-light)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong>Niche Opportunity:</strong> {blueprint.citationBoosterPlan.wikipediaStyle.topic}
                      </div>
                      <div style={{ background: 'var(--grey-light)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong>Target AEO Question:</strong> "{blueprint.citationBoosterPlan.wikipediaStyle.targetQuestion}"
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        readOnly
                        value={blueprint.citationBoosterPlan.wikipediaStyle.changeBlock}
                        style={{ width: '100%', height: '140px', padding: '16px 16px 16px 16px', fontFamily: 'monospace', fontSize: '12.5px', background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--grey-dark)', lineHeight: '1.6', resize: 'none' }}
                      />
                      <button
                        onClick={() => handleCopyText(blueprint.citationBoosterPlan.wikipediaStyle.changeBlock, 'Wikipedia Block')}
                        style={{ position: 'absolute', right: '12px', top: '12px', background: 'var(--primary-blue)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '750', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center' }}
                      >
                        <Copy size={12} />
                        <span>Copy Block</span>
                      </button>
                    </div>
                  </div>
                )}

                {activePlanTab === 'sentiment' && blueprint.citationBoosterPlan.sentimentStyle && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px' }}>
                      <div style={{ background: 'var(--grey-light)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong>Niche Opportunity:</strong> {blueprint.citationBoosterPlan.sentimentStyle.topic}
                      </div>
                      <div style={{ background: 'var(--grey-light)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong>Target AEO Question:</strong> "{blueprint.citationBoosterPlan.sentimentStyle.targetQuestion}"
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        readOnly
                        value={blueprint.citationBoosterPlan.sentimentStyle.changeBlock}
                        style={{ width: '100%', height: '140px', padding: '16px 16px 16px 16px', fontFamily: 'monospace', fontSize: '12.5px', background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--grey-dark)', lineHeight: '1.6', resize: 'none' }}
                      />
                      <button
                        onClick={() => handleCopyText(blueprint.citationBoosterPlan.sentimentStyle.changeBlock, 'Sentiment Block')}
                        style={{ position: 'absolute', right: '12px', top: '12px', background: 'var(--primary-blue)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '750', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center' }}
                      >
                        <Copy size={12} />
                        <span>Copy Block</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
