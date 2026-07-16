'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import styles from '../page.module.css';
import { Search, Loader2, AlertTriangle, Info, CheckCircle2, ShieldAlert, Award, FileText, Fingerprint, Compass, MessageSquare, Code, LayoutGrid } from 'lucide-react';

import { auth } from '@/lib/firebase';

interface AuditData {
  domain: string;
  entities: string;
  authority: string;
  topics: string[];
  citations: string;
  schema: string;
  brandMentions: string;
  promptWins: string;
  contentDepth: string;
  aiTrustScore: number;
}

interface AuditMatrix {
  yourWebsite: AuditData;
  competitors: AuditData[];
  simulated: boolean;
}

export default function Phase4Page() {
  const [urlInput, setUrlInput] = useState('');
  const [competitorsInput, setCompetitorsInput] = useState('');
  const [nicheInput, setNicheInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<AuditMatrix | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const shouldRetryRef = useRef(false);

  const handleRunAudit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setError(null);
    setMatrix(null);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to run this competitor audit.");
      setLoading(false);
      return;
    }

    try {
      const tokenRes = await fetch('/api/consume-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: 2 })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.message || "Failed to consume tokens.");
      }

      const res = await fetch('/api/audit-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput,
          competitors: competitorsInput,
          niche: nicheInput
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to complete competitor AI audit.');
      }

      const data = await res.json();
      setMatrix(data);
      
      if (data.detectedNiche) {
        setNicheInput(data.detectedNiche);
      }
      if (data.competitors && !competitorsInput.trim()) {
        const domainsList = data.competitors.map((c: any) => c.domain).join(', ');
        setCompetitorsInput(domainsList);
      }
    } catch (err: any) {
      console.error('Competitor audit error:', err);
      setError(err.message || 'An unexpected error occurred during the audit.');
      
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
      handleRunAudit();
    }
  }, [rateLimitCountdown]);

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar />

      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.titleArea}>
              <h1 className={styles.title}>AI Search OS</h1>
              <p className={styles.subtitle}>Phase 4 — Competitor Intelligence (Advanced AI Optimization & AEO)</p>
            </div>
            <div className={styles.headerMeta}>
              <span className={`${styles.metaBadge} ${matrix ? '' : styles.metaBadgePending}`}>
                {matrix ? 'Audit Completed' : 'Pending Scan'}
              </span>
            </div>
          </header>

          {/* Description banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(75,97,236,0.06) 0%, rgba(200,80,192,0.04) 100%)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <Compass size={24} style={{ color: 'var(--primary-blue)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)' }}>AI-First Benchmarking Matrix</h4>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--grey-text)' }}>
                Traditional search engine rankings are dead in the era of AI Overviews, Perplexity, and ChatGPT. Phase 4 audits semantic domain authority, sitemap topic depth, schema coverage, structured entity mappings, and calculates a comparative <strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>AI Trust Score</strong> out of 100 based on LLM recommendations.
              </p>
            </div>
          </div>

          {/* Input control form */}
          <section className={styles.scanSection} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-dark)' }}>Competitor AI Audit Panel</h3>
            <form onSubmit={handleRunAudit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {/* Website URL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="url-input" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--grey-dark)' }}>Your Website URL</label>
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

                {/* Competitors List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="competitors-input" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--grey-dark)' }}>Competitor Domains</label>
                  <input 
                    id="competitors-input"
                    type="text" 
                    placeholder="e.g. hubspot.com, zoho.com (Optional - will auto-discover)" 
                    value={competitorsInput}
                    onChange={(e) => setCompetitorsInput(e.target.value)}
                    className={styles.input}
                    style={{ padding: '12px 16px', fontSize: '13px' }}
                  />
                </div>

                {/* Niche Focus */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="niche-input" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--grey-dark)' }}>Business Niche / Keywords</label>
                  <input 
                    id="niche-input"
                    type="text" 
                    placeholder="e.g. CRM software (Optional - will auto-detect)" 
                    value={nicheInput}
                    onChange={(e) => setNicheInput(e.target.value)}
                    className={styles.input}
                    style={{ padding: '12px 16px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button 
                  type="submit" 
                  disabled={loading || !urlInput.trim() || rateLimitCountdown > 0}
                  className={styles.scanButton}
                  style={{ padding: '12px 32px', height: 'auto', fontSize: '13.5px' }}
                >
                  {rateLimitCountdown > 0 ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>Rate Limit Locked ({rateLimitCountdown}s)</span>
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>Discovering & Auditing Competitors...</span>
                    </>
                  ) : (
                    <>
                      <LayoutGrid size={16} />
                      <span>Run Competitor AI Audit</span>
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
                        <span>2</span>
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Loader */}
          {loading && (
            <div className={styles.loaderBox} style={{ padding: '60px 40px' }}>
              <Loader2 size={48} className={styles.gearSpinner} />
              <h3 className={styles.loaderHeading}>Crawling Brands & Evaluating LLM Visibility</h3>
              <p className={styles.loaderStep}>Fetching homepages and executing multi-criteria semantic comparison...</p>
              <div className={styles.progressBarWrapper}>
                <div className={styles.progressBarFlow}></div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={20} />
              <div className={styles.errorDetails}>
                <h4 className={styles.errorTitle}>
                  {rateLimitCountdown > 0 ? 'Gemini API Rate Limit Hit' : 'Competitor AI Audit Failed'}
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

          {/* Warning Banner for Mock fallbacks */}
          {matrix && matrix.simulated && (
            <div className={styles.warningBanner}>
              <Info size={18} />
              <span>
                <strong>Demo Mode Active:</strong> No valid `GEMINI_API_KEY` was found or rate limits were reached. Displaying domain-matched mock comparison intelligence details.
              </span>
            </div>
          )}

          {/* Main Matrix comparison Table */}
          {matrix && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} style={{ color: 'var(--primary-blue)' }} />
                <span>AI-First Competitor Benchmarking Matrix</span>
              </h3>
              
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--grey-light)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '16px 20px', width: '22%', fontWeight: '700', color: 'var(--grey-dark)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Comparison Criteria</th>
                      <th style={{ padding: '16px 20px', width: '26%', fontWeight: '700', color: 'var(--primary-blue)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img 
                            src={`https://www.google.com/s2/favicons?domain=${matrix.yourWebsite.domain}&sz=16`}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            style={{ width: '16px', height: '16px', borderRadius: '2px' }}
                            alt=""
                          />
                          <span>{matrix.yourWebsite.domain} (You)</span>
                        </div>
                      </th>
                      {matrix.competitors.map((comp, idx) => (
                        <th key={idx} style={{ padding: '16px 20px', width: '26%', fontWeight: '700', color: 'var(--text-dark)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img 
                              src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=16`}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              style={{ width: '16px', height: '16px', borderRadius: '2px' }}
                              alt=""
                            />
                            <span>{comp.domain}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* AI Trust Score */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(75,97,236,0.02)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} style={{ color: 'var(--success-green)' }} />
                          <span>AI Trust Score</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success-green)' }}>
                            {matrix.yourWebsite.aiTrustScore}%
                          </span>
                          <div style={{ background: 'var(--grey-light)', height: '6px', borderRadius: '3px', width: '120px', overflow: 'hidden' }}>
                            <div style={{ background: 'var(--success-green)', width: `${matrix.yourWebsite.aiTrustScore}%`, height: '100%' }}></div>
                          </div>
                        </div>
                      </td>
                      {matrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '18px', fontWeight: '800', color: comp.aiTrustScore >= 85 ? 'var(--primary-blue)' : 'var(--warning-yellow)' }}>
                              {comp.aiTrustScore}%
                            </span>
                            <div style={{ background: 'var(--grey-light)', height: '6px', borderRadius: '3px', width: '120px', overflow: 'hidden' }}>
                              <div style={{ background: comp.aiTrustScore >= 85 ? 'var(--primary-blue)' : 'var(--warning-yellow)', width: `${comp.aiTrustScore}%`, height: '100%' }}></div>
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Entities */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--grey-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Fingerprint size={16} style={{ color: 'var(--grey-text)' }} />
                          <span>Entities</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-dark)', lineHeight: '1.4' }}>{matrix.yourWebsite.entities}</td>
                      {matrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '16px 20px', color: 'var(--grey-text)', lineHeight: '1.4' }}>{comp.entities}</td>
                      ))}
                    </tr>

                    {/* Authority */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--grey-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Award size={16} style={{ color: 'var(--grey-text)' }} />
                          <span>Authority</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-dark)', fontWeight: '600' }}>{matrix.yourWebsite.authority}</td>
                      {matrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '16px 20px', color: 'var(--grey-text)', fontWeight: '600' }}>{comp.authority}</td>
                      ))}
                    </tr>

                    {/* Topics */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--grey-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Compass size={16} style={{ color: 'var(--grey-text)' }} />
                          <span>Topics</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {matrix.yourWebsite.topics.map((topic, tIdx) => (
                            <li key={tIdx} style={{ color: 'var(--text-dark)' }}>{topic}</li>
                          ))}
                        </ul>
                      </td>
                      {matrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '16px 20px' }}>
                          <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {comp.topics.map((topic, tIdx) => (
                              <li key={tIdx} style={{ color: 'var(--grey-text)' }}>{topic}</li>
                            ))}
                          </ul>
                        </td>
                      ))}
                    </tr>

                    {/* Citations */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--grey-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MessageSquare size={16} style={{ color: 'var(--grey-text)' }} />
                          <span>Citations</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-dark)', lineHeight: '1.4' }}>{matrix.yourWebsite.citations}</td>
                      {matrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '16px 20px', color: 'var(--grey-text)', lineHeight: '1.4' }}>{comp.citations}</td>
                      ))}
                    </tr>

                    {/* Schema */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--grey-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Code size={16} style={{ color: 'var(--grey-text)' }} />
                          <span>Schema Markup</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-dark)', lineHeight: '1.4' }}>{matrix.yourWebsite.schema}</td>
                      {matrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '16px 20px', color: 'var(--grey-text)', lineHeight: '1.4' }}>{comp.schema}</td>
                      ))}
                    </tr>

                    {/* Brand Mentions */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--grey-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MessageSquare size={16} style={{ color: 'var(--grey-text)' }} />
                          <span>Brand Mentions</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-dark)', lineHeight: '1.4' }}>{matrix.yourWebsite.brandMentions}</td>
                      {matrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '16px 20px', color: 'var(--grey-text)', lineHeight: '1.4' }}>{comp.brandMentions}</td>
                      ))}
                    </tr>

                    {/* Prompt Wins */}
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--grey-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Award size={16} style={{ color: 'var(--grey-text)' }} />
                          <span>Prompt Wins</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-dark)', fontWeight: '600' }}>{matrix.yourWebsite.promptWins}</td>
                      {matrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '16px 20px', color: 'var(--grey-text)', fontWeight: '600' }}>{comp.promptWins}</td>
                      ))}
                    </tr>

                    {/* Content Depth */}
                    <tr>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--grey-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} style={{ color: 'var(--grey-text)' }} />
                          <span>Content Depth</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-dark)', lineHeight: '1.4' }}>{matrix.yourWebsite.contentDepth}</td>
                      {matrix.competitors.map((comp, idx) => (
                        <td key={idx} style={{ padding: '16px 20px', color: 'var(--grey-text)', lineHeight: '1.4' }}>{comp.contentDepth}</td>
                      ))}
                    </tr>

                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
