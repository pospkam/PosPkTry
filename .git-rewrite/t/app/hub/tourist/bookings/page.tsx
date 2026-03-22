import type { Metadata } from 'next';
import BookingHistoryPageClient from './_BookingHistoryPageClient';

export const metadata: Metadata = {
  title: 'Мои бронирования | Kamhub',
  description: 'Список активных и прошедших бронирований',
  robots: 'noindex, nofollow',
};

export default function BookingHistoryPage() {
  return <BookingHistoryPageClient />;
}
