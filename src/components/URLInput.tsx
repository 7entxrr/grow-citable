"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const urlSchema = z.string().min(1, "URL is required");

function toAnalyzePath(raw: string): string {
  let url = raw.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return `/analyze/${encodeURIComponent(new URL(url).href)}`;
}

export function URLInput() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = urlSchema.safeParse(value);
    if (!result.success) {
      setError("Please enter a URL");
      return;
    }
    try {
      new URL(
        value.startsWith("http") ? value : `https://${value}`,
      );
      router.push(toAnalyzePath(value));
    } catch {
      setError("Please enter a valid URL");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-lg border border-sand bg-white px-4 py-3 text-charcoal outline-none ring-clay focus:ring-2 dark:border-sand dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          className="rounded-lg bg-clay px-6 py-3 font-medium text-white transition hover:bg-clay/90"
        >
          Analyze
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </form>
  );
}
