import { Metadata } from 'next';
import { TripsClient } from './_TripsClient';

export const metadata: Metadata = {
  title: 'Мои маршруты | TourHab',
  robots: 'noindex, nofollow',
};

export default function TripsPage() {
  return <TripsClient />;
}
