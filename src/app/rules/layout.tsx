import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rules, Terms & Privacy Policies | Grow Citable",
  description: "Read Grow Citable's service guidelines, privacy policy, user terms, and data collection parameters.",
  keywords: [
    "Grow Citable privacy policy",
    "terms of service",
    "cookie policy",
    "SaaS legal terms"
  ],
  alternates: {
    canonical: "https://growcitable.com/rules",
  },
  openGraph: {
    title: "Privacy Policies & Terms of Service | Grow Citable",
    description: "Understand your legal rights, service descriptions, and data safety structures under our platform guidelines.",
    url: "https://growcitable.com/rules",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Grow Citable Rules & Policies",
      },
    ],
  },
};

export default function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rulesSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Grow Citable Rules and Policies Page",
    "description": "Grow Citable privacy policies, data protection agreements, and terms of service specifications.",
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
        "name": "Rules & Policies",
        "item": "https://growcitable.com/rules"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(rulesSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
