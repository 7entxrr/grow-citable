import type { AnalysisResult } from "@/types/analysis";

function hexToHsl(hex: string): [number, number, number] | null {
  const cleaned = hex.replace("#", "");
  if (![3, 6].includes(cleaned.length)) return null;
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      default:
        h = ((r - g) / d + 4) * 60;
    }
  }
  return [h, s * 100, l * 100];
}

function normalizeHex(color: string): string | null {
  const trimmed = color.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const c = trimmed.slice(1);
    return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  const rgbMatch = trimmed.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
  );
  if (rgbMatch) {
    const toHex = (n: number) =>
      Math.min(255, n).toString(16).padStart(2, "0");
    return `#${toHex(+rgbMatch[1])}${toHex(+rgbMatch[2])}${toHex(+rgbMatch[3])}`;
  }
  return null;
}

export function detectHarmonyType(colors: string[]): string {
  const hues = colors
    .map(normalizeHex)
    .filter(Boolean)
    .map((c) => hexToHsl(c!))
    .filter(Boolean) as [number, number, number][];

  if (hues.length < 2) return "monochrome";

  const hueValues = hues.map((h) => h[0]);
  const spreads = hueValues.map((h1) =>
    Math.min(
      ...hueValues.map((h2) => {
        const diff = Math.abs(h1 - h2);
        return Math.min(diff, 360 - diff);
      }),
    ),
  );
  const avgSpread =
    spreads.reduce((a, b) => a + b, 0) / spreads.length;

  if (avgSpread < 15) return "monochrome";
  if (avgSpread >= 150 && avgSpread <= 210) return "complementary";
  if (avgSpread >= 100 && avgSpread <= 140) return "triadic";
  return "analogous";
}

export function extractColorsFromCss(
  inlineStyles: string[],
): Partial<AnalysisResult["colors"]> {
  const css = inlineStyles.join("\n");
  const isDarkMode = /@media\s*\([^)]*prefers-color-scheme\s*:\s*dark/i.test(
    css,
  );

  const hexColors: string[] = [];
  const varRegex = /--([a-z0-9-]+)\s*:\s*([^;}{]+)/gi;
  let match;
  const cssVars: Record<string, string> = {};
  while ((match = varRegex.exec(css)) !== null) {
    cssVars[match[1]] = match[2].trim();
  }

  const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
  while ((match = hexRegex.exec(css)) !== null) {
    const normalized = normalizeHex(`#${match[1]}`);
    if (normalized) hexColors.push(normalized);
  }

  const findVar = (keys: string[]): string => {
    for (const [varName, varValue] of Object.entries(cssVars)) {
      if (keys.some((search) => varName.includes(search))) {
        const hex = normalizeHex(varValue);
        if (hex) return hex;
      }
    }
    return "";
  };

  const primary =
    findVar(["primary", "brand", "accent"]) || hexColors[0] || "#000000";
  const secondary =
    findVar(["secondary", "muted"]) || hexColors[1] || "#666666";
  const accent = findVar(["accent", "highlight"]) || hexColors[2] || "#0066cc";
  const background =
    findVar(["bg", "background", "surface"]) || hexColors[3] || "#ffffff";
  const textColor =
    findVar(["text", "foreground", "fg"]) || hexColors[4] || "#000000";

  const dominant = [...new Set(hexColors)].slice(0, 6);

  return {
    dominant,
    primary,
    secondary,
    accent,
    background,
    textColor,
    isDarkMode,
    harmonyType: detectHarmonyType(dominant.length ? dominant : [primary, secondary, accent]),
  };
}

export async function extractDominantColorsFromImage(
  base64: string,
): Promise<string[]> {
  if (!base64) return [];
  try {
    const { Vibrant } = await import("node-vibrant/node");
    const buffer = Buffer.from(base64, "base64");
    const palette = await Vibrant.from(buffer).getPalette();
    const swatches = [
      palette.Vibrant,
      palette.Muted,
      palette.DarkVibrant,
      palette.LightVibrant,
      palette.DarkMuted,
      palette.LightMuted,
    ];
    return [
      ...new Set(
        swatches
          .filter(Boolean)
          .map((s) => s!.hex)
          .filter(Boolean) as string[],
      ),
    ];
  } catch {
    return [];
  }
}

export function mergeColors(
  cssColors: Partial<AnalysisResult["colors"]>,
  imageDominant: string[],
): AnalysisResult["colors"] {
  const dominant =
    imageDominant.length > 0
      ? imageDominant
      : cssColors.dominant ?? [];

  return {
    dominant,
    primary: imageDominant[0] ?? cssColors.primary ?? "#000000",
    secondary: imageDominant[1] ?? cssColors.secondary ?? "#666666",
    accent: imageDominant[2] ?? cssColors.accent ?? "#0066cc",
    background: cssColors.background ?? "#ffffff",
    textColor: cssColors.textColor ?? "#000000",
    isDarkMode: cssColors.isDarkMode ?? false,
    harmonyType: detectHarmonyType(
      dominant.length ? dominant : [cssColors.primary ?? "#000"],
    ),
  };
}
