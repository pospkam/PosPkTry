import type { Metadata } from 'next';
import FishingTourDetailPageClient from './_FishingTourDetailPageClient';

export const metadata: Metadata = {
  title: 'Тур на рыбалку | Kamhub',
  description: 'Подробная информация о туре на рыбалку на Камчатке',
};

export default function FishingTourDetailPage() {
  return <FishingTourDetailPageClient />;
}
