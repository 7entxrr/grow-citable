export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-clay/20 border-t-violet-600" />
      <div className="text-center">
        <p className="text-lg font-medium text-charcoal dark:text-zinc-100">
          Analyzing website…
        </p>
        <p className="mt-1 text-sm text-charcoal/50">
          Scraping HTML, capturing screenshots, running AI analysis
        </p>
      </div>
      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 px-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}
