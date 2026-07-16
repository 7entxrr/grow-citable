"use client";

import FooterPage from "@/components/FooterPage";
import Image from "next/image";
import { Bot, Sparkles, MessageSquare, Search, Globe, ArrowRight } from "lucide-react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

export default function AgentsPage() {
  return (
    <FooterPage
      title="AI Agents"
      subtitle="Deploy intelligent agents that monitor, analyze, and optimize your brand's AI visibility across every answer engine."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "60px" }}>
        {/* Agent types grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
          {[
            { icon: Search, title: "Visibility Monitor", desc: "Continuously scans answer engines to track where and how your brand appears in AI-generated responses.", color: "#3B82F6" },
            { icon: MessageSquare, title: "Prompt Analyzer", desc: "Analyzes millions of AI conversations to identify emerging topics and keywords relevant to your industry.", color: "#8B5CF6" },
            { icon: Globe, title: "Competitive Scout", desc: "Monitors competitor citations across AI platforms and alerts you to new entrants and share shifts.", color: "#06B6D4" },
            { icon: Sparkles, title: "Content Optimizer", desc: "Recommends content adjustments to improve AI citation likelihood based on real prompt data.", color: "#10B981" },
          ].map((agent, i) => {
            const Icon = agent.icon;
            return (
              <div key={i} style={{
                padding: "32px",
                borderRadius: "16px",
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderTop: `3px solid ${agent.color}`,
                transition: "all 0.3s",
              }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = agent.color }}
                onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = BORDER }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "12px",
                  background: `${agent.color}20`, display: "flex",
                  alignItems: "center", justifyContent: "center", marginBottom: "16px"
                }}>
                  <Icon size={20} color={agent.color} />
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "8px" }}>{agent.title}</h3>
                <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.7, margin: 0 }}>{agent.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px",
          padding: "40px", borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(59,130,246,0.05), rgba(139,92,246,0.05))",
          border: `1px solid ${BORDER}`,
        }}>
          {[
            { val: "24/7", label: "Monitoring" },
            { val: "4+", label: "AI Engines" },
            { val: "50M+", label: "Signal/day" },
            { val: "<2s", label: "Alert latency" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 500, color: "#3B82F6", marginBottom: "4px" }}>{s.val}</div>
              <div style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Engine logos */}
        <div style={{
          padding: "32px", borderRadius: "16px",
          background: CARD_BG, border: `1px solid ${BORDER}`,
          textAlign: "center"
        }}>
          <div style={{ fontSize: "0.75rem", color: TEXT_MUTED, marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Supported Engines</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "40px", flexWrap: "wrap" }}>
            {[
              { src: "/ai-logo/chatgpt.png", alt: "ChatGPT" },
              { src: "/ai-logo/gemini.png", alt: "Gemini" },
              { src: "/ai-logo/claude.png", alt: "Claude" },
              { src: "/ai-logo/perplexity.png", alt: "Perplexity" },
              { src: "/ai-logo/deepseek.png", alt: "DeepSeek" },
              { src: "/ai-logo/grok.png", alt: "Grok" },
            ].map((logo, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", opacity: 0.5, transition: "opacity 0.2s" }}
                onMouseOver={e => e.currentTarget.style.opacity = "1"}
                onMouseOut={e => e.currentTarget.style.opacity = "0.5"}>
                <Image src={logo.src} alt={logo.alt} width={32} height={32} style={{ borderRadius: "8px", objectFit: "contain" }} />
                <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.4)" }}>{logo.alt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: "center", padding: "48px",
          borderRadius: "20px", background: CARD_BG, border: `1px solid ${BORDER}`
        }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 500, marginBottom: "8px" }}>Ready to deploy your AI agents?</h3>
          <p style={{ fontSize: "0.875rem", color: TEXT_SECONDARY, marginBottom: "24px" }}>Get real-time visibility into how AI engines perceive your brand.</p>
          <button style={{
            padding: "12px 28px", borderRadius: "40px", border: "none",
            background: "#3B82F6", color: "#FFFFFF", fontSize: "0.875rem",
            cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: "8px"
          }}>Get Started <ArrowRight size={14} /></button>
        </div>
      </div>
    </FooterPage>
  );
}
