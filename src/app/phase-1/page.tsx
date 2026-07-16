"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Globe, AlertTriangle, CheckCircle, XCircle, ArrowUpRight, Loader2, ExternalLink, ChevronRight, BarChart3, FileText, Layers, List, SlidersHorizontal, Lock, Sparkles } from "lucide-react";
import {
  PhasePageShell, FormCard, InfoCard,
  PremiumInput, SubmitButton, ErrorBox, LoadingCard, StatCard, ResultCard,
} from "@/components/PhasePageShell";
import { AnalysisResultsTabs } from "@/components/AnalysisResultsTabs";
import type { AnalysisResult } from "@/types/analysis";
import { auth, db } from "@/lib/firebase";
import { getAuditById, saveAuditToFirestore, getUserAudits, type AuditData } from "@/lib/auditFirestore";
import { Timestamp, doc, getDoc } from "firebase/firestore";

interface AuditCheck {
  name: string;
  status: "good" | "warning" | "poor";
  comment: string;
}

interface CrawledPageItem {
  url: string;
  title: string;
  description: string;
  wordCount: number;
  headings: { [key: string]: number };
  isIndexable: boolean;
  canonical: string;
  canonicalIssue: "ok" | "missing" | "mismatch";
  depth: number;
  status: number;
  thinContent: boolean;
}

interface DuplicateGroup {
  title: string;
  urls: string[];
}

interface AuditResult {
  url: string;
  simulated?: boolean;
  reason?: string;
  crawl: {
    title: string;
    description: string;
    wordCount: number;
    isIndexable: boolean;
    canonicalIssue: string;
    headings: { [key: string]: number };
    linksCount: number;
    internalLinksCount: number;
    externalLinksCount: number;
    crawlDepth: number;
    duplicateContent: string;
    brokenLinks: number;
    totalCrawled: number;
    sitemapUrlsCount: number;
    sitemapValid: boolean;
    sitemapError: string;
    orphanPages: string[];
    duplicateContentList: DuplicateGroup[];
    crawledPagesList: CrawledPageItem[];
  };
  aiReadability: {
    score: number;
    checks: AuditCheck[];
  };
  geo: {
    score: number;
    checks: AuditCheck[];
  };
  aeo: {
    score: number;
    checks: AuditCheck[];
  };
}

const ENGINE_IMG_MAP: Record<string, string> = {
  "ChatGPT": "/ai-logo/chatgpt.png",
  "Claude": "/ai-logo/claude.png",
  "Perplexity AI": "/ai-logo/perplexity.png",
  "Google Gemini": "/ai-logo/gemini.png",
  "DeepSeek": "/ai-logo/deepseek.png",
  "Grok": "/ai-logo/grok.png",
  "Bing Copilot": "/ai-logo/copilot.webp",
  "Meta AI": "/ai-logo/meta ai.png",
};

const ENGINE_PLAYBOOKS: Record<string, { title: string; strategy: string }> = {
  "ChatGPT": {
    title: "OpenAI ChatGPT Optimization",
    strategy: "ChatGPT crawls high-authority technical repositories, tech blogs, and Q&A boards. Focus on publishing guest posts on Medium/Substack, answering questions on Quora/Reddit, and earning backlinks from domain authorities to improve presence."
  },
  "Google Gemini": {
    title: "Google Gemini Optimization",
    strategy: "Gemini is deeply integrated with Google Search and Search Grounding. Ensure your site uses valid schema.org Product/Organization markup, has clean semantic HTML headings, and is actively crawled by Googlebot via Google Search Console."
  },
  "Claude": {
    title: "Anthropic Claude Optimization",
    strategy: "Claude prioritizes clear, structured contexts and authoritative educational materials. Focus on publishing clean FAQ sections, comparative 'alternative-to' guides, and structured tables explaining pricing or specifications."
  },
  "Perplexity AI": {
    title: "Perplexity AI Optimization",
    strategy: "Perplexity answers queries by summarizing real-time search results. Focus on earning citations on review aggregators (G2, Capterra, Yelp) and publishing data-rich blog posts that answer specific 'how-to' user search queries."
  },
};

const s = {
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f0f0f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  chip: (active = false) => ({
    display: "inline-flex" as const,
    alignItems: "center" as const,
    gap: 6,
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    border: active ? "1.5px solid #000" : "1.5px solid #e5e5e5",
    background: active ? "#000" : "transparent",
    color: active ? "#fff" : "#666",
    cursor: "pointer" as const,
    transition: "all 0.15s ease",
  }),
  chipAccent: (active = false, accent = "#D96B43") => ({
    ...s.chip(active),
    border: active ? `1.5px solid ${accent}` : "1.5px solid #e5e5e5",
    background: active ? accent : "transparent",
    color: active ? "#fff" : "#666",
  }),
  stat: {
    padding: "16px 20px",
    borderRadius: 14,
    background: "#f8f9fa",
  },
  divider: {
    height: 1,
    background: "#f0f0f0",
    margin: "16px 0",
  },
};

function StatusBadge({ status }: { status: "good" | "warning" | "poor" }) {
  const colors = { good: "#22c55e", warning: "#f59e0b", poor: "#ef4444" };
  const icons = { good: CheckCircle, warning: AlertTriangle, poor: XCircle };
  const labels = { good: "Pass", warning: "Warn", poor: "Fail" };
  const Icon = icons[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 12, fontWeight: 600, color: colors[status],
    }}>
      <Icon size={14} />
      {labels[status]}
    </span>
  );
}

const PIE_COLORS = ["#7C5CFF", "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#8B5CF6"];

function calcVisibilityScore(data: { name: string; mentions: number; cited: number; status: string }[]): number {
  const MAX_MENTIONS_PER_ENGINE = 10;
  const totalEngines = data.length || 8;
  let sum = 0;
  for (const e of data) {
    if (e.status === "success") {
      const engineScore = Math.min(Math.round((e.mentions / MAX_MENTIONS_PER_ENGINE) * 100), 100);
      sum += engineScore;
    }
  }
  return Math.round(sum / totalEngines);
}

