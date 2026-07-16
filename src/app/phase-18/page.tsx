'use client';

import React, { useState } from "react";
import { 
  PhasePageShell, 
  FormCard, 
  PremiumInput, 
  SubmitButton, 
  ErrorBox, 
  LoadingCard 
} from "@/components/PhasePageShell";
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Link2, 
  BookOpen, 
  UserCheck, 
  FileText, 
  Clipboard, 
  Copy, 
  Check, 
  Cpu, 
  Smile, 
  Heart, 
  Code 
} from "lucide-react";

interface AuditedClaim {
  claim: string;
  status: 'Verified' | 'Needs Citation' | 'Factual Alert';
  suggestion: string;
}

interface CredibilityReport {
  credibilityIndex: number;
  eeatRating: 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical Risk';
  citationsFound: number;
  statisticsDensity: 'High' | 'Medium' | 'Low';
  privacyPageFound: boolean;
  contactPageFound: boolean;
  authorPresenceFound: boolean;
  schemasDetected: string[];
  aiGroundingIndex: number;
  copyToneProfile: 'Balanced & Informational' | 'Moderately Salesy' | 'Overly Hypey';
  socialProofRating: 'High' | 'Medium' | 'Low' | 'Not Found';
  claims: AuditedClaim[];
  trustCopySuggestions: string[];
}

import { auth } from "@/lib/firebase";

