import type { AnalysisResult, ScrapedData } from "@/types/analysis";

interface Fingerprint {
  name: string;
  category: keyof AnalysisResult["techStack"];
  patterns: RegExp[];
}

const FINGERPRINTS: Fingerprint[] = [
  {
    name: "Next.js",
    category: "framework",
    patterns: [
      /id=["']__next["']/,
      /\/_next\/static\//,
      /__NEXT_DATA__/,
      /self\.__next_f/,
    ],
  },
  {
    name: "React",
    category: "framework",
    patterns: [
      /\breact(?:\.production|\.development)\.min\.js/,
      /__reactFiber\$/,
      /data-reactroot/,
      /__reactContainer\$/,
    ],
  },
  {
    name: "Vue",
    category: "framework",
    patterns: [/\bvue(?:\.runtime)?\.(?:min|esm|global)\.js/, /__VUE__/, /\bv-cloak\b/],
  },
  {
    name: "Angular",
    category: "framework",
    patterns: [/ng-version=/, /\bng-app=/, /angular\.min\.js/],
  },
  {
    name: "Svelte",
    category: "framework",
    patterns: [/svelte-[a-z0-9]{6}/, /__SVELTEKIT_/],
  },
  {
    name: "Nuxt",
    category: "framework",
    patterns: [/__nuxt/, /\/_nuxt\//],
  },
  {
    name: "WordPress",
    category: "cms",
    patterns: [
      /\/wp-content\/themes\//,
      /\/wp-content\/plugins\//,
      /\/wp-includes\/(?:js|css)\//,
      /\/wp-json\//,
      /name="generator"\s+content="WordPress/i,
    ],
  },
  {
    name: "Shopify",
    category: "cms",
    patterns: [/cdn\.shopify\.com/, /Shopify\.theme/, /window\.Shopify/],
  },
  {
    name: "Webflow",
    category: "cms",
    patterns: [/data-wf-page=/, /webflow\.com\/static/, /assets\.website-files\.com/],
  },
  {
    name: "Ghost",
    category: "cms",
    patterns: [/content=["']Ghost\s/, /\/ghost\/api\//],
  },
  {
    name: "Framer",
    category: "hosting",
    patterns: [/framerusercontent\.com/, /data-framer-/],
  },
  {
    name: "Tailwind",
    category: "styling",
    patterns: [
      /tailwindcss(?:\.com|@\d|\/dist)/,
      /\bclass=["'][^"']*\b(?:flex|grid|p[xytrbl]?-\d|m[xytrbl]?-\d|text-(?:xs|sm|base|lg|xl)|bg-(?:white|black|gray|zinc|red|blue|green))\b[^"']*\bhover:/,
    ],
  },
  {
    name: "Bootstrap",
    category: "styling",
    patterns: [/bootstrap(?:\.min)?\.css/, /\bdata-bs-toggle=/, /\bclass=["'][^"']*\bnavbar-toggler\b/],
  },
  {
    name: "GTM",
    category: "analytics",
    patterns: [/googletagmanager\.com\/gtm\.js/, /\bGTM-[A-Z0-9]{4,8}\b/],
  },
  {
    name: "GA4",
    category: "analytics",
    patterns: [/googletagmanager\.com\/gtag\/js/, /\bG-[A-Z0-9]{6,}\b/, /gtag\(['"]config['"]\s*,\s*['"]G-/],
  },
  {
    name: "Plausible",
    category: "analytics",
    patterns: [/plausible\.io\/js\//],
  },
  {
    name: "Mixpanel",
    category: "analytics",
    patterns: [/cdn\.mxpnl\.com/, /mixpanel\.init/],
  },
  {
    name: "Segment",
    category: "analytics",
    patterns: [/cdn\.segment\.com\/analytics\.js/, /analytics\.load\(/],
  },
  {
    name: "Intercom",
    category: "marketing",
    patterns: [/widget\.intercom\.io/, /intercomSettings/],
  },
  {
    name: "HubSpot",
    category: "marketing",
    patterns: [/js\.hs-scripts\.com/, /hs-analytics\.net/],
  },
  {
    name: "Drift",
    category: "marketing",
    patterns: [/js\.driftt\.com/, /\bdrift\.load\(/],
  },
  {
    name: "Vercel",
    category: "hosting",
    patterns: [/\.vercel\.app/, /x-vercel-/i, /_vercel\/insights/],
  },
  {
    name: "Netlify",
    category: "hosting",
    patterns: [/\.netlify\.app/, /netlify-cms/],
  },
  {
    name: "Cloudflare",
    category: "hosting",
    patterns: [/cdn-cgi\/scripts\/[a-z0-9]+\/cloudflare/, /__cf_bm/, /cf-ray/i],
  },
];

export function detectTech(scraped: ScrapedData): AnalysisResult["techStack"] {
  const haystack = [
    scraped.html,
    ...scraped.scriptSrcs,
    ...scraped.stylesheetUrls,
  ].join("\n");

  const result: AnalysisResult["techStack"] = {
    framework: [],
    styling: [],
    analytics: [],
    marketing: [],
    hosting: [],
    cms: [],
  };

  for (const { name, category, patterns } of FINGERPRINTS) {
    if (patterns.some((p) => p.test(haystack))) {
      if (!result[category].includes(name)) {
        result[category].push(name);
      }
    }
  }

  return result;
}
