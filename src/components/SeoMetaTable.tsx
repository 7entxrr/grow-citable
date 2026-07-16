import type { AnalysisResult } from "@/types/analysis";

interface SeoMetaTableProps {
  meta: AnalysisResult["meta"];
  seo: AnalysisResult["seo"];
}

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string | number | boolean;
  ok?: boolean;
}) {
  const display =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <tr className="border-b border-zinc-100 dark:border-sand">
      <td className="py-2 pr-4 text-sm text-charcoal/50">{label}</td>
      <td className="py-2 text-sm font-medium text-charcoal dark:text-zinc-100">
        <span className={ok === false ? "text-red-500" : ok === true ? "text-clay" : ""}>
          {display || "—"}
        </span>
      </td>
    </tr>
  );
}

export function SeoMetaTable({ meta, seo }: SeoMetaTableProps) {
  return (
    <table className="w-full">
      <tbody>
        <Row label="Title" value={meta.title} ok={seo.titleLength >= 30 && seo.titleLength <= 70} />
        <Row label="Title length" value={`${seo.titleLength} chars`} ok={seo.titleLength >= 30 && seo.titleLength <= 70} />
        <Row label="Description" value={meta.description.slice(0, 80) + (meta.description.length > 80 ? "…" : "")} />
        <Row label="Desc length" value={`${seo.descLength} chars`} ok={seo.descLength >= 120 && seo.descLength <= 170} />
        <Row label="H1 count" value={seo.h1Count} ok={seo.h1Count === 1} />
        <Row label="OG image" value={seo.hasOGImage} ok={seo.hasOGImage} />
        <Row label="Canonical" value={seo.hasCanonical} ok={seo.hasCanonical} />
        <Row label="Sitemap" value={seo.hasSitemap} ok={seo.hasSitemap} />
        <Row label="HTTPS" value={seo.isHttps} ok={seo.isHttps} />
        <Row label="Viewport meta" value={seo.hasViewportMeta} ok={seo.hasViewportMeta} />
        <Row label="Images missing alt" value={seo.imagesWithoutAlt} ok={seo.imagesWithoutAlt === 0} />
        <Row label="Internal links" value={seo.internalLinks} />
        <Row label="External links" value={seo.externalLinks} />
        <Row label="Page load" value={seo.pageLoadMs ? `${seo.pageLoadMs}ms` : "—"} />
        <Row label="X-Frame-Options" value={seo.hasXFrameOptions} ok={seo.hasXFrameOptions} />
        <Row label="CSP" value={seo.hasCSP} ok={seo.hasCSP} />
        <Row label="Cookie banner" value={seo.hasCookieBanner} />
      </tbody>
    </table>
  );
}