export default function Phase18Page() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CredibilityReport | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError(null);
    setData(null);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to run this credibility audit.");
      setLoading(false);
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
        throw new Error(tokenData.message || "Failed to consume tokens.");
      }

      const res = await fetch("/api/source-credibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to complete credibility audit.");
      }
      setData(resData);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getEeatColor = (rating: string) => {
    switch (rating) {
      case "Excellent": return "#10b981";
      case "Good": return "#3b82f6";
      case "Needs Improvement": return "#f59e0b";
      case "Critical Risk": return "#ef4444";
      default: return "var(--grey-text)";
    }
  };

  const getToneColor = (profile: string) => {
    switch (profile) {
      case "Balanced & Informational": return "#10b981";
      case "Moderately Salesy": return "#f59e0b";
      case "Overly Hypey": return "#ef4444";
      default: return "var(--grey-text)";
    }
  };

  const getSocialProofColor = (rating: string) => {
    switch (rating) {
      case "High": return "#10b981";
      case "Medium": return "#3b82f6";
      case "Low": return "#f59e0b";
      case "Not Found": return "#ef4444";
      default: return "var(--grey-text)";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Verified":
        return <CheckCircle2 size={16} style={{ color: "#10b981", marginTop: "2px", flexShrink: 0 }} />;
      case "Needs Citation":
        return <AlertTriangle size={16} style={{ color: "#f59e0b", marginTop: "2px", flexShrink: 0 }} />;
      case "Factual Alert":
        return <XCircle size={16} style={{ color: "#ef4444", marginTop: "2px", flexShrink: 0 }} />;
      default:
        return null;
    }
  };

  return (
    <PhasePageShell
      phase={18}
      title="AI Source Credibility Auditor"
      badgeLabel="GEO Trust"
      badgeIcon={<ShieldCheck size={16} />}
      accentColor="#10b981"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        
        {/* Form Input Section */}
        <FormCard>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "var(--text-dark)" }}>Identify Trust Gaps</h3>
                <p style={{ margin: 0, fontSize: "12.5px", color: "var(--grey-text)" }}>Scan author metadata, outbound backing references, schemas, and facts index parameters.</p>
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <PremiumInput
                    label="Target Domain / URL"
                    type="text"
                    value={url}
                    onChange={setUrl}
                    placeholder="e.g. growcitable.com"
                  />
                </div>
                <SubmitButton loading={loading} label="Audit Source Credibility" loadingLabel="Crawling page copy & checking facts index..." tokens={5} />
              </div>
            </div>
          </form>
        </FormCard>

        {error && <ErrorBox message={error} />}

        {loading && <LoadingCard message="Analyzing outbound references, crawling trust endpoints, parsing schemas, and evaluating trust indices..." />}

        {/* Results Dashboard */}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            
            {/* 1. Overall Score Metric Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              
              {/* Credibility index circle progress */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{
                  position: "relative",
                  width: "74px",
                  height: "74px",
                  borderRadius: "50%",
                  background: `conic-gradient(#10b981 ${data.credibilityIndex}%, #F0EDE8 0)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <div style={{ position: "absolute", width: "60px", height: "60px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "15px", fontWeight: "850", color: "var(--text-dark)" }}>{data.credibilityIndex}%</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Credibility Index</span>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-dark)", display: "block", lineHeight: "1.2" }}>
                    {data.credibilityIndex >= 80 ? "Highly Credible" : data.credibilityIndex >= 60 ? "Moderate Trust" : "Unverified Copy"}
                  </span>
                </div>
              </div>

              {/* AI Grounding Index */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{
                  position: "relative",
                  width: "74px",
                  height: "74px",
                  borderRadius: "50%",
                  background: `conic-gradient(#7C5CFF ${data.aiGroundingIndex}%, #F0EDE8 0)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <div style={{ position: "absolute", width: "60px", height: "60px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "15px", fontWeight: "850", color: "var(--text-dark)" }}>{data.aiGroundingIndex}%</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>AI Grounding Ease</span>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-dark)", display: "block", lineHeight: "1.2" }}>
                    {data.aiGroundingIndex >= 80 ? "Highly Parsable" : data.aiGroundingIndex >= 60 ? "Structured Layout" : "Blocky Text"}
                  </span>
                </div>
              </div>

              {/* EEAT Rating Badge Card */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", flexShrink: 0 }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>EEAT Trust Rating</span>
                  <strong style={{ fontSize: "15px", fontWeight: "850", color: getEeatColor(data.eeatRating), display: "block" }}>
                    {data.eeatRating}
                  </strong>
                </div>
              </div>

              {/* Citations Count */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(59,130,246,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", flexShrink: 0 }}>
                  <Link2 size={20} />
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Outbound References</span>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-dark)", display: "block" }}>
                    {data.citationsFound} Links
                  </span>
                </div>
              </div>
            </div>

            {/* Extra Analytics: Tone Profile, Social Proof and Schemas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "28px" }}>
              
              {/* Copywriting Tone & Social Proof */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: "800", color: "var(--text-dark)" }}>AI Readability Profiling</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  
                  {/* Copy Tone */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #FAFAF9", paddingBottom: "12px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <Smile size={18} style={{ color: "var(--grey-text)" }} />
                      <div>
                        <strong style={{ fontSize: "13px", color: "var(--text-dark)", display: "block" }}>Copy Tone Profile</strong>
                        <span style={{ fontSize: "11px", color: "var(--grey-text)" }}>LLMs favor informational text over hype</span>
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: "12px", 
                      fontWeight: "800", 
                      color: getToneColor(data.copyToneProfile),
                      background: `${getToneColor(data.copyToneProfile)}0f`,
                      padding: "4px 10px",
                      borderRadius: "6px"
                    }}>
                      {data.copyToneProfile}
                    </span>
                  </div>

                  {/* Social Proof */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "4px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <Heart size={18} style={{ color: "var(--grey-text)" }} />
                      <div>
                        <strong style={{ fontSize: "13px", color: "var(--text-dark)", display: "block" }}>Social Proof Index</strong>
                        <span style={{ fontSize: "11px", color: "var(--grey-text)" }}>Testimonials and ratings indicators</span>
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: "12px", 
                      fontWeight: "800", 
                      color: getSocialProofColor(data.socialProofRating),
                      background: `${getSocialProofColor(data.socialProofRating)}0f`,
                      padding: "4px 10px",
                      borderRadius: "6px"
                    }}>
                      {data.socialProofRating} Social Proof
                    </span>
                  </div>

                </div>
              </div>

              {/* JSON-LD Schemas Detected */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "14.5px", fontWeight: "800", color: "var(--text-dark)" }}>JSON-LD Schema Markup</h3>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--grey-text)" }}>Structured entity schemas crawled on target page.</p>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                  {(data.schemasDetected || []).length > 0 ? (
                    (data.schemasDetected || []).map((schema, idx) => (
                      <span 
                        key={idx} 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "6px", 
                          fontSize: "12px", 
                          fontWeight: "750", 
                          color: "#10b981", 
                          background: "rgba(16,185,129,0.06)", 
                          padding: "6px 12px", 
                          borderRadius: "20px",
                          border: "1px solid rgba(16,185,129,0.15)"
                        }}
                      >
                        <Code size={12} />
                        {schema}
                      </span>
                    ))
                  ) : (
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "10px", 
                      background: "rgba(239,68,68,0.05)", 
                      color: "#ef4444", 
                      padding: "12px 16px", 
                      borderRadius: "8px", 
                      fontSize: "12.5px",
                      width: "100%",
                      border: "1px dashed rgba(239,68,68,0.2)"
                    }}>
                      <AlertTriangle size={16} />
                      <strong>No Structured JSON-LD Schemas detected on target page.</strong>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 2. Trust Checklist elements grid */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "14.5px", fontWeight: "800", color: "var(--text-dark)" }}>Core Trust Infrastructure Checklist</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                
                {/* Author Signature */}
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <UserCheck size={18} style={{ color: data.authorPresenceFound ? "#10b981" : "#f59e0b" }} />
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--grey-text)", display: "block" }}>Author Credentials</span>
                    <strong style={{ fontSize: "12px", color: "var(--text-dark)" }}>{data.authorPresenceFound ? "Signature Found" : "No Signature"}</strong>
                  </div>
                </div>

                {/* Privacy Policy */}
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <FileText size={18} style={{ color: data.privacyPageFound ? "#10b981" : "#ef4444" }} />
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--grey-text)", display: "block" }}>Privacy Protocol</span>
                    <strong style={{ fontSize: "12px", color: "var(--text-dark)" }}>{data.privacyPageFound ? "Privacy Link Active" : "Missing Privacy"}</strong>
                  </div>
                </div>

                {/* Contact Page */}
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <Link2 size={18} style={{ color: data.contactPageFound ? "#10b981" : "#ef4444" }} />
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--grey-text)", display: "block" }}>Contact Details</span>
                    <strong style={{ fontSize: "12px", color: "var(--text-dark)" }}>{data.contactPageFound ? "Contact Link Active" : "Missing Link"}</strong>
                  </div>
                </div>

                {/* Statistics Density */}
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <BookOpen size={18} style={{ color: data.statisticsDensity === "High" ? "#10b981" : data.statisticsDensity === "Medium" ? "#3b82f6" : "#f59e0b" }} />
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--grey-text)", display: "block" }}>Statistics Density</span>
                    <strong style={{ fontSize: "12px", color: "var(--text-dark)" }}>{data.statisticsDensity} Density</strong>
                  </div>
                </div>

              </div>
            </div>

            {/* 3. Main Claims Audit Table & Optimization Injector Columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "28px" }}>
              
              {/* Claims Audit Panel */}
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "800", color: "var(--text-dark)" }}>Audited Copy Claims</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--grey-text)" }}>Claims crawled on target page and validation status.</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {data.claims.map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "8px", 
                        padding: "16px",
                        background: item.status === "Verified" ? "rgba(16,185,129,0.01)" : item.status === "Needs Citation" ? "rgba(245,158,11,0.01)" : "rgba(239,68,68,0.01)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ 
                          fontSize: "10.5px", 
                          fontWeight: "850", 
                          color: item.status === "Verified" ? "#10b981" : item.status === "Needs Citation" ? "#f59e0b" : "#ef4444",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          {getStatusIcon(item.status)}
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "650", color: "var(--text-dark)", fontStyle: "italic", lineHeight: "1.4" }}>
                        "{item.claim}"
                      </p>
                      <div style={{ borderTop: "1px solid #FAFAF9", paddingTop: "8px", fontSize: "12px", color: "var(--grey-dark)", lineHeight: "1.4" }}>
                        <strong style={{ fontWeight: "750", color: "var(--text-dark)" }}>Recommendation:</strong> {item.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GEO Trust Copy Snippets Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "800", color: "var(--text-dark)" }}>GEO Trust Injections</h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--grey-text)" }}>Copy modifications to satisfy LLM crawlers trust verification.</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {data.trustCopySuggestions.map((suggestion, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          background: "#FAFAF9", 
                          border: "1px solid var(--border-color)", 
                          borderRadius: "8px", 
                          padding: "16px",
                          position: "relative"
                        }}
                      >
                        <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Suggestion {i + 1}</span>
                        <p style={{ margin: "0 0 12px 0", fontSize: "12px", lineHeight: "1.5", color: "var(--grey-dark)" }}>
                          {suggestion}
                        </p>
                        <button
                          onClick={() => copyToClipboard(suggestion, i)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            border: "none",
                            background: copiedIndex === i ? "#10b981" : "rgba(124,92,255,0.08)",
                            color: copiedIndex === i ? "#ffffff" : "#7C5CFF",
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          {copiedIndex === i ? <Check size={11} /> : <Copy size={11} />}
                          {copiedIndex === i ? "Copied" : "Copy Suggestion"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </PhasePageShell>
  );
}
