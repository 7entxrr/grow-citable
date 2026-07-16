"use client";

import React, { useState } from "react";
import { Trophy, Globe, Shield } from "lucide-react";
import {
  PhasePageShell, FormCard, InfoCard,
  PremiumInput, SubmitButton, ErrorBox, LoadingCard, StatCard, ResultCard,
} from "@/components/PhasePageShell";
import type { DomainAuthorityReport } from "@/types/domainAuthority";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  good:    { bg: "rgba(22,163,74,0.08)",   color: "#16a34a", label: "Good" },
  ok:      { bg: "rgba(37,99,235,0.08)",   color: "#2563eb", label: "OK" },
  weak:    { bg: "rgba(217,119,6,0.08)",   color: "#d97706", label: "Weak" },
  missing: { bg: "rgba(220,38,38,0.08)",   color: "#dc2626", label: "Missing" },
  unknown: { bg: "rgba(107,114,128,0.08)", color: "#6b7280", label: "Unknown" },
};

export default function Phase13Page() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DomainAuthorityReport | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!domain.trim()) { setError("Please enter a domain."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/domain-authority", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: domain.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Estimation failed");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Estimation failed");
    } finally { setLoading(false); }
  }

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `authority-${data.domain}.json`; a.click();
    URL.revokeObjectURL(u);
  }

  return (
    <PhasePageShell
      phase={13} title="Domain Authority Estimator"
      badgeLabel="Authority Engine" badgeIcon={<Trophy size={14} />}
      accentColor="#f59e0b"
      hasResults={!!data} onExport={exportJson}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <FormCard>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <PremiumInput label="Target Domain" placeholder="yoursite.com" value={domain} onChange={setDomain} icon={<Globe size={18} />} />
            {error && <ErrorBox message={error} />}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SubmitButton loading={loading} label="Estimate Authority" loadingLabel="Estimating…" tokens={0} />
            </div>
          </form>
        </FormCard>

        <InfoCard
          icon={<Shield size={28} />}
          title="Domain Authority Guide"
          body="Estimate SEO authority based on backlinks, referring domains, domain age, HTTPS, sitemap, robots.txt, and spam score signals."
        />
      </div>

      {loading && <LoadingCard message="Fetching domain metadata, evaluating authority signals and computing scores…" />}

      {data && !loading && (
        <div style={{ marginTop: 28 }}>
          {/* Score trio */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <StatCard label="Estimated Authority" value={`${data.score}/100`} color="#f59e0b" />
            <StatCard label="Authority Grade" value={data.grade} color="#D96B43" />
            <StatCard label="Domain Verdict" value={data.verdict} color="#dc2626" />
          </div>

          {/* Authority signals by category */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {data.categories.map((category) => (
              <ResultCard key={category.id} title={category.title}>
                <div style={{ padding: "0 4px 12px 4px", borderBottom: "1px dashed #F0EDE8", marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }} className="dark:text-zinc-400">
                    {category.description}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginTop: 4, margin: 0 }}>
                    Score Contribution: {category.earned} / {category.max} pts
                  </p>
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
                  {category.signals.map((sig) => {
                    const s = STATUS_STYLE[sig.status] ?? STATUS_STYLE.unknown;
                    return (
                      <li key={sig.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", borderRadius: 10,
                        background: "#FAFAF9", border: "1px solid #F0EDE8",
                      }} className="dark:bg-zinc-800/40 dark:border-zinc-700">
                        <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#191816", margin: 0 }} className="dark:text-zinc-100">{sig.label}</p>
                          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 3, margin: 0 }} className="dark:text-zinc-400">{sig.detail}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {sig.value && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#191816" }} className="dark:text-zinc-200">{sig.value}</span>
                          )}
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 10px", borderRadius: 999,
                            background: s.bg, color: s.color,
                            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em"
                          }}>
                            {s.label} ({sig.points} pts)
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ResultCard>
            ))}
          </div>
        </div>
      )}
    </PhasePageShell>
  );
}
