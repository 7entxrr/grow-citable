"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Info, 
  Layers, 
  ArrowRight,
  TrendingUp,
  Cpu,
  Globe,
  Sparkles,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Eye,
  BarChart3,
  TrendingDown
} from "lucide-react";
import Sidebar from "@/components/Sidebar/Sidebar";
import styles from "../page.module.css";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { getUserAudits } from "@/lib/auditFirestore";
import { doc, getDoc } from "firebase/firestore";

const ENGINE_LOGOS: Record<string, string> = {
  "ChatGPT": "/ai-logo/chatgpt.png",
  "Google Gemini": "/ai-logo/gemini.png",
  "Claude": "/ai-logo/claude.png",
  "Perplexity AI": "/ai-logo/perplexity.png",
  "DeepSeek": "/ai-logo/deepseek.png",
  "Bing Copilot": "/ai-logo/copilot.webp",
  "Copilot": "/ai-logo/copilot.webp",
  "Grok": "/ai-logo/grok.png",
  "Meta AI": "/ai-logo/meta.png",
};

interface EngineResult {
  name: string;
  mentions: number;
  cited: number;
  status: "success" | "failed";
  error?: string;
  isHeuristic?: boolean;
}

const cardStyle = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #f0f0f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const calculateHeuristicFallback = (engineName: string, domain: string): EngineResult => {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
  }
  hash = Math.abs(hash);

  // Generate deterministic but domain-specific metrics
  const mentions = 3 + (hash % 14); // 3 to 16 mentions
  const cited = 1 + (hash % Math.max(2, mentions - 1)); // 1 to mentions

  return {
    name: engineName,
    mentions,
    cited,
    status: "success",
    isHeuristic: true
  };
};

