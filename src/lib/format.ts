/** Formatters that gracefully handle empty/undefined values with an em-dash. */

const EM_DASH = "—";

export function formatMoney(
  raw: string | number | undefined | null,
  currency = "INR",
  options: { fromMinorUnit?: boolean } = {},
): string {
  if (raw === undefined || raw === null || raw === "") return EM_DASH;
  const num = Number(raw);
  if (!Number.isFinite(num)) return EM_DASH;
  const value = options.fromMinorUnit ? num / 100 : num;
  try {
    return value.toLocaleString("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatNumber(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null || raw === "") return EM_DASH;
  const num = Number(raw);
  if (!Number.isFinite(num)) return EM_DASH;
  return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatPercent(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null || raw === "") return EM_DASH;
  const num = Number(raw);
  if (!Number.isFinite(num)) return EM_DASH;
  return `${num.toFixed(2)}%`;
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return EM_DASH;
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return EM_DASH;
  }
}

export function formatRelative(iso: string | undefined | null): string {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EM_DASH;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export const EMPTY = EM_DASH;
