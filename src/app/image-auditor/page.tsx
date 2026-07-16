"use client";

import React, { useState } from "react";
import { PhasePageShell } from "@/components/PhasePageShell";
import { AlertTriangle } from "lucide-react";

export default function ImageAuditorPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setImages(null);

    try {
      const res = await fetch("/api/seo-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tool: "images" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to audit images.");
      } else {
        setImages(data.images);
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
      title="Image Auditor"
      badgeLabel="SEO"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* URL Input form */}
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
                placeholder="e.g. https://example.com/gallery"
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
              {loading ? "Auditing..." : "Audit Images (Free)"}
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
            <p style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>Analyzing media assets & content sizes... This will take a few seconds.</p>
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

        {/* Images Grid Table */}
        {images && (
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #E3E4E8",
            padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: "#191816", borderBottom: "1px solid #F0EDE8", paddingBottom: 12, marginBottom: 20 }}>
              Image Audit Results
            </h4>
            <div style={{ overflowX: "auto" }}>
              {images.length === 0 ? (
                <p style={{ fontSize: 12, color: "#888" }}>No embedded image tags detected on webpage.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #E2E8F0", textAlign: "left", color: "#666" }}>
                      <th style={{ padding: "10px 12px" }}>Thumbnail</th>
                      <th style={{ padding: "10px 12px" }}>Source URL</th>
                      <th style={{ padding: "10px 12px" }}>Alt Attribute Tag</th>
                      <th style={{ padding: "10px 12px" }}>File Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {images.map((img, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <img src={img.src} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", background: "#F4F5F8", border: "1px solid #E3E4E8" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        </td>
                        <td style={{ padding: "10px 12px", wordBreak: "break-all", maxWidth: 220 }}>
                          <a href={img.src} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                            {img.src.length > 60 ? img.src.substring(0, 60) + "..." : img.src}
                          </a>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {img.hasAlt ? (
                            <span style={{ color: "#059669", fontWeight: 600 }}>"{img.alt}"</span>
                          ) : (
                            <span style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>Missing Alt Tag</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {img.sizeKb > 0 ? (
                            <span style={{ color: img.isTooLarge ? "#DC2626" : "#191816", fontWeight: img.isTooLarge ? 700 : 500 }}>
                              {img.sizeKb} KB {img.isTooLarge && "(Large)"}
                            </span>
                          ) : (
                            <span style={{ color: "#aaa" }}>Unknown</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>
    </PhasePageShell>
  );
}
