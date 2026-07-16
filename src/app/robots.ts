import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const disallowRoutes = [
    '/api/',
    '/dashboard/',
    '/settings/',
    '/onboarding/',
    '/migrate/',
    '/websites/',
    '/welcome/',
    '/ai-shopping/',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: disallowRoutes,
      },
      // Allow OpenAI's ChatGPT and search bots (but block private portal pages)
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: disallowRoutes,
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: disallowRoutes,
      },
      // Allow Anthropic's Claude bots (but block private portal pages)
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: disallowRoutes,
      },
      {
        userAgent: 'Claude-Web',
        allow: '/',
        disallow: disallowRoutes,
      },
      // Allow Google's Gemini training crawler (but block private portal pages)
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: disallowRoutes,
      },
      // Allow Perplexity's crawler (but block private portal pages)
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: disallowRoutes,
      },
    ],
    sitemap: 'https://growcitable.com/sitemap.xml',
  };
}
