"use client";

import type { SeoCategory } from "@/types/onPageSeo";
import { CheckRow } from "./CheckRow";

export function CategoryCard({ category }: { category: SeoCategory }) {
  const counts = category.checks.reduce(
    (acc, c) => {
      acc[c.status]++;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0, info: 0 },
  );

  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #F0EDE8",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(25, 24, 22, 0.02)",
        display: "flex",
        flexDirection: "column",
      }}
      className="dark:bg-zinc-900 dark:border-zinc-800"
    >
      {/* Header Area */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #F0EDE8",
          background: "linear-gradient(to bottom, #FCFAF8, #ffffff)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          gap: 16,
        }}
        className="dark:from-zinc-900 dark:to-zinc-900 dark:border-zinc-800"
      >
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#191816" }} className="dark:text-zinc-100">
            {category.title}
          </h2>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }} className="dark:text-zinc-400">
            {category.description}
          </p>
        </div>

        {/* Counter badges */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {counts.pass > 0 && (
            <span style={{
              padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.04em",
              background: "rgba(16, 185, 129, 0.08)", color: "#10B981"
            }}>
              {counts.pass} pass
            </span>
          )}
          {counts.warn > 0 && (
            <span style={{
              padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.04em",
              background: "rgba(245, 158, 11, 0.08)", color: "#F59E0B"
            }}>
              {counts.warn} warn
            </span>
          )}
          {counts.fail > 0 && (
            <span style={{
              padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.04em",
              background: "rgba(239, 68, 68, 0.08)", color: "#EF4444"
            }}>
              {counts.fail} fail
            </span>
          )}
        </div>
      </div>

      {/* List content checks */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {category.checks.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </ul>
    </section>
  );
}
