"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Globe, AlertTriangle, CheckCircle, XCircle,
  ArrowUpRight, ExternalLink, BarChart3, FileText, Layers, Lock,
  RefreshCw, Sparkles,
} from "lucide-react";
import type { AuditData } from "@/lib/auditFirestore";
import { AnalysisResultsTabs } from "@/components/AnalysisResultsTabs";
import type { AnalysisResult } from "@/types/analysis";

const ENGINE_IMG_MAP: Record<string, string> = {
  "ChatGPT": "/ai-logo/chatgpt.png",
  "Claude": "/ai-logo/claude.png",
  "Perplexity": "/ai-logo/perplexity.png",
  "Perplexity AI": "/ai-logo/perplexity.png",
  "Google Gemini": "/ai-logo/gemini.png",
  "Gemini": "/ai-logo/gemini.png",
  "DeepSeek": "/ai-logo/deepseek.png",
  "Grok": "/ai-logo/grok.png",
  "Copilot": "/ai-logo/copilot.webp",
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
const card = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #f0f0f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const chip = (active = false) => ({
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
});

const chipAccent = (active = false, accent = "#D96B43") => ({
  ...chip(active),
  border: active ? `1.5px solid ${accent}` : "1.5px solid #e5e5e5",
  background: active ? accent : "transparent",
  color: active ? "#fff" : "#666",
});

const stat = {
  padding: "16px 20px",
  borderRadius: 14,
  background: "#f8f9fa",
};

function StatusBadge({ status }: { status: "good" | "warning" | "poor" }) {
  const colors = { good: "#22c55e", warning: "#f59e0b", poor: "#ef4444" };
  const icons = { good: CheckCircle, warning: AlertTriangle, poor: XCircle };
  const labels = { good: "Pass", warning: "Warn", poor: "Fail" };
  const Icon = icons[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: colors[status] }}>
      <Icon size={14} />
      {labels[status]}
    </span>
  );
}

function getScoreRanking(score: number): string {
  if (score >= 81) return "Excellent";
  if (score >= 61) return "Very Good";
  if (score >= 41) return "Good";
  if (score >= 21) return "Average";
  return "Poor";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function GaugeChart({ score }: { score: number }) {
  const cx = 100, cy = 120, r = 80;
  const startAngle = 180, endAngle = 360, range = 180;

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
        <path d={describeArc(startAngle, endAngle, r)} stroke="#F0EDE8" strokeWidth="20" fill="none" strokeLinecap="round" />
        <path d={describeArc(startAngle, filledAngle, r)} stroke={color} strokeWidth="20" fill="none" strokeLinecap="round" />
        <text x={cx} y={cy - 20} textAnchor="middle" fontSize="32" fontWeight="800" fill="#090A0F">{score}</text>
        <text x={cx} y={cy} textAnchor="middle" fontSize="11" fontWeight="600" fill="#999">Score</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{ranking}</text>
      </svg>
    </div>
  );
}

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

