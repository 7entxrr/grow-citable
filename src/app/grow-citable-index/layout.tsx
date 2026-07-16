import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GEO Search Index & Insights | Grow Citable",
  description: "Browse the Grow Citable visibility index. Read studies on brand share of voice and citation ranks across LLM search engines.",
  keywords: [
    "Grow Citable Index",
    "AI Search engine rankings index",
    "GEO market study",
    "generative search visibility metrics"
  ],
  alternates: {
    canonical: "https://growcitable.com/grow-citable-index",
  },
  openGraph: {
    title: "AI Search Share of Voice Index | Grow Citable",
    description: "Real-time insights and benchmarks analyzing how brands are recommended across conversational search engines.",
    url: "https://growcitable.com/grow-citable-index",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Grow Citable Index Page",
      },
    ],
  },
};

export default function GrowCitableIndexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const indexSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the Grow Citable Index?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Grow Citable Index is a proprietary benchmarking database that evaluates brand mentions and citations across leading conversational AI engines to measure organic share of voice."
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
        "name": "Grow Citable Index",
        "item": "https://growcitable.com/grow-citable-index"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(indexSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
