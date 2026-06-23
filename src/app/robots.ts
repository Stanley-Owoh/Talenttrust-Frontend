import type { MetadataRoute } from 'next';

/**
 * Generates robots.txt metadata to instruct search crawlers.
 *
 * @returns Robots metadata rules
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
