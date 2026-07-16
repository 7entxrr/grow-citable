import type { AnalysisResult } from "@/types/analysis";

const CATEGORY_LABELS: Record<keyof AnalysisResult["techStack"], string> = {
  framework: "Framework",
  styling: "Styling",
  analytics: "Analytics",
  marketing: "Marketing",
  hosting: "Hosting",
  cms: "CMS",
};

interface TechBadgesProps {
  techStack: AnalysisResult["techStack"];
}

export function TechBadges({ techStack }: TechBadgesProps) {
  const entries = Object.entries(techStack).filter(
    ([, items]) => (items as string[]).length > 0,
  ) as [keyof AnalysisResult["techStack"], string[]][];

  if (entries.length === 0) {
    return (
      <p className="text-sm text-charcoal/50">No technologies detected.</p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(([category, items]) => (
        <div key={category}>
          <p className="mb-2 text-xs font-medium uppercase text-charcoal/50">
            {CATEGORY_LABELS[category]}
          </p>
          <div className="flex flex-wrap gap-2">
            {items.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-sand bg-cream px-3 py-1 text-sm font-medium text-charcoal dark:border-sand dark:bg-zinc-800 dark:text-zinc-200"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
