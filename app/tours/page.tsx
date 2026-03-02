import type { Metadata } from 'next';
import ToursPageClient from './_ToursPageClient';

export const metadata: Metadata = {
  title: 'Туры на Камчатке | Kamchatour',
  description: 'Лучшие туры на Камчатке: вулканы, рыбалка, термальные источники. Забронируйте незабываемое путешествие',
  alternates: { canonical: 'https://kamchatourhub.ru/tours' },
};

export default function ToursPage() {
  return <ToursPageClient />;
}