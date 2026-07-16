import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Crawler Instructions & Settings | Grow Citable",
  description: "Read our transparency guidelines for large language model crawlers, datasets, and bot indexation setups.",
  keywords: [
    "AI crawler instructions",
    "robots.txt details for AI",
    "GPTBot opt-out settings",
    "ClaudeBot crawl configurations"
  ],
  alternates: {
    canonical: "https://growcitable.com/ai-instructions",
  },
  openGraph: {
    title: "AI Agent Guidelines & Indexing Standards | Grow Citable",
    description: "Guidelines and references for LLM datasets, search grounding bots, and crawler permissions.",
    url: "https://growcitable.com/ai-instructions",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "AI Instructions and Crawlers Settings",
      },
    ],
  },
};

export default function AiInstructionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const instructionsSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "AI Crawler Instructions Page",
    "description": "Public standards, guidelines, and robot permissions for web search models and machine learning crawlers.",
    "publisher": {
      "@type": "Organization",
      "name": "Grow Citable",
      "logo": {
        "@type": "ImageObject",
        "url": "https://growcitable.com/favicon/logo.png"
      }
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://growcitable.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "AI Instructions",
        "item": "https://growcitable.com/ai-instructions"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(instructionsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
