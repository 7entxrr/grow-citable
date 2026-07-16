interface ScoreBarProps {
  score: number;
  label?: string;
}

export function ScoreBar({ score, label = "SEO Score" }: ScoreBarProps) {
  const color =
    score >= 80
      ? "bg-clay"
      : score >= 50
        ? "bg-clay/60"
        : "bg-red-500";

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-charcoal/80 dark:text-charcoal/40">
          {label}
        </span>
        <span className="text-2xl font-bold text-charcoal dark:text-zinc-100">
          {score}
          <span className="text-sm font-normal text-charcoal/40">/100</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}
