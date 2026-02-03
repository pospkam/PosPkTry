import React from 'react';

interface OrganizationJsonLdProps {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  sameAs?: string[];
}

export function OrganizationJsonLd({
  name,
  url,
  logo,
  description,
  phone,
  email,
  address,
  sameAs,
}: OrganizationJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name,
    url,
    logo,
    description,
    telephone: phone,
    email,
    address: address
      ? {
          '@type': 'PostalAddress',
          ...address,
        }
      : undefined,
    sameAs,
    areaServed: {
      '@type': 'Place',
      name: 'Камчатский край',
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 53.0452,
        longitude: 158.6511,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface TourJsonLdProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  price: number;
  priceCurrency?: string;
  duration: string; // ISO 8601 format, e.g., "P3D" for 3 days
  provider: {
    name: string;
    url?: string;
  };
  location: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  rating?: {
    value: number;
    count: number;
  };
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
}

export function TourJsonLd({
  name,
  description,
  url,
  image,
  price,
  priceCurrency = 'RUB',
  duration,
  provider,
  location,
  rating,
  availability = 'InStock',
}: TourJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name,
    description,
    url,
    image,
    touristType: 'Adventure',
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency,
      availability: `https://schema.org/${availability}`,
      validFrom: new Date().toISOString(),
    },
    itinerary: {
      '@type': 'ItemList',
      numberOfItems: 1,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          item: {
            '@type': 'TouristAttraction',
            name: location.name,
            geo: location.latitude
              ? {
                  '@type': 'GeoCoordinates',
                  latitude: location.latitude,
                  longitude: location.longitude,
                }
              : undefined,
          },
        },
      ],
    },
    provider: {
      '@type': 'TravelAgency',
      name: provider.name,
      url: provider.url,
    },
    aggregateRating: rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: rating.value,
          reviewCount: rating.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface FishingTourJsonLdProps {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // days
  location: string;
  fishTypes: string[];
  rating?: number;
  reviewsCount?: number;
  partner: string;
}

export function FishingTourJsonLd({
  id,
  name,
  description,
  price,
  duration,
  location,
  fishTypes,
  rating,
  reviewsCount,
  partner,
}: FishingTourJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kamchatour.ru';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: `${description} Виды рыбы: ${fishTypes.join(', ')}`,
    url: `${baseUrl}/tours/fishing/${id}`,
    brand: {
      '@type': 'Brand',
      name: partner,
    },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      seller: {
        '@type': 'Organization',
        name: partner,
      },
    },
    aggregateRating: rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: rating,
          reviewCount: reviewsCount || 0,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Продолжительность',
        value: `${duration} ${duration === 1 ? 'день' : duration < 5 ? 'дня' : 'дней'}`,
      },
      {
        '@type': 'PropertyValue',
        name: 'Локация',
        value: location,
      },
      {
        '@type': 'PropertyValue',
        name: 'Виды рыбы',
        value: fishTypes.join(', '),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface BreadcrumbJsonLdProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface FAQJsonLdProps {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export function FAQJsonLd({ questions }: FAQJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
