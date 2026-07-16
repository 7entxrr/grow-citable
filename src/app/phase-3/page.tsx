'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Globe, 
  TrendingUp, 
  HelpCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronDown,
  Compass,
  Zap,
  ArrowUpRight,
  Loader2,
  Sparkles
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import Sidebar from '@/components/Sidebar/Sidebar';
import styles from '../page.module.css';

interface CompetitorShare {
  competitor: string;
  winPercentage: number;
}

interface PromptResultItem {
  prompt: string;
  yourRank: number | 'Not Found';
  competitorRanks: { [key: string]: number | 'Not Found' };
  winner: string;
  sourceUrl: string;
}

interface ExploreResult {
  summary: {
    totalScanned: number;
    winRate: number;
    coverage: number;
    averagePosition: string;
    competitorShares: CompetitorShare[];
    isSimulated: boolean;
  };
  results: PromptResultItem[];
}

interface PricingInfo {
  hasPricingPage: boolean;
  tiers: string[];
  details: string;
}

interface CompetitorDetail {
  domain: string;
  niche: string;
  seoScore: number;
  pricing: PricingInfo;
  strengths: string[];
  weaknesses: string[];
}

interface YourWebsiteDetail {
  domain: string;
  niche: string;
  pricing: PricingInfo;
}

interface CompetitorMatrix {
  competitors: CompetitorDetail[];
  yourWebsite: YourWebsiteDetail;
  simulated: boolean;
}

