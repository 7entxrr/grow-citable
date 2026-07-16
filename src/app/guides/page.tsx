"use client";

import FooterPage from "@/components/FooterPage";
import { BookOpen, FileText, Video, BookMarked, Compass, ArrowRight } from "lucide-react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

export default function GuidesPage() {
  return (
    <FooterPage
      title="Guides & Tutorials"
      subtitle="Step-by-step guides to help you master AI visibility optimization — from your first audit to advanced multi-engine strategies."
      accentColor="#06B6D4"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
          {[
            { icon: BookOpen, title: "Getting Started Guide", desc: "Learn how to set up your first brand audit and start tracking AI visibility across ChatGPT, Gemini, Claude, and Perplexity.", time: "15 min", level: "Beginner" },
            { icon: Compass, title: "Keyword Discovery Playbook", desc: "Master the Prompt Volumes tool to uncover high-value keywords and topics driving AI conversations in your industry.", time: "20 min", level: "Intermediate" },
            { icon: FileText, title: "Content Optimization Framework", desc: "A systematic approach to optimizing your content for AI citation, from topic selection to structured data implementation.", time: "30 min", level: "Advanced" },
            { icon: BookMarked, title: "Competitive Analysis Guide", desc: "Track competitors, identify citation gaps, and build a strategy to outperform them across answer engines.", time: "25 min", level: "Intermediate" },
          ].map((guide, i) => {
            const Icon = guide.icon;
            return (
              <div key={i} style={{
                padding: "28px", borderRadius: "16px",
                background: CARD_BG, border: `1px solid ${BORDER}`,
                cursor: "pointer", transition: "all 0.3s"
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = "#06B6D480"}
                onMouseOut={e => e.currentTarget.style.borderColor = BORDER}>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(6,182,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={20} color="#06B6D4" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "6px" }}>{guide.title}</h3>
                    <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.6, marginBottom: "12px" }}>{guide.desc}</p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontSize: "0.6875rem", padding: "3px 8px", borderRadius: "6px", background: "rgba(6,182,212,0.1)", color: "#06B6D4" }}>{guide.time}</span>
                      <span style={{ fontSize: "0.6875rem", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", color: TEXT_SECONDARY }}>{guide.level}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          padding: "36px", borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(6,182,212,0.06), rgba(59,130,246,0.06))",
          border: `1px solid ${BORDER}`, textAlign: "center"
        }}>
          <Video size={32} color="#06B6D4" style={{ marginBottom: "12px" }} />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "6px" }}>Video Tutorials</h3>
          <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, marginBottom: "16px" }}>Watch our library of walkthrough videos covering every feature.</p>
          <button style={{
            padding: "10px 24px", borderRadius: "40px", border: "1px solid rgba(6,182,212,0.3)",
            background: "transparent", color: "#06B6D4", fontSize: "0.8125rem",
            cursor: "pointer", fontFamily: "inherit"
          }}>Browse Videos</button>
        </div>
      </div>
    </FooterPage>
  );
}