function AiVisibilityDonutChart({ data }: { data: { name: string; mentions: number; cited: number; status: string }[] }) {
  const successCount = data.filter(e => e.status === "success").length;
  const failCount = data.filter(e => e.status === "failed").length;
  const totalMentions = data.reduce((s, e) => s + (e.status === "success" ? e.mentions : 0), 0);
  const totalCited = data.reduce((s, e) => s + (e.status === "success" ? e.cited : 0), 0);
  const totalCount = data.length || 8;
  const successAngle = (successCount / totalCount) * 360;
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
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="28" fontWeight="800" fill="#090A0F">{totalMentions}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fontWeight="600" fill="#999">Mentions</text>
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
    <div style={{ padding: "16px 20px", borderRadius: 12, background: "#fff", border: "1px solid #e5e5e5", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.bg, border: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <AlertTriangle size={16} style={{ color: colors.icon }} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>{title}</h4>
          <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.4 }}>{description}</p>
        </div>
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: colors.bg, color: colors.text, textTransform: "uppercase", flexShrink: 0 }}>
          {severity}
        </span>
      </div>
      <div style={{ position: "relative", padding: "16px", borderRadius: 8, background: "#f8f9fa", border: "1px solid #e5e5e5" }}>
        <div style={{ filter: "blur(4px)", userSelect: "none", pointerEvents: "none" }}>
          <p style={{ fontSize: 13, color: "#333", margin: "0 0 8px", fontWeight: 600 }}>Recommended Solution:</p>
          <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.6 }}>{solution}</p>
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(2px)" }}>
          <Lock size={20} style={{ color: "#999" }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "#333", margin: 0 }}>Upgrade to view solution</p>
          <button onClick={() => router.push('/pricing')} style={{ padding: "8px 20px", borderRadius: 8, background: "#000", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            View Pricing
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CompactSolutionRow({ issue, solution, severity }: { issue: string; solution: string; severity: "high" | "medium" | "low" }) {
  const router = useRouter();
  const severityColors = {
    high: { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444" },
    medium: { bg: "#fefce8", text: "#854d0e", dot: "#eab308" },
    low: { bg: "#f0fdf4", text: "#166534", dot: "#22c55e" },
  };
  const colors = severityColors[severity];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 6, background: "#f8f9fa", border: "1px solid #e5e5e5", position: "relative", overflow: "hidden" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.dot, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {issue}
      </span>
      <div style={{ position: "relative", padding: "4px 8px", borderRadius: 4, background: "#fff", border: "1px solid #e5e5e5", minWidth: 120 }}>
        <div style={{ filter: "blur(3px)", fontSize: 11, color: "#666", whiteSpace: "nowrap", overflow: "hidden", userSelect: "none", pointerEvents: "none" }}>
          {solution.substring(0, 30)}...
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(1px)" }}>
          <Lock size={12} style={{ color: "#999" }} />
          <button onClick={() => router.push('/pricing')} style={{ padding: "2px 8px", borderRadius: 4, background: "#000", color: "#fff", fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>
            Upgrade
          </button>
        </div>
      </div>
      <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: colors.bg, color: colors.text, textTransform: "uppercase", flexShrink: 0 }}>
        {severity}
      </span>
    </div>
  );
}

function getStatusIcon(status: "good" | "warning" | "poor") {
  if (status === "good") return <CheckCircle size={16} style={{ color: "#22c55e" }} />;
  if (status === "warning") return <AlertTriangle size={16} style={{ color: "#f59e0b" }} />;
  return <XCircle size={16} style={{ color: "#ef4444" }} />;
}

interface AuditResultsViewProps {
  auditData: AuditData;
  aiVisibility?: Array<{ name: string; mentions: number; cited: number; status: string; prominence?: "primary" | "secondary" | "neutral"; sources?: { title: string; url: string }[]; error?: string }>;
}

export default function AuditResultsView({ auditData, aiVisibility }: AuditResultsViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"crawl" | "visual">("crawl");
  const [checklistTab, setChecklistTab] = useState<"readability" | "geo" | "aeo">("readability");
  const [showAllOrphans, setShowAllOrphans] = useState(false);
  const [sortBy, setSortBy] = useState<"depth" | "words" | "status">("depth");
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  const analyzeData = (auditData as any)?.analyzeData as AnalysisResult | undefined;
  const crawl = auditData?.crawl;
  const pages = crawl?.crawledPagesList || [];
  const totalPages = pages.length;
  const indexableCount = pages.filter(p => p.isIndexable).length;
  const nonIndexableCount = totalPages - indexableCount;
  const thinCount = pages.filter(p => p.thinContent).length;
  const brokenCount = crawl?.brokenLinks ?? 0;
  const duplicateCount = crawl?.duplicateContentList?.length ?? 0;
  const orphanCount = crawl?.orphanPages?.length ?? 0;
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ ...card, padding: "20px 24px" }}>
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
            <span style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: crawl?.sitemapValid ? "#f0fdf4" : "#fef2f2", color: crawl?.sitemapValid ? "#16a34a" : "#dc2626" }}>
              {crawl?.sitemapValid ? "Sitemap OK" : "No Sitemap"}
            </span>
            <span style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#f8f9fa", color: "#666" }}>
              {crawl?.totalCrawled ?? 0} pages
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "crawl" as const, label: "Crawl Audit", icon: Search },
            { key: "visual" as const, label: "Visual Analysis", icon: BarChart3 },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                style={chipAccent(tab === t.key)}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              if (auditData.url) {
                router.push(`/phase-1?url=${encodeURIComponent(auditData.url)}`);
              }
            }}
            style={chipAccent(false, "#7C5CFF")}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "#7C5CFF";
              e.currentTarget.style.background = "rgba(124,92,255,0.05)";
              e.currentTarget.style.color = "#7C5CFF";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "#e5e5e5";
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#666";
            }}
          >
            <RefreshCw size={14} />
            Re Audit
          </button>
        </div>

        {/* Download AI Audit Button */}
        <button
          type="button"
          onClick={async (e) => {
            const buttonEl = e.currentTarget;
            const originalText = buttonEl.innerHTML;
            buttonEl.disabled = true;
            buttonEl.innerHTML = "Generating Card...";
            try {
              // Create canvas element
              const canvas = document.createElement("canvas");
              const scale = 2.5; // Scale factor (e.g. 2.5x) for crystal-clear high-DPI output (2000x2000 px)
              canvas.width = 800 * scale;
              canvas.height = 800 * scale;
              const ctx = canvas.getContext("2d");
              if (!ctx) throw new Error("Could not get canvas context");

              // Scale the context coordinate space to draw in high resolution
              ctx.scale(scale, scale);

              // Enable high quality image smoothing
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";

              // Try to load favicon if available
              let faviconUrl = analyzeData?.meta?.favicon;
              let domainName = "";
              try {
                domainName = new URL(auditData.url).hostname;
              } catch {
                domainName = auditData.url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
              }

              if (faviconUrl) {
                // If it is a relative path, resolve it relative to the target website URL
                if (!faviconUrl.startsWith("http") && !faviconUrl.startsWith("data:")) {
                  try {
                    faviconUrl = new URL(faviconUrl, auditData.url).href;
                  } catch {
                    // ignore
                  }
                }
              }

              // A robust loader helper that chains fallback APIs and proxies them through our API route to bypass CORS
              const loadFavicon = async (): Promise<HTMLImageElement | null> => {
                const getProxyUrl = (url: string) => `/api/favicon?url=${encodeURIComponent(url)}`;

                // Attempt 1: Scraped favicon URL
                if (faviconUrl) {
                  try {
                    return await loadImage(getProxyUrl(faviconUrl));
                  } catch (err) {
                    console.log("Primary favicon proxy failed, trying Fallback 1 (FaviconKit)...");
                  }
                }

                if (domainName) {
                  // Attempt 2: FaviconKit
                  try {
                    const fallbackUrl1 = `https://api.faviconkit.com/${domainName}/64`;
                    return await loadImage(getProxyUrl(fallbackUrl1));
                  } catch (err) {
                    console.log("Fallback 1 proxy failed, trying Fallback 2 (Icon Horse)...");
                    
                    // Attempt 3: Icon Horse
                    try {
                      const fallbackUrl2 = `https://icon.horse/icon/${domainName}`;
                      return await loadImage(getProxyUrl(fallbackUrl2));
                    } catch (err2) {
                      console.log("Fallback 2 proxy failed, trying Fallback 3 (Yandex)...");
                      
                      // Attempt 4: Yandex
                      try {
                        const fallbackUrl3 = `https://favicon.yandex.net/favicon/${domainName}?sz=64`;
                        return await loadImage(getProxyUrl(fallbackUrl3));
                      } catch (err3) {
                        console.log("All favicon proxy attempts failed, using wireframe globe fallback.");
                      }
                    }
                  }
                }
                return null;
              };

              // Load all images in parallel (using crossOrigin anonymous to avoid tainted canvas)
              const [bgImg, chatgptLogo, geminiLogo, claudeLogo, perplexityLogo, faviconImg, appLogo] = await Promise.all([
                loadImage("/colorful-bg.png"),
                loadImage("/ai-logo/chatgpt.png"),
                loadImage("/ai-logo/gemini.png"),
                loadImage("/ai-logo/claude.png"),
                loadImage("/ai-logo/perplexity.png"),
                loadFavicon(),
                loadImage("/favicon/logo.png").catch(() => null)
              ]);

              const logoMap: Record<string, HTMLImageElement> = {
                "ChatGPT": chatgptLogo,
                "Gemini": geminiLogo,
                "Claude": claudeLogo,
                "Perplexity": perplexityLogo
              };

              // Draw colorful background stretched over the canvas
              ctx.drawImage(bgImg, 0, 0, 800, 800);

              // Helper function to draw rounded rect
              const drawRoundedRect = (rx: number, ry: number, rw: number, rh: number, rad: number) => {
                ctx.beginPath();
                ctx.moveTo(rx + rad, ry);
                ctx.lineTo(rx + rw - rad, ry);
                ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
                ctx.lineTo(rx + rw, ry + rh - rad);
                ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
                ctx.lineTo(rx + rad, ry + rh);
                ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
                ctx.lineTo(rx, ry + rad);
                ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
                ctx.closePath();
              };

              // Draw white card in the center with a subtle premium shadow
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
              ctx.shadowBlur = 40;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 12;
              ctx.fillRect(170, 100, 460, 600);

              // Reset shadow for card contents
              ctx.shadowColor = "transparent";
              ctx.shadowBlur = 0;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;

              // Draw website logo (favicon) or fallback to globe wireframe icon
              if (faviconImg) {
                try {
                  ctx.drawImage(faviconImg, 195, 140, 20, 20);
                } catch (err) {
                  console.error("Failed to draw favicon, using globe fallback:", err);
                  drawGlobeFallback();
                }
              } else {
                drawGlobeFallback();
              }

              // Draw app logo on the right side of the row (x = 580, y = 135, size 30x30)
              if (appLogo) {
                try {
                  ctx.drawImage(appLogo, 580, 135, 30, 30);
                } catch (err) {
                  console.error("Failed to draw app logo:", err);
                }
              }

              function drawGlobeFallback() {
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(205, 150, 9, 0, 2 * Math.PI);
                ctx.stroke();
                
                // vertical line
                ctx.beginPath();
                ctx.moveTo(205, 141);
                ctx.lineTo(205, 159);
                ctx.stroke();
                
                // horizontal ellipse
                ctx.beginPath();
                ctx.ellipse(205, 150, 9, 4, 0, 0, 2 * Math.PI);
                ctx.stroke();
                
                // vertical ellipse
                ctx.beginPath();
                ctx.ellipse(205, 150, 4, 9, 0, 0, 2 * Math.PI);
                ctx.stroke();
              }

              // Clean domain/URL string to display
              let displayUrl = auditData.url;
              try {
                // Ensure url has protocol or simplify it
                const urlObj = new URL(displayUrl);
                displayUrl = urlObj.href;
              } catch {
                // Fallback to simple formatting if parsing fails
              }

              // Draw website URL text next to globe icon
              ctx.fillStyle = "#000000";
              ctx.font = "600 16px Kumbh Sans, Inter, sans-serif";
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";

              // Measure and truncate URL to prevent overlap with the app logo on the right
              const maxUrlWidth = 345; // 580 - 222 - 13px padding
              let truncatedUrl = displayUrl;
              if (ctx.measureText(displayUrl).width > maxUrlWidth) {
                while (truncatedUrl.length > 0 && ctx.measureText(truncatedUrl + "...").width > maxUrlWidth) {
                  truncatedUrl = truncatedUrl.slice(0, -1);
                }
                truncatedUrl += "...";
              }
              ctx.fillText(truncatedUrl, 222, 150);

              // Calculate overall AI visibility score and score properties
              const score = calcVisibilityScore(aiVisibility || []);
              const color = score >= 60 ? "#22c55e" : score >= 30 ? "#f59e0b" : "#ef4444";
              
              // Gauge background arc
              ctx.strokeStyle = "#F0EDE8";
              ctx.lineWidth = 15;
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.arc(400, 280, 72, Math.PI, 2 * Math.PI);
              ctx.stroke();

              // Gauge foreground arc
              if (score > 0) {
                const endAngle = Math.PI + (score / 100) * Math.PI;
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.arc(400, 280, 72, Math.PI, endAngle);
                ctx.stroke();
              }

              // Inside Gauge: Score Number
              ctx.fillStyle = "#090A0F";
              ctx.font = "800 40px Kumbh Sans, Inter, sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(score.toString(), 400, 252);

              // Inside Gauge: Label 'Score'
              ctx.fillStyle = "#999999";
              ctx.font = "600 11px Kumbh Sans, Inter, sans-serif";
              ctx.fillText("Score", 400, 276);

              // Inside Gauge: Rating label (e.g. 'Poor')
              ctx.fillStyle = color;
              ctx.font = "700 13px Kumbh Sans, Inter, sans-serif";
              ctx.fillText(getScoreRanking(score), 400, 296);

              // Draw Table Header
              ctx.fillStyle = "#1a1a1a";
              ctx.font = "700 13px Kumbh Sans, Inter, sans-serif";
              
              ctx.textAlign = "left";
              ctx.fillText("AI Engines", 205, 375);
              
              ctx.textAlign = "right";
              ctx.fillText("Mentions", 505, 375);
              ctx.fillText("Cited", 595, 375);

              // Separator Line
              ctx.strokeStyle = "#e5e5e5";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(205, 390);
              ctx.lineTo(595, 390);
              ctx.stroke();

              // Render the 4 requested engines
              const enginesToDraw = [
                { key: "ChatGPT", name: "ChatGPT" },
                { key: "Gemini", name: "Gemini" },
                { key: "Claude", name: "Claude" },
                { key: "Perplexity", name: "Perplexity" }
              ];

              enginesToDraw.forEach((eng, idx) => {
                const rowY = 430 + idx * 52;

                // Find visibility metrics in raw audit data
                const match = aiVisibility?.find(item => 
                  item.name.toLowerCase().includes(eng.key.toLowerCase())
                );
                const mentions = match && match.status === "success" ? match.mentions : 0;
                const cited = match && match.status === "success" ? match.cited : 0;
                const status = match ? match.status : "failed";

                // Draw logo
                const logo = logoMap[eng.key];
                if (logo) {
                  // Draw logo directly with no clipping or rounded corners
                  ctx.drawImage(logo, 205, rowY - 14, 28, 28);
                } else {
                  // Fallback logo square placeholder
                  ctx.fillStyle = "#f0f0f0";
                  ctx.fillRect(205, rowY - 14, 28, 28);
                  ctx.fillStyle = "#999999";
                  ctx.font = "700 11px Kumbh Sans, Inter, sans-serif";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillText(eng.name.charAt(0), 219, rowY);
                  ctx.textBaseline = "alphabetic"; // Restore baseline
                }

                // Draw Engine Name
                ctx.fillStyle = status === "success" ? "#1a1a1a" : "#999999";
                ctx.font = "700 14px Kumbh Sans, Inter, sans-serif";
                ctx.textAlign = "left";
                ctx.fillText(eng.name, 245, rowY);

                if (status === "success") {
                  // Mentions count
                  ctx.fillStyle = mentions > 0 ? "#090A0F" : "#cccccc";
                  ctx.font = "700 14px Kumbh Sans, Inter, sans-serif";
                  ctx.textAlign = "right";
                  ctx.fillText(mentions.toString(), 505, rowY);

                  // Cited count
                  ctx.fillStyle = cited > 0 ? "#090A0F" : "#cccccc";
                  ctx.fillText(cited.toString(), 595, rowY);
                } else {
                  // Default failed / no data state
                  ctx.fillStyle = "#bbbbbb";
                  ctx.font = "600 13px Kumbh Sans, Inter, sans-serif";
                  ctx.textAlign = "right";
                  ctx.fillText("-", 505, rowY);
                  ctx.fillText("-", 595, rowY);
                }

                // Divider line between rows
                if (idx < 3) {
                  ctx.strokeStyle = "#f3f0eb";
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(205, rowY + 26);
                  ctx.lineTo(595, rowY + 26);
                  ctx.stroke();
                }
              });

              // Draw branding signature centered at the bottom of the white card (around y=660)
              if (appLogo) {
                try {
                  ctx.fillStyle = "#8C827A"; // Match --grey-text
                  ctx.font = "600 13px Kumbh Sans, Inter, sans-serif";
                  ctx.textAlign = "left";
                  ctx.textBaseline = "middle";

                  const siteName = "growcitable.com";
                  const textWidth = ctx.measureText(siteName).width;
                  const logoSize = 16;
                  const gapBetween = 6;
                  const totalBrandWidth = logoSize + gapBetween + textWidth;
                  
                  // Calculate starting x to center it in the card (bounds 170 to 630 -> center 400)
                  const startX = 400 - (totalBrandWidth / 2);
                  const brandY = 655; // Centered in the 614-700 space

                  // Draw logo
                  ctx.drawImage(appLogo, startX, brandY - (logoSize / 2), logoSize, logoSize);
                  
                  // Draw text
                  ctx.fillText(siteName, startX + logoSize + gapBetween, brandY);
                } catch (err) {
                  console.error("Failed to draw branding signature:", err);
                }
              }

              // Create download anchor and trigger
              const downloadLink = document.createElement("a");
              let cleanDomain = "domain";
              try {
                cleanDomain = new URL(auditData.url).hostname.replace(/\./g, "_");
              } catch {
                cleanDomain = auditData.url.replace(/[^a-zA-Z0-9]/g, "_");
              }
              downloadLink.download = `ai_visibility_${cleanDomain}.png`;
              downloadLink.href = canvas.toDataURL("image/png");
              document.body.appendChild(downloadLink);
              downloadLink.click();
              downloadLink.remove();

            } catch (err) {
              console.error("Failed to generate audit card image:", err);
              alert("Error generating the image card. Please try again.");
            } finally {
              buttonEl.disabled = false;
              buttonEl.innerHTML = originalText;
            }
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            background: "#D96B43",
            color: "#fff",
            cursor: "pointer",
            border: "1.5px solid #D96B43",
            transition: "all 0.15s ease",
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = "#C05730";
            e.currentTarget.style.borderColor = "#C05730";
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = "#D96B43";
            e.currentTarget.style.borderColor = "#D96B43";
          }}
        >
          <FileText size={14} />
          Download AI Audit
        </button>
      </div>

      {tab === "crawl" && (
        <>

        <div style={{ ...card, padding: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 20px" }}>
          AI Search Visibility
        </p>
        {aiVisibility && aiVisibility.length > 0 ? (
          <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
              <GaugeChart score={calcVisibilityScore(aiVisibility)} />
              <AiVisibilityDonutChart data={aiVisibility} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 250 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px 8px", borderBottom: "1px solid #f0f0f0", marginBottom: 4 }}>
                <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Engine</span>
                <span style={{ minWidth: 64, textAlign: "right", fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mentions</span>
                <span style={{ minWidth: 50, textAlign: "right", fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cited</span>
              </div>
              {aiVisibility.map((engine) => {
                const isExpanded = expandedEngine === engine.name;
                const prominenceColors = {
                  primary: { bg: "#DCFCE7", text: "#16A34A", label: "Primary Rec" },
                  secondary: { bg: "#FFEDD5", text: "#EA580C", label: "Alt Mention" },
                  neutral: { bg: "#F3F4F6", text: "#4B5563", label: "Passing Mention" }
                };
                const prominence = engine.prominence || "neutral";
                const badge = prominenceColors[prominence];
                const imgSrc = ENGINE_IMG_MAP[engine.name];

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
                      {imgSrc ? (
                        <img src={imgSrc} alt={engine.name} width="22" height="22" style={{ borderRadius: 5, objectFit: "contain", flexShrink: 0, opacity: engine.status === "success" ? 1 : 0.35 }} />
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: 5, background: "#f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#999" }}>
                          {engine.name.charAt(0)}
                        </div>
                      )}
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
                          <div style={{ minWidth: 64, textAlign: "right", fontSize: 13, fontWeight: 700, color: engine.mentions > 0 ? "#090A0F" : "#ccc" }}>{engine.mentions}</div>
                          <div style={{ minWidth: 50, textAlign: "right", fontSize: 13, fontWeight: 700, color: engine.cited > 0 ? "#090A0F" : "#ccc" }}>{engine.cited}</div>
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
      {aiVisibility && aiVisibility.length > 0 && (
        <BlurredSolutionCard
          title="AI Search Visibility Optimization"
          description={`Your current AI visibility score is ${calcVisibilityScore(aiVisibility)}. Improve your presence across AI search engines.`}
          solution="Optimize content for AI engines by implementing structured data, using clear question-answer formats, and creating comprehensive topic clusters. Focus on entity optimization, semantic richness, and authoritative citations. Regularly monitor AI engine performance and adjust content strategy based on mention patterns and citation rates."
          severity={calcVisibilityScore(aiVisibility) < 50 ? "high" : calcVisibilityScore(aiVisibility) < 75 ? "medium" : "low"}
        />
      )}

      {/* Playbook Cards Container */}
      {aiVisibility && aiVisibility.length > 0 && (
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
            {aiVisibility.filter(e => e.status === "success").map((e) => {
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
            <div key={m.label} style={stat}>
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
      <div style={{ ...card, padding: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
          Quality Scores
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {[
            { label: "AI Readability", score: auditData?.aiReadability?.score ?? 0, color: "#000" },
            { label: "GEO Citation", score: auditData?.geo?.score ?? 0, color: "#2563eb" },
            { label: "AEO Snippet", score: auditData?.aeo?.score ?? 0, color: "#059669" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.score}%</span>
              </div>
              <div style={{ height: 4, background: "#f0f0f0", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${s.score}%`, height: "100%", background: s.color, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crawl Viz & Depth */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...card, padding: 20 }}>
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
        <div style={{ ...card, padding: 20 }}>
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
        <div style={{ ...card, padding: 24 }}>
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
                  {(showAllOrphans ? crawl?.orphanPages : crawl?.orphanPages?.slice(0, 3))?.map((u: string, i: number) => (
                    <div key={i} style={{ marginLeft: 24, fontSize: 13, color: "#a16207", fontFamily: "monospace" }}>{u}</div>
                  ))}
                  {(crawl?.orphanPages?.length ?? 0) > 3 && (
                    <button type="button" onClick={() => setShowAllOrphans(!showAllOrphans)}
                      style={{ marginLeft: 24, background: "none", border: "none", color: "#D96B43", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginTop: 4 }}>
                      {showAllOrphans ? "Show less" : `+${(crawl?.orphanPages?.length ?? 0) - 3} more`}
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
                  solution="Use automated link checking tools to identify all broken links. Implement 301 redirects to relevant pages or update links to point to live content."
                  severity={brokenCount > 10 ? "high" : "medium"}
                />
              </>
            )}
            {duplicateCount > 0 && crawl?.duplicateContentList?.map((d: { title: string; urls: string[] }, i: number) => (
              <div key={i}>
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fefce8", border: "1px solid #fef08a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Layers size={16} style={{ color: "#eab308" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#854d0e" }}>Duplicate: "{d.title}"</span>
                  </div>
                  {d.urls.map((u: string, j: number) => (
                    <div key={j} style={{ marginLeft: 24, fontSize: 12, color: "#a16207" }}>{u}</div>
                  ))}
                </div>
                <BlurredSolutionCard
                  title="Duplicate Content Consolidation"
                  description={`${duplicateCount} pages with duplicate title tags affecting search rankings.`}
                  solution="Consolidate duplicate content using canonical tags or 301 redirects to the preferred URL. Rewrite content to make each page unique."
                  severity={duplicateCount > 3 ? "high" : "low"}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div style={{ ...card, padding: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>
          AI & Search Engine Checklist
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {(["readability", "geo", "aeo"] as const).map(t => (
            <button key={t} type="button" onClick={() => setChecklistTab(t)} style={chip(checklistTab === t)}>
              {t === "readability" && "AI Readability"}
              {t === "geo" && "GEO Check"}
              {t === "aeo" && "AEO Check"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(checklistTab === "readability" ? auditData?.aiReadability?.checks :
            checklistTab === "geo" ? auditData?.geo?.checks : auditData?.aeo?.checks
          )?.map((c: { name: string; status: "good" | "warning" | "poor"; comment: string }) => (
            <div key={c.name} style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12, background: "#fafafa" }}>
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
      <div style={{ ...card, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
            Pages ({totalPages})
          </p>
          <div style={{ display: "flex", gap: 4 }}>
            {(["depth", "words", "status"] as const).map(s => (
              <button key={s} type="button" onClick={() => setSortBy(s)} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: "1px solid", cursor: "pointer",
                borderColor: sortBy === s ? "#000" : "#e5e5e5",
                background: sortBy === s ? "#000" : "transparent",
                color: sortBy === s ? "#fff" : "#888",
              }}>
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
              {sortedPages.map((p: any, i: number) => (
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
                    <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: p.status === 200 ? "#f0fdf4" : "#fef2f2", color: p.status === 200 ? "#16a34a" : "#dc2626" }}>
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
                    {p.thinContent && <CompactSolutionRow issue="Thin Content" solution="Expand content with comprehensive sections, FAQs, and multimedia elements" severity="medium" />}
                    {!p.isIndexable && <CompactSolutionRow issue="No-Index Issue" solution="Review robots meta tags and robots.txt configuration" severity="high" />}
                    {p.canonicalIssue === "missing" && <CompactSolutionRow issue="Missing Canonical" solution="Add self-referencing canonical tag to prevent duplicate content issues" severity="medium" />}
                    {p.canonicalIssue === "mismatch" && <CompactSolutionRow issue="Canonical Mismatch" solution="Fix canonical tag to point to the preferred URL version" severity="high" />}
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

      {/* Recommendations */}
      <div style={{ ...card, padding: 24 }}>
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
            <div key={r.title} style={{ padding: "14px 16px", borderRadius: 12, background: r.pass ? "#f0fdf4" : "#fefce8", border: `1px solid ${r.pass ? "#bbf7d0" : "#fef08a"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                {r.pass ? <CheckCircle size={14} style={{ color: "#22c55e" }} /> : <AlertTriangle size={14} style={{ color: "#eab308" }} />}
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{r.title}</span>
              </div>
              <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0", lineHeight: 1.4 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        {thinCount > 0 && (
          <BlurredSolutionCard
            title="Thin Content Enhancement"
            description={`${thinCount} pages with insufficient content depth for ranking.`}
            solution="Expand thin content pages by adding comprehensive sections, FAQs, case studies, and multimedia elements."
            severity={thinCount > 5 ? "high" : "medium"}
          />
        )}
        {canonicalIssueCount > 0 && (
          <BlurredSolutionCard
            title="Canonical Tag Optimization"
            description={`${canonicalIssueCount} pages with missing or mismatched canonical tags.`}
            solution="Implement self-referencing canonical tags on all pages. Fix mismatched canonicals to point to the preferred URL version."
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
      </>)}

      {tab === "visual" && (
        <div>
          {analyzeData ? (
            <AnalysisResultsTabs data={analyzeData} />
          ) : (
            <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
              <AlertTriangle size={28} style={{ color: "#eab308", marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px" }}>Visual data unavailable</p>
              <p style={{ fontSize: 13, color: "#888", margin: 0 }}>The site may have blocked screenshot capture. Try re-scanning.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
