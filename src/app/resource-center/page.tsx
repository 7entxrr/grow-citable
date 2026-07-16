"use client";

import FooterPage from "@/components/FooterPage";
import { BookOpen, Download, Headphones, FileText, Play, ArrowRight } from "lucide-react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

const categories = [
  { title: "Getting Started", items: ["Platform Overview", "First Audit Setup", "Understanding Your Dashboard", "Connecting Your Domain"] },
  { title: "Features", items: ["Prompt Volumes Deep Dive", "Competitive Analysis", "Agent Configuration", "Report Generation"] },
  { title: "Best Practices", items: ["Content Optimization", "Keyword Research Strategy", "AI Visibility Framework", "Multi-Engine Tracking"] },
  { title: "Troubleshooting", items: ["Data Discrepancies", "Integration Issues", "Account Management", "Billing & Plans"] },
];

export default function ResourceCenterPage() {
  return (
    <FooterPage
      title="Resource Center"
      subtitle="Everything you need to succeed with AI visibility optimization — documentation, best practices, case studies, and more."
      accentColor="#10B981"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {/* Quick links */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {[
            { icon: FileText, label: "Documentation", count: "12 articles" },
            { icon: Play, label: "Video Library", count: "24 tutorials" },
            { icon: Download, label: "Templates", count: "8 templates" },
            { icon: Headphones, label: "Support", count: "Live chat" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{
                padding: "24px", borderRadius: "12px",
                background: CARD_BG, border: `1px solid ${BORDER}`,
                textAlign: "center", cursor: "pointer",
                transition: "all 0.3s"
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = "#10B98160"}
                onMouseOut={e => e.currentTarget.style.borderColor = BORDER}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <Icon size={16} color="#10B981" />
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{item.count}</div>
              </div>
            );
          })}
        </div>

        {/* Categories */}
        {categories.map((cat, i) => (
          <div key={i}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "14px" }}>{cat.title}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
              {cat.items.map((item, j) => (
                <div key={j} style={{
                  padding: "14px 18px", borderRadius: "10px",
                  background: CARD_BG, border: `1px solid ${BORDER}`,
                  fontSize: "0.8125rem", color: TEXT_SECONDARY,
                  cursor: "pointer", transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "#10B98140"; e.currentTarget.style.color = "#FFFFFF" }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_SECONDARY }}>
                  {item}
                  <ArrowRight size={12} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </FooterPage>
  );
}
