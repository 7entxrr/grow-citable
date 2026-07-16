"use client";

import React, { useState } from "react";
import { Bug, Link2, GitFork, CheckCircle } from "lucide-react";
import {
  PhasePageShell, FormCard, InfoCard,
  PremiumInput, SubmitButton, ErrorBox, LoadingCard, StatCard, ResultCard,
} from "@/components/PhasePageShell";
import type { CrawlReport, BrokenLink } from "@/types/crawler";

export default function Phase14Page() {
  const [seedUrl, setSeedUrl] = useState("");
  const [maxPages, setMaxPages] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CrawlReport | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!seedUrl.trim()) { setError("Please enter a seed URL."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedUrl: seedUrl.trim(), maxPages }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Crawling failed");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Crawling failed");
    } finally { setLoading(false); }
  }

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `crawl-${new URL(data.seedUrl).hostname}.json`; a.click();
    URL.revokeObjectURL(u);
  }

  const totalPages = (data as any)?.totalPagesCrawled ?? (data as any)?.pagesCrawled ?? 0;
  const brokenCount = data?.brokenLinks?.length ?? 0;
  const ratio = totalPages > 0 ? Math.round((brokenCount / totalPages) * 100) : 0;

  return (
    <PhasePageShell
      phase={14} title="Broken Link Crawler"
      badgeLabel="Crawl Engine" badgeIcon={<Bug size={14} />}
      accentColor="#dc2626"
      hasResults={!!data} onExport={exportJson}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <FormCard>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <PremiumInput label="Seed URL (homepage)" placeholder="https://yoursite.com" value={seedUrl} onChange={setSeedUrl} icon={<Link2 size={18} />} />

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#191816", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Max Pages to Crawl
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <input
                  type="range" min={5} max={100} step={5} value={maxPages}
                  onChange={e => setMaxPages(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#dc2626" }}
                />
                <span style={{
                  minWidth: 52, textAlign: "center", padding: "6px 12px",
                  borderRadius: 8, background: "rgba(220,38,38,0.08)",
                  color: "#dc2626", fontSize: 14, fontWeight: 700,
                }}>
                  {maxPages}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>Higher values trace more pages but take longer.</p>
            </div>

            {error && <ErrorBox message={error} />}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SubmitButton loading={loading} label="Launch Crawler" loadingLabel="Crawling Site…" tokens={0} />
            </div>
          </form>
        </FormCard>

        <InfoCard
          icon={<GitFork size={28} />}
          title="Broken Link Guide"
          body="We recursively crawl your site to find broken child links, server exceptions, internal redirect loops, and HTTP error codes."
        />
      </div>

      {loading && <LoadingCard message="Crawling your site recursively, scanning page HTML and compiling broken link exceptions…" />}

      {data && !loading && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <StatCard label="Pages Scanned" value={totalPages} color="#191816" />
            <StatCard label="Broken Links" value={brokenCount} color="#dc2626" />
            <StatCard label="Broken Ratio" value={`${ratio}%`} color={ratio > 10 ? "#dc2626" : "#16a34a"} />
          </div>

          <ResultCard title="Broken Links List" fullWidth>
            {brokenCount === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <CheckCircle size={28} style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>No broken links detected on crawled pages!</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Source Page", "Anchor Text", "Broken URL", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "0 12px 12px 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", borderBottom: "1px solid #F0EDE8" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.brokenLinks.map((link: any, i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid #F8F7F5" }}>
                        <td style={{ padding: "12px 12px 12px 0", fontSize: 12, color: "#555", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {link.foundOn && link.foundOn.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {link.foundOn.map((url: string, index: number) => (
                                <a 
                                  key={index} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  style={{ color: "#2563eb", textDecoration: "underline", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
                                >
                                  {new URL(url).pathname || "/"}
                                </a>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "12px 12px 12px 0", fontSize: 12, color: "#191816" }} className="dark:text-zinc-300">
                          {link.anchorText || "—"}
                        </td>
                        <td style={{ padding: "12px 12px 12px 0", fontSize: 12, color: "#dc2626", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ color: "#dc2626", textDecoration: "underline" }}>
                            {link.href || "—"}
                          </a>
                        </td>
                        <td style={{ padding: "12px 12px 12px 0" }}>
                          <span style={{
                            display: "inline-block", padding: "2px 8px", borderRadius: 6,
                            background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)",
                            color: "#dc2626", fontSize: 11, fontWeight: 700,
                          }}>
                            {link.status ?? "404"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ResultCard>
        </div>
      )}
    </PhasePageShell>
  );
}