function getScoreRanking(score: number): string {
  if (score >= 81) return "Excellent";
  if (score >= 61) return "Very Good";
  if (score >= 41) return "Good";
  if (score >= 21) return "Average";
  return "Poor";
}

function GaugeChart({ score }: { score: number }) {
  const cx = 100, cy = 120, r = 80;
  const startAngle = 180, endAngle = 360;
  const range = 180;

  function polarToCartesian(centerX: number, centerY: number, radius: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: centerX + radius * Math.cos(rad), y: centerY + radius * Math.sin(rad) };
  }

  function describeArc(fromAngle: number, toAngle: number, radius: number): string {
    const start = polarToCartesian(cx, cy, radius, fromAngle);
    const end = polarToCartesian(cx, cy, radius, toAngle);
    const large = Math.abs(toAngle - fromAngle) > 180 ? 1 : 0;
    const sweep = toAngle > fromAngle ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} ${sweep} ${end.x} ${end.y}`;
  }

  const color = score >= 60 ? "#22C55E" : score >= 30 ? "#F59E0B" : "#EF4444";
  const filledAngle = startAngle + (score / 100) * range;
  const ranking = getScoreRanking(score);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: 200, flexShrink: 0 }}>
      <svg width="200" height="140" viewBox="0 0 200 140">
        {/* Background half circle */}
        <path d={describeArc(startAngle, endAngle, r)} stroke="#F0EDE8" strokeWidth="20" fill="none" strokeLinecap="round" />

        {/* Filled half circle based on score */}
        <path d={describeArc(startAngle, filledAngle, r)} stroke={color} strokeWidth="20" fill="none" strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />

        {/* Score in center */}
        <text x={cx} y={cy - 20} textAnchor="middle" fontSize="32" fontWeight="800" fill="#090A0F">
          {score}
        </text>
        <text x={cx} y={cy} textAnchor="middle" fontSize="11" fontWeight="600" fill="#999">
          Score
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>
          {ranking}
        </text>
      </svg>
    </div>
  );
}

function AiVisibilityDonutChart({ data }: { data: { name: string; mentions: number; cited: number; status: string }[] }) {
  const successCount = data.filter(e => e.status === "success").length;
  const failCount = data.filter(e => e.status === "failed").length;
  const totalMentions = data.reduce((s, e) => s + (e.status === "success" ? e.mentions : 0), 0);
  const totalCited = data.reduce((s, e) => s + (e.status === "success" ? e.cited : 0), 0);

  const totalCount = data.length || 8;
  const successAngle = (successCount / totalCount) * 360;
  const failAngle = (failCount / totalCount) * 360;

  const cx = 100, cy = 100, r = 80;

  function polarToCartesian(centerX: number, centerY: number, radius: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: centerX + radius * Math.cos(rad), y: centerY + radius * Math.sin(rad) };
  }

  function describeArc(startAngle: number, endAngle: number, radius: number): string {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flexShrink: 0 }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {failCount > 0 && (
          <path d={describeArc(successAngle, 360, r)} fill="#F0EDE8" opacity={0.7} />
        )}
        {successCount > 0 && (
          <path d={describeArc(0, successAngle, r)} fill="#090A0F" opacity={0.85} />
        )}
        <circle cx={cx} cy={cy} r={46} fill="#fff" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="28" fontWeight="800" fill="#090A0F">
          {totalMentions}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fontWeight="600" fill="#999">
          Mentions
        </text>
      </svg>
      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#090A0F" }} />
          <span style={{ fontWeight: 600, color: "#333" }}>{successCount}/{totalCount} success</span>
        </div>
        {failCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F0EDE8", border: "1px solid #ddd" }} />
            <span style={{ fontWeight: 600, color: "#bbb" }}>{failCount}/{totalCount} failed</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 20, fontSize: 11, color: "#999", fontWeight: 600 }}>
        <span>{totalCited} total cited</span>
      </div>
    </div>
  );
}

interface BlurredSolutionCardProps {
  title: string;
  description: string;
  solution: string;
  severity: "high" | "medium" | "low";
}

function BlurredSolutionCard({ title, description, solution, severity }: BlurredSolutionCardProps) {
  const router = useRouter();
  const severityColors = {
    high: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "#ef4444" },
    medium: { bg: "#fefce8", border: "#fef08a", text: "#854d0e", icon: "#eab308" },
    low: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", icon: "#22c55e" },
  };

  const colors = severityColors[severity];

  return (
    <div style={{
      padding: "16px 20px",
      borderRadius: 12,
      background: "#fff",
      border: "1px solid #e5e5e5",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Issue Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: colors.bg, border: `1px solid ${colors.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <AlertTriangle size={16} style={{ color: colors.icon }} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>{title}</h4>
          <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.4 }}>{description}</p>
        </div>
        <span style={{
          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: colors.bg, color: colors.text, textTransform: "uppercase",
          flexShrink: 0,
        }}>
          {severity}
        </span>
      </div>

      {/* Blurred Solution Section */}
      <div style={{
        position: "relative",
        padding: "16px",
        borderRadius: 8,
        background: "#f8f9fa",
        border: "1px solid #e5e5e5",
      }}>
        {/* Blurred Content */}
        <div style={{
          filter: "blur(4px)",
          userSelect: "none",
          pointerEvents: "none",
        }}>
          <p style={{ fontSize: 13, color: "#333", margin: "0 0 8px", fontWeight: 600 }}>
            Recommended Solution:
          </p>
          <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.6 }}>
            {solution}
          </p>
        </div>

        {/* Upgrade Overlay */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(2px)",
        }}>
          <Lock size={20} style={{ color: "#999" }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "#333", margin: 0 }}>
            Upgrade to view solution
          </p>
          <button
            onClick={() => router.push('/pricing')}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              background: "#000",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s ease",
            }}
            onMouseOver={e => e.currentTarget.style.background = "#1a1a1a"}
            onMouseOut={e => e.currentTarget.style.background = "#000"}
          >
            View Pricing
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface CompactSolutionRowProps {
  issue: string;
  solution: string;
  severity: "high" | "medium" | "low";
}

