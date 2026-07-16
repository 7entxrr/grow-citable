import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Step-by-Step AI Visibility Guides | Grow Citable Tutorials",
  description: "Learn how to optimize your web pages, write AI-friendly headers, implement structured data schemas, and improve conversational search recommendations.",
  keywords: [
    "AEO guides",
    "GEO setup tutorial",
    "schema markup setup guide",
    "how to optimize for ChatGPT search",
    "Gemini visibility guide"
  ],
  alternates: {
    canonical: "https://growcitable.com/guides",
  },
  openGraph: {
    title: "AI Search Visibility & GEO Knowledge Center | Grow Citable",
    description: "Step-by-step documentation, checklists, and templates to audit and boost your brand visibility in LLM answers.",
    url: "https://growcitable.com/guides",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Grow Citable Optimization Guides",
      },
    ],
  },
};

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I optimize headers for AI search?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Use single semantic H1 headings per page, arrange nested subheadings sequentially (H2, H3), and structure questions directly in the titles followed by clear, fact-based answers in paragraph tags."
        }
      },
      {
        "@type": "Question",
        "name": "What structured data is best for GEO?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "JSON-LD format is highly recommended. Incorporating Organization, Product, and FAQPage schemas provides AI indexers with high-priority machine-readable details about your business."
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
        "name": "Guides",
        "item": "https://growcitable.com/guides"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
