import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AEO & GEO Research Blog | Grow Citable Insights",
  description: "Stay ahead of conversational search engine updates. Read our latest research, analysis, and optimization guides for ChatGPT, Gemini, and Perplexity.",
  keywords: [
    "AEO blog",
    "GEO search optimization articles",
    "conversational search engine analysis",
    "AI visibility blog posts"
  ],
  alternates: {
    canonical: "https://growcitable.com/blog",
  },
  openGraph: {
    title: "Grow Citable | Generative Engine Optimization Research Blog",
    description: "Deep dive analyses and news on conversational search engines, index updates, and AEO optimization playbooks.",
    url: "https://growcitable.com/blog",
    siteName: "Grow Citable",
    images: [
      {
        url: "https://growcitable.com/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Grow Citable Blog",
      },
    ],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Grow Citable Insights Blog",
    "description": "Educational resource center featuring deep analyses and studies on SEO, GEO, and conversational search patterns.",
    "publisher": {
      "@type": "Organization",
      "name": "Grow Citable",
      "logo": {
        "@type": "ImageObject",
        "url": "https://growcitable.com/favicon/logo.png"
      }
    },
    "blogPost": [
      {
        "@type": "BlogPosting",
        "headline": "Introducing support for Claude",
        "description": "We're excited to announce support for Claude, a major step in helping businesses understand their products across AI surfaces.",
        "datePublished": "2026-03-15",
        "author": {
          "@type": "Organization",
          "name": "Grow Citable Team"
        }
      },
      {
        "@type": "BlogPosting",
        "headline": "Prompt Volumes expansion: Now with Gemini, Claude, and Perplexity",
        "description": "Launching Prompt Volumes in the U.S. with ChatGPT was just the beginning. Now supporting three additional engines.",
        "datePublished": "2026-03-01",
        "author": {
          "@type": "Organization",
          "name": "Grow Citable Team"
        }
      },
      {
        "@type": "BlogPosting",
        "headline": "The State of AI Search in 2026",
        "description": "Our annual report on how brands appear across AI engines, with data from millions of analyzed conversations.",
        "datePublished": "2026-02-20",
        "author": {
          "@type": "Organization",
          "name": "Grow Citable Research Team"
        }
      },
      {
        "@type": "BlogPosting",
        "headline": "How to Optimize Your Content for Perplexity",
        "description": "Perplexity cites sources differently than ChatGPT. Learn the key differences and adapt your content strategy.",
        "datePublished": "2026-02-10",
        "author": {
          "@type": "Organization",
          "name": "Grow Citable Content Team"
        }
      },
      {
        "@type": "BlogPosting",
        "headline": "Competitive Analysis in the Age of AI Search",
        "description": "Traditional SEO competitive analysis is dead. Here's how to analyze your competition in AI-powered search.",
        "datePublished": "2026-01-28",
        "author": {
          "@type": "Organization",
          "name": "Grow Citable Strategy Team"
        }
      },
      {
        "@type": "BlogPosting",
        "headline": "Understanding E-E-A-T in AI Citations",
        "description": "Google's E-E-A-T framework is now directly relevant to how AI engines evaluate and cite your content.",
        "datePublished": "2026-01-15",
        "author": {
          "@type": "Organization",
          "name": "Grow Citable SEO Team"
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
        "name": "Blog",
        "item": "https://growcitable.com/blog"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
