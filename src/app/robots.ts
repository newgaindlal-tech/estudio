import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/auth/', '/settings/'],
    },
    sitemap: 'https://estudioworkspace.vercel.app/sitemap.xml',
  };
}