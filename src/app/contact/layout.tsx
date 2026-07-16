import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Support Helpdesk | Grow Citable",
  description: "Get in touch with our GEO experts and support team. Let us help you audit and boost your brand visibility on conversational search engines.",
  keywords: [
    "Grow Citable contact",
    "AEO support desk",
    "GEO consulting services",
    "AI visibility client helpdesk"
  ],
  alternates: {
    canonical: "https://growcitable.com/contact",
  },
  openGraph: {
    title: "Contact Grow Citable Support & Sales Team",
    description: "Reach out for enterprise consultations, customized pricing inquiries, or general dashboard technical help.",
    url: "https://growcitable.com/contact",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Contact Grow Citable",
      },
    ],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Grow Citable Support",
    "description": "Customer contact points and support resources for Grow Citable.",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "email": "support@growcitable.com",
      "url": "https://growcitable.com/contact",
      "availableLanguage": ["English"]
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
        "name": "Contact",
        "item": "https://growcitable.com/contact"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
