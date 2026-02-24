import type { Metadata } from 'next';
import PartnerDashboardClient from './_PartnerDashboardClient';

export const metadata: Metadata = {
  title: 'Кабинет партнера | Kamhub',
  description: 'Управление услугами партнера на платформе Kamhub',
};

export default function PartnerDashboardPage() {
  return <PartnerDashboardClient />;
}
