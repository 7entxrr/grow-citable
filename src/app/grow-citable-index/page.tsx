"use client";

import FooterPage from "@/components/FooterPage";
import { Database, BarChart3, Globe, RefreshCw, Shield, CheckCircle } from "lucide-react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

export default function GrowCitableIndexPage() {
  return (
    <FooterPage
      title="Grow Citable Index"
      subtitle="The most comprehensive index of AI-powered search data, built from billions of real human-AI conversations."
      accentColor="#34D399"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px",
          padding: "40px", borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(52,211,153,0.06), rgba(6,182,212,0.06))",
          border: `1px solid ${BORDER}`,
        }}>
          {[
            { val: "2.4B+", label: "Daily Signals" },
            { val: "4", label: "AI Engines" },
            { val: "50M+", label: "Keywords Tracked" },
            { val: "12+", label: "Regions Covered" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 500, color: "#34D399", marginBottom: "4px" }}>{s.val}</div>
              <div style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {[
            { icon: Database, title: "Real Data Foundation", desc: "Every data point comes from double opt-in consumer panels — not API outputs or synthetic estimates. This means real, actionable insights." },
            { icon: Globe, title: "Multi-Engine Aggregation", desc: "Prompts from ChatGPT, Gemini, Claude, and Perplexity are normalized and indexed together, with more engines being added regularly." },
            { icon: BarChart3, title: "Advanced Classification", desc: "Our ML pipeline classifies each prompt by intent (informational, commercial, conversational, generative), topic, and demographics." },
            { icon: RefreshCw, title: "Weekly Refresh", desc: "Data is refreshed weekly with less than 7 days of latency. New prompts are continuously ingested and processed." },
            { icon: Shield, title: "Enterprise Privacy", desc: "All data is anonymized, aggregated, and PII-free. Fully compliant with GDPR and CCPA regulations." },
            { icon: CheckCircle, title: "Quality Scoring", desc: "Every keyword and prompt has a confidence score, so you know which data points are actionable and which need further investigation." },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} style={{
                padding: "28px", borderRadius: "16px",
                background: CARD_BG, border: `1px solid ${BORDER}`
              }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(52,211,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                  <Icon size={18} color="#34D399" />
                </div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "6px" }}>{f.title}</h3>
                <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </FooterPage>
  );
}
