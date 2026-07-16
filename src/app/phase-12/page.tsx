"use client";

import React, { useState } from "react";
import { FolderOpen, Link2, Target, Microscope } from "lucide-react";
import {
  PhasePageShell, FormCard, InfoCard,
  PremiumInput, SubmitButton, ErrorBox, LoadingCard, ResultCard,
} from "@/components/PhasePageShell";
import { CategoryCard } from "@/components/onpage/CategoryCard";
import type { OnPageSeoReport } from "@/types/onPageSeo";

const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#ea580c", F: "#dc2626",
};

function getAbsoluteFavicon(favicon: string, baseUrl: string): string {
  if (!favicon) return "";
  if (favicon.startsWith("http://") || favicon.startsWith("https://")) {
    return favicon;
  }
  try {
    const origin = new URL(baseUrl).origin;
    if (favicon.startsWith("/")) {
      return origin + favicon;
    }
    return origin + "/" + favicon;
  } catch {
    return favicon;
  }
}

export default function Phase12Page() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnPageSeoReport | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) { setError("Please enter a page URL."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/onpage/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), keyword: keyword.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Analysis failed");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally { setLoading(false); }
  }

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `onpage-${new URL(data.url).hostname}.json`; a.click();
    URL.revokeObjectURL(u);
  }

  const gradeColor = data ? (GRADE_COLORS[data.grade] ?? "#D96B43") : "#D96B43";

  return (
    <PhasePageShell
      phase={12} title="On-Page SEO Auditor"
      badgeLabel="On-Page Engine" badgeIcon={<FolderOpen size={14} />}
      accentColor="#2563eb"
      hasResults={!!data} onExport={exportJson}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <FormCard>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <PremiumInput label="Page URL" placeholder="https://yoursite.com/page-to-audit" value={url} onChange={setUrl} icon={<Link2 size={18} />} />
            <PremiumInput label="Focus Keyword (optional)" placeholder="e.g., ai search tools" value={keyword} onChange={setKeyword} icon={<Target size={18} />} hint="We'll check keyword density in title, meta, headings, and body." />
            {error && <ErrorBox message={error} />}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SubmitButton loading={loading} label="Audit Page" loadingLabel="Auditing Page…" tokens={0} />
            </div>
          </form>
        </FormCard>

        <InfoCard
          icon={<Microscope size={28} />}
          title="On-Page Guide"
          body="Verify title tags, heading structure, content quality, schema metadata, page speeds, internal linking, and indexability signals."
        />
      </div>

      {loading && <LoadingCard message="Fetching page source, analysing metadata, keyword density, and performance indicators…" />}

      {data && !loading && (
        <div style={{ marginTop: 28 }}>
          {/* Grade hero */}
          <div style={{
            background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8",
            padding: "24px 28px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 24,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 16, flexShrink: 0,
              background: gradeColor, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, fontWeight: 800, color: "#fff",
              boxShadow: `0 8px 24px ${gradeColor}44`,
            }}>
              {data.grade}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 4 }}>
                On-Page SEO Report
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {data.rawMeta.favicon && (
                  <img
                    src={getAbsoluteFavicon(data.rawMeta.favicon, data.url)}
                    alt="Favicon"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      flexShrink: 0,
                      objectFit: "contain",
                      border: "1px solid #eee",
                      padding: 1,
                      background: "#fff",
                    }}
                  />
                )}
                <p style={{ fontSize: 16, fontWeight: 700, color: "#191816", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                  {data.url}
                </p>
              </div>
              <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                Keyword: <strong style={{ color: "#2563eb" }}>{data.targetKeyword || "None"}</strong>
                {" · "}Scanned on {new Date(data.analyzedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Categories */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {data.categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      )}
    </PhasePageShell>
  );
}
