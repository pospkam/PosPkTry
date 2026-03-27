import type { Metadata } from 'next';
import { pool } from '@/lib/db-pool';
import TourDetailClient from './_TourDetailClient';

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tourhab.ru';

const ACTIVITY_LABELS: Record<string, string> = {
  trekking:   'Треккинг',
  fishing:    'Рыбалка',
  thermal:    'Термальные источники',
  helicopter: 'Вертолётные туры',
  boat_trip:  'Морские туры',
  bears:      'Наблюдение за медведями',
  rafting:    'Сплав',
  snowmobile: 'Снегоходные туры',
};

interface Props {
  params: Promise<{ id: string }>;
}

async function getTour(id: number) {
  try {
    const { rows } = await pool.query<{
      id: number; title: string; description: string | null;
      base_price: string; activity_type: string; location_type: string;
      location: string | null; tour_image: string | null;
      max_participants: number; duration_hours: number | null;
      operator_name: string;
    }>(`
      SELECT ot.id, ot.title, ot.description, ot.base_price,
             ot.activity_type, ot.location_type, ot.location,
             ot.tour_image, ot.max_participants, ot.duration_hours,
             p.name AS operator_name
      FROM operator_tours ot
      JOIN partners p ON ot.partner_id = p.id
      WHERE ot.id = $1
        AND ot.is_active = true
        AND ot.deleted_at IS NULL
    `, [id]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tour = await getTour(parseInt(id));
  if (!tour) return { title: 'Тур не найден | Туры Камчатки' };

  const activityLabel = ACTIVITY_LABELS[tour.activity_type] ?? tour.activity_type;
  const description = tour.description?.slice(0, 160) ??
    `${activityLabel} на Камчатке. Бронирование онлайн.`;

  return {
    title: `${tour.title} | Туры Камчатки`,
    description,
    openGraph: {
      title: tour.title,
      description,
      images: tour.tour_image ? [{ url: tour.tour_image }] : [],
      type: 'website',
      url: `${SITE}/marketplace/tours/${tour.id}`,
    },
  };
}

export default async function TourDetailPage({ params }: Props) {
  const { id } = await params;
  const tour = await getTour(parseInt(id));

  const structuredData = tour ? {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    '@id': `${SITE}/marketplace/tours/${tour.id}`,
    name: tour.title,
    description: tour.description ?? undefined,
    touristType: ACTIVITY_LABELS[tour.activity_type] ?? tour.activity_type,
    ...(tour.tour_image ? { image: [tour.tour_image] } : {}),
    ...(tour.duration_hours ? { duration: `PT${Math.round(tour.duration_hours)}H` } : {}),
    provider: {
      '@type': 'TouristInformationCenter',
      name: tour.operator_name,
      url: SITE,
    },
    offers: {
      '@type': 'Offer',
      price: parseFloat(tour.base_price),
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      url: `${SITE}/marketplace/tours/${tour.id}`,
      seller: {
        '@type': 'Organization',
        name: tour.operator_name,
      },
    },
    location: {
      '@type': 'Place',
      name: tour.location ?? 'Камчатка',
      address: {
        '@type': 'PostalAddress',
        addressLocality: tour.location ?? 'Камчатка',
        addressRegion: 'Камчатский край',
        addressCountry: 'RU',
      },
    },
  } : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <TourDetailClient initialTour={tour} />
    </>
  );
}
