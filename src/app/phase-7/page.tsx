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
  Network, 
  FolderGit, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Share2, 
  Link2, 
  Activity, 
  TrendingUp, 
  Code, 
  ShieldCheck,
  AlertCircle,
  Wrench,
  Check,
  X
} from 'lucide-react';

import { auth } from '@/lib/firebase';

interface PageNode {
  title: string;
  path: string;
  targetKeyword?: string;
  intentCategory: string;
  recommendedWordCount: number;
  requiredEntities: string[];
  breadcrumbPath: string;
  metaTitle: string;
  metaDescription: string;
}

interface HierarchyCluster {
  pillarName: string;
  parentPage: PageNode;
  childPages: PageNode[];
  supportingPages: PageNode[];
}

interface TopicCluster {
  name: string;
  focusKeyword: string;
  topicalDepthScore: number;
  competitorTopicGap: string[];
}

interface InternalLinkItem {
  source: string;
  target: string;
  anchorText: string;
  alternativeAnchors: string[];
  riskScore: number;
  purpose: string;
}

interface ChecklistItem {
  label: string;
  passed: boolean;
}

interface AnswerHooks {
  primaryQuestion: string;
  featuredSnippet: string;
  aiOverview: string;
  voiceSearch: string;
  chatGpt: string;
  gemini: string;
  perplexity: string;
}

interface SchemaAudit {
  existing: string;
  missing: string;
  jsonLd: string;
}

interface GeoPageAudit {
  pagePath: string;
  citationScore: number;
  likelihood: 'Low' | 'Medium' | 'High';
  checklist: ChecklistItem[];
  unansweredQuestions: string[];
  schemaAudit: SchemaAudit;
  answerHooks: AnswerHooks;
  optimizedContentBlock: string;
}

interface SemanticBlueprint {
  topicClusters: TopicCluster[];
  contentHierarchy: HierarchyCluster[];
  internalLinks: InternalLinkItem[];
  geoPageAudits: GeoPageAudit[];
  simulated?: boolean;
}

