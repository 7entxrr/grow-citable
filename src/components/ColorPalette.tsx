"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/analysis";

interface ColorPaletteProps {
  colors: AnalysisResult["colors"];
}

function Swatch({ hex, label }: { hex: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex flex-col items-center gap-1"
      title={`Copy ${hex}`}
    >
      <div
        className="h-14 w-14 rounded-lg border border-sand shadow-sm transition group-hover:scale-105 dark:border-sand"
        style={{ backgroundColor: hex }}
      />
      <span className="font-mono text-xs text-charcoal/80 dark:text-charcoal/40">
        {copied ? "Copied!" : hex}
      </span>
      {label && (
        <span className="text-xs text-charcoal/40">{label}</span>
      )}
    </button>
  );
}

export function ColorPalette({ colors }: ColorPaletteProps) {
  const main = [
    { hex: colors.primary, label: "Primary" },
    { hex: colors.secondary, label: "Secondary" },
    { hex: colors.accent, label: "Accent" },
    { hex: colors.background, label: "Background" },
    { hex: colors.textColor, label: "Text" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {main.map((c) => (
          <Swatch key={c.label} hex={c.hex} label={c.label} />
        ))}
      </div>
      {colors.dominant.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-charcoal/50">Dominant (screenshot)</p>
          <div className="flex flex-wrap gap-3">
            {colors.dominant.map((hex) => (
              <Swatch key={hex} hex={hex} />
            ))}
          </div>
        </div>
      )}
      <p className="text-sm text-charcoal/50">
        Harmony: <span className="font-medium capitalize text-charcoal dark:text-zinc-300">{colors.harmonyType}</span>
        {" · "}
        {colors.isDarkMode ? "Dark mode detected" : "Light mode"}
      </p>
    </div>
  );
}
