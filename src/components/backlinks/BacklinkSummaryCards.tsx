import type { BacklinkSummary } from "@/types/backlinks";

interface BacklinkSummaryCardsProps {
  summary: BacklinkSummary;
}

export function BacklinkSummaryCards({ summary }: BacklinkSummaryCardsProps) {
  const cards = [
    {
      label: "Verified",
      value: summary.verified,
      hint: `of ${summary.candidatesChecked} checked`,
      tone: "emerald" as const,
    },
    {
      label: "Missing",
      value: summary.missing,
      hint: "no link found",
      tone: "amber" as const,
    },
    {
      label: "Errors",
      value: summary.errors,
      hint: "fetch failed",
      tone: "rose" as const,
    },
    {
      label: "Referring domains",
      value: summary.uniqueReferringDomains,
      hint: "unique hosts",
      tone: "violet" as const,
    },
    {
      label: "Total link hits",
      value: summary.totalHits,
      hint: `~${summary.avgHitsPerPage.toFixed(2)} per page`,
      tone: "sky" as const,
    },
    {
      label: "Dofollow / Nofollow",
      value: `${summary.dofollow} / ${summary.nofollow}`,
      hint:
        summary.totalHits > 0
          ? `${Math.round(
              (summary.dofollow / summary.totalHits) * 100,
            )}% dofollow`
          : "—",
      tone: "indigo" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className={toneStyles(c.tone)}
        >
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">
            {c.label}
          </p>
          <p className="mt-2 text-2xl font-semibold">{c.value}</p>
          <p className="mt-1 text-xs opacity-70">{c.hint}</p>
        </div>
      ))}
    </div>
  );
}

type Tone = "emerald" | "amber" | "rose" | "violet" | "sky" | "indigo";

function toneStyles(tone: Tone): string {
  const base =
    "rounded-xl border p-4 shadow-sm transition";
  const map: Record<Tone, string> = {
    emerald:
      "border-clay/20 bg-clay-light text-emerald-900 dark:border-clay/30 dark:bg-clay/10/40 dark:text-emerald-100",
    amber:
      "border-clay/20 bg-clay-light text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    rose: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
    violet:
      "border-clay/20 bg-clay-light text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100",
    sky: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
    indigo:
      "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100",
  };
  return `${base} ${map[tone]}`;
}
