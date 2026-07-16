"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp, Globe, Flag, Satellite } from "lucide-react";
import {
  PhasePageShell, FormCard, InfoCard,
  PremiumInput, PremiumTextarea, SubmitButton, ErrorBox, LoadingCard, ResultCard,
} from "@/components/PhasePageShell";
import { RankSummaryCards } from "@/components/rank/RankSummaryCards";
import { RankResultsTable } from "@/components/rank/RankResultsTable";
import type { RankCheckResponse } from "@/types/rank";

const SAMPLE_KW = `ai search optimization\naeo tool\ngeo audit\nsemantic analytics`;
const DEPTH_OPTIONS = [
  { value: 10, label: "Top 10 — Fast" },
  { value: 30, label: "Top 30" },
  { value: 50, label: "Top 50" },
  { value: 100, label: "Top 100 — Deep" },
];

export default function Phase11Page() {
  const [targetDomain, setTargetDomain] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [depth, setDepth] = useState<10 | 30 | 50 | 100>(30);
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RankCheckResponse | null>(null);

  useEffect(() => {
    fetch("/api/rank/diagnose")
      .then(r => r.json())
      .then((d: any) => setProvider(d.provider))
      .catch(() => setProvider("puppeteer"));
  }, []);

  const keywordCount = useMemo(() =>
    keywordsText.split("\n").map(s => s.trim()).filter(Boolean).length
  , [keywordsText]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetDomain.trim()) { setError("Please enter a domain."); return; }
    if (keywordCount === 0) { setError("Please enter at least one keyword."); return; }
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/rank/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDomain,
          keywords: keywordsText.split("\n").map(s => s.trim()).filter(Boolean),
          depth, geo: country.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Rank check failed");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rank check failed");
    } finally { setLoading(false); }
  }

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `rank-${data.targetDomain}.json`; a.click();
    URL.revokeObjectURL(u);
  }

  return (
    <PhasePageShell
      phase={11} title="Rank Tracker"
      badgeLabel="SERP Engine" badgeIcon={<TrendingUp size={14} />}
      accentColor="#059669"
      hasResults={!!data} onExport={exportJson}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <FormCard>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <PremiumInput label="Target Domain" placeholder="yoursite.com" value={targetDomain} onChange={setTargetDomain} icon={<Globe size={18} />} />

            <PremiumTextarea
              label="Target Keywords" placeholder={SAMPLE_KW}
              value={keywordsText} onChange={setKeywordsText} rows={5}
              hint="One keyword per line. We'll search SERPs and find your rankings."
              counter={`${keywordCount} / 25`}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#191816", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Search Depth
                </label>
                <select
                  value={depth}
                  onChange={e => setDepth(Number(e.target.value) as 10 | 30 | 50 | 100)}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 10,
                    border: "1.5px solid #E6E1D6", background: "#FAFAF9",
                    fontSize: 14, color: "#191816", outline: "none",
                  }}
                >
                  {DEPTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <PremiumInput label="Country Code (optional)" placeholder="US, GB, DE…" value={country} onChange={setCountry} icon={<Flag size={18} />} />
            </div>

            {error && <ErrorBox message={error} />}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SubmitButton loading={loading} label="Track Rankings" loadingLabel="Checking Rankings…" tokens={0} />
            </div>
          </form>
        </FormCard>

        <InfoCard
          icon={<Satellite size={28} />}
          title="Rank Tracker Guide"
          body="Monitor search engine result positions for target keywords. We scan organic results, map packs, and ads — giving you exact position numbers."
          footer={provider && (
            <p style={{ fontSize: 11, color: "#aaa" }}>
              Provider: <strong style={{ color: "#555" }}>{provider === "cse" ? "Google CSE API" : "Headless Chrome"}</strong>
            </p>
          )}
        />
      </div>

      {loading && <LoadingCard message={`Scanning Google SERPs up to position ${depth} for ${keywordCount} keywords…`} />}

      {data && !loading && (
        <div style={{ marginTop: 28 }}>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "20px 24px", marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 4 }}>Domain Monitored</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#191816" }}>{data.targetDomain}</p>
            <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              Depth: <strong style={{ color: "#059669" }}>Top {data.depth}</strong> · {new Date(data.checkedAt).toLocaleString()}
            </p>
          </div>

          <RankSummaryCards summary={data.summary} depth={data.depth} />

          <div style={{ marginTop: 20 }}>
            <ResultCard title="Keyword Rankings" fullWidth>
              <RankResultsTable results={data.results} depth={data.depth} />
            </ResultCard>
          </div>
        </div>
      )}
    </PhasePageShell>
  );
}
