import type { Metadata } from 'next';
import NewBookingPageClient from './_NewBookingPageClient';

export const metadata: Metadata = {
  title: 'Новое бронирование | Kamhub',
  description: 'Создание нового бронирования тура на Камчатке',
  robots: 'noindex, nofollow',
};

export default function NewBookingPage() {
  return <NewBookingPageClient />;
}
