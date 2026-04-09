import { MetadataRoute } from 'next';
import { pool } from '@/lib/db-pool';
import { CATEGORY_SLUGS } from '@/lib/routes/category-meta';

const BASE = 'https://tourhab.ru';

// Приоритет страницы по типу локации
const LOCATION_PRIORITY: Record<string, number> = {
  volcano:    0.8,
  geyser:     0.8,
  hot_spring: 0.75,
  historical: 0.85,
  museum:     0.8,
  forest:     0.75,
  lake:       0.7,
  mountain:   0.7,
  bay:        0.65,
  river:      0.65,
  viewpoint:  0.65,
  waterfall:  0.65,
  beach:      0.65,
  rock:       0.6,
  cape:       0.6,
  island:     0.6,
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                        lastModified: new Date(), changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${BASE}/routes`,            lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/map`,               lastModified: new Date(), changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/safety`,            lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/planner`,           lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/faq`,               lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/help`,              lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.65 },
    { url: `${BASE}/contact`,           lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/marketplace`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/operators`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/for-operators`,     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.65 },
    { url: `${BASE}/legal/privacy`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/legal/terms`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/legal/offer`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/legal/commission`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/legal/agent-agreement`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Категории маршрутов (14 страниц с высоким SEO-приоритетом)
  const categoryPages: MetadataRoute.Sitemap = CATEGORY_SLUGS.map(slug => ({
    url: `${BASE}/routes/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // Динамические страницы: все видимые маршруты
  let routePages: MetadataRoute.Sitemap = [];
  try {
    const { rows } = await pool.query<{
      id: string;
      updated_at: Date;
      location_type: string | null;
    }>(`
      SELECT id, updated_at, location_type
      FROM agent_route_knowledge
      WHERE is_visible = TRUE
      ORDER BY updated_at DESC
      LIMIT 2000
    `);

    routePages = rows.map(row => ({
      url: `${BASE}/routes/${row.id}`,
      lastModified: row.updated_at,
      changeFrequency: 'weekly' as const,
      priority: LOCATION_PRIORITY[row.location_type ?? ''] ?? 0.6,
    }));
  } catch {
    // Если БД недоступна при сборке — sitemap без динамических страниц
  }

  // Маркетплейс-туры
  let marketplacePages: MetadataRoute.Sitemap = [];
  try {
    const { rows } = await pool.query<{ id: string; updated_at: Date }>(
      `SELECT id, updated_at FROM operator_tours
       WHERE deleted_at IS NULL AND is_visible = true
       ORDER BY updated_at DESC LIMIT 500`
    );
    marketplacePages = rows.map(row => ({
      url: `${BASE}/marketplace/tours/${row.id}`,
      lastModified: row.updated_at,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // fallback
  }

  return [...staticPages, ...categoryPages, ...routePages, ...marketplacePages];
}
