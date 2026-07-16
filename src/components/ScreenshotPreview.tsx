"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/analysis";

interface ScreenshotPreviewProps {
  screenshot: AnalysisResult["screenshot"];
}

export function ScreenshotPreview({ screenshot }: ScreenshotPreviewProps) {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");

  const src = view === "desktop" ? screenshot.desktop : screenshot.mobile;
  if (!src) {
    return (
      <p className="text-sm text-charcoal/50">
        Screenshot unavailable (Puppeteer may have failed).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView("desktop")}
          className={`rounded-lg px-3 py-1 text-sm font-medium ${
            view === "desktop"
              ? "bg-clay text-white"
              : "bg-sand text-charcoal/80 dark:bg-zinc-800"
          }`}
        >
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setView("mobile")}
          className={`rounded-lg px-3 py-1 text-sm font-medium ${
            view === "mobile"
              ? "bg-clay text-white"
              : "bg-sand text-charcoal/80 dark:bg-zinc-800"
          }`}
        >
          Mobile
        </button>
      </div>
      <div
        className={`overflow-hidden rounded-lg border border-sand dark:border-sand ${
          view === "mobile" ? "mx-auto max-w-[375px]" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/jpeg;base64,${src}`}
          alt={`${view} screenshot`}
          className="w-full"
        />
      </div>
    </div>
  );
}
