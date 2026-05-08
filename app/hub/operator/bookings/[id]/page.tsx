import type { Metadata } from 'next';
import BookingDetailClient from './_BookingDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Бронирование | Оператор',
};

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  return <BookingDetailClient bookingId={id} />;
}