function CompactSolutionRow({ issue, solution, severity }: CompactSolutionRowProps) {
  const router = useRouter();
  const severityColors = {
    high: { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444" },
    medium: { bg: "#fefce8", text: "#854d0e", dot: "#eab308" },
    low: { bg: "#f0fdf4", text: "#166534", dot: "#22c55e" },
  };

  const colors = severityColors[severity];

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 12px",
      borderRadius: 6,
      background: "#f8f9fa",
      border: "1px solid #e5e5e5",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Severity indicator */}
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: colors.dot, flexShrink: 0,
      }} />
      
      {/* Issue name */}
      <span style={{
        flex: 1,
        fontSize: 12,
        fontWeight: 600,
        color: "#333",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {issue}
      </span>

      {/* Blurred solution preview */}
      <div style={{
        position: "relative",
        padding: "4px 8px",
        borderRadius: 4,
        background: "#fff",
        border: "1px solid #e5e5e5",
        minWidth: 120,
      }}>
        <div style={{
          filter: "blur(3px)",
          fontSize: 11,
          color: "#666",
          whiteSpace: "nowrap",
          overflow: "hidden",
          userSelect: "none",
          pointerEvents: "none",
        }}>
          {solution.substring(0, 30)}...
        </div>
        
        {/* Compact upgrade overlay */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(1px)",
        }}>
          <Lock size={12} style={{ color: "#999" }} />
          <button
            onClick={() => router.push('/pricing')}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              background: "#000",
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            Upgrade
          </button>
        </div>
      </div>

      {/* Severity badge */}
      <span style={{
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        background: colors.bg,
        color: colors.text,
        textTransform: "uppercase",
        flexShrink: 0,
      }}>
        {severity}
      </span>
    </div>
  );
}

