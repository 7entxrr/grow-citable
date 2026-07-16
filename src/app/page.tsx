import HomePage from './home/page';

export default function Page() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Grow Citable",
    "url": "https://growcitable.com",
    "logo": "https://growcitable.com/favicon/logo.png",
    "sameAs": [
      "https://x.com/growcitable",
      "https://linkedin.com/company/growcitable",
      "https://instagram.com/growcitable",
      "https://github.com/growcitable"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "email": "support@growcitable.com",
      "url": "https://growcitable.com/contact",
      "availableLanguage": ["English"]
    }
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Grow Citable",
    "operatingSystem": "All",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "156"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Generative Engine Optimization (GEO)?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Generative Engine Optimization (GEO) is the practice of optimizing your website content so it is crawled, understood, and accurately cited by AI-powered search engines and LLM engines like ChatGPT Search, Google Gemini, Anthropic Claude, and Perplexity AI."
        }
      },
      {
        "@type": "Question",
        "name": "How does Grow Citable help with GEO and AEO?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Grow Citable audits your website's crawlability and feeds optimized brand queries to major AI models to evaluate how many mentions, citations, and recommendations your brand receives in real time. It then generates tailored optimization checklists."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <HomePage />
    </>
  );
}
