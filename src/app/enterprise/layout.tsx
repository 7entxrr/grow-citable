import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enterprise AI Search Optimization (GEO) | Grow Citable",
  description: "Advanced Generative Engine Optimization solutions for enterprise brands. Large-scale citation tracking, custom APIs, and dedicated visibility analytics.",
  keywords: [
    "enterprise GEO",
    "enterprise AEO platform",
    "large scale AI citation tracking",
    "enterprise brand mentions optimization"
  ],
  alternates: {
    canonical: "https://growcitable.com/enterprise",
  },
  openGraph: {
    title: "Grow Citable for Enterprise Organizations",
    description: "Scale your brand's AI search visibility across thousands of keywords and conversational engines with custom SLAs and priority query allocations.",
    url: "https://growcitable.com/enterprise",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Enterprise GEO Optimization",
      },
    ],
  },
};

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enterpriseSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Grow Citable Enterprise Plan",
    "description": "High-volume AI visibility auditing, custom API keys, and dedicated developer consultancy services.",
    "brand": {
      "@type": "Brand",
      "name": "Grow Citable"
    },
    "offers": {
      "@type": "Offer",
      "price": "Custom",
      "priceCurrency": "USD",
      "category": "Enterprise SaaS Solution",
      "url": "https://growcitable.com/enterprise"
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
        "name": "Enterprise",
        "item": "https://growcitable.com/enterprise"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(enterpriseSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
