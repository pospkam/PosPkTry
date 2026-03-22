import type { Metadata } from 'next';
import { Suspense } from 'react';
import RoutesPageClient from './_RoutesPageClient';

export const metadata: Metadata = {
  title: 'Маршруты Камчатки — 1000+ туров, экскурсий и достопримечательностей',
  description:
    'Полный каталог туристических маршрутов Камчатки: вулканы, термальные источники, морские прогулки, рыбалка, трекинг, медведи. Цены, сезоны, карта. Booking Kamchatka tours.',
  alternates: { canonical: 'https://tourhab.ru/routes' },
  openGraph: {
    title: 'Маршруты Камчатки',
    description: '1000+ маршрутов и достопримечательностей: вулканы, гейзеры, море, дикая природа.',
    url: 'https://tourhab.ru/routes',
    siteName: 'KamchatourHub',
    locale: 'ru_RU',
    type: 'website',
  },
};

export default function RoutesPage() {
  return (
    <Suspense>
      <RoutesPageClient />
    </Suspense>
  );
}
