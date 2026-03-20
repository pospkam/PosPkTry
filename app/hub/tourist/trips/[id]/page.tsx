import { Metadata } from 'next';
import { TripDetailClient } from './_TripDetailClient';

export const metadata: Metadata = {
  title: 'Маршрут | TourHab',
  robots: 'noindex, nofollow',
};

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripDetailClient tripId={id} />;
}
