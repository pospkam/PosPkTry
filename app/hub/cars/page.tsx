import type { Metadata } from 'next';
import CarsHubClient from './_CarsHubClient';

export const metadata: Metadata = {
  title: 'Аренда автомобилей | Kamhub',
  description: 'Бронирование и управление арендой автомобилей',
  robots: 'noindex, nofollow',
};

export default function CarsHub() {
  return <CarsHubClient />;
}
