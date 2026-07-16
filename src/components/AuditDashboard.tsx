"use client";

import React, { useState, useEffect } from 'react';
import { Search, Globe, AlertTriangle, CheckCircle, XCircle, ExternalLink, BarChart3, FileText, Layers, ChevronRight, Calendar, Trash2 } from 'lucide-react';
import { AuditData } from '@/lib/auditFirestore';
import { useRouter } from 'next/navigation';

interface AuditDashboardProps {
  audits: AuditData[];
  loading: boolean;
  onSelectAudit: (audit: AuditData) => void;
  onDeleteAudit?: (auditId: string) => void;
}

function SkeletonCard() {
  return (
    <div style={{
      padding: "20px",
      borderRadius: 12,
      background: "#fff",
      border: "1px solid #e5e5e5",
      animation: "pulse 1.5s ease-in-out infinite",
    }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f0f0f0" }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: "60%", height: 16, background: "#f0f0f0", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ width: "40%", height: 12, background: "#f0f0f0", borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 40, background: "#f0f0f0", borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}

export function AuditDashboard({ audits, loading, onSelectAudit, onDeleteAudit }: AuditDashboardProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div style={{ padding: "40px 20px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", marginBottom: 24 }}>
            Your Website Audits
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (audits.length === 0) {
    return null; // Will show input form instead
  }

  return (
    <div style={{ padding: "40px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
            Your Website Audits
          </h2>
          <button
            onClick={() => router.push('/phase-1')}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: "#000",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Search size={16} />
            New Audit
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16 }}>
          {audits.map((audit, index) => {
            const domain = new URL(audit.url).hostname;
            const date = audit.timestamp ? new Date(audit.timestamp.seconds * 1000).toLocaleDateString() : 'Unknown';
            const totalPages = audit.crawl.totalCrawled;
            const issuesCount = audit.crawl.brokenLinks + audit.crawl.orphanPages.length + audit.crawl.duplicateContentList.length;
            const healthScore = Math.round((audit.aiReadability.score + audit.geo.score + audit.aeo.score) / 3);

            return (
              <div
                key={index}
                style={{
                  padding: "20px",
                  borderRadius: 12,
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => onSelectAudit(audit)}
                onMouseOver={e => e.currentTarget.style.borderColor = "#000"}
                onMouseOut={e => e.currentTarget.style.borderColor = "#e5e5e5"}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: "#f8f9fa", border: "1px solid #e5e5e5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Globe size={20} style={{ color: "#666" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {domain}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888" }}>
                      <Calendar size={12} />
                      <span>{date}</span>
                    </div>
                  </div>
                  {onDeleteAudit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAudit(`${audit.crawl.title}_${audit.timestamp.seconds}`);
                      }}
                      style={{
                        padding: "6px",
                        borderRadius: 6,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#999",
                      }}
                      onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseOut={e => e.currentTarget.style.color = "#999"}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Stats Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
                  <div style={{ padding: "12px", borderRadius: 8, background: "#f8f9fa" }}>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 4 }}>PAGES</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{totalPages}</div>
                  </div>
                  <div style={{ padding: "12px", borderRadius: 8, background: "#f8f9fa" }}>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 4 }}>ISSUES</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: issuesCount > 0 ? "#ef4444" : "#22c55e" }}>{issuesCount}</div>
                  </div>
                  <div style={{ padding: "12px", borderRadius: 8, background: "#f8f9fa" }}>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 4 }}>HEALTH</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: healthScore >= 70 ? "#22c55e" : healthScore >= 50 ? "#f59e0b" : "#ef4444" }}>{healthScore}%</div>
                  </div>
                  <div style={{ padding: "12px", borderRadius: 8, background: "#f8f9fa" }}>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 4 }}>AI VISIBILITY</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>{audit.aiVisibility?.length || 0}/8</div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: audit.crawl.brokenLinks > 0 ? "#fef2f2" : "#f0fdf4",
                    color: audit.crawl.brokenLinks > 0 ? "#dc2626" : "#16a34a",
                  }}>
                    {audit.crawl.brokenLinks} Broken Links
                  </span>
                  <span style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: audit.crawl.orphanPages.length > 0 ? "#fefce8" : "#f0fdf4",
                    color: audit.crawl.orphanPages.length > 0 ? "#ca8a04" : "#16a34a",
                  }}>
                    {audit.crawl.orphanPages.length} Orphan Pages
                  </span>
                  <span style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: audit.crawl.duplicateContentList.length > 0 ? "#fefce8" : "#f0fdf4",
                    color: audit.crawl.duplicateContentList.length > 0 ? "#ca8a04" : "#16a34a",
                  }}>
                    {audit.crawl.duplicateContentList.length} Duplicates
                  </span>
                </div>

                {/* View Button */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#000" }}>
                    View Full Analysis
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
