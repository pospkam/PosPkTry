import { MetadataRoute } from 'next';
import { FISHING_TOURS } from '@/lib/partners/kamchatka-fishing/tours-data';
import { query } from '@/lib/database';
import { CATEGORY_SLUGS } from '@/lib/routes/category-meta';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kamchatour.ru';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/tours`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tours/fishing`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/accommodations`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/map`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/routes`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Legal pages
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/offer`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/commission`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Auth
    {
      url: `${BASE_URL}/auth/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/auth/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Категорийные страницы маршрутов (SEO)
  const categoryPages: MetadataRoute.Sitemap = CATEGORY_SLUGS.map(slug => ({
    url: `${BASE_URL}/routes/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Динамические страницы туров (рыбалка)
  const fishingTourPages: MetadataRoute.Sitemap = FISHING_TOURS.map((tour) => ({
    url: `${BASE_URL}/tours/fishing/${tour.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Динамические страницы маршрутов из agent_route_knowledge
  let routePages: MetadataRoute.Sitemap = [];
  try {
    const result = await query(
      `SELECT id, updated_at FROM agent_route_knowledge
       WHERE lat IS NOT NULL ORDER BY updated_at DESC LIMIT 1000`
    );
    routePages = result.rows.map((r) => ({
      url: `${BASE_URL}/routes/${r.id as string}`,
      lastModified: r.updated_at ? new Date(r.updated_at as string) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch { /* sitemap continues without routes if DB unavailable */ }

  return [...staticPages, ...categoryPages, ...fishingTourPages, ...routePages];
}
