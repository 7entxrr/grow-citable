"use client";

import React, { useState } from "react";
import { PhasePageShell } from "@/components/PhasePageShell";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function RobotsTesterPage() {
  const [url, setUrl] = useState("");
  const [testPath, setTestPath] = useState("/");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ content: string; rules: any[]; isAllowed: boolean; warning?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/seo-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tool: "robots", robotsPath: testPath }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to audit robots.txt.");
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
      title="Robots.txt Tester"
      badgeLabel="SEO"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Form Inputs */}
        <form onSubmit={handleTest} style={{
          background: "#fff", borderRadius: 12, border: "1px solid #E3E4E8",
          padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
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
            <div style={{ width: 180 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#888", display: "block", marginBottom: 6 }}>Path to Test</label>
              <input
                type="text"
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                placeholder="e.g. /admin"
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
              {loading ? "Testing..." : "Test Path (Free)"}
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
            <p style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>Analyzing robots.txt access rules... This will take a few seconds.</p>
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

        {/* Test Result */}
        {result && (
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #E3E4E8",
            padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: "#191816", borderBottom: "1px solid #F0EDE8", paddingBottom: 12, marginBottom: 20 }}>
              Robots.txt Evaluation Diagnostics
            </h4>
            <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 24, alignItems: "stretch" }}>
              {/* Rules Text Content */}
              <div style={{ flex: "1 1 350px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#191816", marginBottom: 8 }}>Raw Robots.txt Rules</p>
                <pre style={{
                  background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8,
                  padding: 16, fontSize: 12, color: "#333", maxHeight: 300, overflowY: "auto",
                  fontFamily: "monospace", margin: 0, whiteSpace: "pre-wrap"
                }}>
                  {result.content}
                </pre>
              </div>
              
              {/* Access Tester Panel */}
              <div style={{
                flex: "1 1 250px",
                background: result.isAllowed ? "#F0FDF4" : "#FEF2F2",
                border: result.isAllowed ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", justifyContent: "center"
              }}>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: result.isAllowed ? "#166534" : "#991B1B", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: 8 }}>
                  {result.isAllowed ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  {result.isAllowed ? "Path is Accessible" : "Path is Blocked"}
                </h4>
                <p style={{ fontSize: 13, color: result.isAllowed ? "#166534" : "#991B1B", margin: "0 0 12px 0", lineHeight: 1.4 }}>
                  The path <code style={{ background: "rgba(0,0,0,0.05)", padding: "2px 4px", borderRadius: 4 }}>{testPath}</code> was tested against the crawled robots ruleset.
                </p>
                {result.warning && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#B45309", padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    <AlertTriangle size={14} />
                    <span>{result.warning}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </PhasePageShell>
  );
}
