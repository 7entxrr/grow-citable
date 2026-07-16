import type { BacklinkSourceResult } from "@/types/backlinks";

interface SourceResultsListProps {
  results: BacklinkSourceResult[];
}

const STATUS_TONE: Record<BacklinkSourceResult["status"], string> = {
  verified:
    "border-clay/20 bg-clay-light text-clay dark:border-clay/30 dark:bg-clay/10/40 dark:text-emerald-300",
  missing:
    "border-clay/20 bg-clay-light text-clay dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  error:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
};

const STATUS_LABEL: Record<BacklinkSourceResult["status"], string> = {
  verified: "Verified",
  missing: "Missing",
  error: "Error",
};

export function SourceResultsList({ results }: SourceResultsListProps) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-charcoal/50">No source URLs were checked.</p>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((r, idx) => (
        <details
          key={`${r.sourceUrl}-${idx}`}
          className="rounded-lg border border-sand bg-white open:shadow-sm dark:border-sand dark:bg-charcoal"
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                >
                  {STATUS_LABEL[r.status]}
                </span>
                {r.httpStatus !== null && (
                  <span className="text-xs text-charcoal/50">
                    HTTP {r.httpStatus}
                  </span>
                )}
                <span className="text-xs text-charcoal/40">
                  {r.durationMs}ms
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-charcoal dark:text-zinc-100">
                {r.pageTitle ?? r.sourceUrl}
              </p>
              <p className="truncate text-xs text-charcoal/50">{r.sourceUrl}</p>
            </div>
            <span className="shrink-0 text-sm text-charcoal/50">
              {r.hits.length > 0 ? `${r.hits.length} link(s)` : "—"}
            </span>
          </summary>

          <div className="border-t border-sand px-4 py-3 dark:border-sand">
            {r.status === "error" && (
              <p className="text-sm text-rose-600 dark:text-rose-300">
                {r.error ?? "Failed to fetch"}
              </p>
            )}
            {r.status === "missing" && (
              <p className="text-sm text-clay dark:text-amber-300">
                Page fetched but no link to the target was found.
              </p>
            )}
            {r.hits.length > 0 && (
              <ul className="space-y-2">
                {r.hits.map((h, i) => (
                  <li
                    key={`${h.href}-${i}`}
                    className="rounded-md border border-sand bg-cream p-2 text-xs dark:border-sand dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          h.isDofollow
                            ? "bg-emerald-100 text-clay dark:bg-clay/10 dark:text-emerald-300"
                            : "bg-amber-100 text-clay dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {h.isDofollow ? "dofollow" : "nofollow"}
                      </span>
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 capitalize text-charcoal dark:bg-zinc-800 dark:text-zinc-300">
                        {h.linkType}
                      </span>
                      {h.exactMatch && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-clay dark:bg-violet-950 dark:text-violet-300">
                          exact
                        </span>
                      )}
                      {h.rel.length > 0 && (
                        <span className="text-charcoal/50">
                          rel: {h.rel.join(", ")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-charcoal dark:text-zinc-200">
                      <span className="font-medium">Anchor:</span>{" "}
                      {h.anchorText || <em>(empty)</em>}
                    </p>
                    <a
                      href={h.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-clay hover:underline dark:text-violet-300"
                    >
                      {h.href}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
