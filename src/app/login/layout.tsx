import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In to Your Dashboard | Grow Citable",
  description: "Access your AI Visibility account. Monitor brand mentions, track search engine citations, and edit GEO settings.",
  keywords: [
    "login Grow Citable",
    "dashboard sign in AEO",
    "GEO tracking panel login"
  ],
  alternates: {
    canonical: "https://growcitable.com/login",
  },
  openGraph: {
    title: "Access Grow Citable Dashboard Portal",
    description: "Enter your credentials to manage campaigns, monitor search indices, and download visibility checklists.",
    url: "https://growcitable.com/login",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Sign In to Grow Citable",
      },
    ],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const loginSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Grow Citable Sign In Portal",
    "description": "User login gate for Grow Citable dashboard.",
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
        "name": "Login",
        "item": "https://growcitable.com/login"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(loginSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
