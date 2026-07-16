import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://growcitable.com';
  const routes = [
    { path: '', priority: 1.0 },
    { path: '/pricing', priority: 0.9 },
    { path: '/enterprise', priority: 0.9 },
    { path: '/guides', priority: 0.9 },
    { path: '/grow-citable-index', priority: 0.9 },
    { path: '/about', priority: 0.8 },
    { path: '/contact', priority: 0.8 },
    { path: '/blog', priority: 0.8 },
    { path: '/help-center', priority: 0.8 },
    { path: '/ai-instructions', priority: 0.8 },
    { path: '/resource-center', priority: 0.8 },
    { path: '/research-hub', priority: 0.8 },
    { path: '/login', priority: 0.6 },
    { path: '/signup', priority: 0.6 },
    { path: '/rules', priority: 0.6 }
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route.priority,
  }));
}
