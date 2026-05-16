import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TripShareClient } from './_TripShareClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

async function fetchTrip(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tourhab.ru';
  try {
    const res = await fetch(`${baseUrl}/api/trips/share/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const trip = await fetchTrip(token);
  if (!trip) return { title: 'Маршрут | KamchatourHub' };
  const dateRange = trip.arrival_date && trip.departure_date
    ? ` · ${trip.arrival_date} – ${trip.departure_date}` : '';
  return {
    title: `${trip.title}${dateRange} | KamchatourHub`,
    description: `Маршрут по Камчатке на ${Array.isArray(trip.days) ? trip.days.length : 0} дней. Открой и создай свой!`,
    openGraph: {
      title: `${trip.title} — маршрут по Камчатке`,
      description: `${Array.isArray(trip.days) ? trip.days.length : 0} дней · tourhab.ru`,
      images: [{ url: '/icons/og-image.jpg', width: 1200, height: 630 }],
    },
  };
}

export default async function TripSharePage({ params }: PageProps) {
  const { token } = await params;
  const trip = await fetchTrip(token);
  if (!trip) notFound();
  return <TripShareClient trip={trip} token={token} />;
}
