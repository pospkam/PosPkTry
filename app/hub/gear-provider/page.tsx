import type { Metadata } from 'next';
import GearProviderDashboardClient from './_GearProviderDashboardClient';

export const metadata: Metadata = {
  title: 'Кабинет провайдера снаряжения | Kamhub',
  description: 'Управление каталогом и арендой снаряжения',
  robots: 'noindex, nofollow',
};

export default function GearProviderDashboard() {
  return <GearProviderDashboardClient />;
}
