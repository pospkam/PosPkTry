import type { Metadata } from 'next';
import TourDetailsPageClient from './_TourDetailsPageClient';

export const metadata: Metadata = {
  title: 'Тур на Камчатке | Kamhub',
  description: 'Подробная информация, цены и бронирование тура на Камчатке',
};

export default function TourDetailsPage() {
  return <TourDetailsPageClient />;
}
