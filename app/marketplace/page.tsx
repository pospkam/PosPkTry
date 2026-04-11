import type { Metadata } from 'next';
import { pool } from '@/lib/db-pool';
import { Header } from '@/components/layout/Header';
import MarketplaceClient from '@/components/marketplace/MarketplaceClient';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tourhab.ru';

export const metadata: Metadata = {
  title: 'Реальные туры по Камчатке от операторов',
  description: 'Честный каталог реальных туров по Камчатке от проверенных операторов. Сначала выбор и проверка деталей, потом заявка или бронирование.',
  keywords: [
    'туры Камчатка',
    'бронирование туров Камчатка',
    'рыболовные туры Камчатка',
    'восхождение на вулканы Камчатка',
    'термальные источники тур',
  ],
  alternates: {
    canonical: `${SITE}/marketplace`,
  },
  openGraph: {
    title: 'Реальные туры по Камчатке',
    description: 'Проверенные операторы, реальные предложения и честные условия без серых схем.',
    type: 'website',
    url: `${SITE}/marketplace`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Реальные туры по Камчатке',
    description: 'Каталог реальных туров от операторов Камчатки с прозрачными условиями.',
  },
};

async function getTopTours() {
  try {
    const { rows } = await pool.query<{
      id: number; title: string; description: string | null;
      base_price: string; activity_type: string;
      tour_image: string | null; operator_name: string;
    }>(`
      SELECT ot.id, ot.title, ot.description, ot.base_price,
             ot.activity_type, ot.tour_image, p.name AS operator_name
      FROM operator_tours ot
      JOIN partners p ON ot.operator_id = p.id
      WHERE ot.is_active = true
        AND ot.is_published = true
        AND ot.deleted_at IS NULL
      ORDER BY ot.created_at DESC
      LIMIT 50
    `);
    return rows;
  } catch {
    return [];
  }
}

export default async function MarketplacePage() {
  const tours = await getTopTours();

  const structuredData = tours.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Реальные туры по Камчатке',
    description: 'Каталог реальных туров по Камчатке от проверенных операторов',
    url: `${SITE}/marketplace`,
    numberOfItems: tours.length,
    itemListElement: tours.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'TouristTrip',
        '@id': `${SITE}/marketplace/tours/${t.id}`,
        name: t.title,
        description: t.description?.slice(0, 160) ?? undefined,
        ...(t.tour_image ? { image: t.tour_image } : {}),
        provider: {
          '@type': 'TouristInformationCenter',
          name: t.operator_name,
        },
        offers: {
          '@type': 'Offer',
          price: parseFloat(t.base_price),
          priceCurrency: 'RUB',
          availability: 'https://schema.org/InStock',
          url: `${SITE}/marketplace/tours/${t.id}`,
        },
      },
    })),
  } : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <Header />
      <MarketplaceClient />
    </>
  );
}
