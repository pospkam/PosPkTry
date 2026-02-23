import type { Metadata } from 'next';
import AccommodationDetailsPageClient from './_AccommodationDetailsPageClient';

export const metadata: Metadata = {
  title: 'Жильё на Камчатке | Kamhub',
  description: 'Подробная информация об объекте размещения на Камчатке',
};

export default function AccommodationDetailsPage() {
  return <AccommodationDetailsPageClient />;
}
