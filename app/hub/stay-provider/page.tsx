import type { Metadata } from 'next';
import StayProviderDashboardClient from './_StayProviderDashboardClient';

export const metadata: Metadata = {
  title: 'Кабинет провайдера жилья | Kamhub',
  description: 'Управление размещением и объектами',
  robots: 'noindex, nofollow',
};

export default function StayProviderDashboard() {
  return <StayProviderDashboardClient />;
}
