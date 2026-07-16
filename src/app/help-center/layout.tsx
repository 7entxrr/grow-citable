import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center & Documentation | Grow Citable",
  description: "Find setup tutorials, query configurations, billing guides, and help center references for tracking your AEO visibility.",
  keywords: [
    "Grow Citable help desk",
    "GEO setup guides",
    "API configuration help",
    "AI visibility client documentation"
  ],
  alternates: {
    canonical: "https://growcitable.com/help-center",
  },
  openGraph: {
    title: "Help Center & Technical Guides | Grow Citable Support",
    description: "Get documentation on resolving safety block errors, setting custom prompts, and understanding prominence rates.",
    url: "https://growcitable.com/help-center",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Grow Citable Help Center",
      },
    ],
  },
};

export default function HelpCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const helpSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I resolve a 400 Bad Request error on Gemini?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Make sure your request does not configure responseMimeType: 'application/json' alongside active tool use filters like Google Search, as these parameters conflict in Google's API config."
        }
      },
      {
        "@type": "Question",
        "name": "How does prompt grounding work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Grounding uses active web search results (via Serper or Google Search) and feeds the result snippets into the LLM context to guarantee fact-based citations."
        }
      }
    ]
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
        "name": "Help Center",
        "item": "https://growcitable.com/help-center"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(helpSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
