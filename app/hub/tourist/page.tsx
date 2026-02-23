import type { Metadata } from 'next';
import TouristDashboardClient from './_TouristDashboardClient';

export const metadata: Metadata = {
  title: 'Личный кабинет туриста | Kamhub',
  description: 'Управление бронированиями и турами туриста',
  robots: 'noindex, nofollow',
};

export default function TouristDashboard() {
  return <TouristDashboardClient />;
}
