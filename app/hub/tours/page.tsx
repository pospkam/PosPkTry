import type { Metadata } from 'next';
import ToursPageClient from './_ToursPageClient';

export const metadata: Metadata = {
  title: 'Мои туры | Kamhub',
  description: 'Список туров и бронирований',
  robots: 'noindex, nofollow',
};

export default function ToursPage() {
  return <ToursPageClient />;
}
