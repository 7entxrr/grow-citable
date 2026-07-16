"use client";

import FooterPage from "@/components/FooterPage";
import { BookOpen, FileText, BarChart3, Users, TrendingUp, Lightbulb, ArrowRight } from "lucide-react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

export default function ResearchHubPage() {
  return (
    <FooterPage
      title="Research Hub"
      subtitle="Original research, industry reports, and data-driven insights on the evolution of AI-powered search."
      accentColor="#A78BFA"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {/* Featured */}
        <div style={{
          padding: "36px", borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(167,139,250,0.06), rgba(59,130,246,0.06))",
          border: `1px solid ${BORDER}`,
          display: "flex", gap: "32px", alignItems: "center", flexWrap: "wrap"
        }}>
          <div style={{ flex: "1 1 250px" }}>
            <div style={{
              display: "inline-block", padding: "4px 10px", borderRadius: "6px",
              background: "rgba(167,139,250,0.15)", fontSize: "0.6875rem",
              color: "#A78BFA", marginBottom: "12px"
            }}>Featured Report</div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 500, marginBottom: "8px", lineHeight: 1.3 }}>The State of AI Search 2026</h3>
            <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, marginBottom: "16px" }}>
              Our annual comprehensive report analyzing how brands appear across 4 major AI engines, with data from over 2 billion conversations.
            </p>
            <span style={{ fontSize: "0.8125rem", color: "#A78BFA", cursor: "pointer" }}>Download Report →</span>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <svg width="140" height="100" viewBox="0 0 140 100">
              <rect x="10" y="50" width="20" height="40" rx="3" fill="rgba(167,139,250,0.3)" />
              <rect x="40" y="30" width="20" height="60" rx="3" fill="rgba(167,139,250,0.5)" />
              <rect x="70" y="20" width="20" height="70" rx="3" fill="#A78BFA" />
              <rect x="100" y="10" width="20" height="80" rx="3" fill="rgba(167,139,250,0.7)" />
              <line x1="5" y1="90" x2="135" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Reports */}
        <div>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "16px" }}>Latest Reports</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
            {[
              { icon: TrendingUp, title: "AI Visibility Benchmark Report Q1 2026", desc: "Benchmark your brand's AI visibility against industry averages across 12 sectors." },
              { icon: Users, title: "Consumer AI Adoption Survey", desc: "How consumers use AI for search, discovery, and purchasing decisions — survey of 10,000 respondents." },
              { icon: BarChart3, title: "Engine Comparison: Citation Patterns", desc: "How citation patterns differ between ChatGPT, Gemini, Claude, and Perplexity." },
              { icon: Lightbulb, title: "Industry Deep Dive: Healthcare & AI", desc: "How AI search is transforming patient discovery and healthcare provider visibility." },
            ].map((report, i) => {
              const Icon = report.icon;
              return (
                <div key={i} style={{
                  padding: "24px", borderRadius: "14px",
                  background: CARD_BG, border: `1px solid ${BORDER}`,
                  cursor: "pointer", transition: "all 0.3s"
                }}
                  onMouseOver={e => e.currentTarget.style.borderColor = "#A78BFA60"}
                  onMouseOut={e => e.currentTarget.style.borderColor = BORDER}>
                  <div style={{ display: "flex", gap: "14px", marginBottom: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(167,139,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} color="#A78BFA" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "4px" }}>{report.title}</h4>
                      <p style={{ fontSize: "0.75rem", color: TEXT_MUTED, margin: 0 }}>{report.desc}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#A78BFA" }}>Read Report →</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FooterPage>
  );
}
