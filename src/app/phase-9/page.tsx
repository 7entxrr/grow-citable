"use client";

import React, { useState } from "react";
import {
  PhasePageShell,
  FormCard,
  PremiumInput,
  SubmitButton,
  ErrorBox,
  LoadingCard,
} from "@/components/PhasePageShell";
import { 
  Sparkles, 
  MessageSquare, 
  TrendingUp, 
  CheckSquare, 
  ShieldAlert, 
  ArrowRight, 
  Link2,
  Bookmark,
  CheckCircle2,
  FileText
} from "lucide-react";

interface QuerySimulation {
  query: string;
  simulatedAnswer: string;
  visibilityScore: number;
  sentiment: "Positive" | "Neutral" | "Negative" | "Not Mentioned";
  citations: number;
}

interface EngineSimulation {
  engine: "ChatGPT" | "Perplexity" | "Gemini" | "Claude";
  status: "success" | "failed";
  error?: string;
  queries?: QuerySimulation[];
}

interface SimResponse {
  simulations: EngineSimulation[];
  geoVisibilityIndex: number;
  overallSentiment: "Positive" | "Neutral" | "Negative" | "Not Mentioned";
  directives: string[];
}

import { auth } from "@/lib/firebase";

export default function Phase9Page() {
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SimResponse | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<"ChatGPT" | "Perplexity" | "Gemini" | "Claude">("ChatGPT");
  const [activeQueryIndex, setActiveQueryIndex] = useState<number>(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter your website URL first.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);

    let target = url.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("Please log in to run this answer engine simulation.");
      setLoading(false);
      return;
    }

    try {
      const tokenRes = await fetch("/api/consume-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: 2 })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.message || "Failed to consume tokens.");
      }

      const res = await fetch("/api/answer-engine-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, niche }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Simulation failed");
      }
      const responseData = await res.json();
      setData(responseData);
    } catch (err: any) {
      setError(err.message || "Something went wrong running simulation.");
    } finally {
      setLoading(false);
    }
  }

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; 
    a.download = `geo-simulation-${new URL(url.startsWith("http") ? url : `https://${url}`).hostname}.json`; 
    a.click();
    URL.revokeObjectURL(u);
  };

  const getEngineColor = (engine: string) => {
    switch (engine) {
      case "ChatGPT": return "#10a37f";
      case "Perplexity": return "#39a1a1";
      case "Gemini": return "#4b61ec";
      case "Claude": return "#d97706";
      default: return "var(--primary-blue)";
    }
  };

  const selectedSim = data?.simulations.find(s => s.engine === selectedEngine);

  return (
    <PhasePageShell
      phase={9}
      title="Answer Engine Simulator"
      badgeLabel="GEO Optimizer"
      badgeIcon={<Sparkles size={14} />}
      accentColor="#7C5CFF"
      hasResults={!!data}
      onExport={exportJson}
    >
      {!data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Tool Intro Header */}
          <div style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.06) 0%, rgba(200,80,192,0.04) 100%)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <Sparkles size={24} style={{ color: "#7C5CFF", marginTop: "2px", flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "700", color: "var(--text-dark)" }}>Simulate & Audit Generative Engine Presence</h4>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "var(--grey-text)" }}>
                Wondering how ChatGPT, Perplexity, Gemini, and Claude recommend your brand? Enter your URL and core niche terms to run simulated searches. Audit your brand visibility scores, sentiment status, and receive structured GEO directives to dominate AI answers.
              </p>
            </div>
          </div>

          <FormCard>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <PremiumInput
                    label="Website URL"
                    type="text"
                    value={url}
                    onChange={setUrl}
                    placeholder="e.g. yourbrand.com"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <PremiumInput
                    label="Target Niche / Category Keywords"
                    type="text"
                    value={niche}
                    onChange={setNiche}
                    placeholder="e.g. used auto parts, technical support"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                <SubmitButton loading={loading} label="Run GEO Simulation" loadingLabel="Simulating Conversational Answers..." tokens={2} />
              </div>
            </form>
          </FormCard>
          {error && <ErrorBox message={error} />}
        </div>
      )}

      {loading && <LoadingCard message="Scanning domain data & simulating conversational engine responses..." />}

      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          
          {/* 1. Overall Score Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            {/* Visibility Score */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ position: "relative", width: "65px", height: "65px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="65" height="65" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                  <path stroke="#f3f3f3" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path stroke="#7C5CFF" strokeWidth="3" strokeDasharray={`${data.geoVisibilityIndex}, 100`} fill="none" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span style={{ position: "absolute", fontSize: "14px", fontWeight: "800", color: "var(--text-dark)" }}>{data.geoVisibilityIndex}%</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#7C5CFF", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>GEO Visibility Index</span>
                <span style={{ fontSize: "14px", fontWeight: "750", color: "var(--text-dark)" }}>
                  {data.geoVisibilityIndex >= 75 ? "High Visibility" : data.geoVisibilityIndex >= 45 ? "Moderate Visibility" : "Critical Gap Area"}
                </span>
              </div>
            </div>

            {/* Sentiment Gauge */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(124,92,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFF" }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#7C5CFF", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Sentiment Alignment</span>
                <span style={{ 
                  fontSize: "14px", 
                  fontWeight: "750", 
                  color: data.overallSentiment === "Positive" ? "#36b37e" : data.overallSentiment === "Neutral" ? "#d97706" : "var(--text-dark)" 
                }}>
                  {data.overallSentiment} Sentiment
                </span>
              </div>
            </div>

            {/* Total Citations */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(124,92,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7C5CFF" }}>
                <Link2 size={22} />
              </div>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#7C5CFF", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Total Simulated Citations</span>
                <span style={{ fontSize: "14px", fontWeight: "750", color: "var(--text-dark)" }}>
                  {data.simulations.reduce((acc, sim) => acc + (sim.queries || []).reduce((qAcc, q) => qAcc + q.citations, 0), 0)} Citations Linked
                </span>
              </div>
            </div>
          </div>

          {/* 2. Main Two Column Dashboard */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "28px" }}>
            
            {/* Left Column: Interactive Chat Engine Simulator */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "800", color: "var(--text-dark)" }}>Engine Simulator Output</h3>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--grey-text)" }}>Select an AI engine to read the generated queries and responses.</p>
                </div>

                {/* Engine Selector Tabs */}
                <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", overflowX: "auto" }}>
                  {(["ChatGPT", "Perplexity", "Gemini", "Claude"] as const).map(engineName => {
                    const isSelected = selectedEngine === engineName;
                    const engineColor = getEngineColor(engineName);
                    return (
                      <button
                        key={engineName}
                        onClick={() => {
                          setSelectedEngine(engineName);
                          setActiveQueryIndex(0);
                        }}
                        style={{
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "20px",
                          fontSize: "12.5px",
                          fontWeight: "800",
                          cursor: "pointer",
                          background: isSelected ? engineColor : "rgba(0,0,0,0.03)",
                          color: isSelected ? "#ffffff" : "var(--grey-dark)",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {engineName}
                      </button>
                    );
                  })}
                </div>

                {/* Engine Simulation Status Checks */}
                {selectedSim && selectedSim.status === "failed" && (
                  <div style={{
                    background: "#ffffff",
                    border: "1.5px dashed #ff5630",
                    borderRadius: "10px",
                    padding: "28px 20px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    color: "#ff5630",
                    margin: "12px 0"
                  }}>
                    <ShieldAlert size={36} style={{ color: "#ff5630" }} />
                    <strong style={{ fontSize: "15px", fontWeight: "800" }}>Simulation Terminated</strong>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--grey-text)", lineHeight: "1.5", maxWidth: "420px" }}>
                      {selectedSim.error || `Environmental API Key for ${selectedEngine} is unconfigured or not responding.`}
                    </p>
                  </div>
                )}

                {/* Query Sub-selectors */}
                {selectedSim && selectedSim.status === "success" && selectedSim.queries && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    {selectedSim.queries.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveQueryIndex(idx)}
                        style={{
                          flex: 1,
                          border: activeQueryIndex === idx ? `1.5px solid ${getEngineColor(selectedEngine)}` : "1px solid var(--border-color)",
                          background: activeQueryIndex === idx ? "rgba(124,92,255,0.02)" : "#ffffff",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "750",
                          color: activeQueryIndex === idx ? "var(--text-dark)" : "var(--grey-text)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <MessageSquare size={13} style={{ color: activeQueryIndex === idx ? getEngineColor(selectedEngine) : "var(--grey-text)", flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                          Query {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Active Chat Response Box */}
                {selectedSim && selectedSim.status === "success" && selectedSim.queries && selectedSim.queries[activeQueryIndex] && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    
                    {/* User Question */}
                    <div style={{ background: "#FAFAF9", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px 16px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--grey-text)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Conversational User Query</span>
                      <p style={{ margin: 0, fontSize: "13.5px", fontWeight: "750", color: "var(--text-dark)" }}>
                        {selectedSim.queries[activeQueryIndex].query}
                      </p>
                    </div>

                    {/* Engine Answer */}
                    <div style={{ border: `1.5px solid ${getEngineColor(selectedEngine)}`, borderRadius: "10px", padding: "20px", position: "relative", minHeight: "150px", background: "#ffffff" }}>
                      <span style={{ 
                        position: "absolute", 
                        top: "-10px", 
                        left: "16px", 
                        background: getEngineColor(selectedEngine), 
                        color: "#ffffff", 
                        fontSize: "10px", 
                        fontWeight: "850", 
                        padding: "2px 8px", 
                        borderRadius: "20px",
                        textTransform: "uppercase" 
                      }}>
                        Simulated {selectedEngine} Response
                      </span>

                      <p style={{ margin: "6px 0 0 0", fontSize: "13.5px", lineHeight: "1.65", color: "var(--text-dark)", whiteSpace: "pre-wrap" }}>
                        {selectedSim.queries[activeQueryIndex].simulatedAnswer}
                      </p>

                      {/* Answer specific metrics footer */}
                      <div style={{ display: "flex", gap: "12px", marginTop: "20px", borderTop: "1px solid var(--border-color)", paddingTop: "12px", flexWrap: "wrap" }}>
                        <div style={{ fontSize: "11.5px", color: "var(--grey-text)" }}>
                          Visibility score: <strong style={{ color: "var(--text-dark)", fontWeight: "800" }}>{selectedSim.queries[activeQueryIndex].visibilityScore}%</strong>
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--grey-text)" }}>
                          Sentiment: <strong style={{ 
                            color: selectedSim.queries[activeQueryIndex].sentiment === "Positive" ? "#36b37e" : selectedSim.queries[activeQueryIndex].sentiment === "Neutral" ? "#d97706" : "var(--text-dark)",
                            fontWeight: "800"
                          }}>{selectedSim.queries[activeQueryIndex].sentiment}</strong>
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--grey-text)" }}>
                          Citations count: <strong style={{ color: "var(--text-dark)", fontWeight: "800" }}>{selectedSim.queries[activeQueryIndex].citations}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: GEO Optimization Tasks */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "800", color: "var(--text-dark)" }}>Actionable GEO Tasks</h3>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--grey-text)" }}>Optimization tasks recommended to rank in simulated answers.</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {data.directives.map((directive, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", background: "#FAFAF9", border: "1px solid var(--border-color)", padding: "14px", borderRadius: "8px" }}>
                      <CheckCircle2 size={16} style={{ color: "#7C5CFF", marginTop: "2px", flexShrink: 0 }} />
                      <span style={{ fontSize: "12.5px", lineHeight: "1.5", color: "var(--grey-dark)", fontWeight: "600" }}>
                        {directive}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </PhasePageShell>
  );
}
