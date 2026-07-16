"use client";

import type { AnalysisResult } from "@/types/analysis";
import { AnalysisCard } from "./AnalysisCard";
import { ScoreBar } from "./ScoreBar";
import { SeoMetaTable } from "./SeoMetaTable";
import { ColorPalette } from "./ColorPalette";
import { FontCard } from "./FontCard";
import { TechBadges } from "./TechBadges";
import { TopicsCloud } from "./TopicsCloud";
import { ScreenshotPreview } from "./ScreenshotPreview";

interface AnalysisResultsProps {
  data: AnalysisResult;
}

export function AnalysisResults({ data }: AnalysisResultsProps) {
  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${new URL(data.url).hostname}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 border-b border-sand bg-cream/95 px-4 py-4 backdrop-blur dark:border-sand dark:bg-charcoal/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {data.meta.favicon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.meta.favicon}
                alt=""
                className="h-6 w-6 shrink-0 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-charcoal dark:text-zinc-100">
                {data.meta.title || data.url}
              </h1>
              <p className="truncate text-sm text-charcoal/50">{data.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-48">
              <ScoreBar score={data.seo.score} />
            </div>
            <button
              type="button"
              onClick={exportJson}
              className="shrink-0 rounded-lg border border-sand px-3 py-2 text-sm hover:bg-sand dark:border-sand dark:hover:bg-zinc-800"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {data.warnings.length > 0 && (
        <div className="rounded-lg border border-clay/20 bg-clay-light p-4 text-sm text-clay dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">Warnings</p>
          <ul className="mt-1 list-inside list-disc">
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalysisCard title="Screenshot" className="lg:col-span-2">
          <ScreenshotPreview screenshot={data.screenshot} />
        </AnalysisCard>

        <AnalysisCard title="AI Insights">
          <TopicsCloud ai={data.ai} />
        </AnalysisCard>

        <AnalysisCard title="SEO & Meta">
          <SeoMetaTable meta={data.meta} seo={data.seo} />
        </AnalysisCard>

        <AnalysisCard title="Colors">
          <ColorPalette colors={data.colors} />
        </AnalysisCard>

        <AnalysisCard title="Fonts">
          <FontCard fonts={data.fonts} />
        </AnalysisCard>

        <AnalysisCard title="Tech Stack" className="lg:col-span-2">
          <TechBadges techStack={data.techStack} />
        </AnalysisCard>
      </div>

      <p className="text-center text-xs text-charcoal/40">
        Analyzed at {new Date(data.analyzedAt).toLocaleString()}
      </p>
    </div>
  );
}
