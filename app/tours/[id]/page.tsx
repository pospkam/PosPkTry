import type { Metadata } from 'next';
import TourDetailsPageClient from './_TourDetailsPageClient';
import { query } from '@/lib/database';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const result = await query(`SELECT * FROM tours WHERE id = $1`, [id]);

    if (result.rows.length > 0) {
      const tour = result.rows[0];
      const tourName = tour.title || tour.name || 'Тур';
      const title = `${tourName} | Kamchatour`;
      const tourPrice = tour.pricePerDay || tour.price || '';
      const description = tour.description || tour.short_description || `Забронируйте тур "${tourName}" на Камчатке. Цена: от ${tourPrice} ${tour.currency || '₽'}.`;
      
      let imageUrl = 'https://kamchatour.ru/images/og-default.jpg';
      if (tour.images) {
        try {
          const images = typeof tour.images === 'string' ? JSON.parse(tour.images) : tour.images;
          if (Array.isArray(images) && images.length > 0) {
            imageUrl = images[0];
          }
        } catch (e) {
          // Ignore parse error
        }
      }

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
  } catch (error) {
    console.error('Error generating metadata for tour:', error);
  }

  return {
    title: 'Тур на Камчатке | Kamchatour',
    description: 'Подробная информация, цены и бронирование тура на Камчатке',
  };
}

export default async function TourDetailsPage({ params }: Props) {
  const { id } = await params;
  
  let tourJsonLd = null;
  try {
    const result2 = await query(`SELECT * FROM tours WHERE id = $1`, [id]);

    if (result2.rows.length > 0) {
      const tour = result2.rows[0];
      
      let images = [];
      if (tour.images) {
        try {
          images = typeof tour.images === 'string' ? JSON.parse(tour.images) : tour.images;
        } catch (e) {}
      }

      tourJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: tour.title || tour.name || '',
        description: tour.fullDescription || tour.description || '',
        image: images.length > 0 ? images : ['https://kamchatour.ru/images/og-default.jpg'],
        offers: {
          '@type': 'Offer',
          price: tour.pricePerDay || tour.price || 0,
          priceCurrency: tour.currency || 'RUB',
          availability: 'https://schema.org/InStock',
        },
        provider: {
          '@type': 'Organization',
          name: 'Kamchatour',
          url: 'https://kamchatour.ru'
        }
      };

      if (tour.rating && tour.review_count) {
        tourJsonLd.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: tour.rating,
          reviewCount: tour.review_count,
        };
      }
    }
  } catch (error) {
    console.error('Error generating JSON-LD for tour:', error);
  }

  return (
    <>
      {tourJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(tourJsonLd) }}
        />
      )}
      <TourDetailsPageClient />
    </>
  );
}
