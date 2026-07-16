'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import styles from '../page.module.css';
import {
    Search,
    Loader2,
    AlertTriangle,
    Info,
    CheckCircle2,
    XCircle,
    Sparkles,
    FileText,
    Copy,
    LayoutGrid,
    TrendingUp,
    BookOpen,
    HelpCircle,
    ShieldCheck,
    Quote
} from 'lucide-react';

import { auth } from '@/lib/firebase';

interface FAQItem {
    question: string;
    answer: string;
}

interface DefinitionItem {
    term: string;
    definition: string;
}

interface QuoteItem {
    quote: string;
    author: string;
}

interface OptimizedContent {
    titles: string[];
    metaSummary: string;
    headingsOutline: string[];
    faqs: FAQItem[];
    specificationTable: string;
    featureLists: string[];
    pros: string[];
    cons: string[];
    definitions: DefinitionItem[];
    examples: string[];
    statistics: string[];
    quotes: QuoteItem[];
    authorBio: string;
    eeatTips: string[];
    detectedNiche?: string;
    simulated?: boolean;
}

export default function Phase5Page() {
    const [urlInput, setUrlInput] = useState('');
    const [nicheInput, setNicheInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [content, setContent] = useState<OptimizedContent | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'markdown'>('preview');
    const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const shouldRetryRef = useRef(false);

    const safeString = (val: any): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
            if ('story' in val) return String(val.story);
            if ('text' in val) return String(val.text);
            if ('title' in val) return String(val.title);
            if ('stat' in val) return String(val.stat);
            if ('value' in val) return String(val.value);
            if ('tip' in val) return String(val.tip);
            if ('con' in val) return String(val.con);
            if ('example' in val) return String(val.example);
            return JSON.stringify(val);
        }
        return String(val);
    };

    const handleRewriteContent = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!urlInput.trim()) return;

        setLoading(true);
        setError(null);
        setContent(null);
        setCopySuccess(null);

        const userId = auth.currentUser?.uid;
        if (!userId) {
            setError("Please log in to run this content rewrite.");
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

            const res = await fetch('/api/content-engineer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: urlInput,
                    niche: nicheInput
                })
            });

            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.error || 'Failed to optimize page content.');
            }

            const data = await res.json();
            setContent(data);
            if (data.detectedNiche) {
                setNicheInput(data.detectedNiche);
            }
        } catch (err: any) {
            console.error('Content engineering error:', err);
            setError(err.message || 'An unexpected error occurred during optimization.');

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
            handleRewriteContent();
        }
    }, [rateLimitCountdown]);

    const compileCompleteMarkdown = (data: OptimizedContent | null): string => {
        if (!data) return '';
        return `# Restructured Landing Page Layout: ${urlInput}

## Optimized Meta Summary
${data.metaSummary || ''}

## Optimized Suggested Title Options
${(Array.isArray(data.titles) ? data.titles : []).map((t, i) => `- Title Option ${i + 1}: ${safeString(t)}`).join('\n')}

---

## Restructured Content Outline
${(Array.isArray(data.headingsOutline) ? data.headingsOutline : []).map(h => `- ${safeString(h)}`).join('\n')}

---

## Key Features & Benefits
${(Array.isArray(data.featureLists) ? data.featureLists : []).map(f => `- ${safeString(f)}`).join('\n')}

---

## Product Specifications & Service Tiers
${data.specificationTable || ''}

---

## Core Advantages (Pros & Cons)
### Pros
${(Array.isArray(data.pros) ? data.pros : []).map(p => `- ${safeString(p)}`).join('\n')}

### Cons
${(Array.isArray(data.cons) ? data.cons : []).map(c => `- ${safeString(c)}`).join('\n')}

---

## Key Industry Definitions
${(Array.isArray(data.definitions) ? data.definitions : []).map(d => `**${d?.term || ''}**: ${d?.definition || ''}`).join('\n\n')}

---

## Real-world Application Examples
${(Array.isArray(data.examples) ? data.examples : []).map(e => `- ${safeString(e)}`).join('\n')}

---

## Authority Metrics & Benchmarks
${(Array.isArray(data.statistics) ? data.statistics : []).map(s => `- ${safeString(s)}`).join('\n')}

---

## Industry Expert Testimonials
${(Array.isArray(data.quotes) ? data.quotes : []).map(q => `> "${q?.quote || ''}"\n> — *${q?.author || ''}*`).join('\n\n')}

---

## Verified Author Credentials (EEAT)
${data.authorBio || ''}

---

## Frequently Asked Questions (FAQ Schema Ready)
${(Array.isArray(data.faqs) ? data.faqs : []).map(f => `### Q: ${f?.question || ''}\n**A:** ${f?.answer || ''}`).join('\n\n')}

---

## EEAT Trust & Quality Recommendations
${(Array.isArray(data.eeatTips) ? data.eeatTips : []).map(t => `- [ ] ${safeString(t)}`).join('\n')}
`;
    };

    const handleCopyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(label);
        setTimeout(() => setCopySuccess(null), 2500);
    };

    const parseAndRenderTable = (markdown: string) => {
        if (!markdown) return null;
        const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
        const rows = lines.filter(l => l.startsWith('|'));

        if (rows.length === 0) {
            return (
                <pre style={{ background: 'var(--grey-light)', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: 'var(--grey-dark)' }}>
                    {markdown}
                </pre>
            );
        }

        const dataRows = rows.filter(r => !r.match(/^[|\s-]+$/));
        if (dataRows.length === 0) return null;

        const parseRow = (row: string) => {
            return row.split('|').map(cell => cell.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        };

        const headers = parseRow(dataRows[0]);
        const bodyRows = dataRows.slice(1).map(r => parseRow(r));

        return (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: 'var(--bg-card)', }}>
                    <thead>
                        <tr style={{ background: 'var(--grey-light)', borderBottom: '2px solid var(--border-color)' }}>
                            {headers.map((h, i) => (
                                <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: 'var(--text-dark)' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {bodyRows.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {row.map((cell, ci) => (
                                    <td key={ci} style={{ padding: '10px 14px', color: 'var(--grey-dark)' }}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
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
                            <p className={styles.subtitle}>Phase 5 — AI Content Engineer (Dynamic SEO & EEAT Rewriter)</p>
                        </div>
                        <div className={styles.headerMeta}>
                            <span className={`${styles.metaBadge} ${content ? '' : styles.metaBadgePending}`}>
                                {content ? 'Content Restructured' : 'Pending Optimization'}
                            </span>
                        </div>
                    </header>

                    {/* Description banner */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(75,97,236,0.06) 0%, rgba(200,80,192,0.04) 100%)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <Sparkles size={24} style={{ color: 'var(--primary-blue)', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)' }}>AI Content Engine Dashboard</h4>
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--grey-text)' }}>
                                Rewrite landing page copy into search-optimized sections tailored for LLM readability. Generates copyable metadata hooks, H1-H3 headers, specs tables, authority statistics, verified bios, and checklist recommendation sheets to boost Experience, Expertise, Authoritativeness, and Trustworthiness.
                            </p>
                        </div>
                    </div>

                    {/* Advanced Proposal Note Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(75,97,236,0.02) 0%, rgba(200,80,192,0.02) 100%)',
                        border: '1px dashed var(--primary-blue)',
                        borderRadius: '12px',
                        padding: '20px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start',
                        marginTop: '16px',
                        boxShadow: 'var(--shadow-xs)'
                    }}>
                        <ShieldCheck size={22} style={{ color: 'var(--primary-blue)', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)' }}>Proposed Agentic Workflow Upgrade</h4>
                            <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.6', color: 'var(--grey-dark)' }}>
                                <strong>Future Extension:</strong> First, the crawler scrapes the web and discovers competitors. Then, it fetches and analyzes all of their pages and FAQ schema nodes. The engine generates 4 to 5 draft response variants that are structurally and semantically more complete than theirs, and selects only the single best version for the final page rewrite.
                            </p>
                        </div>
                    </div>

                    {/* Input Panel */}
                    <section className={styles.scanSection} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-dark)' }}>Optimization Console</h3>
                        <form onSubmit={handleRewriteContent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
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

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label htmlFor="niche-input" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--grey-dark)' }}>Keyword Focus (Optional)</label>
                                    <input
                                        id="niche-input"
                                        type="text"
                                        placeholder="e.g. customer service CRM (will auto-detect if empty)"
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
                                            <span>Optimizing & Structuring Content...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            <span>Generate Optimized Copy</span>
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
                                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Optimization Error</strong>
                                <p style={{ margin: 0, fontSize: '13px' }}>{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Optimized Output section */}
                    {content && (
                        <div style={{ marginTop: '24px' }}>
                            {/* Tab Navigation */}
                            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', paddingBottom: '1px' }}>
                                <button
                                    onClick={() => setActiveTab('preview')}
                                    style={{
                                        padding: '8px 16px',
                                        fontSize: '13.5px',
                                        fontWeight: '700',
                                        border: 'none',
                                        background: 'none',
                                        borderBottom: activeTab === 'preview' ? '2px solid var(--primary-blue)' : 'none',
                                        color: activeTab === 'preview' ? 'var(--primary-blue)' : 'var(--grey-text)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Interactive Preview
                                </button>
                                <button
                                    onClick={() => setActiveTab('markdown')}
                                    style={{
                                        padding: '8px 16px',
                                        fontSize: '13.5px',
                                        fontWeight: '700',
                                        border: 'none',
                                        background: 'none',
                                        borderBottom: activeTab === 'markdown' ? '2px solid var(--primary-blue)' : 'none',
                                        color: activeTab === 'markdown' ? 'var(--primary-blue)' : 'var(--grey-text)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Raw Markdown Code
                                </button>
                            </div>

                            {copySuccess && (
                                <div style={{ background: 'var(--success-green-bg)', color: 'var(--success-green-text)', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', border: '1px solid rgba(46, 196, 182, 0.3)' }}>
                                    <CheckCircle2 size={16} />
                                    <span>Successfully copied {copySuccess} to clipboard!</span>
                                </div>
                            )}

                            {/* Tab Content 1: Rich Interactive Editor Preview */}
                            {activeTab === 'preview' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
                                    {/* Left Column: Restructured Copy Draft */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Meta introduction */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Page Summary & Meta Hook</span>
                                                <button onClick={() => handleCopyText(content.metaSummary, 'Meta Summary')} style={{ border: 'none', background: 'none', color: 'var(--grey-text)', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '11.5px' }}>
                                                    <Copy size={13} /> Copy
                                                </button>
                                            </div>
                                            <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: 'var(--text-dark)', margin: 0 }}>
                                                {content.metaSummary}
                                            </p>
                                        </div>

                                        {/* Specifications table */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase' }}>Data Comparison Specifications Table</span>
                                                <button onClick={() => handleCopyText(content.specificationTable, 'Specification Table')} style={{ border: 'none', background: 'none', color: 'var(--grey-text)', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '11.5px' }}>
                                                    <Copy size={13} /> Copy MD
                                                </button>
                                            </div>
                                            {parseAndRenderTable(content.specificationTable)}
                                        </div>

                                        {/* Features list */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>Key Bullet Features & User Advantages</span>
                                            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {(content.featureLists || []).map((feat, i) => (
                                                    <li key={i} style={{ fontSize: '13.5px', color: 'var(--grey-dark)', lineHeight: '1.5' }}>{feat}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Pros and Cons side-by-side */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            {/* Pros Card */}
                                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #36b37e' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#36b37e', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Core Advantages (Pros)</span>
                                                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {(content.pros || []).map((p, i) => (
                                                        <li key={i} style={{ fontSize: '13px', color: 'var(--grey-dark)' }}>{p}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Cons Card */}
                                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', borderLeft: '4px solid #ff5630' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#ff5630', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Transparent Trade-offs (Cons)</span>
                                                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {(content.cons || []).map((c, i) => (
                                                        <li key={i} style={{ fontSize: '13px', color: 'var(--grey-dark)' }}>{safeString(c)}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Real world examples */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>Practical Use Case Examples</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {(content.examples || []).map((ex, i) => (
                                                    <div key={i} style={{ background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', fontSize: '13px', color: 'var(--grey-dark)', lineHeight: '1.5' }}>
                                                        {safeString(ex)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Schema/Metadata & EEAT checks */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Suggested titles */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Suggested Search Engine Titles (CTR Focus)</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {(Array.isArray(content.titles) ? content.titles : []).map((t, i) => {
                                                    const titleStr = safeString(t);
                                                    return (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>{titleStr}</span>
                                                            <button onClick={() => handleCopyText(titleStr, `Title ${i + 1}`)} style={{ border: 'none', background: 'none', color: 'var(--grey-text)', cursor: 'pointer' }} title="Copy Title">
                                                                <Copy size={13} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* resturctured headings */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Restructured Headings Outline</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {(Array.isArray(content.headingsOutline) ? content.headingsOutline : []).map((heading, i) => {
                                                    const headingStr = safeString(heading);
                                                    const isBold = headingStr.startsWith('H1') || headingStr.startsWith('H2') || headingStr.startsWith('h1') || headingStr.startsWith('h2');
                                                    const isIndent = headingStr.startsWith('H3') || headingStr.startsWith('h3');
                                                    return (
                                                        <div key={i} style={{ fontSize: '13px', fontWeight: isBold ? '700' : '500', color: 'var(--text-dark)', paddingLeft: isIndent ? '16px' : '0' }}>
                                                            {headingStr}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Numerical benchmarks */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>verifiable statistics & benchmarks</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {(Array.isArray(content.statistics) ? content.statistics : []).map((stat, i) => {
                                                    const statStr = safeString(stat);
                                                    return (
                                                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--grey-light)', padding: '10px 14px', borderRadius: '8px' }}>
                                                            <TrendingUp size={16} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                                                            <span style={{ fontSize: '13px', color: 'var(--grey-dark)' }}>{statStr}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Testimonials block */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Expert Testimonials & Citations</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {(content.quotes || []).map((qItem, i) => (
                                                    <blockquote key={i} style={{ margin: 0, paddingLeft: '14px', borderLeft: '3px solid var(--primary-blue)', fontSize: '12.5px', fontStyle: 'italic', color: 'var(--grey-dark)' }}>
                                                        <Quote size={12} style={{ color: 'var(--primary-blue)', display: 'inline', marginRight: '4px', verticalAlign: 'top' }} />
                                                        {qItem.quote}
                                                        <cite style={{ display: 'block', fontStyle: 'normal', fontWeight: '700', fontSize: '11.5px', marginTop: '6px', color: 'var(--text-dark)' }}>
                                                            — {qItem.author}
                                                        </cite>
                                                    </blockquote>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Author bio card */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Suggested Author Credentials (EEAT)</span>
                                            <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--grey-dark)', margin: 0, fontStyle: 'italic' }}>
                                                "{content.authorBio}"
                                            </p>
                                        </div>

                                        {/* Jargon definitions */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Jargon Definitions</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {(content.definitions || []).map((def, i) => (
                                                    <div key={i} style={{ fontSize: '13px', background: 'var(--grey-light)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
                                                        <strong style={{ display: 'block', color: 'var(--text-dark)' }}>{def.term}</strong>
                                                        <span style={{ color: 'var(--grey-text)', fontSize: '12px', display: 'block', marginTop: '4px' }}>{def.definition}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* EEAT Recommendations sheet */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', borderLeft: '4px solid var(--primary-blue)' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Trust & Quality (EEAT) Action Items</span>
                                            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {(content.eeatTips || []).map((tip, i) => (
                                                    <li key={i} style={{ fontSize: '13px', color: 'var(--grey-dark)' }}>{safeString(tip)}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* FAQ Outline list */}
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Frequently Asked Questions (FAQ)</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {(content.faqs || []).map((faq, i) => (
                                                    <div key={i} style={{ fontSize: '13px' }}>
                                                        <strong style={{ display: 'block', color: 'var(--text-dark)' }}>Q: {faq.question}</strong>
                                                        <span style={{ color: 'var(--grey-text)', fontSize: '12.5px', display: 'block', marginTop: '4px', lineHeight: '1.4' }}>A: {faq.answer}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab Content 2: Markdown copy editor */}
                            {activeTab === 'markdown' && (
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-dark)' }}>Complete Restructured Markdown Document</span>
                                        <button
                                            onClick={() => handleCopyText(compileCompleteMarkdown(content), 'Markdown Source')}
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
                                            <span>Copy Markdown</span>
                                        </button>
                                    </div>

                                    <div style={{
                                        width: '100%',
                                        height: '500px',
                                        overflowY: 'auto',
                                        background: '#1e1e2e',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '16px'
                                    }}>
                                        <pre style={{
                                            margin: 0,
                                            fontFamily: 'Consolas, Monaco, monospace',
                                            fontSize: '13px',
                                            lineHeight: '1.65',
                                            color: '#cdd6f4',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all',
                                            userSelect: 'text'
                                        }}>
                                            {compileCompleteMarkdown(content).split('\n').map((line, idx) => {
                                                const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
                                                if (headerMatch) {
                                                    const hashes = headerMatch[1];
                                                    const text = headerMatch[2];
                                                    return (
                                                        <div key={idx} style={{ fontWeight: '700', margin: '6px 0' }}>
                                                            <span style={{ color: '#f38ba8', marginRight: '6px' }}>{hashes}</span>
                                                            <span style={{ color: '#89b4fa' }}>{text}</span>
                                                        </div>
                                                    );
                                                }

                                                if (line.trim() === '---') {
                                                    return (
                                                        <div key={idx} style={{ color: '#f38ba8', fontWeight: '700', opacity: 0.8, margin: '8px 0' }}>
                                                            {line}
                                                        </div>
                                                    );
                                                }

                                                const listMatch = line.match(/^(\s*-\s+)(.*)$/);
                                                if (listMatch) {
                                                    const prefix = listMatch[1];
                                                    const text = listMatch[2];
                                                    return (
                                                        <div key={idx} style={{ paddingLeft: '8px' }}>
                                                            <span style={{ color: '#f9e2af', fontWeight: '700' }}>{prefix}</span>
                                                            <span>{text}</span>
                                                        </div>
                                                    );
                                                }

                                                return <div key={idx}>{line}</div>;
                                            })}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
