import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
    const { rows } = await pool.query(`
      SELECT
        ot.id, ot.title, ot.description, ot.short_description,
        ot.base_price, ot.price_old, ot.price_unit,
        ot.activity_type, ot.location_type,
        ot.location_name, ot.latitude, ot.longitude,
        ot.tour_image, ot.photos,
        ot.max_participants, ot.min_participants,
        ot.duration_hours, ot.duration_type, ot.multi_day_count,
        ot.difficulty,
        ot.included, ot.not_included, ot.what_to_bring,
        ot.season_start, ot.season_end, ot.seasonal_only,
        ot.weather_dependent,
        ot.rating, ot.review_count,
        p.name AS operator_name, p.id AS operator_id
      FROM operator_tours ot
      JOIN partners p ON ot.operator_id = p.id
      WHERE ot.id = $1
        AND ot.is_active = true
        AND ot.deleted_at IS NULL
    `, [id]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getReviews(tourId: number) {
  try {
    const { rows } = await pool.query(`
      SELECT id, author_name, author_city, rating, comment, trip_date
      FROM operator_tour_reviews
      WHERE tour_id = $1
      ORDER BY created_at DESC
      LIMIT 6
    `, [tourId]);
    return rows;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tour = await getTour(parseInt(id));
  if (!tour) return { title: 'Тур не найден | Туры Камчатки' };

  const activityLabel = ACTIVITY_LABELS[tour.activity_type] ?? tour.activity_type;
  const desc = tour.short_description ?? tour.description?.slice(0, 160) ??
    `${activityLabel} на Камчатке. Реальный тур от проверенного оператора с уточнением деталей перед бронированием.`;

  const images = tour.tour_image ? [{ url: tour.tour_image }] : [];

  return {
    title: `${tour.title} | Реальные туры Камчатки`,
    description: desc,
    openGraph: {
      title: tour.title,
      description: desc,
      images,
      type: 'website',
      url: `${SITE}/marketplace/tours/${tour.id}`,
    },
  };
}

export default async function TourDetailPage({ params }: Props) {
  const { id } = await params;
  const tourId = parseInt(id);
  if (isNaN(tourId)) notFound();

  const [tour, reviews] = await Promise.all([getTour(tourId), getReviews(tourId)]);
  if (!tour) notFound();

  const structuredData = tour ? {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    '@id': `${SITE}/marketplace/tours/${tour.id}`,
    name: tour.title,
    description: tour.description ?? undefined,
    inLanguage: 'ru',
    touristType: ACTIVITY_LABELS[tour.activity_type] ?? tour.activity_type,
    keywords: [
      tour.title,
      ACTIVITY_LABELS[tour.activity_type] ?? tour.activity_type,
      tour.location_name ?? 'Камчатка',
      'реальные туры Камчатка',
      'Камчатский край',
    ].filter(Boolean).join(', '),
    // Speakable — для голосовых ответов Алисы AI
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.tour-description', 'article p:first-of-type', '[data-speakable]'],
    },
    ...(tour.tour_image ? { image: [tour.tour_image, ...(tour.photos ?? [])] } : {}),
    ...(tour.duration_hours ? { duration: `PT${Math.round(Number(tour.duration_hours))}H` } : {}),
    ...(tour.multi_day_count ? { duration: `P${tour.multi_day_count}D` } : {}),
    provider: {
      '@type': 'TouristInformationCenter',
      name: tour.operator_name,
      url: SITE,
      sameAs: SITE,
    },
    offers: {
      '@type': 'Offer',
      price: parseFloat(tour.base_price),
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      url: `${SITE}/marketplace/tours/${tour.id}`,
      ...(tour.season_start && tour.season_end ? {
        availabilityStarts: `${new Date().getFullYear()}-${String(tour.season_start).padStart(2, '0')}-01`,
        availabilityEnds: `${new Date().getFullYear()}-${String(tour.season_end).padStart(2, '0')}-30`,
      } : {}),
      seller: {
        '@type': 'Organization',
        name: tour.operator_name,
      },
    },
    ...(tour.rating && Number(tour.rating) > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(tour.rating),
        reviewCount: tour.review_count ?? 0,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    // Отзывы для контекста Алисы AI
    ...(reviews.length > 0 ? {
      review: reviews.slice(0, 3).map((r: {
        author_name: string;
        author_city?: string;
        rating: number;
        comment: string;
        trip_date?: string;
      }) => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: r.author_name,
          ...(r.author_city ? { address: { '@type': 'PostalAddress', addressLocality: r.author_city } } : {}),
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
          bestRating: 5,
        },
        reviewBody: r.comment,
        ...(r.trip_date ? { datePublished: r.trip_date } : {}),
      })),
    } : {}),
    location: {
      '@type': 'Place',
      name: tour.location_name ?? 'Камчатка',
      address: {
        '@type': 'PostalAddress',
        addressLocality: tour.location_name ?? 'Камчатка',
        addressRegion: 'Камчатский край',
        addressCountry: 'RU',
      },
      ...(tour.latitude && tour.longitude ? {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: Number(tour.latitude),
          longitude: Number(tour.longitude),
        },
        hasMap: `https://maps.yandex.ru/?ll=${tour.longitude},${tour.latitude}&z=12`,
      } : {}),
    },
    // Включённые услуги — для ответов Алисы на вопросы "что входит в тур"
    ...(tour.included && Array.isArray(tour.included) && tour.included.length > 0 ? {
      amenityFeature: (tour.included as string[]).map((item: string) => ({
        '@type': 'LocationFeatureSpecification',
        name: item,
        value: true,
      })),
    } : {}),
  } : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <TourDetailClient tour={tour} reviews={reviews} />
    </>
  );
}
