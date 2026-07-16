"use client";

import FooterPage from "@/components/FooterPage";
import { HelpCircle, MessageCircle, Mail, BookOpen, Search, ChevronDown } from "lucide-react";
import React from "react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

const faqs = [
  { q: "How do I start tracking my brand's AI visibility?", a: "Create an account, add your domain, and our agents will begin scanning ChatGPT, Gemini, Claude, and Perplexity within minutes. Your first audit report will be ready within 24 hours." },
  { q: "Which answer engines do you support?", a: "Currently we support ChatGPT, Gemini, Claude, and Perplexity. We're actively adding new engines including Copilot, Meta AI, and more." },
  { q: "How is my data protected?", a: "All data is encrypted at rest and in transit. We anonymize and aggregate all prompt data. Our infrastructure is SOC 2 compliant." },
  { q: "Can I track competitors?", a: "Yes. You can add competitor domains and we'll track their AI citations alongside yours, providing side-by-side comparison reports." },
  { q: "How often is data refreshed?", a: "Data is refreshed weekly with less than 7 days latency. Real-time alerts are available for critical changes in brand visibility." },
  { q: "What's the difference between plans?", a: "Our plans differ in the number of tracked brands, keywords, AI engines, and seats. See our pricing page for full details." },
];

export default function HelpCenterPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  return (
    <FooterPage
      title="Help Center"
      subtitle="Find answers to common questions or reach out to our support team."
      accentColor="#F59E0B"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "14px 20px", borderRadius: "12px",
          background: CARD_BG, border: `1px solid ${BORDER}`,
          gap: "12px"
        }}>
          <Search size={18} color={TEXT_MUTED} />
          <input type="text" placeholder="Search for answers..." style={{
            background: "none", border: "none", outline: "none",
            color: "#FFFFFF", fontSize: "0.875rem", fontFamily: "inherit", width: "100%"
          }} />
        </div>

        {/* Contact options */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {[
            { icon: MessageCircle, title: "Live Chat", desc: "Chat with our team in real-time", action: "Start Chat" },
            { icon: Mail, title: "Email Support", desc: "Get a response within 24 hours", action: "Send Email" },
            { icon: BookOpen, title: "Documentation", desc: "Browse our knowledge base", action: "View Docs" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{
                padding: "28px", borderRadius: "16px",
                background: CARD_BG, border: `1px solid ${BORDER}`,
                textAlign: "center"
              }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Icon size={20} color="#F59E0B" />
                </div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "4px" }}>{item.title}</h3>
                <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, marginBottom: "14px" }}>{item.desc}</p>
                <span style={{ fontSize: "0.8125rem", color: "#F59E0B", cursor: "pointer" }}>{item.action} →</span>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "16px" }}>Frequently Asked Questions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{
                borderRadius: "12px", border: `1px solid ${openFaq === i ? "rgba(245,158,11,0.2)" : BORDER}`,
                background: openFaq === i ? "rgba(245,158,11,0.04)" : CARD_BG, overflow: "hidden",
                transition: "all 0.2s"
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between",
                  alignItems: "center", background: "none", border: "none", color: "#FFFFFF",
                  fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit", textAlign: "left"
                }}>
                  <span>{faq.q}</span>
                  <ChevronDown size={14} style={{
                    color: TEXT_MUTED, transform: openFaq === i ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform 0.2s", flexShrink: 0
                  }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 16px 20px", fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.7 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </FooterPage>
  );
}
