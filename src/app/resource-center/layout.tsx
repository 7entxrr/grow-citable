import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GEO & AEO Resource Center | Grow Citable Publications",
  description: "Explore our collection of white papers, webinars, checklists, and integration guides for optimizing AI search visibility.",
  keywords: [
    "GEO resources",
    "AEO visibility checklists",
    "conversational search webinars",
    "AI indexing guides"
  ],
  alternates: {
    canonical: "https://growcitable.com/resource-center",
  },
  openGraph: {
    title: "AI Search Visibility & GEO Resource Center | Grow Citable",
    description: "Access detailed platform setup guides, industry white papers, and actionable worksheets to audit and improve your AI rankings.",
    url: "https://growcitable.com/resource-center",
    siteName: "Grow Citable",
    images: [
      {
        url: "/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Grow Citable Resource Center",
      },
    ],
  },
};

export default function ResourceCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const resourceSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Grow Citable Resource Center Page",
    "description": "Public database of webinars, checklists, and guides for Generative Engine Optimization.",
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
        "name": "Resource Center",
        "item": "https://growcitable.com/resource-center"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(resourceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
