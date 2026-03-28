import type { Metadata } from 'next';
import { Suspense } from 'react';
import RoutesPageClient from './_RoutesPageClient';

export const metadata: Metadata = {
  title: 'Места Камчатки — вулканы, источники, озёра, бухты',
  description:
    'Каталог природных мест Камчатки: вулканы, термальные источники, гейзеры, озёра, бухты, горные реки. Координаты, описания, лучшие сезоны для посещения.',
  alternates: { canonical: 'https://tourhab.ru/routes' },
  openGraph: {
    title: 'Места Камчатки',
    description: 'Природные места Камчатки: вулканы, гейзеры, источники, озёра, бухты.',
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
