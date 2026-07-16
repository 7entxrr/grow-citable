import type { AnalysisResult } from "@/types/analysis";

interface FontCardProps {
  fonts: AnalysisResult["fonts"];
}

function FontRow({
  role,
  name,
  source,
}: {
  role: string;
  name: string;
  source: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-cream px-4 py-3 dark:bg-zinc-800/50">
      <div>
        <p className="text-xs uppercase text-charcoal/50">{role}</p>
        <p className="text-lg font-semibold text-charcoal dark:text-zinc-100">
          {name}
        </p>
      </div>
      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-clay dark:bg-violet-900/40 dark:text-violet-300">
        {source}
      </span>
    </div>
  );
}

export function FontCard({ fonts }: FontCardProps) {
  return (
    <div className="space-y-3">
      <FontRow role="Heading" name={fonts.heading.name} source={fonts.heading.source} />
      <FontRow role="Body" name={fonts.body.name} source={fonts.body.source} />
      {fonts.mono && (
        <FontRow role="Monospace" name={fonts.mono.name} source={fonts.mono.source} />
      )}
      {fonts.allDetected.length > 0 && (
        <div className="pt-2">
          <p className="mb-2 text-xs text-charcoal/50">All detected</p>
          <div className="flex flex-wrap gap-1">
            {fonts.allDetected.map((f, i) => (
              <span
                key={`${f}-${i}`}
                className="rounded bg-sand px-2 py-0.5 text-xs dark:bg-zinc-800"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
