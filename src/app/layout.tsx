import type { Metadata } from "next";
import { Kumbh_Sans } from "next/font/google";
import "./globals.css";

const kumbhSans = Kumbh_Sans({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-kumbh-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Grow Citable | SEO & AI Search Engine Optimization (GEO/AEO)",
  description: "Boost your search visibility across ChatGPT, Google Gemini, Claude, and Perplexity. Audit citations, track brand mentions, and optimize for AI answer engines.",
  keywords: [
    "Generative Engine Optimization",
    "GEO SEO",
    "AEO SEO",
    "AI Search Optimization",
    "ChatGPT SEO",
    "Gemini Visibility",
    "Perplexity Optimization",
    "AI Citations Auditor"
  ],
  authors: [{ name: "Grow Citable Team", url: "https://growcitable.com" }],
  creator: "Grow Citable",
  publisher: "Grow Citable",
  metadataBase: new URL("https://growcitable.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Grow Citable | SEO & AI Search Engine Optimization (GEO/AEO)",
    description: "Audit citations, track brand mentions, and optimize your business for AI search engines like ChatGPT, Gemini, and Perplexity.",
    url: "https://growcitable.com",
    siteName: "Grow Citable",
    images: [
      {
        url: "/colorful-bg.png",
        width: 1200,
        height: 630,
        alt: "Grow Citable Platform Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grow Citable | SEO & AI Search Engine Optimization (GEO/AEO)",
    description: "Audit citations, track brand mentions, and optimize your business for AI search engines like ChatGPT, Gemini, and Perplexity.",
    images: ["/colorful-bg.png"],
    creator: "@growcitable",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon/logo.png",
    shortcut: "/favicon/logo.png",
    apple: "/favicon/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${kumbhSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
