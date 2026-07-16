import type { RankResult } from "@/types/rank";

interface RankResultsTableProps {
  results: RankResult[];
  depth: number;
}

export function RankResultsTable({ results, depth }: RankResultsTableProps) {
  if (results.length === 0) {
    return <p className="text-sm text-charcoal/50">No keywords checked.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-sand dark:border-sand">
      <table className="w-full text-sm">
        <thead className="bg-cream text-left text-xs uppercase tracking-wide text-charcoal/50 dark:bg-zinc-900">
          <tr>
            <th className="w-20 px-4 py-2 font-medium">Position</th>
            <th className="px-4 py-2 font-medium">Keyword</th>
            <th className="px-4 py-2 font-medium">Ranking page</th>
            <th className="w-24 px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {results.map((r, i) => (
            <tr
              key={`${r.keyword}-${i}`}
              className="bg-white align-top dark:bg-charcoal"
            >
              <td className="px-4 py-3">
                <PositionPill result={r} />
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-charcoal dark:text-zinc-100">
                  {r.keyword}
                </p>
                {r.totalEstimated !== null && r.totalEstimated > 0 && (
                  <p className="mt-0.5 text-xs text-charcoal/50">
                    ~{r.totalEstimated.toLocaleString()} indexed results
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                {r.rankingUrl ? (
                  <>
                    <p className="font-medium text-charcoal dark:text-zinc-100">
                      {r.rankingTitle ?? "Untitled"}
                    </p>
                    <a
                      href={r.rankingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block truncate text-xs text-clay hover:underline dark:text-violet-300"
                    >
                      {r.rankingUrl}
                    </a>
                    {r.rankingSnippet && (
                      <p className="mt-1 line-clamp-2 text-xs text-charcoal/50">
                        {r.rankingSnippet}
                      </p>
                    )}
                  </>
                ) : r.status === "error" ? (
                  <p className="text-sm text-rose-600 dark:text-rose-300">
                    {r.error ?? "Failed"}
                  </p>
                ) : (
                  <p className="text-sm text-charcoal/50">
                    Not in the top {depth} results.
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge result={r} />
                <p className="mt-1 text-xs text-charcoal/40">
                  {r.queriesUsed} query{r.queriesUsed === 1 ? "" : "ies"} •{" "}
                  {r.durationMs}ms
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PositionPill({ result }: { result: RankResult }) {
  if (result.status === "ranking" && result.position !== null) {
    const tone =
      result.position <= 3
        ? "bg-clay text-white"
        : result.position <= 10
          ? "bg-clay/80 text-white"
          : result.position <= 30
            ? "bg-clay/60 text-white"
            : "bg-clay/40 text-charcoal";
    return (
      <span
        className={`inline-flex h-10 w-12 items-center justify-center rounded-lg text-base font-semibold ${tone}`}
      >
        #{result.position}
      </span>
    );
  }
  if (result.status === "not_found") {
    return (
      <span className="inline-flex h-10 w-12 items-center justify-center rounded-lg bg-zinc-200 text-base font-semibold text-charcoal/50 dark:bg-zinc-800">
        —
      </span>
    );
  }
  return (
    <span className="inline-flex h-10 w-12 items-center justify-center rounded-lg bg-rose-100 text-base font-semibold text-rose-600 dark:bg-rose-950 dark:text-rose-300">
      !
    </span>
  );
}

function StatusBadge({ result }: { result: RankResult }) {
  const map: Record<
    RankResult["status"],
    { label: string; className: string }
  > = {
    ranking: {
      label: "Ranking",
      className:
        "bg-emerald-100 text-clay dark:bg-clay/10 dark:text-emerald-300",
    },
    not_found: {
      label: "Not found",
      className:
        "bg-amber-100 text-clay dark:bg-amber-950 dark:text-amber-300",
    },
    error: {
      label: "Error",
      className:
        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    },
  };
  const cfg = map[result.status];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
