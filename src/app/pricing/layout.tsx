import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grow Citable Plans & Pricing | AI Visibility Platform",
  description: "Find the perfect plan to audit, optimize, and rank your brand on conversational search engines. Choose from Starter, Growth, and Ultra tiers.",
  keywords: [
    "Grow Citable Pricing",
    "AEO audit cost",
    "GEO optimization tool pricing",
    "AI visibility tool plans",
    "ChatGPT search optimization pricing"
  ],
  alternates: {
    canonical: "https://growcitable.com/pricing",
  },
  openGraph: {
    title: "Plans & Pricing | Grow Citable AI Search Visibility",
    description: "Compare Starter, Growth, and Ultra plans to optimize your brand visibility on conversational search engines like ChatGPT, Gemini, and Perplexity.",
    url: "https://growcitable.com/pricing",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Grow Citable Pricing Plans",
      },
    ],
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Grow Citable Subscription Plans",
    "description": "AI Search Engine Optimization (GEO/AEO) audit subscription plans.",
    "brand": {
      "@type": "Brand",
      "name": "Grow Citable"
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": "29.00",
      "highPrice": "199.00",
      "offerCount": "3",
      "offers": [
        {
          "@type": "Offer",
          "name": "Starter Plan",
          "price": "29.00",
          "priceCurrency": "USD",
          "category": "SaaS Subscription",
          "url": "https://growcitable.com/pricing"
        },
        {
          "@type": "Offer",
          "name": "Growth Plan",
          "price": "99.00",
          "priceCurrency": "USD",
          "category": "SaaS Subscription",
          "url": "https://growcitable.com/pricing"
        },
        {
          "@type": "Offer",
          "name": "Ultra Plan",
          "price": "199.00",
          "priceCurrency": "USD",
          "category": "SaaS Subscription",
          "url": "https://growcitable.com/pricing"
        }
      ]
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Does Grow Citable offer a free plan?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Grow Citable includes a Free plan that allows users to register their site and perform limited single-engine SEO visibility audits."
        }
      },
      {
        "@type": "Question",
        "name": "Can I upgrade or downgrade my plan at any time?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, subscriptions can be upgraded, downgraded, or canceled directly from your account settings panel. Changes apply at the end of the current billing cycle."
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
        "name": "Pricing",
        "item": "https://growcitable.com/pricing"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
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
