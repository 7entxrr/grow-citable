"use client";

import React, { useState } from "react";
import { PhasePageShell } from "@/components/PhasePageShell";
import { ChevronDown, BarChart3 } from "lucide-react";

export default function TrafficAnalyticsPage() {
  const [googleMetricTab, setGoogleMetricTab] = useState<"users" | "sessions" | "engagedSessions" | "engagedSessionsPerUser" | "avgEngagementTime" | "engagementRate">("users");
  const [visibleChannels, setVisibleChannels] = useState({
    direct: true,
    referral: true,
    organicSearch: true,
    organicSocial: true,
    paidSearch: true,
    custom: true
  });

  return (
    <PhasePageShell
      phase={0}
      title="Traffic Analytics"
      badgeLabel="SEO"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Main Card */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E3E4E8", padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.01)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F0EDE8", paddingBottom: 16, marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#191816", margin: 0 }}>Traffic Analytics Overview</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: "#e28743", fontWeight: 700 }}>Google Analytics: Vaz Auto Solutions/vazautosolutions.com/vazautosolutions.com</span>
              </div>
            </div>

            {/* Date Selection */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", background: "#f1f5f9", padding: "6px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <span>Jun 11 - Jul 10, 2026</span>
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Google GA4 Metrics Tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { id: "users", label: "Users", value: "6.4K", change: "+27.69%" },
              { id: "sessions", label: "Sessions", value: "7.7K", change: "+32.32%" },
              { id: "engagedSessions", label: "Engaged Sessions", value: "5.5K", change: "+40.39%" },
              { id: "engagedSessionsPerUser", label: "Engaged Sessions per User", value: "0.85", change: "+9.94%" },
              { id: "avgEngagementTime", label: "Avg. engagement time", value: "00:00:55", change: "+3.78%" },
              { id: "engagementRate", label: "Engagement rate", value: "71.16%", change: "+6.1%" },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setGoogleMetricTab(m.id as any)}
                style={{
                  padding: "16px 20px", borderRadius: 8, background: googleMetricTab === m.id ? "#F3F4FE" : "#fff",
                  border: googleMetricTab === m.id ? "2px solid #4B28FF" : "1px solid #E3E4E8",
                  cursor: "pointer", transition: "all 0.15s ease",
                  boxShadow: googleMetricTab === m.id ? "0 4px 12px rgba(75, 40, 255, 0.06)" : "none",
                }}
              >
                <span style={{ fontSize: 11, color: "#666", fontWeight: 700, display: "block", textTransform: "uppercase" }}>{m.label}</span>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#191816", margin: "4px 0" }}>{m.value}</p>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>{m.change}</span>
              </div>
            ))}
          </div>

          {/* Google Traffic Line Chart */}
          <div style={{ width: "100%", height: 260, position: "relative" }}>
            <svg width="100%" height="100%" viewBox="0 0 1000 240" preserveAspectRatio="none">
              <line x1="50" y1="20" x2="950" y2="20" stroke="#F0EDE8" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="50" y1="75" x2="950" y2="75" stroke="#F0EDE8" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="50" y1="130" x2="950" y2="130" stroke="#F0EDE8" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="50" y1="185" x2="950" y2="185" stroke="#F0EDE8" strokeWidth="1" strokeDasharray="4 4" />
              
              <line x1="50" y1="20" x2="50" y2="200" stroke="#C4C5CA" strokeWidth="1" />
              <line x1="50" y1="200" x2="950" y2="200" stroke="#C4C5CA" strokeWidth="1" />

              {/* Organic Search (Red) with massive spike */}
              {visibleChannels.organicSearch && (
                <>
                  <path d="M 50 190 L 150 188 L 300 185 L 420 182 L 450 178 L 470 120 L 490 60 L 510 110 L 530 180 L 650 183 L 800 182 L 950 190" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 50 190 L 150 188 L 300 185 L 420 182 L 450 178 L 470 120 L 490 60 L 510 110 L 530 180 L 650 183 L 800 182 L 950 190 L 950 200 L 50 200 Z" fill="rgba(239,68,68,0.02)" />
                  <circle cx="490" cy="60" r="5" fill="#ef4444" />
                </>
              )}

              {/* Direct (Blue) with smaller spike */}
              {visibleChannels.direct && (
                <path d="M 50 192 L 150 190 L 300 188 L 420 185 L 450 182 L 470 160 L 490 145 L 510 165 L 530 188 L 650 190 L 800 189 L 950 192" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
              )}

              {/* Referral (Teal) */}
              {visibleChannels.referral && (
                <path d="M 50 196 L 150 196 L 300 195 L 420 195 L 450 196 L 470 196 L 490 196 L 510 196 L 530 196 L 650 195 L 800 196 L 950 196" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              )}

              {/* Organic Social (Orange) */}
              {visibleChannels.organicSocial && (
                <path d="M 50 197 L 150 197 L 300 197 L 420 197 L 450 197 L 470 197 L 490 197 L 510 197 L 530 197 L 650 197 L 800 197 L 950 197" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* Paid Search (Purple) */}
              {visibleChannels.paidSearch && (
                <path d="M 50 198 L 150 198 L 300 198 L 420 198 L 450 198 L 470 198 L 490 198 L 510 198 L 530 198 L 650 198 L 800 198 L 950 198" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* Custom (Light Green) */}
              {visibleChannels.custom && (
                <path d="M 50 199 L 150 199 L 300 199 L 420 199 L 450 199 L 470 199 L 490 199 L 510 199 L 530 199 L 650 199 L 800 199 L 950 199" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
              )}
              
              <text x="50" y="222" fill="#888" fontSize="12" textAnchor="middle">Jun 11</text>
              <text x="200" y="222" fill="#888" fontSize="12" textAnchor="middle">Jun 16</text>
              <text x="350" y="222" fill="#888" fontSize="12" textAnchor="middle">Jun 21</text>
              <text x="500" y="222" fill="#888" fontSize="12" textAnchor="middle">Jun 26</text>
              <text x="650" y="222" fill="#888" fontSize="12" textAnchor="middle">Jul 01</text>
              <text x="800" y="222" fill="#888" fontSize="12" textAnchor="middle">Jul 06</text>
              <text x="950" y="222" fill="#888" fontSize="12" textAnchor="middle">Jul 10</text>

              <text x="40" y="24" fill="#888" fontSize="11" textAnchor="end">3K</text>
              <text x="40" y="79" fill="#888" fontSize="11" textAnchor="end">2K</text>
              <text x="40" y="134" fill="#888" fontSize="11" textAnchor="end">1K</text>
              <text x="40" y="189" fill="#888" fontSize="11" textAnchor="end">0</text>
            </svg>
          </div>

          {/* Toggle channels checkboxes */}
          <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 16, flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#2563eb" }}>
              <input
                type="checkbox"
                checked={visibleChannels.direct}
                onChange={(e) => setVisibleChannels({ ...visibleChannels, direct: e.target.checked })}
                style={{ accentColor: "#2563eb" }}
              />
              <span>Direct</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#10b981" }}>
              <input
                type="checkbox"
                checked={visibleChannels.referral}
                onChange={(e) => setVisibleChannels({ ...visibleChannels, referral: e.target.checked })}
                style={{ accentColor: "#10b981" }}
              />
              <span>Referral</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#ef4444" }}>
              <input
                type="checkbox"
                checked={visibleChannels.organicSearch}
                onChange={(e) => setVisibleChannels({ ...visibleChannels, organicSearch: e.target.checked })}
                style={{ accentColor: "#ef4444" }}
              />
              <span>Organic Search</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#f97316" }}>
              <input
                type="checkbox"
                checked={visibleChannels.organicSocial}
                onChange={(e) => setVisibleChannels({ ...visibleChannels, organicSocial: e.target.checked })}
                style={{ accentColor: "#f97316" }}
              />
              <span>Organic Social</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#a855f7" }}>
              <input
                type="checkbox"
                checked={visibleChannels.paidSearch}
                onChange={(e) => setVisibleChannels({ ...visibleChannels, paidSearch: e.target.checked })}
                style={{ accentColor: "#a855f7" }}
              />
              <span>Paid Search</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#4ade80" }}>
              <input
                type="checkbox"
                checked={visibleChannels.custom}
                onChange={(e) => setVisibleChannels({ ...visibleChannels, custom: e.target.checked })}
                style={{ accentColor: "#4ade80" }}
              />
              <span>Custom</span>
            </label>
          </div>

          {/* Google Analytics Setup Guidance & Brief */}
          <div style={{
            marginTop: 32, background: "rgba(75, 40, 255, 0.03)", border: "1px dashed rgba(75, 40, 255, 0.25)",
            borderRadius: 12, padding: "20px 24px", color: "#191816"
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <BarChart3 size={20} style={{ color: "#4B28FF", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: "#4B28FF", margin: "0 0 6px 0" }}>
                  How to Connect Your Live Google Analytics 4 (GA4) Property
                </h4>
                <p style={{ fontSize: 12, color: "#555", margin: "0 0 16px 0", lineHeight: 1.4 }}>
                  To connect this dashboard directly to your live Google Analytics 4 account, follow this quick setup brief:
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                  <div>
                    <h5 style={{ fontSize: 12, fontWeight: 700, margin: "0 0 8px 0", color: "#191816" }}>Step 1: Obtain Google Credentials</h5>
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                      <li>Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>Google Cloud Console</a>.</li>
                      <li>Enable the <strong>Google Analytics Data API (v1beta)</strong>.</li>
                      <li>Create a Service Account, select "JSON" key type, and download the key.</li>
                      <li>Add the Service Account's email to your Google Analytics Property Access Management (with Viewer role).</li>
                    </ol>
                  </div>
                  <div>
                    <h5 style={{ fontSize: 12, fontWeight: 700, margin: "0 0 8px 0", color: "#191816" }}>Step 2: Add Environment Variables</h5>
                    <p style={{ fontSize: 12, color: "#666", margin: "0 0 8px 0", lineHeight: 1.5 }}>
                      Add these keys inside your local <code style={{ background: "rgba(0,0,0,0.05)", padding: "2px 4px", borderRadius: 4 }}>.env.local</code> file:
                    </p>
                    <pre style={{
                      background: "#fff", border: "1px solid #E3E4E8", borderRadius: 6,
                      padding: 10, fontSize: 11, color: "#333", fontFamily: "monospace", margin: 0,
                      overflowX: "auto"
                    }}>
{`GA_PROPERTY_ID="your-ga4-property-id"
GOOGLE_CLIENT_EMAIL="your-service-account@iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PhasePageShell>
  );
}
