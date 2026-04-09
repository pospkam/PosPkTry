import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import ContactClient from './_ContactClient';

export const metadata: Metadata = {
  title: 'Оставить заявку — KamchatourHub',
  description: 'Оставьте заявку на тур по Камчатке. Наши специалисты подберут маршрут под ваши пожелания.',
  keywords: [
    'туры Камчатка',
    'туроператор Камчатка',
    'экскурсии Камчатка',
    'Петропавловск-Камчатский туры',
    'заявка на тур Камчатка',
  ],
  alternates: { canonical: 'https://tourhab.ru/contact' },
  openGraph: {
    title: 'Оставить заявку на тур по Камчатке',
    description: 'Подбор маршрута по Камчатке: вулканы, рыбалка, горячие источники, экспедиции с локальными операторами.',
    url: 'https://tourhab.ru/contact',
    type: 'website',
    locale: 'ru_RU',
    siteName: 'TourHab',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Оставить заявку на тур по Камчатке',
    description: 'Подберем маршрут и оператора под ваш формат отдыха на Камчатке.',
  },
};

export default function ContactPage() {
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'TourHab',
    url: 'https://tourhab.ru/contact',
    image: 'https://tourhab.ru/og-image.jpg',
    telephone: '+7 (914) 782-22-22',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RU',
      addressRegion: 'Камчатский край',
      addressLocality: 'Петропавловск-Камчатский',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 53.0444,
      longitude: 158.6483,
    },
    areaServed: 'Камчатский край',
    sameAs: [
      'https://t.me/kamchatourhub',
      'https://vk.com/kamchatourhub',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <Header />
      <ContactClient />
    </>
  );
}
