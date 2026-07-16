"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/lib/useAuthGuard";
import Sidebar from "@/components/Sidebar/Sidebar";
import styles from "../page.module.css";
import {
  Search,
  Globe,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getUserAudits, AuditData } from "@/lib/auditFirestore";
import AuditResultsView from "@/components/AuditResultsView";

function validateAndCleanDomain(input: string): { cleaned: string | null; error: string | null } {
  let d = input.trim();
  if (!d) return { cleaned: null, error: "Please enter a domain." };

  const domainRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})(\/[^\s]*)?$/i;
  if (!domainRegex.test(d)) {
    return { cleaned: null, error: "Enter a valid domain like: growcitable.com, www.growcitable.com, or https://growcitable.com" };
  }

  d = d.toLowerCase();
  d = d.replace(/^(https?:\/\/)?(www\.)?/, "");
  d = d.split("/")[0];
  return { cleaned: d, error: null };
}
const ENGINE_ICONS = [
  { src: "/ai-logo/chatgpt.png", name: "ChatGPT" },
  { src: "/ai-logo/gemini.png", name: "Gemini" },
  { src: "/ai-logo/claude.png", name: "Claude" },
  { src: "/ai-logo/perplexity.png", name: "Perplexity" },
  { src: "/ai-logo/deepseek.png", name: "DeepSeek" },
  { src: "/ai-logo/grok.png", name: "Grok" },
  { src: "/ai-logo/copilot.webp", name: "Copilot" },
  { src: "/ai-logo/meta ai.png", name: "Meta AI" },
];

