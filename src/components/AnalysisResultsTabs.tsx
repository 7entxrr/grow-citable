"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { BarChart3, Search, Palette, Type, Settings, Brain, Monitor, Smartphone, AlertTriangle } from "lucide-react";

/* ─────────────────── helpers ─────────────────── */

function statusColor(ok?: boolean) {
  if (ok === true) return "#16a34a";
  if (ok === false) return "#dc2626";
  return "#6b7280";
}

function statusBg(ok?: boolean) {
  if (ok === true) return "rgba(22,163,74,0.08)";
  if (ok === false) return "rgba(220,38,38,0.08)";
  return "rgba(107,114,128,0.08)";
}

function statusIcon(ok?: boolean) {
  if (ok === true)
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  if (ok === false)
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/* ─────────────────── sub-components ─────────────────── */

function SeoRow({ label, value, ok }: { label: string; value: string | number | boolean; ok?: boolean }) {
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value) || "—";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderRadius: 10,
        background: statusBg(ok),
        marginBottom: 6,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>{label}</span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: statusColor(ok),
        }}
      >
        {statusIcon(ok)}
        {display}
      </span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#aaa", marginBottom: 10, marginTop: 18 }}>
      {children}
    </p>
  );
}

/* ── Score Ring ── */
function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#f59e0b" : "#dc2626";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="#f0ede8" strokeWidth="10" />
        <circle
          cx="66" cy="66" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x="66" y="62" textAnchor="middle" fontSize="28" fontWeight="700" fill={color}>{score}</text>
        <text x="66" y="78" textAnchor="middle" fontSize="12" fill="#aaa">/100</text>
      </svg>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>
        {score >= 80 ? "Great" : score >= 50 ? "Needs Work" : "Poor"}
      </span>
    </div>
  );
}

/* ── Color Swatch ── */
function Swatch({ hex, label }: { hex: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${hex}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: hex,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "scale(1.08)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "scale(1)")}
      />
      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#888" }}>{copied ? "Copied!" : hex}</span>
      {label && <span style={{ fontSize: 10, color: "#bbb" }}>{label}</span>}
    </button>
  );
}

/* ── Tech Badge ── */
function TechBadge({ name }: { name: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: 999,
        background: "rgba(217,107,67,0.10)",
        color: "#D96B43",
        fontSize: 12,
        fontWeight: 600,
        border: "1px solid rgba(217,107,67,0.22)",
      }}
    >
      {name}
    </span>
  );
}

/* ── Font Row ── */
function FontRow({ role, name, source }: { role: string; name: string; source: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#FAF8F5",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 8,
        border: "1px solid #F0EDE8",
      }}
    >
      <div>
        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#bbb", fontWeight: 600 }}>{role}</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#191816", marginTop: 2 }}>{name}</p>
      </div>
      <span
        style={{
          borderRadius: 999,
          background: "rgba(139,92,246,0.12)",
          color: "#7c3aed",
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 10px",
        }}
      >
        {source}
      </span>
    </div>
  );
}

/* ─────────────────── TABS ─────────────────── */

type TabKey = "overview" | "seo" | "colors" | "fonts" | "tech" | "ai" | "screenshot";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
  { key: "seo", label: "SEO & Meta", icon: <Search size={16} /> },
  { key: "colors", label: "Colors", icon: <Palette size={16} /> },
  { key: "fonts", label: "Fonts", icon: <Type size={16} /> },
  { key: "tech", label: "Tech Stack", icon: <Settings size={16} /> },
  { key: "ai", label: "AI Insights", icon: <Brain size={16} /> },
  { key: "screenshot", label: "Screenshot", icon: <Monitor size={16} /> },
];

/* ─────────────────── PANELS ─────────────────── */

