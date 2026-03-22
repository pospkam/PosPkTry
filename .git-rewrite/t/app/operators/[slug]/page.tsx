import { Metadata } from 'next';
import { query } from '@/lib/database';
import OperatorProfileClient from './_OperatorProfileClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const BASE_URL = 'https://tourhab.ru';

interface OperatorBasic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  short_description: string | null;
  hero_image: string | null;
  location: { lat: number; lng: number; address: string } | null;
  legal_info: Record<string, string> | null;
  rating: number;
  review_count: number;
}

async function getOperatorBasic(slug: string): Promise<OperatorBasic | null> {
  try {
    const result = await query<OperatorBasic>(
      `SELECT id, slug, name, description, short_description,
              hero_image, location, legal_info,
              rating::float AS rating, review_count
       FROM partners
       WHERE slug = $1 AND is_public = TRUE
       LIMIT 1`,
      [slug],
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const op = await getOperatorBasic(slug);
  if (!op) return { title: 'Оператор не найден' };

  return {
    title: `${op.name} — партнёр TourHab`,
    description: op.short_description ?? op.description?.slice(0, 160) ?? '',
    openGraph: {
      title: `${op.name} — TourHab`,
      description: op.short_description ?? '',
      url: `${BASE_URL}/operators/${slug}`,
      images: op.hero_image ? [{ url: op.hero_image }] : [],
    },
    alternates: {
      canonical: `${BASE_URL}/operators/${slug}`,
    },
  };
}

export default async function OperatorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const op = await getOperatorBasic(slug);

  const jsonLd = op ? {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: op.name,
    description: op.short_description ?? op.description ?? '',
    url: `${BASE_URL}/operators/${slug}`,
    ...(op.hero_image ? { image: op.hero_image } : {}),
    ...(op.review_count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: op.rating.toFixed(1),
        reviewCount: op.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    ...(op.location ? {
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Петропавловск-Камчатский',
        addressCountry: 'RU',
        streetAddress: op.location.address,
      },
    } : {}),
    ...(op.legal_info?.inn ? { taxID: op.legal_info.inn } : {}),
    areaServed: { '@type': 'Place', name: 'Камчатский край, Россия' },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <OperatorProfileClient slug={slug} />
    </>
  );
}
