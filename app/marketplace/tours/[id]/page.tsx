import { Metadata } from 'next';
import TourDetailClient from './_TourDetailClient';

export const metadata: Metadata = {
  title: 'Детали тура | Туры Камчатки',
  description: 'Описание и бронирование тура по Камчатке'
};

export default function TourDetailPage() {
  return <TourDetailClient />;
}
