import type { MetadataRoute } from 'next';
import { query } from '@/lib/database';
import { CATEGORY_SLUGS } from '@/lib/routes/category-meta';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tourhab.ru';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                                 lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/marketplace`,                lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/routes`,                     lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/fishing`,                    lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/planner`,                    lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/ai-assistant`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/marketplace/operators`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/map`,                        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/faq`,                        lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/help`,                       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/auth/login`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/auth/register`,              lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/legal/privacy`,              lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/legal/terms`,                lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/legal/offer`,                lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/legal/commission`,           lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];

  // Категорийные страницы маршрутов (SEO)
  const categoryPages: MetadataRoute.Sitemap = CATEGORY_SLUGS.map(slug => ({
    url: `${BASE_URL}/routes/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Активные туры marketplace
  let tourPages: MetadataRoute.Sitemap = [];
  try {
    const tourResult = await query<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM operator_tours
       WHERE is_active = TRUE AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 500`,
    );
    tourPages = tourResult.rows.map((t) => ({
      url:             `${BASE_URL}/marketplace/tours/${t.id}`,
      lastModified:    new Date(t.updated_at),
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }));
  } catch { /* continues without tours */ }

  // Динамические страницы маршрутов из agent_route_knowledge
  let routePages: MetadataRoute.Sitemap = [];
  try {
    const result = await query(
      `SELECT id, updated_at FROM agent_route_knowledge
       WHERE lat IS NOT NULL AND is_visible = TRUE ORDER BY updated_at DESC LIMIT 1000`
    );
    routePages = result.rows.map((r) => ({
      url: `${BASE_URL}/routes/${r.id as string}`,
      lastModified: r.updated_at ? new Date(r.updated_at as string) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch { /* sitemap continues without routes if DB unavailable */ }

  // Динамические страницы операторов
  let operatorPages: MetadataRoute.Sitemap = [];
  try {
    const opResult = await query(
      `SELECT slug, updated_at FROM partners
       WHERE is_public = TRUE AND slug IS NOT NULL AND status = 'active'
       ORDER BY updated_at DESC`
    );
    operatorPages = opResult.rows.map((r) => ({
      url: `${BASE_URL}/operators/${r.slug as string}`,
      lastModified: r.updated_at ? new Date(r.updated_at as string) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch { /* sitemap continues without operators if DB unavailable */ }

  return [...staticPages, ...categoryPages, ...tourPages, ...routePages, ...operatorPages];
}
