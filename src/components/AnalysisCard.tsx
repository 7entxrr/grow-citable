import type { ReactNode } from "react";

interface AnalysisCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function AnalysisCard({
  title,
  children,
  className = "",
}: AnalysisCardProps) {
  return (
    <section
      className={`rounded-xl border border-sand bg-white p-5 shadow-sm dark:border-sand dark:bg-zinc-900 ${className}`}
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-charcoal/50 dark:text-charcoal/40">
        {title}
      </h2>
      {children}
    </section>
  );
}
