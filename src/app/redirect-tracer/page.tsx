"use client";

import React, { useState } from "react";
import { PhasePageShell } from "@/components/PhasePageShell";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function RedirectTracerPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [hops, setHops] = useState<{ url: string; status: number; redirectUrl: string | null }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTrace(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setHops(null);

    try {
      const res = await fetch("/api/seo-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tool: "redirect" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to trace redirects.");
      } else {
        setHops(data.hops);
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
      title="Redirect Tracer"
      badgeLabel="SEO"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* URL Input Form */}
        <form onSubmit={handleTrace} style={{
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
                placeholder="e.g. http://example.com"
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
              {loading ? "Tracing..." : "Trace Hops (Free)"}
            </button>
          </div>
        </form>

        {/* Loading State */}
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
            <p style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>Tracing redirects... This will take a few seconds.</p>
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

        {/* Trace Results */}
        {hops && (
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #E3E4E8",
            padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: "#191816", borderBottom: "1px solid #F0EDE8", paddingBottom: 12, marginBottom: 20 }}>
              Redirect Chain Breakdown
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {hops.map((hop, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: hop.status >= 300 && hop.status < 400 ? "#f59e0b" : hop.status === 200 ? "#10b981" : "#ef4444",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 12, flexShrink: 0
                    }}>
                      {idx + 1}
                    </div>
                    {idx < hops.length - 1 && (
                      <div style={{ width: 2, height: 40, background: "#E2E8F0", marginTop: 4 }} />
                    )}
                  </div>
                  
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                        color: hop.status >= 300 && hop.status < 400 ? "#d97706" : hop.status === 200 ? "#059669" : "#dc2626"
                      }}>
                        {hop.status === 301 ? "301 Permanent Redirect" :
                         hop.status === 302 ? "302 Temporary Redirect" :
                         hop.status === 200 ? "200 OK" : hop.status === 0 ? "Request Error / Blocked" : `Status ${hop.status}`}
                      </span>
                    </div>
                    <a href={hop.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#2563eb", textDecoration: "underline", wordBreak: "break-all" }}>
                      {hop.url}
                    </a>
                    {hop.redirectUrl && (
                      <div style={{ marginTop: 8, fontSize: 11, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>
                        <ArrowRight size={12} /> Redirects to: <span style={{ color: "#191816", fontWeight: 600 }}>{hop.redirectUrl}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </PhasePageShell>
  );
}
