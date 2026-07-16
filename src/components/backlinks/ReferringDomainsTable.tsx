import type { ReferringDomain } from "@/types/backlinks";

interface ReferringDomainsTableProps {
  domains: ReferringDomain[];
}

export function ReferringDomainsTable({ domains }: ReferringDomainsTableProps) {
  if (domains.length === 0) {
    return (
      <p className="text-sm text-charcoal/50">
        No verified referring domains yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-sand dark:border-sand">
      <table className="w-full text-sm">
        <thead className="bg-cream text-left text-xs uppercase tracking-wide text-charcoal/50 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-2 font-medium">Domain</th>
            <th className="px-4 py-2 font-medium">Pages</th>
            <th className="px-4 py-2 font-medium">Hits</th>
            <th className="px-4 py-2 font-medium">Dofollow</th>
            <th className="px-4 py-2 font-medium">Nofollow</th>
            <th className="px-4 py-2 font-medium">Sample</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {domains.map((d) => (
            <tr
              key={d.domain}
              className="bg-white dark:bg-charcoal"
            >
              <td className="px-4 py-2 font-medium text-charcoal dark:text-zinc-100">
                {d.domain}
              </td>
              <td className="px-4 py-2 text-charcoal/80 dark:text-zinc-300">
                {d.pageCount}
              </td>
              <td className="px-4 py-2 text-charcoal/80 dark:text-zinc-300">
                {d.hitCount}
              </td>
              <td className="px-4 py-2 text-clay dark:text-emerald-300">
                {d.dofollowCount}
              </td>
              <td className="px-4 py-2 text-clay dark:text-amber-300">
                {d.nofollowCount}
              </td>
              <td className="max-w-xs truncate px-4 py-2">
                <a
                  href={d.sampleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-clay hover:underline dark:text-violet-300"
                >
                  {d.sampleUrl}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