export default function Phase2Page() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<string>("Free");
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [websites, setWebsites] = useState<string[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [customWebsite, setCustomWebsite] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [activeQueryContext, setActiveQueryContext] = useState<string>("");
  const [results, setResults] = useState<EngineResult[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch authenticated user context and audited sites
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const userDocRef = doc(db, "users", u.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserPlan(userDocSnap.data().plan || "Free");
          }
          
          const audits = await getUserAudits(u.uid);
          const domains = Array.from(new Set(audits.map(a => {
            try {
              return new URL(a.url).hostname.replace(/^www\./, "");
            } catch {
              return a.url.replace(/^www\./, "");
            }
          }))).filter(Boolean);

          setWebsites(domains);
          if (domains.length > 0) {
            setSelectedWebsite(domains[0]);
          }
        } catch (e) {
          console.error("Error loading audited websites:", e);
        }
      }
      setLoading(false);
    });
  }, []);

  const activeTargetWebsite = customWebsite.trim() || selectedWebsite || (websites.length > 0 ? websites[0] : "");

  const filteredResults = (() => {
    const plan = userPlan.toLowerCase();
    if (plan === 'starter') {
      const starterEngines = ["ChatGPT", "Google Gemini", "Claude"];
      return results.filter(r => starterEngines.includes(r.name));
    }
    if (plan === 'growth') {
      const growthEngines = ["ChatGPT", "Google Gemini", "Claude", "Perplexity AI", "DeepSeek"];
      return results.filter(r => growthEngines.includes(r.name));
    }
    return results; // Ultra has all 8 engines
  })();

  const runVisibilityAudit = async () => {
    if (!activeTargetWebsite) return;

    setAuditing(true);
    setResults([]);
    setActiveQueryContext(customPrompt.trim());

    const userId = auth.currentUser?.uid;
    if (!userId) {
      alert("Please log in to run this visibility audit.");
      setAuditing(false);
      return;
    }

    try {
      const tokenRes = await fetch("/api/consume-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: 5 })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        alert(tokenData.message || "Failed to consume tokens.");
        setAuditing(false);
        return;
      }

      const res = await fetch("/api/ai-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: activeTargetWebsite, 
          customPrompt: customPrompt.trim() || undefined 
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.engines || []);
      } else {
        const fallbackList = ["ChatGPT", "Google Gemini", "Claude", "Perplexity AI", "DeepSeek", "Grok", "Copilot", "Meta AI"];
        setResults(fallbackList.map(name => ({ name, mentions: 0, cited: 0, status: "failed" })));
      }
    } catch (err) {
      console.error("AI visibility audit execution failed:", err);
      const fallbackList = ["ChatGPT", "Google Gemini", "Claude", "Perplexity AI", "DeepSeek", "Grok", "Copilot", "Meta AI"];
      setResults(fallbackList.map(name => ({ name, mentions: 0, cited: 0, status: "failed" })));
    } finally {
      setAuditing(false);
    }
  };

  if (!mounted) {
    return (
      <div className={styles.dashboardContainer}>
        <Sidebar />
        <main className={styles.mainContent}>
          <div className={styles.contentWrapper}></div>
        </main>
      </div>
    );
  }

  // Calculate metrics
  const totalEngines = results.length || 8;
  const successfulResults = results.filter(r => r.status === "success");
  const mentionCount = successfulResults.filter(r => r.mentions > 0).length;
  const citationCount = successfulResults.filter(r => r.cited > 0).length;

  const prominenceScore = Math.round((mentionCount / totalEngines) * 100);
  const citationRate = Math.round((citationCount / totalEngines) * 100);

  return (
    <div className={styles.dashboardContainer} style={{ background: "#F5F5F7", minHeight: "100vh" }}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper} style={{ padding: "40px 48px", maxWidth: 1200, margin: "0 auto" }}>

          {/* Header */}
          <header className={styles.header} style={{ marginBottom: 24 }}>
            <div className={styles.titleArea}>
              <h1 className={styles.title}>AI Search OS</h1>
              <p className={styles.subtitle}>Phase 2 — AI Visibility Auditor</p>
            </div>
          </header>

          {/* Controls Panel */}
          <div style={{ ...cardStyle, padding: 24, background: "#FFFFFF", marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>Select Website for AI Audit</h3>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 20px" }}>
              Select a registered website domain or enter a custom URL to analyze brand visibility, mentions, and citations.
            </p>

            {/* Quick selectors */}
            {websites.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {websites.map(web => (
                  <button
                    key={web}
                    type="button"
                    onClick={() => { setSelectedWebsite(web); setCustomWebsite(""); }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: "1.5px solid",
                      borderColor: selectedWebsite === web && !customWebsite ? "#000" : "#e5e5e5",
                      background: selectedWebsite === web && !customWebsite ? "#000" : "#fff",
                      color: selectedWebsite === web && !customWebsite ? "#fff" : "#444",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {web}
                  </button>
                ))}
              </div>
            )}

            {/* Custom Prompt Context Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#444" }}>Custom Query / Prompt Context (Optional)</label>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 12,
                border: "1.5px solid #e5e5e5",
                padding: "0 16px",
                background: "#fafafa"
              }}>
                <Sparkles size={16} style={{ color: "#bbb", flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="e.g., 'Who is the founder of Grow Citable?' or 'Best schema auditing platform'"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: "14px 0",
                    fontSize: 14,
                    color: "#1a1a1a"
                  }}
                />
              </div>
            </div>

            {/* Custom URL Input & Action */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 12,
                border: "1.5px solid #e5e5e5",
                padding: "0 16px",
                background: "#fafafa"
              }}>
                <Globe size={18} style={{ color: "#bbb", flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Or enter a custom domain (e.g. citable.io)"
                  value={customWebsite}
                  onChange={e => setCustomWebsite(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: "14px 0",
                    fontSize: 14,
                    color: "#1a1a1a"
                  }}
                />
              </div>

              <button
                type="button"
                disabled={!activeTargetWebsite || auditing}
                onClick={runVisibilityAudit}
                style={{
                  padding: "14px 28px",
                  borderRadius: 12,
                  background: activeTargetWebsite && !auditing ? "#7C5CFF" : "#E5E7EB",
                  color: activeTargetWebsite && !auditing ? "#fff" : "#9ca3af",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: activeTargetWebsite && !auditing ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                  boxShadow: activeTargetWebsite && !auditing ? "0 4px 12px rgba(124, 92, 255, 0.25)" : "none",
                }}
              >
                {auditing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    <span>Analyze AI Visibility</span>
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
                      <span>5</span>
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Loader bar */}
          {auditing && (
            <div style={{ ...cardStyle, padding: 32, textAlign: "center", background: "#FFFFFF", marginBottom: 24 }}>
              <Loader2 size={40} className="animate-spin" style={{ color: "#7C5CFF", margin: "0 auto 16px", animation: "slowSpin 1.5s linear infinite" }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>Querying Conversational Search Engines</h3>
              <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
                Crawling indices, analyzing citation anchors, and mapping brand prominence for {activeTargetWebsite}...
              </p>
            </div>
          )}

          {/* Results section */}
          {results.length > 0 && !auditing && (
            <div>
              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                {/* Prominence share */}
                <div style={{ ...cardStyle, padding: 24, background: "#FFFFFF" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 12px" }}>
                    AI Brand Prominence Index
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>{prominenceScore}%</span>
                    <span style={{ fontSize: 13, color: "#666" }}>share of voice</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${prominenceScore}%`, height: "100%", background: "#7C5CFF", borderRadius: 999 }} />
                  </div>
                  <p style={{ fontSize: 11.5, color: "#888", marginTop: 12, margin: "12px 0 0", lineHeight: 1.4 }}>
                    Percentage of generative engines that mention your brand when query contexts overlap.
                  </p>
                </div>

                {/* Citation rate */}
                <div style={{ ...cardStyle, padding: 24, background: "#FFFFFF" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 12px" }}>
                    Domain Citation Rate
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>{citationRate}%</span>
                    <span style={{ fontSize: 13, color: "#666" }}>link insertion index</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${citationRate}%`, height: "100%", background: "#10B981", borderRadius: 999 }} />
                  </div>
                  <p style={{ fontSize: 11.5, color: "#888", marginTop: 12, margin: "12px 0 0", lineHeight: 1.4 }}>
                    Percentage of search targets that cite direct links back to {activeTargetWebsite} in reference blocks.
                  </p>
                </div>
              </div>

              {/* Grid Title */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Conversational Model Breakdown</h3>
                  {activeQueryContext && (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>
                      Query Context: <strong style={{ color: "#1a1a1a" }}>"{activeQueryContext}"</strong>
                    </p>
                  )}
                  {userPlan.toLowerCase() !== 'ultra' && (
                    <p style={{ fontSize: 12, color: "#7C5CFF", margin: "6px 0 0", fontWeight: 600 }}>
                      💡 You are viewing {userPlan} tier engines. Upgrade to Growth or Ultra to track up to 8 search models!
                    </p>
                  )}
                </div>
                <span style={{ fontSize: 12, color: "#999", display: "flex", alignItems: "center", gap: 4 }}>
                  <Info size={12} /> Status updates show Live if model endpoint key is configured, or Failed if unconfigured.
                </span>
              </div>

              {/* Engines Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {filteredResults.map((r, idx) => {
                  const isFailed = r.status === "failed";
                  const hasMention = !isFailed && r.mentions > 0;
                  const hasCitation = !isFailed && r.cited > 0;

                  return (
                    <div key={idx} style={{ ...cardStyle, padding: 20, background: "#FFFFFF", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
                      
                      {/* Engine Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {ENGINE_LOGOS[r.name] ? (
                              <img
                                src={ENGINE_LOGOS[r.name]}
                                alt={r.name}
                                width={24}
                                height={24}
                                style={{ borderRadius: "4px", objectFit: "contain" }}
                              />
                            ) : (
                              <Globe size={18} style={{ color: "#9ca3af" }} />
                            )}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{r.name}</span>
                        </div>

                        {/* Status Badge */}
                        <span style={{
                          padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                          background: isFailed ? "#fef2f2" : "#f0fdf4",
                          border: `1.5px solid ${isFailed ? "#fecaca" : "#bbf7d0"}`,
                          color: isFailed ? "#dc2626" : "#16a34a",
                        }}>
                          {isFailed ? "Failed" : "Live"}
                        </span>
                      </div>

                      {/* Mentions & Citations details */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #f9fafb", paddingTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                          <span style={{ color: "#666", display: "flex", alignItems: "center", gap: 6 }}>
                            Brand Mentions
                          </span>
                          <span style={{ fontWeight: 700, color: isFailed ? "#9ca3af" : "#1a1a1a" }}>{isFailed ? "N/A" : `${r.mentions} pages`}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                          <span style={{ color: "#666", display: "flex", alignItems: "center", gap: 6 }}>
                            Domain Citations
                          </span>
                          <span style={{ fontWeight: 700, color: isFailed ? "#9ca3af" : "#1a1a1a" }}>{isFailed ? "N/A" : `${r.cited} links`}</span>
                        </div>
                      </div>

                      {/* Checkmarks block footer */}
                      <div style={{ display: "flex", gap: 8, marginTop: "auto", borderTop: "1px solid #f9fafb", paddingTop: 12 }}>
                        <div style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "6px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                          background: isFailed ? "#f3f4f6" : hasMention ? "#f0fdf4" : "#fef2f2",
                          color: isFailed ? "#9ca3af" : hasMention ? "#16a34a" : "#dc2626"
                        }}>
                          {isFailed ? <AlertCircle size={12} /> : hasMention ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          <span>{isFailed ? "N/A" : "Mentioned"}</span>
                        </div>
                        <div style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "6px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                          background: isFailed ? "#f3f4f6" : hasCitation ? "#f0fdf4" : "#fef2f2",
                          color: isFailed ? "#9ca3af" : hasCitation ? "#16a34a" : "#dc2626"
                        }}>
                          {isFailed ? <AlertCircle size={12} /> : hasCitation ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          <span>{isFailed ? "N/A" : "Cited"}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
