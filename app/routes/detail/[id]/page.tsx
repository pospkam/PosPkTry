import type { Metadata } from 'next';
import RouteCardClient from './_RouteCardClient';

export const metadata: Metadata = {
  title: 'Маршрут | TourHab',
  description: 'Описание маршрута, точки, опасности, снаряжение и регистрация МЧС',
};

export default async function RouteCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RouteCardClient id={id} />;
}
