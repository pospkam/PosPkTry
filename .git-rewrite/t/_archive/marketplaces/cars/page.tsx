import type { Metadata } from 'next';
import CarRentalPageClient from './_CarRentalPageClient';

export const metadata = {
  title: 'Аренда автомобилей на Камчатке | Kamhub',
  description: 'Аренда внедорожников и автомобилей для путешествий по Камчатке. Бронирование онлайн',
};

export default function CarRentalPage() {
  return <CarRentalPageClient />;
}
