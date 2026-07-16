import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Search Visibility & Generative Research Hub | Grow Citable",
  description: "Stay informed on computational and algorithmic studies of AI Search indexers, citation anchors, and search grounding patterns.",
  keywords: [
    "GEO research hub",
    "AEO citation analysis studies",
    "LLM search indexing algorithms",
    "conversational search benchmark studies"
  ],
  alternates: {
    canonical: "https://growcitable.com/research-hub",
  },
  openGraph: {
    title: "Algorithmic Research Hub & GEO Studies | Grow Citable",
    description: "Read peer-level studies, benchmarking reports, and visibility index analyses from our GEO lab research team.",
    url: "https://growcitable.com/research-hub",
    siteName: "Grow Citable",
    images: [
      {
        url: "/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Grow Citable Research Hub",
      },
    ],
  },
};

export default function ResearchHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const researchSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Grow Citable Research Hub Page",
    "description": "Scientific studies and algorithm auditing reviews on large language models and search grounding systems.",
    "publisher": {
      "@type": "Organization",
      "name": "Grow Citable",
      "logo": {
        "@type": "ImageObject",
        "url": "https://growcitable.com/favicon/logo.png"
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(researchSchema) }}
      />
      {children}
    </>
  );
}
