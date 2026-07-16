import type { AnalysisResult } from "@/types/analysis";

interface TopicsCloudProps {
  ai: AnalysisResult["ai"];
}

const PLACEHOLDER = new Set(["unknown", "analysis unavailable", ""]);

export function TopicsCloud({ ai }: TopicsCloudProps) {
  const tagEntries = [
    { id: "topic", value: ai.topic },
    { id: "niche", value: ai.niche },
    { id: "tone", value: ai.tone },
    { id: "designStyle", value: ai.designStyle },
  ].filter(
    (entry) =>
      entry.value.trim() !== "" &&
      !PLACEHOLDER.has(entry.value.trim().toLowerCase()),
  );

  const seen = new Set<string>();
  const uniqueTags = tagEntries.filter((entry) => {
    const normalized = entry.value.trim().toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return (
    <div className="space-y-4">
      {uniqueTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uniqueTags.map((entry) => (
            <span
              key={entry.id}
              className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-clay dark:bg-violet-900/50 dark:text-violet-200"
            >
              {entry.value}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm leading-relaxed text-charcoal dark:text-zinc-300">
        {ai.summary}
      </p>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <span className="text-charcoal/50">Audience: </span>
          <span className="text-charcoal dark:text-zinc-200">{ai.targetAudience}</span>
        </div>
        <div>
          <span className="text-charcoal/50">Content quality: </span>
          <span className="font-semibold text-charcoal dark:text-zinc-200">
            {ai.contentQuality}/100
          </span>
        </div>
        {ai.ctaText && (
          <div className="sm:col-span-2">
            <span className="text-charcoal/50">CTA: </span>
            <span className="text-charcoal dark:text-zinc-200">{ai.ctaText}</span>
            {ai.hasCtaAboveFold && (
              <span className="ml-2 text-xs text-clay">(above fold)</span>
            )}
          </div>
        )}
      </div>
      {ai.suggestions.length > 0 && (
        <ul className="list-inside list-disc space-y-1 text-sm text-charcoal/80 dark:text-charcoal/40">
          {ai.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