function OverviewPanel({ data }: { data: AnalysisResult }) {
  const { seo } = data;
  const checks = [
    { label: "HTTPS", ok: seo.isHttps },
    { label: "Viewport Meta", ok: seo.hasViewportMeta },
    { label: "OG Image", ok: seo.hasOGImage },
    { label: "Canonical URL", ok: seo.hasCanonical },
    { label: "Sitemap", ok: seo.hasSitemap },
    { label: "CSP Header", ok: seo.hasCSP },
    { label: "X-Frame-Options", ok: seo.hasXFrameOptions },
    { label: "H1 (exactly 1)", ok: seo.h1Count === 1 },
    { label: "All Images Have Alt", ok: seo.imagesWithoutAlt === 0 },
    { label: "Title Length OK", ok: seo.titleLength >= 30 && seo.titleLength <= 70 },
    { label: "Meta Desc Length OK", ok: seo.descLength >= 120 && seo.descLength <= 170 },
  ];

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
      {/* Score card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #F0EDE8",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <ScoreRing score={seo.score} />
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>SEO Health</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>{passed} passed</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{failed} failed</p>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 28 }}>
        <SectionHeading>Quick Stats</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Internal Links", value: seo.internalLinks },
            { label: "External Links", value: seo.externalLinks },
            { label: "H1 Tags", value: seo.h1Count },
            { label: "Images w/o Alt", value: seo.imagesWithoutAlt },
            { label: "Page Load", value: seo.pageLoadMs ? `${seo.pageLoadMs}ms` : "—" },
            { label: "Title Chars", value: seo.titleLength },
          ].map((s) => (
            <div key={s.label} style={{ background: "#FAF8F5", borderRadius: 10, padding: "12px 14px", border: "1px solid #F0EDE8" }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#bbb", fontWeight: 600 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#191816", marginTop: 2 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Checks summary */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 28, gridColumn: "1 / -1" }}>
        <SectionHeading>Checks at a glance</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {checks.map((c) => (
            <div
              key={c.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 8,
                background: c.ok ? "rgba(22,163,74,0.07)" : "rgba(220,38,38,0.07)",
                border: `1px solid ${c.ok ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)"}`,
              }}
            >
              <span style={{ color: c.ok ? "#16a34a" : "#dc2626", display: "flex" }}>{statusIcon(c.ok)}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#191816" }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeoPanel({ data }: { data: AnalysisResult }) {
  const { seo, meta } = data;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
      {/* Meta Tags */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
        <SectionHeading>Meta Tags</SectionHeading>
        <SeoRow label="Title" value={meta.title || "—"} ok={seo.titleLength >= 30 && seo.titleLength <= 70} />
        <SeoRow label="Title Length" value={`${seo.titleLength} chars`} ok={seo.titleLength >= 30 && seo.titleLength <= 70} />
        <SeoRow label="Meta Description" value={meta.description ? meta.description.slice(0, 70) + (meta.description.length > 70 ? "…" : "") : "—"} />
        <SeoRow label="Desc Length" value={`${seo.descLength} chars`} ok={seo.descLength >= 120 && seo.descLength <= 170} />
        <SeoRow label="Canonical URL" value={meta.canonical || "—"} ok={seo.hasCanonical} />
        <SeoRow label="Robots" value={meta.robots || "—"} />
        <SeoRow label="OG Title" value={meta.ogTitle || "—"} />
        <SeoRow label="OG Description" value={meta.ogDescription ? meta.ogDescription.slice(0, 60) + "…" : "—"} />
        <SeoRow label="OG Image" value={seo.hasOGImage} ok={seo.hasOGImage} />
        {meta.favicon && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={meta.favicon} alt="favicon" width={20} height={20} style={{ borderRadius: 4 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span style={{ fontSize: 12, color: "#888" }}>Favicon detected</span>
          </div>
        )}
      </div>

      {/* Technical SEO */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
        <SectionHeading>Technical SEO</SectionHeading>
        <SeoRow label="HTTPS" value={seo.isHttps} ok={seo.isHttps} />
        <SeoRow label="Viewport Meta" value={seo.hasViewportMeta} ok={seo.hasViewportMeta} />
        <SeoRow label="Sitemap" value={seo.hasSitemap} ok={seo.hasSitemap} />
        <SeoRow label="H1 Count" value={seo.h1Count} ok={seo.h1Count === 1} />
        <SeoRow label="Images Missing Alt" value={seo.imagesWithoutAlt} ok={seo.imagesWithoutAlt === 0} />
        <SeoRow label="Internal Links" value={seo.internalLinks} />
        <SeoRow label="External Links" value={seo.externalLinks} />
        <SeoRow label="Page Load" value={seo.pageLoadMs ? `${seo.pageLoadMs}ms` : "—"} />
      </div>

      {/* Security */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
        <SectionHeading>Security Headers</SectionHeading>
        <SeoRow label="X-Frame-Options" value={seo.hasXFrameOptions} ok={seo.hasXFrameOptions} />
        <SeoRow label="Content Security Policy" value={seo.hasCSP} ok={seo.hasCSP} />
        <SeoRow label="Cookie Banner" value={seo.hasCookieBanner} />
      </div>
    </div>
  );
}

function ColorsPanel({ data }: { data: AnalysisResult }) {
  const { colors } = data;
  const main = [
    { hex: colors.primary, label: "Primary" },
    { hex: colors.secondary, label: "Secondary" },
    { hex: colors.accent, label: "Accent" },
    { hex: colors.background, label: "Background" },
    { hex: colors.textColor, label: "Text" },
  ].filter((c) => c.hex && c.hex !== "");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
        <SectionHeading>Brand Palette</SectionHeading>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 8 }}>
          {main.map((c) => (
            <Swatch key={c.label} hex={c.hex} label={c.label} />
          ))}
        </div>
        <div style={{ marginTop: 20, padding: "10px 14px", background: "#FAF8F5", borderRadius: 10, border: "1px solid #F0EDE8" }}>
          <p style={{ fontSize: 12, color: "#888" }}>
            <strong style={{ color: "#191816" }}>Harmony: </strong>{colors.harmonyType || "Unknown"}
            <span style={{ margin: "0 8px", color: "#ccc" }}>·</span>
            {colors.isDarkMode ? "Dark mode detected" : "Light mode"}
          </p>
        </div>
      </div>

      {colors.dominant.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
          <SectionHeading>Dominant Colors (Screenshot)</SectionHeading>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
            {colors.dominant.map((hex) => (
              <Swatch key={hex} hex={hex} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FontsPanel({ data }: { data: AnalysisResult }) {
  const { fonts } = data;
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24, marginBottom: 20 }}>
        <SectionHeading>Detected Fonts</SectionHeading>
        <FontRow role="Heading" name={fonts.heading.name} source={fonts.heading.source} />
        <FontRow role="Body" name={fonts.body.name} source={fonts.body.source} />
        {fonts.mono && <FontRow role="Monospace" name={fonts.mono.name} source={fonts.mono.source} />}
      </div>
      {fonts.allDetected.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
          <SectionHeading>All Detected Fonts</SectionHeading>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {fonts.allDetected.map((f, i) => (
              <span key={`${f}-${i}`} style={{ padding: "4px 12px", background: "#FAF8F5", borderRadius: 8, fontSize: 13, border: "1px solid #F0EDE8" }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TechPanel({ data }: { data: AnalysisResult }) {
  const { techStack } = data;
  const LABELS: Record<keyof AnalysisResult["techStack"], string> = {
    framework: "Framework",
    styling: "Styling",
    analytics: "Analytics",
    marketing: "Marketing",
    hosting: "Hosting",
    cms: "CMS",
  };

  const entries = (Object.entries(techStack) as [keyof AnalysisResult["techStack"], string[]][]).filter(
    ([, items]) => items.length > 0
  );

  if (entries.length === 0) {
    return (
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 40, textAlign: "center" }}>
        <p style={{ fontSize: 15, color: "#aaa" }}>No technologies detected.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
      {entries.map(([cat, items]) => (
        <div key={cat} style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
          <SectionHeading>{LABELS[cat]}</SectionHeading>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {items.map((tech) => (
              <TechBadge key={tech} name={tech} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AIPanel({ data }: { data: AnalysisResult }) {
  const { ai } = data;
  const PLACEHOLDER = new Set(["unknown", "analysis unavailable", ""]);
  const tags = [
    { id: "topic", label: "Topic", value: ai.topic },
    { id: "niche", label: "Niche", value: ai.niche },
    { id: "tone", label: "Tone", value: ai.tone },
    { id: "design", label: "Design Style", value: ai.designStyle },
  ].filter((t) => t.value.trim() && !PLACEHOLDER.has(t.value.trim().toLowerCase()));

  const qualColor = ai.contentQuality >= 70 ? "#16a34a" : ai.contentQuality >= 40 ? "#f59e0b" : "#dc2626";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
      {/* Summary */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24, gridColumn: "1 / -1" }}>
        <SectionHeading>AI Summary</SectionHeading>
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {tags.map((t) => (
              <span
                key={t.id}
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  padding: "4px 12px",
                  background: "rgba(139,92,246,0.10)",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#7c3aed",
                  border: "1px solid rgba(139,92,246,0.18)",
                  gap: 0,
                }}
              >
                <span style={{ fontSize: 9, color: "#bbb", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</span>
                {t.value}
              </span>
            ))}
          </div>
        )}
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444" }}>{ai.summary || "No summary available."}</p>
      </div>

      {/* Details */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
        <SectionHeading>Details</SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #f5f5f5", paddingBottom: 8 }}>
            <span style={{ color: "#888" }}>Target Audience</span>
            <span style={{ fontWeight: 600, color: "#191816" }}>{ai.targetAudience || "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #f5f5f5", paddingBottom: 8 }}>
            <span style={{ color: "#888" }}>Content Quality</span>
            <span style={{ fontWeight: 700, color: qualColor }}>{ai.contentQuality}/100</span>
          </div>
          {ai.ctaText && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #f5f5f5", paddingBottom: 8 }}>
              <span style={{ color: "#888" }}>CTA Text</span>
              <span style={{ fontWeight: 600, color: "#191816" }}>
                {ai.ctaText}
                {ai.hasCtaAboveFold && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: "#D96B43", fontWeight: 700 }}>above fold</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quality bar */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
        <SectionHeading>Content Quality Score</SectionHeading>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#888" }}>Score</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: qualColor }}>{ai.contentQuality}<span style={{ fontSize: 12, fontWeight: 400, color: "#bbb" }}>/100</span></span>
          </div>
          <div style={{ height: 8, background: "#F0EDE8", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${ai.contentQuality}%`, background: qualColor, borderRadius: 999, transition: "width 0.5s ease" }} />
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {ai.suggestions.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24, gridColumn: "1 / -1" }}>
          <SectionHeading>Suggestions</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {ai.suggestions.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "10px 14px",
                  background: "rgba(217,107,67,0.06)",
                  borderRadius: 10,
                  border: "1px solid rgba(217,107,67,0.14)",
                }}
              >
                <span style={{ fontSize: 14, color: "#D96B43", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScreenshotPanel({ data }: { data: AnalysisResult }) {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const { screenshot } = data;
  const src = view === "desktop" ? screenshot.desktop : screenshot.mobile;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["desktop", "mobile"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            style={{
              padding: "6px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              background: view === v ? "#D96B43" : "#F0EDE8",
              color: view === v ? "#fff" : "#666",
              transition: "all 0.2s ease",
            }}
          >
            {v === "desktop" ? <><Monitor size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Desktop</> : <><Smartphone size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Mobile</>}
          </button>
        ))}
      </div>
      {src ? (
        <div
          style={{
            overflow: "hidden",
            borderRadius: 12,
            border: "1px solid #F0EDE8",
            maxWidth: view === "mobile" ? 375 : "100%",
            margin: view === "mobile" ? "0 auto" : undefined,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/jpeg;base64,${src}`}
            alt={`${view} screenshot`}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>
          Screenshot unavailable (Puppeteer may have failed).
        </div>
      )}
    </div>
  );
}

/* ─────────────────── MAIN COMPONENT ─────────────────── */

interface Props {
  data: AnalysisResult;
}

export function AnalysisResultsTabs({ data }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${new URL(data.url).hostname}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const scoreColor = data.seo.score >= 80 ? "#16a34a" : data.seo.score >= 50 ? "#f59e0b" : "#dc2626";

  return (
    <div style={{ fontFamily: "'Kumbh Sans', Inter, system-ui, sans-serif" }}>
      {/* ── Sticky Header ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(250,248,245,0.96)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #F0EDE8",
          padding: "14px 0",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Site info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {data.meta.favicon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.meta.favicon}
                alt=""
                width={28}
                height={28}
                style={{ borderRadius: 6, flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#191816", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>
                {data.meta.title || data.url}
              </p>
              <p style={{ fontSize: 11, color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>
                {data.url}
              </p>
            </div>
          </div>

          {/* Score pill + export */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                background: scoreColor + "18",
                border: `1.5px solid ${scoreColor}30`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>SEO Score</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor }}>{data.seo.score}</span>
              <span style={{ fontSize: 11, color: "#bbb" }}>/100</span>
            </div>
            <button
              type="button"
              onClick={exportJson}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid #F0EDE8",
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                color: "#555",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#FAF8F5")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fff")}
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* ── Warnings ── */}
      {data.warnings.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: "#b45309", marginBottom: 6 }}>
            <AlertTriangle size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Warnings</p>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            {data.warnings.map((w, i) => (
              <li key={i} style={{ fontSize: 13, color: "#92400e", marginBottom: 2 }}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          overflowX: "auto",
          paddingBottom: 2,
          marginBottom: 20,
          borderBottom: "2px solid #F0EDE8",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              border: "none",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              whiteSpace: "nowrap",
              transition: "all 0.18s ease",
              background: activeTab === tab.key ? "#fff" : "transparent",
              color: activeTab === tab.key ? "#D96B43" : "#888",
              borderBottom: activeTab === tab.key ? "2px solid #D96B43" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Panel ── */}
      <div>
        {activeTab === "overview" && <OverviewPanel data={data} />}
        {activeTab === "seo" && <SeoPanel data={data} />}
        {activeTab === "colors" && <ColorsPanel data={data} />}
        {activeTab === "fonts" && <FontsPanel data={data} />}
        {activeTab === "tech" && <TechPanel data={data} />}
        {activeTab === "ai" && <AIPanel data={data} />}
        {activeTab === "screenshot" && <ScreenshotPanel data={data} />}
      </div>

      {/* ── Footer ── */}
      <p style={{ textAlign: "center", fontSize: 11, color: "#bbb", marginTop: 32 }}>
        Analyzed at {new Date(data.analyzedAt).toLocaleString()}
      </p>
    </div>
  );
}
