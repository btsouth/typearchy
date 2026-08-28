import type { MetadataRoute } from 'next';

const siteUrl = 'https://typearchy.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date('2026-08-28'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/play`,
      lastModified: new Date('2026-08-28'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];
}
