"use client";

import React, { useState } from "react";
import { PenLine, Link2, FileText, CheckCircle } from "lucide-react";
import {
  PhasePageShell, FormCard, InfoCard,
  PremiumInput, SubmitButton, ErrorBox, LoadingCard, StatCard, ResultCard,
} from "@/components/PhasePageShell";
import type { SpellCheckReport, PageSpellReport } from "@/types/spellCheck";

export default function Phase15Page() {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SpellCheckReport | null>(null);
  const [activeView, setActiveView] = useState<"worst-pages" | "top-misspellings" | "all-pages">("worst-pages");
  const [expandedPageIndex, setExpandedPageIndex] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) { setError("Please enter a page URL."); return; }
    setLoading(true);
    setData(null);
    setExpandedPageIndex(null);
    try {
      const res = await fetch("/api/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedUrl: url.trim(), maxPages }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Audit failed");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally { setLoading(false); }
  }

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `spellcheck-${data.domain}.json`; a.click();
    URL.revokeObjectURL(u);
  }

  return (
    <PhasePageShell
      phase={15} title="Spelling & Grammar Auditor"
      badgeLabel="Grammar Engine" badgeIcon={<PenLine size={14} />}
      accentColor="#7c3aed"
      hasResults={!!data} onExport={exportJson}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <FormCard>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <PremiumInput label="Seed Page URL" placeholder="https://yoursite.com" value={url} onChange={setUrl} icon={<Link2 size={18} />} />

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#191816", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Max Pages to Audit
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <input
                  type="range" min={5} max={100} step={5} value={maxPages}
                  onChange={e => setMaxPages(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#7c3aed" }}
                />
                <span style={{
                  minWidth: 52, textAlign: "center", padding: "6px 12px",
                  borderRadius: 8, background: "rgba(124,58,237,0.08)",
                  color: "#7c3aed", fontSize: 14, fontWeight: 700,
                }}>
                  {maxPages}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>Higher values trace more child links but take longer to complete.</p>
            </div>

            {error && <ErrorBox message={error} />}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SubmitButton loading={loading} label="Audit Content Copy" loadingLabel="Auditing Copy…" tokens={0} />
            </div>
          </form>
        </FormCard>

        <InfoCard
          icon={<FileText size={28} />}
          title="Spelling Auditor Guide"
          body="Extract the visible page text and run dictionary-based spell checking plus grammar rule validation to surface writing errors."
        />
      </div>

      {loading && <LoadingCard message="Crawling site pages, extracting body text, running spelling dictionaries, and checking grammar rules…" />}

      {data && !loading && (
        <div style={{ marginTop: 28 }}>
          {/* Summary metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
            <StatCard label="Pages Crawled" value={data.summary.pagesCrawled} color="#191816" />
            <StatCard label="Pages Checked" value={data.summary.pagesChecked} color="#555" />
            <StatCard label="Spelling Typos" value={data.summary.totalSpellingIssues} color={data.summary.totalSpellingIssues > 0 ? "#dc2626" : "#16a34a"} />
            <StatCard label="Grammar Issues" value={data.summary.totalGrammarIssues} color={data.summary.totalGrammarIssues > 0 ? "#d97706" : "#16a34a"} />
            <StatCard label="Unique Typos" value={data.summary.uniqueMisspellings} color="#7c3aed" />
          </div>

          {/* Tab Views */}
          <div style={{ display: "flex", gap: 12, borderBottom: "2px solid #F0EDE8", marginBottom: 20 }}>
            {(["worst-pages", "top-misspellings", "all-pages"] as const).map(view => (
              <button
                key={view}
                type="button"
                onClick={() => { setActiveView(view); setExpandedPageIndex(null); }}
                style={{
                  padding: "10px 16px", border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: 13, background: "transparent",
                  color: activeView === view ? "#7c3aed" : "#888",
                  borderBottom: activeView === view ? "2.5px solid #7c3aed" : "2.5px solid transparent",
                  marginBottom: -2,
                }}
              >
                {view === "worst-pages" && "Pages with Issues"}
                {view === "top-misspellings" && "Top Misspellings"}
                {view === "all-pages" && "All Crawled Pages"}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          {activeView === "worst-pages" && (
            <ResultCard title="Pages Sorted by Total Issues" fullWidth>
              {data.pages.filter(p => p.spellingIssues.length > 0 || p.grammarIssues.length > 0).length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <CheckCircle size={28} style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>No spelling or grammar errors found on any page!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data.pages
                    .filter(p => p.spellingIssues.length > 0 || p.grammarIssues.length > 0)
                    .map((page, idx) => {
                      const isExpanded = expandedPageIndex === idx;
                      return (
                        <div key={idx} style={{
                          border: "1px solid #F0EDE8", borderRadius: 12,
                          background: "#fff", overflow: "hidden",
                        }}>
                          {/* Page Accordion Header */}
                          <div
                            onClick={() => setExpandedPageIndex(isExpanded ? null : idx)}
                            style={{
                              padding: "16px 20px", display: "flex", justifyContent: "space-between",
                              alignItems: "center", cursor: "pointer", background: isExpanded ? "#FAF9F6" : "#fff",
                              borderBottom: isExpanded ? "1px solid #F0EDE8" : "none",
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1, marginRight: 16 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: "#191816", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                {page.title || "Untitled Page"}
                              </p>
                              <p style={{ fontSize: 11, color: "#888", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginTop: 2 }}>
                                {page.url}
                              </p>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                              <span style={{
                                padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                                background: "rgba(220,38,38,0.08)", color: "#dc2626",
                              }}>
                                {page.spellingIssues.length} Typos
                              </span>
                              <span style={{
                                padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                                background: "rgba(217,119,6,0.08)", color: "#d97706",
                              }}>
                                {page.grammarIssues.length} Grammar
                              </span>
                              <span style={{ fontSize: 12, color: "#bbb", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                              </span>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div style={{ padding: 20, background: "#FCFAF7", display: "flex", flexDirection: "column", gap: 20 }}>
                              {/* Spelling anomalies on this page */}
                              {page.spellingIssues.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Spelling Errors</p>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {page.spellingIssues.map((issue, i) => (
                                      <div key={i} style={{ padding: "10px 14px", borderRadius: 8, background: "#fff", border: "1px solid #E6E1D6" }}>
                                        <p style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>
                                          "<a href={page.url} target="_blank" rel="noopener noreferrer" style={{ color: "#dc2626", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} title={`Open page: ${page.url}`}>{issue.word}</a>" in ...{issue.context}...
                                        </p>
                                        {issue.suggestions.length > 0 && (
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                                            <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>Suggestions:</span>
                                            {issue.suggestions.slice(0, 5).map(s => (
                                              <span key={s} style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>{s}</span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Grammar issues on this page */}
                              {page.grammarIssues.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Grammar Alerts</p>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {page.grammarIssues.map((issue, i) => (
                                      <div key={i} style={{ padding: "10px 14px", borderRadius: 8, background: "#fff", border: "1px solid #E6E1D6" }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: "#191816" }}>{issue.message}</p>
                                        <p style={{ fontSize: 11, color: "#888", marginTop: 4, lineHeight: 1.5 }}>Context: "{issue.context}"</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </ResultCard>
          )}

          {activeView === "top-misspellings" && (
            <ResultCard title="Leaderboard of Unique Typos" fullWidth>
              {data.topMisspellings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <CheckCircle size={24} style={{ marginBottom: 6 }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>No spelling typos discovered!</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Mispelled Word", "Occurrences", "Suggestions", "Found On Pages"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "0 12px 12px 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", borderBottom: "1px solid #F0EDE8" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.topMisspellings.map((m, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #F8F7F5" }}>
                          <td style={{ padding: "14px 12px 14px 0" }}>
                            <a href={m.pages[0] || "#"} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", textDecoration: "underline", cursor: "pointer" }} title={m.pages[0] ? `Open page: ${m.pages[0]}` : undefined}>{m.word}</a>
                          </td>
                          <td style={{ padding: "14px 12px 14px 0", fontSize: 13, color: "#191816", fontWeight: 600 }}>{m.count} times</td>
                          <td style={{ padding: "14px 12px 14px 0" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {m.suggestions.slice(0, 3).map(s => (
                                <span key={s} style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(124,58,237,0.06)", fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>{s}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "14px 12px 14px 0", fontSize: 11, color: "#888", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.pages.map((p, pIdx) => (
                              <React.Fragment key={pIdx}>
                                {pIdx > 0 && ", "}
                                <a href={p} target="_blank" rel="noopener noreferrer" style={{ color: "#7c3aed", textDecoration: "underline" }}>
                                  {p}
                                </a>
                              </React.Fragment>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ResultCard>
          )}

          {activeView === "all-pages" && (
            <ResultCard title="Sitemap Crawl Details" fullWidth>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Page URL", "Status", "Word Count", "Result"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "0 12px 12px 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", borderBottom: "1px solid #F0EDE8" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.pages.map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #F8F7F5" }}>
                        <td style={{ padding: "12px 12px 12px 0", fontSize: 12, color: "#191816", fontWeight: 500, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.url}
                        </td>
                        <td style={{ padding: "12px 12px 12px 0" }}>
                          <span style={{
                            padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                            background: p.status >= 200 && p.status < 300 ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                            color: p.status >= 200 && p.status < 300 ? "#16a34a" : "#dc2626",
                          }}>
                            {p.status || "ERR"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 12px 12px 0", fontSize: 12, color: "#888" }}>{p.wordCount} words</td>
                        <td style={{ padding: "12px 12px 12px 0" }}>
                          {p.checked ? (
                            <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>Audited</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 12, color: "#aaa", fontWeight: 500 }}>⏩ Skipped</span>
                              {p.skipReason && (
                                <span style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                                  {p.skipReason}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ResultCard>
          )}
        </div>
      )}
    </PhasePageShell>
  );
}
