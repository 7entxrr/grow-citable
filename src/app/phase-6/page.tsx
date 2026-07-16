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
  Database, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Code, 
  LineChart, 
  Activity, 
  Network 
} from 'lucide-react';

import { auth } from '@/lib/firebase';

interface PresentEntityItem {
  entity: string;
  salience: number;
}

interface MissingEntityItem {
  entity: string;
  reason: string;
  suggestedCopy: string;
}

interface KeywordIntentItem {
  query: string;
  requiredEntity: string;
  status: 'connected' | 'broken';
}

interface EntityAnalysis {
  primaryEntityType: string;
  coverageScore: number;
  presentEntities: PresentEntityItem[];
  missingEntities: MissingEntityItem[];
  keywordIntentMap: KeywordIntentItem[];
  jsonLdSchema: string;
  simulated?: boolean;
}

export default function Phase6Page() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<EntityAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'schema'>('diagnostics');
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const shouldRetryRef = useRef(false);

  const handleRunAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setCopySuccess(null);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to run this semantic analysis.");
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

      const res = await fetch('/api/entity-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to complete semantic entity analysis.');
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      console.error('Entity engine error:', err);
      setError(err.message || 'An unexpected error occurred during entity parsing.');
      
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
      handleRunAnalysis();
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
              <p className={styles.subtitle}>Phase 6 — Entity Engine (Knowledge Graph Semantic SEO)</p>
            </div>
            <div className={styles.headerMeta}>
              <span className={`${styles.metaBadge} ${analysis ? '' : styles.metaBadgePending}`}>
                {analysis ? 'Entities Audited' : 'Pending Verification'}
              </span>
            </div>
          </header>

          {/* Description banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(75,97,236,0.06) 0%, rgba(200,80,192,0.04) 100%)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <Database size={24} style={{ color: 'var(--primary-blue)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)' }}>Semantic Entity Audit Dashboard</h4>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--grey-text)' }}>
                Search engines do not index plain text; they map your pages against structured <strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>Entity Graphs</strong>. Phase 6 crawls your page to identify its primary business category, lists present semantic entities, audits missing entity relationships (e.g. Cuisine, Chef, Parking, Dietary restrictions), and generates schema-friendly copy snippets to insert.
              </p>
            </div>
          </div>

          {/* Input Console */}
          <section className={styles.scanSection} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-dark)' }}>Entity Scanner Panel</h3>
            <form onSubmit={handleRunAnalysis} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="url-input" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--grey-dark)' }}>Website URL</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', color: 'var(--grey-text)' }} />
                  <input 
                    id="url-input"
                    type="text" 
                    placeholder="e.g. yourrestaurant.com" 
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
                    <span>Detecting Graph Entities...</span>
                  </>
                ) : (
                  <>
                    <Layers size={16} />
                    <span>Detect Entities</span>
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
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Entity Extraction Error</strong>
                <p style={{ margin: 0, fontSize: '13px' }}>{error}</p>
              </div>
            </div>
          )}

          {copySuccess && (
            <div style={{ background: '#e3fcef', color: '#00875a', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', border: '1px solid #abf5d1' }}>
              <CheckCircle2 size={16} />
              <span>Successfully copied {copySuccess} to clipboard!</span>
            </div>
          )}

          {/* Results Section */}
          {analysis && (
            <div style={{ marginTop: '24px' }}>
              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', paddingBottom: '1px' }}>
                <button
                  onClick={() => setActiveTab('diagnostics')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'diagnostics' ? '2px solid var(--primary-blue)' : 'none',
                    color: activeTab === 'diagnostics' ? 'var(--primary-blue)' : 'var(--grey-text)',
                    cursor: 'pointer'
                  }}
                >
                  Entity Diagnostics
                </button>
                <button
                  onClick={() => setActiveTab('schema')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'schema' ? '2px solid var(--primary-blue)' : 'none',
                    color: activeTab === 'schema' ? 'var(--primary-blue)' : 'var(--grey-text)',
                    cursor: 'pointer'
                  }}
                >
                  JSON-LD Schema Markup
                </button>
              </div>

              {/* Tab Content 1: Diagnostics Panel */}
              {activeTab === 'diagnostics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* KPIs Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                    {/* Coverage Score Dial */}
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--grey-text)', textTransform: 'uppercase', marginBottom: '16px' }}>Entity Coverage Score</span>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                          <circle cx="60" cy="60" r="54" stroke="#f0f1f7" strokeWidth="10" />
                          <circle 
                            cx="60" 
                            cy="60" 
                            r="54" 
                            stroke="var(--primary-blue)" 
                            strokeWidth="10" 
                            strokeDasharray={339} 
                            strokeDashoffset={339 - (339 * analysis.coverageScore) / 100}
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                          />
                        </svg>
                        <span style={{ position: 'absolute', fontSize: '28px', fontWeight: '800', color: 'var(--text-dark)' }}>{analysis.coverageScore}%</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--grey-text)', marginTop: '16px' }}>
                        {analysis.coverageScore >= 80 ? 'Excellent Semantic Coverage' : analysis.coverageScore >= 50 ? 'Moderate Coverage Gaps' : 'Critical Missing Schema Entities'}
                      </span>
                    </div>

                    {/* Primary Entity details */}
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', marginBottom: '8px' }}>Classified Entity Node Type</span>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '22px', fontWeight: '800', color: 'var(--text-dark)' }}>{analysis.primaryEntityType}</h3>
                      <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.6', color: 'var(--grey-text)' }}>
                        Search engines have mapped this domain's target query patterns to the <strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>{analysis.primaryEntityType}</strong> namespace. This mandates the presence of secondary schema properties to satisfy high-intent conversational searches.
                      </p>
                    </div>
                  </div>

                  {/* Visual Node Connection Map */}
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <Network size={18} style={{ color: 'var(--primary-blue)' }} />
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-dark)', textTransform: 'uppercase' }}>Visual Semantic Node Connection Map</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', position: 'relative', width: '100%', maxWidth: '800px' }}>
                        {/* Center Hub */}
                        <div style={{ background: 'linear-gradient(135deg, var(--primary-blue) 0%, #6c5ce7 100%)', color: '#ffffff', padding: '16px 28px', borderRadius: '50px', fontWeight: '800', fontSize: '14.5px', boxShadow: '0 8px 16px rgba(75,97,236,0.2)', textAlign: 'center', border: '2px solid #ffffff', zIndex: 2 }}>
                          {urlInput.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                          <div style={{ fontSize: '11px', fontWeight: '500', opacity: 0.8, marginTop: '2px' }}>{analysis.primaryEntityType}</div>
                        </div>

                        {/* Branches Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', width: '100%', zIndex: 2 }}>
                          {/* Render 3 Present Badges as Green connected nodes */}
                          {(analysis.presentEntities || []).slice(0, 3).map((ent, idx) => (
                            <div key={`p-node-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                              <div style={{ width: '2px', height: '20px', background: '#36b37e' }}></div>
                              <div style={{ border: '2px solid #36b37e', background: '#e3fcef', padding: '10px 12px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '700', color: '#006644', boxShadow: '0 4px 6px rgba(54,179,126,0.1)' }}>
                                {ent.entity}
                                <div style={{ fontSize: '9.5px', fontWeight: '500', color: '#00875a', marginTop: '2px' }}>Connected</div>
                              </div>
                            </div>
                          ))}

                          {/* Render 2 Missing elements as Red broken/pulsing nodes */}
                          {(analysis.missingEntities || []).slice(0, 2).map((opp, idx) => (
                            <div key={`m-node-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                              <div style={{ width: '2px', height: '20px', background: '#ff5630', strokeDasharray: '4' }}></div>
                              <div style={{ border: '2px dashed #ff5630', background: '#ffebe6', padding: '10px 12px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '700', color: '#bf2600', animation: 'pulse 2s infinite', boxShadow: '0 4px 6px rgba(255,86,48,0.1)' }}>
                                {opp.entity}
                                <div style={{ fontSize: '9.5px', fontWeight: '500', color: '#ff5630', marginTop: '2px' }}>Broken Connection</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Columns Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'flex-start' }}>
                    
                    {/* Left Column: Present Entities with Google NLP Salience progress bar */}
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        <Activity size={16} style={{ color: '#36b37e' }} />
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-dark)', textTransform: 'uppercase' }}>Google NLP Salience Audit</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(analysis.presentEntities || []).map((ent, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                              <strong style={{ color: 'var(--text-dark)' }}>{ent.entity}</strong>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-blue)' }}>Salience: {ent.salience.toFixed(2)}</span>
                            </div>
                            {/* Horizontal progress bar */}
                            <div style={{ width: '100%', height: '6px', background: '#f0f1f7', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${ent.salience * 100}%`, height: '100%', background: 'var(--primary-blue)', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        ))}
                        {(!analysis.presentEntities || analysis.presentEntities.length === 0) && (
                          <span style={{ fontSize: '12.5px', color: 'var(--grey-text)', fontStyle: 'italic' }}>No present entities detected.</span>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Missing Entities suggestions list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
                        <AlertCircle size={16} style={{ color: 'var(--primary-blue)' }} />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)' }}>
                          Identified Missing Attributes & Schema Copy Solutions
                        </span>
                      </div>

                      {(analysis.missingEntities || []).map((opp, i) => (
                        <div key={i} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: 'var(--shadow-sm)', borderLeft: '4px solid var(--primary-blue)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-dark)' }}>{opp.entity}</h4>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', background: 'rgba(75,97,236,0.06)', padding: '4px 8px', borderRadius: '4px' }}>MISSING SCHEMA NODE</span>
                          </div>
                          
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--grey-text)', lineHeight: '1.5' }}>
                            <strong>Why engines expect this:</strong> {opp.reason}
                          </p>

                          <div style={{ background: '#f8f9fc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--grey-dark)', fontStyle: 'italic' }}>
                              "{opp.suggestedCopy}"
                            </p>
                            <button 
                              onClick={() => handleCopyText(opp.suggestedCopy, opp.entity)}
                              style={{ border: 'none', background: 'none', color: 'var(--grey-text)', cursor: 'pointer', flexShrink: 0 }}
                              title="Copy Suggested Text"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Keyword intent mapping table */}
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <LineChart size={18} style={{ color: 'var(--primary-blue)' }} />
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-dark)', textTransform: 'uppercase' }}>Keyword-to-Entity Intent Schema Mapping</span>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#ffffff' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fc', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>Target Search Query</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>Required Entity Property</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>Connection Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(analysis.keywordIntentMap || []).map((intent, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 16px', color: 'var(--text-dark)', fontWeight: '600' }}>"{intent.query}"</td>
                              <td style={{ padding: '12px 16px', color: 'var(--grey-dark)' }}>{intent.requiredEntity}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11.5px',
                                  fontWeight: '700',
                                  background: intent.status === 'connected' ? '#e3fcef' : '#ffebe6',
                                  color: intent.status === 'connected' ? '#006644' : '#bf2600'
                                }}>
                                  {intent.status === 'connected' ? 'Connected Graph' : 'Broken Link'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content 2: JSON-LD Schema Code block */}
              {activeTab === 'schema' && (
                <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Code size={18} style={{ color: 'var(--primary-blue)' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-dark)' }}>Dynamic JSON-LD Schema.org Script</span>
                    </div>
                    <button 
                      onClick={() => handleCopyText(analysis.jsonLdSchema, 'JSON-LD Schema')} 
                      style={{ 
                        padding: '8px 20px', 
                        background: 'var(--primary-blue)', 
                        color: '#ffffff', 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '12.5px',
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center'
                      }}
                    >
                      <Copy size={14} />
                      <span>Copy Schema</span>
                    </button>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--grey-text)', marginBottom: '16px', lineHeight: '1.5' }}>
                    Include this script inside your website's header tag (`&lt;head&gt;`) to allow search bots to index your primary business entities and attributes immediately in the local semantic index.
                  </p>

                  <textarea
                    readOnly
                    value={analysis.jsonLdSchema}
                    style={{
                      width: '100%',
                      height: '400px',
                      padding: '16px',
                      fontFamily: 'monospace',
                      fontSize: '12.5px',
                      lineHeight: '1.6',
                      background: '#f4f5f9',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--grey-dark)',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
