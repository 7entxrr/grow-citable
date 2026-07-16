import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Your Free Account | Grow Citable",
  description: "Start tracking and auditing your website visibility across ChatGPT, Claude, Gemini, and Perplexity. Sign up for free today.",
  keywords: [
    "register Grow Citable",
    "create account GEO tool",
    "sign up free AEO tracker"
  ],
  alternates: {
    canonical: "https://growcitable.com/signup",
  },
  openGraph: {
    title: "Join Grow Citable & Audit AI Search Citations",
    description: "Create an account in minutes to optimize page structure, trace redirects, and earn mentions on LLM search outputs.",
    url: "https://growcitable.com/signup",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Sign Up for Grow Citable",
      },
    ],
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signupSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Grow Citable Sign Up Portal",
    "description": "User registration gate for Grow Citable accounts.",
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
        "name": "Signup",
        "item": "https://growcitable.com/signup"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(signupSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
