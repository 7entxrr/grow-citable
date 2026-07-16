import type { AnchorBreakdown } from "@/types/backlinks";

interface AnchorBreakdownListProps {
  anchors: AnchorBreakdown[];
}

const CATEGORY_TONE: Record<AnchorBreakdown["category"], string> = {
  branded:
    "bg-violet-100 text-clay dark:bg-violet-950 dark:text-violet-300",
  exact:
    "bg-emerald-100 text-clay dark:bg-clay/10 dark:text-emerald-300",
  generic:
    "bg-amber-100 text-clay dark:bg-amber-950 dark:text-amber-300",
  image: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  naked: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  other: "bg-sand text-charcoal dark:bg-zinc-800 dark:text-zinc-300",
};

export function AnchorBreakdownList({ anchors }: AnchorBreakdownListProps) {
  if (anchors.length === 0) {
    return (
      <p className="text-sm text-charcoal/50">No anchor text collected yet.</p>
    );
  }

  const max = Math.max(...anchors.map((a) => a.count));

  return (
    <ul className="space-y-2">
      {anchors.map((a) => (
        <li key={a.anchor} className="flex items-center gap-3">
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CATEGORY_TONE[a.category]}`}
          >
            {a.category}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-charcoal dark:text-zinc-200">
            {a.anchor}
          </span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-clay"
                style={{ width: `${(a.count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium text-charcoal/50">
              {a.count}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
