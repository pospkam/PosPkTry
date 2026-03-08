import type { Metadata } from 'next';
import { query } from '@/lib/database';
import FishingTourDetailPageClient from './_FishingTourDetailPageClient';

type Props = {
  params: Promise<{ id: string }>;
};

async function getTourBasic(id: string) {
  try {
    const result = await query(
      `SELECT name, description, images FROM tours WHERE id = $1 AND is_active = true LIMIT 1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const images: string[] = Array.isArray(row.images)
      ? (row.images as string[])
      : typeof row.images === 'string'
        ? (JSON.parse(row.images as string) as string[])
        : [];
    return {
      name:        (row.name as string) || '',
      description: (row.description as string) || '',
      images,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tour = await getTourBasic(id);

  if (tour) {
    const title       = `${tour.name} | Kamchatour`;
    const description = tour.description.substring(0, 160) + (tour.description.length > 160 ? '...' : '');
    const imageUrl    = tour.images[0] || 'https://kamchatour.ru/images/og-default.jpg';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [imageUrl],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  }

  return {
    title:       'Тур на рыбалку | Kamchatour',
    description: 'Подробная информация о туре на рыбалку на Камчатке',
  };
}

export default async function FishingTourDetailPage({ params }: Props) {
  const { id } = await params;
  const tour = await getTourBasic(id);

  const tourJsonLd = tour
    ? {
        '@context': 'https://schema.org',
        '@type':    'TouristTrip',
        name:         tour.name,
        description:  tour.description,
        image:        tour.images.length > 0 ? tour.images : ['https://kamchatour.ru/images/og-default.jpg'],
        offers: {
          '@type':       'Offer',
          price:          0,
          priceCurrency: 'RUB',
          availability:  'https://schema.org/InStock',
        },
        provider: {
          '@type': 'Organization',
          name:    'Kamchatour',
          url:     'https://kamchatour.ru',
        },
      }
    : null;

  return (
    <>
      {tourJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(tourJsonLd) }}
        />
      )}
      <FishingTourDetailPageClient />
    </>
  );
}
