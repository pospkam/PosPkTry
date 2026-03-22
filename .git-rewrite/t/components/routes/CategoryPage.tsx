import { pool } from '@/lib/db-pool';
import { CATEGORY_PAGES } from '@/lib/routes/category-meta';
import { Header } from '@/components/layout/Header';
import RouteCard, { RouteItem } from './RouteCard';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default async function CategoryPage({ category }: { category: string }) {
  const meta = CATEGORY_PAGES[category];

  const [routeResult, countResult] = await Promise.all([
    pool.query<{
      id: string; title: string; description: string; category: string;
      lat: unknown; lng: unknown; price_from: unknown; difficulty: string | null;
      duration_days: unknown; source_name: string | null;
    }>(
      `SELECT id, title, description, category, lat, lng,
              NULLIF(payload->>'price_from', '')::numeric AS price_from,
              payload->>'difficulty' AS difficulty,
              NULLIF(payload->>'duration_days', '')::numeric::int AS duration_days,
              source_name
       FROM agent_route_knowledge
       WHERE category = $1 AND is_visible = TRUE
       ORDER BY
         CASE WHEN source_name = 'idilesom.com' THEN 0
              WHEN source_name = 'kamchatintour.ru' THEN 1
              ELSE 2 END,
         title ASC
       LIMIT 24`,
      [category]
    ),
    pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM agent_route_knowledge WHERE category = $1 AND is_visible = TRUE',
      [category]
    ),
  ]);

  const routes: RouteItem[] = routeResult.rows.map(r => ({
    id: r.id,
    category: r.category,
    title: r.title,
    description: r.description,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    priceFrom: r.price_from != null ? Number(r.price_from) : null,
    difficulty: r.difficulty,
    durationDays: r.duration_days != null ? Number(r.duration_days) : null,
    sourceName: r.source_name,
  }));

  const total = Number(countResult.rows[0].count);
  const otherCategories = Object.values(CATEGORY_PAGES).filter(c => c.slug !== category);

  return (
    <>
      <Header />
      <div className="ds-page pt-20 pb-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-6">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">Главная</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/routes" className="hover:text-[var(--accent)] transition-colors">Маршруты</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[var(--text-primary)]">{meta.name}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8 max-w-2xl">
          <h1 className="ds-h1 mb-3">{meta.h1}</h1>
          <p className="text-[var(--text-secondary)] leading-relaxed text-base">{meta.intro}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-6 text-sm">
          <span className="text-[var(--text-muted)]">{total} маршрутов</span>
          {total > 24 && (
            <>
              <span className="text-[var(--border)]">·</span>
              <Link
                href={`/routes?category=${category}`}
                className="text-[var(--accent)] hover:underline"
              >
                Смотреть все {total} →
              </Link>
            </>
          )}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
          {routes.map(r => (
            <RouteCard key={r.id} route={r} />
          ))}
          {routes.length === 0 && (
            <p className="col-span-full text-[var(--text-muted)] text-sm py-8 text-center">
              Маршруты не найдены
            </p>
          )}
        </div>

        {/* Other categories */}
        <div className="border-t border-[var(--border)] pt-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Другие виды туров на Камчатке
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherCategories.map(c => (
              <Link
                key={c.slug}
                href={`/routes/${c.slug}`}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
