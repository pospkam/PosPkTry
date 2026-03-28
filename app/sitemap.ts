import { MetadataRoute } from 'next';
import { pool } from '@/lib/db-pool';

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
    { url: `${BASE}/auth/signin`,       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/auth/signup`,       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/hub/tourist`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.5 },
    { url: `${BASE}/hub/operator/leads`,lastModified: new Date(), changeFrequency: 'daily',   priority: 0.6 },
    { url: `${BASE}/hub/safety`,        lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.8 },
  ];

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

  return [...staticPages, ...routePages];
}
