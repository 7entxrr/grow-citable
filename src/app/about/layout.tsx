import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Our Story & Mission | Grow Citable",
  description: "Learn how Grow Citable is pioneering GEO (Generative Engine Optimization) to help companies become visible and cited in AI search engines.",
  keywords: [
    "Grow Citable story",
    "GEO pioneers",
    "AI Search Engine Optimization team",
    "generative search visibility mission"
  ],
  alternates: {
    canonical: "https://growcitable.com/about",
  },
  openGraph: {
    title: "About Grow Citable | Pioneering Generative Engine Optimization",
    description: "Our mission is to bridge the gap between traditional websites and the new conversational search engines, helping companies earn mentions and citations.",
    url: "https://growcitable.com/about",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "About Grow Citable",
      },
    ],
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About Grow Citable",
    "description": "Grow Citable is an innovative SaaS platform enabling brands to measure, optimize, and grow their presence across AI conversational engines.",
    "publisher": {
      "@type": "Organization",
      "name": "Grow Citable",
      "logo": "https://growcitable.com/favicon/logo.png",
      "url": "https://growcitable.com",
      "sameAs": [
        "https://x.com/growcitable",
        "https://linkedin.com/company/growcitable",
        "https://instagram.com/growcitable",
        "https://github.com/growcitable"
      ]
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
        "name": "About",
        "item": "https://growcitable.com/about"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
