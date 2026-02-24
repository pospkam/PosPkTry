import type { Metadata } from 'next';
import FishingToursPageClient from './_FishingToursPageClient';

export const metadata: Metadata = {
  title: 'Рыбалка на Камчатке | Kamchatour',
  description: 'Туры на рыбалку на Камчатке — сёмга, кижуч, чавыча. Лучшие маршруты и гиды.',
};

export default function FishingToursPage() {
  return <FishingToursPageClient />;
}
