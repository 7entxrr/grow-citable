"use client";

import FooterPage from "@/components/FooterPage";
import React from "react";
import { BarChart3, TrendingUp, Users, Target, Eye, PieChart } from "lucide-react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

export default function AgentAnalyticsPage() {
  return (
    <FooterPage
      title="Agent Analytics"
      subtitle="Comprehensive dashboards and reports that reveal exactly how your brand performs across AI-powered search and answer engines."
      accentColor="#8B5CF6"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {[
            { icon: Eye, title: "Visibility Score", desc: "Overall AI visibility metric from 0-100 based on citation frequency, reach, and sentiment across all tracked engines.", stat: "+47%", statLabel: "avg improvement" },
            { icon: TrendingUp, title: "Trend Analysis", desc: "Track how your brand's AI presence changes over time with daily, weekly, and monthly trend views.", stat: "Real-time", statLabel: "updates" },
            { icon: PieChart, title: "Share of Voice", desc: "See your brand's share of AI citations compared to competitors, broken down by topic and engine.", stat: "87%", statLabel: "coverage" },
            { icon: Target, title: "Intent Breakdown", desc: "Understand whether citations come from informational, commercial, or generative prompts.", stat: "4", statLabel: "intent types" },
            { icon: Users, title: "Audience Demographics", desc: "Filter analytics by age, region, and platform to see which audience segments drive AI conversations.", stat: "12+", statLabel: "demographics" },
            { icon: BarChart3, title: "Keyword Rankings", desc: "Monitor rankings for your tracked keywords across ChatGPT, Gemini, Claude, and Perplexity.", stat: "4.2M", statLabel: "keywords tracked" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{
                padding: "28px", borderRadius: "16px",
                background: CARD_BG, border: `1px solid ${BORDER}`,
                transition: "all 0.3s",
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = "#8B5CF660"}
                onMouseOut={e => e.currentTarget.style.borderColor = BORDER}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color="#8B5CF6" />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: 500, color: "#8B5CF6" }}>{item.stat}</div>
                    <div style={{ fontSize: "0.6875rem", color: TEXT_MUTED }}>{item.statLabel}</div>
                  </div>
                </div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "6px" }}>{item.title}</h3>
                <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Sample chart */}
        <div style={{
          padding: "32px", borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(139,92,246,0.04), rgba(59,130,246,0.04))",
          border: `1px solid ${BORDER}`,
        }}>
          <div style={{ fontSize: "0.8125rem", color: TEXT_MUTED, marginBottom: "20px" }}>Visibility Trend (Last 30 Days)</div>
          <svg width="100%" height="140" viewBox="0 0 600 140" style={{ display: "block" }}>
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const data = [
                { x: 0, y: 100 }, { x: 50, y: 85 }, { x: 100, y: 90 }, { x: 150, y: 70 },
                { x: 200, y: 75 }, { x: 250, y: 55 }, { x: 300, y: 60 }, { x: 350, y: 45 },
                { x: 400, y: 50 }, { x: 450, y: 35 }, { x: 500, y: 40 }, { x: 550, y: 30 },
              ];
              const pointsStr = data.map(p => `${p.x},${p.y}`).join(" ");
              const lastX = data[data.length - 1].x;
              return (
                <>
                  <polygon points={`0,120 ${pointsStr} ${lastX},120`} fill="url(#chartFill)" />
                  {data.map((p, i, arr) => {
                    const next = arr[i + 1];
                    if (!next) return null;
                    return (
                      <React.Fragment key={i}>
                        <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
                        <circle cx={p.x} cy={p.y} r="4" fill="#8B5CF6" />
                      </React.Fragment>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>
      </div>
    </FooterPage>
  );
}
