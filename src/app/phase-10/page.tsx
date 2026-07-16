"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link2, GitFork } from "lucide-react";
import {
  PhasePageShell, FormCard, InfoCard,
  PremiumInput, PremiumTextarea, SubmitButton, ErrorBox, LoadingCard,
  StatCard, ResultCard,
} from "@/components/PhasePageShell";
import { BacklinkSummaryCards } from "@/components/backlinks/BacklinkSummaryCards";
import { ReferringDomainsTable } from "@/components/backlinks/ReferringDomainsTable";
import { AnchorBreakdownList } from "@/components/backlinks/AnchorBreakdownList";
import { SourceResultsList } from "@/components/backlinks/SourceResultsList";
import type { BacklinkAnalysis } from "@/types/backlinks";

const SAMPLE = `https://blog.example.com/post-mentioning-you\nhttps://news.example.org/article\nhttps://forum.example.net/thread/123`;

export default function Phase10Page() {
  const [targetUrl, setTargetUrl] = useState("");
  const [candidatesText, setCandidatesText] = useState("");
  const [matchMode, setMatchMode] = useState<"strict" | "loose">("loose");
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryNotice, setDiscoveryNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BacklinkAnalysis | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/backlinks/discover")
      .then(r => r.json())
      .then((d: any) => setProvider(d.provider ?? "puppeteer"))
      .catch(() => setProvider("puppeteer"));
  }, []);

  const candidateCount = useMemo(() =>
    candidatesText.split("\n").map(s => s.trim()).filter(Boolean).length
  , [candidatesText]);

  async function handleDiscover() {
    if (!targetUrl.trim()) { setError("Please enter a target URL first."); return; }
    setError(null); setDiscovering(true); setDiscoveryNotice(null);
    try {
      const res = await fetch("/api/backlinks/discover", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Discovery failed");
      const json = await res.json();
      if (json.candidates.length > 0) {
        setCandidatesText(prev => {
          const current = prev.split("\n").map(s => s.trim()).filter(Boolean);
          return [...new Set([...current, ...json.candidates])].join("\n");
        });
        setDiscoveryNotice(`Discovered ${json.candidates.length} candidates from Google.`);
      } else {
        setDiscoveryNotice("No candidates found on Google.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally { setDiscovering(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUrl.trim()) { setError("Please enter a target URL."); return; }
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/backlinks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          sources: candidatesText.split("\n").map(s => s.trim()).filter(Boolean),
          matchMode,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Failed ${res.status}`);
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
    a.href = u; a.download = `backlinks-${data.targetDomain}.json`; a.click();
    URL.revokeObjectURL(u);
  }

  return (
    <PhasePageShell
      phase={10} title="Backlink Auditor"
      badgeLabel="Link Intelligence" badgeIcon={<Link2 size={14} />}
      accentColor="#7C3AED"
      hasResults={!!data} onExport={exportJson}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* Form */}
        <FormCard>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Target URL row */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#191816", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Target URL (your page)
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 10,
                  borderRadius: 10, border: "1.5px solid #E6E1D6",
                  background: "#FAFAF9", padding: "0 14px",
                }}>
                  <Link2 size={18} style={{ color: "#aaa" }} />
                  <input
                    type="text" value={targetUrl} onChange={e => setTargetUrl(e.target.value)}
                    placeholder="https://yoursite.com/page"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#191816", padding: "12px 0" }}
                  />
                </div>
                <button
                  type="button" onClick={handleDiscover} disabled={discovering || loading}
                  style={{
                    padding: "0 20px", borderRadius: 10, border: "1.5px solid #E6E1D6",
                    background: "#fff", fontSize: 13, fontWeight: 600, color: "#555",
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {discovering ? "Discovering…" : "Auto-Discover"}
                </button>
              </div>
              {discoveryNotice && (
                <p style={{ marginTop: 8, fontSize: 12, color: "#7C3AED", fontWeight: 600 }}>{discoveryNotice}</p>
              )}
            </div>

            <PremiumTextarea
              label="Suspected Source URLs"
              placeholder={SAMPLE}
              value={candidatesText}
              onChange={setCandidatesText}
              rows={6}
              hint="One URL per line. We'll fetch each and verify backlinks to your target."
              counter={`${candidateCount} / 50 URLs`}
            />

            {/* Match mode */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#191816", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Match Mode
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {(["loose", "strict"] as const).map(mode => (
                  <label key={mode} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 16px", borderRadius: 8, cursor: "pointer",
                    border: `1.5px solid ${matchMode === mode ? "#7C3AED" : "#E6E1D6"}`,
                    background: matchMode === mode ? "rgba(124,58,237,0.06)" : "#FAFAF9",
                  }}>
                    <input type="radio" name="matchMode" value={mode} checked={matchMode === mode}
                      onChange={() => setMatchMode(mode)} style={{ accentColor: "#7C3AED" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: matchMode === mode ? "#7C3AED" : "#555" }}>
                      {mode === "loose" ? "Loose (Host)" : "Strict (Exact URL)"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {error && <ErrorBox message={error} />}
              <SubmitButton loading={loading} label="Start Audit" loadingLabel="Auditing Backlinks…" tokens={0} />
            </div>
          </form>
        </FormCard>

        {/* Info sidebar */}
        <InfoCard
          icon={<GitFork size={28} />}
          title="Backlink Audit Guide"
          body="Backlinks are vital for SEO and GEO. Verify if domains link to you, audit anchor keywords, and track dofollow ratios."
          footer={provider && (
            <p style={{ fontSize: 11, color: "#aaa" }}>
              Crawl Provider: <strong style={{ color: "#555" }}>{provider === "cse" ? "Google CSE API" : "Headless Chrome"}</strong>
            </p>
          )}
        />
      </div>

      {loading && <LoadingCard message={`Fetching ${candidateCount} source pages and verifying anchor links…`} />}

      {data && !loading && (
        <div style={{ marginTop: 28 }}>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "20px 24px", marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 4 }}>Target Audited</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#191816" }}>{data.targetUrl}</p>
            <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              Mode: <strong style={{ color: "#7C3AED" }}>{data.matchMode}</strong> · {new Date(data.analyzedAt).toLocaleString()}
            </p>
          </div>

          <BacklinkSummaryCards summary={data.summary} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
            <ResultCard title="Referring Domains">
              <ReferringDomainsTable domains={data.referringDomains} />
            </ResultCard>
            <ResultCard title="Anchor Text Breakdown">
              <AnchorBreakdownList anchors={data.anchorBreakdown} />
            </ResultCard>
          </div>

          <div style={{ marginTop: 16 }}>
            <ResultCard title="Verified Source URLs" fullWidth>
              <SourceResultsList results={data.results} />
            </ResultCard>
          </div>
        </div>
      )}
    </PhasePageShell>
  );
}
