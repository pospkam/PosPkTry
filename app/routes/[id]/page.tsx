import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RouteDetailClient from './_RouteDetailClient';
import { CATEGORY_PAGES } from '@/lib/routes/category-meta';
import CategoryPage from '@/components/routes/CategoryPage';
import { query } from '@/lib/database';

interface Props {
  params: Promise<{ id: string }>;
}

async function getRoute(id: string) {
  try {
    const result = await query(
      `SELECT id, category, title, description, lat, lng, source_url, payload
       FROM agent_route_knowledge WHERE id = $1`,
      [id]
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    const payload = (r.payload as Record<string, unknown>) ?? {};
    return {
      id: r.id as string,
      category: r.category as string,
      title: r.title as string,
      description: (r.description as string | null) ?? '',
      lat: r.lat != null ? parseFloat(r.lat as string) : null,
      lng: r.lng != null ? parseFloat(r.lng as string) : null,
      sourceUrl: (r.source_url as string | null) ?? null,
      priceFrom: payload.price_from != null ? Number(payload.price_from) : null,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // Category page metadata
  const catMeta = CATEGORY_PAGES[id];
  if (catMeta) {
    return {
      title: catMeta.title,
      description: catMeta.description,
      keywords: catMeta.keywords,
      alternates: { canonical: `https://tourhab.ru/routes/${id}` },
      openGraph: {
        title: catMeta.title,
        description: catMeta.description,
        url: `https://tourhab.ru/routes/${id}`,
        siteName: 'TourHab',
        locale: 'ru_RU',
        type: 'website',
      },
    };
  }

  // Individual route metadata
  if (!/^[0-9a-f-]{36}$/.test(id)) return { title: 'Маршрут не найден' };

  const route = await getRoute(id);
  if (!route) return { title: 'Маршрут не найден' };

  const title = `${route.title} — маршрут на Камчатке`;
  const desc = route.description
    ? route.description.replace(/<[^>]+>/g, '').slice(0, 180)
    : `Туристический маршрут на Камчатке: ${route.title}. Категория: ${route.category}.`;

  return {
    title,
    description: desc,
    alternates: { canonical: `https://tourhab.ru/routes/${id}` },
    openGraph: {
      title,
      description: desc,
      url: `https://tourhab.ru/routes/${id}`,
      siteName: 'TourHab',
      locale: 'ru_RU',
      type: 'article',
    },
  };
}

export default async function RouteOrCategoryPage({ params }: Props) {
  const { id } = await params;

  // ── Category page ──────────────────────────────────────────
  if (CATEGORY_PAGES[id]) {
    const catMeta = CATEGORY_PAGES[id];
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: catMeta.h1,
      description: catMeta.description,
      url: `https://tourhab.ru/routes/${id}`,
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://tourhab.ru' },
          { '@type': 'ListItem', position: 2, name: 'Маршруты', item: 'https://tourhab.ru/routes' },
          { '@type': 'ListItem', position: 3, name: catMeta.name, item: `https://tourhab.ru/routes/${id}` },
        ],
      },
    };
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <CategoryPage category={id} />
      </>
    );
  }

  // ── Individual route page ──────────────────────────────────
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) notFound();

  const route = await getRoute(id);
  if (!route) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: route.title,
    description: route.description
      ? route.description.replace(/<[^>]+>/g, '').slice(0, 500)
      : undefined,
    url: `https://tourhab.ru/routes/${id}`,
    touristType: route.category,
    ...(route.lat != null && route.lng != null ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: route.lat,
        longitude: route.lng,
      },
      containedInPlace: {
        '@type': 'Place',
        name: 'Камчатский край',
        address: {
          '@type': 'PostalAddress',
          addressRegion: 'Камчатский край',
          addressCountry: 'RU',
        },
      },
    } : {}),
    ...(route.priceFrom != null ? {
      offers: {
        '@type': 'Offer',
        price: route.priceFrom,
        priceCurrency: 'RUB',
        availability: 'https://schema.org/InStock',
      },
    } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RouteDetailClient id={id} />
    </>
  );
}
