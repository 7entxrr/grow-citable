"use client";

import React, { useState } from "react";
import { PhasePageShell } from "@/components/PhasePageShell";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function CanonicalMetaPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/seo-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tool: "canonical" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to audit metadata.");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || "Network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PhasePageShell
      phase={0}
      title="Canonical & Meta"
      badgeLabel="SEO"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Form Inputs */}
        <form onSubmit={handleAudit} style={{
          background: "#fff", borderRadius: 12, border: "1px solid #E3E4E8",
          padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#888", display: "block", marginBottom: 6 }}>Target Website URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. https://example.com"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: "1px solid #E3E4E8", fontSize: 13, outline: "none"
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #4B28FF 0%, #7C5CFF 100%)",
                color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 24px", fontSize: 13, fontWeight: 800,
                cursor: "pointer", opacity: loading ? 0.7 : 1,
                boxShadow: "0 4px 12px rgba(75, 40, 255, 0.15)",
                height: 38
              }}
            >
              {loading ? "Analyzing..." : "Audit Metadata (Free)"}
            </button>
          </div>
        </form>

        {/* Loading Spinner */}
        {loading && (
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #E3E4E8",
            padding: "48px 24px", textAlign: "center"
          }}>
            <div style={{
              width: 32, height: 32, border: "3px solid #E2E8F0",
              borderTopColor: "#4B28FF", borderRadius: "50%",
              animation: "spin 1s linear infinite", margin: "0 auto 16px"
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>Analyzing headers and meta-content tags... This will take a few seconds.</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8,
            background: "#FEF2F2", border: "1px solid #FCA5A5",
            borderRadius: 12, padding: "16px 20px", color: "#991B1B",
            fontSize: 13, fontWeight: 600
          }}>
            <AlertTriangle size={16} />
            <span>Error: {error}</span>
          </div>
        )}

        {/* Output Diagnostics */}
        {result && (
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #E3E4E8",
            padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: "#191816", borderBottom: "1px solid #F0EDE8", paddingBottom: 12, marginBottom: 20 }}>
              Tag Integrity Diagnostics
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
              
              {/* Meta properties */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Meta Title Tag</span>
                  <strong style={{ fontSize: 14, color: "#191816", display: "block", marginTop: 4 }}>{result.metadata.title || <em style={{ color: "#dc2626" }}>[Missing]</em>}</strong>
                  <span style={{ fontSize: 10, color: "#666", display: "block", marginTop: 2 }}>({result.metadata.title?.length || 0} characters)</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Meta Description Tag</span>
                  <strong style={{ fontSize: 13, color: "#191816", lineHeight: 1.4, display: "block", marginTop: 4 }}>{result.metadata.description || <em style={{ color: "#dc2626" }}>[Missing]</em>}</strong>
                  <span style={{ fontSize: 10, color: "#666", display: "block", marginTop: 2 }}>({result.metadata.description?.length || 0} characters)</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Canonical Link Declaration</span>
                  <strong style={{ fontSize: 12, color: "#2563eb", textDecoration: "underline", wordBreak: "break-all", display: "block", marginTop: 4 }}>
                    {result.metadata.canonical || <em style={{ color: "#dc2626" }}>[Missing]</em>}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", display: "block" }}>Robots Indexing Directives</span>
                  <strong style={{ fontSize: 12, color: "#191816", display: "block", marginTop: 4 }}>{result.metadata.robots || "None specified (defaults to index, follow)"}</strong>
                </div>
              </div>
              
              {/* Warnings panel */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#191816", margin: "0 0 10px 0" }}>Audit Alerts & Recommendations</p>
                {result.warnings.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#059669", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><CheckCircle size={14} /> Canonical URLs and meta tag criteria are optimized correctly!</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, display: "flex", flexDirection: "column", gap: 8, color: "#B45309" }}>
                    {result.warnings.map((w: any, idx: number) => (
                      <li key={idx} style={{ fontWeight: 600 }}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </PhasePageShell>
  );
}
