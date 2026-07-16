"use client";

import React from "react";
import type { SeoCheck } from "@/types/onPageSeo";
import { CheckCircle, XCircle } from "lucide-react";

const STATUS_CONFIG: Record<
  SeoCheck["status"],
  { dot: string; pill: string; icon: React.ReactNode }
> = {
  pass: {
    dot: "bg-emerald-600 dark:bg-emerald-700 text-white",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30",
    icon: <CheckCircle size={14} />,
  },
  warn: {
    dot: "bg-amber-500 dark:bg-amber-600 text-white",
    pill: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30",
    icon: <span style={{ fontSize: 14, fontWeight: 800 }}>!</span>,
  },
  fail: {
    dot: "bg-rose-600 dark:bg-rose-700 text-white",
    pill: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/30",
    icon: <XCircle size={14} />,
  },
  info: {
    dot: "bg-blue-500 dark:bg-blue-600 text-white",
    pill: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30",
    icon: <span style={{ fontSize: 14, fontWeight: 800 }}>i</span>,
  },
};

export function CheckRow({ check }: { check: SeoCheck }) {
  const cfg = STATUS_CONFIG[check.status];
  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "14px 18px",
        background: "#fff",
        borderBottom: "1px solid #F0EDE8",
        transition: "background 0.15s ease",
      }}
      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 dark:bg-zinc-900 dark:border-zinc-800"
    >
      {/* Status dot/icon */}
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${cfg.dot}`}
        style={{
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
      >
        {cfg.icon}
      </span>

      {/* Check details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#191816" }} className="dark:text-zinc-100">
            {check.label}
          </p>
          {check.value !== undefined && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cfg.pill}`}
            >
              {check.value}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }} className="dark:text-zinc-400">
          {check.message}
        </p>
      </div>
    </li>
  );
}