function Phase1Content() {
  const searchParams = useSearchParams();
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [auditData, setAuditData] = useState<AuditResult | null>(null);
  const [analyzeData, setAnalyzeData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"crawl" | "visual">("crawl");
  const [checklistTab, setChecklistTab] = useState<"readability" | "geo" | "aeo">("readability");
  const [showAllOrphans, setShowAllOrphans] = useState(false);
  const [sortBy, setSortBy] = useState<"depth" | "words" | "status">("depth");
  const submittedRef = useRef(false);
  const [aiVisibility, setAiVisibility] = useState<{ name: string; mentions: number; cited: number; status: string; prominence?: "primary" | "secondary" | "neutral"; sources?: { title: string; url: string }[]; error?: string }[] | null>(null);
  const [aiVisLoading, setAiVisLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("Free");
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        try {
          const userDocSnap = await getDoc(doc(db, "users", u.uid));
          if (userDocSnap.exists()) {
            setUserPlan(userDocSnap.data().plan || "Free");
          }
        } catch (e) {
          console.error("Error fetching user plan inside phase 1:", e);
        }
      } else {
        setUserPlan("Free");
      }
    });
    return () => unsubscribe();
  }, []);

  const displayedAiVisibility = (() => {
    if (!aiVisibility) return null;
    const plan = userPlan.toLowerCase();
    
    if (plan === 'free' || plan === 'starter') {
      const allowed = ["ChatGPT", "Google Gemini", "Claude", "Perplexity AI"];
      return aiVisibility.filter(e => allowed.includes(e.name));
    }
    if (plan === 'growth') {
      const allowed = ["ChatGPT", "Google Gemini", "Claude", "Perplexity AI", "DeepSeek"];
      return aiVisibility.filter(e => allowed.includes(e.name));
    }
    return aiVisibility; // Ultra sees all 8 engines
  })();

  useEffect(() => {
    const urlParam = searchParams.get("url");
    const auditIdParam = searchParams.get("auditId");
    
    if (auditIdParam && !submittedRef.current) {
      submittedRef.current = true;
      loadSavedAudit(decodeURIComponent(auditIdParam));
    } else if (urlParam && !submittedRef.current) {
      submittedRef.current = true;
      setUrlInput(urlParam);
      setTimeout(() => {
        const form = document.querySelector("form");
        if (form) form.requestSubmit();
      }, 100);
    }
  }, [searchParams]);

  async function loadSavedAudit(auditId: string) {
    setLoading(true);
    setError(null);
    try {
      const user = await new Promise<any>((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
          unsubscribe();
          resolve(u);
        });
      });
      
      if (!user) {
        setError("You must be logged in to view saved audits.");
        setLoading(false);
        return;
      }
      
      const savedAudit = await getAuditById(user.uid, auditId);
      if (!savedAudit) {
        setError("Saved audit not found. It may have been deleted.");
        setLoading(false);
        return;
      }
      
      const auditResult: AuditResult = {
        url: savedAudit.url,
        crawl: savedAudit.crawl,
        aiReadability: savedAudit.aiReadability,
        geo: savedAudit.geo,
        aeo: savedAudit.aeo,
      };
      
      setAuditData(auditResult);
      
      if (savedAudit.aiVisibility) {
        setAiVisibility(savedAudit.aiVisibility);
      }
      
      setTab("crawl");
    } catch (err: any) {
      setError(err.message || "Failed to load saved audit.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    let formattedUrl = urlInput.trim();
    if (!formattedUrl) return;

    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }
    setUrlInput(formattedUrl);

    setLoading(true); setError(null); setAuditData(null); setAnalyzeData(null); setTab("crawl");

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Please log in to run an audit.");
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const plan = (userDocSnap.exists() ? userDocSnap.data().plan : "Free") || "Free";
      const normalizedPlan = plan.toLowerCase();

      // Get current tracked websites list
      const auditsList = await getUserAudits(currentUser.uid);
      const uniqueDomains = Array.from(new Set(auditsList.map(a => {
        try {
          return new URL(a.url).hostname.replace(/^www\./, "");
        } catch {
          return a.url.replace(/^www\./, "");
        }
      }))).filter(Boolean);

      const targetDomain = (() => {
        try {
          return new URL(formattedUrl).hostname.replace(/^www\./, "");
        } catch {
          return formattedUrl.replace(/^www\./, "");
        }
      })();

      if (!uniqueDomains.includes(targetDomain)) {
        if (normalizedPlan === "free" && uniqueDomains.length >= 1) {
          throw new Error("Free tier is limited to tracking 1 website. Please upgrade to audit more domains.");
        }
        if (normalizedPlan === "starter" && uniqueDomains.length >= 5) {
          throw new Error("Starter tier is limited to tracking 5 websites. Please upgrade to Growth or Ultra to track unlimited domains.");
        }
      }
    } catch (limitErr: any) {
      setError(limitErr.message);
      setLoading(false);
      return;
    }
    const steps = [
      "Resolving host & checking robots.txt...",
      "Validating sitemap structure...",
      "Crawling internal links...",
      "Analyzing page content...",
      "Running AI readability checks...",
      "Compiling audit report...",
    ];
    let i = 0;
    setLoadingStep(steps[0]);
    const si = setInterval(() => { if (i < steps.length - 1) { i++; setLoadingStep(steps[i]); } }, 1500);
    try {
      const [auditRes, analyzeRes, aiVisRes] = await Promise.all([
        fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: formattedUrl }) }),
        fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: formattedUrl }) }).catch(() => null),
        fetch("/api/ai-visibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: formattedUrl }) }).catch(() => null),
      ]);
      clearInterval(si);
      if (!auditRes.ok) { const e = await auditRes.json().catch(() => ({})); throw new Error(e.error || "Audit failed"); }
      const auditResult = await auditRes.json();
      setAuditData(auditResult);
      let aiVisData: { name: string; mentions: number; cited: number; status: string }[] | undefined;
      let analyzeData: AnalysisResult | undefined;
      if (analyzeRes?.ok) {
        analyzeData = await analyzeRes.json();
        setAnalyzeData(analyzeData);
      }
      if (aiVisRes?.ok) {
        const aiData = await aiVisRes.json();
        if (aiData.engines) {
          aiVisData = aiData.engines;
          setAiVisibility(aiData.engines);
        }
      }
      // Save complete audit to Firestore
      const currentUser = auth.currentUser;
      if (currentUser) {
        const firestoreData: AuditData = {
          url: formattedUrl,
          timestamp: Timestamp.now(),
          crawl: auditResult.crawl,
          aiReadability: auditResult.aiReadability,
          geo: auditResult.geo,
          aeo: auditResult.aeo,
          aiVisibility: aiVisData,
          analyzeData,
        };
        saveAuditToFirestore(currentUser.uid, firestoreData).catch((err) =>
          console.error('Failed to save audit to Firestore:', err)
        );
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); setLoadingStep(""); }
  }

  function getStatusIcon(status: "good" | "warning" | "poor") {
    if (status === "good") return <CheckCircle size={16} style={{ color: "#22c55e" }} />;
    if (status === "warning") return <AlertTriangle size={16} style={{ color: "#f59e0b" }} />;
    return <XCircle size={16} style={{ color: "#ef4444" }} />;
  }

  function exportJson() {
    if (!auditData) return;
    const blob = new Blob([JSON.stringify({ crawlAudit: auditData, websiteAnalysis: analyzeData }, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = u; a.download = `audit-${new URL(auditData.url).hostname}.json`; a.click();
    URL.revokeObjectURL(u);
  }

  const pages = auditData?.crawl?.crawledPagesList || [];
  const totalPages = pages.length;
  const indexableCount = pages.filter(p => p.isIndexable).length;
  const nonIndexableCount = totalPages - indexableCount;
  const thinCount = pages.filter(p => p.thinContent).length;
  const brokenCount = auditData?.crawl?.brokenLinks ?? 0;
  const duplicateCount = auditData?.crawl?.duplicateContentList?.length ?? 0;
  const orphanCount = auditData?.crawl?.orphanPages?.length ?? 0;
  const canonicalIssueCount = pages.filter(p => p.canonicalIssue === "missing" || p.canonicalIssue === "mismatch").length;

  const sortedPages = [...pages].sort((a, b) => {
    if (sortBy === "depth") return a.depth - b.depth;
    if (sortBy === "words") return b.wordCount - a.wordCount;
    return a.status - b.status;
  });

  const depth0 = pages.filter(p => p.depth === 0).length;
  const depth1 = pages.filter(p => p.depth === 1).length;
  const depth2 = pages.filter(p => p.depth === 2).length;
  const depth3 = pages.filter(p => p.depth >= 3).length;
  const maxDepth = Math.max(1, depth0, depth1, depth2, depth3);

  return (
    <PhasePageShell
      phase={1} title="Crawl & Discovery"
      badgeLabel="SEO Engine" badgeIcon={<Search size={14} />}
      accentColor="#000"
      hasResults={!!auditData} onExport={exportJson}
    >
      {/* ── Empty State (Input Form) ── */}
      {!auditData && !loading && (
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{
            ...s.card,
            padding: "40px 32px",
            textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "#f5f5f5", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px",
            }}>
              <Search size={24} style={{ color: "#999" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>
              Crawl & Discovery Audit
            </h2>
            <p style={{ fontSize: 14, color: "#888", lineHeight: 1.5, maxWidth: 380, margin: "0 auto 28px" }}>
              Enter a URL to scan sitemaps, check canonicals, detect broken links, and analyze AI readiness.
            </p>
            <form onSubmit={handleAudit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400, margin: "0 auto" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                borderRadius: 12, border: "1.5px solid #e5e5e5",
                padding: "0 16px", background: "#fafafa",
                transition: "border-color 0.2s",
              }}>
                <Globe size={18} style={{ color: "#bbb", flexShrink: 0 }} />
                <input
                  type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    padding: "14px 0", fontSize: 15, color: "#1a1a1a",
                  }}
                />
              </div>
              {error && <ErrorBox message={error} />}
              <button
                type="submit" disabled={loading || !urlInput.trim()}
                style={{
                  padding: "14px 24px", borderRadius: 12,
                  background: loading || !urlInput.trim() ? "#e5e5e5" : "#000",
                  color: loading || !urlInput.trim() ? "#aaa" : "#fff",
                  fontSize: 15, fontWeight: 600, border: "none", cursor: loading || !urlInput.trim() ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {loading ? "Scanning..." : "Start Audit (Free)"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ ...s.card, padding: "60px 32px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {Object.values(ENGINE_IMG_MAP).slice(0, 4).map((src, i) => (
              <img
                key={i}
                src={src}
                alt="AI Engine"
                width="48"
                height="48"
                style={{
                  borderRadius: 12,
                  objectFit: "contain",
                  animation: `float 2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#090A0F", margin: "0 0 4px" }}>{urlInput}</p>
          <p style={{ fontSize: 14, color: "#666", margin: 0 }}>{loadingStep}</p>
          <div style={{ width: "100%", maxWidth: 320, margin: "20px auto 0", height: 4, background: "#F0EDE8", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: "40%", height: "100%", background: "#7C5CFF", borderRadius: 2, animation: "loadingProgress 2s ease-in-out infinite" }} />
          </div>
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes loadingProgress {
              0% { width: 10%; }
              50% { width: 60%; }
              100% { width: 85%; }
            }
          `}</style>
        </div>
      )}

      {/* ── Results ── */}
      {auditData && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ ...s.card, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
                  Target URL
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{auditData.url}</span>
                  <a href={auditData.url} target="_blank" rel="noopener noreferrer" style={{ color: "#bbb", display: "flex" }}>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: auditData.crawl.sitemapValid ? "#f0fdf4" : "#fef2f2",
                  color: auditData.crawl.sitemapValid ? "#16a34a" : "#dc2626",
                }}>
                  {auditData.crawl.sitemapValid ? "Sitemap OK" : "No Sitemap"}
                </span>
                <span style={{
                  padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: "#f8f9fa", color: "#666",
                }}>
                  {auditData.crawl.totalCrawled} pages
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "crawl" as const, label: "Crawl Audit", icon: Search },
              { key: "visual" as const, label: "Visual Analysis", icon: BarChart3 },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  style={s.chipAccent(tab === t.key)}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "crawl" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* AI Visibility Overview — Redesigned */}
              <div style={{ ...s.card, padding: 28 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 20px" }}>
                  AI Search Visibility
                </p>
                {displayedAiVisibility && displayedAiVisibility.length > 0 ? (
                  <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
                    {/* Left: Charts stacked */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
                      {/* Gauge Chart */}
                      <GaugeChart score={calcVisibilityScore(displayedAiVisibility)} />
                      {/* Donut Chart */}
                      <AiVisibilityDonutChart data={displayedAiVisibility} />
                    </div>

                    {/* Right: Engine List */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px 8px", borderBottom: "1px solid #f0f0f0", marginBottom: 4 }}>
                        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Engine</span>
                        <span style={{ minWidth: 64, textAlign: "right", fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mentions</span>
                        <span style={{ minWidth: 50, textAlign: "right", fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cited</span>
                      </div>
                      {displayedAiVisibility.map((engine) => {
                        const isExpanded = expandedEngine === engine.name;
                        const prominenceColors = {
                          primary: { bg: "#DCFCE7", text: "#16A34A", label: "Primary Rec" },
                          secondary: { bg: "#FFEDD5", text: "#EA580C", label: "Alt Mention" },
                          neutral: { bg: "#F3F4F6", text: "#4B5563", label: "Passing Mention" }
                        };
                        const prominence = engine.prominence || "neutral";
                        const badge = prominenceColors[prominence];

                        return (
                          <div key={engine.name} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #f9f9f9" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 12px",
                                borderRadius: 10,
                                cursor: "pointer",
                                transition: "background 0.15s",
                              }}
                              onClick={() => setExpandedEngine(isExpanded ? null : engine.name)}
                              onMouseOver={e => e.currentTarget.style.background = "#F8F9FA"}
                              onMouseOut={e => e.currentTarget.style.background = "transparent"}
                            >
                              <img
                                src={ENGINE_IMG_MAP[engine.name] || ""}
                                alt={engine.name}
                                width="22"
                                height="22"
                                style={{ borderRadius: 5, objectFit: "contain", flexShrink: 0, opacity: engine.status === "success" ? 1 : 0.35 }}
                              />
                              <span style={{
                                flex: 1,
                                fontSize: 13,
                                fontWeight: 600,
                                color: engine.status === "success" ? "#333" : "#bbb",
                                display: "flex",
                                alignItems: "center",
                                gap: 8
                              }}>
                                {engine.name}
                                {engine.status === "success" && (
                                  <span style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: badge.bg,
                                    color: badge.text,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.02em"
                                  }}>
                                    {badge.label}
                                  </span>
                                )}
                              </span>
                              {engine.status === "success" ? (
                                <>
                                  <div style={{
                                    minWidth: 64,
                                    textAlign: "right",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: engine.mentions > 0 ? "#090A0F" : "#ccc"
                                  }}>
                                    {engine.mentions}
                                  </div>
                                  <div style={{
                                    minWidth: 50,
                                    textAlign: "right",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: engine.cited > 0 ? "#090A0F" : "#ccc"
                                  }}>
                                    {engine.cited}
                                  </div>
                                  <span style={{ fontSize: 10, color: "#999", marginLeft: 4 }}>
                                    {isExpanded ? "▲" : "▼"}
                                  </span>
                                </>
                              ) : (
                                <div 
                                   title={engine.error || "Failed to fetch engine data"} 
                                   style={{ display: "flex", alignItems: "center", gap: 6, color: "#ccc", cursor: "help" }}
                                 >
                                   <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                     <line x1="3" y1="3" x2="13" y2="13" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
                                     <line x1="13" y1="3" x2="3" y2="13" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
                                   </svg>
                                   <span style={{ fontSize: 12, fontWeight: 600, color: "#bbb" }}>No data</span>
                                 </div>
                              )}
                            </div>

                            {/* Expandable Cited Sources Panel */}
                            {isExpanded && engine.status === "success" && (
                              <div style={{
                                margin: "2px 12px 10px 46px",
                                padding: "10px 14px",
                                background: "#F9FAFB",
                                borderRadius: 8,
                                borderLeft: "3px solid #090A0F",
                                display: "flex",
                                flexDirection: "column",
                                gap: 6
                              }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Cited Reference Sources ({engine.sources?.length || 0})
                                </span>
                                {engine.sources && engine.sources.length > 0 ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {engine.sources.map((src, i) => (
                                      <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                                        <a
                                          href={src.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#2563eb",
                                            textDecoration: "underline",
                                            wordBreak: "break-all"
                                          }}
                                        >
                                          {src.title}
                                        </a>
                                        <span style={{ fontSize: 10, color: "#777", wordBreak: "break-all" }}>{src.url}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 11, color: "#bbb", fontStyle: "italic" }}>No specific reference pages cited.</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: "#999" }}>
                    No visibility data. Run an audit to see AI engine mentions.
                  </div>
                )}
              </div>

              {/* AI Search Visibility Solution Card */}
              {displayedAiVisibility && displayedAiVisibility.length > 0 && (
                <BlurredSolutionCard
                  title="AI Search Visibility Optimization"
                  description={`Your current AI visibility score is ${calcVisibilityScore(displayedAiVisibility)}. Improve your presence across AI search engines.`}
                  solution="Optimize content for AI engines by implementing structured data, using clear question-answer formats, and creating comprehensive topic clusters. Focus on entity optimization, semantic richness, and authoritative citations. Regularly monitor AI engine performance and adjust content strategy based on mention patterns and citation rates."
                  severity={calcVisibilityScore(displayedAiVisibility) < 50 ? "high" : calcVisibilityScore(displayedAiVisibility) < 75 ? "medium" : "low"}
                />
              )}

              {/* Playbook Cards Container */}
              {displayedAiVisibility && displayedAiVisibility.length > 0 && (
                <div style={{
                  marginTop: 24,
                  padding: "20px 24px",
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #f0f0f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#090A0F", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={16} color="#7C5CFF" />
                    Generative Search Engine Playbooks
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                    {displayedAiVisibility.filter(e => e.status === "success").map((e) => {
                      const playbook = ENGINE_PLAYBOOKS[e.name];
                      if (!playbook) return null;
                      return (
                        <div key={e.name} style={{ padding: 14, background: "#F9FAFB", borderRadius: 12, border: "1px solid #f3f3f3" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#7C5CFF", textTransform: "uppercase", letterSpacing: "0.02em" }}>{e.name}</span>
                          <h5 style={{ fontSize: 13, fontWeight: 700, color: "#333", margin: "4px 0 6px" }}>{playbook.title}</h5>
                          <p style={{ fontSize: 11, color: "#666", lineHeight: 1.5, margin: 0 }}>{playbook.strategy}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stats Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                {[
                  { label: "Pages Crawled", value: totalPages, icon: FileText, color: "#1a1a1a" },
                  { label: "Indexable", value: indexableCount, icon: CheckCircle, color: "#22c55e" },
                  { label: "Broken Links", value: brokenCount, icon: XCircle, color: brokenCount > 0 ? "#ef4444" : "#22c55e" },
                  { label: "Thin Content", value: thinCount, icon: AlertTriangle, color: thinCount > 0 ? "#f59e0b" : "#22c55e" },
                  { label: "Duplicate Titles", value: duplicateCount, icon: Layers, color: duplicateCount > 0 ? "#f59e0b" : "#22c55e" },
                  { label: "Canonical Issues", value: canonicalIssueCount, icon: ExternalLink, color: canonicalIssueCount > 0 ? "#f59e0b" : "#22c55e" },
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} style={s.stat}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <Icon size={14} style={{ color: m.color }} />
                        <span style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{m.label}</span>
                      </div>
                      <span style={{ fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</span>
                    </div>
                  );
                })}
              </div>

              {/* Scores */}
              <div style={{ ...s.card, padding: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
                  Quality Scores
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                  {[
                    { label: "AI Readability", score: auditData.aiReadability.score, color: "#000" },
                    { label: "GEO Citation", score: auditData.geo.score, color: "#2563eb" },
                    { label: "AEO Snippet", score: auditData.aeo.score, color: "#059669" },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>{s.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.score}%</span>
                      </div>
                      <div style={{ height: 4, background: "#f0f0f0", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${s.score}%`, height: "100%", background: s.color, borderRadius: 999, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Crawl Viz & Depth */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ ...s.card, padding: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
                    Indexability
                  </p>
                  <div style={{ height: 10, display: "flex", borderRadius: 999, overflow: "hidden", marginBottom: 12, background: "#f0f0f0" }}>
                    <div style={{ width: `${totalPages ? (indexableCount / totalPages) * 100 : 0}%`, background: "#22c55e", height: "100%", borderRadius: 999 }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                    <span style={{ color: "#22c55e", fontWeight: 600 }}>● Indexable ({indexableCount})</span>
                    <span style={{ color: "#999", fontWeight: 600 }}>● Non-indexable ({nonIndexableCount})</span>
                  </div>
                </div>
                <div style={{ ...s.card, padding: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
                    Crawl Depth
                  </p>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 80 }}>
                    {[
                      { label: "D0", val: depth0 },
                      { label: "D1", val: depth1 },
                      { label: "D2", val: depth2 },
                      { label: "D3+", val: depth3 },
                    ].map(d => {
                      const pct = maxDepth > 0 ? (d.val / maxDepth) * 100 : 0;
                      return (
                        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{d.val}</span>
                          <div style={{ width: "100%", height: `${Math.max(4, pct)}%`, background: "#000", borderRadius: "4px 4px 0 0", minHeight: 4 }} />
                          <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Issues */}
              {(orphanCount > 0 || brokenCount > 0 || duplicateCount > 0) && (
                <div style={{ ...s.card, padding: 24 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
                    Issues Found
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {orphanCount > 0 && (
                      <>
                        <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fefce8", border: "1px solid #fef08a" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <AlertTriangle size={16} style={{ color: "#eab308" }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#854d0e" }}>{orphanCount} Orphan pages detected</span>
                          </div>
                          <p style={{ fontSize: 13, color: "#a16207", margin: "0 0 8px 24px", lineHeight: 1.4 }}>
                            Pages in sitemap with no internal links pointing to them.
                          </p>
                          {(showAllOrphans ? auditData.crawl.orphanPages : auditData.crawl.orphanPages.slice(0, 3)).map((u, i) => (
                            <div key={i} style={{ marginLeft: 24, fontSize: 13, color: "#a16207", fontFamily: "monospace" }}>{u}</div>
                          ))}
                          {auditData.crawl.orphanPages.length > 3 && (
                            <button type="button" onClick={() => setShowAllOrphans(!showAllOrphans)}
                              style={{ marginLeft: 24, background: "none", border: "none", color: "#D96B43", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginTop: 4 }}
                            >
                              {showAllOrphans ? "Show less" : `+${auditData.crawl.orphanPages.length - 3} more`}
                            </button>
                          )}
                        </div>
                        <BlurredSolutionCard
                          title="Orphan Pages Fix"
                          description={`${orphanCount} orphan pages detected in your sitemap that aren't linked internally.`}
                          solution="Implement internal linking strategy by adding contextual links from high-authority pages to orphan pages. Update navigation menus and create topic clusters to ensure all sitemap pages are discoverable through internal link architecture."
                          severity={orphanCount > 5 ? "high" : "medium"}
                        />
                      </>
                    )}
                    {brokenCount > 0 && (
                      <>
                        <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <XCircle size={16} style={{ color: "#ef4444" }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#991b1b" }}>{brokenCount} Broken internal links</span>
                          </div>
                        </div>
                        <BlurredSolutionCard
                          title="Broken Links Resolution"
                          description={`${brokenCount} broken internal links found that hurt user experience and SEO.`}
                          solution="Use automated link checking tools to identify all broken links. Implement 301 redirects to relevant pages or update links to point to live content. Set up monitoring to prevent future broken links from occurring."
                          severity={brokenCount > 10 ? "high" : "medium"}
                        />
                      </>
                    )}
                    {duplicateCount > 0 && auditData.crawl.duplicateContentList.map((d, i) => (
                      <div key={i}>
                        <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fefce8", border: "1px solid #fef08a" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <Layers size={16} style={{ color: "#eab308" }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#854d0e" }}>Duplicate: "{d.title}"</span>
                          </div>
                          {d.urls.map((u, j) => (
                            <div key={j} style={{ marginLeft: 24, fontSize: 12, color: "#a16207" }}>{u}</div>
                          ))}
                        </div>
                        <BlurredSolutionCard
                          title="Duplicate Content Consolidation"
                          description={`${duplicateCount} pages with duplicate title tags affecting search rankings.`}
                          solution="Consolidate duplicate content using canonical tags or 301 redirects to the preferred URL. Rewrite content to make each page unique and valuable. Implement proper URL structure and pagination to avoid duplicate content issues."
                          severity={duplicateCount > 3 ? "high" : "low"}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist Tabs */}
              <div style={{ ...s.card, padding: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
                  AI & Search Engine Checklist
                </p>
                <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                  {(["readability", "geo", "aeo"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setChecklistTab(t)}
                      style={s.chip(checklistTab === t)}
                    >
                      {t === "readability" && "AI Readability"}
                      {t === "geo" && "GEO Check"}
                      {t === "aeo" && "AEO Check"}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(checklistTab === "readability" ? auditData.aiReadability.checks :
                    checklistTab === "geo" ? auditData.geo.checks : auditData.aeo.checks
                  ).map(c => (
                    <div key={c.name} style={{
                      display: "flex", gap: 12, padding: "14px 16px",
                      borderRadius: 12, background: "#fafafa",
                    }}>
                      <div style={{ flexShrink: 0, marginTop: 1 }}>{getStatusIcon(c.status)}</div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>{c.name}</p>
                        <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0", lineHeight: 1.4 }}>{c.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pages Table */}
              <div style={{ ...s.card, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                    Pages ({totalPages})
                  </p>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["depth", "words", "status"] as const).map(s => (
                      <button key={s} type="button" onClick={() => setSortBy(s)}
                        style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: "1px solid", cursor: "pointer",
                          borderColor: sortBy === s ? "#000" : "#e5e5e5",
                          background: sortBy === s ? "#000" : "transparent",
                          color: sortBy === s ? "#fff" : "#888",
                          transition: "all 0.1s ease",
                        }}
                      >
                        {s === "depth" && "Depth"}
                        {s === "words" && "Words"}
                        {s === "status" && "Status"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                        {["Page", "Status", "Depth", "Words", "Index", "Solution"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 12px 8px 0", fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPages.map((p, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f8f8f8" }}>
                          <td style={{ padding: "10px 12px 10px 0", maxWidth: 220 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#2563eb", display: "flex", alignItems: "center", gap: 4 }}>
                                {new URL(p.url).pathname || "/"}
                                <ExternalLink size={10} style={{ flexShrink: 0, color: "#999" }} />
                              </a>
                            </div>
                            <div style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                              {p.title || "—"}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px 10px 0" }}>
                            <span style={{
                              display: "inline-flex", padding: "2px 8px", borderRadius: 6,
                              fontSize: 11, fontWeight: 600,
                              background: p.status === 200 ? "#f0fdf4" : "#fef2f2",
                              color: p.status === 200 ? "#16a34a" : "#dc2626",
                            }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px 10px 0", fontSize: 13, color: "#666", fontWeight: 600 }}>{p.depth}</td>
                          <td style={{ padding: "10px 12px 10px 0", fontSize: 13, color: p.thinContent ? "#d97706" : "#666", fontWeight: p.thinContent ? 700 : 400 }}>
                            {p.wordCount}{p.thinContent ? " (thin)" : ""}
                          </td>
                          <td style={{ padding: "10px 12px 10px 0", fontSize: 13, fontWeight: 600, color: p.isIndexable ? "#16a34a" : "#dc2626" }}>
                            {p.isIndexable ? "Yes" : "No"}
                          </td>
                          <td style={{ padding: "10px 12px 10px 0" }}>
                            {p.thinContent && (
                              <CompactSolutionRow
                                issue="Thin Content"
                                solution="Expand content with comprehensive sections, FAQs, and multimedia elements"
                                severity="medium"
                              />
                            )}
                            {!p.isIndexable && (
                              <CompactSolutionRow
                                issue="No-Index Issue"
                                solution="Review robots meta tags and robots.txt configuration"
                                severity="high"
                              />
                            )}
                            {p.canonicalIssue === "missing" && (
                              <CompactSolutionRow
                                issue="Missing Canonical"
                                solution="Add self-referencing canonical tag to prevent duplicate content issues"
                                severity="medium"
                              />
                            )}
                            {p.canonicalIssue === "mismatch" && (
                              <CompactSolutionRow
                                issue="Canonical Mismatch"
                                solution="Fix canonical tag to point to the preferred URL version"
                                severity="high"
                              />
                            )}
                            {!p.thinContent && p.isIndexable && p.canonicalIssue === "ok" && (
                              <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>✓ OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SEO Recommendations */}
              <div style={{ ...s.card, padding: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
                  Recommendations
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { title: "Duplicate Titles", pass: duplicateCount === 0, desc: duplicateCount > 0 ? `Fix ${duplicateCount} duplicate title tags.` : "All unique." },
                    { title: "Broken Links", pass: brokenCount === 0, desc: brokenCount > 0 ? `Fix ${brokenCount} broken links.` : "No broken links." },
                    { title: "Thin Content", pass: thinCount === 0, desc: thinCount > 0 ? `Expand ${thinCount} thin pages.` : "All pages have sufficient content." },
                    { title: "Canonical Tags", pass: canonicalIssueCount === 0, desc: canonicalIssueCount > 0 ? `Fix ${canonicalIssueCount} canonical issues.` : "All canonical tags correct." },
                  ].map(r => (
                    <div key={r.title} style={{
                      padding: "14px 16px", borderRadius: 12,
                      background: r.pass ? "#f0fdf4" : "#fefce8",
                      border: `1px solid ${r.pass ? "#bbf7d0" : "#fef08a"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        {r.pass ? <CheckCircle size={14} style={{ color: "#22c55e" }} /> : <AlertTriangle size={14} style={{ color: "#eab308" }} />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{r.title}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0", lineHeight: 1.4 }}>{r.desc}</p>
                    </div>
                  ))}
                </div>
                
                {/* Contextual Solution Cards for Thin Content and Canonical Issues */}
                {thinCount > 0 && (
                  <BlurredSolutionCard
                    title="Thin Content Enhancement"
                    description={`${thinCount} pages with insufficient content depth for ranking.`}
                    solution="Expand thin content pages by adding comprehensive sections, FAQs, case studies, and multimedia elements. Conduct content gap analysis to identify missing topics. Target minimum 1000 words for core pages with structured headings and semantic richness."
                    severity={thinCount > 5 ? "high" : "medium"}
                  />
                )}
                {canonicalIssueCount > 0 && (
                  <BlurredSolutionCard
                    title="Canonical Tag Optimization"
                    description={`${canonicalIssueCount} pages with missing or mismatched canonical tags.`}
                    solution="Implement self-referencing canonical tags on all pages. Fix mismatched canonicals to point to the preferred URL version. Use canonical tags to consolidate parameter variations and prevent duplicate content indexing issues."
                    severity={canonicalIssueCount > 3 ? "high" : "medium"}
                  />
                )}
              </div>

              {/* Switch to Visual Analysis */}
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setTab("visual")}
                  style={{
                    background: "#090A0F",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "12px",
                    padding: "14px 32px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "#1a1a1a"}
                  onMouseOut={e => e.currentTarget.style.background = "#090A0F"}
                >
                  Visual Analysis
                  <BarChart3 size={18} />
                </button>
              </div>

            </div>
          )}

          {tab === "visual" && (
            <div>
              {analyzeData ? (
                <AnalysisResultsTabs data={analyzeData} />
              ) : (
                <div style={{ ...s.card, padding: "48px 24px", textAlign: "center" }}>
                  <AlertTriangle size={28} style={{ color: "#eab308", marginBottom: 12 }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px" }}>Visual data unavailable</p>
                  <p style={{ fontSize: 13, color: "#888", margin: 0 }}>The site may have blocked screenshot capture. Try re-scanning.</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </PhasePageShell>
  );
}

export default function Phase1Page() {
  return (
    <Suspense fallback={null}>
      <Phase1Content />
    </Suspense>
  );
}