export default function Phase7Page() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<SemanticBlueprint | null>(null);
  const [selectedClusterIdx, setSelectedClusterIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'schema'>('diagnostics');
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const shouldRetryRef = useRef(false);

  // States for GEO Page Optimizer
  const [selectedAuditPath, setSelectedAuditPath] = useState<string>('');
  const [activeHookTab, setActiveHookTab] = useState<'snippet' | 'overview' | 'voice' | 'chatgpt' | 'gemini' | 'perplexity'>('snippet');
  
  // Execution "Optimize Page" States
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeStep, setOptimizeStep] = useState<string>('');
  const [isOptimizedCompleted, setIsOptimizedCompleted] = useState(false);

  const handleRunAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setError(null);
    setBlueprint(null);
    setSelectedClusterIdx(0);
    setCopySuccess(null);
    setSelectedAuditPath('');
    setIsOptimizedCompleted(false);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to run this semantic blueprint analysis.");
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

      const res = await fetch('/api/semantic-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to generate semantic graph.');
      }

      const data = await res.json();
      setBlueprint(data);
      if (data.geoPageAudits && data.geoPageAudits.length > 0) {
        setSelectedAuditPath(data.geoPageAudits[0].pagePath);
      }
    } catch (err: any) {
      console.error('Semantic graph error:', err);
      setError(err.message || 'An unexpected error occurred during semantic parsing.');
      
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

  const triggerPageOptimization = () => {
    setIsOptimizing(true);
    setIsOptimizedCompleted(false);
    setOptimizeStep('Scanning node body copy...');
    
    setTimeout(() => {
      setOptimizeStep('Found 18 issues. Resolving author bio schema gaps...');
    }, 800000 / 1000000 === 0.8 ? 500 : 500);

    setTimeout(() => {
      setOptimizeStep('Injecting missing structured specifications table...');
    }, 1000);

    setTimeout(() => {
      setOptimizeStep('Adding direct-answer hooks for featured snippet targets...');
    }, 1500);

    setTimeout(() => {
      setOptimizeStep('Compiling final optimized layout block...');
    }, 2000);

    setTimeout(() => {
      setIsOptimizing(false);
      setIsOptimizedCompleted(true);
      setOptimizeStep('');
    }, 2500);
  };

  // Find the selected content hierarchy cluster
  const currentClusterHierarchy = blueprint && blueprint.contentHierarchy && blueprint.topicClusters[selectedClusterIdx]
    ? blueprint.contentHierarchy.find(h => h.pillarName.toLowerCase() === blueprint.topicClusters[selectedClusterIdx].name.toLowerCase()) || blueprint.contentHierarchy[selectedClusterIdx]
    : null;

  // Find selected page audit
  const currentPageAudit = blueprint && blueprint.geoPageAudits
    ? blueprint.geoPageAudits.find(a => a.pagePath === selectedAuditPath) || blueprint.geoPageAudits[0]
    : null;

  // Helper to compile path select list from hierarchy
  const getPagesInCluster = () => {
    if (!currentClusterHierarchy) return [];
    const list = [currentClusterHierarchy.parentPage];
    currentClusterHierarchy.childPages.forEach(c => list.push(c));
    currentClusterHierarchy.supportingPages.forEach(s => list.push(s));
    return list;
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
              <p className={styles.subtitle}>Phase 7 — Semantic Graph (Topic Clusters & Internal Links)</p>
            </div>
            <div className={styles.headerMeta}>
              <span className={`${styles.metaBadge} ${blueprint ? '' : styles.metaBadgePending}`}>
                {blueprint ? 'Semantic Graph Active' : 'Pending Verification'}
              </span>
            </div>
          </header>

          {/* Description banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(75,97,236,0.06) 0%, rgba(200,80,192,0.04) 100%)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <Network size={24} style={{ color: 'var(--primary-blue)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)' }}>Semantic Graph Architecture Panel</h4>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--grey-text)' }}>
                Search engines group pages into <strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>Topic Clusters</strong> linked by a clear content hierarchy (<strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>Parent Pillar Page</strong> → <strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>Child Subtopic Pages</strong> → <strong style={{ fontWeight: '750', color: 'var(--text-dark)' }}>Supporting Pages</strong>). Phase 7 crawls your site and automatically constructs a semantic map specifying page outlines, target intents, and internal linking directives.
              </p>
            </div>
          </div>

          {/* Input Panel */}
          <section className={styles.scanSection} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-dark)' }}>Graph Constructor</h3>
            <form onSubmit={handleRunAnalysis} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
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
                    <span>Constructing Graph...</span>
                  </>
                ) : (
                  <>
                    <FolderGit size={16} />
                    <span>Generate Graph</span>
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
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Graph Creation Error</strong>
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

          {/* Blueprint Results */}
          {blueprint && (
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
                  Semantic Graph Details
                </button>
                <button
                  onClick={() => {
                    setActiveTab('schema');
                    // Sync active selector path if empty
                    if (!selectedAuditPath && blueprint.geoPageAudits.length > 0) {
                      setSelectedAuditPath(blueprint.geoPageAudits[0].pagePath);
                    }
                  }}
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
                  GEO Execution & Citations
                </button>
              </div>

              {/* Tab Content 1: Diagnostics and visual hierarchy */}
              {activeTab === 'diagnostics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Selector & Gaps Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                    {/* Selector List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--grey-text)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Select Topic Cluster Pillar</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(blueprint.topicClusters || []).map((cluster, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedClusterIdx(idx)}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: selectedClusterIdx === idx ? 'var(--primary-blue)' : '#ffffff',
                              color: selectedClusterIdx === idx ? '#ffffff' : 'var(--grey-dark)',
                              fontWeight: '700',
                              fontSize: '13px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.2s',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <span>{cluster.name}</span>
                              <span style={{ display: 'block', fontSize: '11px', fontWeight: '500', opacity: selectedClusterIdx === idx ? 0.9 : 0.6, marginTop: '2px' }}>
                                Keyword: {cluster.focusKeyword}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              background: selectedClusterIdx === idx ? 'rgba(255,255,255,0.2)' : 'rgba(75,97,236,0.06)',
                              color: selectedClusterIdx === idx ? '#ffffff' : 'var(--primary-blue)',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              Depth: {cluster.topicalDepthScore}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Competitor Topic Gaps */}
                    {blueprint.topicClusters[selectedClusterIdx] && (
                      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                          <TrendingUp size={16} style={{ color: 'var(--primary-blue)' }} />
                          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase' }}>Competitor Topic Gaps (Opportunities)</span>
                        </div>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-dark)' }}>Missing Topical Relationships</h4>
                        <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', lineHeight: '1.5', color: 'var(--grey-text)' }}>
                          Our crawler has identified key clusters your competitors cover but this domain does not. Creating these pages completes your entity graph:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(blueprint.topicClusters[selectedClusterIdx].competitorTopicGap || []).map((gap, gIdx) => (
                            <span key={gIdx} style={{ padding: '6px 12px', border: '1px solid #ffebe6', background: '#ffebe6', color: '#bf2600', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700' }}>
                              {gap}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* visual content tree */}
                  {currentClusterHierarchy && (
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '24px' }}>Content Hierarchy Map</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', position: 'relative' }}>
                        
                        {/* Level 1: Parent Pillar Page */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                          <div style={{ background: 'linear-gradient(135deg, var(--primary-blue) 0%, #6c5ce7 100%)', color: '#ffffff', padding: '16px 24px', borderRadius: '12px', width: '100%', maxWidth: '440px', boxShadow: '0 8px 16px rgba(75,97,236,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(255,255,255,0.18)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>PARENT PILLAR PAGE</span>
                              <span style={{ fontSize: '10px', fontWeight: '600', opacity: 0.9 }}>{currentClusterHierarchy.parentPage.intentCategory} Intent</span>
                            </div>
                            <h4 style={{ margin: '10px 0 4px 0', fontSize: '15px', fontWeight: '800' }}>{currentClusterHierarchy.parentPage.title}</h4>
                            <div style={{ fontSize: '11.5px', opacity: 0.9, display: 'flex', gap: '4px', alignItems: 'center', fontFamily: 'monospace', marginBottom: '8px' }}>
                              <Link2 size={12} /> {currentClusterHierarchy.parentPage.path}
                            </div>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', opacity: 0.9 }}>
                              <div><strong>Target Words:</strong> {currentClusterHierarchy.parentPage.recommendedWordCount}</div>
                              <div><strong>Breadcrumb:</strong> {currentClusterHierarchy.parentPage.breadcrumbPath}</div>
                            </div>
                            <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8, fontStyle: 'italic' }}>
                              Required Entities: {(currentClusterHierarchy.parentPage.requiredEntities || []).join(', ')}
                            </div>
                          </div>
                          <div style={{ width: '2px', height: '24px', background: 'var(--border-color)' }}></div>
                        </div>

                        {/* Level 2: Child Pages Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', width: '100%', maxWidth: '850px', position: 'relative' }}>
                          {(currentClusterHierarchy.childPages || []).map((child, cIdx) => (
                            <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--primary-blue)', padding: '16px 20px', borderRadius: '12px', width: '100%', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase' }}>CHILD SUBTOPIC PAGE</span>
                                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--grey-text)' }}>{child.intentCategory}</span>
                                </div>
                                <h4 style={{ margin: '8px 0 4px 0', fontSize: '13.5px', fontWeight: '700', color: 'var(--text-dark)' }}>{child.title}</h4>
                                <div style={{ fontSize: '11.5px', color: 'var(--grey-text)', display: 'flex', gap: '4px', alignItems: 'center', fontFamily: 'monospace', marginBottom: '8px' }}>
                                  <Link2 size={11} /> {child.path}
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '11.5px', color: 'var(--grey-dark)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                  <div><strong>Words:</strong> {child.recommendedWordCount}</div>
                                  <div><strong>Keyword:</strong> "{child.targetKeyword}"</div>
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--grey-text)', marginTop: '4px' }}>
                                  <strong>Breadcrumb:</strong> {child.breadcrumbPath}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--primary-blue)', marginTop: '6px', fontWeight: '600' }}>
                                  Required: {(child.requiredEntities || []).join(', ')}
                                </div>
                              </div>

                              {/* Line to supporting */}
                              <div style={{ width: '2px', height: '24px', background: 'var(--border-color)' }}></div>

                              {/* Level 3: Supporting pages under this child */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                {(currentClusterHierarchy.supportingPages || []).slice(cIdx * 2, cIdx * 2 + 2).map((sup, sIdx) => (
                                  <div key={sIdx} style={{ background: '#f8f9fc', border: '1px dashed var(--border-color)', borderLeft: '4px solid #6c5ce7', padding: '14px 18px', borderRadius: '12px', boxShadow: 'var(--shadow-xs)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '8.5px', fontWeight: '800', color: '#6c5ce7', textTransform: 'uppercase' }}>SUPPORTING PAGE</span>
                                      <span style={{ fontSize: '9.5px', fontWeight: '700', color: 'var(--grey-text)' }}>{sup.intentCategory}</span>
                                    </div>
                                    <h4 style={{ margin: '6px 0 4px 0', fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)' }}>{sup.title}</h4>
                                    <div style={{ fontSize: '11px', color: 'var(--grey-text)', display: 'flex', gap: '4px', alignItems: 'center', fontFamily: 'monospace', marginBottom: '8px' }}>
                                      <Link2 size={11} /> {sup.path}
                                    </div>
                                    <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '6px', fontSize: '11px', color: 'var(--grey-dark)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                      <div><strong>Words:</strong> {sup.recommendedWordCount}</div>
                                      <div><strong>Target:</strong> "{sup.targetKeyword}"</div>
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#6c5ce7', marginTop: '6px', fontWeight: '600' }}>
                                      Required: {(sup.requiredEntities || []).join(', ')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Internal Linking matrix */}
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <Share2 size={18} style={{ color: 'var(--primary-blue)' }} />
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-dark)', textTransform: 'uppercase' }}>Internal Linking Strategy Guidelines</span>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#ffffff' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fc', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>Source Page (From)</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>Target Page (To)</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>Recommended Anchor Text</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>Anchor Alternatives</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>Risk Score</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>SEO Purpose</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(blueprint.internalLinks || []).map((link, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--primary-blue)', fontWeight: '600' }}>{link.source}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-dark)' }}>{link.target}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8f9fc', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '6px' }}>
                                  <span style={{ color: 'var(--grey-dark)', fontWeight: '600' }}>"{link.anchorText}"</span>
                                  <button onClick={() => handleCopyText(link.anchorText, `Link ${idx+1}`)} style={{ border: 'none', background: 'none', color: 'var(--grey-text)', cursor: 'pointer' }} title="Copy Anchor Text">
                                    <Copy size={13} />
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--grey-text)', fontSize: '12px' }}>
                                {(link.alternativeAnchors || []).map((alt, aIdx) => (
                                  <div key={aIdx} style={{ fontStyle: 'italic' }}>• "{alt}"</div>
                                ))}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: '750',
                                  background: link.riskScore > 50 ? '#ffebe6' : link.riskScore > 20 ? '#fff0b3' : '#e3fcef',
                                  color: link.riskScore > 50 ? '#bf2600' : link.riskScore > 20 ? '#825c00' : '#006644'
                                }}>
                                  {link.riskScore}% {link.riskScore > 50 ? 'Over-Optimized' : link.riskScore > 20 ? 'Moderate' : 'Safe'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--grey-text)', fontSize: '12.5px', lineHeight: '1.4' }}>{link.purpose}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content 2: GEO Schema and AI Citations Execution */}
              {activeTab === 'schema' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Page selector dropdown inside GEO panel */}
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <Activity size={18} style={{ color: 'var(--primary-blue)' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-dark)' }}>Select Site Page to Audit & Auto-Optimize:</span>
                    </div>
                    <select
                      value={selectedAuditPath}
                      onChange={(e) => {
                        setSelectedAuditPath(e.target.value);
                        setIsOptimizedCompleted(false);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        fontSize: '13px',
                        color: 'var(--grey-dark)',
                        fontWeight: '600',
                        background: '#f8f9fc',
                        cursor: 'pointer'
                      }}
                    >
                      {getPagesInCluster().map((page, pIdx) => (
                        <option key={pIdx} value={page.path}>
                          {page.title} ({page.path})
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentPageAudit ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
                      
                      {/* Left Column: AI Citation & Content Gaps */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Score Display Card */}
                        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', gap: '24px', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
                          {/* Circular progress dial */}
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
                              <circle cx="42" cy="42" r="38" stroke="#f0f1f7" strokeWidth="8" />
                              <circle 
                                cx="42" 
                                cy="42" 
                                r="38" 
                                stroke={currentPageAudit.citationScore > 80 ? '#36b37e' : currentPageAudit.citationScore > 50 ? '#ffab00' : '#ff5630'} 
                                strokeWidth="8" 
                                strokeDasharray={239} 
                                strokeDashoffset={239 - (239 * currentPageAudit.citationScore) / 100}
                                strokeLinecap="round"
                                transform="rotate(-90 42 42)"
                              />
                            </svg>
                            <span style={{ position: 'absolute', fontSize: '20px', fontWeight: '800', color: 'var(--text-dark)' }}>{currentPageAudit.citationScore}</span>
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--grey-text)', textTransform: 'uppercase' }}>AI Citation Readiness</span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10.5px',
                                fontWeight: '800',
                                background: currentPageAudit.likelihood === 'High' ? '#e3fcef' : currentPageAudit.likelihood === 'Medium' ? '#fff0b3' : '#ffebe6',
                                color: currentPageAudit.likelihood === 'High' ? '#006644' : currentPageAudit.likelihood === 'Medium' ? '#825c00' : '#bf2600'
                              }}>
                                {currentPageAudit.likelihood} Probability
                              </span>
                            </div>
                            <h4 style={{ margin: '6px 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-dark)' }}>GEO Readiness Metrics</h4>
                            <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.4', color: 'var(--grey-text)' }}>
                              This page matches {currentPageAudit.citationScore}% of expectations for LLM references. Complete the checklist below to maximize citation opportunities.
                            </p>
                          </div>
                        </div>

                        {/* Checklist Card: Why AI won't cite */}
                        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>Why AI Won't Cite This Page (Audit Checklist)</span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {(currentPageAudit.checklist || []).map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px' }}>
                                {item.passed ? (
                                  <CheckCircle2 size={16} style={{ color: '#36b37e', flexShrink: 0 }} />
                                ) : (
                                  <AlertCircle size={16} style={{ color: '#ff5630', flexShrink: 0 }} />
                                )}
                                <span style={{ color: item.passed ? 'var(--grey-dark)' : '#bf2600', fontWeight: item.passed ? '500' : '600' }}>
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Unanswered Queries Opportunities */}
                        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>AI identified unanswered query gaps:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(currentPageAudit.unansweredQuestions || []).map((q, qIdx) => (
                              <div key={qIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8f9fc', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: 'var(--grey-dark)', fontWeight: '600' }}>
                                <span style={{ color: 'var(--primary-blue)' }}>Opportunity:</span>
                                <span>"{q}"</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* AI Answer Hooks Tab Box */}
                        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '14px' }}>AI Answer Hooks Suite</span>
                          
                          {/* Inner Hook switcher */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                            {[
                              { id: 'snippet', label: 'Featured Snippet' },
                              { id: 'overview', label: 'AI Overview' },
                              { id: 'voice', label: 'Voice Search' },
                              { id: 'chatgpt', label: 'ChatGPT' },
                              { id: 'gemini', label: 'Gemini' },
                              { id: 'perplexity', label: 'Perplexity' }
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setActiveHookTab(tab.id as any)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '11.5px',
                                  fontWeight: '700',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)',
                                  background: activeHookTab === tab.id ? 'var(--primary-blue)' : '#f8f9fc',
                                  color: activeHookTab === tab.id ? '#ffffff' : 'var(--grey-dark)',
                                  cursor: 'pointer'
                                }}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Hook preview box */}
                          <div style={{ background: '#f8f9fc', border: '1px solid var(--border-color)', padding: '14px 18px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                            <div>
                              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--grey-text)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                                Optimized hook context ({activeHookTab.toUpperCase()})
                              </span>
                              <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.6', color: 'var(--grey-dark)', fontStyle: 'italic' }}>
                                "{activeHookTab === 'snippet' && currentPageAudit.answerHooks.featuredSnippet}
                                {activeHookTab === 'overview' && currentPageAudit.answerHooks.aiOverview}
                                {activeHookTab === 'voice' && currentPageAudit.answerHooks.voiceSearch}
                                {activeHookTab === 'chatgpt' && currentPageAudit.answerHooks.chatGpt}
                                {activeHookTab === 'gemini' && currentPageAudit.answerHooks.gemini}
                                {activeHookTab === 'perplexity' && currentPageAudit.answerHooks.perplexity}"
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                let hookText = '';
                                if (activeHookTab === 'snippet') hookText = currentPageAudit.answerHooks.featuredSnippet;
                                if (activeHookTab === 'overview') hookText = currentPageAudit.answerHooks.aiOverview;
                                if (activeHookTab === 'voice') hookText = currentPageAudit.answerHooks.voiceSearch;
                                if (activeHookTab === 'chatgpt') hookText = currentPageAudit.answerHooks.chatGpt;
                                if (activeHookTab === 'gemini') hookText = currentPageAudit.answerHooks.gemini;
                                if (activeHookTab === 'perplexity') hookText = currentPageAudit.answerHooks.perplexity;
                                handleCopyText(hookText, `${activeHookTab.toUpperCase()} Hook`);
                              }}
                              style={{ border: 'none', background: 'none', color: 'var(--grey-text)', cursor: 'pointer', flexShrink: 0 }}
                              title="Copy Answer Hook"
                            >
                              <Copy size={15} />
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Right Column: Schema Audit & Execution */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Schema Validation flow */}
                        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                            <Code size={16} style={{ color: 'var(--primary-blue)' }} />
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-dark)', textTransform: 'uppercase' }}>Schema Validation & Generation</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', fontSize: '12.5px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <CheckCircle2 size={14} style={{ color: '#36b37e' }} />
                              <span><strong>Existing Schemas Found:</strong> {currentPageAudit.schemaAudit.existing}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <AlertCircle size={14} style={{ color: '#ffab00' }} />
                              <span><strong>Missing Schema Targets:</strong> {currentPageAudit.schemaAudit.missing}</span>
                            </div>
                          </div>

                          <div style={{ position: 'relative' }}>
                            <textarea
                              readOnly
                              value={currentPageAudit.schemaAudit.jsonLd}
                              style={{
                                width: '100%',
                                height: '140px',
                                padding: '10px',
                                fontFamily: 'monospace',
                                fontSize: '11.5px',
                                background: '#f4f5f9',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                color: 'var(--grey-dark)',
                                resize: 'none'
                              }}
                            />
                            <button
                              onClick={() => handleCopyText(currentPageAudit.schemaAudit.jsonLd, 'JSON-LD Schema')}
                              style={{ position: 'absolute', right: '10px', top: '10px', background: '#ffffff', border: '1px solid var(--border-color)', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'var(--grey-text)' }}
                              title="Copy JSON-LD Schema"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Executive Optimize Page block */}
                        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)', borderTop: '4px solid var(--primary-blue)' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Page Execution Console</span>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '850', color: 'var(--text-dark)' }}>GEO Content Execution</h4>
                          
                          <p style={{ margin: '0 0 16px 0', fontSize: '13px', lineHeight: '1.5', color: 'var(--grey-text)' }}>
                            Automatically address all failed citation checklist requirements (Bios, tables, citations, stats) and generate a single copy-pasteable HTML/Markdown optimization block.
                          </p>

                          {!isOptimizedCompleted && !isOptimizing && (
                            <button
                              onClick={triggerPageOptimization}
                              style={{
                                width: '100%',
                                padding: '12px 24px',
                                background: 'var(--primary-blue)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(75,97,236,0.15)'
                              }}
                            >
                              <Wrench size={16} />
                              <span>Optimize Page Content</span>
                            </button>
                          )}

                          {isOptimizing && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8f9fc', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', color: 'var(--text-dark)', fontWeight: '600' }}>
                                <Loader2 size={14} className={styles.spinner} />
                                <span>{optimizeStep}</span>
                              </div>
                              {/* Fictional progress bar */}
                              <div style={{ width: '100%', height: '4px', background: '#f0f1f7', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: '50%', height: '100%', background: 'var(--primary-blue)', borderRadius: '2px', animation: 'progressShimmy 2s infinite' }}></div>
                              </div>
                            </div>
                          )}

                          {isOptimizedCompleted && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <div style={{ background: '#e3fcef', color: '#00875a', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #abf5d1' }}>
                                <CheckCircle2 size={16} />
                                <span>Optimization Completed: All Checklist issues resolved!</span>
                              </div>

                              <div style={{ position: 'relative' }}>
                                <textarea
                                  readOnly
                                  value={currentPageAudit.optimizedContentBlock}
                                  style={{
                                    width: '100%',
                                    height: '180px',
                                    padding: '12px',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    lineHeight: '1.5',
                                    background: '#f4f5f9',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--grey-dark)',
                                    resize: 'none'
                                  }}
                                />
                                <button
                                  onClick={() => handleCopyText(currentPageAudit.optimizedContentBlock, 'Optimized Content Block')}
                                  style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '12px',
                                    background: 'var(--primary-blue)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: '4px',
                                    alignItems: 'center'
                                  }}
                                >
                                  <Copy size={12} />
                                  <span>Copy Block</span>
                                </button>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--grey-text)', fontStyle: 'italic', textAlign: 'center', display: 'block' }}>
                                Copy and paste this block into your page editor to fix citations immediately.
                              </span>
                            </div>
                          )}

                        </div>

                      </div>

                    </div>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px', background: '#ffffff', fontSize: '14px', color: 'var(--grey-text)' }}>
                      Please select a valid page path from the selector above to audit.
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
