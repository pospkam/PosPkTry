import type { Metadata } from 'next';
import PlaceDetailClient from './_PlaceDetailClient';

export const metadata: Metadata = {
  title: 'Место на карте | TourHab',
  description: 'Описание, безопасность и навигация к точке на Камчатке',
};

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaceDetailClient id={id} />;
}
