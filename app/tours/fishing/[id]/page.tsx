import type { Metadata } from 'next';
import FishingTourDetailPageClient from './_FishingTourDetailPageClient';
import { FISHING_TOURS } from '@/lib/partners/kamchatka-fishing/tours-data';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tour = FISHING_TOURS.find(t => t.id === id);

  if (tour) {
    const title = `${tour.title} | Kamchatour`;
    const description = tour.description.substring(0, 160) + '...';
    const imageUrl = tour.images[0] || 'https://kamchatour.ru/images/og-default.jpg';

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
    title: 'Тур на рыбалку | Kamchatour',
    description: 'Подробная информация о туре на рыбалку на Камчатке',
  };
}

export default async function FishingTourDetailPage({ params }: Props) {
  const { id } = await params;
  const tour = FISHING_TOURS.find(t => t.id === id);

  let tourJsonLd = null;
  if (tour) {
    tourJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: tour.title,
      description: tour.description,
      image: tour.images.length > 0 ? tour.images : ['https://kamchatour.ru/images/og-default.jpg'],
      offers: {
        '@type': 'Offer',
        price: tour.price,
        priceCurrency: 'RUB',
        availability: 'https://schema.org/InStock',
      },
      provider: {
        '@type': 'Organization',
        name: 'Камчатская Рыбалка',
        url: 'https://fishingkam.ru'
      }
    };
  }

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
