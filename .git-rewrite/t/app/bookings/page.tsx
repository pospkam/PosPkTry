import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import BookingsClient from './_BookingsClient';

export const metadata: Metadata = {
  title: 'Мои бронирования — TourHab',
  description: 'Управление вашими турами и бронированиями',
  robots: { index: false, follow: false },
};

export default function BookingsPage() {
  return (
    <>
      <Header />
      <BookingsClient />
    </>
  );
}