export default function DashboardPage() {
  const { loading } = useAuthGuard();
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [savedAudits, setSavedAudits] = useState<AuditData[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dbUser, setDbUser] = useState<{ plan: string; tokens: number } | null>(null);
  const [selectedAuditIndex, setSelectedAuditIndex] = useState(0);

  const selectedAudit = savedAudits[selectedAuditIndex] || null;
  const showCentered = !auditsLoading && savedAudits.length === 0;

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        setAuditsLoading(true);
        try {
          const audits = await getUserAudits(currentUser.uid);
          setSavedAudits(audits);
        } catch (error) {
          console.error('Error loading audits:', error);
        } finally {
          setAuditsLoading(false);
        }

        unsubUserDoc = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setDbUser({
              plan: data.plan || 'Free',
              tokens: data.tokens !== undefined ? data.tokens : 10
            });
          } else {
            setDbUser({ plan: 'Free', tokens: 10 });
          }
        }, () => {
          setDbUser({ plan: 'Free', tokens: 10 });
        });
      } else {
        setDbUser(null);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const handleAnalyze = () => {
    const result = validateAndCleanDomain(domain);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setIsRunningAudit(true);
    
    const url = `https://${result.cleaned}`;
    router.push(`/phase-1?url=${encodeURIComponent(url)}`);
  };

  if (loading) return null;

  return (
    <div className={styles.dashboardContainer} style={{ background: "#F5F5F7", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 768px) {
          .dash-main-content {
            padding: 24px 16px !important;
          }
          .dash-search-card {
            padding: 24px 16px !important;
          }
          .dash-search-row {
            flex-direction: column !important;
          }
          .dash-search-input-wrap {
            width: 100% !important;
          }
          .dash-search-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .dash-engine-icons {
            gap: 12px !important;
          }
          .dash-engine-icon {
            width: 24px !important;
            height: 24px !important;
          }
          .dash-token-badge {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .dash-skeleton-padding {
            padding: 20px !important;
          }
          .dash-skeleton-inner-padding {
            padding: 20px !important;
          }
          .dash-skeleton-grid > div {
            padding: 20px !important;
          }
        }
        @media (max-width: 480px) {
          .dash-main-content {
            padding: 16px 10px !important;
          }
          .dash-search-card {
            padding: 16px 12px !important;
          }
          .dash-engine-icons {
            gap: 8px !important;
          }
          .dash-header-title {
            font-size: 1.25rem !important;
          }
          .dash-skeleton-padding {
            padding: 16px !important;
          }
        }
      `}</style>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className="dash-main-content" style={{
          padding: "40px 48px",
          maxWidth: "100%",
          margin: "0 auto",
          width: "100%",
          ...(showCentered ? {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
          } : {})
        }}>
 
          {/* Token usage credit indicators */}
          {dbUser && (
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "24px"
            }}>
              <div className="dash-token-badge" style={{
                background: "#FFFFFF",
                border: "1px solid #EAEAEF",
                borderRadius: "14px",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.02)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#6E7191", textTransform: "uppercase" }}>Plan:</span>
                  <span style={{ 
                    fontSize: "12px", 
                    fontWeight: 800, 
                    color: dbUser.plan === 'Free' ? '#6E7191' : '#7C5CFF',
                    background: dbUser.plan === 'Free' ? '#F5F5F7' : 'rgba(124,92,255,0.08)',
                    padding: '2px 8px',
                    borderRadius: '8px'
                  }}>
                    {dbUser.plan}
                  </span>
                </div>
                <div style={{ width: "1px", height: "14px", background: "#EAEAEF" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <img
                    src="/favicon/logo-white2.png"
                    alt="Token"
                    width={14}
                    height={14}
                    style={{ objectFit: 'contain', filter: "invert(0.2)" }}
                  />
                  <span style={{ fontSize: "12.5px", fontWeight: 750, color: "#090A0F" }}>
                    {dbUser.tokens.toLocaleString()} Prompts Remaining
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          {showCentered && (
            <div style={{
              marginBottom: "36px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7C5CFF" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#7C5CFF", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  AI Visibility Analysis
                </span>
              </div>
              <h1 className="dash-header-title" style={{ fontSize: "1.75rem", fontWeight: 700, color: "#090A0F", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                Check your brand&apos;s AI presence
              </h1>
              <p style={{ fontSize: "0.9rem", color: "#6E7191", margin: 0, lineHeight: "1.5" }}>
                Enter a domain to see how it appears across 8 major AI answer engines.
              </p>
            </div>
          )}

          {/* Search Input Card */}
          {showCentered && (
            <div className="dash-search-card" style={{
              background: "#FFFFFF",
              borderRadius: "20px",
              border: "1px solid #EAEAEF",
              padding: "40px",
              marginBottom: "32px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
              width: "100%",
              maxWidth: "800px",
              margin: "0 auto 32px"
            }}>
              <div className="dash-search-row" style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                maxWidth: "1000px",
                margin: "0 auto"
              }}>
                <div className="dash-search-input-wrap" style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "#F5F5F7",
                  borderRadius: "14px",
                  padding: "6px 6px 6px 16px",
                  border: "2px solid #EAEAEF",
                  transition: "border-color 0.2s"
                }}>
                  <input
                    type="text"
                    placeholder="Enter your domain (e.g., yourbrand.com)"
                    value={domain}
                    onChange={(e) => { setDomain(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      color: "#090A0F",
                      padding: "12px 0",
                      width: "100%"
                    }}
                  />
                  {domain && (
                    <button
                      onClick={() => setDomain("")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#6E7191",
                        fontSize: "1.2rem",
                        padding: "4px",
                        lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={!domain.trim() || isRunningAudit}
                  className="dash-search-btn"
                  style={{
                    background: !domain.trim() || isRunningAudit ? "#D9D9DD" : "#090A0F",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "14px",
                    padding: "14px 28px",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    cursor: !domain.trim() || isRunningAudit ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={e => { if (domain.trim() && !isRunningAudit) e.currentTarget.style.background = "#1a1a1a"; }}
                  onMouseOut={e => { if (domain.trim() && !isRunningAudit) e.currentTarget.style.background = "#090A0F"; }}
                >
                  {isRunningAudit ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={18} />} {isRunningAudit ? "Running Audit..." : "Run Crawl Audit"}
                </button>
              </div>

              {error && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  justifyContent: "center",
                  marginTop: "16px"
                }}>
                  <AlertCircle size={16} color="#dc2626" />
                  <span style={{ fontSize: "0.8rem", color: "#dc2626", fontWeight: 500 }}>{error}</span>
                </div>
              )}

              {/* AI Engine Icons below input */}
              <div className="dash-engine-icons" style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "40px",
                marginTop: "28px",
                flexWrap: "wrap"
              }}>
                {ENGINE_ICONS.map((engine) => (
                  <div
                    key={engine.name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.2s",
                      cursor: "default"
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseOut={e => { e.currentTarget.style.transform = "none"; }}
                  >
                    <img
                      src={engine.src}
                      alt={engine.name}
                      width={32}
                      height={32}
                      style={{ borderRadius: "8px", objectFit: "contain" }}
                    />
                    <span style={{ fontSize: "0.6rem", color: "#6E7191", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {engine.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Audits Section */}
          {(auditsLoading || savedAudits.length > 0) && (
            <div style={{ marginTop: "48px" }}>
              {!auditsLoading && (
                <div className={styles.dashboardSectionHeader}>
                  <div className={styles.dashboardSectionTitleWrapper}>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#090A0F", margin: 0 }}>
                      Your Website Audits
                    </h2>
                    <span style={{ fontSize: "0.875rem", color: "#6E7191" }}>
                      {savedAudits.length} audit{savedAudits.length !== 1 ? 's' : ''} saved
                    </span>
                  </div>
                  <button
                    onClick={() => router.push('/phase-1')}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: "#090A0F",
                      color: "#FFFFFF",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "background 0.2s",
                    }}
                    onMouseOver={e => e.currentTarget.style.background = "#1a1a1a"}
                    onMouseOut={e => e.currentTarget.style.background = "#090A0F"}
                  >
                    <Search size={16} />
                    New Audit
                  </button>
                </div>
              )}

              {auditsLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div className={styles.skeleton} style={{ width: "240px", height: "32px", borderRadius: "8px" }} />
                      <div className={styles.skeleton} style={{ width: "120px", height: "16px", borderRadius: "6px" }} />
                    </div>
                    <div className={styles.skeleton} style={{ width: "130px", height: "42px", borderRadius: "10px" }} />
                  </div>

                  {/* Switcher Tabs Row */}
                  <div style={{
                    display: "flex", gap: "8px", borderBottom: "1px solid #EAEAEF", paddingBottom: "16px", marginBottom: "8px"
                  }}>
                    <div className={styles.skeleton} style={{ width: "160px", height: "40px", borderRadius: "10px" }} />
                    <div className={styles.skeleton} style={{ width: "140px", height: "40px", borderRadius: "10px" }} />
                    <div className={styles.skeleton} style={{ width: "150px", height: "40px", borderRadius: "10px" }} />
                  </div>

                  {/* Top Overview Cards Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "24px",
                    marginBottom: "24px"
                  }}>
                    {/* Gauge Card Skeleton */}
                    <div style={{
                      background: "#FFFFFF",
                      borderRadius: "20px",
                      border: "1px solid #EAEAEF",
                      padding: "32px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "16px"
                    }}>
                      <div className={styles.skeleton} style={{ width: "140px", height: "140px", borderRadius: "50%" }} />
                      <div className={styles.skeleton} style={{ width: "100px", height: "20px", borderRadius: "6px" }} />
                      <div className={styles.skeleton} style={{ width: "150px", height: "14px", borderRadius: "4px" }} />
                    </div>

                    {/* Donut Card Skeleton */}
                    <div style={{
                      background: "#FFFFFF",
                      borderRadius: "20px",
                      border: "1px solid #EAEAEF",
                      padding: "32px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "16px"
                    }}>
                      <div className={styles.skeleton} style={{ width: "140px", height: "140px", borderRadius: "50%" }} />
                      <div className={styles.skeleton} style={{ width: "120px", height: "18px", borderRadius: "6px" }} />
                      <div className={styles.skeleton} style={{ width: "80px", height: "14px", borderRadius: "4px" }} />
                    </div>

                    {/* Quick Stats Card Skeleton */}
                    <div style={{
                      background: "#FFFFFF",
                      borderRadius: "20px",
                      border: "1px solid #EAEAEF",
                      padding: "32px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "20px"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div className={styles.skeleton} style={{ width: "60%", height: "20px", borderRadius: "6px" }} />
                        <div className={styles.skeleton} style={{ width: "90%", height: "14px", borderRadius: "4px" }} />
                        <div className={styles.skeleton} style={{ width: "80%", height: "14px", borderRadius: "4px" }} />
                      </div>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <div className={styles.skeleton} style={{ flex: 1, height: "48px", borderRadius: "12px" }} />
                        <div className={styles.skeleton} style={{ flex: 1, height: "48px", borderRadius: "12px" }} />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Content Skeleton */}
                  <div style={{
                    background: "#FFFFFF",
                    borderRadius: "20px",
                    border: "1px solid #EAEAEF",
                    padding: "32px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px"
                  }}>
                    <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid #F0F0F5", paddingBottom: "12px" }}>
                      <div className={styles.skeleton} style={{ width: "100px", height: "24px", borderRadius: "6px" }} />
                      <div className={styles.skeleton} style={{ width: "120px", height: "24px", borderRadius: "6px" }} />
                      <div className={styles.skeleton} style={{ width: "80px", height: "24px", borderRadius: "6px" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {[1, 2, 3].map(row => (
                        <div key={row} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "70%" }}>
                            <div className={styles.skeleton} style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0 }} />
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
                              <div className={styles.skeleton} style={{ width: "40%", height: "16px", borderRadius: "4px" }} />
                              <div className={styles.skeleton} style={{ width: "85%", height: "12px", borderRadius: "4px" }} />
                            </div>
                          </div>
                          <div className={styles.skeleton} style={{ width: "80px", height: "24px", borderRadius: "6px" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Website Switcher */}
                  <div style={{
                    display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px",
                    paddingBottom: "16px", borderBottom: "1px solid #EAEAEF",
                  }}>
                    {savedAudits.map((audit, i) => {
                      const domain = new URL(audit.url).hostname;
                      const isActive = selectedAuditIndex === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedAuditIndex(i)}
                          style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "10px 18px", borderRadius: "10px",
                            border: isActive ? "2px solid #7C5CFF" : "1px solid #EAEAEF",
                            background: isActive ? "#F5F0FF" : "#FFFFFF",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            fontSize: "0.85rem",
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? "#7C5CFF" : "#090A0F",
                          }}
                          onMouseOver={e => { if (!isActive) { e.currentTarget.style.borderColor = "#7C5CFF"; e.currentTarget.style.background = "#FAFAFA"; }}}
                          onMouseOut={e => { if (!isActive) { e.currentTarget.style.borderColor = "#EAEAEF"; e.currentTarget.style.background = "#FFFFFF"; }}}
                        >
                          <Globe size={16} color={isActive ? "#7C5CFF" : "#6E7191"} />
                          {domain}
                        </button>
                      );
                    })}
                  </div>

                  {/* Full Audit View */}
                  {selectedAudit && (
                    <AuditResultsView 
                      auditData={selectedAudit} 
                      aiVisibility={(() => {
                        const raw = selectedAudit.aiVisibility;
                        if (!raw) return undefined;
                        const planName = (dbUser?.plan || "Free").toLowerCase();
                        if (planName === 'free' || planName === 'starter') {
                          const allowed = ["ChatGPT", "Google Gemini", "Claude", "Perplexity AI"];
                          return raw.filter(e => allowed.includes(e.name));
                        }
                        if (planName === 'growth') {
                          const allowed = ["ChatGPT", "Google Gemini", "Claude", "Perplexity AI", "DeepSeek"];
                          return raw.filter(e => allowed.includes(e.name));
                        }
                        return raw; // Ultra sees all 8
                      })()} 
                    />
                  )}
                </>
              )}
            </div>
          )}
          </div>

      </main>
    </div>
  );
}
