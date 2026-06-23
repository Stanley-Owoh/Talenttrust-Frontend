import type { MetadataRoute } from 'next';

/**
 * Generates a dynamic sitemap.xml listing all public static routes.
 *
 * @returns Sitemap entries with lastModified date
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
    },
    {
      url: `${siteUrl}/contracts`,
      lastModified,
    },
    {
      url: `${siteUrl}/milestones`,
      lastModified,
    },
    {
      url: `${siteUrl}/reputation`,
      lastModified,
    },
  ];
}
