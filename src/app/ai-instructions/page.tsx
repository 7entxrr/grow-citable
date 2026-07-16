"use client";

import FooterPage from "@/components/FooterPage";
import { Bot, MessageSquare, FileText, Settings, AlertTriangle, ArrowRight } from "lucide-react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

export default function AiInstructionsPage() {
  return (
    <FooterPage
      title="AI Instructions"
      subtitle="Configure how our AI agents analyze, track, and report on your brand's visibility across answer engines."
      accentColor="#EF4444"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {[
            { icon: Bot, title: "Agent Configuration", desc: "Define which AI engines to monitor, tracking frequency, citation sensitivity thresholds, and alert preferences for each agent." },
            { icon: MessageSquare, title: "Prompt Filters", desc: "Set inclusion and exclusion rules for which prompts to track. Filter by intent, sentiment, topic, platform, and demographic segments." },
            { icon: FileText, title: "Content Guidelines", desc: "Provide instructions on how the system should evaluate your content. Set preferred topics, brand voice, and keyword priorities." },
            { icon: Settings, title: "Alert Rules", desc: "Configure custom alerts for visibility changes, competitor movements, new citation opportunities, and sentiment shifts." },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{
                padding: "28px", borderRadius: "16px",
                background: CARD_BG, border: `1px solid ${BORDER}`,
                borderLeft: `3px solid #EF4444`
              }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                  <Icon size={18} color="#EF4444" />
                </div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "6px" }}>{item.title}</h3>
                <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>

        <div style={{
          padding: "28px", borderRadius: "16px",
          background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)",
          display: "flex", gap: "14px", alignItems: "flex-start"
        }}>
          <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <h4 style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "4px" }}>Important</h4>
            <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
              AI instructions are only applied to future data collection and analysis. Changes may take up to 24 hours to take full effect across all engines.
            </p>
          </div>
        </div>
      </div>
    </FooterPage>
  );
}
