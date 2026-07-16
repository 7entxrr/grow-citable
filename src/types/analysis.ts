export interface AnalysisResult {
  url: string;
  analyzedAt: string;
  warnings: string[];

  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    favicon: string;
    canonical: string;
    robots: string;
  };

  colors: {
    dominant: string[];
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    textColor: string;
    isDarkMode: boolean;
    harmonyType: string;
  };

  fonts: {
    heading: { name: string; source: string };
    body: { name: string; source: string };
    mono?: { name: string; source: string };
    allDetected: string[];
  };

  seo: {
    score: number;
    titleLength: number;
    descLength: number;
    hasOGImage: boolean;
    h1Count: number;
    imagesWithoutAlt: number;
    hasCanonical: boolean;
    hasSitemap: boolean;
    internalLinks: number;
    externalLinks: number;
    pageLoadMs: number;
    isHttps: boolean;
    hasViewportMeta: boolean;
    hasXFrameOptions: boolean;
    hasCSP: boolean;
    hasCookieBanner: boolean;
  };

  techStack: {
    framework: string[];
    styling: string[];
    analytics: string[];
    marketing: string[];
    hosting: string[];
    cms: string[];
  };

  ai: {
    topic: string;
    niche: string;
    summary: string;
    targetAudience: string;
    tone: string;
    designStyle: string;
    contentQuality: number;
    suggestions: string[];
    ctaText: string;
    hasCtaAboveFold: boolean;
  };

  screenshot: {
    desktop: string;
    mobile: string;
  };
}

export interface ScrapedData {
  url: string;
  finalUrl: string;
  html: string;
  title: string;
  description: string;
  ogTags: Record<string, string>;
  stylesheetUrls: string[];
  linkTags: { rel: string; href: string }[];
  headings: Record<"h1" | "h2" | "h3" | "h4" | "h5" | "h6", string[]>;
  internalLinks: string[];
  externalLinks: string[];
  images: { src: string; alt: string | null }[];
  scriptSrcs: string[];
  inlineStyles: string[];
  bodyText: string;
  hasViewportMeta: boolean;
  robots: string;
  canonical: string;
  sitemapLink: string;
  securityHeaders: {
    isHttps: boolean;
    xFrameOptions: string | null;
    csp: string | null;
    setCookie: string | null;
  };
}

export const EMPTY_ANALYSIS = (url: string): AnalysisResult => ({
  url,
  analyzedAt: new Date().toISOString(),
  warnings: [],
  meta: {
    title: "",
    description: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    favicon: "",
    canonical: "",
    robots: "",
  },
  colors: {
    dominant: [],
    primary: "#000000",
    secondary: "#666666",
    accent: "#0066cc",
    background: "#ffffff",
    textColor: "#000000",
    isDarkMode: false,
    harmonyType: "unknown",
  },
  fonts: {
    heading: { name: "Unknown", source: "unknown" },
    body: { name: "Unknown", source: "unknown" },
    allDetected: [],
  },
  seo: {
    score: 0,
    titleLength: 0,
    descLength: 0,
    hasOGImage: false,
    h1Count: 0,
    imagesWithoutAlt: 0,
    hasCanonical: false,
    hasSitemap: false,
    internalLinks: 0,
    externalLinks: 0,
    pageLoadMs: 0,
    isHttps: false,
    hasViewportMeta: false,
    hasXFrameOptions: false,
    hasCSP: false,
    hasCookieBanner: false,
  },
  techStack: {
    framework: [],
    styling: [],
    analytics: [],
    marketing: [],
    hosting: [],
    cms: [],
  },
  ai: {
    topic: "",
    niche: "",
    summary: "",
    targetAudience: "",
    tone: "",
    designStyle: "",
    contentQuality: 0,
    suggestions: [],
    ctaText: "",
    hasCtaAboveFold: false,
  },
  screenshot: {
    desktop: "",
    mobile: "",
  },
});
