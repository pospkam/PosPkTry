import type { Metadata } from 'next';
import ToursPageClient from './_ToursPageClient';

export const metadata: Metadata = {
  title: 'Туры на Камчатке | Kamhub',
  description: 'Лучшие туры на Камчатке: вулканы, рыбалка, термальные источники. Забронируйте незабываемое путешествие',
};

export default function ToursPage() {
  return <ToursPageClient />;
}