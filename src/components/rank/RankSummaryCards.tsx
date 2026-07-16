import type { RankSummary } from "@/types/rank";

interface RankSummaryCardsProps {
  summary: RankSummary;
  depth: number;
}

export function RankSummaryCards({ summary, depth }: RankSummaryCardsProps) {
  const cards: { label: string; value: string | number; hint: string; tone: Tone }[] =
    [
      {
        label: "Ranking",
        value: summary.ranking,
        hint: `of ${summary.totalKeywords} keywords`,
        tone: "emerald",
      },
      {
        label: "Not in top " + depth,
        value: summary.notFound,
        hint: "outside the SERP window",
        tone: "amber",
      },
      {
        label: "Errors",
        value: summary.errors,
        hint: "fetch failed",
        tone: "rose",
      },
      {
        label: "Top 3",
        value: summary.top3,
        hint: "high-intent positions",
        tone: "violet",
      },
      {
        label: "Top 10",
        value: summary.top10,
        hint: "page-1 rankings",
        tone: "sky",
      },
      {
        label: "Avg position",
        value:
          summary.averagePosition !== null
            ? summary.averagePosition
            : "—",
        hint:
          summary.bestPosition !== null
            ? `best: #${summary.bestPosition}`
            : "no ranking data",
        tone: "indigo",
      },
    ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className={toneStyles(c.tone)}>
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
  const base = "rounded-xl border p-4 shadow-sm transition";
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