export default function Phase3Page() {
  const [urlInput, setUrlInput] = useState('');
  const [competitorsInput, setCompetitorsInput] = useState('');
  const [promptsInput, setPromptsInput] = useState('');
  
  // User search limit configuration
  const [searchLimit, setSearchLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [searchEngine, setSearchEngine] = useState('google');
  const [competitorsLimit, setCompetitorsLimit] = useState(3);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const shouldRetryRef = useRef<string | null>(null);

  const triggerRateLimitCountdown = (type: string) => {
    shouldRetryRef.current = type;
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
  };

  const handleSuggestPrompts = async () => {
    if (!urlInput.trim()) return;
    setSuggesting(true);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to suggest prompts.");
      setSuggesting(false);
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

      const res = await fetch('/api/suggest-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.prompts && data.prompts.length > 0) {
          setPromptsInput(data.prompts.join('\n'));
        }
      }
    } catch (err: any) {
      console.error('Failed to generate prompts:', err);
      setError(err.message || 'Failed to suggest prompts.');
      if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
        triggerRateLimitCountdown('suggest');
      }
    } finally {
      setSuggesting(false);
    }
  };

  const [findingCompetitors, setFindingCompetitors] = useState(false);
  const [competitorMatrix, setCompetitorMatrix] = useState<CompetitorMatrix | null>(null);

  const handleFindCompetitors = async () => {
    if (!urlInput.trim()) {
      setError("Please enter your website domain first.");
      return;
    }
    setFindingCompetitors(true);
    setCompetitorMatrix(null);
    setError(null);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to find competitors.");
      setFindingCompetitors(false);
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

      const res = await fetch('/api/find-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput, engine: searchEngine, limit: competitorsLimit })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to find competitors.');
      }
      const data = await res.json();
      setCompetitorMatrix(data);
      if (data.competitors && data.competitors.length > 0) {
        const domains = data.competitors.map((c: any) => c.domain).join(', ');
        setCompetitorsInput(domains);
      }
    } catch (err: any) {
      console.error('Failed to find competitors:', err);
      setError(err.message || 'Failed to complete competitor analysis.');
      if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
        triggerRateLimitCountdown('find');
      }
    } finally {
      setFindingCompetitors(false);
    }
  };

  const handleExplore = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim() || !promptsInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to run this exploration.");
      setLoading(false);
      return;
    }

    // Split prompts and filter out empty lines
    const promptList = promptsInput
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);

    // Split competitors
    const competitorList = competitorsInput
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

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

      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput,
          competitors: competitorList,
          prompts: promptList,
          limit: searchLimit,
          engine: searchEngine
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server failed to process exploration request.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete rank explorer audit.');
      if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
        triggerRateLimitCountdown('explore');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rateLimitCountdown === 0 && shouldRetryRef.current) {
      const type = shouldRetryRef.current;
      shouldRetryRef.current = null;
      if (type === 'suggest') handleSuggestPrompts();
      else if (type === 'find') handleFindCompetitors();
      else if (type === 'explore') handleExplore();
    }
  }, [rateLimitCountdown]);

  const getWinnerBadge = (winner: string) => {
    if (winner === 'You') {
      return <span className={`${styles.badgeSmall} ${styles.badgeGood}`}>You Win</span>;
    } else if (winner === 'None') {
      return <span className={`${styles.badgeSmall} ${styles.badgeWarning}`}>No Winner</span>;
    } else {
      return (
        <span 
          className={`${styles.badgeSmall} ${styles.badgePoor}`} 
          style={{ 
            textTransform: 'none', 
            maxWidth: '120px', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '4px',
            verticalAlign: 'middle'
          }}
          title={`${winner} Wins`}
        >
          <img 
            src={`https://www.google.com/s2/favicons?domain=${winner}&sz=16`} 
            alt="" 
            width="10" 
            height="10" 
            style={{ borderRadius: '2px', flexShrink: 0 }} 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <span>{winner} Wins</span>
        </span>
      );
    }
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
              <p className={styles.subtitle}>Phase 3 — AI Prompt Explorer (Real-Time SERP Analysis)</p>
            </div>
            <div className={styles.headerMeta}>
              <span className={styles.metaBadge}>Phase 3 ACTIVE</span>
            </div>
          </header>


          {/* Configuration Form card */}
          <section className={styles.crawlDetailsBox} style={{ gap: '16px' }}>
            <h3 className={styles.boxTitle}>Rank Explorer Configuration</h3>
            
            <form onSubmit={handleExplore} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'flex-start' }}>
                {/* Website Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--grey-dark)', textTransform: 'uppercase' }}>Your Website Domain</label>
                  <div className={styles.inputWrapper}>
                    <Globe size={16} className={styles.inputIcon} style={{ left: '12px' }} />
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="e.g. domain.com"
                      className={styles.input}
                      style={{ padding: '10px 12px 10px 38px', borderRadius: '8px', fontSize: '13px' }}
                      required
                    />
                  </div>
                </div>

                {/* Competitor Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--grey-dark)', textTransform: 'uppercase' }}>Competitor Domains (Comma-Separated)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--grey-dark)' }}>Count:</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={competitorsLimit}
                          onChange={(e) => setCompetitorsLimit(Math.max(1, parseInt(e.target.value) || 3))}
                          style={{
                            width: '38px',
                            padding: '1px 2px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)'
                          }}
                          disabled={findingCompetitors}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleFindCompetitors}
                        disabled={findingCompetitors || rateLimitCountdown > 0}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: rateLimitCountdown > 0 ? 'not-allowed' : 'pointer', 
                          fontSize: '11px', 
                          fontWeight: '700', 
                          color: rateLimitCountdown > 0 ? 'var(--grey-text)' : 'var(--primary-blue)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          padding: 0
                        }}
                        onMouseEnter={(e) => { if (rateLimitCountdown <= 0) e.currentTarget.style.textDecoration = 'underline'; }}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {rateLimitCountdown > 0 ? (
                          <>
                            <Loader2 size={12} className={styles.spinner} />
                            <span>Locked ({rateLimitCountdown}s)</span>
                          </>
                        ) : findingCompetitors ? (
                          <>
                            <Loader2 size={12} className={styles.spinner} />
                            <span>Finding...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} />
                            <span>Find Competitors with AI Search</span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'rgba(124, 92, 255, 0.1)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 800,
                              color: '#7C5CFF',
                              marginLeft: '6px'
                            }}>
                              <img
                                src="/favicon/logo.png"
                                alt="Token"
                                style={{ width: '10px', height: '10px', objectFit: 'contain' }}
                              />
                              <span>1</span>
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className={styles.inputWrapper}>
                    <TrendingUp size={16} className={styles.inputIcon} style={{ left: '12px' }} />
                    <input
                      type="text"
                      value={competitorsInput}
                      onChange={(e) => setCompetitorsInput(e.target.value)}
                      placeholder="competitor1.com, competitor2.com"
                      className={styles.input}
                      style={{ padding: '10px 12px 10px 38px', borderRadius: '8px', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Prompts Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--grey-dark)', textTransform: 'uppercase' }}>Target Prompts list (one prompt per line)</label>
                  <button
                    type="button"
                    onClick={handleSuggestPrompts}
                    disabled={suggesting || !urlInput.trim() || rateLimitCountdown > 0}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: rateLimitCountdown > 0 ? 'not-allowed' : 'pointer', 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      color: rateLimitCountdown > 0 ? 'var(--grey-text)' : 'var(--primary-blue)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: 0
                    }}
                    onMouseEnter={(e) => { if (rateLimitCountdown <= 0) e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {rateLimitCountdown > 0 ? (
                      <>
                        <Loader2 size={12} className={styles.spinner} />
                        <span>Locked ({rateLimitCountdown}s)</span>
                      </>
                    ) : suggesting ? (
                      <>
                        <Loader2 size={12} className={styles.spinner} />
                        <span>Generating suggest list...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        <span>Auto-Generate Prompts with Gemini AI</span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: 'rgba(124, 92, 255, 0.1)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#7C5CFF',
                          marginLeft: '6px'
                        }}>
                          <img
                            src="/favicon/logo.png"
                            alt="Token"
                            style={{ width: '10px', height: '10px', objectFit: 'contain' }}
                          />
                          <span>1</span>
                        </span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={promptsInput}
                  onChange={(e) => setPromptsInput(e.target.value)}
                  placeholder="Enter prompts, e.g.&#10;Best CRM&#10;Best AI tools&#10;Best accounting software in Mumbai"
                  className={styles.input}
                  style={{ borderRadius: '8px', fontSize: '13px', padding: '12px', fontFamily: 'inherit', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Numerical search limiter & submit wrapper */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                {/* Searches Limiter Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-dark)' }}>
                    Max Searches Limit:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={searchLimit}
                    onChange={(e) => setSearchLimit(parseInt(e.target.value) || 1)}
                    className={styles.input}
                    style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--grey-text)' }}>
                    (Saves search credits by cutting prompt list)
                  </span>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || rateLimitCountdown > 0} 
                  className={styles.scanButton} 
                  style={{ padding: '10px 24px', borderRadius: '8px' }}
                >
                  {rateLimitCountdown > 0 ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>Rate Limit Locked ({rateLimitCountdown}s)</span>
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>Auditing SERPs...</span>
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      <span>Run Prompt Audit</span>
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
              </div>
            </form>
          </section>

          {/* Competitor Benchmarking & Pricing Matrix */}
          {competitorMatrix && (
            <section className={styles.crawlDetailsBox} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className={styles.boxTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: 'var(--primary-blue)' }} />
                  <span>AI Competitor Intelligence & Pricing Comparison Matrix</span>
                </h3>
                {competitorMatrix.simulated && (
                  <span style={{ fontSize: '11px', background: '#FFF1E6', color: '#D97706', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                    Simulated Fallback Mode
                  </span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--grey-text)', marginTop: '-8px' }}>
                Deep website scans analyzed niches, pricing strategies, subscription pages, and technical SEO structure for comparison.
              </p>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ width: '220px', padding: '12px 16px', fontWeight: '750', color: 'var(--grey-dark)' }}>Comparison Criteria</th>
                      <th style={{ padding: '12px 16px', fontWeight: '750', color: 'var(--primary-blue)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img 
                            src={`https://www.google.com/s2/favicons?domain=${competitorMatrix.yourWebsite.domain}&sz=16`} 
                            alt="" 
                            width="14" 
                            height="14" 
                            style={{ borderRadius: '2px', flexShrink: 0 }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span>{competitorMatrix.yourWebsite.domain} (You)</span>
                        </div>
                      </th>
                      {competitorMatrix.competitors.map((comp, idx) => (
                        <th key={idx} style={{ padding: '12px 16px', fontWeight: '750', color: 'var(--text-dark)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img 
                              src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=16`} 
                              alt="" 
                              width="14" 
                              height="14" 
                              style={{ borderRadius: '2px', flexShrink: 0 }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span>{comp.domain}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Focus / Niche */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--grey-dark)' }}>Market Focus & Niche</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-dark)' }}>{competitorMatrix.yourWebsite.niche}</td>
                      {competitorMatrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '12px 16px', color: 'var(--text-dark)' }}>{comp.niche}</td>
                      ))}
                    </tr>

                    {/* SEO Score */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--grey-dark)' }}>Technical SEO Quality</td>
                      <td style={{ padding: '12px 16px', color: 'var(--grey-text)' }}>
                        <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#64748B', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                          Refer to Phase 1 Audit
                        </span>
                      </td>
                      {competitorMatrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '12px 16px' }}>
                          <span 
                            style={{ 
                              background: comp.seoScore >= 80 ? 'var(--success-green-light)' : 'var(--warning-yellow-light)', 
                              color: comp.seoScore >= 80 ? 'var(--success-green)' : 'var(--warning-yellow)',
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontWeight: '700' 
                            }}
                          >
                            {comp.seoScore}/100
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Has Pricing Page */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--grey-dark)' }}>Pricing Page Discovered?</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-dark)' }}>
                        {competitorMatrix.yourWebsite.pricing.hasPricingPage ? (
                          <span className={`${styles.badgeSmall} ${styles.badgeGood}`}>Yes</span>
                        ) : (
                          <span className={`${styles.badgeSmall} ${styles.badgeWarning}`}>No / Quote Only</span>
                        )}
                      </td>
                      {competitorMatrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '12px 16px' }}>
                          {comp.pricing.hasPricingPage ? (
                            <span className={`${styles.badgeSmall} ${styles.badgeGood}`}>Yes</span>
                          ) : (
                            <span className={`${styles.badgeSmall} ${styles.badgeWarning}`}>No / Quote Only</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Pricing Tiers */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--grey-dark)' }}>Pricing & Subscription Tiers</td>
                      <td style={{ padding: '12px 16px' }}>
                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {competitorMatrix.yourWebsite.pricing.tiers.map((tier, tIdx) => (
                            <li key={tIdx} style={{ color: 'var(--text-dark)' }}>{tier}</li>
                          ))}
                          {competitorMatrix.yourWebsite.pricing.tiers.length === 0 && (
                            <li style={{ color: 'var(--grey-text)', fontStyle: 'italic' }}>No tiers specified</li>
                          )}
                        </ul>
                      </td>
                      {competitorMatrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '12px 16px' }}>
                          <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {comp.pricing.tiers.map((tier, tIdx) => (
                              <li key={tIdx} style={{ color: 'var(--text-dark)' }}>{tier}</li>
                            ))}
                            {comp.pricing.tiers.length === 0 && (
                              <li style={{ color: 'var(--grey-text)', fontStyle: 'italic' }}>No tiers specified</li>
                            )}
                          </ul>
                        </td>
                      ))}
                    </tr>

                    {/* Pricing Details */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--grey-dark)' }}>Billing Strategy Details</td>
                      <td style={{ padding: '12px 16px', color: 'var(--grey-dark)', fontSize: '12.5px', lineHeight: '1.45' }}>{competitorMatrix.yourWebsite.pricing.details}</td>
                      {competitorMatrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '12px 16px', color: 'var(--grey-dark)', fontSize: '12.5px', lineHeight: '1.45' }}>{comp.pricing.details}</td>
                      ))}
                    </tr>

                    {/* Strengths */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--grey-dark)' }}>Key Strengths</td>
                      <td style={{ padding: '12px 16px', color: 'var(--grey-text)', fontStyle: 'italic' }}>Base Website benchmark</td>
                      {competitorMatrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '12px 16px' }}>
                          <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px' }}>
                            {comp.strengths.map((str, sIdx) => (
                              <li key={sIdx} style={{ color: '#0F5B3C', fontWeight: '600' }}>{str}</li>
                            ))}
                          </ul>
                        </td>
                      ))}
                    </tr>

                    {/* Weaknesses */}
                    <tr>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--grey-dark)' }}>Key Weaknesses</td>
                      <td style={{ padding: '12px 16px', color: 'var(--grey-text)', fontStyle: 'italic' }}>Base Website benchmark</td>
                      {competitorMatrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '12px 16px' }}>
                          <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px' }}>
                            {comp.weaknesses.map((weak, wIdx) => (
                              <li key={wIdx} style={{ color: 'var(--danger-red-text)', fontWeight: '600' }}>{weak}</li>
                            ))}
                          </ul>
                        </td>
                      ))}
                    </tr>

                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Error Banner */}
          {error && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={20} />
              <div className={styles.errorDetails}>
                <h4 className={styles.errorTitle}>
                  {rateLimitCountdown > 0 
                    ? 'Gemini API Rate Limit Hit' 
                    : (error.toLowerCase().includes('domain') || error.toLowerCase().includes('prompt'))
                      ? 'Input Validation Error'
                      : 'SERP Scan Failed'
                  }
                </h4>
                <p className={styles.errorText}>
                  {rateLimitCountdown > 0 
                    ? `Google AI Studio Free Tier allows 15 queries per minute. Please wait ${rateLimitCountdown} seconds for your rate limit window to auto-reset.`
                    : error
                  }
                </p>
              </div>
            </div>
          )}

          {/* Loader */}
          {loading && (
            <div className={styles.loaderBox}>
              <Loader2 size={48} className={styles.gearSpinner} />
              <h3 className={styles.loaderHeading}>Querying Real-Time Search Results</h3>
              <p className={styles.loaderStep}>Scanning up to {searchLimit} prompts in parallel batches...</p>
              <div className={styles.progressBarWrapper}>
                <div className={styles.progressBarFlow}></div>
              </div>
            </div>
          )}

          {/* Results dashboard view */}
          {!loading && result && (
            <div className={styles.resultsGrid}>
              {/* API notice */}
              {result.summary.isSimulated && (
                <div className={styles.warningBanner}>
                  <Info size={18} />
                  <span>
                    <strong>Demo Mode active:</strong> Search credentials were not found in `.env.local`. Displaying simulated rankings. Set your key to enable live Google Search grounding.
                  </span>
                </div>
              )}

              {/* Summary Cards */}
              <div className={styles.scoresRow}>
                {/* Win Rate */}
                <div className={`${styles.scoreCard} ${styles.scoreCardPrimary}`}>
                  <div className={styles.scoreHeader}>
                    <span>PROMPT WIN RATE</span>
                    <CheckCircle size={16} />
                  </div>
                  <div className={styles.scoreValueBlock}>
                    <h2 className={styles.scoreNumber}>{result.summary.winRate}%</h2>
                  </div>
                  <div className={styles.scoreText}>
                    Percent of prompts where you outranked your competitors in Top 10.
                  </div>
                </div>

                {/* Search Coverage */}
                <div className={styles.scoreCard}>
                  <div className={styles.scoreHeader}>
                    <span>SEARCH COVERAGE</span>
                    <Compass size={16} />
                  </div>
                  <div className={styles.scoreValueBlock}>
                    <h2 className={styles.scoreNumber}>{result.summary.coverage}%</h2>
                  </div>
                  <div className={styles.progressContainer}>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressBar} style={{ width: `${result.summary.coverage}%` }}></div>
                    </div>
                  </div>
                  <div className={styles.scoreText}>
                    Percent of prompts where your domain appeared anywhere in organic results.
                  </div>
                </div>

                {/* Average Position */}
                <div className={styles.scoreCard}>
                  <div className={styles.scoreHeader}>
                    <span>AVERAGE POSITION</span>
                    <Zap size={16} />
                  </div>
                  <div className={styles.scoreValueBlock}>
                    <h2 className={styles.scoreNumber}>#{result.summary.averagePosition}</h2>
                  </div>
                  <div className={styles.scoreText}>
                    Your average organic placement when you appear.
                  </div>
                </div>
              </div>

              {/* Lower Section Split */}
              <div className={styles.detailsSplit} style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                
                {/* Left: Prompts Table list */}
                <div className={styles.crawlDetailsBox}>
                  <h3 className={styles.boxTitle}>Prompts Ranking Directory</h3>
                  
                  <div className={styles.tableWrapper}>
                    <table className={styles.pagesTable}>
                      <thead>
                        <tr>
                          <th>Search Prompt</th>
                          <th>Your Rank</th>
                          <th>Competitors</th>
                          <th>Outcome</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-dark)' }}>
                              {item.prompt}
                            </td>
                            <td>
                              {item.yourRank === 'Not Found' ? (
                                <span className={styles.textRed}>N/A</span>
                              ) : (
                                <span style={{ background: 'var(--primary-blue-light)', color: 'var(--primary-blue)', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                                  #{item.yourRank}
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                                {Object.entries(item.competitorRanks).map(([comp, cRank]) => (
                                  <span key={comp} style={{ color: 'var(--grey-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <img 
                                      src={`https://www.google.com/s2/favicons?domain=${comp}&sz=16`} 
                                      alt="" 
                                      width="12" 
                                      height="12" 
                                      style={{ borderRadius: '2px', flexShrink: 0 }} 
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    <span><strong>{comp}</strong>: {cRank === 'Not Found' ? 'N/A' : `#${cRank}`}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>{getWinnerBadge(item.winner)}</td>
                            <td>
                              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className={styles.alertLink} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Inspect</span>
                                <ArrowUpRight size={12} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Competitor win shares */}
                <div className={styles.crawlDetailsBox}>
                  <h3 className={styles.boxTitle}>Competitor Win Share</h3>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--grey-text)', marginTop: '-8px' }}>
                    Percent of total prompts won by competitor domains.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                    {result.summary.competitorShares.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '750', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dark)' }}>
                            <img 
                              src={`https://www.google.com/s2/favicons?domain=${item.competitor}&sz=16`} 
                              alt="" 
                              width="14" 
                              height="14" 
                              style={{ borderRadius: '2px', flexShrink: 0 }} 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span>{item.competitor}</span>
                          </span>
                          <span style={{ color: 'var(--danger-red-text)' }}>{item.winPercentage}% Won</span>
                        </div>
                        <div className={styles.progressTrack} style={{ height: '8px' }}>
                          <div 
                            className={styles.progressBar} 
                            style={{ 
                              width: `${item.winPercentage}%`, 
                              background: idx === 0 ? 'var(--danger-red)' : '#FFA7A7' 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}

                    {result.summary.competitorShares.length === 0 && (
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--grey-text)', textAlign: 'center', padding: '20px 0' }}>
                        No competitor data to graph. Add competitors above.
                      </p>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
