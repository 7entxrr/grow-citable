"use client";

import FooterPage from "@/components/FooterPage";
import { Building2, Shield, Globe, Users, BarChart3, CheckCircle, ArrowRight } from "lucide-react";

const TEXT_MUTED = "rgba(255,255,255,0.4)";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(255,255,255,0.03)";

const features = [
  { icon: Shield, title: "Enterprise Security", desc: "SOC 2 compliant infrastructure with end-to-end encryption. SSO, role-based access control, and audit logs included." },
  { icon: Globe, title: "Multi-Brand Management", desc: "Monitor unlimited brands and domains from a single dashboard. Compare performance across your entire portfolio." },
  { icon: Users, title: "Team Collaboration", desc: "Unlimited team seats with granular permissions. Share dashboards, reports, and alerts across your organization." },
  { icon: BarChart3, title: "Custom Reporting", desc: "White-label reports, scheduled exports, and API access for integrating AI visibility data into your existing workflows." },
  { icon: Building2, title: "Dedicated Support", desc: "Enterprise-grade support with a dedicated account manager, priority response times, and custom onboarding." },
  { icon: CheckCircle, title: "Custom Integrations", desc: "API-first architecture with webhooks, custom integrations, and support for your existing tech stack." },
];

export default function EnterprisePage() {
  return (
    <FooterPage
      title="Enterprise"
      subtitle="Scale your AI visibility program across your entire organization with enterprise-grade security, collaboration, and support."
      accentColor="#F59E0B"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px",
          padding: "40px", borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.06))",
          border: `1px solid ${BORDER}`,
        }}>
          {[
            { val: "99.9%", label: "Uptime SLA" },
            { val: "< 1hr", label: "Support Response" },
            { val: "Unlimited", label: "Team Seats" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 500, color: "#F59E0B", marginBottom: "4px" }}>{s.val}</div>
              <div style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} style={{ padding: "28px", borderRadius: "16px", background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                  <Icon size={18} color="#F59E0B" />
                </div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "6px" }}>{f.title}</h3>
                <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", padding: "40px", borderRadius: "16px", background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "8px" }}>Ready for enterprise-scale AI visibility?</h3>
          <p style={{ fontSize: "0.8125rem", color: TEXT_MUTED, marginBottom: "20px" }}>Talk to our team about a custom plan for your organization.</p>
          <button style={{
            padding: "12px 28px", borderRadius: "40px", border: "none",
            background: "#F59E0B", color: "#FFFFFF", fontSize: "0.875rem",
            cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: "8px"
          }}>Contact Sales <ArrowRight size={14} /></button>
        </div>
      </div>
    </FooterPage>
  );
}
